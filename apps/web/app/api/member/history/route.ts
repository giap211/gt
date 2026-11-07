import { NextRequest, NextResponse } from "next/server";
import { getMemberFromRequest } from "@/lib/member-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const safeText = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const safeSeconds = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(24 * 60 * 60, Math.floor(number))) : 0;
};

export async function GET(request: NextRequest) {
  try {
    const user = await getMemberFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: "Vui lòng đăng nhập để xem lịch sử." }, { status: 401 });
    }

    const items = await prisma.watchHistory.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 30,
    });
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[MemberHistory] load failed", error);
    return NextResponse.json({ message: "Không thể tải lịch sử xem phim." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getMemberFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: "Vui lòng đăng nhập để lưu lịch sử." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const movieSlug = safeText(body.movieSlug, 180);
    const movieTitle = safeText(body.movieTitle, 240);
    const posterUrl = safeText(body.posterUrl, 2000) || null;
    const episodeName = safeText(body.episodeName, 100);
    const episodeSlug = safeText(body.episodeSlug, 180) || null;

    if (!movieSlug || !movieTitle || !episodeName) {
      return NextResponse.json({ message: "Thiếu thông tin phim hoặc tập đang xem." }, { status: 400 });
    }

    const progressSeconds = safeSeconds(body.progressSeconds);
    const totalDurationSeconds = safeSeconds(body.totalDurationSeconds);
    const item = await prisma.watchHistory.upsert({
      where: {
        userId_movieSlug_episodeName: {
          userId: user.id,
          movieSlug,
          episodeName,
        },
      },
      create: {
        userId: user.id,
        movieSlug,
        movieTitle,
        posterUrl,
        episodeName,
        episodeSlug,
        progressSeconds,
        totalDurationSeconds,
      },
      update: {
        movieTitle,
        posterUrl,
        episodeSlug,
        progressSeconds,
        totalDurationSeconds,
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("[MemberHistory] save failed", error);
    return NextResponse.json({ message: "Không thể lưu lịch sử xem phim." }, { status: 500 });
  }
}
