import { NextResponse } from "next/server";
import { getLatestMovies, searchMovies, type ListMovie } from "@/lib/ophim-client";

export const revalidate = 1800;

type TmdbTrendingMovie = {
  id: number;
  title?: string;
  original_title?: string;
};

type TmdbTrendingResponse = {
  results?: TmdbTrendingMovie[];
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isSameMovie(trending: TmdbTrendingMovie, movie: ListMovie) {
  const tmdbTitles = [trending.title, trending.original_title]
    .filter((value): value is string => Boolean(value))
    .map(normalize)
    .filter(Boolean);
  const catalogTitles = [movie.name, movie.origin_name]
    .filter(Boolean)
    .map(normalize)
    .filter(Boolean);

  return tmdbTitles.some((tmdbTitle) =>
    catalogTitles.some((catalogTitle) => {
      if (tmdbTitle === catalogTitle) return true;
      return (
        Math.min(tmdbTitle.length, catalogTitle.length) >= 6 &&
        (tmdbTitle.includes(catalogTitle) ||
          catalogTitle.includes(tmdbTitle))
      );
    }),
  );
}

async function getTmdbTrending() {
  const accessToken = process.env.TMDB_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;

  if (!accessToken && !apiKey) {
    throw new Error(
      "Missing TMDB_ACCESS_TOKEN or TMDB_API_KEY environment variable",
    );
  }

  const pages = await Promise.all(
    [1, 2, 3].map(async (page) => {
      const url = new URL(
        "https://api.themoviedb.org/3/trending/movie/week",
      );
      url.searchParams.set("language", "vi-VN");
      url.searchParams.set("page", String(page));
      if (!accessToken && apiKey) {
        url.searchParams.set("api_key", apiKey);
      }

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          ...(accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {}),
        },
        next: { revalidate: 1800 },
      });

      if (!response.ok) {
        throw new Error(`TMDB trending returned ${response.status}`);
      }

      return (await response.json()) as TmdbTrendingResponse;
    }),
  );

  return pages.flatMap((page) =>
    Array.isArray(page.results) ? page.results : [],
  );
}

export async function GET() {
  try {
    const trendingMovies = await getTmdbTrending();
    const selected: ListMovie[] = [];
    const seen = new Set<string>();

    // Duyệt theo đúng thứ hạng TMDB; chỉ giữ phim có tên khớp trong kho RoPhim.
    for (
      let index = 0;
      index < trendingMovies.length && selected.length < 6;
      index += 5
    ) {
      const batch = trendingMovies.slice(index, index + 5);
      const matches = await Promise.all(
        batch.map(async (trending) => {
          const titles = [
            trending.title,
            trending.original_title,
          ].filter((title): title is string => Boolean(title));

          for (const title of Array.from(new Set(titles))) {
            const result = await searchMovies(title, 1, 10);
            const movie = result.items.find(
              (item) =>
                !seen.has(item.slug) && isSameMovie(trending, item),
            );
            if (movie) return movie;
          }

          return null;
        }),
      );

      for (const movie of matches) {
        if (!movie || seen.has(movie.slug)) continue;
        selected.push(movie);
        seen.add(movie.slug);
        if (selected.length === 6) break;
      }
    }

    // Nếu kho RoPhim không có đủ phim đang trending, bổ sung phim mới cập nhật.
    if (selected.length < 6) {
      const latest = await getLatestMovies(1);
      for (const movie of latest.items) {
        if (selected.length >= 6) break;
        if (seen.has(movie.slug)) continue;
        selected.push(movie);
        seen.add(movie.slug);
      }
    }

    return NextResponse.json(
      { items: selected.slice(0, 6), source: "tmdb-trending-week" },
      {
        headers: {
          "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    console.error("Failed to build TMDB trending hero:", error);
    const fallback = await getLatestMovies(1);
    return NextResponse.json(
      { items: fallback.items.slice(0, 6), source: "latest-movies-fallback" },
      {
        headers: {
          "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
        },
      },
    );
  }
}
