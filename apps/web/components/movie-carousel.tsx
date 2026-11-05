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
  /** gradient text color for title like RoPhim */
  titleGradient?: string;
  items: {
    id: string;
    title: string;
    originalTitle?: string;
    posterUrl: string;
    thumbUrl?: string;
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
  viewMoreLink,
  titleGradient = "linear-gradient(235deg, #ffffff 30%, #a78bfa 130%)",
  items,
}: MovieCarouselProps) => {
  const navigationPrevRef = useRef<HTMLButtonElement | null>(null);
  const navigationNextRef = useRef<HTMLButtonElement | null>(null);

  if (!items || items.length === 0) return null;

  return (
    <section className="w-full relative py-3 md:py-5">
      <div className="container mx-auto px-3 md:px-6">
        {/* RoPhim layout: title left + carousel right on desktop */}
        <div className="flex flex-col md:flex-row md:items-stretch gap-3 md:gap-5">
          {/* Left intro */}
          <div className="md:w-[160px] lg:w-[180px] shrink-0 flex flex-col justify-center">
            <h2
              className="text-xl md:text-2xl font-bold leading-tight mb-1"
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
              slidesPerView={1.6}
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
                480: { slidesPerView: 2.1, spaceBetween: 10 },
                768: { slidesPerView: 2.6, spaceBetween: 12 },
                1024: { slidesPerView: 3.4, spaceBetween: 12 },
                1280: { slidesPerView: 4.1, spaceBetween: 12 },
                1536: { slidesPerView: 4.4, spaceBetween: 14 },
              }}
              className="w-full !overflow-hidden"
            >
              {items.map((movie) => (
                <SwiperSlide key={movie.id} className="h-auto">
                  <MovieCard {...movie} variant="horizontal" />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>
    </section>
  );
};
