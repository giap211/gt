import { NextResponse } from "next/server";

export const revalidate = 86400;

type TmdbCreditsResponse = {
  cast?: Array<{
    name?: string;
    profile_path?: string | null;
  }>;
};

const normalizeName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      tmdbId?: unknown;
      tmdbType?: unknown;
      names?: unknown;
    };

    const tmdbId = String(body.tmdbId ?? "").trim();
    const tmdbType = body.tmdbType === "tv" ? "tv" : "movie";
    const names = Array.isArray(body.names)
      ? body.names
          .filter((name): name is string => typeof name === "string")
          .map((name) => name.trim())
          .filter((name) => name.length > 0 && name.length <= 100)
          .slice(0, 18)
      : [];

    if (!/^\d+$/.test(tmdbId) || names.length === 0) {
      return NextResponse.json({ images: {} });
    }

    const accessToken = process.env.TMDB_API_READ_ACCESS_TOKEN;
    const apiKey = process.env.TMDB_API_KEY;

    if (!accessToken && !apiKey) {
      return NextResponse.json(
        { images: {}, error: "TMDB credentials are not configured." },
        { status: 503 },
      );
    }

    const url = new URL(
      `https://api.themoviedb.org/3/${tmdbType}/${tmdbId}/credits`,
    );
    url.searchParams.set("language", "en-US");
    if (!accessToken && apiKey) url.searchParams.set("api_key", apiKey);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      next: { revalidate },
    });

    if (!response.ok) {
      return NextResponse.json({ images: {} }, { status: 502 });
    }

    const data = (await response.json()) as TmdbCreditsResponse;
    const cast = data.cast || [];
    const images: Record<string, string> = {};

    for (const name of names) {
      const target = normalizeName(name);
      const person = cast.find(
        (item) =>
          item.name &&
          normalizeName(item.name) === target &&
          item.profile_path,
      );

      if (person?.profile_path) {
        images[name] = `https://image.tmdb.org/t/p/w185${person.profile_path}`;
      }
    }

    return NextResponse.json(
      { images },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch {
    return NextResponse.json({ images: {} }, { status: 400 });
  }
}
