"use client";

import { useEffect, useRef } from "react";

/**
 * Lightweight frosted-glass dock surface.
 * Uses CSS only; no WebGL, scene capture, image proxy, or animation loop.
 */
export function LiquidGlassDockSurface() {
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bubble = bubbleRef.current;
    const dock = bubble?.parentElement;
    if (!bubble || !dock) return;

    const placeBubble = () => {
      const active = dock.querySelector<HTMLElement>(".gt-dock-item.is-active");
      if (!active) {
        bubble.style.width = "0px";
        return;
      }
      const navRect = dock.getBoundingClientRect();
      const itemRect = active.getBoundingClientRect();
      bubble.style.left = itemRect.left - navRect.left + 4 + "px";
      bubble.style.width = Math.max(0, itemRect.width - 8) + "px";
    };

    const observer = new MutationObserver(placeBubble);
    observer.observe(dock, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    const resizeObserver = new ResizeObserver(placeBubble);
    resizeObserver.observe(dock);
    placeBubble();

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <>
      <div className="gt-liquid-glass-blur" aria-hidden="true" />
      <div
        ref={bubbleRef}
        className="gt-liquid-glass-bubble"
        aria-hidden="true"
      />
    </>
  );
}
