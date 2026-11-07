"use client";

import { useEffect, useState } from "react";
import { MovieCarousel } from "@/components/movie-carousel";
import { useMember } from "@/components/member-provider";
import { memberClient, type WatchHistoryItem } from "@/lib/member-client";

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
      .then((result) => {
        if (!cancelled) setItems(result.items || []);
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
