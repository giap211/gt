"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, Play, Info, X, Clock3, ArrowRight, Sparkles } from "lucide-react";
import { useMember } from "./member-provider";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade, Thumbs } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";

import "swiper/css";
import "swiper/css/effect-fade";
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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { user, openAuth } = useMember();

  useEffect(() => {
    if (!notificationsOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [notificationsOpen]);

  if (!movies || movies.length === 0) return null;

  return (
    <section className="relative isolate w-full h-[570px] sm:h-[620px] md:h-[650px] lg:h-[700px] overflow-hidden bg-[#080a10]">
      <Swiper
        modules={[Autoplay, EffectFade, Thumbs]}
        effect="fade"
        speed={700}
        autoplay={{ delay: 8000, disableOnInteraction: false }}
        thumbs={{
          swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null,
        }}
        className="h-full w-full"
      >
        {movies.map((movie, index) => {
          const heroImage = movie.backdrop_url || movie.thumb_url || movie.poster_url;

          return (
            <SwiperSlide key={movie._id} className="relative h-full w-full overflow-hidden">
              <div className="absolute inset-0 z-0 bg-black">
                <Image
                  src={heroImage}
                  alt={movie.name}
                  fill
                  priority={index === 0}
                  loading={index === 0 ? undefined : "lazy"}
                  sizes="100vw"
                  quality={92}
                  className="object-cover object-[center_28%] sm:object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-black/10" />
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[90px] bg-gradient-to-b from-transparent via-[#080a10]/75 to-[#080a10] opacity-95 md:h-[120px]" />

              <div className="container relative z-20 flex h-full flex-col items-start justify-end px-5 pb-[142px] text-left sm:px-8 sm:pb-[150px] md:justify-center md:pb-10">
                <div className="w-full max-w-[560px] animate-fade-up">
                  {movie.hero_source && (
                    <span className={`hero-source-badge hero-source-${movie.hero_source} inline-flex items-center rounded-full border border-white/25 bg-black/35 px-3 py-1.5 text-[9px] font-bold tracking-[.13em] text-white/95 shadow-lg backdrop-blur-xl sm:text-[10px]`}>
                      {movie.hero_source === "tmdb"
                        ? "TMDB TRENDING"
                        : movie.hero_source === "netflix"
                          ? "NETFLIX TOP 10 TV SHOWS VIỆT NAM"
                          : "ĐỀ XUẤT DÀNH CHO BẠN"}
                    </span>
                  )}

                  <Link
                    href={`/phim/${movie.slug}`}
                    className="mt-3 block max-w-full text-white drop-shadow-[0_3px_12px_rgba(0,0,0,.8)] transition-colors hover:text-[#ffd875]"
                    aria-label={`Xem phim ${movie.name}`}
                  >
                    <h1 className="line-clamp-2 text-[30px] font-black leading-[1.08] tracking-[-.04em] sm:text-4xl md:text-5xl lg:text-[56px]">
                      {movie.name}
                    </h1>
                  </Link>

                  {movie.origin_name && (
                    <p className="mt-2 line-clamp-1 text-[12px] font-medium tracking-wide text-white/75 drop-shadow sm:text-sm">
                      {movie.origin_name}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {movie.quality && (
                      <span className="hero-meta-badge hero-meta-quality rounded-md border border-[#ffd875]/65 bg-black/30 px-2.5 py-1 text-[10px] font-bold text-[#ffe19a] backdrop-blur-md">
                        {movie.quality}
                      </span>
                    )}
                    <span className="hero-meta-badge hero-meta-year rounded-md border border-white/25 bg-black/30 px-2.5 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-md">
                      {movie.year}
                    </span>
                    {movie.episode_current && (
                      <span className="hero-meta-badge hero-meta-episode rounded-md border border-white/25 bg-black/30 px-2.5 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-md">
                        {movie.episode_current}
                      </span>
                    )}
                    {movie.lang && (
                      <span className="hero-meta-badge hero-meta-language rounded-md border border-white/25 bg-black/30 px-2.5 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-md">
                        {movie.lang}
                      </span>
                    )}
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <Link
                      href={`/phim/${movie.slug}`}
                      className="inline-flex h-12 min-w-[142px] items-center justify-center gap-2 rounded-full bg-[#ffd875] px-6 text-[13px] font-extrabold text-[#171923] shadow-[0_8px_28px_rgba(255,216,117,.25)] transition-all hover:brightness-110 active:scale-[.97]"
                    >
                      <Play size={16} fill="currentColor" /> Xem ngay
                    </Link>
                    <Link
                      href={`/phim/${movie.slug}`}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/30 bg-white/[.13] px-5 text-[13px] font-bold text-white shadow-lg backdrop-blur-xl transition-all hover:bg-white/20 active:scale-[.97]"
                    >
                      <Info size={17} /> Chi tiết
                    </Link>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* Compact app header: brand and a single notification icon. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center justify-between px-5 pt-[max(14px,env(safe-area-inset-top))] sm:px-8 lg:hidden">
        <Link
          href="/"
          aria-label="GiapTran Trang chủ"
          className="pointer-events-auto inline-flex items-center"
        >
          <Image
            src="/images/logo.svg"
            alt="GiapTran"
            width={124}
            height={38}
            priority
            className="h-[30px] w-auto drop-shadow-[0_2px_10px_rgba(0,0,0,.65)]"
          />
        </Link>
        <button
          type="button"
          aria-label="Thông báo"
          title="Thông báo"
          onClick={() => setNotificationsOpen(true)}
          className="pointer-events-auto relative flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/30 text-white shadow-[0_5px_20px_rgba(0,0,0,.25)] backdrop-blur-2xl transition-colors active:bg-white/20"
        >
          <Bell size={19} strokeWidth={1.9} />
          {!user && (
            <span
              aria-label="Có thông báo mới"
              className="absolute right-[7px] top-[7px] h-[9px] w-[9px] rounded-full border-2 border-[#171923] bg-[#ff3b4f] shadow-[0_0_0_2px_rgba(255,59,79,.18)]"
            />
          )}
        </button>
      </div>

      {notificationsOpen && (
        <div
          className="fixed inset-0 z-[180] flex min-h-[100dvh] flex-col overflow-y-auto bg-[#090b12] text-white"
          role="dialog"
          aria-modal="true"
          aria-labelledby="notification-title"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[340px] bg-[radial-gradient(ellipse_at_top,rgba(255,216,117,.14),transparent_68%)]" />
          <header className="relative flex items-center justify-between border-b border-white/[0.08] px-5 pb-4 pt-[max(18px,env(safe-area-inset-top))] sm:px-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#ffd875]">GIAPTRAN</p>
              <h2 id="notification-title" className="mt-1 text-[25px] font-black tracking-tight">Thông báo</h2>
            </div>
            <button
              type="button"
              onClick={() => setNotificationsOpen(false)}
              aria-label="Đóng thông báo"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/75 transition hover:bg-white/10"
            >
              <X size={20} />
            </button>
          </header>

          <div className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pb-10 pt-7 sm:px-8">
            {!user ? (
              <article className="overflow-hidden rounded-[28px] border border-[#ffd875]/20 bg-gradient-to-br from-[#24202a] via-[#171923] to-[#11131b] shadow-[0_22px_70px_rgba(0,0,0,.35)]">
                <div className="p-5 sm:p-7">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#ffd875]/20 bg-[#ffd875]/10 text-[#ffd875]">
                    <Clock3 size={23} />
                  </div>
                  <span className="inline-flex rounded-full border border-[#ffd875]/20 bg-[#ffd875]/10 px-3 py-1 text-[9px] font-extrabold uppercase tracking-[.16em] text-[#ffd875]">
                    Dành cho thành viên
                  </span>
                  <h3 className="mt-4 text-[22px] font-black leading-tight sm:text-[26px]">
                    Đừng bỏ lỡ bộ phim bạn đang xem
                  </h3>
                  <p className="mt-3 max-w-lg text-[14px] leading-7 text-white/60">
                    Đăng nhập để đồng bộ phim đang xem, tập phim và thời gian đã xem. Bạn có thể tiếp tục thưởng thức ngay tại vị trí đã dừng trên các thiết bị.
                  </p>
                  <button
                    type="button"
                    onClick={() => openAuth("login")}
                    className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#ffd875] px-5 text-[13px] font-extrabold text-[#171923] shadow-[0_8px_28px_rgba(255,216,117,.18)] transition hover:brightness-110 active:scale-[.98] sm:w-auto sm:min-w-[190px]"
                  >
                    Đăng nhập ngay <ArrowRight size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuth("register")}
                    className="mt-4 block w-full text-center text-[12px] font-semibold text-white/45 transition hover:text-[#ffd875] sm:text-left"
                  >
                    Chưa có tài khoản? Đăng ký miễn phí
                  </button>
                </div>
              </article>
            ) : (
              <article className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 sm:p-7">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                  <Sparkles size={22} />
                </div>
                <h3 className="text-xl font-extrabold">Bạn đã đăng nhập</h3>
                <p className="mt-2 text-sm leading-7 text-white/55">
                  Phim đang xem và tiến trình xem của bạn được đồng bộ với tài khoản để có thể tiếp tục trên thiết bị khác.
                </p>
              </article>
            )}
            <p className="mt-auto pt-10 text-center text-[10px] font-medium tracking-[.14em] text-white/25">
              GIAPTRAN · XEM PHIM THEO CÁCH CỦA BẠN
            </p>
          </div>
        </div>
      )}

      <div className="absolute bottom-7 left-1/2 z-40 w-fit max-w-[90%] -translate-x-1/2 sm:bottom-8">
        <Swiper
          onSwiper={setThumbsSwiper}
          modules={[Thumbs]}
          watchSlidesProgress
          slidesPerView="auto"
          allowTouchMove={false}
          simulateTouch={false}
          spaceBetween={11}
          className="hero-cast-slider !w-fit !overflow-visible [&_.swiper-wrapper]:!justify-center"
        >
          {movies.map((movie) => (
            <SwiperSlide
              key={movie._id}
              className="!h-10 !w-10 cursor-pointer sm:!h-11 sm:!w-11 [&.swiper-slide-thumb-active>div]:scale-110 [&.swiper-slide-thumb-active>div]:border-[#ffd875] [&.swiper-slide-thumb-active>div]:shadow-[0_0_18px_rgba(255,216,117,.85)]"
            >
              <div className="relative h-full w-full overflow-hidden rounded-full border-2 border-white/45 bg-[#292c38] shadow-[0_3px_12px_rgba(0,0,0,.35)] transition-all duration-300">
                <Image
                  src={movie.poster_url || movie.thumb_url}
                  alt={movie.name}
                  fill
                  sizes="40px"
                  quality={75}
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
