"use client";

import { useEffect, useRef, useState } from "react";

const MARGIN = 60;
const REFRESH_MS = 120;
const NEAR_RANGE = 600;
const LEAD = 0;

type Layer = { el: Element; color: string };
type Item = {
  el: HTMLElement;
  img: boolean;
  bg: string;
  radius: number;
  font: string;
  color: string;
  text: string;
  pl: number;
  pt: number;
  lh: number;
  center: boolean;
};

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
    float edge=clamp(.5-d,0.,1.);
    float bev=R*.34;
    float t=1.-clamp(-d/bev,0.,1.);
    if(t<=0.){gl_FragColor=vec4(0.);return;}
    vec2 n=normalize(vec2(sdf(p+vec2(1.,0.),h,R)-sdf(p-vec2(1.,0.),h,R),sdf(p+vec2(0.,1.),h,R)-sdf(p-vec2(0.,1.),h,R))+1e-5);
    vec2 bp=fp+toff;
    float k=t*t*(R*.16)*(1.+press*.4);
    vec2 off=-n*k;
    vec3 c=vec3(texture2D(tex,(bp+off*1.12)/tres).r,
                texture2D(tex,(bp+off)/tres).g,
                texture2D(tex,(bp+off*.88)/tres).b);
    float a=edge*smoothstep(0.,.55,t);
    float rim=smoothstep(2.5,0.,-d);
    vec2 L=normalize(vec2(-.6,-.8));
    float sp=pow(max(dot(n,L),0.),2.)+.6*pow(max(dot(n,-L),0.),2.);
    c+=rim*(.2+.5*sp);
    gl_FragColor=vec4(c*a,a);
  }`;

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
    if (!vs || !fs || !program) { dock.classList.add("gt-fb"); return dispose; }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { dock.classList.add("gt-fb"); return dispose; }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
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
    ctx.imageSmoothingQuality = "high";
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let layers: Layer[] = [];
    let items: Item[] = [];
    let near: Item[] = [];
    const corsCache = new Map<string, HTMLImageElement | null>();

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
      im.onload = () => corsCache.set(src, im);
      im.onerror = () => corsCache.set(src, null);
      im.src = src;
      return null;
    };

    const order = (a: Element, b: Element) =>
      a === b ? 0 : a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;

    const isClear = (c: string) => !c || c === "transparent" || c === "rgba(0, 0, 0, 0)";

    const refreshLayers = () => {
      const main = document.querySelector("main");
      const b = dock.getBoundingClientRect();
      const x0 = Math.max(0, b.left - MARGIN);
      const x1 = Math.min(window.innerWidth - 1, b.right + MARGIN);
      const y0 = Math.max(0, b.top - MARGIN);
      const y1 = Math.min(window.innerHeight - 1, b.bottom + MARGIN);
      const found = new Set<Element>();
      for (let i = 0; i <= 4; i++) {
        for (let j = 0; j <= 3; j++) {
          const x = x0 + ((x1 - x0) * i) / 4;
          const y = y0 + ((y1 - y0) * j) / 3;
          document.elementsFromPoint(x, y).forEach((el) => {
            if (dock.contains(el) || el.closest(".gt-dock")) return;
            if (main && main.contains(el)) return;
            found.add(el);
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

    const refreshItems = () => {
      const root = document.querySelector("main") ?? document.body;
      const next: Item[] = [];
      root.querySelectorAll("*").forEach((node) => {
        if (!(node instanceof HTMLElement) || node.closest(".gt-dock")) return;
        const s = getComputedStyle(node);
        if (s.display === "none" || s.visibility === "hidden") return;

        if (node instanceof HTMLImageElement) {
          const parent = node.parentElement ? getComputedStyle(node.parentElement) : null;
          const radius = Math.max(
            parseFloat(s.borderTopLeftRadius) || 0,
            parent ? parseFloat(parent.borderTopLeftRadius) || 0 : 0,
          );
          next.push({ el: node, img: true, bg: "", radius, font: "", color: "", text: "", pl: 0, pt: 0, lh: 0, center: false });
          return;
        }

        const bg = s.backgroundColor;
        const hasBg = !isClear(bg);
        let text = "";
        node.childNodes.forEach((n) => { if (n.nodeType === 3) text += n.textContent || ""; });
        text = text.replace(/\s+/g, " ").trim();
        if (!hasBg && !text) return;
        if (s.textTransform === "uppercase") text = text.toUpperCase();

        const fontSize = parseFloat(s.fontSize) || 14;
        next.push({
          el: node,
          img: false,
          bg: hasBg ? bg : "",
          radius: parseFloat(s.borderTopLeftRadius) || 0,
          font: `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`,
          color: s.color || "#fff",
          text: text.slice(0, 80),
          pl: (parseFloat(s.paddingLeft) || 0) + (parseFloat(s.borderLeftWidth) || 0),
          pt: (parseFloat(s.paddingTop) || 0) + (parseFloat(s.borderTopWidth) || 0),
          lh: parseFloat(s.lineHeight) || fontSize * 1.25,
          center: s.textAlign === "center" || s.justifyContent === "center",
        });
      });
      items = next;
    };

    const refreshNear = () => {
      const b = dock.getBoundingClientRect();
      const top = b.top - MARGIN - NEAR_RANGE;
      const bottom = b.bottom + MARGIN + NEAR_RANGE;
      near = items.filter((it) => {
        const r = it.el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.bottom > top && r.top < bottom;
      });
    };

    const refreshAll = () => { refreshItems(); refreshLayers(); refreshNear(); };
    refreshAll();

    let timer = 0;
    const scheduleNear = () => {
      if (timer) return;
      timer = window.setTimeout(() => { timer = 0; refreshLayers(); refreshNear(); }, REFRESH_MS);
    };
    let domTimer = 0;
    const domObs = new MutationObserver(() => {
      clearTimeout(domTimer);
      domTimer = window.setTimeout(refreshAll, 150);
    });
    domObs.observe(document.body, { childList: true, subtree: true });
    const themeObs = new MutationObserver(refreshAll);
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mobile-theme", "class"] });

    window.addEventListener("scroll", scheduleNear, { passive: true, capture: true });
    window.addEventListener("resize", refreshAll);
    disposers.push(() => {
      clearTimeout(timer);
      clearTimeout(domTimer);
      domObs.disconnect();
      themeObs.disconnect();
      window.removeEventListener("scroll", scheduleNear, true);
      window.removeEventListener("resize", refreshAll);
    });

    const rrect = (r: DOMRect, rad: number) => {
      const k = Math.min(rad, r.width / 2, r.height / 2);
      ctx.beginPath();
      ctx.moveTo(r.left + k, r.top);
      ctx.arcTo(r.right, r.top, r.right, r.bottom, k);
      ctx.arcTo(r.right, r.bottom, r.left, r.bottom, k);
      ctx.arcTo(r.left, r.bottom, r.left, r.top, k);
      ctx.arcTo(r.left, r.top, r.right, r.top, k);
      ctx.closePath();
    };

    const drawCover = (im: HTMLImageElement, r: DOMRect) => {
      const iw = im.naturalWidth, ih = im.naturalHeight;
      if (!iw || !ih || r.width <= 0 || r.height <= 0) return;
      const ir = iw / ih, br = r.width / r.height;
      let sx = 0, sy = 0, sw = iw, sh = ih;
      if (ir > br) { sw = ih * br; sx = (iw - sw) / 2; } else { sh = iw / br; sy = (ih - sh) / 2; }
      ctx.drawImage(im, sx, sy, sw, sh, r.left, r.top, r.width, r.height);
    };

    const drawScene = (ox: number, oy: number, w: number, h: number, vy: number) => {
      const light = document.documentElement.dataset.mobileTheme === "light";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = light ? "#f5f3fb" : "#0a0b10";
      ctx.fillRect(0, 0, w, h);
      ctx.translate(-ox, -oy - vy * LEAD);

      for (const l of layers) {
        const r = l.el.getBoundingClientRect();
        if (r.bottom < oy || r.top > oy + h || r.right < ox || r.left > ox + w) continue;
        ctx.fillStyle = l.color;
        ctx.fillRect(r.left, r.top, r.width, r.height);
      }

      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      for (const it of near) {
        const r = it.el.getBoundingClientRect();
        if (r.width <= 0 || r.bottom < oy || r.top > oy + h || r.right < ox || r.left > ox + w) continue;

        if (it.img) {
          const img = it.el as HTMLImageElement;
          const src = img.currentSrc || img.src;
          const im = sameOrigin(src) ? (img.complete && img.naturalWidth ? img : null) : getCors(src);
          if (!im) continue;
          ctx.save();
          rrect(r, it.radius);
          ctx.clip();
          try { drawCover(im, r); } catch { /* bỏ qua ảnh lỗi */ }
          ctx.restore();
          continue;
        }

        if (it.bg) {
          ctx.fillStyle = it.bg;
          if (it.radius > 0) { rrect(r, it.radius); ctx.fill(); }
          else ctx.fillRect(r.left, r.top, r.width, r.height);
        }
        if (it.text) {
          ctx.font = it.font;
          ctx.fillStyle = it.color;
          const maxW = Math.max(20, r.width - it.pl * 2);
          const multiLine = r.height > it.lh * 1.6;
          const y = multiLine ? r.top + it.pt + it.lh / 2 : r.top + r.height / 2;
          if (it.center) {
            ctx.textAlign = "center";
            ctx.fillText(it.text, r.left + r.width / 2, y, maxW);
            ctx.textAlign = "left";
          } else {
            ctx.fillText(it.text, r.left + it.pl, y, maxW);
          }
        }
      }
    };

    let press = 0, pressed = 0, raf = 0, texReady = false, lastScrollY = window.scrollY;
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

    const render = () => {
      raf = requestAnimationFrame(render);
      if (document.hidden) return;

      const b = canvas.getBoundingClientRect();
      const W = b.width, H = b.height;
      if (W < 2 || H < 2) return;

      const pw = Math.round(W * dpr), ph = Math.round(H * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
        gl.viewport(0, 0, pw, ph);
      }

      const tw = Math.round((W + MARGIN * 2) * dpr);
      const th = Math.round((H + MARGIN * 2) * dpr);
      if (scene.width !== tw || scene.height !== th) {
        scene.width = tw;
        scene.height = th;
        texReady = false;
      }

      const sy = window.scrollY;
      const vy = sy - lastScrollY;
      lastScrollY = sy;
      drawScene(b.left - MARGIN, b.top - MARGIN, W + MARGIN * 2, H + MARGIN * 2, vy);

      gl.bindTexture(gl.TEXTURE_2D, texture);
      try {
        if (!texReady) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scene);
          texReady = true;
        } else {
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, scene);
        }
      } catch { /* lỗi upload không được làm chết vòng lặp */ }

      press += (pressed - press) * 0.15;
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
