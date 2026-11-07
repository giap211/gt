import { NextRequest, NextResponse } from "next/server";
import { getMemberFromRequest, getMemberHistory, saveMemberHistoryBatch, type MemberHistoryInput } from "@/lib/member-auth";

export const runtime = "nodejs";

const safeText = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const safeSeconds = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(86400, Math.floor(number))) : 0;
};

function parseHistoryItem(body: Record<string, unknown>): MemberHistoryInput | null {
  const movieSlug = safeText(body.movieSlug, 180);
  const movieTitle = safeText(body.movieTitle, 240);
  const posterUrl = safeText(body.posterUrl, 2000) || null;
  const episodeName = safeText(body.episodeName, 100);
  const episodeSlug = safeText(body.episodeSlug, 180) || null;
  if (!movieSlug || !movieTitle || !episodeName) return null;
  return {
    movieSlug,
    movieTitle,
    posterUrl,
    episodeName,
    episodeSlug,
    progressSeconds: safeSeconds(body.progressSeconds),
    totalDurationSeconds: safeSeconds(body.totalDurationSeconds),
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getMemberFromRequest(request);
    if (!user) return NextResponse.json({ message: "Vui lòng đăng nhập để xem lịch sử." }, { status: 401 });
    return NextResponse.json({ items: await getMemberHistory(user.id) });
  } catch (error) {
    console.error("[MemberHistory] load failed", error);
    return NextResponse.json({ message: "Không thể tải lịch sử xem phim." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getMemberFromRequest(request);
    if (!user) return NextResponse.json({ message: "Vui lòng đăng nhập để lưu lịch sử." }, { status: 401 });
    const parsedBody = await request.json().catch(() => ({}));
    const body = parsedBody && typeof parsedBody === "object" && !Array.isArray(parsedBody)
      ? parsedBody as Record<string, unknown>
      : {};
    const rawItems = Array.isArray(body.items) ? body.items.slice(0, 50) : [body];
    const items = rawItems
      .filter((item: unknown): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item))
      .map(parseHistoryItem)
      .filter((item: MemberHistoryInput | null): item is MemberHistoryInput => item !== null);
    if (!items.length) {
      return NextResponse.json({ message: "Thiếu thông tin phim hoặc tập đang xem." }, { status: 400 });
    }
    const saved = await saveMemberHistoryBatch(user.id, items);
    return NextResponse.json({ items: saved, ...(saved.length === 1 ? { item: saved[0] } : {}) });
  } catch (error) {
    console.error("[MemberHistory] save failed", error);
    return NextResponse.json({ message: "Không thể lưu lịch sử xem phim." }, { status: 500 });
  }
}
