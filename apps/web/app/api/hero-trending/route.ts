import { NextResponse } from "next/server";
import { getLatestMovies, searchMovies, type ListMovie } from "@/lib/ophim-client";

export const revalidate = 1800;

const JUSTWATCH_CHART_URL =
  "https://www.justwatch.com/us/streaming-charts?c=global&ct=monthly";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([\da-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 16)),
    );
}

function getChartTitles(html: string) {
  const titles: string[] = [];
  const seen = new Set<string>();
  const linkPattern =
    /<a\b[^>]*href="\/[^"]*\/movie\/[^"]+"[^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(linkPattern)) {
    const title = decodeHtml(
      match[1]
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    );
    const key = normalize(title);

    if (!title || !key || seen.has(key)) continue;
    if (title.length > 100) continue;

    seen.add(key);
    titles.push(title);
  }

  return titles;
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

async function getJustWatchGlobalMonthly() {
  const response = await fetch(JUSTWATCH_CHART_URL, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "Mozilla/5.0 (compatible; GiapTranMovieChart/1.0)",
    },
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    throw new Error(`JustWatch chart returned ${response.status}`);
  }

  const html = await response.text();
  const titles = getChartTitles(html);

  if (titles.length === 0) {
    throw new Error("Could not parse movie titles from JustWatch chart");
  }

  return titles;
}

export async function GET() {
  try {
    const chartTitles = await getJustWatchGlobalMonthly();
    const selected: ListMovie[] = [];
    const seen = new Set<string>();

    // Giữ thứ tự xếp hạng của JustWatch; chỉ lấy phim có trong kho OPhim.
    for (const title of chartTitles) {
      if (selected.length >= 6) break;

      const result = await searchMovies(title, 1, 10);
      const movie = result.items.find(
        (item) =>
          !seen.has(item.slug) && isSameMovie(title, item),
      );

      if (!movie) continue;
      selected.push(movie);
      seen.add(movie.slug);
    }

    // Nếu chart không có đủ phim thuộc kho OPhim, bổ sung phim mới cập nhật.
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
      {
        items: selected.slice(0, 6),
        source: "justwatch-global-monthly",
        chartUrl: JUSTWATCH_CHART_URL,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    console.error("Failed to build JustWatch trending hero:", error);
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
