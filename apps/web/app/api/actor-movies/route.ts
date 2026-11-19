import { NextResponse } from "next/server";

export const revalidate = 86400;

type PersonSearch = { results?: Array<{ id: number; name: string; profile_path?: string | null }> };
type Credits = {
  cast?: Array<{
    id?: number;
    title?: string;
    original_title?: string;
    name?: string;
    original_name?: string;
    release_date?: string;
    first_air_date?: string;
    poster_path?: string | null;
    media_type?: string;
    popularity?: number;
  }>;
};

const normalize = (value: string) => value.normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = (searchParams.get("name") || "").trim().slice(0, 100);
  if (!name) return NextResponse.json({ person: null, credits: [] }, { status: 400 });

  const accessToken = process.env.TMDB_API_READ_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;
  if (!accessToken && !apiKey) return NextResponse.json({ person: null, credits: [] }, { status: 503 });

  const headers = {
    Accept: "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
  const makeUrl = (path: string) => {
    const url = new URL(`https://api.themoviedb.org/3/${path}`);
    url.searchParams.set("language", "en-US");
    if (!accessToken && apiKey) url.searchParams.set("api_key", apiKey);
    return url;
  };

  try {
    const searchUrl = makeUrl("search/person");
    searchUrl.searchParams.set("query", name);
    searchUrl.searchParams.set("include_adult", "false");
    const searchResponse = await fetch(searchUrl, { headers, next: { revalidate } });
    if (!searchResponse.ok) return NextResponse.json({ person: null, credits: [] }, { status: 502 });
    const searchData = await searchResponse.json() as PersonSearch;
    const wanted = normalize(name);
    const person = (searchData.results || []).find(item => normalize(item.name) === wanted)
      || (searchData.results || [])[0];
    if (!person?.id) return NextResponse.json({ person: null, credits: [] });

    const creditsResponse = await fetch(makeUrl(`person/${person.id}/combined_credits`), {
      headers, next: { revalidate },
    });
    if (!creditsResponse.ok) return NextResponse.json({ person, credits: [] }, { status: 502 });
    const creditsData = await creditsResponse.json() as Credits;
    const credits = (creditsData.cast || [])
      .filter(item => (item.title || item.name) && (item.media_type === "movie" || item.media_type === "tv"))
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 40)
      .map(item => ({
        tmdbId: item.id || 0,
        title: item.title || item.name || "",
        originalTitle: item.original_title || item.original_name || "",
        year: (item.release_date || item.first_air_date || "").slice(0, 4),
        mediaType: item.media_type || "movie",
      }));

    return NextResponse.json(
      { person: { id: person.id, name: person.name, profileUrl: person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : null }, credits },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
    );
  } catch {
    return NextResponse.json({ person: null, credits: [] }, { status: 502 });
  }
}
