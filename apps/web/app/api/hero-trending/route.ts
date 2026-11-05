import { NextResponse } from "next/server";
import { getLatestMovies, searchMovies, type ListMovie } from "@/lib/ophim-client";

export const revalidate = 600;

const TRENDING_FEED = "https://trends.google.com/trending/rss?geo=VN";

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function getTrendingTerms(xml: string) {
  return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi))
    .map((match) => {
      const title = match[1].match(/<title>([\s\S]*?)<\/title>/i)?.[1];
      return title ? decodeXml(title) : "";
    })
    .filter(Boolean)
    .slice(0, 30);
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchesTrending(term: string, movie: ListMovie) {
  const query = normalize(term);
  const title = normalize(movie.name);
  const original = normalize(movie.origin_name || "");
  if (!query || !title) return false;
  if (title.length >= 4 && query.includes(title)) return true;
  if (query.length >= 4 && (title.includes(query) || original.includes(query))) {
    return true;
  }

  const words = query.split(/\s+/).filter((word) => word.length > 2);
  if (words.length === 0) return false;
  const movieText = `${title} ${original}`;
  const matched = words.filter((word) => movieText.includes(word)).length;
  return matched / words.length >= 0.75;
}

export async function GET() {
  try {
    const response = await fetch(TRENDING_FEED, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
      next: { revalidate: 600 },
    });

    if (!response.ok) throw new Error("Google Trends feed unavailable");

    const terms = getTrendingTerms(await response.text());
    const selected: ListMovie[] = [];
    const seen = new Set<string>();

    // Xử lý theo từng nhóm nhỏ để giữ thứ tự xếp hạng và tránh gọi API dồn dập.
    for (let index = 0; index < terms.length && selected.length < 6; index += 5) {
      const batch = terms.slice(index, index + 5);
      const results = await Promise.all(
        batch.map(async (term) => ({
          term,
          response: await searchMovies(term, 1, 10),
        })),
      );

      for (const result of results) {
        const match = result.response.items.find(
          (movie) =>
            matchesTrending(result.term, movie) &&
            !seen.has(movie.slug),
        );
        if (match) {
          selected.push(match);
          seen.add(match.slug);
        }
        if (selected.length === 6) break;
      }
    }

    // Nếu Google Trends không đủ phim, lấp chỗ trống bằng phim mới cập nhật.
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
      { items: selected.slice(0, 6), source: "google-trends-vn" },
      {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
        },
      },
    );
  } catch (error) {
    console.error("Failed to build Google Trends hero:", error);
    const fallback = await getLatestMovies(1);
    return NextResponse.json(
      { items: fallback.items.slice(0, 6), source: "latest-movies-fallback" },
      {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
        },
      },
    );
  }
}
