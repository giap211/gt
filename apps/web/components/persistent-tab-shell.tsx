"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { HomeScreen } from "@/components/home-screen";
import { MovieListingScreen } from "@/components/movie-listing-screen";

const tabPaths = ["/", "/danh-sach/phim-bo", "/danh-sach/phim-le"];

function isTabPath(pathname: string) {
  return tabPaths.includes(pathname);
}

const routeVariants: Variants = {
  enter: (direction: number) => ({
    x: direction === -1 ? "-100%" : "100%",
    opacity: 0.98,
  }),
  center: { x: "0%", opacity: 1 },
  exit: (direction: number) => ({
    x: direction === -1 ? "100%" : "-22%",
    opacity: 0.96,
  }),
};

export function PersistentTabShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const scrollPositions = useRef(new Map<string, number>());
  const previousPath = useRef(pathname);
  const navigationDirection = useRef<1 | -1>(1);
  const isHome = pathname === "/";
  const isSeries = pathname === "/danh-sach/phim-bo";
  const isSingle = pathname === "/danh-sach/phim-le";
  const isTabRoute = isTabPath(pathname);

  useEffect(() => {
    const markBackNavigation = () => { navigationDirection.current = -1; };
    window.addEventListener("popstate", markBackNavigation);
    return () => window.removeEventListener("popstate", markBackNavigation);
  }, []);

  useEffect(() => {
    const rememberTabScroll = (event: MouseEvent) => {
      if (!isTabPath(pathname)) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin === window.location.origin && destination.pathname !== pathname) {
        scrollPositions.current.set(pathname, window.scrollY);
      }
    };
    document.addEventListener("click", rememberTabScroll, true);
    return () => document.removeEventListener("click", rememberTabScroll, true);
  }, [pathname]);

  useEffect(() => {
    const previous = previousPath.current;
    if (isTabPath(pathname) && previous !== pathname) {
      const top = scrollPositions.current.get(pathname) ?? 0;
      requestAnimationFrame(() => window.scrollTo({ top, left: 0, behavior: "instant" }));
    }
    previousPath.current = pathname;
  }, [pathname]);

  useEffect(() => {
    // A completed navigation starts the next forward transition by default.
    // popstate sets this to -1 before the pathname changes for browser Back.
    const reset = window.setTimeout(() => { navigationDirection.current = 1; }, 450);
    return () => window.clearTimeout(reset);
  }, [pathname]);

  return (
    <div className="relative w-full min-h-[60vh] overflow-x-clip">
      <div
        aria-hidden={!isTabRoute}
        className={isTabRoute ? "block" : "hidden"}
      >
        <div hidden={!isHome}><HomeScreen /></div>
        <div hidden={!isSeries}><MovieListingScreen type="phim-bo" /></div>
        <div hidden={!isSingle}><MovieListingScreen type="phim-le" /></div>
      </div>

      <AnimatePresence initial={false} mode="sync" custom={navigationDirection.current}>
        {!isTabRoute ? (
          <motion.div
            key={pathname}
            custom={navigationDirection.current}
            variants={routeVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "tween", duration: 0.46, ease: [0.22, 1, 0.36, 1] },
              opacity: { duration: 0.3 },
            }}
            className="relative z-10 w-full min-w-0 bg-inherit"
            style={{ willChange: "transform" }}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
