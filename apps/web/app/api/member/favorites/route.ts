import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMemberFromRequest } from "@/lib/member-auth";

export const runtime = "nodejs";

const safeText = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

function parseFavorite(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const movieSlug = safeText(body.movieSlug, 180);
  const movieTitle = safeText(body.movieTitle, 240);
  const posterUrl = safeText(body.posterUrl, 2000) || null;
  if (!/^[a-z0-9-_]+$/i.test(movieSlug) || !movieTitle) return null;
  return { movieSlug, movieTitle, posterUrl };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getMemberFromRequest(request);
    if (!user) return NextResponse.json({ message: "Vui lòng đăng nhập." }, { status: 401 });
    const items = await prisma.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" } },
    );
  } catch (error) {
    console.error("[MemberFavorites] load failed", error);
    return NextResponse.json({ message: "Không thể tải tủ phim." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getMemberFromRequest(request);
    if (!user) return NextResponse.json({ message: "Vui lòng đăng nhập." }, { status: 401 });
    const parsed = await request.json().catch(() => ({}));
    const body = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
    const rawItems = Array.isArray(body.items) ? body.items.slice(0, 100) : [body];
    const items = rawItems.map(parseFavorite).filter((item): item is NonNullable<ReturnType<typeof parseFavorite>> => !!item);
    if (!items.length) {
      return NextResponse.json({ message: "Thiếu thông tin phim cần lưu." }, { status: 400 });
    }
    await prisma.favorite.createMany({
      data: items.map((item) => ({ userId: user.id, ...item })),
      skipDuplicates: true,
    });
    return NextResponse.json({ ok: true, favorited: true });
  } catch (error) {
    console.error("[MemberFavorites] save failed", error);
    return NextResponse.json({ message: "Không thể lưu phim vào tủ." }, { status: 500 });
  }
}
