"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { HomeScreen } from "@/components/home-screen";
import { MovieListingScreen } from "@/components/movie-listing-screen";

const tabPaths = ["/", "/danh-sach/phim-bo", "/danh-sach/phim-le"];

function isTabPath(pathname: string) {
  return tabPaths.includes(pathname);
}

export function PersistentTabShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const scrollPositions = useRef(new Map<string, number>());
  const previousPath = useRef(pathname);
  const isHome = pathname === "/";
  const isSeries = pathname === "/danh-sach/phim-bo";
  const isSingle = pathname === "/danh-sach/phim-le";
  const isTabRoute = isTabPath(pathname);
  const isWatchRoute = pathname === "/xem-phim" || pathname.startsWith("/xem-phim/");

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

  const tabTransition = {
    opacity: { duration: 0.2, ease: "easeOut" as const },
    y: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const },
  };

  return (
    <div className="relative w-full overflow-x-clip">
      <motion.div
        aria-hidden={!isTabRoute}
        initial={false}
        animate={{ opacity: isTabRoute ? 1 : 0, y: isTabRoute ? 0 : 6 }}
        transition={tabTransition}
        className="w-full"
        style={{
          position: isTabRoute ? "relative" : "absolute",
          inset: isTabRoute ? "auto" : 0,
          pointerEvents: isTabRoute ? "auto" : "none",
          zIndex: isTabRoute ? 1 : 0,
          willChange: "opacity, transform",
        }}
      >
        <motion.div
          aria-hidden={!isHome}
          initial={false}
          animate={{ opacity: isHome ? 1 : 0, y: isHome ? 0 : 6 }}
          transition={tabTransition}
          className="w-full"
          style={{
            position: isHome ? "relative" : "absolute",
            inset: isHome ? "auto" : 0,
            pointerEvents: isHome ? "auto" : "none",
            willChange: "opacity, transform",
          }}
        >
          <HomeScreen />
        </motion.div>
        <motion.div
          aria-hidden={!isSeries}
          initial={false}
          animate={{ opacity: isSeries ? 1 : 0, y: isSeries ? 0 : 6 }}
          transition={tabTransition}
          className="w-full"
          style={{
            position: isSeries ? "relative" : "absolute",
            inset: isSeries ? "auto" : 0,
            pointerEvents: isSeries ? "auto" : "none",
            willChange: "opacity, transform",
          }}
        >
          <MovieListingScreen type="phim-bo" />
        </motion.div>
        <motion.div
          aria-hidden={!isSingle}
          initial={false}
          animate={{ opacity: isSingle ? 1 : 0, y: isSingle ? 0 : 6 }}
          transition={tabTransition}
          className="w-full"
          style={{
            position: isSingle ? "relative" : "absolute",
            inset: isSingle ? "auto" : 0,
            pointerEvents: isSingle ? "auto" : "none",
            willChange: "opacity, transform",
          }}
        >
          <MovieListingScreen type="phim-le" />
        </motion.div>
      </motion.div>

      <AnimatePresence initial={false} mode="sync">
        {!isTabRoute && !isWatchRoute ? (
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full min-w-0 bg-inherit"
            style={{ willChange: "opacity, transform" }}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {isWatchRoute ? (
        <div className="relative z-10 w-full min-w-0 bg-inherit">{children}</div>
      ) : null}
    </div>
  );
}
