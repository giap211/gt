"use client";

import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { MovieCard } from "./movie-card";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";

import { useRef } from "react";

interface MovieCarouselProps {
  title: string;
  icon?: string;
  viewMoreLink?: string;
  /** gradient text color for section title */
  titleGradient?: string;
  layout?: "standard" | "ranked" | "poster" | "compact" | "square" | "tall";
  items: {
    id: string;
    title: string;
    originalTitle?: string;
    posterUrl: string;
    thumbUrl?: string;
    slug: string;
    href?: string;
    progressSeconds?: number;
    totalDurationSeconds?: number;
    simulateProgressWhenEmpty?: boolean;
    year?: string | number;
    quality?: string;
    episodeCurrent?: string;
    language?: string;
    isSeries?: boolean;
    view?: number;
    rating?: number | string;
  }[];
}

export const MovieCarousel = ({
  title,
  viewMoreLink,
  titleGradient = "linear-gradient(235deg, #ffffff 30%, #d1d5db 130%)",
  items,
  layout = "standard",
}: MovieCarouselProps) => {
  const navigationPrevRef = useRef<HTMLButtonElement | null>(null);
  const navigationNextRef = useRef<HTMLButtonElement | null>(null);
  const effectiveViewMoreLink = viewMoreLink || (title === "Phim nổi bật" ? "/danh-sach/phim-moi" : undefined);
  const visibleItems = items?.slice(0, 8) ?? [];

  if (!visibleItems.length) return null;

  return (
    <section className={`movie-carousel-section w-full relative py-3 md:py-5 ${layout === "ranked" ? "movie-carousel-ranked" : ""} ${title === "Phim đang xem" ? "movie-carousel-continue-watching" : ""}`}>
      <style jsx global>{`
        html[data-mobile-theme="light"] .movie-carousel-continue-watching .movie-poster-frame + div,
        html[data-theme="light"] .movie-carousel-continue-watching .movie-poster-frame + div {
          color: #625873 !important;
        }
        html[data-mobile-theme="light"] .movie-carousel-continue-watching .movie-poster-frame + div span:last-child,
        html[data-theme="light"] .movie-carousel-continue-watching .movie-poster-frame + div span:last-child {
          color: #7652c8 !important;
        }
      `}</style>
      <div className="container mx-auto px-3 md:px-6">
        <div className="flex flex-col gap-3">
          <div className="flex w-full min-w-0 items-center justify-between gap-2 overflow-hidden">
            <h2
              className={`movie-carousel-title min-w-0 flex-1 text-xl md:text-2xl font-bold leading-tight ${layout === "ranked" ? "md:text-2xl" : ""}`}
              style={{
                backgroundImage: titleGradient,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {title}
            </h2>
            {effectiveViewMoreLink && (
              <Link
                href={effectiveViewMoreLink}
                className="group inline-flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-2 text-[11px] font-semibold text-white/65 transition-colors hover:text-white"
                aria-label={`Xem thêm phim trong mục ${title}`}
              >
                Xem thêm
                <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>

          {/* Right carousel */}
          <div className="flex-1 min-w-0 relative group/swiper">
            <button
              ref={navigationPrevRef}
              aria-label="Trước"
              className="absolute left-0 top-1/2 -translate-y-[60%] z-20 w-9 h-9 bg-[#1a1c28]/90 border border-white/10 rounded-full flex items-center justify-center text-white opacity-0 group-hover/swiper:opacity-100 transition-all hover:bg-white hover:text-black disabled:opacity-0 hidden md:flex "
            >
              <ChevronLeft size={20} />
            </button>
            <button
              ref={navigationNextRef}
              aria-label="Sau"
              className="absolute right-0 top-1/2 -translate-y-[60%] z-20 w-9 h-9 bg-[#1a1c28]/90 border border-white/10 rounded-full flex items-center justify-center text-white opacity-0 group-hover/swiper:opacity-100 transition-all hover:bg-white hover:text-black disabled:opacity-0 hidden md:flex "
            >
              <ChevronRight size={20} />
            </button>

            <Swiper
              modules={[Navigation]}
              spaceBetween={10}
              slidesPerView={layout === "ranked" ? 2.65 : layout === "poster" ? 2.35 : layout === "square" ? 2.35 : layout === "tall" ? 2.7 : layout === "compact" ? 1.85 : 1.6}
              navigation={{
                prevEl: navigationPrevRef.current,
                nextEl: navigationNextRef.current,
              }}
              onBeforeInit={(swiper: SwiperType) => {
                const navigation = swiper.params.navigation;
                if (navigation && typeof navigation !== "boolean") {
                  navigation.prevEl = navigationPrevRef.current;
                  navigation.nextEl = navigationNextRef.current;
                }
              }}
              breakpoints={{
                480: { slidesPerView: layout === "ranked" ? 3.1 : layout === "poster" ? 2.8 : layout === "square" ? 2.8 : layout === "tall" ? 3.1 : layout === "compact" ? 2.5 : 2.1, spaceBetween: 10 },
                768: { slidesPerView: layout === "ranked" ? 4.2 : layout === "poster" ? 3.8 : layout === "square" ? 3.8 : layout === "tall" ? 4.2 : layout === "compact" ? 3.2 : 2.6, spaceBetween: 12 },
                1024: { slidesPerView: layout === "ranked" ? 5.2 : layout === "poster" ? 4.8 : layout === "square" ? 4.8 : layout === "tall" ? 5.2 : layout === "compact" ? 4 : 3.4, spaceBetween: 12 },
                1280: { slidesPerView: layout === "ranked" ? 6.2 : layout === "poster" ? 5.8 : layout === "square" ? 5.8 : layout === "tall" ? 6.2 : layout === "compact" ? 4.8 : 4.1, spaceBetween: 12 },
                1536: { slidesPerView: layout === "ranked" ? 6.5 : layout === "poster" ? 6.2 : layout === "square" ? 6.2 : layout === "tall" ? 6.6 : layout === "compact" ? 5.2 : 4.4, spaceBetween: 14 },
              }}
              className={`movie-carousel-swiper w-full !overflow-hidden ${layout === "poster" ? "movie-carousel-poster" : ""} ${layout === "square" ? "movie-carousel-square" : ""} ${layout === "tall" ? "movie-carousel-tall" : ""}`}
            >
              {visibleItems.map((movie, index) => (
                <SwiperSlide key={movie.id} className="h-auto">
                  {layout === "ranked" ? (
                    <div className="group/ranked ranked-poster-card flex h-full flex-col">
                      <svg aria-hidden="true" className="absolute h-0 w-0" focusable="false">
                        <defs>
                          <clipPath id={`cinema-poster-clip-${index}`} clipPathUnits="objectBoundingBox">
                            <path d={index % 2 === 0
                              ? "M 0 0.12 C 0 0.08 0.025 0.055 0.065 0.052 L 0.925 0 C 0.965 0 1 0.03 1 0.07 L 1 0.94 C 1 0.975 0.975 1 0.94 1 L 0.06 1 C 0.025 1 0 0.975 0 0.94 Z"
                              : "M 0 0.07 C 0 0.03 0.035 0 0.075 0 L 0.935 0.052 C 0.975 0.055 1 0.08 1 0.12 L 1 0.94 C 1 0.975 0.975 1 0.94 1 L 0.06 1 C 0.025 1 0 0.975 0 0.94 Z"} />
                          </clipPath>
                        </defs>
                      </svg>
                      <div
                        className="relative overflow-hidden rounded-xl"
                        style={{ clipPath: `url(#cinema-poster-clip-${index})` }}
                      >
                      <MovieCard {...movie} hideInfo variant="vertical" />
                    </div>
                      <div className="mt-1 flex items-start gap-2">
                        <span className="shrink-0 text-3xl md:text-4xl font-black italic leading-none text-[#f5c451] ">
                          {index + 1}
                        </span>
                        <div className="min-w-0 pt-0.5">
                          <Link href={`/phim/${movie.slug}`} className="block text-[11px] md:text-[13px] font-semibold leading-snug text-white line-clamp-2 transition-colors group-hover/ranked:text-[#ffd875]">
                            {movie.title}
                          </Link>
                          {movie.originalTitle && movie.originalTitle !== movie.title && (
                            <p className="mt-0.5 text-[10px] text-white/40 line-clamp-1">{movie.originalTitle}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <MovieCard {...movie} variant={layout === "poster" ? "vertical" : layout === "square" ? "square" : layout === "tall" ? "tall" : "horizontal"} />
                  )}
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>
    </section>
  );
};
