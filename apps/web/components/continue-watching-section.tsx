"use client";

import { useEffect, useState } from "react";
import { MovieCarousel } from "@/components/movie-carousel";
import { useMember } from "@/components/member-provider";
import { memberClient, type WatchHistoryItem } from "@/lib/member-client";
import { getMovieDetail } from "@/lib/ophim-client";

export function ContinueWatchingSection() {
  const { user, loading: memberLoading } = useMember();
  const [items, setItems] = useState<WatchHistoryItem[]>([]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }

    let cancelled = false;
    memberClient.history()
      .then(async (result) => {
        const historyItems = result.items || [];
        if (cancelled) return;
        setItems(historyItems);

        // TMDB runtime is used only to draw the homepage's illustrative progress bar.
        const runtimeItems = await Promise.all(historyItems.slice(0, 20).map(async (item) => {
          if (Number(item.totalDurationSeconds) > 0) return item;
          try {
            const detail = await getMovieDetail(item.movieSlug);
            const tmdbId = String(detail?.movie?.tmdb?.id || "").trim();
            if (!tmdbId || !/^\d+$/.test(tmdbId)) return item;
            const type = detail?.movie?.tmdb?.type === "tv" ? "tv" : "movie";
            const response = await fetch(`/api/tmdb-runtime?id=${encodeURIComponent(tmdbId)}&type=${type}`);
            if (!response.ok) return item;
            const data = await response.json() as { runtimeSeconds?: number };
            const runtime = Number(data.runtimeSeconds || 0);
            return runtime > 0 ? { ...item, totalDurationSeconds: runtime } : item;
          } catch {
            return item;
          }
        }));
        if (!cancelled) setItems(runtimeItems);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

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
