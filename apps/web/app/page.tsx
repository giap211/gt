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
              return {
                slug: movie.slug,
                backdrop_url: undefined,
              };
            }

            const result = (await response.json()) as {
              backdropUrl?: string | null;
            };

            return {
              slug: movie.slug,
              backdrop_url: result.backdropUrl || undefined,
            };
          } catch {
            return {
              slug: movie.slug,
              backdrop_url: undefined,
            };
          }
        }),
      );

      if (cancelled) return;

      const backdropBySlug = new Map(
        results.map((item) => [
          item.slug,
          item.backdrop_url,
        ]),
      );

      setData((current) => ({
        ...current,
        hero: current.hero.map((movie) => ({
          ...movie,
          backdrop_url:
            backdropBySlug.get(movie.slug) ||
            movie.backdrop_url,
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
        ]);

        const curatedHero = (
          latestRes?.items || []
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
          hero: curatedHero,
        });

        // Tải ảnh TMDB sau khi danh sách phim đã hiển thị.
        void fetchHeroBackdrops(curatedHero);
      } catch (error) {
        console.error("Failed to fetch movies", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
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
        (movies || []).map((movie) => [
          movie._id || movie.slug,
          movie,
        ]),
      ),
    ).map(([, movie]) => movie);
  };

  const transformMovies = (movies: ListMovie[]) => {
    return uniqueMovies(movies).map((m) => ({
      id: m._id,
      title: m.name,
      originalTitle: m.origin_name,
      posterUrl: m.poster_url,
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
    <main className="min-h-screen bg-black text-white font-sans overflow-x-hidden">
      <HeroSlider movies={data.hero.slice(0, 6)} />

      <div className="flex flex-col gap-0 pb-20 -mt-8 relative z-30">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-48 space-y-4">
            <div className="w-12 h-12 border-4 border-[#ffd875] border-t-transparent rounded-full animate-spin"></div>

            <p className="text-white/40 animate-pulse text-sm font-medium tracking-wider uppercase">
              Đang đồng bộ dữ liệu...
            </p>
          </div>
        ) : (
          <>
            <div className="mb-0">
              <TopicGrid />
            </div>

            <div className="container mx-auto space-y-4 md:space-y-8">
              <MovieCarousel
                title="Phim Hàn Quốc mới"
                icon="🇰🇷"
                viewMoreLink="/quoc-gia/han-quoc"
                items={transformMovies(data.korean)}
              />

              <MovieCarousel
                title="Phim Trung Quốc mới"
                icon="🇨🇳"
                viewMoreLink="/quoc-gia/trung-quoc"
                items={transformMovies(data.chinese)}
              />

              <MovieCarousel
                title="Phim US-UK mới"
                icon="🇺🇸"
                viewMoreLink="/quoc-gia/au-my"
                items={transformMovies(data.usuk)}
              />

              <TrendingCarousel
                title="Đây Rồi Top Phim Xem Nhiều Nhất"
                items={transformMovies(
                  uniqueMovies([
                    ...data.latest,
                    ...data.series,
                    ...data.single,
                  ])
                    .sort((a, b) => b.view - a.view)
                    .slice(0, 10),
                )}
              />

              <MovieCarousel
                title="Phim Điện Ảnh Mới Coóng"
                icon="🚀"
                viewMoreLink="/danh-sach/phim-le"
                items={transformMovies(data.single)}
              />

              <TrendingCarousel
                title="Top 10 phim bộ hôm nay"
                items={transformMovies(
                  [...data.series]
                    .sort((a, b) => b.view - a.view)
                    .slice(0, 10),
                )}
              />

              <MovieCarousel
                title="Mãn Nhãn Với Phim Chiếu Rạp"
                icon="🍿"
                viewMoreLink="/the-loai/chieu-rap"
                items={transformMovies(data.cinema)}
              />

              <AdsBanner />

              <TrendingCarousel
                title="Top 10 phim lẻ hôm nay"
                items={transformMovies(
                  [...data.single]
                    .sort((a, b) => b.view - a.view)
                    .slice(0, 10),
                )}
              />

              <MovieCarousel
                title="Phim Nhật Mới Oanh Tạc Chốn Này"
                icon="🍣"
                viewMoreLink="/quoc-gia/nhat-ban"
                items={transformMovies(data.japanese)}
              />

              <MovieCarousel
                title="Phim Thái Now: Không drama đời không nể"
                icon="🐘"
                viewMoreLink="/quoc-gia/thai-lan"
                items={transformMovies(data.thai)}
              />

              <div className="py-10">
                <MovieCarousel
                  title="Kho Tàng Anime Mới Nhất"
                  icon="⚡"
                  viewMoreLink="/danh-sach/hoat-hinh"
                  items={transformMovies(data.cartoon)}
                />
              </div>

              <MovieCarousel
                title="Điện Ảnh Hồng Kông Ở Chỗ Này Nầy"
                icon="🐲"
                viewMoreLink="/quoc-gia/hong-kong"
                items={transformMovies(data.hongkong)}
              />

              <MovieCarousel
                title="Phim Cổ Trang Hay"
                icon="⚔️"
                viewMoreLink="/the-loai/co-trang"
                items={transformMovies(data.costume)}
              />

              <MovieCarousel
                title="Yêu Kiểu Hàn"
                icon="💖"
                viewMoreLink="/the-loai/tinh-cam"
                items={transformMovies(data.romance)}
              />

              <GhibliSection />
            </div>
          </>
        )}
      </div>
    </main>
  );
}