import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMemberFromRequest } from "@/lib/member-auth";

export const runtime = "nodejs";

const safeText = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export async function POST(request: NextRequest) {
  try {
    const user = await getMemberFromRequest(request);
    if (!user) return NextResponse.json({ message: "Vui lòng đăng nhập." }, { status: 401 });
    const parsed = await request.json().catch(() => ({}));
    const body = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
    const movieSlug = safeText(body.movieSlug, 180);
    const movieTitle = safeText(body.movieTitle, 240);
    const posterUrl = safeText(body.posterUrl, 2000) || null;
    if (!/^[a-z0-9-_]+$/i.test(movieSlug) || !movieTitle) {
      return NextResponse.json({ message: "Thông tin phim không hợp lệ." }, { status: 400 });
    }
    const where = { userId_movieSlug: { userId: user.id, movieSlug } };
    const existing = await prisma.favorite.findUnique({ where });
    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return NextResponse.json({ favorited: false });
    }
    await prisma.favorite.create({
      data: { userId: user.id, movieSlug, movieTitle, posterUrl },
    });
    return NextResponse.json({ favorited: true });
  } catch (error) {
    console.error("[MemberFavorites] toggle failed", error);
    return NextResponse.json({ message: "Không thể cập nhật tủ phim." }, { status: 500 });
  }
}
