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

      <div className="flex flex-col gap-0 pb-16 -mt-6 relative z-30">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-48 space-y-4">
            <div className="w-12 h-12 border-4 border-[#ffd875] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-white/40 animate-pulse text-sm font-medium tracking-wider uppercase">
              Đang đồng bộ dữ liệu...
            </p>
          </div>
        ) : (
          <>
            <TopicGrid />

            <div className="container mx-auto space-y-2 md:space-y-6">
              {/* Điện ảnh Hàn Quốc */}
              <MovieCarousel
                title="Điện ảnh Hàn Quốc"
                viewMoreLink="/quoc-gia/han-quoc"
                items={transformMovies(data.korean)}
              />

              {/* Một phim Hoa Ngữ */}
              <MovieCarousel
                title="Một phim Hoa Ngữ"
                viewMoreLink="/quoc-gia/trung-quoc"
                items={transformMovies(data.chinese)}
              />

              {/* Thiên đường Phim Thái */}
              <MovieCarousel
                title="Thiên đường Phim Thái"
                viewMoreLink="/quoc-gia/thai-lan"
                items={transformMovies(data.thai)}
              />

              {/* Phim US-UK Mới */}
              <MovieCarousel
                title="Phim US-UK Mới"
                viewMoreLink="/quoc-gia/au-my"
                items={transformMovies(data.usuk)}
              />

              {/* Phim Song Ngữ Mới Nhất */}
              <MovieCarousel
                title="Phim Song Ngữ Mới Nhất"
                viewMoreLink="/danh-sach/phim-bo"
                items={transformMovies(
                  uniqueMovies([...data.series, ...data.single]).slice(0, 12),
                )}
              />

              {/* Phim Điện Ảnh Mới Coóng */}
              <MovieCarousel
                title="Phim Điện Ảnh Mới Coóng"
                viewMoreLink="/danh-sach/phim-le"
                items={transformMovies(data.single)}
              />

              {/* Dấu ấn điện ảnh Việt */}
              <MovieCarousel
                title="Dấu ấn điện ảnh Việt"
                viewMoreLink="/quoc-gia/viet-nam"
                items={transformMovies(data.viet)}
              />

              {/* Đêm Kinh Hoàng */}
              <MovieCarousel
                title="Đêm Kinh Hoàng"
                viewMoreLink="/the-loai/kinh-di"
                items={transformMovies(data.horror)}
              />

              {/* Mê Cung Phim Nhật */}
              <MovieCarousel
                title="Mê Cung Phim Nhật"
                viewMoreLink="/quoc-gia/nhat-ban"
                items={transformMovies(data.japanese)}
              />

              {/* Phim Bộ Đã Hoàn Thành */}
              <MovieCarousel
                title="Phim Bộ Đã Hoàn Thành"
                viewMoreLink="/danh-sach/phim-bo"
                items={transformMovies(data.series)}
              />

              {/* Hành Động Nghẹt Thở */}
              <MovieCarousel
                title="Hành Động Nghẹt Thở"
                viewMoreLink="/the-loai/hanh-dong"
                items={transformMovies(
                  uniqueMovies([...data.usuk, ...data.korean]).slice(0, 12),
                )}
              />

              {/* Trinh Thám & Bí Ẩn */}
              <MovieCarousel
                title="Trinh Thám & Bí Ẩn"
                viewMoreLink="/the-loai/hinh-su"
                items={transformMovies(
                  uniqueMovies([...data.korean, ...data.japanese]).slice(0, 12),
                )}
              />

              {/* Tinh Hoa Điện Ảnh Hồng Kông */}
              <MovieCarousel
                title="Tinh Hoa Điện Ảnh Hồng Kông"
                viewMoreLink="/quoc-gia/hong-kong"
                items={transformMovies(data.hongkong)}
              />

              {/* Top 10 phim lẻ hôm nay */}
              <TrendingCarousel
                title="Top 10 phim lẻ hôm nay"
                items={transformMovies(
                  [...data.single]
                    .sort((a, b) => (b.view || 0) - (a.view || 0))
                    .slice(0, 10),
                )}
              />

              {/* Thế giới Anime */}
              <div className="py-4">
                <MovieCarousel
                  title="Thế giới Anime"
                  viewMoreLink="/danh-sach/hoat-hinh"
                  items={transformMovies(data.cartoon)}
                />
              </div>

              {/* Cổ Trang Trung Quốc */}
              <MovieCarousel
                title="Cổ Trang Trung Quốc"
                viewMoreLink="/the-loai/co-trang"
                items={transformMovies(data.costume)}
              />

              {/* Top 10 phim bộ hôm nay */}
              <TrendingCarousel
                title="Top 10 phim bộ hôm nay"
                items={transformMovies(
                  [...data.series]
                    .sort((a, b) => (b.view || 0) - (a.view || 0))
                    .slice(0, 10),
                )}
              />

              {/* Mãn Nhãn với Phim Chiếu Rạp */}
              <MovieCarousel
                title="Mãn Nhãn với Phim Chiếu Rạp"
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
