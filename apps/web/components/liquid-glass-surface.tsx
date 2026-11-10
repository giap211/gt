"use client";

import { useEffect, useRef } from "react";

/**
 * WebGL liquid-glass surface prototype based on the supplied shader demo.
 * This first preview uses a generated texture; it validates the glass shape,
 * chromatic refraction and rim lighting before wiring a live DOM snapshot.
 */
export function LiquidGlassSurface() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: false });
    if (!gl) return;
    gl.getExtension("OES_standard_derivatives");

    const vertexSource = `
      attribute vec2 position;
      varying vec2 uv;
      void main() {
        uv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;
    const fragmentSource = `
      #extension GL_OES_standard_derivatives : enable
      precision highp float;
      varying vec2 uv;
      uniform sampler2D tex;
      uniform vec2 resolution;
      uniform float time;
      float roundedBox(vec2 p, vec2 b, float r) {
        vec2 q = abs(p) - b + vec2(r);
        return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
      }
      void main() {
        vec2 p = (uv - 0.5) * resolution;
        vec2 halfSize = vec2(resolution.x * 0.5 - 1.5, resolution.y * 0.5 - 1.5);
        float radius = resolution.y * 0.46;
        float d = roundedBox(p, halfSize, radius);
        float aa = max(fwidth(d), 0.8);
        float mask = 1.0 - smoothstep(-aa, aa, d);
        if (mask < 0.005) discard;

        float edge = 1.0 - smoothstep(0.0, 17.0, abs(d));
        vec2 normal = normalize(vec2(dFdx(d), dFdy(d)) + vec2(0.0001));
        float bevel = smoothstep(-18.0, 1.0, d) * (1.0 - smoothstep(1.0, 18.0, d));
        vec2 refractOffset = normal * edge * 0.035 + vec2(0.0, -0.012 * bevel);
        vec2 sampleUv = clamp(uv + refractOffset, 0.002, 0.998);

        float ca = edge * 0.0045;
        vec3 refracted;
        refracted.r = texture2D(tex, clamp(sampleUv + normal * ca, 0.002, 0.998)).r;
        refracted.g = texture2D(tex, sampleUv).g;
        refracted.b = texture2D(tex, clamp(sampleUv - normal * ca, 0.002, 0.998)).b;

        vec3 glassTint = vec3(0.48, 0.36, 0.88);
        float body = 0.17 + 0.09 * (0.5 + 0.5 * sin(uv.x * 8.0 + time * 0.25));
        vec3 color = mix(refracted, glassTint, body);
        float rim = smoothstep(16.0, 0.0, abs(d));
        float spec = pow(max(0.0, dot(normalize(vec3(normal, 0.9)), normalize(vec3(-0.3, 0.65, 0.8)))), 18.0);
        color += vec3(0.42, 0.34, 0.72) * rim * 0.23;
        color += vec3(1.0) * spec * edge * 0.18;
        float alpha = mask * (0.66 + edge * 0.24);
        gl_FragColor = vec4(color, alpha);
      }
    `;

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn("Liquid glass shader:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("Liquid glass program:", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const backdrop = document.createElement("canvas");
    const bg = backdrop.getContext("2d");
    const drawTexture = (w: number, h: number) => {
      backdrop.width = Math.max(2, w);
      backdrop.height = Math.max(2, h);
      if (!bg) return;
      const gradient = bg.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, "#17152f");
      gradient.addColorStop(0.45, "#433078");
      gradient.addColorStop(1, "#111827");
      bg.fillStyle = gradient;
      bg.fillRect(0, 0, w, h);
      const glow = bg.createRadialGradient(w * 0.72, h * 0.25, 2, w * 0.72, h * 0.25, w * 0.7);
      glow.addColorStop(0, "rgba(167,139,250,.85)");
      glow.addColorStop(1, "rgba(167,139,250,0)");
      bg.fillStyle = glow;
      bg.fillRect(0, 0, w, h);
      const cyan = bg.createRadialGradient(w * 0.15, h * 0.8, 1, w * 0.15, h * 0.8, w * 0.5);
      cyan.addColorStop(0, "rgba(34,211,238,.45)");
      cyan.addColorStop(1, "rgba(34,211,238,0)");
      bg.fillStyle = cyan;
      bg.fillRect(0, 0, w, h);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, backdrop);
    };

    const resolution = gl.getUniformLocation(program, "resolution");
    const timeUniform = gl.getUniformLocation(program, "time");
    gl.uniform1i(gl.getUniformLocation(program, "tex"), 0);
    let raf = 0;
    let start = performance.now();
    let width = 0;
    let height = 0;
    const render = (now: number) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextW = Math.max(2, Math.round(rect.width * dpr));
      const nextH = Math.max(2, Math.round(rect.height * dpr));
      if (nextW !== width || nextH !== height) {
        width = nextW;
        height = nextH;
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
        drawTexture(width, height);
        gl.uniform2f(resolution, width, height);
      }
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(timeUniform, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = window.requestAnimationFrame(render);
    };
    raf = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(raf);
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full rounded-[inherit]" />;
}
