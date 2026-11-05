"use client";

import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { MovieCard } from "./movie-card";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";

import { useRef } from "react";

interface TrendingCarouselProps {
  title: string;
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

export const TrendingCarousel = ({ title, items }: TrendingCarouselProps) => {
  const navigationPrevRef = useRef<HTMLButtonElement | null>(null);
  const navigationNextRef = useRef<HTMLButtonElement | null>(null);

  if (!items || items.length === 0) return null;

  return (
    <section className="py-4 md:py-6 w-full relative overflow-hidden">
      <div className="container mx-auto px-3 md:px-6">
        <div className="flex min-w-0 items-center justify-between gap-3 mb-3 md:mb-5">
          <h2 className="min-w-0 text-lg md:text-xl font-bold text-white leading-tight">
            {title}
          </h2>
        </div>

        <div className="relative group/swiper">
          <button
            ref={navigationPrevRef}
            aria-label="Trước"
            className="absolute left-1 top-[40%] -translate-y-1/2 z-30 w-9 h-9 bg-black/75 backdrop-blur border border-white/10 rounded-full flex items-center justify-center text-white opacity-0 group-hover/swiper:opacity-100 transition-all hover:bg-white hover:text-black disabled:opacity-0 hidden md:flex"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            ref={navigationNextRef}
            aria-label="Sau"
            className="absolute right-1 top-[40%] -translate-y-1/2 z-30 w-9 h-9 bg-black/75 backdrop-blur border border-white/10 rounded-full flex items-center justify-center text-white opacity-0 group-hover/swiper:opacity-100 transition-all hover:bg-white hover:text-black disabled:opacity-0 hidden md:flex"
          >
            <ChevronRight size={22} />
          </button>

          <Swiper
            modules={[Navigation]}
            spaceBetween={10}
            slidesPerView={2.2}
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
              640: { slidesPerView: 3.2, spaceBetween: 12 },
              768: { slidesPerView: 4.2, spaceBetween: 14 },
              1024: { slidesPerView: 5.4, spaceBetween: 14 },
              1280: { slidesPerView: 6.2, spaceBetween: 16 },
            }}
            className="w-full !overflow-hidden"
          >
            {items.map((movie, index) => (
              <SwiperSlide
                key={movie.id}
                className="h-auto group/slide select-none"
              >
                <div className="relative flex flex-col gap-1.5 w-full">
                  <div className="absolute -left-1 bottom-10 z-0 pointer-events-none select-none">
                    <span
                      className="text-[72px] md:text-[96px] leading-none font-black italic"
                      style={{
                        WebkitTextStroke: "2px rgba(255,255,255,0.22)",
                        color: "transparent",
                      }}
                    >
                      {index + 1}
                    </span>
                  </div>

                  <div className="relative z-10 ml-4 md:ml-6">
                    <div className="relative aspect-[2/3] w-full rounded-md overflow-hidden shadow-xl transition-transform duration-300 group-hover/slide:-translate-y-1">
                      <MovieCard {...movie} hideInfo variant="vertical" />
                    </div>

                    <div className="mt-2 px-0.5">
                      <h3 className="text-[12px] md:text-[13px] font-semibold text-white line-clamp-1 group-hover/slide:text-[#ffd875] transition-colors leading-tight">
                        <Link href={`/phim/${movie.slug}`}>{movie.title}</Link>
                      </h3>
                      {movie.originalTitle && (
                        <p className="text-[10px] text-white/35 line-clamp-1 mt-0.5">
                          {movie.originalTitle}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
};
