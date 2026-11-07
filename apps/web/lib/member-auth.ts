import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { get, put } from "@vercel/blob";
import type { NextRequest, NextResponse } from "next/server";

export const MEMBER_SESSION_COOKIE = "gt_member_session";
const SESSION_DAYS = 30;
const STORE_PATH = "private/member-data.json";

type StoredUser = { id: string; username: string; email: string; name: string; passwordHash: string; createdAt: string };
type StoredSession = { tokenHash: string; userId: string; expiresAt: string };
type StoredHistory = { id: string; userId: string; movieSlug: string; movieTitle: string; posterUrl: string | null; episodeName: string; episodeSlug: string | null; progressSeconds: number; totalDurationSeconds: number; updatedAt: string };
type Store = { users: StoredUser[]; sessions: StoredSession[]; history: StoredHistory[] };
const emptyStore = (): Store => ({ users: [], sessions: [], history: [] });

async function readStore(): Promise<{ data: Store; etag: string | null }> {
  const blob = await get(STORE_PATH, { access: "private" });
  if (!blob || blob.statusCode !== 200 || !blob.stream) return { data: emptyStore(), etag: null };
  const text = await new Response(blob.stream).text();
  try {
    const parsed = JSON.parse(text) as Partial<Store>;
    return { data: { users: parsed.users || [], sessions: parsed.sessions || [], history: parsed.history || [] }, etag: blob.blob.etag };
  } catch {
    throw new Error("Dữ liệu tài khoản trên Blob không hợp lệ.");
  }
}

async function mutateStore<T>(mutate: (store: Store) => T): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, etag } = await readStore();
    const result = mutate(data);
    try {
      await put(STORE_PATH, JSON.stringify(data), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json; charset=utf-8",
        ...(etag ? { ifMatch: etag } : {}),
      });
      return result;
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }
  throw new Error("Không thể cập nhật dữ liệu tài khoản.");
}

export function normalizeUsername(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  try {
    const expected = Buffer.from(expectedHex, "hex");
    const actual = scryptSync(password, salt, expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch { return false; }
}
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
export async function createMemberSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const session: StoredSession = { userId, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000).toISOString() };
  await mutateStore((store) => { store.sessions = store.sessions.filter((s) => s.expiresAt > new Date().toISOString()); store.sessions.push(session); });
  return token;
}
export async function getMemberFromRequest(request: NextRequest) {
  const token = request.cookies.get(MEMBER_SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = hashSessionToken(token);
  const { data } = await readStore();
  const session = data.sessions.find((s) => s.tokenHash === tokenHash && Date.parse(s.expiresAt) > Date.now());
  if (!session) return null;
  return data.users.find((u) => u.id === session.userId) || null;
}
export function attachMemberCookie(response: NextResponse, token: string) {
  response.cookies.set(MEMBER_SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_DAYS * 86400 });
}
export function clearMemberCookie(response: NextResponse) {
  response.cookies.set(MEMBER_SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}
export function publicMember(user: { id: string; username: string; email?: string; name?: string }) {
  return { id: user.id, username: user.username, email: user.email || "", name: user.name || user.username };
}
export function validUsername(username: string) { return /^[a-z0-9_.-]{3,24}$/.test(username); }

export async function registerMember(username: string, passwordHash: string) {
  return mutateStore((store) => {
    if (store.users.some((u) => u.username === username)) throw new Error("USERNAME_TAKEN");
    const user: StoredUser = { id: randomBytes(16).toString("hex"), username, email: "", name: username, passwordHash, createdAt: new Date().toISOString() };
    store.users.push(user);
    return user;
  });
}
export async function findMember(username: string) {
  const { data } = await readStore();
  return data.users.find((u) => u.username === username) || null;
}
export async function deleteMemberSession(token: string) {
  const tokenHash = hashSessionToken(token);
  await mutateStore((store) => { store.sessions = store.sessions.filter((s) => s.tokenHash !== tokenHash); });
}
export async function getMemberHistory(userId: string) {
  const { data } = await readStore();
  return data.history.filter((h) => h.userId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 30);
}
export async function saveMemberHistory(userId: string, input: Omit<StoredHistory, "id" | "userId" | "updatedAt">) {
  return mutateStore((store) => {
    const now = new Date().toISOString();
    const index = store.history.findIndex((h) => h.userId === userId && h.movieSlug === input.movieSlug && h.episodeName === input.episodeName);
    const existingItem = index >= 0 ? store.history[index] : undefined;
    const item: StoredHistory = { ...input, id: existingItem?.id ?? randomBytes(12).toString("hex"), userId, updatedAt: now };
    if (index >= 0) store.history[index] = item; else store.history.unshift(item);
    store.history = store.history.filter((h) => h.userId !== userId || h.id === item.id || Date.now() - Date.parse(h.updatedAt) < 180 * 86400000);
    return item;
  });
}
