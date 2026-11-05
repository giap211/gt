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

async function findCatalogMatches(titles: string[], limit: number, seen: Set<string>) {
  const selected: ListMovie[] = [];

  for (const title of titles) {
    if (selected.length >= limit) break;
    const cleanTitle = title.trim();
    if (!cleanTitle) continue;

    try {
      const result = await searchMovies(cleanTitle, 1, 10);
      const movie = result.items.find(
        (item) => !seen.has(item.slug) && isSameMovie(cleanTitle, item),
      );
      if (!movie) continue;
      selected.push(movie);
      seen.add(movie.slug);
    } catch (error) {
      console.warn("Could not match hero title:", cleanTitle, error);
    }
  }

  return selected;
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function getNetflixVietnamTopMovies() {
  const response = await fetch("https://www.netflix.com/tudum/top10/vietnam/films", {
    headers: {
      Accept: "text/html",
      "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; RoPhim/1.0)",
    },
    next: { revalidate: 21600 },
  });

  if (!response.ok) {
    throw new Error(`Netflix Top 10 returned ${response.status}`);
  }

  const html = await response.text();
  const chartStart = html.indexOf("Top 10 Movies in Vietnam");
  const chartEnd = chartStart >= 0
    ? html.indexOf("Explore The Most Watched Movies", chartStart)
    : -1;
  const chartHtml = chartStart >= 0
    ? html.slice(chartStart, chartEnd > chartStart ? chartEnd : chartStart + 180000)
    : html;

  const titles: string[] = [];
  const seenTitles = new Set<string>();
  const imageAltPattern = /<img\b[^>]*\balt=(["'])(.*?)\1[^>]*>/gis;

  for (const match of chartHtml.matchAll(imageAltPattern)) {
    const title = decodeHtml(match[2]).trim();
    if (
      !title ||
      /^(image|logo|netflix|top 10)$/i.test(title) ||
      seenTitles.has(normalize(title))
    ) continue;

    seenTitles.add(normalize(title));
    titles.push(title);
    if (titles.length >= 10) break;
  }

  if (titles.length === 0) {
    throw new Error("Could not read movie titles from Netflix Vietnam Top 10");
  }

  return titles;
}

async function buildHeroItems(tmdbTitles: string[], netflixTitles: string[]) {
  const seen = new Set<string>();
  const tmdbMovies = await findCatalogMatches(tmdbTitles, 3, seen);
  const netflixMovies = await findCatalogMatches(netflixTitles, 3, seen);

  const selected = [
    ...tmdbMovies.map((movie) => ({ ...movie, hero_source: "tmdb" as const })),
    ...netflixMovies.map((movie) => ({ ...movie, hero_source: "netflix" as const })),
  ];

  // Chỉ dùng phim mới cập nhật khi hai bảng xếp hạng không đủ phim có trong kho.
  if (selected.length < 6) {
    const latest = await getLatestMovies(1);
    for (const movie of latest.items) {
      if (selected.length >= 6) break;
      if (seen.has(movie.slug)) continue;
      selected.push({ ...movie, hero_source: "latest" as const });
      seen.add(movie.slug);
    }
  }

  return selected.slice(0, 6);
}

export async function GET() {
  try {
    // Hai nguồn chạy độc lập: một nguồn lỗi không làm mất dữ liệu của nguồn còn lại.
    const [tmdbResult, netflixResult] = await Promise.allSettled([
      getTmdbWeeklyTrending(),
      getNetflixVietnamTopMovies(),
    ]);

    const tmdbTitles = tmdbResult.status === "fulfilled" ? tmdbResult.value : [];
    const netflixTitles = netflixResult.status === "fulfilled" ? netflixResult.value : [];

    if (tmdbTitles.length === 0 && netflixTitles.length === 0) {
      throw new Error("TMDB and Netflix charts are both unavailable");
    }

    if (tmdbResult.status === "rejected") {
      console.warn("TMDB trending unavailable:", tmdbResult.reason);
    }
    if (netflixResult.status === "rejected") {
      console.warn("Netflix Vietnam Top 10 unavailable:", netflixResult.reason);
    }

    const items = await buildHeroItems(tmdbTitles, netflixTitles);

    return NextResponse.json(
      {
        items,
        source: "tmdb-and-netflix-vietnam",
        sources: {
          tmdb: "https://www.themoviedb.org/trending/movie/week",
          netflix: "https://www.netflix.com/tudum/top10/vietnam/films",
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=43200",
        },
      },
    );
  } catch (error) {
    console.error("Failed to build mixed trending hero:", error);
    const fallback = await getLatestMovies(1);
    return NextResponse.json(
      {
        items: fallback.items.slice(0, 6).map((movie) => ({
          ...movie,
          hero_source: "latest" as const,
        })),
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
