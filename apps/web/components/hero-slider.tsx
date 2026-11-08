"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, Play, Info } from "lucide-react";
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
    <section className="relative w-full h-[470px] sm:h-[520px] md:h-[560px] lg:h-[620px] overflow-hidden group/hero bg-[#080a10]">
      <Swiper
        modules={[Autoplay, EffectFade, Pagination, Thumbs]}
        effect="fade"
        speed={650}
        autoplay={{ delay: 8000, disableOnInteraction: false }}
        pagination={{ clickable: true, el: ".hero-pagination" }}
        thumbs={{
          swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null,
        }}
        className="h-full w-full"
      >
        {movies.map((movie, index) => {
          const heroImage = movie.backdrop_url || movie.thumb_url || movie.poster_url;

          return (
            <SwiperSlide key={movie._id} className="relative w-full h-full overflow-hidden">
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
                <div className="absolute inset-0 bg-gradient-to-t from-[#080a10] via-black/25 to-black/35 md:bg-gradient-to-r md:from-black/85 md:via-black/35 md:to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-[#080a10]/80" />
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-48 bg-gradient-to-b from-transparent via-[#080a10]/55 to-[#080a10]" />

              <div className="container relative z-20 h-full flex flex-col items-center justify-end text-center px-4 pb-[112px] md:items-start md:justify-center md:text-left md:pb-8">
                <div className="w-full max-w-3xl animate-fade-up md:max-w-xl">
                  {movie.hero_source && (
                    <span className={`hero-source-badge hero-source-${movie.hero_source} inline-flex rounded-full border border-white/30 bg-black/40 px-2.5 py-1 text-[9px] sm:text-[10px] font-semibold tracking-wider text-white/90 backdrop-blur-md`}>
                      {movie.hero_source === "tmdb"
                        ? "TMDB TRENDING"
                        : movie.hero_source === "netflix"
                          ? "NETFLIX TOP 10 TV SHOWS VIỆT NAM"
                          : "ĐỀ XUẤT"}
                    </span>
                  )}

                  <Link
                    href={`/phim/${movie.slug}`}
                    className="block mt-2 max-w-full text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] hover:text-[#ffd875] transition-colors"
                    aria-label={`Xem phim ${movie.name}`}
                  >
                    <h1 className="text-[25px] leading-tight sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight md:uppercase line-clamp-2">
                      {movie.name}
                    </h1>
                  </Link>

                  {movie.origin_name && (
                    <p className="mt-1 text-xs sm:text-sm md:text-base text-[#ffd875]/90 font-medium line-clamp-1">
                      {movie.origin_name}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-center md:justify-start gap-1.5">
                    {movie.quality && (
                      <span className="hero-meta-badge hero-meta-quality rounded border border-[#ffd875]/70 bg-black/25 px-2 py-0.5 text-[9px] sm:text-[10px] font-medium text-[#ffd875]">
                        {movie.quality}
                      </span>
                    )}
                    <span className="hero-meta-badge hero-meta-year rounded border border-white/55 bg-black/25 px-2 py-0.5 text-[9px] sm:text-[10px] font-medium text-white">
                      {movie.year}
                    </span>
                    {movie.episode_current && (
                      <span className="hero-meta-badge hero-meta-episode rounded border border-white/55 bg-black/25 px-2 py-0.5 text-[9px] sm:text-[10px] font-medium text-white">
                        {movie.episode_current}
                      </span>
                    )}
                    {movie.lang && (
                      <span className="hero-meta-badge hero-meta-language rounded border border-white/45 bg-black/25 px-2 py-0.5 text-[9px] sm:text-[10px] font-medium text-white">
                        {movie.lang}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-2.5 md:justify-start">
                    <Link
                      href={`/phim/${movie.slug}`}
                      className="inline-flex h-10 sm:h-11 items-center justify-center gap-2 rounded-full bg-[#ffd875] px-5 text-[12px] sm:text-sm font-extrabold text-[#171923] shadow-[0_7px_25px_rgba(255,216,117,.22)] transition-transform active:scale-95"
                    >
                      <Play size={15} fill="currentColor" /> Xem ngay
                    </Link>
                    <Link
                      href={`/phim/${movie.slug}`}
                      className="inline-flex h-10 sm:h-11 items-center justify-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 text-[12px] sm:text-sm font-semibold text-white backdrop-blur-xl transition-colors hover:bg-white/20 active:scale-95"
                    >
                      <Info size={16} /> Chi tiết
                    </Link>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* Mobile brand row: search/account are intentionally replaced by a notification placeholder. */}
      <div className="absolute top-0 inset-x-0 z-40 flex items-center justify-between px-4 pt-[max(14px,env(safe-area-inset-top))] md:px-8 lg:hidden">
        <Link href="/" aria-label="GiapTran Trang chủ" className="flex items-center">
          <Image
            src="/images/logo.svg"
            alt="GiapTran"
            width={118}
            height={36}
            priority
            className="h-7 w-auto drop-shadow-[0_2px_8px_rgba(0,0,0,.55)]"
          />
        </Link>
        <div
          aria-label="Thông báo"
          title="Thông báo"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-white/25 bg-black/30 px-3.5 text-white shadow-lg backdrop-blur-2xl"
        >
          <Bell size={17} strokeWidth={2.1} />
          <span className="text-xs font-semibold">Thông báo</span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#ffd875] shadow-[0_0_8px_rgba(255,216,117,.9)]" />
        </div>
      </div>

      <div className="hero-pagination absolute bottom-[84px] md:bottom-[92px] left-1/2 -translate-x-1/2 z-40 flex items-center justify-center gap-1.5 [&_.swiper-pagination-bullet]:!m-0 [&_.swiper-pagination-bullet]:!h-1.5 [&_.swiper-pagination-bullet]:!w-1.5 [&_.swiper-pagination-bullet]:!bg-white/55 [&_.swiper-pagination-bullet-active]:!w-5 [&_.swiper-pagination-bullet-active]:!rounded-full [&_.swiper-pagination-bullet-active]:!bg-[#ffd875]" />

      <div className="absolute bottom-5 md:bottom-7 left-1/2 -translate-x-1/2 z-40 w-fit max-w-[90%]">
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
            <SwiperSlide key={movie._id} className="!w-8 !h-8 sm:!w-9 sm:!h-9 cursor-pointer">
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
