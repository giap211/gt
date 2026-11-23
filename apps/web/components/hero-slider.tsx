"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ResilientMovieImage } from "./resilient-movie-image";
import Link from "next/link";
import { Bell, Play, Plus, X, Bookmark, ShieldCheck, Sparkles, Check } from "lucide-react";
import { useMember } from "./member-provider";
import { memberClient } from "@/lib/member-client";
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
  description?: string;
  category?: { name: string }[];
  tmdb?: { type?: "movie" | "tv" | string };
}

interface HeroSliderProps {
  movies: Movie[];
}

function cleanText(html?: string) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function wrapHeroTitle(title: string, maxChars = 20) {
  const words = title.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && candidate.length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

export const HeroSlider = ({ movies }: HeroSliderProps) => {
  const [mainSwiper, setMainSwiper] = useState<SwiperType | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeTrailer, setActiveTrailer] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [savedSlugs, setSavedSlugs] = useState<Set<string>>(() => new Set());
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const { user, openAuth } = useMember();

  useEffect(() => {
    const movie = movies[activeSlide];
    if (!movie?.slug) { setActiveTrailer(null); return; }
    let cancelled = false;
    setActiveTrailer(null);
    fetch(`/api/hero-trailer/${encodeURIComponent(movie.slug)}`)
      .then(async (response) => response.ok ? await response.json() as { trailerKey?: string | null } : null)
      .then((result) => { if (!cancelled) setActiveTrailer(result?.trailerKey || null); })
      .catch(() => { if (!cancelled) setActiveTrailer(null); });
    return () => { cancelled = true; };
  }, [activeSlide, movies]);

  useEffect(() => {
    let cancelled = false;
    void memberClient.favorites().then(({ items }) => {
      if (!cancelled) setSavedSlugs(new Set(items.map((item) => item.movieSlug)));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleFavorite = async (movie: Movie) => {
    if (!user) {
      openAuth("login");
      return;
    }
    if (savingSlug === movie.slug) return;
    setSavingSlug(movie.slug);
    try {
      const result = await memberClient.toggleFavorite({
        movieSlug: movie.slug,
        movieTitle: movie.name,
        posterUrl: movie.poster_url || movie.thumb_url,
      });
      setSavedSlugs((current) => {
        const next = new Set(current);
        if (result.favorited) next.add(movie.slug);
        else next.delete(movie.slug);
        return next;
      });
    } finally {
      setSavingSlug(null);
    }
  };

  useEffect(() => {
    if (!notificationsOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [notificationsOpen]);

  if (!movies || movies.length === 0) return null;

  return (
    <>
      <style jsx global>{`
        .home-notification-overlay { background: radial-gradient(ellipse at 50% 38%, rgba(103,76,174,.22), transparent 48%), radial-gradient(ellipse at 12% 88%, rgba(68,47,122,.16), transparent 42%), rgba(9,8,17,.97) !important; animation: home-notice-overlay-in .38s ease-out both; }
        .home-notice-content { position:relative; isolation:isolate; overflow:hidden; }
        .home-notice-glow { position:absolute; width:260px; height:260px; border-radius:50%; background:rgba(132,91,220,.18); filter:blur(75px); top:20%; animation:home-notice-breathe 5s ease-in-out infinite alternate; }
        .home-notice-card { isolation:isolate; border:1px solid rgba(210,190,255,.2); background:linear-gradient(150deg,rgba(42,34,65,.88),rgba(18,17,29,.94) 58%,rgba(30,24,48,.9)); box-shadow:0 24px 90px rgba(0,0,0,.38),inset 0 1px 0 rgba(255,255,255,.13); animation:home-notice-card-in .65s cubic-bezier(.2,.8,.2,1) both; }
        .home-notice-card::before { content:""; position:absolute; inset:0; pointer-events:none; border-radius:inherit; padding:1px; background:linear-gradient(135deg,rgba(222,205,255,.55),transparent 38%,rgba(154,117,239,.28) 72%,transparent); -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0); -webkit-mask-composite:xor; mask-composite:exclude; }
        .home-notice-orbit { position:absolute; width:260px; height:260px; top:-185px; left:50%; transform:translateX(-50%); border:1px solid rgba(206,185,255,.12); border-radius:50%; box-shadow:0 0 0 22px rgba(206,185,255,.025),0 0 0 48px rgba(206,185,255,.02); pointer-events:none; }
        .home-notice-icon-wrap { color:#eee6ff; background:linear-gradient(145deg,rgba(171,137,255,.28),rgba(104,76,171,.13)); border:1px solid rgba(220,203,255,.28); box-shadow:0 10px 38px rgba(127,91,205,.22),inset 0 1px 0 rgba(255,255,255,.18); animation:home-notice-float 4s ease-in-out infinite; }
        .home-notice-shield { filter:drop-shadow(0 0 12px rgba(190,160,255,.5)); }
        .home-notice-sparkle { position:absolute; right:-5px; top:-5px; display:grid; place-items:center; width:27px; height:27px; border-radius:50%; color:#fff; background:linear-gradient(135deg,#b79aff,#7550c8); box-shadow:0 4px 16px rgba(137,99,220,.45); }
        .home-notice-gradient-text { background:linear-gradient(100deg,#e5d8ff 5%,#b99aff 48%,#f0d7ff 95%); -webkit-background-clip:text; background-clip:text; color:transparent; }
        @keyframes home-notice-overlay-in { from { opacity:0 } to { opacity:1 } }
        @keyframes home-notice-card-in { from { opacity:0; transform:translateY(22px) scale(.96) } to { opacity:1; transform:translateY(0) scale(1) } }
        @keyframes home-notice-float { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-5px) } }
        @keyframes home-notice-breathe { from { opacity:.55; transform:scale(.9) } to { opacity:1; transform:scale(1.12) } }
        @media (prefers-reduced-motion:reduce) { .home-notification-overlay,.home-notice-card,.home-notice-icon-wrap,.home-notice-glow { animation:none!important } }
        .hero-card-wrap {
          padding: max(12px, env(safe-area-inset-top)) 16px 8px;
        }
        .hero-card {
          position: relative;
          border-radius: 28px;
          overflow: hidden;
          isolation: isolate;
          min-height: 420px;
          
        }
        html[data-mobile-theme="dark"] .hero-card {
          
        }
        .hero-card-overlay {
          background: linear-gradient(
            180deg,
            rgba(15, 10, 30, 0.15) 0%,
            rgba(15, 10, 30, 0.25) 35%,
            rgba(15, 10, 30, 0.78) 72%,
            rgba(12, 8, 24, 0.95) 100%
          );
        }
        .hero-card-title-svg {
          display: block;
          width: 100%;
          max-width: 420px;
          height: auto;
          overflow: visible;
          
        }
        .hero-card-title-svg text {
          font-family: inherit;
          font-size: 52px;
          font-weight: 800;
          letter-spacing: -1.6px;
          paint-order: stroke fill;
        }
        .hero-card-title-svg text > tspan {
          fill: transparent;
        }
        .hero-card-title-svg text > tspan > tspan {
          fill: transparent;
          stroke: #fff;
          stroke-width: 1.5;
          stroke-linejoin: round;
          stroke-dasharray: 1200;
          stroke-dashoffset: 1200;
          animation: hero-svg-letter-draw 3s cubic-bezier(0, 0.23, 1, 0.1) both;
        }
        @keyframes hero-svg-letter-draw {
          0% { opacity: 0; fill: transparent; stroke-dashoffset: 1200; }
          30% { opacity: 1; fill: transparent; stroke-dashoffset: 1200; }
          90% { fill: rgba(255, 255, 255, 0); }
          100% { opacity: 1; fill: #fff; stroke-dashoffset: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-card-title-svg text > tspan > tspan {
            animation: none;
            fill: #fff;
            stroke: none;
          }
        }
        .hero-card-meta {
          color: rgba(255, 255, 255, 0.72);
          font-size: 12px;
          font-weight: 600;
        }
        .hero-card-desc {
          color: rgba(255, 255, 255, 0.7);
          font-size: 13px;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          line-clamp: 2;
          overflow: hidden;
          text-overflow: ellipsis;
          max-height: 3em;
        }
        .hero-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 42px;
          padding: 0 18px;
          border-radius: 999px;
          background: linear-gradient(135deg, #f5f5f7, #cbd0d8);
          color: #17181c;
          font-size: 13px;
          font-weight: 700;
          
        }
        .hero-btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          height: 42px;
          padding: 0 16px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.28);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          backdrop-filter: blur(10px);
        }
        .hero-btn-secondary[aria-pressed="true"] {
          background: rgba(255, 255, 255, 0.18);
          border-color: rgba(255, 255, 255, 0.42);
        }
        .hero-bell {
          width: 40px;
          height: 40px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.22);
          color: #fff;
          backdrop-filter: blur(12px);
          position: relative;
        }
        @media (min-width: 640px) {
          .hero-card {
            min-height: 480px;
          }
        }
        @media (min-width: 1024px) {
          .hero-card-wrap {
            padding: 0;
          }
          .hero-card {
            border-radius: 0;
            min-height: 620px;
            
          }
        }
      `}</style>

      <section className="hero-card-wrap w-full">
        <div className="hero-card relative mx-auto w-full max-w-3xl">
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
              const heroImageSources = [
                movie.backdrop_url,
                movie.thumb_url,
                movie.poster_url,
              ];
              const desc = cleanText(movie.content || movie.description);
              const metaParts = [
                movie.rating ? `★ ${movie.rating}` : null,
                movie.year ? String(movie.year) : null,
                movie.quality || null,
                movie.episode_current || movie.time || null,
              ].filter(Boolean);

              return (
                <SwiperSlide key={movie._id} className="relative !h-auto">
                  <div className="relative min-h-[420px] sm:min-h-[480px] lg:min-h-[620px]">
                    <div className="absolute inset-0 z-0 bg-[#191b24]">
                      <ResilientMovieImage
                        sources={heroImageSources}
                        fallbackSrc="/images/fallback-horizontal.svg"
                        alt={movie.name}
                        fill
                        priority={index === 0}
                        loading={index === 0 ? undefined : "lazy"}
                        sizes="100vw"
                        quality={80}
                        className="object-cover object-center"
                      />
                      {index === activeSlide && activeTrailer && (
                        <iframe
                          key={`${movie.slug}-${activeTrailer}`}
                          title={`Trailer ${movie.name} (tắt tiếng)`}
                          src={`https://www.youtube-nocookie.com/embed/${activeTrailer}?autoplay=1&mute=1&controls=0&playsinline=1&loop=1&playlist=${activeTrailer}&modestbranding=1&rel=0&iv_load_policy=3`}
                          className="absolute inset-0 h-full w-full scale-[1.18] pointer-events-none"
                          allow="autoplay; encrypted-media; picture-in-picture"
                          referrerPolicy="strict-origin-when-cross-origin"
                          tabIndex={-1}
                          aria-hidden="true"
                        />
                      )}
                      <div className="hero-card-overlay absolute inset-0" />
                    </div>

                    <div className="relative z-20 flex items-center justify-end px-4 pt-4 lg:px-10 lg:pt-8">
                      <button
                        type="button"
                        className="hero-bell pointer-events-auto"
                        aria-label="Thông báo"
                        onClick={() => setNotificationsOpen(true)}
                      >
                        <Bell size={18} />
                        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
                      </button>
                    </div>

                    <div className="relative z-20 px-5 pb-32 pt-16 sm:px-8 lg:px-12">
                      <div className="max-w-[340px] sm:max-w-[420px]">
                        <Link
                          href={`/phim/${movie.slug}`}
                          className="block"
                          aria-label={`Xem phim ${movie.name}`}
                        >
                          <svg
                            key={movie.slug}
                            className="hero-card-title-svg"
                            viewBox="0 0 680 120"
                            role="img"
                            aria-label={movie.name}
                          >
                            <text x="0" y="48">
                              {wrapHeroTitle(movie.name).map((line, lineIndex) => (
                                <tspan key={`line-${lineIndex}`} x="0" dy={lineIndex === 0 ? 0 : 54}>
                                  {Array.from(line).map((character, characterIndex) => (
                                    <tspan
                                      key={`char-${lineIndex}-${characterIndex}`}
                                      style={{ animationDelay: `${(lineIndex * 20 + characterIndex) * 18}ms` }}
                                    >
                                      {character === " " ? "\u00a0" : character}
                                    </tspan>
                                  ))}
                                </tspan>
                              ))}
                            </text>
                          </svg>
                        </Link>

                        {metaParts.length > 0 && (
                          <p className="hero-card-meta mt-2">
                            {metaParts.join("  ·  ")}
                          </p>
                        )}

                        {desc && (
                          <p className="hero-card-desc mt-2.5 max-w-[300px]">
                            {desc}
                          </p>
                        )}


                      </div>
                    </div>
                    <div className="absolute inset-x-5 bottom-5 z-30 flex flex-col gap-3 sm:inset-x-8 lg:inset-x-12">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <Link href={`/phim/${movie.slug}`} className="hero-btn-primary"><Play size={15} fill="currentColor" /> Xem phim</Link>
                        <button type="button" aria-label={savedSlugs.has(movie.slug) ? "Bỏ khỏi tủ phim" : "Thêm vào tủ phim"} aria-pressed={savedSlugs.has(movie.slug)} disabled={savingSlug === movie.slug} onClick={() => void handleToggleFavorite(movie)} className="hero-btn-secondary">
                          {savedSlugs.has(movie.slug) ? <Bookmark size={15} fill="currentColor" /> : <Plus size={15} />}
                          {savedSlugs.has(movie.slug) ? "Đã lưu" : "Thêm vào tủ phim"}
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {movies.map((_, i) => <button key={i} type="button" aria-label={`Slide ${i + 1}`} aria-current={i === activeSlide} onClick={() => mainSwiper?.slideToLoop(i)} className={`h-1.5 rounded-full transition-all ${i === activeSlide ? "w-5 bg-white" : "w-1.5 bg-white/40"}`} />)}
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>
      </section>

      {notificationsOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-labelledby="notification-title"
            className="home-notification-overlay fixed inset-0 z-[200] flex flex-col bg-[#0c0c12]/96 backdrop-blur-md"
          >
            <header className="flex items-center justify-between border-b border-white/10 px-4 pb-3 pt-[max(16px,env(safe-area-inset-top))]">
              <h2 id="notification-title" className="text-base font-bold text-white">
                Thông báo
              </h2>
              <button
                type="button"
                onClick={() => setNotificationsOpen(false)}
                className="flex h-9 w-9 items-center justify-center text-white/60"
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </header>
            <div className="home-notice-content flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
              <div className="home-notice-glow" aria-hidden="true" />
              <div className="home-notice-card relative w-full max-w-[390px] overflow-hidden rounded-[30px] px-6 pb-8 pt-9 sm:px-8">
                <div className="home-notice-orbit" aria-hidden="true" />
                <div className="home-notice-icon-wrap relative mx-auto mb-6 flex h-[76px] w-[76px] items-center justify-center rounded-[26px]">
                  <ShieldCheck size={38} strokeWidth={1.65} className="home-notice-shield" />
                  <span className="home-notice-sparkle"><Sparkles size={16} /></span>
                </div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[.28em] text-violet-200/75">Cam kết trải nghiệm</p>
                <h3 className="text-[29px] font-extrabold leading-[1.12] tracking-[-.045em] text-white sm:text-[34px]">
                  Xem phim trọn vẹn.
                  <span className="block home-notice-gradient-text">Không quảng cáo.</span>
                </h3>
                <p className="mx-auto mt-4 max-w-[290px] text-[13px] leading-6 text-white/65">
                  Website sẽ không bao giờ có quảng cáo. Tận hưởng phim yêu thích liền mạch, không bị làm phiền.
                </p>
                <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                <div className="flex flex-col gap-3 text-left">
                  {["Không banner quảng cáo", "Không pop-up làm phiền", "Không quảng cáo chen giữa phim"].map((item) => (
                    <div key={item} className="flex items-center gap-3 text-[12px] font-medium text-white/80">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-400/15 text-violet-200"><Check size={13} strokeWidth={2.5} /></span>
                      {item}
                    </div>
                  ))}
                </div>
                <div className="mt-7 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[.18em] text-violet-200/65">
                  <Sparkles size={13} /> Trải nghiệm giải trí thuần túy
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
