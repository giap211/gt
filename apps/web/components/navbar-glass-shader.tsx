"use client";

import { useEffect, useRef } from "react";

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_scrolled;
out vec4 outColor;

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + vec2(r);
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 p = gl_FragCoord.xy - u_resolution * 0.5;
  vec2 halfSize = u_resolution * 0.5 - vec2(1.5);
  float radius = min(25.0, min(halfSize.x, halfSize.y) * 0.48);
  float distanceToEdge = roundedBox(p, halfSize, radius);
  float inside = 1.0 - smoothstep(0.0, 1.6, distanceToEdge);
  float rim = 1.0 - smoothstep(0.0, 9.0, abs(distanceToEdge));
  vec2 normal = normalize(vec2(dFdx(distanceToEdge), dFdy(distanceToEdge)) + vec2(0.0001));

  float sweep = p.x / max(u_resolution.x, 1.0);
  float movingGlare = exp(-pow((sweep - (0.18 + 0.13 * sin(u_time * 0.22))) * 5.2, 2.0));
  float topReflection = exp(-pow((p.y - halfSize.y * 0.78) / 13.0, 2.0));
  float edgeLight = pow(1.0 - abs(normal.y), 2.2) * rim;
  float sideLight = pow(1.0 - abs(normal.x), 2.0) * rim;
  float strength = mix(0.72, 1.0, u_scrolled);

  vec3 coolGlass = vec3(0.78, 0.88, 1.0);
  vec3 warmGlass = vec3(1.0, 0.88, 0.63);
  vec3 light = mix(coolGlass, warmGlass, smoothstep(0.25, 0.9, sweep));
  float alpha = inside * (0.025 + movingGlare * 0.055 + topReflection * 0.045)
              + rim * (0.13 + edgeLight * 0.27 + sideLight * 0.12)
              + movingGlare * topReflection * 0.07;
  alpha *= strength;
  outColor = vec4(light, clamp(alpha, 0.0, 0.42));
}`;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function NavbarGlassShader({ scrolled }: { scrolled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
      premultipliedAlpha: false,
    });
    if (!gl) return;

    const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertex || !fragment) {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
      return;
    }

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return;
    }

    const buffer = gl.createBuffer();
    if (!buffer) {
      gl.deleteProgram(program);
      return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    gl.useProgram(program);
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const scrolledLocation = gl.getUniformLocation(program, "u_scrolled");

    let frame = 0;
    let start = 0;
    let width = 0;
    let height = 0;
    let lastDraw = 0;
    let disposed = false;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, Math.round(rect.width * dpr));
      height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const draw = (timestamp: number) => {
      if (disposed) return;
      if (timestamp - lastDraw >= 32) {
        if (!start) start = timestamp;
        lastDraw = timestamp;
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(resolutionLocation, width, height);
        gl.uniform1f(timeLocation, (timestamp - start) / 1000);
        gl.uniform1f(scrolledLocation, scrolled ? 1 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      frame = window.requestAnimationFrame(draw);
    };

    frame = window.requestAnimationFrame(draw);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [scrolled]);

  return <canvas ref={canvasRef} className="navbar-glass-shader" aria-hidden="true" />;
}
