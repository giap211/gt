"use client";

import { useEffect, useRef, useState } from "react";
import { HeroSlider } from "@/components/hero-slider";
import { MovieCarousel } from "@/components/movie-carousel";
import { TrendingCarousel } from "@/components/trending-carousel";
import { TopicGrid } from "@/components/topic-grid";
import { AdsBanner } from "@/components/ads-banner";
import { GhibliSection } from "@/components/ghibli-section";
import { ContinueWatchingSection } from "@/components/continue-watching-section";
import {
  getLatestMovies,
  getMoviesByLanguage,
  getMoviesByType,
  getAnimeMoviesByCountry,
  getMoviesByCountry,
  getMoviesByCategory,
  type ListMovie,
} from "@/lib/ophim-client";

type HeroMovie = ListMovie & {
  backdrop_url?: string;
  hero_source?: "tmdb" | "netflix" | "latest";
};

function HomeSkeletonHero() {
  return (
    <div className="px-4 pt-3 pb-2" aria-hidden="true">
      <div className="relative h-[min(66svh,610px)] min-h-[420px] overflow-hidden rounded-[28px] bg-[#171321]">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-violet-950/70 via-[#211a32] to-[#111018]" />
        <div className="absolute inset-x-0 bottom-0 space-y-4 bg-gradient-to-t from-[#08090d] via-[#08090d]/70 to-transparent px-5 pb-12 pt-28">
          <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
          <div className="h-10 w-3/4 max-w-[280px] animate-pulse rounded-xl bg-white/15" />
          <div className="h-3 w-2/3 animate-pulse rounded-full bg-white/10" />
          <div className="flex gap-3 pt-2">
            <div className="h-11 w-32 animate-pulse rounded-full bg-white/20" />
            <div className="h-11 w-28 animate-pulse rounded-full bg-white/10" />
          </div>
        </div>
        <div className="absolute right-5 top-5 h-10 w-10 animate-pulse rounded-full border border-white/10 bg-white/10" />
      </div>
    </div>
  );
}

function HomeSkeletonShelf({ compact = false }: { compact?: boolean }) {
  return (
    <section className="w-full py-3" aria-hidden="true">
      <div className="px-5">
        <div className="mb-3 h-5 w-40 animate-pulse rounded-md bg-white/10" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="w-[38vw] max-w-[170px] shrink-0">
              <div className={`aspect-[2/3] w-full animate-pulse rounded-xl bg-gradient-to-br from-white/10 to-white/[0.035] ${compact ? "aspect-[3/4]" : ""}`} />
              <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-white/10" />
              <div className="mt-2 h-2.5 w-1/2 animate-pulse rounded bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeSecondarySkeleton() {
  return (
    <div className="space-y-1 md:space-y-2" aria-label="Đang tải danh sách phim">
      <HomeSkeletonShelf />
      <HomeSkeletonShelf />
      <HomeSkeletonShelf />
      <HomeSkeletonShelf compact />
      <HomeSkeletonShelf />
      <HomeSkeletonShelf />
    </div>
  );
}

export function HomeScreen() {
  const [data, setData] = useState<{
    latest: ListMovie[];
    dubbed: ListMovie[];
    korean: ListMovie[];
    chinese: ListMovie[];
    usuk: ListMovie[];
    series: ListMovie[];
    single: ListMovie[];
    cartoon: ListMovie[];
    cinema: ListMovie[];
    japanese: ListMovie[];
    thai: ListMovie[];
    hongkong: ListMovie[];
    costume: ListMovie[];
    horror: ListMovie[];
    romance: ListMovie[];
    viet: ListMovie[];
    hero: HeroMovie[];
  }>({
    latest: [],
    dubbed: [],
    korean: [],
    chinese: [],
    usuk: [],
    series: [],
    single: [],
    cartoon: [],
    cinema: [],
    japanese: [],
    thai: [],
    hongkong: [],
    costume: [],
    horror: [],
    romance: [],
    viet: [],
    hero: [],
  });

  const [coreLoaded, setCoreLoaded] = useState(false);
  const [secondaryLoaded, setSecondaryLoaded] = useState(false);
  const [shouldLoadSecondary, setShouldLoadSecondary] = useState(false);
  const secondaryTriggerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchHeroBackdrops = async (movies: ListMovie[]) => {
      const results = await Promise.all(
        movies.map(async (movie) => {
          try {
            const response = await fetch(
              `/api/hero-image/${encodeURIComponent(movie.slug)}`,
            );
            if (!response.ok) {
              return { slug: movie.slug, backdrop_url: undefined };
            }
            const result = (await response.json()) as {
              backdropUrl?: string | null;
            };
            return {
              slug: movie.slug,
              backdrop_url: result.backdropUrl || undefined,
            };
          } catch {
            return { slug: movie.slug, backdrop_url: undefined };
          }
        }),
      );

      if (cancelled) return;

      const backdropBySlug = new Map(
        results.map((item) => [item.slug, item.backdrop_url]),
      );

      setData((current) => ({
        ...current,
        hero: current.hero.map((movie) => ({
          ...movie,
          backdrop_url:
            backdropBySlug.get(movie.slug) || movie.backdrop_url,
        })),
      }));
    };

    const fetchData = async () => {
      const corePromise = Promise.all([
        getLatestMovies(1),
        getMoviesByType("phim-bo", 1, true),
        getMoviesByType("phim-le", 1, true),
      ]);
      const heroPromise = fetch("/api/hero-trending")
        .then(async (response) => {
          if (!response.ok) return [] as HeroMovie[];
          const payload = (await response.json()) as { items?: HeroMovie[] };
          return Array.isArray(payload.items) ? payload.items : [];
        })
        .catch((error) => {
          console.error("Failed to fetch trending hero movies", error);
          return [] as HeroMovie[];
        });
      try {
        const [latestRes, seriesRes, singleRes] = await corePromise;
        if (cancelled) return;
        const fallbackHero = (latestRes?.items || []).slice(0, 6);
        setData((current) => ({
          ...current,
          latest: latestRes?.items || [],
          series: seriesRes?.items || [],
          single: singleRes?.items || [],
          cinema: singleRes?.items || [],
          hero: fallbackHero,
        }));
        setCoreLoaded(true);
        const trendingHero = await heroPromise;
        if (cancelled) return;
        const curatedHero = (trendingHero.length ? trendingHero : fallbackHero).slice(0, 6);
        setData((current) => ({ ...current, hero: curatedHero }));
        void fetchHeroBackdrops(curatedHero);
      } catch (error) {
        console.error("Failed to fetch core movies", error);
        setCoreLoaded(true);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const target = secondaryTriggerRef.current;
    if (!target || shouldLoadSecondary) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoadSecondary(true);
          observer.disconnect();
        }
      },
      { rootMargin: "900px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [shouldLoadSecondary]);

  useEffect(() => {
    if (!shouldLoadSecondary) return;
    let cancelled = false;
    const fetchSecondary = async () => {
      try {
        const secondary = await Promise.all([
          getMoviesByLanguage("thuyet-minh", 1),
          getMoviesByCountry("han-quoc", 1, true),
          getMoviesByCountry("trung-quoc", 1, true),
          getMoviesByCountry("au-my", 1, true),
          getAnimeMoviesByCountry("nhat-ban", 1, true),
          getMoviesByCategory("chieu-rap", 1, true),
          getMoviesByCountry("nhat-ban", 1, true),
          getMoviesByCountry("thai-lan", 1, true),
          getMoviesByCountry("hong-kong", 1, true),
          getMoviesByCategory("co-trang", 1, true),
          getMoviesByCategory("kinh-di", 1, true),
          getMoviesByCategory("tinh-cam", 1, true),
          getMoviesByCountry("viet-nam", 1, true),
        ]);
        if (cancelled) return;
        const [dubbedRes, koreanRes, chineseRes, usukRes, cartoonRes, cinemaRes,
          japaneseRes, thaiRes, hongkongRes, costumeRes, horrorRes, romanceRes, vietRes] = secondary;
        setData((current) => ({
          ...current,
          dubbed: dubbedRes?.items || [],
          korean: koreanRes?.items || [],
          chinese: chineseRes?.items || [],
          usuk: usukRes?.items || [],
          cartoon: cartoonRes?.items || [],
          cinema: cinemaRes?.items?.length ? cinemaRes.items : current.single,
          japanese: japaneseRes?.items || [],
          thai: thaiRes?.items || [],
          hongkong: hongkongRes?.items || [],
          costume: costumeRes?.items || [],
          horror: horrorRes?.items || [],
          romance: romanceRes?.items || [],
          viet: vietRes?.items || [],
        }));
        setSecondaryLoaded(true);
      } catch (error) {
        console.error("Failed to fetch secondary movie shelves", error);
        setSecondaryLoaded(true);
      }
    };
    void fetchSecondary();
    return () => { cancelled = true; };
  }, [shouldLoadSecondary]);

  const uniqueMovies = (movies: ListMovie[]) => {
    return Array.from(
      new Map(
        (movies || []).map((movie) => [movie._id || movie.slug, movie]),
      ),
    ).map(([, movie]) => movie);
  };

  const transformMovies = (movies: ListMovie[]) => {
    return uniqueMovies(movies).map((m) => ({
      id: m._id,
      title: m.name,
      originalTitle: m.origin_name,
      posterUrl: m.poster_url,
      thumbUrl: m.thumb_url,
      slug: m.slug,
      year: m.year,
      quality: m.quality || "HD",
      language: m.lang || "Vietsub",
      episodeCurrent: m.episode_current,
      view: m.view,
      rating: m.rating,
      isSeries: false,
    }));
  };

  return (
    <main className="apple-tv-home min-h-screen bg-[#08090d] text-white font-sans overflow-x-hidden">
      <style jsx global>{`.apple-tv-home{--apple-home-bg:#08090d;background:var(--apple-home-bg)}
.apple-tv-home .home-feature-hero{height:min(66svh,610px)!important;min-height:520px;background:#08090d}
.apple-tv-home .home-feature-hero .hero-bottom-fade{background:linear-gradient(180deg,transparent 0%,rgba(8,9,13,.16) 38%,rgba(8,9,13,.82) 78%,#08090d 100%)!important}
.apple-tv-home .home-feature-hero .hero-short-black-fade{background:linear-gradient(180deg,transparent 0%,rgba(8,9,13,.25) 38%,rgba(8,9,13,.72) 75%,#08090d 100%)!important}
.apple-tv-home .home-feature-hero .hero-top-transition{background:linear-gradient(180deg,rgba(0,0,0,.42),transparent 72%)!important}
.apple-tv-home .home-feature-hero .home-hero-side-shade{background:linear-gradient(90deg,rgba(0,0,0,.58),transparent 92%)!important}
.apple-tv-home .home-feature-hero .hero-source-badge{border:0!important;border-radius:5px!important;background:rgba(255,255,255,.16)!important;box-shadow:none!important;letter-spacing:.12em;text-transform:uppercase;font-size:9px!important;backdrop-filter:blur(14px)}
.apple-tv-home .home-feature-hero h1{font-size:clamp(34px,9vw,48px)!important;line-height:1.02!important;letter-spacing:-.055em!important;font-weight:750!important}
.apple-tv-home .home-feature-hero .hero-slide-dot[aria-current=true]{background:#fff!important;box-shadow:0 0 0 3px rgba(255,255,255,.13)!important;width:5px!important;min-width:5px!important;height:5px!important}
.apple-tv-home .home-feature-hero .hero-slide-dot{background:rgba(255,255,255,.48);box-shadow:none;width:5px!important;min-width:5px!important;height:5px!important}
.apple-tv-home .home-feature-hero a[class*=bg-gradient-to-r]{background:#fff!important;color:#08090d!important;box-shadow:none!important;font-weight:750}
.apple-tv-home .home-feature-hero .absolute.inset-x-0.top-0{padding-top:max(54px,env(safe-area-inset-top))!important}


.apple-tv-home .container{max-width:none;padding-left:20px;padding-right:20px}
.apple-tv-home .movie-carousel-view-more{color:rgba(255,255,255,.62);padding:4px 0;font-size:11px;letter-spacing:-.01em}.apple-tv-home .movie-carousel-view-more-icon{background:transparent!important;color:inherit!important}
.apple-tv-home .movie-carousel-view-more-icon{width:20px;height:20px;background:rgba(255,255,255,.1)}
.apple-tv-home section:has(> .container){padding-top:13px;padding-bottom:13px}.apple-tv-home .movie-carousel-poster .movie-poster-frame{border-radius:12px!important;border:1px solid rgba(167,139,250,.16);box-shadow:0 5px 18px rgba(0,0,0,.14)}.apple-tv-home .movie-carousel-poster .movie-card-info{margin-top:8px!important}.apple-tv-home .movie-carousel-poster .movie-card-title{font-size:12px;line-height:1.35;font-weight:650}.apple-tv-home .movie-carousel-poster .movie-card-rating{font-size:10px;margin-top:4px}.apple-tv-home .movie-carousel-poster .movie-card-original{font-size:10px}.apple-tv-home .movie-carousel-swiper .swiper-slide{height:auto}
.apple-tv-home section:has(> .container) h2{color:#f5f5f7!important;background:none!important;-webkit-text-fill-color:#f5f5f7!important;font-size:19px;font-weight:700;letter-spacing:-.035em}
.apple-tv-home .topic-grid-section{padding-top:8px!important;padding-bottom:14px!important}
.apple-tv-home .topic-grid-chip{background:rgba(255,255,255,.075)!important;border:1px solid rgba(255,255,255,.09)!important;color:rgba(255,255,255,.82)!important;border-radius:9999px!important;box-shadow:none!important}
.apple-tv-home .topic-grid-icon{filter:saturate(.55)}
.apple-tv-home .topic-grid-title{color:#f5f5f7!important;font-size:18px!important;letter-spacing:-.035em}
.apple-tv-home .topic-grid-hint{color:rgba(255,255,255,.42)!important}
@media(max-width:480px){.apple-tv-home .movie-carousel-poster .movie-poster-frame{border-radius:11px!important}.apple-tv-home section:has(> .container){padding-top:12px;padding-bottom:12px}.apple-tv-home .home-feature-hero{height:min(66svh,610px)!important;min-height:520px}.apple-tv-home .home-feature-hero .relative.z-20{justify-content:flex-end!important;padding-bottom:76px!important;padding-top:90px!important}.apple-tv-home .home-feature-hero .relative.z-20>div{max-width:100%!important}.apple-tv-home .home-feature-hero .relative.z-20 p{max-width:310px}.apple-tv-home section:has(> .container){padding-top:14px;padding-bottom:14px}}
html[data-mobile-theme=light] .apple-tv-home,html[data-theme=light] .apple-tv-home{--apple-home-bg:#f5f3fb;background:#f5f3fb!important;color:#211d2d}
html[data-mobile-theme=light] .apple-tv-home .home-feature-hero,html[data-theme=light] .apple-tv-home .home-feature-hero{background:#f5f3fb!important}
html[data-mobile-theme=light] .apple-tv-home .home-feature-hero .hero-bottom-fade,html[data-theme=light] .apple-tv-home .home-feature-hero .hero-bottom-fade{background:linear-gradient(180deg,transparent 0%,rgba(8,9,13,.08) 38%,rgba(8,9,13,.68) 67%,rgba(8,9,13,.78) 78%,#f5f3fb 100%)!important}
html[data-mobile-theme=light] .apple-tv-home .home-feature-hero .hero-short-black-fade,html[data-theme=light] .apple-tv-home .home-feature-hero .hero-short-black-fade{background:linear-gradient(180deg,transparent 0%,rgba(8,9,13,.12) 35%,rgba(8,9,13,.46) 70%,#f5f3fb 100%)!important}
html[data-mobile-theme=light] .apple-tv-home .home-feature-hero .hero-top-transition,html[data-theme=light] .apple-tv-home .home-feature-hero .hero-top-transition{background:linear-gradient(180deg,rgba(8,9,13,.42),transparent 78%)!important}
html[data-mobile-theme=light] .apple-tv-home .home-feature-hero .home-hero-side-shade,html[data-theme=light] .apple-tv-home .home-feature-hero .home-hero-side-shade{background:linear-gradient(90deg,rgba(8,9,13,.38),rgba(8,9,13,.08) 62%,transparent 100%)!important}
html[data-mobile-theme=light] .apple-tv-home .home-feature-hero h1,html[data-theme=light] .apple-tv-home .home-feature-hero h1{color:#fff!important;text-shadow:0 2px 16px rgba(0,0,0,.5)!important}
html[data-mobile-theme=light] .apple-tv-home .home-feature-hero p,html[data-theme=light] .apple-tv-home .home-feature-hero p{color:rgba(255,255,255,.78)!important;text-shadow:0 1px 8px rgba(0,0,0,.55)}
html[data-mobile-theme=light] .apple-tv-home .home-feature-hero .hero-source-badge,html[data-theme=light] .apple-tv-home .home-feature-hero .hero-source-badge{color:#fff!important;background:rgba(255,255,255,.16)!important;border:1px solid rgba(255,255,255,.32)!important}
html[data-mobile-theme=light] .apple-tv-home .home-feature-hero .absolute.inset-x-0.top-0,html[data-theme=light] .apple-tv-home .home-feature-hero .absolute.inset-x-0.top-0{color:#fff!important}
html[data-mobile-theme=light] .apple-tv-home .home-feature-hero .absolute.inset-x-0.top-0 button,html[data-theme=light] .apple-tv-home .home-feature-hero .absolute.inset-x-0.top-0 button{background:rgba(255,255,255,.18)!important;border-color:rgba(255,255,255,.3)!important;color:#fff!important;box-shadow:0 4px 18px rgba(0,0,0,.16)!important}
html[data-mobile-theme=light] .apple-tv-home .home-feature-hero a[class*=bg-gradient-to-r],html[data-theme=light] .apple-tv-home .home-feature-hero a[class*=bg-gradient-to-r]{background:#fff!important;color:#17131f!important}
html[data-mobile-theme=light] .apple-tv-home section:has(> .container) h2,html[data-theme=light] .apple-tv-home section:has(> .container) h2{color:#211d2d!important;-webkit-text-fill-color:#211d2d!important}
html[data-mobile-theme=light] .apple-tv-home .topic-grid-chip,html[data-theme=light] .apple-tv-home .topic-grid-chip{background:linear-gradient(145deg,rgba(255,255,255,.96),rgba(239,235,251,.92))!important;border-color:rgba(128,104,183,.22)!important;color:#393052!important;box-shadow:none!important;border-radius:9999px!important}
html[data-mobile-theme=light] .apple-tv-home .topic-grid-title,html[data-theme=light] .apple-tv-home .topic-grid-title{color:#211d2d!important}
html[data-mobile-theme=light] .apple-tv-home .topic-grid-hint,html[data-theme=light] .apple-tv-home .topic-grid-hint{color:#6c5bb0!important}
html[data-mobile-theme=light] .apple-tv-home .movie-carousel-view-more,html[data-theme=light] .apple-tv-home .movie-carousel-view-more{color:#76649f!important}html[data-mobile-theme=light] .apple-tv-home .movie-carousel-poster .movie-poster-frame,html[data-theme=light] .apple-tv-home .movie-carousel-poster .movie-poster-frame{border-color:rgba(125,91,190,.2)!important;box-shadow:0 5px 16px rgba(79,63,122,.09)!important}`}</style>
      {data.hero.length > 0 ? <HeroSlider movies={data.hero.slice(0, 6)} /> : <HomeSkeletonHero />}

      <div className="flex flex-col gap-0 pb-16 relative z-30">
        <ContinueWatchingSection />
        <>
            <TopicGrid />

            {coreLoaded ? (
              <MovieCarousel
                title="Phim nổi bật"
                titleGradient="linear-gradient(235deg, #ffffff 20%, #a78bfa 125%)"
                layout="poster"
                items={transformMovies(data.latest)}
              />
            ) : <HomeSkeletonShelf />}

            <div ref={secondaryTriggerRef} className="h-px w-full" aria-hidden="true" />
            {shouldLoadSecondary && (!secondaryLoaded ? <HomeSecondarySkeleton /> : <div className="space-y-1 md:space-y-2">
              <MovieCarousel
                title="Điện ảnh Hàn Quốc"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #a78bfa 130%)"
                viewMoreLink="/quoc-gia/han-quoc"
                layout="poster"
                items={transformMovies(data.korean)}
              />

              <MovieCarousel
                title="Mọt phim Hoa Ngữ"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #f472b6 130%)"
                viewMoreLink="/quoc-gia/trung-quoc"
                layout="poster"
                items={transformMovies(data.chinese)}
              />

              <MovieCarousel
                title="Thiên đường Phim Thái"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #34d399 130%)"
                viewMoreLink="/quoc-gia/thai-lan"
                layout="poster"
                items={transformMovies(data.thai)}
              />

              <MovieCarousel
                title="Phim US-UK Mới"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #60a5fa 130%)"
                viewMoreLink="/quoc-gia/au-my"
                layout="poster"
                items={transformMovies(data.usuk)}
              />

              <MovieCarousel
                title="Phim Thuyết Minh Mới Nhất"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #fbbf24 130%)"
                viewMoreLink="/danh-sach/phim-thuyet-minh"
                layout="compact"
                items={transformMovies(data.dubbed.slice(0, 14))}
              />

              <MovieCarousel
                title="Phim Điện Ảnh Mới Coóng"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #fb923c 130%)"
                viewMoreLink="/danh-sach/phim-le"
                layout="poster"
                items={transformMovies(data.single)}
              />

              <MovieCarousel
                title="Dấu ấn điện ảnh Việt"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #ef4444 130%)"
                viewMoreLink="/quoc-gia/viet-nam"
                layout="poster"
                items={transformMovies(data.viet)}
              />

              <MovieCarousel
                title="Đêm Kinh Hoàng"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #a855f7 130%)"
                viewMoreLink="/the-loai/kinh-di"
                layout="poster"
                items={transformMovies(data.horror)}
              />

              <MovieCarousel
                title="Mê Cung Phim Nhật"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #f43f5e 130%)"
                viewMoreLink="/quoc-gia/nhat-ban"
                layout="poster"
                items={transformMovies(data.japanese)}
              />

              <MovieCarousel
                title="Phim Bộ Đã Hoàn Thành"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #22d3ee 130%)"
                viewMoreLink="/danh-sach/phim-bo"
                layout="poster"
                items={transformMovies(data.series)}
              />

              <MovieCarousel
                title="Hành Động Nghẹt Thở"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #f97316 130%)"
                viewMoreLink="/the-loai/hanh-dong"
                layout="compact"
                items={transformMovies(
                  uniqueMovies([...data.usuk, ...data.korean]).slice(0, 14),
                )}
              />

              <MovieCarousel
                title="Trinh Thám & Bí Ẩn"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #818cf8 130%)"
                viewMoreLink="/the-loai/hinh-su"
                layout="compact"
                items={transformMovies(
                  uniqueMovies([...data.korean, ...data.japanese]).slice(0, 14),
                )}
              />

              <MovieCarousel
                title="Tinh Hoa Điện Ảnh Hồng Kông"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #eab308 130%)"
                viewMoreLink="/quoc-gia/hong-kong"
                layout="poster"
                items={transformMovies(data.hongkong)}
              />

              <TrendingCarousel
                title="Top 10 phim lẻ hôm nay"
                items={transformMovies(
                  [...data.single]
                    .sort((a, b) => (b.view || 0) - (a.view || 0))
                    .slice(0, 10),
                )}
              />

              <MovieCarousel
                title="Thế giới Anime"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #38bdf8 130%)"
                viewMoreLink="/danh-sach/hoat-hinh"
                layout="poster"
                items={transformMovies(data.cartoon)}
              />

              <MovieCarousel
                title="Cổ Trang Trung Quốc"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #c084fc 130%)"
                viewMoreLink="/the-loai/co-trang"
                layout="poster"
                items={transformMovies(data.costume)}
              />

              <TrendingCarousel
                title="Top 10 phim bộ hôm nay"
                items={transformMovies(
                  [...data.series]
                    .sort((a, b) => (b.view || 0) - (a.view || 0))
                    .slice(0, 10),
                )}
              />

              <MovieCarousel
                title="Mãn Nhãn với Phim Chiếu Rạp"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #4ade80 130%)"
                viewMoreLink="/the-loai/chieu-rap"
                layout="ranked"
                items={transformMovies(data.cinema)}
              />

              <AdsBanner />
              <GhibliSection />
            </div>)}
          </>
      </div>
    </main>
  );
}
