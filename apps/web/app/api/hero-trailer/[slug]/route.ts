import { NextResponse } from "next/server";

export const revalidate = 86400;

type MovieDetail = { movie?: { tmdb?: { id?: number | string; type?: "movie" | "tv" | string } } };
type TmdbVideos = { results?: Array<{ key?: string; site?: string; type?: string; official?: boolean }> };

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!slug || !/^[a-z0-9-]{1,180}$/i.test(slug)) return NextResponse.json({ trailerKey: null }, { status: 400 });
  const accessToken = process.env.TMDB_API_READ_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;
  if (!accessToken && !apiKey) return NextResponse.json({ trailerKey: null });

  try {
    const detailResponse = await fetch(`https://phimapi.com/phim/${encodeURIComponent(slug)}`, {
      headers: { Accept: "application/json" }, next: { revalidate },
    });
    if (!detailResponse.ok) return NextResponse.json({ trailerKey: null });
    const detail = await detailResponse.json() as MovieDetail;
    const tmdbId = String(detail.movie?.tmdb?.id ?? "").trim();
    const mediaType = detail.movie?.tmdb?.type === "tv" ? "tv" : "movie";
    if (!/^\d+$/.test(tmdbId)) return NextResponse.json({ trailerKey: null });

    const getVideos = async (language: string) => {
      const url = new URL(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}/videos`);
      url.searchParams.set("language", language);
      if (!accessToken && apiKey) url.searchParams.set("api_key", apiKey);
      const response = await fetch(url, {
        headers: { Accept: "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        next: { revalidate },
      });
      return response.ok ? await response.json() as TmdbVideos : null;
    };

    let videos = (await getVideos("vi-VN"))?.results || [];
    let trailers = videos.filter((v) => v.site === "YouTube" && v.type === "Trailer" && v.key);
    if (!trailers.length) {
      videos = (await getVideos("en-US"))?.results || [];
      trailers = videos.filter((v) => v.site === "YouTube" && v.type === "Trailer" && v.key);
    }
    const selected = trailers.find((v) => v.official) || trailers[0];
    const trailerKey = selected?.key && /^[\w-]{6,20}$/.test(selected.key) ? selected.key : null;
    return NextResponse.json({ trailerKey }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch {
    return NextResponse.json({ trailerKey: null }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  }
}
