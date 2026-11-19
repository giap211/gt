"use client";

import { useEffect, useRef, useState } from "react";
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
  const [visitedTabs, setVisitedTabs] = useState(() => ({ home: pathname === "/", series: pathname === "/danh-sach/phim-bo", single: pathname === "/danh-sach/phim-le" }));
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
    if (pathname === "/") setVisitedTabs((tabs) => tabs.home ? tabs : { ...tabs, home: true });
    if (pathname === "/danh-sach/phim-bo") setVisitedTabs((tabs) => tabs.series ? tabs : { ...tabs, series: true });
    if (pathname === "/danh-sach/phim-le") setVisitedTabs((tabs) => tabs.single ? tabs : { ...tabs, single: true });
  }, [pathname]);

  useEffect(() => {
    const previous = previousPath.current;
    if (isTabPath(pathname) && previous !== pathname) {
      const top = scrollPositions.current.get(pathname) ?? 0;
      requestAnimationFrame(() => window.scrollTo({ top, left: 0, behavior: "instant" }));
    }
    previousPath.current = pathname;
  }, [pathname]);

  return (
    <div className="relative w-full overflow-x-clip">
      <div aria-hidden={!isTabRoute} className="w-full" style={{ display: isTabRoute ? "block" : "none" }}>
        <div
          aria-hidden={!isHome}
          className="w-full"
          style={{ display: isHome ? "block" : "none", pointerEvents: isHome ? "auto" : "none" }}
        >
          {visitedTabs.home ? <HomeScreen /> : null}
        </div>
        <div
          aria-hidden={!isSeries}
          className="w-full"
          style={{ display: isSeries ? "block" : "none", pointerEvents: isSeries ? "auto" : "none" }}
        >
          {visitedTabs.series ? <MovieListingScreen type="phim-bo" /> : null}
        </div>
        <div
          aria-hidden={!isSingle}
          className="w-full"
          style={{ display: isSingle ? "block" : "none", pointerEvents: isSingle ? "auto" : "none" }}
        >
          {visitedTabs.single ? <MovieListingScreen type="phim-le" /> : null}
        </div>
      </div>

      {!isTabRoute && !isWatchRoute ? (
        <div key={pathname} className="relative z-10 w-full min-w-0 bg-inherit">
          {children}
        </div>
      ) : null}

      {isWatchRoute ? (
        <div className="relative z-10 w-full min-w-0 bg-inherit">{children}</div>
      ) : null}
    </div>
  );
}
