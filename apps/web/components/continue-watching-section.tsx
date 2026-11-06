"use client";

import { useEffect, useState } from "react";
import { MovieCarousel } from "@/components/movie-carousel";
import { useMember } from "@/components/member-provider";
import { memberClient, type WatchHistoryItem } from "@/lib/member-client";
import { getMovieDetail } from "@/lib/ophim-client";

const parseRuntimeSeconds = (value?: string): number => {
  if (!value) return 0;
  const text = value.toLowerCase().trim();
  const hours = Number(text.match(/(\d+(?:\.\d+)?)\s*(?:giờ|hours?|hrs?|h)\b/)?.[1] || 0);
  const minutes = Number(text.match(/(\d+(?:\.\d+)?)\s*(?:phút|minutes?|mins?|m)\b/)?.[1] || 0);
  if (hours > 0 || minutes > 0) return Math.round((hours * 60 + minutes) * 60);
  const plainMinutes = text.match(/^(\d+(?:\.\d+)?)\s*(?:p|phút)?$/);
  return plainMinutes ? Math.round(Number(plainMinutes[1]) * 60) : 0;
};

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

        // TMDB/runtime metadata is used only for the homepage's illustrative progress bar.
        const runtimeItems = await Promise.all(historyItems.slice(0, 20).map(async (item) => {
          if (Number(item.totalDurationSeconds) > 0) return item;
          try {
            const detail = await getMovieDetail(item.movieSlug);
            const movie = detail?.movie;
            if (!movie) return item;

            // Trust the source movie type: single films use TMDB's movie endpoint.
            const type = movie.type === "series" || movie.type === "tvshows"
              ? "tv"
              : movie.type === "single"
                ? "movie"
                : movie.tmdb?.type === "tv" ? "tv" : "movie";
            const tmdbId = String(movie.tmdb?.id || "").trim();

            if (tmdbId && /^\d+$/.test(tmdbId)) {
              const response = await fetch(`/api/tmdb-runtime?id=${encodeURIComponent(tmdbId)}&type=${type}`);
              if (response.ok) {
                const data = await response.json() as { runtimeSeconds?: number };
                const runtime = Number(data.runtimeSeconds || 0);
                if (runtime > 0) return { ...item, totalDurationSeconds: runtime };
              }
            }

            // OPhim duration is a display-only fallback, never persisted to watch history.
            const fallbackRuntime = parseRuntimeSeconds(movie.time);
            return fallbackRuntime > 0
              ? { ...item, totalDurationSeconds: fallbackRuntime }
              : item;
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
