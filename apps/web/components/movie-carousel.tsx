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
  /** gradient text color for title like Phim Lậu */
  titleGradient?: string;
  layout?: "standard" | "ranked";
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
  titleGradient = "linear-gradient(235deg, #ffffff 30%, #a78bfa 130%)",
  items,
  layout = "standard",
}: MovieCarouselProps) => {
  const navigationPrevRef = useRef<HTMLButtonElement | null>(null);
  const navigationNextRef = useRef<HTMLButtonElement | null>(null);

  if (!items || items.length === 0) return null;

  return (
    <section className="w-full relative py-3 md:py-5">
      <div className="container mx-auto px-3 md:px-6">
        <div className={layout === "ranked" ? "flex flex-col gap-3" : "flex flex-col md:flex-row md:items-stretch gap-3 md:gap-5"}>
          <div className={layout === "ranked" ? "flex items-center justify-between gap-3" : "md:w-[160px] lg:w-[180px] shrink-0 flex flex-col justify-center"}>
            <h2
              className={`text-xl md:text-2xl font-bold leading-tight mb-1 ${layout === "ranked" ? "md:text-2xl" : ""}`}
              style={{
                backgroundImage: titleGradient,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {title}
            </h2>
            {viewMoreLink && (
              <Link
                href={viewMoreLink}
                className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-[#ffd875] transition-colors mt-1"
              >
                Xem toàn bộ
                <ChevronRight size={14} />
              </Link>
            )}
          </div>

          {/* Right carousel */}
          <div className="flex-1 min-w-0 relative group/swiper">
            <button
              ref={navigationPrevRef}
              aria-label="Trước"
              className="absolute left-0 top-1/2 -translate-y-[60%] z-20 w-9 h-9 bg-[#1a1c28]/90 border border-white/10 rounded-full flex items-center justify-center text-white opacity-0 group-hover/swiper:opacity-100 transition-all hover:bg-white hover:text-black disabled:opacity-0 hidden md:flex shadow-lg"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              ref={navigationNextRef}
              aria-label="Sau"
              className="absolute right-0 top-1/2 -translate-y-[60%] z-20 w-9 h-9 bg-[#1a1c28]/90 border border-white/10 rounded-full flex items-center justify-center text-white opacity-0 group-hover/swiper:opacity-100 transition-all hover:bg-white hover:text-black disabled:opacity-0 hidden md:flex shadow-lg"
            >
              <ChevronRight size={20} />
            </button>

            <Swiper
              modules={[Navigation]}
              spaceBetween={10}
              slidesPerView={layout === "ranked" ? 2.65 : 1.6}
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
                480: { slidesPerView: layout === "ranked" ? 3.1 : 2.1, spaceBetween: 10 },
                768: { slidesPerView: layout === "ranked" ? 4.2 : 2.6, spaceBetween: 12 },
                1024: { slidesPerView: layout === "ranked" ? 5.2 : 3.4, spaceBetween: 12 },
                1280: { slidesPerView: layout === "ranked" ? 6.2 : 4.1, spaceBetween: 12 },
                1536: { slidesPerView: layout === "ranked" ? 6.5 : 4.4, spaceBetween: 14 },
              }}
              className="w-full !overflow-hidden"
            >
              {items.map((movie, index) => (
                <SwiperSlide key={movie.id} className="h-auto">
                  {layout === "ranked" ? (
                    <div className="group/ranked flex h-full flex-col">
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
                      <span className="absolute left-2 top-2 z-30 rounded-md bg-[#3989ed] px-2 py-1 text-[10px] md:text-xs font-bold text-white shadow-md pointer-events-none">
                        Song ngữ
                      </span>
                    </div>
                      <div className="mt-1 flex items-start gap-2">
                        <span className="shrink-0 text-3xl md:text-4xl font-black italic leading-none text-[#f5c451] drop-shadow-[0_2px_8px_rgba(245,196,81,0.2)]">
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
                    <MovieCard {...movie} variant="horizontal" />
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
