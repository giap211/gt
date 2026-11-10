"use client";

import { useEffect, useState } from "react";
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
  getMoviesByCountry,
  getMoviesByCategory,
  type ListMovie,
} from "@/lib/ophim-client";

type HeroMovie = ListMovie & {
  backdrop_url?: string;
  hero_source?: "tmdb" | "netflix" | "latest";
};

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

  const [loading, setLoading] = useState(true);

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
      try {
        const [
          latestRes,
          dubbedRes,
          koreanRes,
          chineseRes,
          usukRes,
          seriesRes,
          singleRes,
          cartoonRes,
          cinemaRes,
          japaneseRes,
          thaiRes,
          hongkongRes,
          costumeRes,
          horrorRes,
          romanceRes,
          vietRes,
        ] = await Promise.all([
          getLatestMovies(1),
          getMoviesByLanguage("thuyet-minh", 1),
          getMoviesByCountry("han-quoc", 1, true),
          getMoviesByCountry("trung-quoc", 1, true),
          getMoviesByCountry("au-my", 1, true),
          getMoviesByType("phim-bo", 1, true),
          getMoviesByType("phim-le", 1, true),
          getMoviesByType("hoat-hinh", 1, true),
          // Dùng category chieu-rap (map sang phim-le) thay vì phim-sap-chieu
          // để chỉ hiện phim chiếu rạp đã có nguồn xem.
          getMoviesByCategory("chieu-rap", 1, true),
          getMoviesByCountry("nhat-ban", 1, true),
          getMoviesByCountry("thai-lan", 1, true),
          getMoviesByCountry("hong-kong", 1, true),
          getMoviesByCategory("co-trang", 1, true),
          getMoviesByCategory("kinh-di", 1, true),
          getMoviesByCategory("tinh-cam", 1, true),
          getMoviesByCountry("viet-nam", 1, true),
        ]);

        let trendingHero: HeroMovie[] = [];
        try {
          const heroResponse = await fetch("/api/hero-trending");
          if (heroResponse.ok) {
            const heroPayload = (await heroResponse.json()) as {
              items?: HeroMovie[];
            };
            trendingHero = Array.isArray(heroPayload.items)
              ? heroPayload.items
              : [];
          }
        } catch (error) {
          console.error("Failed to fetch trending hero movies", error);
        }

        const curatedHero = (
          trendingHero.length ? trendingHero : latestRes?.items || []
        ).slice(0, 6);

        if (cancelled) return;

        setData({
          latest: latestRes?.items || [],
          dubbed: dubbedRes?.items || [],
          korean: koreanRes?.items || [],
          chinese: chineseRes?.items || [],
          usuk: usukRes?.items || [],
          series: seriesRes?.items || [],
          single: singleRes?.items || [],
          cartoon: cartoonRes?.items || [],
          cinema: cinemaRes?.items || singleRes?.items || [],
          japanese: japaneseRes?.items || [],
          thai: thaiRes?.items || [],
          hongkong: hongkongRes?.items || [],
          costume: costumeRes?.items || [],
          horror: horrorRes?.items || [],
          romance: romanceRes?.items || [],
          viet: vietRes?.items || [],
          hero: curatedHero,
        });

        void fetchHeroBackdrops(curatedHero);
      } catch (error) {
        console.error("Failed to fetch movies", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

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
.apple-tv-home .movie-carousel-view-more{color:rgba(255,255,255,.58);padding:4px 0;font-size:11px}
.apple-tv-home .movie-carousel-view-more-icon{width:20px;height:20px;background:rgba(255,255,255,.1)}
.apple-tv-home section:has(> .container){padding-top:16px;padding-bottom:16px}
.apple-tv-home section:has(> .container) h2{color:#f5f5f7!important;background:none!important;-webkit-text-fill-color:#f5f5f7!important;font-size:19px;font-weight:700;letter-spacing:-.035em}
.apple-tv-home .topic-grid-section{padding-top:8px!important;padding-bottom:14px!important}
.apple-tv-home .topic-grid-chip{background:rgba(255,255,255,.075)!important;border:1px solid rgba(255,255,255,.09)!important;color:rgba(255,255,255,.82)!important;border-radius:9px!important}
.apple-tv-home .topic-grid-icon{filter:saturate(.55)}
.apple-tv-home .topic-grid-title{color:#f5f5f7!important;font-size:18px!important;letter-spacing:-.035em}
.apple-tv-home .topic-grid-hint{color:rgba(255,255,255,.42)!important}
@media(max-width:480px){.apple-tv-home .home-feature-hero{height:min(66svh,610px)!important;min-height:520px}.apple-tv-home .home-feature-hero .relative.z-20{justify-content:flex-end!important;padding-bottom:76px!important;padding-top:90px!important}.apple-tv-home .home-feature-hero .relative.z-20>div{max-width:100%!important}.apple-tv-home .home-feature-hero .relative.z-20 p{max-width:310px}.apple-tv-home section:has(> .container){padding-top:14px;padding-bottom:14px}}
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
html[data-mobile-theme=light] .apple-tv-home .topic-grid-chip,html[data-theme=light] .apple-tv-home .topic-grid-chip{background:linear-gradient(145deg,rgba(255,255,255,.96),rgba(239,235,251,.92))!important;border-color:rgba(128,104,183,.22)!important;color:#393052!important;box-shadow:0 5px 16px rgba(79,63,122,.07)!important}
html[data-mobile-theme=light] .apple-tv-home .topic-grid-title,html[data-theme=light] .apple-tv-home .topic-grid-title{color:#211d2d!important}
html[data-mobile-theme=light] .apple-tv-home .topic-grid-hint,html[data-theme=light] .apple-tv-home .topic-grid-hint{color:#6c5bb0!important}
html[data-mobile-theme=light] .apple-tv-home .movie-carousel-view-more,html[data-theme=light] .apple-tv-home .movie-carousel-view-more{color:#70649a!important}`}</style>
      <HeroSlider movies={data.hero.slice(0, 6)} />

      <div className="flex flex-col gap-0 pb-16 relative z-30">
        <ContinueWatchingSection />
        {loading ? (
          <div className="flex flex-col items-center justify-center py-48 space-y-4">
            <div className="w-12 h-12 border-4 border-[#ffd875] border-t-transparent rounded-full animate-spin" />
            <p className="text-white/40 animate-pulse text-sm font-medium tracking-wider uppercase">
              Đang đồng bộ dữ liệu...
            </p>
          </div>
        ) : (
          <>
            <TopicGrid />

            <MovieCarousel
              title="Phim nổi bật"
              titleGradient="linear-gradient(235deg, #ffffff 20%, #a78bfa 125%)"
              layout="poster"
              items={transformMovies(data.latest)}
            />

            <div className="space-y-1 md:space-y-2">
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
            </div>
          </>
        )}
      </div>
    </main>
  );
}
