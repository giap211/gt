"use client";

import { useEffect } from "react";

/**
 * Drives one lightweight global highlight angle while the page is scrolling.
 * The angle follows scroll position, so reversing direction reverses the light.
 */
export function PosterScrollMotion() {
  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionPreference.matches) return;

    const root = document.documentElement;
    let lastY = window.scrollY;
    let angle = 0;
    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const nextY = window.scrollY;
        const delta = nextY - lastY;
        lastY = nextY;

        angle = (angle + delta * 0.72) % 360;
        if (angle < 0) angle += 360;
        root.style.setProperty("--poster-scroll-angle", `${angle.toFixed(1)}deg`);
        root.classList.add("poster-scroll-active");

      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
