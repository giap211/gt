"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { Bell, Play, Plus, X, Bookmark } from "lucide-react";
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

export const HeroSlider = ({ movies }: HeroSliderProps) => {
  const [mainSwiper, setMainSwiper] = useState<SwiperType | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [savedSlugs, setSavedSlugs] = useState<Set<string>>(() => new Set());
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const { user, openAuth } = useMember();

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
        .hero-card-wrap {
          padding: max(12px, env(safe-area-inset-top)) 16px 8px;
        }
        .hero-card {
          position: relative;
          border-radius: 28px;
          overflow: hidden;
          isolation: isolate;
          min-height: 420px;
          box-shadow: 0 18px 50px rgba(76, 29, 149, 0.18);
        }
        html[data-mobile-theme="dark"] .hero-card {
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
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
        .hero-card-title {
          font-size: clamp(26px, 7vw, 34px);
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.1;
          color: #fff;
          text-shadow: 0 2px 16px rgba(0, 0, 0, 0.35);
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
        }
        .hero-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 42px;
          padding: 0 18px;
          border-radius: 999px;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          box-shadow: 0 8px 22px rgba(124, 58, 237, 0.4);
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
          background: rgba(139, 92, 246, 0.45);
          border-color: rgba(196, 181, 253, 0.55);
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
            box-shadow: none;
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
              const heroImage =
                movie.backdrop_url || movie.thumb_url || movie.poster_url;
              const desc = cleanText(movie.content);
              const metaParts = [
                movie.rating ? `★ ${movie.rating}` : null,
                movie.year ? String(movie.year) : null,
                movie.quality || null,
                movie.episode_current || movie.time || null,
              ].filter(Boolean);

              return (
                <SwiperSlide key={movie._id} className="relative !h-auto">
                  <div className="relative min-h-[420px] sm:min-h-[480px] lg:min-h-[620px]">
                    <div className="absolute inset-0 z-0 bg-[#1a1030]">
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
                          <h1 className="hero-card-title line-clamp-2">
                            {movie.name}
                          </h1>
                        </Link>

                        {metaParts.length > 0 && (
                          <p className="hero-card-meta mt-2">
                            {metaParts.join("  ·  ")}
                          </p>
                        )}

                        {desc && (
                          <p className="hero-card-desc mt-2.5 line-clamp-2 max-w-[300px]">
                            {desc}
                          </p>
                        )}


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
            className="fixed inset-0 z-[200] flex flex-col bg-[#0c0c12]/96 backdrop-blur-md"
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
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
              <Bell size={28} className="text-violet-400/80" />
              <p className="text-sm text-white/50">Chưa có thông báo mới</p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
