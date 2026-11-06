import { NextResponse } from "next/server";

export const revalidate = 3600;

type TmdbExternalIds = {
  imdb_id?: string | null;
};

type SkipDbSegment = {
  start_ms?: number | null;
  end_ms?: number | null;
  start_sec?: number | null;
  end_sec?: number | null;
  confidence?: number;
  match?: string;
};

type SkipDbResponse = {
  segments?: {
    intro?: SkipDbSegment | null;
  };
};

function emptyResult(reason: string, upstreamStatus?: number) {
  return NextResponse.json({
    startSeconds: null,
    endSeconds: null,
    reason,
    ...(typeof upstreamStatus === "number" ? { upstreamStatus } : {}),
  });
}

async function resolveImdbId(tmdbId: string, type: "tv" | "movie") {
  const accessToken = process.env.TMDB_API_READ_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;

  if (!accessToken && !apiKey) return null;

  const url = new URL(
    `https://api.themoviedb.org/3/${type}/${encodeURIComponent(tmdbId)}/external_ids`,
  );
  if (!accessToken && apiKey) url.searchParams.set("api_key", apiKey);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    next: { revalidate: 86400 },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as TmdbExternalIds;
  return typeof data.imdb_id === "string" && /^tt\d+$/.test(data.imdb_id)
    ? data.imdb_id
    : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tmdbId = (searchParams.get("tmdbId") || "").trim();
  const type = searchParams.get("type") === "tv" ? "tv" : "movie";
  const season = Number(searchParams.get("season") || 1);
  const episode = Number(searchParams.get("episode") || 0);

  if (
    !/^\d+$/.test(tmdbId) ||
    (type === "tv" &&
      (!Number.isInteger(season) ||
        season < 1 ||
        !Number.isInteger(episode) ||
        episode < 1))
  ) {
    return NextResponse.json(
      { startSeconds: null, endSeconds: null, reason: "invalid-parameters" },
      { status: 400 },
    );
  }

  try {
    // SkipDB is keyed by IMDb ID, so resolve it from the existing TMDB ID.
    const imdbId = await resolveImdbId(tmdbId, type);
    if (!imdbId) return emptyResult("imdb-id-not-found");

    const url = new URL("https://api.skipdb.tv/api/segments");
    url.searchParams.set("imdb_id", imdbId);
    url.searchParams.set("type", "intro");

    if (type === "tv") {
      url.searchParams.set("season", String(season));
      url.searchParams.set("episode", String(episode));
    }

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate },
    });

    if (!response.ok) {
      return emptyResult("skipdb-http-error", response.status);
    }

    const data = (await response.json()) as SkipDbResponse;
    const intro = data?.segments?.intro;
    if (!intro) return emptyResult("intro-not-found");

    const startSeconds =
      intro.start_sec ??
      (typeof intro.start_ms === "number" ? intro.start_ms / 1000 : null);
    const endSeconds =
      intro.end_sec ??
      (typeof intro.end_ms === "number" ? intro.end_ms / 1000 : null);

    if (
      typeof startSeconds !== "number" ||
      typeof endSeconds !== "number" ||
      !Number.isFinite(startSeconds) ||
      !Number.isFinite(endSeconds) ||
      startSeconds < 0 ||
      endSeconds <= startSeconds
    ) {
      return emptyResult("invalid-intro-timestamps");
    }

    return NextResponse.json(
      {
        startSeconds,
        endSeconds,
        reason: null,
        confidence: intro.confidence ?? null,
        match: intro.match ?? null,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch {
    return emptyResult("skipdb-request-failed");
  }
}
