import { NextResponse } from "next/server";

export const revalidate = 3600;

type TmdbExternalIds = {
  imdb_id?: string | null;
};

type JikanAnime = {
  mal_id?: number;
  year?: number | null;
  title?: string;
  title_english?: string | null;
  title_japanese?: string | null;
  titles?: Array<{ title?: string }>;
};

async function resolveMalIdByTitle(
  title: string,
  year: number,
): Promise<{ id: string | null; reason?: string }> {
  if (!title.trim()) return { id: null, reason: "anime-title-empty" };

  const url = new URL("https://api.jikan.moe/v4/anime");
  url.searchParams.set("q", title);
  url.searchParams.set("type", "tv");
  url.searchParams.set("limit", "10");
  url.searchParams.set("sfw", "true");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
  } catch {
    return { id: null, reason: "jikan-network-error" };
  }
  if (!response.ok) return { id: null, reason: `jikan-http-${response.status}` };

  let data: { data?: JikanAnime[] };
  try {
    data = await response.json() as { data?: JikanAnime[] };
  } catch {
    return { id: null, reason: "jikan-invalid-json" };
  }
  const wanted = normalizeTitle(title);
  const match = (data.data || []).find((anime) => {
    const names = [
      anime.title,
      anime.title_english,
      anime.title_japanese,
      ...(anime.titles || []).map((item) => item.title),
    ].filter((name): name is string => Boolean(name));
    const exactTitleMatch = names.some((name) => normalizeTitle(name) === wanted);
    const yearMatches = !year || !anime.year || Math.abs(anime.year - year) <= 1;
    return exactTitleMatch && yearMatches && Number.isInteger(anime.mal_id);
  });

  return match?.mal_id
    ? { id: String(match.mal_id) }
    : { id: null, reason: "anime-mal-id-not-found" };
}

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

type TmdbSearchResult = {
  id: number;
  name?: string;
  original_name?: string;
  title?: string;
  original_title?: string;
  first_air_date?: string;
  release_date?: string;
};

function normalizeTitle(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function resolveTmdbIdByTitle(
  title: string,
  year: number,
  type: "tv" | "movie",
): Promise<{ id: string | null; reason?: string }> {
  const accessToken = process.env.TMDB_API_READ_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;
  if (!accessToken && !apiKey) return { id: null, reason: "tmdb-credentials-missing" };
  if (!title.trim()) return { id: null, reason: "tmdb-title-empty" };

  // OPhim sometimes appends season labels to the original title.
  const cleanedTitle = title
    .replace(/\s*[\(\[]?\s*(?:season|series|phần|part|s)\s*\d+\s*[\)\]]?\s*$/i, "")
    .replace(/\s+(?:season|series|phần|part)\s*\d+\s*$/i, "")
    .trim();
  const queries = [...new Set([cleanedTitle, title].filter(Boolean))];
  const wantedTitles = new Set(queries.map(normalizeTitle));
  let lastStatus: number | undefined;

  for (const query of queries) {
    // Retry without the supplied year in case OPhim metadata is inaccurate.
    for (const useYear of [true, false]) {
      const url = new URL(`https://api.themoviedb.org/3/search/${type}`);
      url.searchParams.set("query", query);
      url.searchParams.set("include_adult", "false");
      url.searchParams.set("language", "en-US");
      if (useYear && year >= 1800 && year <= 2100) {
        url.searchParams.set(type === "tv" ? "first_air_date_year" : "year", String(year));
      }
      if (!accessToken && apiKey) url.searchParams.set("api_key", apiKey);

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        next: { revalidate: 86400 },
      });
      if (!response.ok) {
        lastStatus = response.status;
        continue;
      }

      const data = (await response.json()) as { results?: TmdbSearchResult[] };
      const match = (data.results || []).find((item) => {
        const names = type === "tv"
          ? [item.name, item.original_name]
          : [item.title, item.original_title];
        return names.some((name) => name && wantedTitles.has(normalizeTitle(name)));
      });
      if (match?.id) return { id: String(match.id) };
    }
  }

  return lastStatus
    ? { id: null, reason: `tmdb-search-http-${lastStatus}` }
    : { id: null, reason: "tmdb-title-not-found" };
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
  let tmdbId = (searchParams.get("tmdbId") || "").trim();
  const title = (searchParams.get("title") || "").trim().slice(0, 120);
  const year = Number(searchParams.get("year") || 0);
  const type = searchParams.get("type") === "tv" ? "tv" : "movie";
  const season = Number(searchParams.get("season") || 1);
  const episode = Number(searchParams.get("episode") || 0);
  const isAnime = searchParams.get("anime") === "1";
  const animeTitle = (searchParams.get("animeTitle") || "").trim().slice(0, 120);
  const animeYear = Number(searchParams.get("animeYear") || year || 0);

  if (
    (tmdbId && !/^\d+$/.test(tmdbId)) ||
    (!tmdbId && (!title || (year !== 0 && (!Number.isInteger(year) || year < 1800 || year > 2100)))) ||
    (type === "tv" &&
      (!Number.isInteger(season) || season < 1 ||
        !Number.isInteger(episode) || episode < 1))
  ) {
    return NextResponse.json(
      { startSeconds: null, endSeconds: null, reason: "invalid-parameters" },
      { status: 400 },
    );
  }

  try {
    // Japanese anime series use AniSkip; all other titles continue through SkipDB.
    if (isAnime && type === "tv") {
      const resolvedMal = await resolveMalIdByTitle(animeTitle || title, animeYear);
      if (!resolvedMal.id) return emptyResult(resolvedMal.reason || "anime-mal-id-not-found");

      // episodeLength=0 avoids filtering against a potentially different video encode.
      const aniUrl = new URL(`https://api.aniskip.com/v2/skip-times/${resolvedMal.id}/${episode}`);
      aniUrl.searchParams.append("types[]", "op");
      aniUrl.searchParams.append("types[]", "mixed-op");
      aniUrl.searchParams.set("episodeLength", "0");
      let aniResponse: Response;
      try {
        aniResponse = await fetch(aniUrl, {
          headers: { Accept: "application/json" },
          next: { revalidate },
        });
      } catch {
        return emptyResult("aniskip-network-error");
      }
      if (!aniResponse.ok) return emptyResult("aniskip-http-error", aniResponse.status);
      let aniData: {
        found?: boolean;
        results?: Array<{ interval?: { startTime?: number; endTime?: number }; skipType?: string }>;
      };
      try {
        aniData = await aniResponse.json();
      } catch {
        return emptyResult("aniskip-invalid-json");
      }
      const opening = (aniData.results || []).find((item) =>
        (item.skipType === "op" || item.skipType === "mixed-op") &&
        typeof item.interval?.startTime === "number" &&
        typeof item.interval?.endTime === "number" &&
        item.interval.endTime > item.interval.startTime
      );
      if (!aniData.found || !opening?.interval) return emptyResult("aniskip-intro-not-found");
      return NextResponse.json({
        startSeconds: opening.interval.startTime,
        endSeconds: opening.interval.endTime,
        reason: null,
        source: "AniSkip",
        malId: resolvedMal.id,
        skipType: opening.skipType,
      }, {
        headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
      });
    }

    // If OPhim omitted the ID, require an exact title and year match from TMDB.
    if (!tmdbId) {
      const resolved = await resolveTmdbIdByTitle(title, year, type);
      if (!resolved.id) return emptyResult(resolved.reason || "tmdb-title-not-found");
      tmdbId = resolved.id;
    }

    // SkipDB is keyed by IMDb ID, so resolve it from the TMDB ID.
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
        source: "SkipDB",
        resolvedTmdbId: tmdbId,
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
    return emptyResult(isAnime && type === "tv" ? "anime-unexpected-error" : "skipdb-request-failed");
  }
}
