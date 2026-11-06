import { NextResponse } from "next/server";

export const revalidate = 86400;

type TmdbRuntimeResponse = {
  runtime?: number | null;
  episode_run_time?: number[];
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = (searchParams.get("id") || "").trim();
  const type = searchParams.get("type") === "tv" ? "tv" : "movie";

  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ runtimeSeconds: 0 }, { status: 400 });
  }

  const accessToken = process.env.TMDB_API_READ_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;

  if (!accessToken && !apiKey) {
    return NextResponse.json({ runtimeSeconds: 0 }, { status: 503 });
  }

  try {
    const url = new URL(`https://api.themoviedb.org/3/${type}/${id}`);
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
      return NextResponse.json({ runtimeSeconds: 0 }, { status: 502 });
    }

    const data = (await response.json()) as TmdbRuntimeResponse;
    const runtimeMinutes = type === "tv"
      ? Number(data.episode_run_time?.find((value) => Number(value) > 0) || 0)
      : Number(data.runtime || 0);
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
