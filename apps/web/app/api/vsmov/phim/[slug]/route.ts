import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VSMOV_API_BASE = "https://vsmov.com";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;

    if (!slug) {
      return NextResponse.json(
        { status: false, episodes: [] },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${VSMOV_API_BASE}/api/phim/${encodeURIComponent(slug)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 RoPhim/1.0",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          status: false,
          episodes: [],
          message: `VSMOV trả về HTTP ${response.status}`,
        },
        { status: 200 },
      );
    }

    const payload = await response.json();

    // Hỗ trợ cả response trực tiếp và response bọc trong data.
    const source = payload?.data ?? payload;
    const episodes = Array.isArray(source)
      ? source
      : Array.isArray(source?.episodes)
        ? source.episodes
        : [];

    return NextResponse.json({
      status: episodes.length > 0,
      episodes,
    });
  } catch (error) {
    console.error("VSMOV proxy error:", error);

    return NextResponse.json(
      {
        status: false,
        episodes: [],
        message: "Không thể kết nối máy chủ VSMOV",
      },
      { status: 200 },
    );
  }
}