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
  items: {
    id: string;
    title: string;
    originalTitle?: string;
    posterUrl: string;
    slug: string;
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
  icon,
  viewMoreLink,
  items,
}: MovieCarouselProps) => {
  const navigationPrevRef = useRef<HTMLButtonElement | null>(null);
  const navigationNextRef = useRef<HTMLButtonElement | null>(null);

  if (!items || items.length === 0) return null;

  return (
    <section className="py-2.5 md:py-4 w-full relative overflow-hidden">
      <div className="container mx-auto px-3 md:px-8">
        {/* Header - RoPhim style */}
        <div className="flex items-center justify-between gap-2 mb-2.5 md:mb-4">
          <div className="flex min-w-0 items-center gap-2">
            {icon && (
              <span className="text-lg md:text-xl shrink-0">{icon}</span>
            )}
            <h2 className="min-w-0 text-base md:text-xl font-bold text-white leading-tight">
              <Link
                href={viewMoreLink || "#"}
                className="block truncate hover:text-[#ffd875] transition-colors"
              >
                {title}
              </Link>
            </h2>
          </div>
          {viewMoreLink && (
            <Link
              href={viewMoreLink}
              className="text-white/50 hover:text-[#ffd875] text-xs font-medium inline-flex items-center gap-0.5 transition-colors whitespace-nowrap"
            >
              Xem thêm
              <ChevronRight size={14} />
            </Link>
          )}
        </div>

        <div className="relative group/swiper">
          <button
            ref={navigationPrevRef}
            aria-label="Trước"
            className="absolute left-1 top-[38%] -translate-y-1/2 z-20 w-9 h-9 bg-black/75 backdrop-blur border border-white/10 rounded-full flex items-center justify-center text-white opacity-0 group-hover/swiper:opacity-100 transition-all hover:bg-white hover:text-black disabled:opacity-0 hidden md:flex"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            ref={navigationNextRef}
            aria-label="Sau"
            className="absolute right-1 top-[38%] -translate-y-1/2 z-20 w-9 h-9 bg-black/75 backdrop-blur border border-white/10 rounded-full flex items-center justify-center text-white opacity-0 group-hover/swiper:opacity-100 transition-all hover:bg-white hover:text-black disabled:opacity-0 hidden md:flex"
          >
            <ChevronRight size={22} />
          </button>

          <Swiper
            modules={[Navigation]}
            spaceBetween={10}
            slidesPerView={2.35}
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
              480: { slidesPerView: 2.8, spaceBetween: 12 },
              768: { slidesPerView: 3.6, spaceBetween: 14 },
              1024: { slidesPerView: 5.4, spaceBetween: 14 },
              1440: { slidesPerView: 6.2, spaceBetween: 16 },
            }}
            className="w-full !overflow-hidden"
          >
            {items.map((movie) => (
              <SwiperSlide key={movie.id} className="h-auto">
                <MovieCard {...movie} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
};
