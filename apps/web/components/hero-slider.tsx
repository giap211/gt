"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { Bell, Search, Play, Bookmark, X, Clock3, ArrowRight, Sparkles } from "lucide-react";
import { useMember } from "./member-provider";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";

import "swiper/css";
import "swiper/css/effect-fade";

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
  rating?: number | string;
  content?: string;
  category?: { name: string }[];
  tmdb?: { type?: "movie" | "tv" | string };
}

interface HeroSliderProps {
  movies: Movie[];
}

export const HeroSlider = ({ movies }: HeroSliderProps) => {
  const [mainSwiper, setMainSwiper] = useState<SwiperType | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
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
    <>
      <style jsx global>{`
      .home-feature-hero .swiper,.home-feature-hero .swiper-wrapper,.home-feature-hero .swiper-slide { border-radius:0 !important; }
      .home-feature-hero .hero-bottom-fade { background:radial-gradient(ellipse 88% 105% at 50% 100%,rgba(168,85,247,.42) 0%,rgba(139,92,246,.24) 34%,rgba(124,58,237,.08) 62%,transparent 82%),linear-gradient(180deg,rgba(7,8,17,.06) 0%,rgba(7,8,17,.12) 28%,rgba(7,8,17,.68) 76%,#090b13 100%); }
      .home-feature-hero .hero-top-transition { background:linear-gradient(180deg,#0b0d14 0%,rgba(11,13,20,.96) 18%,rgba(76,29,149,.20) 58%,rgba(11,13,20,0) 100%); }
      .home-feature-hero .hero-top-transition::after { content:"";position:absolute;inset:0;background:radial-gradient(ellipse 76% 85% at 50% 100%,rgba(139,92,246,.16) 0%,rgba(168,85,247,.07) 42%,transparent 78%); }
      .home-feature-hero .hero-slide-dot { width:6px;height:6px;border-radius:999px;background:rgba(255,255,255,.55);box-shadow:0 0 5px rgba(255,255,255,.2);transition:all .28s ease; }
      .home-feature-hero .hero-slide-dot[aria-current="true"] { width:17px;height:6px;background:linear-gradient(90deg,#e879f9,#8b5cf6);box-shadow:0 0 10px rgba(168,85,247,.85),0 0 20px rgba(168,85,247,.45); }
      html[data-mobile-theme="light"] .home-feature-hero .home-hero-side-shade,html[data-theme="light"] .home-feature-hero .home-hero-side-shade { background:linear-gradient(105deg,rgba(248,246,255,.97) 0%,rgba(245,241,255,.88) 55%,rgba(245,241,255,.18) 100%); }
      html[data-mobile-theme="light"] .home-feature-hero .home-hero-top-shade,html[data-theme="light"] .home-feature-hero .home-hero-top-shade { background:linear-gradient(180deg,rgba(248,246,255,.16),transparent 45%,rgba(245,243,251,.82)); }
      html[data-mobile-theme="light"] .home-feature-hero .hero-bottom-fade,html[data-theme="light"] .home-feature-hero .hero-bottom-fade { background:linear-gradient(180deg,transparent 0%,rgba(245,243,251,.35) 35%,#f5f3fb 100%); }
      html[data-mobile-theme="light"] .home-feature-hero h1,html[data-theme="light"] .home-feature-hero h1 { color:#29223d !important;text-shadow:none !important; }
      html[data-mobile-theme="light"] .home-feature-hero p,html[data-theme="light"] .home-feature-hero p { color:rgba(41,34,61,.76) !important; }
      html[data-mobile-theme="light"] .home-feature-hero .hero-source-badge,html[data-theme="light"] .home-feature-hero .hero-source-badge,html[data-mobile-theme="light"] .home-feature-hero .hero-meta-badge,html[data-theme="light"] .home-feature-hero .hero-meta-badge { color:#51436f !important;background:rgba(255,255,255,.68) !important;border-color:rgba(112,84,170,.24) !important; }
      `}</style>
      <section className="home-feature-hero relative isolate h-[390px] w-full overflow-hidden bg-[#090b13] sm:h-[560px] md:h-[680px] lg:h-[720px]">
      <Swiper
        onSwiper={setMainSwiper}
        onSlideChange={(swiper) => setActiveSlide(swiper.realIndex)}
        modules={[Autoplay, EffectFade]}
        effect="fade"
        speed={700}
        autoplay={{ delay: 8000, disableOnInteraction: false }}
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
                  className="object-cover object-[58%_center] sm:object-center"
                />
                <div className="home-hero-top-shade absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-[#090b13]/75" />
                <div aria-hidden="true" className="hero-top-transition pointer-events-none absolute inset-x-0 top-0 z-[1] h-[170px] sm:h-[220px]" />
                <div className="home-hero-side-shade absolute inset-0 bg-gradient-to-r from-[#090b13]/95 via-[#090b13]/65 to-transparent" />
              </div>

              <div className="hero-bottom-fade pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[145px] opacity-100 sm:h-[190px] md:h-[230px]" />

              <div className="relative z-20 flex h-full w-full flex-col items-start justify-center px-[19px] pb-[4px] pt-[92px] text-left sm:px-10 sm:pt-24 md:px-16 md:pt-28">
                <div className="w-full max-w-[330px] animate-fade-up sm:max-w-[480px] md:max-w-[560px]">
                  {(movie.hero_source || true) && (
                    <span className={`hero-source-badge hero-source-${movie.hero_source} inline-flex items-center rounded-full border border-violet-300/30 bg-gradient-to-r from-fuchsia-500/90 to-violet-600/90 px-3 py-1 text-[11px] font-bold tracking-normal text-white shadow-[0_4px_16px_rgba(147,51,234,.3)]`}>
                      {movie.tmdb?.type === "tv" ? "Phim bộ" : "Phim lẻ"}
                    </span>
                  )}

                  <Link
                    href={`/phim/${movie.slug}`}
                    className="mt-3 block max-w-full text-white drop-shadow-[0_3px_12px_rgba(0,0,0,.8)] transition-colors hover:text-violet-200"
                    aria-label={`Xem phim ${movie.name}`}
                  >
                    <h1 className="line-clamp-2 text-[29px] font-black leading-[1.12] tracking-[-.035em] sm:text-4xl md:text-5xl lg:text-[56px]">
                      {movie.name}
                    </h1>
                  </Link>

                  {movie.origin_name && (
                    <p className="mt-1 line-clamp-1 text-[11px] font-medium tracking-wide text-white/70 drop-shadow sm:text-sm">
                      {movie.origin_name}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] font-semibold text-white/90 sm:text-sm">
                    {movie.rating && <span className="inline-flex items-center gap-1.5"><span className="text-amber-400">★</span>{Number(movie.rating).toFixed(1)}</span>}
                    {movie.rating && <span className="h-4 w-px bg-white/35" />}
                    {movie.time && <span>{movie.time}</span>}
                    {movie.time && movie.category?.[0]?.name && <span className="h-4 w-px bg-white/35" />}
                    {movie.category?.[0]?.name && <span>{movie.category[0].name}</span>}
                    {!movie.time && !movie.category?.[0]?.name && <span>{movie.year}</span>}
                  </div>
                  {movie.content && <p className="mt-3 max-w-[330px] line-clamp-2 text-[12px] leading-[1.55] text-white/75 drop-shadow sm:max-w-[440px] sm:text-[15px]">{movie.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}</p>}

                  <div className="mt-5 flex items-center gap-3">
                    <Link
                      href={`/phim/${movie.slug}`}
                      className="inline-flex h-[42px] min-w-[134px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#d946ef] via-[#a855f7] to-[#6d28d9] px-5 text-[13px] font-extrabold text-white shadow-[0_5px_22px_rgba(168,85,247,.48)] transition-all hover:brightness-110 active:scale-[.97] sm:h-12 sm:min-w-[148px] sm:text-sm"
                    >
                      <Play size={16} fill="currentColor" /> Xem ngay
                    </Link>
                    <button
                      type="button"
                      aria-label="Lưu phim"
                      className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-full border border-violet-300/35 bg-violet-400/15 text-white shadow-[0_4px_18px_rgba(124,58,237,.24)] backdrop-blur-xl transition-all hover:bg-violet-400/25 active:scale-[.97] sm:h-12 sm:w-12"
                    >
                      <Bookmark size={19} />
                    </button>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* Compact app header: brand and a single notification icon. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center justify-between px-5 pt-[max(48px,env(safe-area-inset-top))] sm:px-10 sm:pt-8 md:px-16 lg:hidden">
        <Link
          href="/"
          aria-label="PHIM LẬU - Trang chủ"
          className="pointer-events-auto inline-flex items-center"
        >
          <span className="flex items-center gap-2.5 text-[23px] font-black tracking-[-.06em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,.6)]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-700 shadow-[0_4px_18px_rgba(168,85,247,.45)]"><Play size={19} fill="white" strokeWidth={0} /></span><span>PHIM <span className="bg-gradient-to-r from-fuchsia-300 to-violet-400 bg-clip-text text-transparent">LẬU</span></span></span>
        </Link>
        <div className="pointer-events-auto flex items-center gap-2">
        <button type="button" aria-label="Tìm kiếm" onClick={() => window.dispatchEvent(new Event("gt:open-search"))} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-[0_5px_20px_rgba(0,0,0,.2)] backdrop-blur-2xl"><Search size={20} /></button>
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
      </div>

      {notificationsOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex min-h-[100dvh] flex-col overflow-y-auto overscroll-contain bg-[#090b12] text-white"
          role="dialog"
          aria-modal="true"
          aria-labelledby="notification-title"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[340px] bg-[radial-gradient(ellipse_at_top,rgba(255,216,117,.14),transparent_68%)]" />
          <header className="relative flex items-center justify-between border-b border-white/[0.08] px-5 pb-4 pt-[max(18px,env(safe-area-inset-top))] sm:px-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#a78bfa]">GIAPTRAN</p>
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
              <article className="overflow-hidden rounded-[28px] border border-[#a78bfa]/20 bg-gradient-to-br from-[#24202a] via-[#171923] to-[#11131b] shadow-[0_22px_70px_rgba(0,0,0,.35)]">
                <div className="p-5 sm:p-7">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#a78bfa]/20 bg-gradient-to-r from-fuchsia-500 to-violet-600/10 text-[#a78bfa]">
                    <Clock3 size={23} />
                  </div>
                  <span className="inline-flex rounded-full border border-[#a78bfa]/20 bg-[#a78bfa]/10 px-3 py-1 text-[9px] font-extrabold uppercase tracking-[.16em] text-[#a78bfa]">
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
                    className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#a78bfa] px-5 text-[13px] font-extrabold text-white shadow-[0_8px_28px_rgba(168,85,247,.18)] transition hover:brightness-110 active:scale-[.98] sm:w-auto sm:min-w-[190px]"
                  >
                    Đăng nhập ngay <ArrowRight size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuth("register")}
                    className="mt-4 block w-full text-center text-[12px] font-semibold text-white/45 transition hover:text-[#a78bfa] sm:text-left"
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
        </div>,
        document.body,
      )}

      <div className="absolute bottom-[18px] left-1/2 z-40 flex -translate-x-1/2 items-center justify-center gap-[7px] sm:bottom-7 sm:gap-2">
        {movies.slice(0, 6).map((movie, index) => (
          <button
            key={movie._id}
            type="button"
            aria-label={`Chuyển đến phim ${index + 1}: ${movie.name}`}
            aria-current={activeSlide === index ? "true" : "false"}
            onClick={() => mainSwiper?.slideTo(index)}
            className="hero-slide-dot"
          />
        ))}
      </div>
      </section>
    </>
  );
};
