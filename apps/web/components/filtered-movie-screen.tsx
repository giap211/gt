"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FilterBar } from "@/components/filter-bar";
import { InfiniteMovieGrid } from "@/components/infinite-movie-grid";
import { getFilteredMovies, type LatestMoviesResponse, type ListMovie, type MovieFilters } from "@/lib/ophim-client";

export function FilteredMovieScreen({ initialFilters }: { initialFilters: MovieFilters }) {
  const router = useRouter();
  const filters = useMemo(() => initialFilters, [initialFilters.type, initialFilters.category, initialFilters.country, initialFilters.year, initialFilters.sortField, initialFilters.sortType, initialFilters.sortLang]);
  const [movies, setMovies] = useState<ListMovie[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const fetchPage = useCallback((page: number): Promise<LatestMoviesResponse> => getFilteredMovies(filters, page), [filters]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoaded(false);
    fetchPage(1).then((response) => {
      if (cancelled) return;
      setMovies(response.status ? response.items : []);
      setTotalPages(response.status ? response.pagination.totalPages || 1 : 1);
    }).catch((error) => {
      console.error("Filtered movie request failed", error);
      if (!cancelled) { setMovies([]); setTotalPages(1); }
    }).finally(() => {
      if (!cancelled) { setLoading(false); setLoaded(true); }
    });
    return () => { cancelled = true; };
  }, [fetchPage]);

  const activeCount = [filters.type, filters.category, filters.country, filters.year, filters.sortLang].filter(Boolean).length;
  return (
    <main className="collection-page min-h-screen bg-[#0b0d14] px-3 pb-28 pt-24 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-white/45">Thư viện phim</p>
            <h1 className="text-2xl font-black tracking-tight sm:text-4xl">Kết quả lọc phim</h1>
            <p className="mt-2 text-xs text-white/45">{activeCount ? `${activeCount} tiêu chí đang áp dụng` : "Tất cả phim từ PhimAPI"}</p>
          </div>
          <button type="button" onClick={() => router.push("/danh-sach/phim-le")} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white/70">Danh sách phim</button>
        </div>
        <FilterBar />
        {loading && !loaded ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }, (_, i) => <div key={i} className="animate-pulse"><div className="aspect-[2/3] rounded-xl bg-white/[.07]"/><div className="mt-2 h-3 w-4/5 rounded bg-white/[.07]"/></div>)}
          </div>
        ) : movies.length ? (
          <InfiniteMovieGrid key={JSON.stringify(filters)} initialItems={movies} initialTotalPages={totalPages} fetchMore={fetchPage} type={filters.type} />
        ) : (
          <div className="py-24 text-center text-sm text-white/45">Không tìm thấy phim phù hợp với các tiêu chí đã chọn.</div>
        )}
      </div>
    </main>
  );
}
