"use client";

import { useEffect, useRef, useState } from "react";

const MARGIN = 60;
const LAYER_REFRESH_MS = 120;
// 0 = vẽ đúng vị trí đọc được. Nếu thấy kính hơi trễ khi cuộn nhanh trên iOS,
// thử 0.5 hoặc 1 để vẽ lệch trước một khoảng theo tốc độ cuộn.
const LEAD = 0;

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
    float bev=R*.38;
    float t=1.-clamp(-d/bev,0.,1.);
    vec2 bp=fp+toff;
    vec3 c;
    if(t<=0.){
      c=texture2D(tex,bp/tres).rgb;
    }else{
      vec2 n=normalize(vec2(sdf(p+vec2(1.,0.),h,R)-sdf(p-vec2(1.,0.),h,R),sdf(p+vec2(0.,1.),h,R)-sdf(p-vec2(0.,1.),h,R))+1e-5);
      float k=t*t*(R*.3)*(1.+press*.4);
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

export function LiquidGlassDockSurface() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [epoch, setEpoch] = useState(0); // tăng lên để khởi tạo lại sau khi mất context WebGL

  useEffect(() => {
    const canvas = canvasRef.current;
    const bubble = bubbleRef.current;
    const dock = canvas?.parentElement;
    if (!canvas || !bubble || !dock) return;

    const disposers: Array<() => void> = [];
    const dispose = () => disposers.forEach((fn) => fn());

    /* ---------- bong bóng tab ---------- */
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

    /* ---------- WebGL ---------- */
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

    /* ---------- scene 2D ---------- */
    const scene = document.createElement("canvas");
    const ctx = scene.getContext("2d");
    if (!ctx) { dock.classList.add("gt-fb"); return dispose; }
    ctx.imageSmoothingQuality = "high";
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let layers: Layer[] = [];
    let heads: Head[] = [];
    let pics: HTMLImageElement[] = [];
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

    // Quét các lớp nền thật phía sau dock (tốn kém nên chỉ làm định kỳ).
    const refreshLayers = () => {
      const b = dock.getBoundingClientRect();
      const x0 = Math.max(0, b.left - MARGIN);
      const x1 = Math.min(window.innerWidth - 1, b.right + MARGIN);
      const y0 = Math.max(0, b.top - MARGIN - 240);
      const y1 = Math.min(window.innerHeight - 1, b.bottom + MARGIN);
      const found = new Set<Element>();
      for (let i = 0; i <= 6; i++) {
        for (let j = 0; j <= 6; j++) {
          const x = x0 + ((x1 - x0) * i) / 6;
          const y = y0 + ((y1 - y0) * j) / 6;
          document.elementsFromPoint(x, y).forEach((el) => {
            if (!dock.contains(el) && !el.closest(".gt-dock")) found.add(el);
          });
        }
      }
      const next: Layer[] = [];
      [...found].sort(order).forEach((el) => {
        const color = getComputedStyle(el).backgroundColor;
        if (!color || color === "transparent" || color === "rgba(0, 0, 0, 0)") return;
        next.push({ el, color });
      });
      layers = next;
    };

    // Cache tiêu đề + ảnh (chỉ làm lại khi DOM hoặc theme đổi).
    const refreshLists = () => {
      heads = [...document.querySelectorAll<HTMLElement>("h1,h2,h3")].map((el) => {
        const s = getComputedStyle(el);
        return {
          el,
          font: `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`,
          color: s.color || "#fff",
          text: (el.textContent || "").trim().slice(0, 64),
        };
      });
      pics = [...document.querySelectorAll<HTMLImageElement>("main img, [data-movie-card] img, .movie-card img")];
    };

    const refreshAll = () => { refreshLists(); refreshLayers(); };
    refreshAll();

    let layerTimer = 0;
    const scheduleLayers = () => {
      if (layerTimer) return;
      layerTimer = window.setTimeout(() => { layerTimer = 0; refreshLayers(); }, LAYER_REFRESH_MS);
    };
    let domTimer = 0;
    const domObs = new MutationObserver(() => {
      clearTimeout(domTimer);
      domTimer = window.setTimeout(refreshAll, 150);
    });
    domObs.observe(document.body, { childList: true, subtree: true });
    const themeObs = new MutationObserver(refreshAll);
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mobile-theme", "class"] });

    window.addEventListener("scroll", scheduleLayers, { passive: true, capture: true });
    window.addEventListener("resize", refreshAll);
    disposers.push(() => {
      clearTimeout(layerTimer);
      clearTimeout(domTimer);
      domObs.disconnect();
      themeObs.disconnect();
      window.removeEventListener("scroll", scheduleLayers, true);
      window.removeEventListener("resize", refreshAll);
    });

    const rrect = (r: DOMRect, rad: number) => {
      ctx.beginPath();
      ctx.moveTo(r.left + rad, r.top);
      ctx.arcTo(r.right, r.top, r.right, r.bottom, rad);
      ctx.arcTo(r.right, r.bottom, r.left, r.bottom, rad);
      ctx.arcTo(r.left, r.bottom, r.left, r.top, rad);
      ctx.arcTo(r.left, r.top, r.right, r.top, rad);
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
      for (const t of heads) {
        const r = t.el.getBoundingClientRect();
        if (r.bottom < oy || r.top > oy + h || r.right < ox || r.left > ox + w) continue;
        ctx.font = t.font;
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, r.left, r.top + r.height / 2, Math.max(20, r.width));
      }

      for (const img of pics) {
        const r = img.getBoundingClientRect();
        if (r.width <= 0 || r.bottom < oy || r.top > oy + h || r.right < ox || r.left > ox + w) continue;
        const src = img.currentSrc || img.src;
        const im = sameOrigin(src) ? (img.complete && img.naturalWidth ? img : null) : getCors(src);
        if (!im) continue;
        ctx.save();
        rrect(r, 8);
        ctx.clip();
        try { drawCover(im, r); } catch { /* bỏ qua ảnh lỗi */ }
        ctx.restore();
      }
    };

    /* ---------- vòng render ---------- */
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

      const b = dock.getBoundingClientRect();
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

    /* ---------- iOS có thể làm mất context WebGL ---------- */
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
