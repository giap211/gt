import { NextRequest, NextResponse } from "next/server";
import {
  clearMemberCookie,
  hashSessionToken,
  MEMBER_SESSION_COOKIE,
} from "@/lib/member-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(MEMBER_SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({
      where: { tokenHash: hashSessionToken(token) },
    }).catch(() => undefined);
  }
  const response = NextResponse.json({ ok: true });
  clearMemberCookie(response);
  return response;
}
