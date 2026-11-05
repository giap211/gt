"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade, Pagination, Thumbs } from "swiper/modules";
import { Play } from "lucide-react";
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
}

interface HeroSliderProps {
  movies: Movie[];
}

export const HeroSlider = ({ movies }: HeroSliderProps) => {
  const [thumbsSwiper, setThumbsSwiper] =
    useState<SwiperType | null>(null);

  if (!movies || movies.length === 0) return null;

  return (
    <section className="relative w-full h-[500px] md:h-[700px] lg:h-[800px] overflow-hidden group/hero">
      <Swiper
        modules={[Autoplay, EffectFade, Pagination, Thumbs]}
        effect="fade"
        speed={500}
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
        pagination={{
          clickable: true,
          bulletClass:
            "swiper-pagination-bullet !bg-white/20 !w-8 !h-1 !rounded-none !transition-all !duration-500 md:hidden",
          bulletActiveClass:
            "swiper-pagination-bullet-active !bg-[#ffd875] !w-12",
        }}
        className="h-full w-full"
      >
        {movies.map((movie, index) => {
          const heroImage =
            movie.backdrop_url ||
            movie.thumb_url ||
            movie.poster_url;

          return (
            <SwiperSlide
              key={movie._id}
              className="relative w-full h-full overflow-hidden"
            >
              <div className="absolute inset-0 z-0 overflow-hidden bg-[#0a0a0a]">
                <Image
                  src={heroImage}
                  alt={movie.name}
                  fill
                  priority={index === 0}
                  loading={index === 0 ? undefined : "lazy"}
                  sizes="100vw"
                  quality={90}
                  className="object-cover object-[center_25%] transition-transform duration-[15000ms] ease-out group-hover:scale-110 opacity-100"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d14] via-[#0b0d14]/20 to-transparent z-10" />

                <div className="absolute inset-0 bg-gradient-to-r from-[#0b0d14]/60 via-transparent to-transparent z-10" />

                <div className="absolute inset-0 bg-[#ffaa00]/10 mix-blend-soft-light z-10" />

                <div className="absolute inset-0 bg-[#ffd875]/5 mix-blend-overlay z-10" />
              </div>

              <div className="container relative z-20 h-full flex flex-col justify-center pt-20 px-6 md:px-16">
                <div className="max-w-3xl space-y-4 md:space-y-6 animate-fade-up">
                  <div className="space-y-1">
                    <h1
                      className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight drop-shadow-2xl leading-none"
                      style={{
                        fontFamily: "'Playfair Display', serif",
                      }}
                    >
                      {movie.name}
                    </h1>

                    <p className="text-lg md:text-xl text-[#ffd875] font-medium tracking-wide opacity-90 italic">
                      {movie.origin_name}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {movie.quality && (
                      <span className="border-[0.5px] border-white/40 bg-black/40 text-[#ffd875] text-[10px] md:text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter">
                        {movie.quality}
                      </span>
                    )}

                    <span className="border-[0.5px] border-white/40 bg-white/5 text-white/90 text-[10px] md:text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter">
                      {movie.year}
                    </span>

                    {movie.episode_current && (
                      <span className="border-[0.5px] border-white/40 bg-white/5 text-white/90 text-[10px] md:text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter">
                        {movie.episode_current}
                      </span>
                    )}

                    {movie.lang && (
                      <span className="bg-white/10 text-white/70 text-[10px] md:text-[11px] font-bold px-3 py-1 rounded-md uppercase tracking-tighter">
                        {movie.lang}
                      </span>
                    )}
                  </div>

                  {movie.time && (
                    <p className="text-white/80 text-sm md:text-base line-clamp-2 max-w-2xl leading-relaxed drop-shadow-md">
                      {movie.time}
                    </p>
                  )}

                  <div className="pt-4">
                    <Link
                      href={`/phim/${movie.slug}`}
                      aria-label={`Xem phim ${movie.name}`}
                      className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#ffd875] flex items-center justify-center text-black shadow-[0_0_30px_rgba(255,216,117,0.3)] hover:scale-110 transition-all duration-300 group/play"
                    >
                      <Play className="fill-current w-6 h-6 md:w-8 md:h-8 ml-1" />
                    </Link>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>

      <div className="absolute bottom-12 right-6 md:right-16 z-40 w-fit max-w-[280px] md:max-w-[450px] hidden md:block">
        <Swiper
          onSwiper={setThumbsSwiper}
          modules={[Thumbs]}
          watchSlidesProgress
          slidesPerView={4}
          spaceBetween={12}
          className="thumbs-slider !overflow-visible"
        >
          {movies.map((movie) => (
            <SwiperSlide
              key={movie._id}
              className="cursor-pointer group/thumb"
            >
              <div className="relative aspect-video rounded-md overflow-hidden border-2 border-transparent transition-all duration-300 group-[.swiper-slide-thumb-active]:border-[#ffd875] group-[.swiper-slide-thumb-active]:scale-110 group-[.swiper-slide-thumb-active]:shadow-[0_0_20px_rgba(255,216,117,0.5)]">
                <Image
                  src={movie.thumb_url || movie.poster_url}
                  alt={movie.name}
                  fill
                  sizes="180px"
                  quality={75}
                  className="object-cover transition-transform duration-500 group-hover/thumb:scale-110"
                />

                <div className="absolute inset-0 bg-black/60 group-hover/thumb:bg-transparent group-[.swiper-slide-thumb-active]:bg-transparent transition-colors duration-300" />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};