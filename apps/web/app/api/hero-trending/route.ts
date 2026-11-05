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

function titleMatchScore(chartTitle: string, movie: ListMovie) {
  const sourceTitle = normalize(chartTitle);
  const catalogTitles = [movie.name, movie.origin_name]
    .filter(Boolean)
    .map(normalize)
    .filter(Boolean);

  const meaningfulTokens = (value: string) =>
    value.split(/\\s+/).filter((token) =>
      token.length > 2 && !["the", "and", "for", "with"].includes(token),
    );
  const sourceTokens = meaningfulTokens(sourceTitle);

  return Math.max(0, ...catalogTitles.map((catalogTitle) => {
    if (sourceTitle === catalogTitle) return 100;
    if (
      Math.min(sourceTitle.length, catalogTitle.length) >= 6 &&
      (sourceTitle.includes(catalogTitle) || catalogTitle.includes(sourceTitle))
    ) return 90;

    // Hỗ trợ tên quốc tế khác nhau, ví dụ Doctor X: Mafia in White
    // và Doctor X: Age of the White Mafia.
    const catalogTokens = meaningfulTokens(catalogTitle);
    const shared = sourceTokens.filter((token) => catalogTokens.includes(token));
    const smallerTokenCount = Math.min(sourceTokens.length, catalogTokens.length);
    return shared.length >= 2 && smallerTokenCount > 0 &&
      shared.length / smallerTokenCount >= 0.6
      ? 60 + shared.length
      : 0;
  }));
}

function getNetflixSearchTerms(title: string) {
  const cleanTitle = title
    .replace(/:\\s*(limited series|season \\d+|part \\d+)$/i, "")
    .trim();
  const terms = [cleanTitle];
  const baseTitle = cleanTitle.split(":")[0]?.trim();
  if (baseTitle && baseTitle !== cleanTitle) terms.push(baseTitle);
  if (/^doctor x$/i.test(baseTitle || cleanTitle)) {
    terms.unshift("Doctor X: Age of the White Mafia");
  }
  return [...new Set(terms.filter(Boolean))];
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

async function findCatalogMatches(
  titles: string[],
  limit: number,
  seen: Set<string>,
  tmdbType?: "movie" | "tv",
) {
  const selected: ListMovie[] = [];

  for (const title of titles) {
    if (selected.length >= limit) break;
    const searchTerms = getNetflixSearchTerms(title);
    let bestMatch: ListMovie | undefined;
    let bestScore = 0;

    for (const searchTerm of searchTerms) {
      try {
        const result = await searchMovies(searchTerm, 1, 10);
        for (const item of result.items) {
          if (seen.has(item.slug) || (tmdbType && item.tmdb?.type !== tmdbType)) continue;
          const score = titleMatchScore(title, item);
          if (score > bestScore) {
            bestMatch = item;
            bestScore = score;
          }
        }
        if (bestScore >= 90) break;
      } catch (error) {
        console.warn("Could not match hero title:", searchTerm, error);
      }
    }

    if (!bestMatch) continue;
    selected.push(bestMatch);
    seen.add(bestMatch.slug);
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

async function getNetflixVietnamTopTvShows() {
  const response = await fetch("https://www.netflix.com/tudum/top10/vietnam/tv", {
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
  const chartStartCandidates = [
    html.indexOf("Top 10 Shows in Vietnam"),
    html.indexOf("Top 10 TV Shows in Vietnam"),
  ].filter((index) => index >= 0);
  const chartStart = chartStartCandidates.length > 0
    ? Math.min(...chartStartCandidates)
    : -1;
  const chartEnd = chartStart >= 0
    ? html.indexOf("Top 10 Shows in Vietnam Overview", chartStart)
    : -1;
  const chartHtml = chartStart >= 0
    ? html.slice(chartStart, chartEnd > chartStart ? chartEnd : chartStart + 180000)
    : html;

  const titles: string[] = [];
  const seenTitles = new Set<string>();
  const imageAltPattern = /<img\b[^>]*\balt=(["'])(.*?)\1[^>]*>/gis;

  for (const match of chartHtml.matchAll(imageAltPattern)) {
    const title = decodeHtml(match[2] ?? "").trim();
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
    throw new Error("Could not read TV show titles from Netflix Vietnam Top 10");
  }

  return titles;
}

type HeroItem = ListMovie & { hero_source: "tmdb" | "netflix" | "latest" };

async function buildHeroItems(tmdbTitles: string[], netflixTvTitles: string[]) {
  const seen = new Set<string>();
  const tmdbMovies = await findCatalogMatches(tmdbTitles, 3, seen, "movie");
  const netflixTvShows = await findCatalogMatches(netflixTvTitles, 3, seen, "tv");

  const selected: HeroItem[] = [
    ...tmdbMovies.map((movie) => ({ ...movie, hero_source: "tmdb" as const })),
    ...netflixTvShows.map((movie) => ({ ...movie, hero_source: "netflix" as const })),
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
      getNetflixVietnamTopTvShows(),
    ]);

    const tmdbTitles = tmdbResult.status === "fulfilled" ? tmdbResult.value : [];
    const netflixTvTitles = netflixResult.status === "fulfilled" ? netflixResult.value : [];

    if (tmdbTitles.length === 0 && netflixTvTitles.length === 0) {
      throw new Error("TMDB and Netflix charts are both unavailable");
    }

    if (tmdbResult.status === "rejected") {
      console.warn("TMDB trending unavailable:", tmdbResult.reason);
    }
    if (netflixResult.status === "rejected") {
      console.warn("Netflix Vietnam TV Top 10 unavailable:", netflixResult.reason);
    }

    const items = await buildHeroItems(tmdbTitles, netflixTvTitles);

    return NextResponse.json(
      {
        items,
        source: "tmdb-movies-and-netflix-tv-vietnam",
        sources: {
          tmdb: "https://www.themoviedb.org/trending/movie/week",
          netflix: "https://www.netflix.com/tudum/top10/vietnam/tv",
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
