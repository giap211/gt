import { NextResponse } from "next/server";

export const revalidate = 3600;

type IntroSegment = {
  start_ms?: number | null;
  end_ms?: number | null;
  start_sec?: number | null;
  end_sec?: number | null;
};

type IntroResponse = {
  intro?: IntroSegment[] | IntroSegment | null;
};

function emptyResult(reason: string, upstreamStatus?: number) {
  return NextResponse.json({
    startSeconds: null,
    endSeconds: null,
    reason,
    ...(typeof upstreamStatus === "number" ? { upstreamStatus } : {}),
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tmdbId = (searchParams.get("tmdbId") || "").trim();
  const type = searchParams.get("type") === "tv" ? "tv" : "movie";
  const season = Number(searchParams.get("season") || 1);
  const episode = Number(searchParams.get("episode") || 0);

  if (!/^\d+$/.test(tmdbId) || (type === "tv" && (
    !Number.isInteger(season) || season < 1 ||
    !Number.isInteger(episode) || episode < 1
  ))) {
    return NextResponse.json(
      { startSeconds: null, endSeconds: null, reason: "invalid-parameters" },
      { status: 400 },
    );
  }

  try {
    // v4 is the actively maintained TheIntroDB API. TMDB IDs remain supported.
    const url = new URL("https://api.theintrodb.org/v4/media");
    url.searchParams.set("tmdb_id", tmdbId);
    if (type === "tv") {
      url.searchParams.set("season", String(season));
      url.searchParams.set("episode", String(episode));
    }

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate },
    });

    if (!response.ok) {
      return emptyResult("upstream-http-error", response.status);
    }

    const data = (await response.json()) as IntroResponse;
    const introValue = data?.intro;
    const intro = Array.isArray(introValue) ? introValue[0] : introValue;

    if (!intro) return emptyResult("intro-not-found");

    // The API uses null start_ms to mean the intro starts at 00:00.
    const startSeconds =
      intro.start_sec ??
      (intro.start_ms === null ? 0 :
        typeof intro.start_ms === "number" ? intro.start_ms / 1000 : null);
    const endSeconds =
      intro.end_sec ??
      (typeof intro.end_ms === "number" ? intro.end_ms / 1000 : null);

    if (
      typeof startSeconds !== "number" ||
      typeof endSeconds !== "number" ||
      !Number.isFinite(startSeconds) ||
      !Number.isFinite(endSeconds) ||
      endSeconds <= startSeconds
    ) {
      return emptyResult("invalid-intro-timestamps");
    }

    return NextResponse.json(
      { startSeconds, endSeconds, reason: null },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch {
    return emptyResult("upstream-request-failed");
  }
}
