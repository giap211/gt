import { NextRequest, NextResponse } from "next/server";
import { getMemberFromRequest, getMemberHistory, saveMemberHistory } from "@/lib/member-auth";
export const runtime = "nodejs";
const safeText = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const safeSeconds = (value: unknown) => { const n = Number(value); return Number.isFinite(n) ? Math.max(0, Math.min(86400, Math.floor(n))) : 0; };
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
    const body = await request.json().catch(() => ({}));
    const movieSlug = safeText(body.movieSlug, 180), movieTitle = safeText(body.movieTitle, 240);
    const posterUrl = safeText(body.posterUrl, 2000) || null, episodeName = safeText(body.episodeName, 100);
    const episodeSlug = safeText(body.episodeSlug, 180) || null;
    if (!movieSlug || !movieTitle || !episodeName) return NextResponse.json({ message: "Thiếu thông tin phim hoặc tập đang xem." }, { status: 400 });
    const item = await saveMemberHistory(user.id, { movieSlug, movieTitle, posterUrl, episodeName, episodeSlug, progressSeconds: safeSeconds(body.progressSeconds), totalDurationSeconds: safeSeconds(body.totalDurationSeconds) });
    return NextResponse.json({ item });
  } catch (error) {
    console.error("[MemberHistory] save failed", error);
    return NextResponse.json({ message: "Không thể lưu lịch sử xem phim." }, { status: 500 });
  }
}
