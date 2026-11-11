"use client";

import { useEffect, useRef, useState } from "react";

const MARGIN = 60;
const LAYER_MS = 80;
const NEAR_Y = 700;
const LEAD_MS = 16;
const THUMB_CACHE = 120;
const IMG_SELECTOR = "main img, [data-movie-card] img, .movie-card img";

type Box = { left: number; top: number; right: number; bottom: number; width: number; height: number };
type Layer = { el: Element; color: string };
type Head = { el: HTMLElement; font: string; color: string; text: string };

const VERTEX = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
const FRAGMENT = `
  precision highp float;
  uniform sampler2D tex;
  uniform vec2 res,tres,toff;
  uniform float press;
  float sdf(vec2 p,vec2 h,float r){vec2 q=abs(p)-h+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
  void main(){
    vec2 fp=vec2(gl_FragCoord.x,res.y-gl_FragCoord.y);vec2 p=fp-res*.5;
    float R=res.y*.5;vec2 h=res*.5;float d=sdf(p,h,R);
    if(d>1.){gl_FragColor=vec4(0.);return;}
    float a=clamp(.5-d,0.,1.);
    float bev=R*.42;
    float t=1.-clamp(-d/bev,0.,1.);
    vec2 bp=fp+toff;
    vec3 c;
    if(t<=0.){
      c=texture2D(tex,bp/tres).rgb;
    }else{
      vec2 n=normalize(vec2(sdf(p+vec2(1.,0.),h,R)-sdf(p-vec2(1.,0.),h,R),sdf(p+vec2(0.,1.),h,R)-sdf(p-vec2(0.,1.),h,R))+1e-5);
      float k=t*t*(R*.75)*(1.+press*.4);
      vec2 off=n*k;
      float r=texture2D(tex,(bp+off*1.15)/tres).r;
      float b=texture2D(tex,(bp+off*.85)/tres).b;
      vec3 g3=(texture2D(tex,(bp+off+vec2(1.2,0.)*t)/tres).rgb
              +texture2D(tex,(bp+off+vec2(-.6,1.04)*t)/tres).rgb
              +texture2D(tex,(bp+off+vec2(-.6,-1.04)*t)/tres).rgb)/3.;
      c=vec3(r,g3.g,b);
      float l=dot(c,vec3(.299,.587,.114));
      c=mix(vec3(l),c,1.+.35*t);c=mix(c,vec3(1.),.06*t);
      float rim=smoothstep(2.5,0.,-d);
      vec2 L=normalize(vec2(-.6,-.8));
      float sp=pow(max(dot(n,L),0.),2.)+.6*pow(max(dot(n,-L),0.),2.);
      c+=rim*(.2+.5*sp)+t*.06*sp;
    }
    gl_FragColor=vec4(c*a,a);
  }`;

const rpath = (x: CanvasRenderingContext2D, l: number, t: number, w: number, h: number, rad: number) => {
  const k = Math.max(0, Math.min(rad, w / 2, h / 2));
  x.beginPath();
  x.moveTo(l + k, t);
  x.arcTo(l + w, t, l + w, t + h, k);
  x.arcTo(l + w, t + h, l, t + h, k);
  x.arcTo(l, t + h, l, t, k);
  x.arcTo(l, t, l + w, t, k);
  x.closePath();
};

const coverDraw = (x: CanvasRenderingContext2D, im: HTMLImageElement | HTMLCanvasElement, dx: number, dy: number, dw: number, dh: number) => {
  const iw = (im as HTMLImageElement).naturalWidth || im.width;
  const ih = (im as HTMLImageElement).naturalHeight || im.height;
  if (!iw || !ih || dw <= 0 || dh <= 0) return;
  const ir = iw / ih, br = dw / dh;
  let sx = 0, sy = 0, sw = iw, sh = ih;
  if (ir > br) { sw = ih * br; sx = (iw - sw) / 2; } else { sh = iw / br; sy = (ih - sh) / 2; }
  x.drawImage(im, sx, sy, sw, sh, dx, dy, dw, dh);
};

export function LiquidGlassDockSurface() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const bubble = bubbleRef.current;
    const dock = canvas?.parentElement;
    if (!canvas || !bubble || !dock) return;

    const disposers: Array<() => void> = [];
    const dispose = () => disposers.forEach((fn) => fn());

    const placeBubble = () => {
      const active = dock.querySelector<HTMLElement>(".gt-dock-item.is-active");
      if (!active) return;
      const n = dock.getBoundingClientRect();
      const i = active.getBoundingClientRect();
      bubble.style.left = i.left - n.left + 4 + "px";
      bubble.style.width = Math.max(0, i.width - 8) + "px";
    };
    const classObs = new MutationObserver(placeBubble);
    classObs.observe(dock, { subtree: true, attributes: true, attributeFilter: ["class"] });
    const sizeObs = new ResizeObserver(placeBubble);
    sizeObs.observe(dock);
    placeBubble();
    disposers.push(() => { classObs.disconnect(); sizeObs.disconnect(); });

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      powerPreference: "high-performance",
    });
    dock.classList.remove("gt-fb");
    disposers.push(() => dock.classList.remove("gt-fb"));
    if (!gl) { dock.classList.add("gt-fb"); return dispose; }

    const makeShader = (type: number, src: string) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn("Liquid dock shader:", gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    };
    const vs = makeShader(gl.VERTEX_SHADER, VERTEX);
    const fs = makeShader(gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vs || !fs || !program) {
      dock.classList.add("gt-fb");
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      if (program) gl.deleteProgram(program);
      return dispose;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("Liquid dock program:", gl.getProgramInfoLog(program));
      dock.classList.add("gt-fb");
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return dispose;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    if (!buffer) {
      dock.classList.add("gt-fb");
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return dispose;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const attr = gl.getAttribLocation(program, "a");
    gl.enableVertexAttribArray(attr);
    gl.vertexAttribPointer(attr, 2, gl.FLOAT, false, 0, 0);

    const uTex = gl.getUniformLocation(program, "tex");
    const uRes = gl.getUniformLocation(program, "res");
    const uTres = gl.getUniformLocation(program, "tres");
    const uToff = gl.getUniformLocation(program, "toff");
    const uPress = gl.getUniformLocation(program, "press");

    const texture = gl.createTexture();
    if (!texture) {
      dock.classList.add("gt-fb");
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return dispose;
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    disposers.push(() => {
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    });

    const scene = document.createElement("canvas");
    const ctx = scene.getContext("2d");
    if (!ctx) { dock.classList.add("gt-fb"); return dispose; }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let layers: Layer[] = [];
    let heads: Head[] = [];
    let pics: HTMLImageElement[] = [];
    let nearHeads: Head[] = [];
    let nearPics: HTMLImageElement[] = [];
    let dirty = true;
    let lastRefresh = 0;

    const corsCache = new Map<string, HTMLImageElement | null>();
    const thumbs = new Map<string, HTMLCanvasElement>();

    const sameOrigin = (src: string) => {
      if (!src) return false;
      if (src.startsWith("blob:") || src.startsWith("data:")) return true;
      try { return new URL(src, location.href).origin === location.origin; } catch { return false; }
    };
    const getCors = (src: string) => {
      if (!src) return null;
      if (corsCache.has(src)) return corsCache.get(src) ?? null;
      corsCache.set(src, null);
      const im = new window.Image();
      im.crossOrigin = "anonymous";
      im.onload = () => { corsCache.set(src, im); dirty = true; };
      im.onerror = () => corsCache.set(src, null);
      im.src = src;
      return null;
    };
    const drawable = (img: HTMLImageElement) => {
      const src = img.currentSrc || img.src;
      if (sameOrigin(src)) return img.complete && img.naturalWidth ? img : null;
      return getCors(src);
    };
    const thumbKey = (img: HTMLImageElement, w: number, h: number) =>
      `\${img.currentSrc || img.src}|\${Math.round(w * dpr)}|\${Math.round(h * dpr)}`;

    const buildThumb = (im: HTMLImageElement, w: number, h: number) => {
      const pw = Math.max(1, Math.round(w * dpr));
      const ph = Math.max(1, Math.round(h * dpr));
      const c = document.createElement("canvas");
      c.width = pw;
      c.height = ph;
      const x = c.getContext("2d");
      if (!x) return null;
      x.imageSmoothingQuality = "high";
      rpath(x, 0, 0, pw, ph, 8 * dpr);
      x.clip();
      try { coverDraw(x, im, 0, 0, pw, ph); } catch { return null; }
      return c;
    };

    const order = (a: Element, b: Element) =>
      a === b ? 0 : a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    const isClear = (c: string) => !c || c === "transparent" || c === "rgba(0, 0, 0, 0)";

    const refreshLayers = () => {
      const b = dock.getBoundingClientRect();
      const x0 = b.left - MARGIN, x1 = b.right + MARGIN;
      const y0 = b.top - MARGIN - 100, y1 = b.bottom + MARGIN + 100;
      const found = new Set<Element>();
      for (let i = 0; i <= 4; i++) {
        for (let j = 0; j <= 4; j++) {
          const px = Math.min(window.innerWidth - 1, Math.max(0, x0 + ((x1 - x0) * i) / 4));
          const py = Math.min(window.innerHeight - 1, Math.max(0, y0 + ((y1 - y0) * j) / 4));
          document.elementsFromPoint(px, py).forEach((el) => {
            if (!dock.contains(el) && !el.closest(".gt-dock")) found.add(el);
          });
        }
      }
      const next: Layer[] = [];
      [...found].sort(order).forEach((el) => {
        const color = getComputedStyle(el).backgroundColor;
        if (isClear(color)) return;
        next.push({ el, color });
      });
      layers = next;
    };

    const refreshLists = () => {
      heads = [...document.querySelectorAll<HTMLElement>("h1,h2,h3")].map((el) => {
        const s = getComputedStyle(el);
        return {
          el,
          font: `\${s.fontWeight} \${s.fontSize} \${s.fontFamily}`,
          color: s.color || "#fff",
          text: (el.textContent || "").trim().slice(0, 64),
        };
      });
      pics = [...document.querySelectorAll<HTMLImageElement>(IMG_SELECTOR)];
    };

    const refreshNear = () => {
      const b = dock.getBoundingClientRect();
      const top = b.top - MARGIN - NEAR_Y;
      const bottom = b.bottom + MARGIN + NEAR_Y;
      nearHeads = heads.filter((h) => {
        const r = h.el.getBoundingClientRect();
        return r.bottom > top && r.top < bottom;
      });
      const np: HTMLImageElement[] = [];
      let made = 0;
      for (const img of pics) {
        const r = img.getBoundingClientRect();
        if (r.width <= 0 || r.bottom < top || r.top > bottom) continue;
        np.push(img);
        if (made < 3) {
          const im = drawable(img);
          if (im) {
            const key = thumbKey(img, r.width, r.height);
            if (!thumbs.has(key)) {
              const t = buildThumb(im, r.width, r.height);
              if (t) {
                thumbs.set(key, t);
                made++;
                dirty = true;
                if (thumbs.size > THUMB_CACHE) thumbs.delete(thumbs.keys().next().value as string);
              }
            }
          }
        }
      }
      nearPics = np;
    };

    const refreshAll = () => {
      refreshLists();
      refreshLayers();
      refreshNear();
      lastRefresh = performance.now();
      dirty = true;
    };
    refreshAll();

    let domTimer = 0;
    const domObs = new MutationObserver(() => {
      clearTimeout(domTimer);
      domTimer = window.setTimeout(refreshAll, 120);
    });
    domObs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "srcset", "class"],
    });
    const themeObs = new MutationObserver(refreshAll);
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mobile-theme", "class"] });
    const onLoad = () => { dirty = true; };
    document.addEventListener("load", onLoad, true);
    window.addEventListener("resize", refreshAll);
    disposers.push(() => {
      clearTimeout(domTimer);
      domObs.disconnect();
      themeObs.disconnect();
      document.removeEventListener("load", onLoad, true);
      window.removeEventListener("resize", refreshAll);
      thumbs.clear();
      corsCache.clear();
    });

    const motion = new WeakMap<Element, { x: number; y: number; vx: number; vy: number; t: number }>();
    let frameNow = 0;
    const lead = (el: Element, r: DOMRect): Box => {
      let m = motion.get(el);
      if (!m || frameNow - m.t > 60) {
        m = { x: r.left, y: r.top, vx: 0, vy: 0, t: frameNow };
        motion.set(el, m);
      } else {
        const dt = Math.max(1, frameNow - m.t);
        m.vx = m.vx * 0.5 + ((r.left - m.x) / dt) * 0.5;
        m.vy = m.vy * 0.5 + ((r.top - m.y) / dt) * 0.5;
        m.x = r.left;
        m.y = r.top;
        m.t = frameNow;
      }
      const dx = Math.max(-60, Math.min(60, m.vx * LEAD_MS));
      const dy = Math.max(-60, Math.min(60, m.vy * LEAD_MS));
      return { left: r.left + dx, top: r.top + dy, right: r.right + dx, bottom: r.bottom + dy, width: r.width, height: r.height };
    };

    let press = 0, pressed = 0, raf = 0, texReady = false, lastSig = 0;
    const onDown = () => { pressed = 1; };
    const onUp = () => { pressed = 0; };
    dock.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    disposers.push(() => {
      dock.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    });

    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      if (document.hidden) return;
      frameNow = now;

      const bounds = dock.getBoundingClientRect();
      const W = bounds.width, H = bounds.height;
      if (W < 2 || H < 2) return;

      const pw = Math.max(2, Math.round(W * dpr));
      const ph = Math.max(2, Math.round(H * dpr));
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
        gl.viewport(0, 0, pw, ph);
        dirty = true;
      }
      const tw = W + MARGIN * 2, th = H + MARGIN * 2;
      const sw = Math.max(2, Math.round(tw * dpr));
      const sh = Math.max(2, Math.round(th * dpr));
      if (scene.width !== sw || scene.height !== sh) {
        scene.width = sw;
        scene.height = sh;
        ctx.imageSmoothingQuality = "high";
        texReady = false;
        dirty = true;
      }

      if (now - lastRefresh > LAYER_MS) {
        lastRefresh = now;
        refreshLayers();
        refreshNear();
      }

      const ox = bounds.left - MARGIN;
      const oy = bounds.top - MARGIN;
      const inView = (b: Box) => !(b.bottom < oy || b.top > oy + th || b.right < ox || b.left > ox + tw);

      let sig = (pw * 31 + ph) | 0;
      const mix = (b: Box) => {
        sig = (Math.imul(sig, 31) + Math.round(b.left * 4)) | 0;
        sig = (Math.imul(sig, 31) + Math.round(b.top * 4)) | 0;
        sig = (Math.imul(sig, 31) + Math.round(b.width * 4)) | 0;
        sig = (Math.imul(sig, 31) + Math.round(b.height * 4)) | 0;
      };

      const L: Array<[Box, string]> = [];
      for (const l of layers) {
        const b = lead(l.el, l.el.getBoundingClientRect());
        if (!inView(b)) continue;
        L.push([b, l.color]);
        mix(b);
      }
      const T: Array<[Box, Head]> = [];
      for (const h of nearHeads) {
        const b = lead(h.el, h.el.getBoundingClientRect());
        if (!inView(b)) continue;
        T.push([b, h]);
        mix(b);
      }
      const P: Array<[Box, HTMLImageElement]> = [];
      for (const img of nearPics) {
        const r = img.getBoundingClientRect();
        if (r.width <= 0) continue;
        const b = lead(img, r);
        if (!inView(b)) continue;
        P.push([b, img]);
        mix(b);
      }

      press += (pressed - press) * 0.15;
      if (Math.abs(pressed - press) < 0.002) press = pressed;
      sig = (Math.imul(sig, 31) + Math.round(press * 1000)) | 0;

      if (!dirty && sig === lastSig) return;
      dirty = false;
      lastSig = sig;

      const light = document.documentElement.dataset.mobileTheme === "light";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = light ? "#f5f3fb" : "#0a0b10";
      ctx.fillRect(0, 0, tw, th);
      ctx.translate(-ox, -oy);

      for (const [b, color] of L) {
        ctx.fillStyle = color;
        ctx.fillRect(b.left, b.top, b.width, b.height);
      }

      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      for (const [b, h] of T) {
        ctx.font = h.font;
        ctx.fillStyle = h.color;
        ctx.fillText(h.text, b.left, b.top + b.height / 2, Math.max(20, b.width));
      }

      for (const [b, img] of P) {
        const thumb = thumbs.get(thumbKey(img, b.width, b.height));
        if (thumb) {
          ctx.drawImage(thumb, b.left, b.top, b.width, b.height);
          continue;
        }
        const im = drawable(img);
        if (!im) continue;
        ctx.save();
        rpath(ctx, b.left, b.top, b.width, b.height, 8);
        ctx.clip();
        try { coverDraw(ctx, im, b.left, b.top, b.width, b.height); } catch { /* bỏ qua ảnh lỗi */ }
        ctx.restore();
      }

      gl.bindTexture(gl.TEXTURE_2D, texture);
      try {
        if (!texReady) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scene);
          texReady = true;
        } else {
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, scene);
        }
      } catch { /* lỗi upload không được làm chết vòng lặp */ }

      gl.uniform1i(uTex, 0);
      gl.uniform2f(uRes, pw, ph);
      gl.uniform2f(uTres, scene.width, scene.height);
      gl.uniform2f(uToff, MARGIN * dpr, MARGIN * dpr);
      gl.uniform1f(uPress, press);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    raf = requestAnimationFrame(render);
    disposers.push(() => cancelAnimationFrame(raf));

    const onLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      dock.classList.add("gt-fb");
    };
    const onRestored = () => setEpoch((n) => n + 1);
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    disposers.push(() => {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
    });

    return dispose;
  }, [epoch]);

  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" className="gt-liquid-glass-canvas" />
      <div ref={bubbleRef} className="gt-liquid-glass-bubble" aria-hidden="true" />
    </>
  );
}
