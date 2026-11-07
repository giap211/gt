"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { Clapperboard, Tv, Sparkles } from "lucide-react";
import { InfiniteMovieGrid } from "@/components/infinite-movie-grid";
import { FilterBar } from "@/components/filter-bar";
import {
  getMoviesByType,
  getLatestMovies,
  type ListMovie,
} from "@/lib/ophim-client";

export default function ListingPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = use(params);
  const [movies, setMovies] = useState<ListMovie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  const titleMap: Record<string, string> = {
    "phim-le": "Phim Lẻ Mới",
    "phim-bo": "Phim Bộ Mới",
    "hoat-hinh": "Phim Hoạt Hình",
    "tv-shows": "TV Shows",
    "phim-moi": "Phim Mới Cập Nhật",
  };

  const isSeries = type === "phim-bo";
  const isSingle = type === "phim-le";
  const isMainMovieType = isSeries || isSingle;
  const pageTitle = isSeries ? "Phim Bộ" : isSingle ? "Phim Lẻ" : titleMap[type] || "Danh sách phim";
  const pageSubtitle = isSeries
    ? "Khám phá những series hấp dẫn, cập nhật tập mới mỗi ngày."
    : "Tuyển chọn phim điện ảnh đặc sắc, xem trọn vẹn mọi khoảnh khắc.";

  const fetchMoviesFromAPI = useCallback(
    (page: number) => {
      if (type === "phim-moi") {
        return getLatestMovies(page);
      }
      return getMoviesByType(type, page);
    },
    [type],
  );

  useEffect(() => {
    let cancelled = false;

    const fetchInitial = async () => {
      setIsLoading(true);
      try {
        // Load several pages together for a full first screen.
        const pages = [1, 2, 3, 4, 5];
        const responses = await Promise.all(
          pages.map((page) => fetchMoviesFromAPI(page)),
        );

        if (cancelled) return;

        const validResults = responses.filter((result) => result && result.status);
        if (validResults.length > 0) {
          const allItems = validResults.flatMap((result) => result.items || []);
          const unique = Array.from(
            new Map(allItems.map((movie) => [movie._id, movie])).values(),
          );

          setMovies(unique.slice(0, 200));
          const firstResult = validResults[0];
          setTotalPages(firstResult?.pagination?.totalPages || 1);
        } else {
          setMovies([]);
          setTotalPages(1);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch initial", error);
          setMovies([]);
          setTotalPages(1);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setHasLoaded(true);
        }
      }
    };

    void fetchInitial();
    return () => {
      cancelled = true;
    };
  }, [fetchMoviesFromAPI]);

  const renderSkeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-8" aria-label="Đang tải danh sách phim">
      {Array.from({ length: 12 }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="aspect-[2/3] rounded-2xl bg-white/[0.07] border border-white/[0.06]" />
          <div className="mt-3 h-3 w-4/5 rounded-full bg-white/[0.08]" />
          <div className="mt-2 h-2.5 w-2/3 rounded-full bg-white/[0.05]" />
        </div>
      ))}
    </div>
  );

  return (
    <main className="min-h-screen bg-[#0b0d14] text-white">
      <style jsx global>{`
        @media (max-width: 1023px) {
          html[data-mobile-theme="light"] .listing-hero-card {
            background: linear-gradient(145deg, rgba(255,255,255,.98), rgba(242,245,250,.96)) !important;
            border-color: rgba(45,57,78,.12) !important;
            box-shadow: 0 14px 34px rgba(37,49,69,.08) !important;
          }
          html[data-mobile-theme="light"] .listing-hero-eyebrow {
            color: #9a762d !important;
          }
          html[data-mobile-theme="light"] .listing-hero-title {
            color: #263247 !important;
            text-shadow: none !important;
          }
          html[data-mobile-theme="light"] .listing-hero-subtitle {
            color: #687184 !important;
          }
          html[data-mobile-theme="light"] .listing-tab-inactive {
            color: #596477 !important;
            background: rgba(40,52,72,.055) !important;
            border-color: rgba(40,52,72,.08) !important;
          }
        }
      `}</style>

      <div className="pt-24 container mx-auto px-4 lg:px-8 pb-20">
        {isMainMovieType ? (
          <section className="listing-hero-card relative mb-6 sm:mb-8 overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-br from-[#1a1e2c] via-[#141824] to-[#10131d] px-4 py-5 sm:px-6 sm:py-6 shadow-[0_18px_48px_rgba(0,0,0,.24)]">
            <div className="pointer-events-none absolute -right-12 -top-20 h-52 w-52 rounded-full bg-[#ffd875]/[0.09] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/3 h-40 w-56 rounded-full bg-indigo-400/[0.08] blur-3xl" />

            <div className="relative flex items-center gap-3 sm:gap-4">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl border border-[#ffd875]/25 bg-[#ffd875]/[0.12] text-[#ffd875] shadow-[inset_0_1px_0_rgba(255,255,255,.12)]">
                {isSeries ? <Tv size={25} strokeWidth={1.8} /> : <Clapperboard size={25} strokeWidth={1.8} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="listing-hero-eyebrow flex items-center gap-1.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#ffd875]/80">
                  <Sparkles size={11} />
                  GIAPTRAN · THƯ VIỆN PHIM
                </div>
                <h1 className="listing-hero-title mt-1 text-[26px] sm:text-3xl font-black tracking-tight text-white">
                  {pageTitle}
                  <span className="ml-2 align-middle rounded-md border border-[#ffd875]/30 bg-[#ffd875]/10 px-1.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-[#ffd875]">
                    {isSeries ? "Series" : "Movies"}
                  </span>
                </h1>
                <p className="listing-hero-subtitle mt-1 max-w-xl text-[11px] sm:text-xs leading-relaxed text-white/50">
                  {pageSubtitle}
                </p>
              </div>
              <div className="hidden sm:flex shrink-0 flex-col items-end rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-2.5">
                <span className="text-xl font-black tabular-nums text-[#ffd875]">
                  {movies.length ? movies.length.toLocaleString("vi-VN") : "—"}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/35">Phim hiển thị</span>
              </div>
            </div>

            <div className="relative mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.08] bg-black/10 p-1.5">
              <Link
                href="/danh-sach/phim-bo"
                scroll={false}
                prefetch
                aria-current={isSeries ? "page" : undefined}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs sm:text-sm font-bold transition-all duration-200 active:scale-[0.98] ${
                  isSeries
                    ? "border-[#ffd875]/35 bg-gradient-to-r from-[#ffd875] to-[#f2bd4e] text-[#171923] shadow-[0_4px_16px_rgba(255,216,117,.18)]"
                    : "listing-tab-inactive border-transparent bg-white/[0.045] text-white/55 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                <Tv size={16} />
                Phim bộ
                {isSeries && <span className="h-1.5 w-1.5 rounded-full bg-[#171923]" />}
              </Link>
              <Link
                href="/danh-sach/phim-le"
                scroll={false}
                prefetch
                aria-current={isSingle ? "page" : undefined}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs sm:text-sm font-bold transition-all duration-200 active:scale-[0.98] ${
                  isSingle
                    ? "border-[#ffd875]/35 bg-gradient-to-r from-[#ffd875] to-[#f2bd4e] text-[#171923] shadow-[0_4px_16px_rgba(255,216,117,.18)]"
                    : "listing-tab-inactive border-transparent bg-white/[0.045] text-white/55 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                <Clapperboard size={16} />
                Phim lẻ
                {isSingle && <span className="h-1.5 w-1.5 rounded-full bg-[#171923]" />}
              </Link>
            </div>

            <div className="relative mt-3 flex items-center justify-between text-[10px] text-white/35 sm:hidden">
              <span>{movies.length ? `${movies.length.toLocaleString("vi-VN")} phim đang hiển thị` : "Danh sách phim dành cho bạn"}</span>
              <span className="flex items-center gap-1"><Sparkles size={11} className="text-[#ffd875]" /> Cập nhật liên tục</span>
            </div>
          </section>
        ) : (
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 bg-[#ffd875] rounded-full shadow-[0_0_15px_rgba(255,216,117,0.4)]"></div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter italic uppercase text-white drop-shadow-md">
                {titleMap[type] || "Danh sách phim"}
              </h1>
            </div>
            {movies.length > 0 && (
              <div className="text-sm font-bold text-white/30 uppercase tracking-[0.2em]">
                {movies.length.toLocaleString("vi-VN")} phim
              </div>
            )}
          </div>
        )}

        <FilterBar />

        {isLoading && !hasLoaded ? (
          renderSkeleton()
        ) : movies.length > 0 ? (
          <div className="relative">
            {isLoading && hasLoaded && (
              <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold text-[#ffd875]/70" role="status">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ffd875]" />
                Đang chuyển danh mục...
              </div>
            )}
            <div className={`transition-opacity duration-200 ${isLoading && hasLoaded ? "opacity-75" : "opacity-100"}`}>
              <InfiniteMovieGrid
                initialItems={movies}
                initialTotalPages={totalPages}
                initialPage={5}
                fetchMore={fetchMoviesFromAPI}
                type={type}
              />
            </div>
          </div>
        ) : (
          <div className="py-24 text-center text-sm font-medium text-white/40">
            Không tìm thấy phim trong danh mục này.
          </div>
        )}
      </div>
    </main>
  );
}
