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
  const navigationDirection = useRef<1 | -1>(1);
  const isHome = pathname === "/";
  const isSeries = pathname === "/danh-sach/phim-bo";
  const isSingle = pathname === "/danh-sach/phim-le";
  const isTabRoute = isTabPath(pathname);
  const isWatchRoute = pathname.startsWith("/xem-phim/");

  useEffect(() => {
    const markBackNavigation = () => { navigationDirection.current = -1; };
    window.addEventListener("popstate", markBackNavigation);
    return () => window.removeEventListener("popstate", markBackNavigation);
  }, []);

  useEffect(() => {
    navigationDirection.current = 1;
  }, [pathname]);

  useEffect(() => {
    const rememberTabScroll = (event: MouseEvent) => {
      if (!isTabPath(pathname)) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (destination.pathname !== pathname) {
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
      requestAnimationFrame(() => {
        window.scrollTo({ top, left: 0, behavior: "instant" });
      });
    }
    previousPath.current = pathname;
  }, [pathname]);

  return (
    <>
      <div hidden={!isTabRoute}>
        <div hidden={!isHome}>
          <HomeScreen />
        </div>
        <div hidden={!isSeries}>
          <MovieListingScreen type="phim-bo" />
        </div>
        <div hidden={!isSingle}>
          <MovieListingScreen type="phim-le" />
        </div>
      </div>
      {!isTabRoute ? (
        isWatchRoute ? children : (
          <div className="relative w-full overflow-x-clip">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                initial={{ x: navigationDirection.current === -1 ? "-100%" : "100%", opacity: 0.96 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: navigationDirection.current === -1 ? "18%" : "-18%", opacity: 0.94 }}
                transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                className="w-full min-w-0"
                style={{ willChange: "transform" }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        )
      ) : null}
    </>
  );
}
