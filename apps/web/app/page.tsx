"use client";

import { useEffect, useState } from "react";
import { HeroSlider } from "@/components/hero-slider";
import { MovieCarousel } from "@/components/movie-carousel";
import { TrendingCarousel } from "@/components/trending-carousel";
import { TopicGrid } from "@/components/topic-grid";
import { AdsBanner } from "@/components/ads-banner";
import { GhibliSection } from "@/components/ghibli-section";
import {
  getLatestMovies,
  getMoviesByType,
  getMoviesByCountry,
  getMoviesByCategory,
  type ListMovie,
} from "@/lib/ophim-client";

type HeroMovie = ListMovie & {
  backdrop_url?: string;
  hero_source?: "tmdb" | "netflix" | "latest";
};

export default function Home() {
  const [data, setData] = useState<{
    latest: ListMovie[];
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
          getMoviesByCountry("han-quoc", 1, true),
          getMoviesByCountry("trung-quoc", 1, true),
          getMoviesByCountry("au-my", 1, true),
          getMoviesByType("phim-bo", 1, true),
          getMoviesByType("phim-le", 1, true),
          getMoviesByType("hoat-hinh", 1, true),
          getMoviesByType("phim-sap-chieu", 1, true),
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
          korean: koreanRes?.items || [],
          chinese: chineseRes?.items || [],
          usuk: usukRes?.items || [],
          series: seriesRes?.items || [],
          single: singleRes?.items || [],
          cartoon: cartoonRes?.items || [],
          cinema:
            (cinemaRes?.items?.length
              ? cinemaRes.items
              : singleRes?.items) || [],
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
    <main className="min-h-screen bg-[#0b0d14] text-white font-sans overflow-x-hidden">
      <HeroSlider movies={data.hero.slice(0, 6)} />

      <div className="flex flex-col gap-0 pb-16 -mt-4 relative z-30">
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

            <div className="space-y-1 md:space-y-2">
              <MovieCarousel
                title="Điện ảnh Hàn Quốc"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #a78bfa 130%)"
                viewMoreLink="/quoc-gia/han-quoc"
                items={transformMovies(data.korean)}
              />

              <MovieCarousel
                title="Mọt phim Hoa Ngữ"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #f472b6 130%)"
                viewMoreLink="/quoc-gia/trung-quoc"
                items={transformMovies(data.chinese)}
              />

              <MovieCarousel
                title="Thiên đường Phim Thái"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #34d399 130%)"
                viewMoreLink="/quoc-gia/thai-lan"
                items={transformMovies(data.thai)}
              />

              <MovieCarousel
                title="Phim US-UK Mới"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #60a5fa 130%)"
                viewMoreLink="/quoc-gia/au-my"
                items={transformMovies(data.usuk)}
              />

              <MovieCarousel
                title="Phim Song Ngữ Mới Nhất"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #fbbf24 130%)"
                viewMoreLink="/danh-sach/phim-bo"
                items={transformMovies(
                  uniqueMovies([...data.series, ...data.single]).slice(0, 14),
                )}
              />

              <MovieCarousel
                title="Phim Điện Ảnh Mới Coóng"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #fb923c 130%)"
                viewMoreLink="/danh-sach/phim-le"
                items={transformMovies(data.single)}
              />

              <MovieCarousel
                title="Dấu ấn điện ảnh Việt"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #ef4444 130%)"
                viewMoreLink="/quoc-gia/viet-nam"
                items={transformMovies(data.viet)}
              />

              <MovieCarousel
                title="Đêm Kinh Hoàng"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #a855f7 130%)"
                viewMoreLink="/the-loai/kinh-di"
                items={transformMovies(data.horror)}
              />

              <MovieCarousel
                title="Mê Cung Phim Nhật"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #f43f5e 130%)"
                viewMoreLink="/quoc-gia/nhat-ban"
                items={transformMovies(data.japanese)}
              />

              <MovieCarousel
                title="Phim Bộ Đã Hoàn Thành"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #22d3ee 130%)"
                viewMoreLink="/danh-sach/phim-bo"
                items={transformMovies(data.series)}
              />

              <MovieCarousel
                title="Hành Động Nghẹt Thở"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #f97316 130%)"
                viewMoreLink="/the-loai/hanh-dong"
                items={transformMovies(
                  uniqueMovies([...data.usuk, ...data.korean]).slice(0, 14),
                )}
              />

              <MovieCarousel
                title="Trinh Thám & Bí Ẩn"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #818cf8 130%)"
                viewMoreLink="/the-loai/hinh-su"
                items={transformMovies(
                  uniqueMovies([...data.korean, ...data.japanese]).slice(0, 14),
                )}
              />

              <MovieCarousel
                title="Tinh Hoa Điện Ảnh Hồng Kông"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #eab308 130%)"
                viewMoreLink="/quoc-gia/hong-kong"
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
                items={transformMovies(data.cartoon)}
              />

              <MovieCarousel
                title="Cổ Trang Trung Quốc"
                titleGradient="linear-gradient(235deg, #ffffff 30%, #c084fc 130%)"
                viewMoreLink="/the-loai/co-trang"
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
