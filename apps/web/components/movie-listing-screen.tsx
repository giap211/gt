"use client";

import { useEffect, useState, useCallback, type CSSProperties } from "react";
import Link from "next/link";
import { Clapperboard, Tv, Sparkles, Play, ArrowUpRight, Film } from "lucide-react";
import { InfiniteMovieGrid } from "@/components/infinite-movie-grid";
import { FilterBar } from "@/components/filter-bar";
import {
  getMoviesByType,
  getLatestMovies,
  type ListMovie,
} from "@/lib/ophim-client";

export function MovieListingScreen({ type }: { type: string }) {
  const [movies, setMovies] = useState<ListMovie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  const titleMap: Record<string, string> = {
    "phim-le": "Phim Lẻ",
    "phim-bo": "Phim Bộ",
    "hoat-hinh": "Phim Hoạt Hình",
    "tv-shows": "TV Shows",
    "phim-moi": "Phim Mới Cập Nhật",
  };

  const isSeries = type === "phim-bo";
  const isSingle = type === "phim-le";
  const isMainMovieType = isSeries || isSingle;
  const pageTitle = isSeries ? "Phim Bộ" : isSingle ? "Phim Lẻ" : titleMap[type] || "Danh sách phim";
  const pageSubtitle = isSeries
    ? "Theo chân những câu chuyện dài tập, cập nhật những tập mới mỗi ngày."
    : "Những bộ phim điện ảnh nổi bật, tuyển chọn dành riêng cho bạn.";

  const fetchMoviesFromAPI = useCallback(
    (page: number) => type === "phim-moi" ? getLatestMovies(page) : getMoviesByType(type, page),
    [type],
  );

  useEffect(() => {
    let cancelled = false;
    const fetchInitial = async () => {
      setIsLoading(true);
      try {
        // Fetch only the first page initially. InfiniteMovieGrid loads later
        // pages when the viewer reaches the end of the current results.
        const firstPage = await fetchMoviesFromAPI(1);
        if (cancelled) return;
        if (firstPage?.status) {
          const unique = Array.from(
            new Map((firstPage.items || []).map((movie) => [movie._id, movie])).values(),
          );
          setMovies(unique);
          setTotalPages(firstPage.pagination?.totalPages || 1);
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
    return () => { cancelled = true; };
  }, [fetchMoviesFromAPI]);

  const renderSkeleton = () => (
    <div className="listing-movie-grid" aria-label="Đang tải danh sách phim">
      {Array.from({ length: 12 }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="aspect-[2/3] rounded-2xl bg-white/[0.07] border border-white/[0.06]" />
          <div className="mt-3 h-3 w-4/5 rounded-full bg-white/[0.08]" />
          <div className="mt-2 h-2.5 w-2/3 rounded-full bg-white/[0.05]" />
        </div>
      ))}
    </div>
  );

  const heroImage = movies[0]?.poster_url || "";
  return (
    <main className="listing-page min-h-screen">
      <style jsx global>{`
        .listing-page {
          --listing-bg: #090b13;
          --listing-panel: rgba(22, 24, 38, .78);
          --listing-panel-solid: #151827;
          --listing-text: #f7f7fc;
          --listing-muted: #a1a4b7;
          --listing-soft: rgba(255,255,255,.07);
          --listing-border: rgba(255,255,255,.10);
          --listing-accent: #a78bfa;
          --listing-accent-2: #d946ef;
          color: var(--listing-text);
          background: var(--listing-bg);
          min-height: 100vh;
        }
        .listing-hero {
          isolation: isolate;
          background: linear-gradient(105deg, rgba(9,11,19,.98) 0%, rgba(13,13,29,.91) 48%, rgba(20,12,35,.56) 100%), var(--listing-hero-image);
          background-size: cover;
          background-position: center 35%;
          border: 1px solid var(--listing-border);
        }
        .listing-gradient-text {
          background: linear-gradient(105deg,#c4b5fd 0%,#a78bfa 48%,#e879f9 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .listing-page .listing-movie-grid {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          column-gap: 11px;
          row-gap: 25px;
        }
        .listing-page .listing-movie-grid > div { min-width: 0; }
        .listing-page .listing-movie-grid a:first-child {
          border-radius: 13px;
        }
        .listing-page .listing-movie-grid h3 {
          color: var(--listing-text);
          font-size: 12px;
          line-height: 1.45;
          font-weight: 650;
        }
        .listing-page .listing-movie-grid p { color: var(--listing-muted); }
        .listing-page .listing-filter-shell > div {
          background: var(--listing-panel) !important;
          border: 1px solid var(--listing-border) !important;
          border-radius: 18px !important;
          box-shadow: none !important;
          color: var(--listing-text) !important;
          backdrop-filter: blur(22px) saturate(150%) !important;
        }
        .listing-page .listing-filter-shell button { color: var(--listing-text); }
        .listing-page .listing-filter-shell button:hover { border-color: rgba(167,139,250,.45); }
        .listing-page .listing-filter-shell [class*="bg-[#0b0d14]"] {
          background: var(--listing-panel-solid) !important;
          border-color: var(--listing-border) !important;
        }
        .listing-page .listing-filter-shell a:hover {
          background: linear-gradient(110deg,#8b5cf6,#a855f7,#d946ef) !important;
          color: white !important;
        }
        .listing-page .listing-chip {
          border: 1px solid var(--listing-border);
          background: var(--listing-soft);
          color: var(--listing-muted);
          white-space: nowrap;
        }
        .listing-page .listing-chip-active {
          color: white;
          border-color: rgba(192,132,252,.65);
          background: linear-gradient(110deg,#8b5cf6,#a855f7,#d946ef);
        }
        @media (min-width: 640px) {
          .listing-page .listing-movie-grid { grid-template-columns: repeat(4,minmax(0,1fr)); column-gap: 16px; row-gap: 32px; }
          .listing-page .listing-movie-grid h3 { font-size: 14px; }
        }
        @media (min-width: 1024px) {
          .listing-page .listing-movie-grid { grid-template-columns: repeat(6,minmax(0,1fr)); }
        }
        html[data-mobile-theme="light"] .listing-page,
        html[data-theme="light"] .listing-page {
          --listing-bg: #f5f4fa;
          --listing-panel: rgba(255,255,255,.82);
          --listing-panel-solid: #ffffff;
          --listing-text: #242137;
          --listing-muted: #77758a;
          --listing-soft: rgba(83,68,120,.055);
          --listing-border: rgba(70,55,110,.12);
          background: var(--listing-bg) !important;
          color: var(--listing-text) !important;
        }
        /* Keep the featured movie panel visually identical in light and dark themes. */
        .listing-page .listing-hero {
          color: #f7f7fc;
          background: linear-gradient(105deg, rgba(9,11,19,.98) 0%, rgba(13,13,29,.91) 48%, rgba(20,12,35,.56) 100%), var(--listing-hero-image);
          border-color: var(--listing-border);
        }
        html[data-mobile-theme="light"] .listing-page .listing-hero,
        html[data-theme="light"] .listing-page .listing-hero {
          color: #f7f7fc !important;
          background: linear-gradient(105deg, rgba(9,11,19,.98) 0%, rgba(13,13,29,.91) 48%, rgba(20,12,35,.56) 100%), var(--listing-hero-image) !important;
          border-color: rgba(255,255,255,.10) !important;
        }
        html[data-mobile-theme="light"] .listing-page .listing-filter-shell [class*="text-white"],
        html[data-theme="light"] .listing-page .listing-filter-shell [class*="text-white"] {
          color: var(--listing-text) !important;
        }
        html[data-mobile-theme="light"] .listing-page .listing-filter-shell [class*="bg-white/"],
        html[data-theme="light"] .listing-page .listing-filter-shell [class*="bg-white/"] {
          background: rgba(80,65,120,.055) !important;
        }
        html[data-mobile-theme="light"] .listing-page .listing-filter-shell [class*="text-white/"],
        html[data-theme="light"] .listing-page .listing-filter-shell [class*="text-white/"] {
          color: var(--listing-muted) !important;
        }
        html[data-mobile-theme="light"] .listing-page .listing-movie-grid h3,
        html[data-theme="light"] .listing-page .listing-movie-grid h3 { color: var(--listing-text) !important; }
        html[data-mobile-theme="light"] .listing-page .listing-movie-grid p,
        html[data-theme="light"] .listing-page .listing-movie-grid p { color: var(--listing-muted) !important; }
        @media (prefers-reduced-motion: reduce) {
          .listing-page * { scroll-behavior: auto !important; transition-duration: .01ms !important; }
        }
      `}</style>

      <div className="mx-auto max-w-[1400px] px-3 pb-24 pt-4 sm:px-6 sm:pt-6 lg:px-8">
        {isMainMovieType ? (
          <section
            className="listing-hero relative mb-6 overflow-hidden rounded-[26px] px-4 py-5 sm:mb-8 sm:px-7 sm:py-7"
            style={{ "--listing-hero-image": heroImage ? `url("${heroImage}")` : "none" } as CSSProperties}
          >
            <div className="pointer-events-none absolute -right-14 -top-24 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 right-1/4 h-48 w-64 rounded-full bg-fuchsia-500/15 blur-3xl" />
            <div className="relative z-10 max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-300/25 bg-violet-400/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.18em] text-violet-200">
                <Sparkles size={12} /> XEM PHIM · KHÔNG GIAN ĐIỆN ẢNH
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-300/25 bg-violet-400/15 text-violet-200 sm:h-14 sm:w-14">
                  {isSeries ? <Tv size={25} /> : <Clapperboard size={25} />}
                </div>
                <div>
                  <h1 className="text-[30px] font-black leading-none tracking-tight sm:text-4xl">{pageTitle}</h1>
                  <p className="mt-2 max-w-lg text-[11px] leading-relaxed text-white/65 sm:text-sm">{pageSubtitle}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-white/65 sm:text-xs">
                <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1.5">{movies.length ? `${movies.length.toLocaleString("vi-VN")} tựa phim` : "Tuyển tập dành cho bạn"}</span>
                <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1.5">Cập nhật liên tục</span>
              </div>
              <div className="mt-5 grid max-w-md grid-cols-2 gap-2 rounded-2xl border border-white/15 bg-black/20 p-1.5 backdrop-blur-xl">
                <Link href="/danh-sach/phim-le" scroll={false} prefetch aria-current={isSingle ? "page" : undefined} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-extrabold transition-all ${isSingle ? "listing-chip-active" : "text-white/70 hover:bg-white/10"}`}>
                  <Clapperboard size={16} /> Phim lẻ
                </Link>
                <Link href="/danh-sach/phim-bo" scroll={false} prefetch aria-current={isSeries ? "page" : undefined} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-extrabold transition-all ${isSeries ? "listing-chip-active" : "text-white/70 hover:bg-white/10"}`}>
                  <Tv size={16} /> Phim bộ
                </Link>
              </div>
              {movies[0] && (
                <Link href={`/phim/${movies[0].slug}`} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-violet-200 transition-colors hover:text-fuchsia-200">
                  <Play size={13} fill="currentColor" /> Khám phá phim nổi bật <ArrowUpRight size={13} />
                </Link>
              )}
            </div>
          </section>
        ) : (
          <div className="mb-6 flex items-end justify-between gap-3">
            <div><p className="mb-1 text-[10px] font-extrabold uppercase tracking-[.2em] text-violet-400">Xem phim · Thư viện</p><h1 className="text-2xl font-black tracking-tight sm:text-4xl">{pageTitle}</h1></div>
            <span className="text-xs text-[var(--listing-muted)]">{movies.length.toLocaleString("vi-VN")} phim</span>
          </div>
        )}

        <div className="listing-filter-shell"><FilterBar /></div>

        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Film size={17} className="text-violet-400" />
            <h2 className="text-base font-extrabold tracking-tight sm:text-lg">{isSeries ? "Series nổi bật" : isSingle ? "Phim điện ảnh" : "Danh sách phim"}</h2>
          </div>
          <span className="text-[10px] font-semibold text-[var(--listing-muted)] sm:text-xs">Mới cập nhật</span>
        </div>

        {isLoading && !hasLoaded ? renderSkeleton() : movies.length > 0 ? (
          <div className="relative">
            {isLoading && hasLoaded && <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold text-violet-400" role="status"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" /> Đang chuyển danh mục...</div>}
            <div className={`transition-opacity duration-200 ${isLoading && hasLoaded ? "opacity-75" : "opacity-100"}`}>
              <InfiniteMovieGrid initialItems={movies} initialTotalPages={totalPages} initialPage={1} fetchMore={fetchMoviesFromAPI} type={type} />
            </div>
          </div>
        ) : (
          <div className="py-24 text-center text-sm font-medium text-[var(--listing-muted)]">Không tìm thấy phim trong danh mục này.</div>
        )}
      </div>
    </main>
  );
}
