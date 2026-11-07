import { NextResponse } from "next/server";

export const revalidate = 86400;

type TmdbRuntimeResponse = {
  runtime?: number | null;
  episode_run_time?: number[];
};

type TmdbEpisodeRuntimeResponse = { runtime?: number | null };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = (searchParams.get("id") || "").trim();
  const type = searchParams.get("type") === "tv" ? "tv" : "movie";
  const season = Number(searchParams.get("season") || 0);
  const episode = Number(searchParams.get("episode") || 0);

  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ runtimeSeconds: 0 }, { status: 400 });
  }

  const accessToken = process.env.TMDB_API_READ_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;

  if (!accessToken && !apiKey) {
    return NextResponse.json({ runtimeSeconds: 0 }, { status: 503 });
  }

  try {
    const headers = {
      Accept: "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };
    const authQuery = !accessToken && apiKey ? `?api_key=${encodeURIComponent(apiKey)}` : "";
    let runtimeMinutes = 0;

    // For series, prefer the selected episode's own runtime instead of the
    // show's average episode_run_time.
    if (type === "tv" && Number.isInteger(season) && season >= 0 &&
        Number.isInteger(episode) && episode > 0) {
      const episodeUrl = new URL(
        `https://api.themoviedb.org/3/tv/${id}/season/${season}/episode/${episode}${authQuery}`,
      );
      episodeUrl.searchParams.set("language", "en-US");
      const episodeResponse = await fetch(episodeUrl, {
        headers,
        next: { revalidate },
      });
      if (episodeResponse.ok) {
        const episodeData = (await episodeResponse.json()) as TmdbEpisodeRuntimeResponse;
        runtimeMinutes = Number(episodeData.runtime || 0);
      }
    }

    if (!(runtimeMinutes > 0)) {
      const url = new URL(`https://api.themoviedb.org/3/${type}/${id}`);
      url.searchParams.set("language", "en-US");
      if (!accessToken && apiKey) url.searchParams.set("api_key", apiKey);
      const response = await fetch(url, { headers, next: { revalidate } });
      if (!response.ok) {
        return NextResponse.json({ runtimeSeconds: 0 }, { status: 502 });
      }
      const data = (await response.json()) as TmdbRuntimeResponse;
      runtimeMinutes = type === "tv"
        ? Number(data.episode_run_time?.find((value) => Number(value) > 0) || 0)
        : Number(data.runtime || 0);
    }

    const runtimeSeconds = Number.isFinite(runtimeMinutes) && runtimeMinutes > 0
      ? Math.round(runtimeMinutes * 60)
      : 0;

    return NextResponse.json(
      { runtimeSeconds },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch {
    return NextResponse.json({ runtimeSeconds: 0 }, { status: 502 });
  }
}
