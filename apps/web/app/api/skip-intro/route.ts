import { NextResponse } from "next/server";

export const revalidate = 3600;

type IntroResponse = {
  intro?: Array<{ start_ms?: number | null; end_ms?: number | null; start_sec?: number | null; end_sec?: number | null }> | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tmdbId = (searchParams.get("tmdbId") || "").trim();
  const type = searchParams.get("type") === "tv" ? "tv" : "movie";
  const season = Number(searchParams.get("season") || 1);
  const episode = Number(searchParams.get("episode") || 0);

  if (!/^\d+$/.test(tmdbId) || (type === "tv" && (!Number.isInteger(season) || season < 1 || !Number.isInteger(episode) || episode < 1))) {
    return NextResponse.json({ startSeconds: null, endSeconds: null }, { status: 400 });
  }

  try {
    const url = new URL("https://api.theintrodb.org/v3/media");
    url.searchParams.set("tmdb_id", tmdbId);
    url.searchParams.set("type", type);
    if (type === "tv") {
      url.searchParams.set("season", String(season));
      url.searchParams.set("episode", String(episode));
    }

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate },
    });
    if (!response.ok) {
      return NextResponse.json({ startSeconds: null, endSeconds: null }, { status: 200 });
    }

    const data = (await response.json()) as IntroResponse;
    const intro = Array.isArray(data.intro) ? data.intro[0] : null;
    const startSeconds = intro?.start_sec ?? (typeof intro?.start_ms === "number" ? intro.start_ms / 1000 : null);
    const endSeconds = intro?.end_sec ?? (typeof intro?.end_ms === "number" ? intro.end_ms / 1000 : null);

    if (typeof startSeconds !== "number" || typeof endSeconds !== "number" || endSeconds <= startSeconds) {
      return NextResponse.json({ startSeconds: null, endSeconds: null });
    }

    return NextResponse.json(
      { startSeconds, endSeconds },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch {
    return NextResponse.json({ startSeconds: null, endSeconds: null }, { status: 200 });
  }
}
