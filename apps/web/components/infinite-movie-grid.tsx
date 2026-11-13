"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { MovieCard } from "./movie-card";
import { ListMovie, LatestMoviesResponse } from "@/lib/ophim-client";
import type { MovieListingFilters } from "./filter-bar";

interface InfiniteMovieGridProps {
  initialItems: ListMovie[];
  initialTotalPages: number;
  initialPage?: number;
  fetchMore: (page: number) => Promise<LatestMoviesResponse | null>;
  type?: string;
}

const EMPTY_FILTERS: MovieListingFilters = {
  genres: [], countries: [], years: [], qualities: [], languages: [], sort: "latest",
};

const normalizeFilterValue = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

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
  const [filters, setFilters] = useState<MovieListingFilters>(EMPTY_FILTERS);
  const observer = useRef<IntersectionObserver | null>(null);

  const loadMore = useCallback(
    async (page: number) => {
      if (loadingMore || page > totalPages) return;
      setLoadingMore(true);
      try {
        const res = await fetchMore(page);
        if (res && res.status) {
          setMovies((prev) => Array.from(new Map([...prev, ...res.items].map((movie) => [movie._id, movie])).values()));
          setTotalPages(res.pagination.totalPages);
        }
      } catch (error) {
        console.error("Failed to fetch more movies", error);
      } finally {
        setLoadingMore(false);
      }
    },
    [fetchMore, loadingMore, totalPages],
  );

  const filteredMovies = useMemo(() => {
    const matchesAny = (values: string[], candidates: string[]) =>
      values.length === 0 || values.some((value) => candidates.some((candidate) => {
        const normalized = normalizeFilterValue(candidate);
        return normalized === normalizeFilterValue(value) || normalized.includes(normalizeFilterValue(value));
      }));

    const filtered = movies.filter((movie) => {
      const categories = (movie.category || []).flatMap((item) => [item.slug || "", item.name || ""]);
      const countries = (movie.country || []).flatMap((item) => [item.slug || "", item.name || ""]);
      const quality = normalizeFilterValue(movie.quality || "HD");
      const language = normalizeFilterValue(movie.lang || "Vietsub");
      return matchesAny(filters.genres, categories) &&
        matchesAny(filters.countries, countries) &&
        (filters.years.length === 0 || filters.years.includes(String(movie.year))) &&
        (filters.qualities.length === 0 || filters.qualities.some((value) => quality.includes(normalizeFilterValue(value)))) &&
        (filters.languages.length === 0 || filters.languages.some((value) => language.includes(normalizeFilterValue(value))));
    });

    return filtered.sort((a, b) => {
      if (filters.sort === "year-desc") return (b.year || 0) - (a.year || 0);
      if (filters.sort === "year-asc") return (a.year || 0) - (b.year || 0);
      if (filters.sort === "views") return (b.view || 0) - (a.view || 0);
      if (filters.sort === "rating") return Number(b.rating || 0) - Number(a.rating || 0);
      return 0;
    });
  }, [movies, filters]);

  useEffect(() => {
    const handleFilters = (event: Event) => {
      const customEvent = event as CustomEvent<MovieListingFilters>;
      setFilters(customEvent.detail || EMPTY_FILTERS);
    };
    window.addEventListener("movie-listing-filters-change", handleFilters);
    return () => window.removeEventListener("movie-listing-filters-change", handleFilters);
  }, []);

  const lastMovieElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observer.current) observer.current.disconnect();
      if (!node || loadingMore || filtersActive(filters)) return;
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting && currentPage < totalPages && !loadingMore) {
          const nextPage = currentPage + 1;
          setCurrentPage(nextPage);
          void loadMore(nextPage);
        }
      }, { rootMargin: "700px 0px" });
      observer.current.observe(node);
    },
    [loadingMore, currentPage, totalPages, loadMore, filters],
  );

  useEffect(() => {
    setMovies(initialItems);
    setTotalPages(initialTotalPages);
    setCurrentPage(initialPage);
  }, [initialItems, initialTotalPages, initialPage]);

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

  const activeFilters = filtersActive(filters);

  return (
    <div className="w-full">
      <div className="listing-movie-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-10">
        {filteredMovies.map((movie, index) => (
          <div key={movie._id} ref={index === filteredMovies.length - 1 ? lastMovieElementRef : null} className="animate-card-fade">
            <MovieCard {...transformMovie(movie)} />
          </div>
        ))}
      </div>

      {activeFilters && filteredMovies.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-sm font-semibold text-current/60">Không tìm thấy phim phù hợp trong các kết quả đã tải.</p>
          <p className="mt-2 text-xs text-current/40">Hãy bỏ bớt tiêu chí hoặc tải thêm dữ liệu trước khi lọc.</p>
          {currentPage < totalPages && (
            <button type="button" disabled={loadingMore} onClick={() => { const next = currentPage + 1; setCurrentPage(next); void loadMore(next); }} className="mt-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{loadingMore ? "Đang tải…" : "Tải thêm phim để lọc"}</button>
          )}
        </div>
      )}

      {loadingMore && (
        <div className="mt-20 flex flex-col items-center justify-center gap-4 py-8">
          <div className="w-8 h-8 border-[3px] border-violet-400/40 border-t-violet-400 rounded-full animate-spin" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-violet-400/50 animate-pulse">Đang tải thêm phim…</span>
        </div>
      )}

      {!loadingMore && currentPage >= totalPages && filteredMovies.length > 0 && (
        <div className="mt-24 text-center">
          <span className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.5em] text-current/20">Bạn đã xem hết danh sách</span>
        </div>
      )}
    </div>
  );
};

function filtersActive(filters: MovieListingFilters) {
  return filters.genres.length > 0 || filters.countries.length > 0 || filters.years.length > 0 ||
    filters.qualities.length > 0 || filters.languages.length > 0 || filters.sort !== "latest";
}
