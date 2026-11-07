import { NextRequest, NextResponse } from "next/server";
import {
  attachMemberCookie,
  createMemberSession,
  normalizeUsername,
  publicMember,
  verifyPassword,
} from "@/lib/member-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = normalizeUsername(body.username);
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json({ message: "Vui lòng nhập tên tài khoản và mật khẩu." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ message: "Tên tài khoản hoặc mật khẩu không đúng." }, { status: 401 });
    }

    const token = await createMemberSession(user.id);
    const response = NextResponse.json({ user: publicMember(user) });
    attachMemberCookie(response, token);
    return response;
  } catch (error) {
    console.error("[MemberAuth] login failed", error);
    return NextResponse.json({ message: "Không thể đăng nhập lúc này. Vui lòng thử lại." }, { status: 500 });
  }
}
