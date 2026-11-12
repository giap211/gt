import { NextRequest, NextResponse } from "next/server";
import { attachMemberCookie, createMemberSession, hashPassword, normalizeUsername, publicMember, registerMember, validUsername } from "@/lib/member-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const parsed = await request.json().catch(() => ({}));
    const body = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
    const username = normalizeUsername(body.username);
    const password = typeof body.password === "string" ? body.password : "";
    if (!validUsername(username)) {
      return NextResponse.json({ message: "Tên tài khoản phải có 3–20 ký tự, chỉ gồm chữ cái, chữ số và @." }, { status: 400 });
    }
    if (!/^[\p{L}\p{N}@]{3,128}$/u.test(password)) {
      return NextResponse.json({ message: "Mật khẩu phải có ít nhất 3 ký tự, chỉ gồm chữ cái, chữ số và @ (tối đa 128 ký tự)." }, { status: 400 });
    }
    const user = await registerMember(username, hashPassword(password));
    const token = await createMemberSession(user.id);
    const response = NextResponse.json({ user: publicMember(user) }, { status: 201 });
    attachMemberCookie(response, token);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "USERNAME_TAKEN") {
      return NextResponse.json({ message: "Tên tài khoản này đã được sử dụng." }, { status: 409 });
    }
    console.error("[MemberAuth] register failed", error);
    return NextResponse.json({ message: "Không thể tạo tài khoản lúc này. Vui lòng thử lại." }, { status: 500 });
  }
}
