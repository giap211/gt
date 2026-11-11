"use client";

import { useEffect, useRef } from "react";

/**
 * WebGL liquid-glass surface. The scene texture is redrawn every frame so
 * refraction tracks page scrolling and movement without a delayed capture.
 */
export function LiquidGlassDockSurface() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const bubble = bubbleRef.current;
    const dock = canvas?.parentElement;
    if (!canvas || !bubble || !dock) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
    });
    if (!gl) {
      dock.classList.add("gt-fb");
      return () => dock.classList.remove("gt-fb");
    }

    dock.classList.remove("gt-fb");

    const vertex = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
    const fragment = `
  precision highp float;
  uniform sampler2D tex;
  uniform vec2 res,tres,toff;
  uniform float press,texScale;
  float sdf(vec2 p,vec2 h,float r){vec2 q=abs(p)-h+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
  void main(){
    vec2 fp=vec2(gl_FragCoord.x,res.y-gl_FragCoord.y);vec2 p=fp-res*.5;
    float R=res.y*.5;vec2 h=res*.5;float d=sdf(p,h,R);
    if(d>1.){gl_FragColor=vec4(0.);return;}
    float a=clamp(.5-d,0.,1.);
    float bev=R*.42;
    float t=1.-clamp(-d/bev,0.,1.);
    vec2 bp=(fp+toff)*texScale;
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

    const makeShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn("Liquid dock shader:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = makeShader(gl.VERTEX_SHADER, vertex);
    const fs = makeShader(gl.FRAGMENT_SHADER, fragment);
    if (!vs || !fs) {
      dock.classList.add("gt-fb");
      return () => {
        dock.classList.remove("gt-fb");
        if (vs) gl.deleteShader(vs);
        if (fs) gl.deleteShader(fs);
      };
    }

    const program = gl.createProgram();
    if (!program) {
      dock.classList.add("gt-fb");
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return () => dock.classList.remove("gt-fb");
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
      return () => dock.classList.remove("gt-fb");
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    if (!buffer) {
      dock.classList.add("gt-fb");
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return () => dock.classList.remove("gt-fb");
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const attribute = gl.getAttribLocation(program, "a");
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    if (!texture) {
      dock.classList.add("gt-fb");
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return () => dock.classList.remove("gt-fb");
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    ([[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]] as const).forEach(([p, v]) => {
      gl.texParameteri(gl.TEXTURE_2D, p, v);
    });

    const scene = document.createElement("canvas");
    const ctx = scene.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Render only the refraction capture at 60% resolution; keep the dock canvas full-res.
    const textureScale = 0.4;
    const margin = 60;
    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const uRes = uniform("res");
    const uTextureSize = uniform("tres");
    const uOffset = uniform("toff");
    const uPress = uniform("press");
    const uTextureScale = uniform("texScale");
    const uTex = uniform("tex");

    let press = 0;
    let pressed = 0;
    let raf = 0;
    const imgCache = new Map<string, HTMLImageElement | null>();

    const getCors = (src: string) => {
      if (!src) return null;
      if (imgCache.has(src)) return imgCache.get(src) ?? null;
      imgCache.set(src, null);
      const im = new window.Image();
      // Remote movie CDNs often omit Access-Control-Allow-Origin. Load the
      // capture copy through our same-origin image proxy so Canvas can read it.
      const absolute = new URL(src, window.location.href);
      const captureSrc = absolute.origin === window.location.origin
        ? absolute.href
        : `/api/refraction-image?url=${encodeURIComponent(absolute.href)}`;
      im.onload = () => imgCache.set(src, im);
      im.onerror = () => imgCache.set(src, null);
      im.src = captureSrc;
      return null;
    };

    const drawCover = (im: HTMLImageElement, rect: DOMRect) => {
      if (!ctx || !im.naturalWidth || !im.naturalHeight || rect.width <= 0 || rect.height <= 0) return;
      const imageRatio = im.naturalWidth / im.naturalHeight;
      const boxRatio = rect.width / rect.height;
      let sx = 0;
      let sy = 0;
      let sw = im.naturalWidth;
      let sh = im.naturalHeight;
      if (imageRatio > boxRatio) {
        sw = sh * boxRatio;
        sx = (im.naturalWidth - sw) / 2;
      } else {
        sh = sw / boxRatio;
        sy = (im.naturalHeight - sh) / 2;
      }
      ctx.drawImage(im, sx, sy, sw, sh, rect.left, rect.top, rect.width, rect.height);
    };

    const onDown = () => { pressed = 1; };
    const onUp = () => { pressed = 0; };
    dock.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    const drawScene = (ox: number, oy: number, width: number, height: number) => {
      if (!ctx) return;
      scene.width = Math.max(2, Math.round(width * dpr * textureScale));
      scene.height = Math.max(2, Math.round(height * dpr * textureScale));
      ctx.setTransform(dpr * textureScale, 0, 0, dpr * textureScale, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Use the active app theme for a reliable base, then rebuild the
      // actual colored surfaces behind the dock from the DOM.
      const light = document.documentElement.dataset.mobileTheme === "light";
      ctx.fillStyle = light ? "#f5f3fb" : "#0a0b10";
      ctx.fillRect(0, 0, width, height);
      ctx.translate(-ox, -oy);

      const found = new Set<Element>();
      for (let i = 0; i <= 4; i++) {
        for (let j = 0; j <= 2; j++) {
          const px = Math.min(
            window.innerWidth - 1,
            Math.max(0, ox + (width * i) / 4),
          );
          const py = Math.min(
            window.innerHeight - 1,
            Math.max(0, oy + (height * j) / 2),
          );
          document.elementsFromPoint(px, py).forEach((el) => {
            if (!dock.contains(el) && !el.closest(".gt-dock")) found.add(el);
          });
        }
      }

      [...found]
        .sort((a, b) => {
          if (a === b) return 0;
          return a.compareDocumentPosition(b) &
            Node.DOCUMENT_POSITION_FOLLOWING
            ? -1
            : 1;
        })
        .forEach((el) => {
          const rect = el.getBoundingClientRect();
          ctx.fillStyle = getComputedStyle(el).backgroundColor;
          ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
        });

      document.querySelectorAll<HTMLElement>("h1,h2,h3").forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.bottom < oy || rect.top > oy + height || rect.right < ox || rect.left > ox + width) return;
        const style = getComputedStyle(el);
        ctx.font = style.fontWeight + " " + style.fontSize + " " + style.fontFamily;
        ctx.fillStyle = style.color || "#fff";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText((el.textContent || "").trim().slice(0, 64), rect.left, rect.top + rect.height / 2, Math.max(20, rect.width));
      });

      document.querySelectorAll<HTMLImageElement>("main img, [data-movie-card] img, .movie-card img").forEach((img) => {
        const rect = img.getBoundingClientRect();
        if (rect.bottom < oy || rect.top > oy + height || rect.right < ox || rect.left > ox + width) return;
        const im = getCors(img.currentSrc || img.src);
        if (!im) return;
        try {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(rect.left, rect.top, rect.width, rect.height, 8);
          ctx.clip();
          drawCover(im, rect);
          ctx.restore();
        } catch {
          try { ctx.restore(); } catch { /* Ignore canvas drawing failures. */ }
        }
      });
    };

    const placeBubble = () => {
      const active = dock.querySelector<HTMLElement>(".gt-dock-item.is-active");
      if (!active) return;
      const navRect = dock.getBoundingClientRect();
      const itemRect = active.getBoundingClientRect();
      bubble.style.left = itemRect.left - navRect.left + 4 + "px";
      bubble.style.width = Math.max(0, itemRect.width - 8) + "px";
    };

    const observer = new MutationObserver(placeBubble);
    observer.observe(dock, { subtree: true, attributes: true, attributeFilter: ["class"] });
    const resizeObserver = new ResizeObserver(placeBubble);
    resizeObserver.observe(dock);
    placeBubble();

    const render = () => {
      const bounds = dock.getBoundingClientRect();
      const width = bounds.width;
      const height = bounds.height;
      const pixelWidth = Math.max(2, Math.round(width * dpr));
      const pixelHeight = Math.max(2, Math.round(height * dpr));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
        gl.viewport(0, 0, pixelWidth, pixelHeight);
      }

      const textureWidth = width + margin * 2;
      const textureHeight = height + margin * 2;
      drawScene(bounds.left - margin, bounds.top - margin, textureWidth, textureHeight);

      gl.bindTexture(gl.TEXTURE_2D, texture);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scene);
      } catch {
        // A failed image/texture upload must never stop the animation loop.
      }

      press += (pressed - press) * 0.15;
      gl.uniform1i(uTex, 0);
      gl.uniform2f(uRes, pixelWidth, pixelHeight);
      gl.uniform2f(uTextureSize, scene.width, scene.height);
      gl.uniform2f(uOffset, margin * dpr, margin * dpr);
      gl.uniform1f(uPress, press);
      gl.uniform1f(uTextureScale, textureScale);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      resizeObserver.disconnect();
      dock.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      dock.classList.remove("gt-fb");
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <>
      <div className="gt-liquid-glass-blur" aria-hidden="true" />
      <canvas ref={canvasRef} aria-hidden="true" className="gt-liquid-glass-canvas" />
      <div ref={bubbleRef} className="gt-liquid-glass-bubble" aria-hidden="true" />
    </>
  );
}
