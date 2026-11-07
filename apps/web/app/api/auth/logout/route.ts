import { NextRequest, NextResponse } from "next/server";
import { clearMemberCookie, deleteMemberSession, MEMBER_SESSION_COOKIE } from "@/lib/member-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(MEMBER_SESSION_COOKIE)?.value;
  try {
    await deleteMemberSession(token);
  } catch (error) {
    console.error("[MemberAuth] logout failed", error);
  }
  const response = NextResponse.json({ ok: true });
  clearMemberCookie(response);
  return response;
}
