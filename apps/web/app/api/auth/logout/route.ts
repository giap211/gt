import { NextResponse } from "next/server";
import { clearMemberCookie } from "@/lib/member-auth";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearMemberCookie(response);
  return response;
}
