import { NextRequest, NextResponse } from "next/server";
import { getMemberFromRequest, publicMember } from "@/lib/member-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getMemberFromRequest(request);
    return NextResponse.json({ user: user ? publicMember(user) : null });
  } catch (error) {
    console.error("[MemberAuth] session lookup failed", error);
    return NextResponse.json({ user: null });
  }
}
