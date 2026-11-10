"use client";

import { useEffect, useRef } from "react";

/**
 * Liquid-glass dock renderer adapted from the supplied CineGlass shader.
 * The texture is a lightweight canvas reconstruction of visible page imagery
 * (same-origin/ CORS-enabled images, headings and page colors), not a DOM screenshot.
 */
export function LiquidGlassDockSurface() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const bubble = bubbleRef.current;
    const dock = canvas?.parentElement;
    if (!canvas || !bubble || !dock) return;

    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) return;

    const vertex = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
    const fragment = `
      precision highp float;
      uniform sampler2D tex;
      uniform vec2 res,tres,toff;
      uniform float press;
      float sdf(vec2 p,vec2 h,float r){vec2 q=abs(p)-h+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
      vec3 S(vec2 fp,vec2 p,vec2 off,float z){
        vec3 c=vec3(0.);
        for(int i=0;i<5;i++){float a=float(i)*1.2566;vec2 o=vec2(cos(a),sin(a))*1.2;c+=texture2D(tex,(fp+toff+off+o-p*z)/tres).rgb;}
        return c/5.;
      }
      void main(){
        vec2 fp=vec2(gl_FragCoord.x,res.y-gl_FragCoord.y);vec2 p=fp-res*.5;
        float R=res.y*.5;vec2 h=res*.5;float d=sdf(p,h,R);
        float alpha=clamp(.5-d,0.,1.);
        float bevel=R*.8;
        vec2 n=normalize(vec2(sdf(p+vec2(1.,0.),h,R)-sdf(p-vec2(1.,0.),h,R),sdf(p+vec2(0.,1.),h,R)-sdf(p-vec2(0.,1.),h,R))+1e-5);
        float t=1.-clamp(-d/bevel,0.,1.);
        float k=t*t*(R*1.1)*(1.+press*.4);
        vec2 off=n*k;float z=.06+press*.03;
        vec3 c;c.r=S(fp,p,off*1.2,z).r;c.g=S(fp,p,off,z).g;c.b=S(fp,p,off*.8,z).b;
        float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,1.35);c=mix(c,vec3(1.),.08);
        float rim=smoothstep(2.5,0.,-d);
        vec2 L=normalize(vec2(-.6,-.8));
        float spec=pow(max(dot(n,L),0.),2.)+.6*pow(max(dot(n,-L),0.),2.);
        c+=rim*(.2+.5*spec)+(1.-smoothstep(0.,bevel,-d))*.06*spec;
        gl_FragColor=vec4(c*alpha,alpha);
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
    if (!vs || !fs) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const attribute = gl.getAttribLocation(program, "a");
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    ([[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]] as const).forEach(([p,v]) => gl.texParameteri(gl.TEXTURE_2D,p,v));

    const scene = document.createElement("canvas");
    const ctx = scene.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const margin = 60;
    const uniforms = (name: string) => gl.getUniformLocation(program, name);
    const uRes = uniforms("res"), uTextureSize = uniforms("tres"), uOffset = uniforms("toff"), uPress = uniforms("press"), uTex = uniforms("tex");
    let press = 0, pressed = 0, raf = 0, lastCapture = 0;
    const onDown = () => { pressed = 1; };
    const onUp = () => { pressed = 0; };
    dock.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    const drawScene = (ox: number, oy: number, width: number, height: number) => {
      if (!ctx) return;
      scene.width = Math.max(2, Math.round(width*dpr));
      scene.height = Math.max(2, Math.round(height*dpr));
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.fillStyle = getComputedStyle(document.body).backgroundColor || "#0c0c12";
      ctx.fillRect(0,0,width,height);
      ctx.translate(-ox,-oy);

      const hero = document.querySelector<HTMLElement>("[data-hero], .home-hero, #hero, main > section:first-child");
      if (hero) {
        const r = hero.getBoundingClientRect();
        if (r.bottom > oy && r.top < oy+height) {
          ctx.save(); ctx.beginPath(); ctx.rect(r.left,r.top,r.width,r.height); ctx.clip();
          const bg = getComputedStyle(hero).backgroundImage;
          const gradient = ctx.createLinearGradient(r.left,r.top,r.right,r.bottom);
          gradient.addColorStop(0,"#39206b"); gradient.addColorStop(1,"#101522");
          ctx.fillStyle = gradient; ctx.fillRect(r.left,r.top,r.width,r.height);
          if (bg && bg !== "none") {
            const glow = ctx.createRadialGradient(r.left+r.width*.72,r.top+r.height*.25,1,r.left+r.width*.72,r.top+r.height*.25,r.width*.75);
            glow.addColorStop(0,"rgba(167,139,250,.7)"); glow.addColorStop(1,"rgba(167,139,250,0)");
            ctx.fillStyle=glow;ctx.fillRect(r.left,r.top,r.width,r.height);
          }
          ctx.restore();
        }
      }

      document.querySelectorAll<HTMLElement>("h1,h2,h3").forEach((el) => {
        const r=el.getBoundingClientRect(); if(r.bottom<oy||r.top>oy+height||r.right<ox||r.left>ox+width)return;
        const style=getComputedStyle(el);ctx.font=style.fontWeight+" "+style.fontSize+" "+style.fontFamily;
        ctx.fillStyle=style.color || "#fff";ctx.textAlign="left";ctx.textBaseline="middle";
        ctx.fillText((el.textContent||"").trim().slice(0,64),r.left,r.top+r.height/2,Math.max(20,r.width));
      });

      document.querySelectorAll<HTMLImageElement>("main img, [data-movie-card] img, .movie-card img").forEach((img) => {
        const r=img.getBoundingClientRect();if(!img.complete||!img.naturalWidth||r.bottom<oy||r.top>oy+height||r.right<ox||r.left>ox+width)return;
        try { ctx.save();ctx.beginPath();ctx.roundRect(r.left,r.top,r.width,r.height,8);ctx.clip();ctx.drawImage(img,r.left,r.top,r.width,r.height);ctx.restore(); } catch { /* Cross-origin images are skipped safely. */ }
      });
    };

    const placeBubble = () => {
      const active = dock.querySelector<HTMLElement>(".gt-dock-item.is-active");
      if (!active) return;
      const navRect = dock.getBoundingClientRect(), itemRect = active.getBoundingClientRect();
      bubble.style.left = (itemRect.left-navRect.left+4)+"px";
      bubble.style.width = Math.max(0,itemRect.width-8)+"px";
    };
    const observer = new MutationObserver(placeBubble);
    observer.observe(dock,{subtree:true,attributes:true,attributeFilter:["class"]});
    const resizeObserver = new ResizeObserver(placeBubble);
    resizeObserver.observe(dock);
    placeBubble();

    const render = (now: number) => {
      const bounds=dock.getBoundingClientRect(), width=bounds.width, height=bounds.height;
      const pixelWidth=Math.max(2,Math.round(width*dpr)),pixelHeight=Math.max(2,Math.round(height*dpr));
      if(canvas.width!==pixelWidth||canvas.height!==pixelHeight){canvas.width=pixelWidth;canvas.height=pixelHeight;gl.viewport(0,0,pixelWidth,pixelHeight);}
      const textureWidth=width+margin*2,textureHeight=height+margin*2;
      if(now-lastCapture>90){
        drawScene(bounds.left-margin,bounds.top-margin,textureWidth,textureHeight);
        gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,scene);
        lastCapture=now;
      }
      press+=(pressed-press)*.15;
      gl.uniform1i(uTex,0);gl.uniform2f(uRes,pixelWidth,pixelHeight);
      gl.uniform2f(uTextureSize,scene.width,scene.height);gl.uniform2f(uOffset,margin*dpr,margin*dpr);gl.uniform1f(uPress,press);
      gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      raf=requestAnimationFrame(render);
    };
    raf=requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);observer.disconnect();resizeObserver.disconnect();
      dock.removeEventListener("pointerdown",onDown);window.removeEventListener("pointerup",onUp);window.removeEventListener("pointercancel",onUp);
      gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" className="gt-liquid-glass-canvas" />
      <div className="gt-liquid-glass-rim" aria-hidden="true" />
      <div ref={bubbleRef} className="gt-liquid-glass-bubble" aria-hidden="true" />
    </>
  );
}
