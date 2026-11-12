"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MovieCarousel } from "@/components/movie-carousel";
import { useMember } from "@/components/member-provider";
import { memberClient, WATCH_HISTORY_UPDATED_EVENT, type WatchHistoryItem } from "@/lib/member-client";

function getEpisodeNumber(episodeName: string): number | null {
  const match = episodeName.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function getLatestEpisodePerMovie(history: WatchHistoryItem[]): WatchHistoryItem[] {
  const byMovie = new Map<string, WatchHistoryItem>();

  for (const item of history) {
    const existing = byMovie.get(item.movieSlug);
    if (!existing) {
      byMovie.set(item.movieSlug, item);
      continue;
    }

    const itemEpisode = getEpisodeNumber(item.episodeName);
    const existingEpisode = getEpisodeNumber(existing.episodeName);
    const hasHigherEpisode =
      itemEpisode !== null &&
      (existingEpisode === null || itemEpisode > existingEpisode);
    const sameEpisodeOrBothUnknown = itemEpisode === existingEpisode;
    const isMoreRecentlyUpdated =
      new Date(item.updatedAt).getTime() > new Date(existing.updatedAt).getTime();

    if (hasHigherEpisode || (sameEpisodeOrBothUnknown && isMoreRecentlyUpdated)) {
      byMovie.set(item.movieSlug, item);
    }
  }

  return Array.from(byMovie.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function ContinueWatchingSection() {
  const { user, loading: memberLoading } = useMember();
  const pathname = usePathname();
  const [items, setItems] = useState<WatchHistoryItem[]>([]);
  const previousPath = useRef(pathname);

  const refreshHistory = useCallback(async () => {
    if (!user) return;
    try {
      const result = await memberClient.history();
      setItems(getLatestEpisodePerMovie(result.items || []));
    } catch {
      // Keep the last successfully loaded history if the network is unavailable.
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    void refreshHistory();
  }, [user, refreshHistory]);

  useEffect(() => {
    if (!user) return;

    const handleHistoryUpdated = (event: Event) => {
      const item = (event as CustomEvent<WatchHistoryItem>).detail;
      if (!item?.movieSlug || !item.episodeName) return;
      setItems((current) => getLatestEpisodePerMovie([item, ...current]).slice(0, 30));
    };

    const refreshWhenActive = () => {
      if (pathname === "/" && document.visibilityState === "visible") {
        void refreshHistory();
      }
    };

    window.addEventListener(WATCH_HISTORY_UPDATED_EVENT, handleHistoryUpdated);
    window.addEventListener("focus", refreshWhenActive);
    document.addEventListener("visibilitychange", refreshWhenActive);

    // When another device updates the account, reconcile from Neon while Home is open.
    const intervalId = window.setInterval(refreshWhenActive, 15000);

    if (pathname === "/" && previousPath.current !== "/") {
      void refreshHistory();
    }
    previousPath.current = pathname;

    return () => {
      window.removeEventListener(WATCH_HISTORY_UPDATED_EVENT, handleHistoryUpdated);
      window.removeEventListener("focus", refreshWhenActive);
      document.removeEventListener("visibilitychange", refreshWhenActive);
      window.clearInterval(intervalId);
    };
  }, [user, pathname, refreshHistory]);

  if (memberLoading || !user || items.length === 0) return null;

  return (
    <MovieCarousel
      title="Phim đang xem"
      titleGradient="linear-gradient(235deg, #ffffff 30%, #ffd875 130%)"
      items={items.slice(0, 20).map((item) => ({
        id: item.id,
        title: item.movieTitle,
        posterUrl: item.posterUrl || "https://placehold.co/640x360/1a1c28/ffffff?text=Phim+Lau",
        slug: item.movieSlug,
        href: `/xem-phim/${item.movieSlug}?tap=${encodeURIComponent(item.episodeSlug || "")}&at=${Math.max(0, Math.floor(item.progressSeconds || 0))}`,
        progressSeconds: item.progressSeconds || 0,
        totalDurationSeconds: item.totalDurationSeconds || 0,
        simulateProgressWhenEmpty: true,
        episodeCurrent: item.episodeName ? `Tập ${item.episodeName}` : "Đang xem",
        language: "Đang xem",
      }))}
    />
  );
}
