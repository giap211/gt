"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { MovieCard } from "./movie-card";
import { ListMovie, LatestMoviesResponse } from "@/lib/ophim-client";

interface InfiniteMovieGridProps {
  initialItems: ListMovie[];
  initialTotalPages: number;
  initialPage?: number;
  fetchMore: (page: number) => Promise<LatestMoviesResponse | null>;
  type?: string;
}

export const InfiniteMovieGrid = ({
  initialItems,
  initialTotalPages,
  initialPage = 1,
  fetchMore,
  type,
}: InfiniteMovieGridProps) => {
  const [movies, setMovies] = useState<ListMovie[]>(initialItems);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const loadingRef = useRef(false);
  const observer = useRef<IntersectionObserver | null>(null);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || currentPage >= totalPages) return;
    loadingRef.current = true;
    setLoadingMore(true);
    const nextPage = currentPage + 1;
    try {
      const res = await fetchMore(nextPage);
      if (res?.status) {
        setMovies((prev) => Array.from(
          new Map([...prev, ...res.items].map((movie) => [movie._id || movie.slug, movie])).values(),
        ));
        setCurrentPage(nextPage);
        setTotalPages(res.pagination?.totalPages || totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch next movie page", error);
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [currentPage, totalPages, fetchMore]);

  const lastMovieElementRef = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect();
    if (!node || loadingMore || currentPage >= totalPages) return;
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void loadMore();
    }, { rootMargin: "900px 0px", threshold: 0.01 });
    observer.current.observe(node);
  }, [loadingMore, currentPage, totalPages, loadMore]);

  useEffect(() => {
    setMovies(initialItems);
    setCurrentPage(initialPage);
    setTotalPages(initialTotalPages);
    loadingRef.current = false;
  }, [initialItems, initialPage, initialTotalPages]);

  useEffect(() => () => observer.current?.disconnect(), []);

  const transformMovie = (m: ListMovie) => ({
    id: m._id,
    title: m.name,
    originalTitle: m.origin_name,
    posterUrl: m.poster_url,
    thumbUrl: m.thumb_url,
    slug: m.slug,
    year: m.year,
    quality: m.quality || "HD",
    language: m.lang || "PĐ",
    view: m.view,
    rating: m.rating,
    isSeries: type === "phim-bo",
    variant: "vertical" as const,
  });

  return (
    <div className="w-full">
      <div className="listing-movie-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-10">
        {movies.map((movie, index) => (
          <div key={movie._id || movie.slug} ref={index === movies.length - 1 ? lastMovieElementRef : null} className="animate-card-fade">
            <MovieCard {...transformMovie(movie)} />
          </div>
        ))}
      </div>
      {loadingMore && (
        <div className="mt-12 flex items-center justify-center gap-3 py-8" role="status">
          <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-violet-400/30 border-t-violet-400" />
          <span className="text-xs font-semibold text-white/55">Đang tải thêm phim…</span>
        </div>
      )}
      {!loadingMore && currentPage >= totalPages && movies.length > 0 && (
        <p className="mt-16 text-center text-xs font-medium text-white/35">Bạn đã xem hết danh sách phim.</p>
      )}
    </div>
  );
};
