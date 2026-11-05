"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade, Pagination, Thumbs } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";

import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/pagination";
import "swiper/css/thumbs";

interface Movie {
  _id: string;
  name: string;
  origin_name: string;
  poster_url: string;
  thumb_url: string;
  backdrop_url?: string;
  slug: string;
  year: number;
  quality?: string;
  lang?: string;
  episode_current?: string;
  time?: string;
  hero_source?: "tmdb" | "netflix" | "latest";
}

interface HeroSliderProps {
  movies: Movie[];
}

export const HeroSlider = ({ movies }: HeroSliderProps) => {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);

  if (!movies || movies.length === 0) return null;

  return (
    <section className="relative w-full h-[300px] sm:h-[390px] md:h-[560px] lg:h-[620px] overflow-hidden group/hero bg-black">
      <Swiper
        modules={[Autoplay, EffectFade, Pagination, Thumbs]}
        effect="fade"
        speed={650}
        autoplay={{
          delay: 8000,
          disableOnInteraction: false,
        }}
        thumbs={{
          swiper:
            thumbsSwiper && !thumbsSwiper.destroyed
              ? thumbsSwiper
              : null,
        }}
        className="h-full w-full"
      >
        {movies.map((movie, index) => {
          const heroImage =
            movie.backdrop_url || movie.thumb_url || movie.poster_url;

          return (
            <SwiperSlide
              key={movie._id}
              className="relative w-full h-full overflow-hidden"
            >
              <div className="absolute inset-0 z-0 bg-black">
                <Image
                  src={heroImage}
                  alt={movie.name}
                  fill
                  priority={index === 0}
                  loading={index === 0 ? undefined : "lazy"}
                  sizes="100vw"
                  quality={90}
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent md:bg-gradient-to-r md:from-black/85 md:via-black/35 md:to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-black/25" />
              </div>

              <div className="container relative z-20 h-full flex flex-col items-center justify-end text-center px-4 pb-[76px] md:items-start md:justify-center md:text-left md:pb-8">
                <div className="w-full max-w-3xl animate-fade-up md:max-w-xl">
                  <Link
                    href={`/phim/${movie.slug}`}
                    className="inline-block max-w-full text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] hover:text-[#ffd875] transition-colors"
                    aria-label={`Xem phim ${movie.name}`}
                  >
                    <h1 className="text-[21px] leading-tight sm:text-2xl md:text-4xl lg:text-5xl font-black tracking-tight md:uppercase">
                      {movie.name}
                    </h1>
                  </Link>

                  {movie.origin_name && (
                    <p className="mt-1 text-xs sm:text-sm md:text-base text-[#ffd875]/90 font-medium">
                      {movie.origin_name}
                    </p>
                  )}

                  {movie.hero_source && (
                    <span className="mt-2 inline-flex rounded-full border border-white/30 bg-black/40 px-2.5 py-1 text-[9px] sm:text-[10px] font-semibold tracking-wider text-white/90 backdrop-blur-md">
                      {movie.hero_source === "tmdb"
                        ? "TMDB TRENDING"
                        : movie.hero_source === "netflix"
                          ? "NETFLIX TOP 10 TV SHOWS VIỆT NAM"
                          : "ĐỀ XUẤT"}
                    </span>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-center md:justify-start gap-1.5">
                    {movie.quality && (
                      <span className="rounded border border-[#ffd875]/70 bg-black/25 px-2 py-0.5 text-[9px] sm:text-[10px] font-medium text-[#ffd875]">
                        {movie.quality}
                      </span>
                    )}
                    <span className="rounded border border-white/55 bg-black/25 px-2 py-0.5 text-[9px] sm:text-[10px] font-medium text-white">
                      {movie.year}
                    </span>
                    {movie.episode_current && (
                      <span className="rounded border border-white/55 bg-black/25 px-2 py-0.5 text-[9px] sm:text-[10px] font-medium text-white">
                        {movie.episode_current}
                      </span>
                    )}
                    {movie.lang && (
                      <span className="rounded border border-white/45 bg-black/25 px-2 py-0.5 text-[9px] sm:text-[10px] font-medium text-white">
                        {movie.lang}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>

      <div className="absolute bottom-4 md:bottom-7 left-1/2 -translate-x-1/2 z-40 w-fit max-w-[90%]">
        <Swiper
          onSwiper={setThumbsSwiper}
          modules={[Thumbs]}
          watchSlidesProgress
          slidesPerView="auto"
          allowTouchMove={false}
          simulateTouch={false}
          spaceBetween={9}
          className="hero-cast-slider !w-fit !overflow-visible [&_.swiper-wrapper]:!justify-center"
        >
          {movies.map((movie) => (
            <SwiperSlide
              key={movie._id}
              className="!w-8 !h-8 sm:!w-9 sm:!h-9 cursor-pointer"
            >
              <div className="relative h-full w-full overflow-hidden rounded-full border-2 border-white/45 bg-[#292c38] transition-all duration-300 group-[.swiper-slide-thumb-active]:border-[#ffd875] group-[.swiper-slide-thumb-active]:scale-110 group-[.swiper-slide-thumb-active]:shadow-[0_0_12px_rgba(255,216,117,0.45)]">
                <Image
                  src={movie.poster_url || movie.thumb_url}
                  alt={movie.name}
                  fill
                  sizes="40px"
                  quality={70}
                  className="object-cover"
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};
