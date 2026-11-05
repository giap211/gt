import { NextResponse } from "next/server";
import { getLatestMovies, searchMovies, type ListMovie } from "@/lib/ophim-client";

export const revalidate = 1800;

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_TRENDING_URL = `${TMDB_BASE_URL}/trending/movie/week`;

type TmdbTrendingResponse = {
  results?: Array<{
    title?: string;
    original_title?: string;
  }>;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isSameMovie(chartTitle: string, movie: ListMovie) {
  const sourceTitle = normalize(chartTitle);
  const catalogTitles = [movie.name, movie.origin_name]
    .filter(Boolean)
    .map(normalize)
    .filter(Boolean);

  return catalogTitles.some((catalogTitle) => {
    if (sourceTitle === catalogTitle) return true;
    return (
      Math.min(sourceTitle.length, catalogTitle.length) >= 6 &&
      (sourceTitle.includes(catalogTitle) ||
        catalogTitle.includes(sourceTitle))
    );
  });
}

async function getTmdbWeeklyTrending() {
  const accessToken = process.env.TMDB_API_READ_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;

  if (!accessToken && !apiKey) {
    throw new Error("TMDB credentials are not configured");
  }

  const url = new URL(TMDB_TRENDING_URL);
  url.searchParams.set("language", "vi-VN");
  if (!accessToken && apiKey) {
    url.searchParams.set("api_key", apiKey);
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    throw new Error(`TMDB trending returned ${response.status}`);
  }

  const data = (await response.json()) as TmdbTrendingResponse;
  const results = Array.isArray(data.results) ? data.results : [];
  const titles = results.flatMap((item) =>
    [item.title, item.original_title]
      .filter((title): title is string => typeof title === "string" && title.trim().length > 0),
  );

  if (titles.length === 0) {
    throw new Error("TMDB returned no trending movie titles");
  }

  return titles;
}

async function buildHeroItems(titles: string[]) {
  const selected: ListMovie[] = [];
  const seen = new Set<string>();

  // Giữ thứ tự trending của TMDB và chỉ lấy phim có trong kho OPhim.
  for (const title of titles) {
    if (selected.length >= 6) break;

    const result = await searchMovies(title, 1, 10);
    const movie = result.items.find(
      (item) => !seen.has(item.slug) && isSameMovie(title, item),
    );

    if (!movie) continue;
    selected.push(movie);
    seen.add(movie.slug);
  }

  // Nếu TMDB có ít phim trùng kho OPhim, bổ sung phim mới cập nhật.
  if (selected.length < 6) {
    const latest = await getLatestMovies(1);
    for (const movie of latest.items) {
      if (selected.length >= 6) break;
      if (seen.has(movie.slug)) continue;
      selected.push(movie);
      seen.add(movie.slug);
    }
  }

  return selected.slice(0, 6);
}

export async function GET() {
  try {
    const chartTitles = await getTmdbWeeklyTrending();
    const items = await buildHeroItems(chartTitles);

    return NextResponse.json(
      {
        items,
        source: "tmdb-weekly-trending",
        chartUrl: "https://www.themoviedb.org/trending/movie/week",
      },
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
      {
        items: fallback.items.slice(0, 6),
        source: "latest-movies-fallback",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
        },
      },
    );
  }
}
