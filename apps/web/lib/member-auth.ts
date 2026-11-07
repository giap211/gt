import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { BlobPreconditionFailedError, get, put } from "@vercel/blob";
import type { NextRequest, NextResponse } from "next/server";

export const MEMBER_SESSION_COOKIE = "gt_member_session";
const SESSION_DAYS = 30;
const STORE_PATH = "private/member-data.json";
const HISTORY_PATH = (userId: string) => `private/member-history/${userId}.json`;

type StoredUser = { id: string; username: string; email: string; name: string; passwordHash: string; createdAt: string };
type StoredHistory = { id: string; userId: string; movieSlug: string; movieTitle: string; posterUrl: string | null; episodeName: string; episodeSlug: string | null; progressSeconds: number; totalDurationSeconds: number; updatedAt: string };
type Store = { users: StoredUser[]; history: StoredHistory[] };
export type MemberHistoryInput = Omit<StoredHistory, "id" | "userId" | "updatedAt">;
const emptyStore = (): Store => ({ users: [], history: [] });

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isPreconditionFailure = (error: unknown) =>
  error instanceof BlobPreconditionFailedError ||
  (error instanceof Error && /precondition failed|etag mismatch/i.test(error.message));

async function readStore(): Promise<{ data: Store; etag: string | null }> {
  const blob = await get(STORE_PATH, { access: "private", headers: { "Cache-Control": "no-cache" } });
  if (!blob || blob.statusCode !== 200 || !blob.stream) return { data: emptyStore(), etag: null };
  const raw = await new Response(blob.stream).text();
  try {
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      data: {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        history: Array.isArray(parsed.history) ? parsed.history : [],
      },
      etag: blob.blob.etag,
    };
  } catch {
    throw new Error("Dữ liệu tài khoản trên Blob không hợp lệ.");
  }
}

/** This file is now only the account index. Login/session and watch-history writes never touch it. */
async function mutateStore<T>(mutate: (store: Store) => T): Promise<T> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const { data, etag } = await readStore();
    const result = mutate(data);
    try {
      await put(STORE_PATH, JSON.stringify(data), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json; charset=utf-8",
        cacheControlMaxAge: 60,
        ...(etag ? { ifMatch: etag } : {}),
      });
      return result;
    } catch (error) {
      if (!isPreconditionFailure(error) || attempt === 7) throw error;
      await wait(100 + attempt * 150 + Math.floor(Math.random() * 100));
    }
  }
  throw new Error("Không thể cập nhật danh sách tài khoản.");
}

async function readUserHistory(userId: string): Promise<{ items: StoredHistory[]; etag: string | null; exists: boolean }> {
  const blob = await get(HISTORY_PATH(userId), { access: "private", headers: { "Cache-Control": "no-cache" } });
  if (!blob || blob.statusCode !== 200 || !blob.stream) {
    // One-time compatibility fallback for history written by the previous shared-file version.
    const legacy = await readStore();
    return {
      items: legacy.data.history.filter((item) => item.userId === userId),
      etag: null,
      exists: false,
    };
  }
  const raw = await new Response(blob.stream).text();
  try {
    const parsed = JSON.parse(raw) as { items?: StoredHistory[] };
    return { items: Array.isArray(parsed.items) ? parsed.items : [], etag: blob.blob.etag, exists: true };
  } catch {
    throw new Error("Dữ liệu lịch sử xem trên Blob không hợp lệ.");
  }
}

async function mutateUserHistory<T>(userId: string, mutate: (items: StoredHistory[]) => T): Promise<T> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const current = await readUserHistory(userId);
    const items = current.items;
    const result = mutate(items);
    try {
      await put(HISTORY_PATH(userId), JSON.stringify({ items }), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json; charset=utf-8",
        cacheControlMaxAge: 60,
        ...(current.etag ? { ifMatch: current.etag } : {}),
      });
      return result;
    } catch (error) {
      if (!isPreconditionFailure(error) || attempt === 7) throw error;
      await wait(120 + attempt * 160 + Math.floor(Math.random() * 120));
    }
  }
  throw new Error("Không thể cập nhật lịch sử xem.");
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
  } catch {
    return false;
  }
}

function sessionSecret(): Buffer {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("Thiếu cấu hình bảo mật phiên đăng nhập.");
  return createHash("sha256").update("gt-member-session-v1:").update(token).digest();
}

/** Stateless signed cookie: logging in no longer writes a session row to Blob. */
export function createMemberSession(userId: string): string {
  const payload = Buffer.from(JSON.stringify({
    userId,
    expiresAt: Date.now() + SESSION_DAYS * 86400000,
    nonce: randomBytes(12).toString("hex"),
  })).toString("base64url");
  const signature = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function readSession(token: string): { userId: string } | null {
  try {
    const separator = token.lastIndexOf(".");
    if (separator <= 0) return null;
    const payload = token.slice(0, separator);
    const supplied = Buffer.from(token.slice(separator + 1), "base64url");
    const expected = createHmac("sha256", sessionSecret()).update(payload).digest();
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { userId?: unknown; expiresAt?: unknown };
    if (typeof decoded.userId !== "string" || typeof decoded.expiresAt !== "number" || decoded.expiresAt <= Date.now()) return null;
    return { userId: decoded.userId };
  } catch {
    return null;
  }
}

export async function getMemberFromRequest(request: NextRequest) {
  const token = request.cookies.get(MEMBER_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = readSession(token);
  if (!session) return null;
  const { data } = await readStore();
  return data.users.find((user) => user.id === session.userId) || null;
}

export function attachMemberCookie(response: NextResponse, token: string) {
  response.cookies.set(MEMBER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export function clearMemberCookie(response: NextResponse) {
  response.cookies.set(MEMBER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function publicMember(user: { id: string; username: string; email?: string; name?: string }) {
  return { id: user.id, username: user.username, email: user.email || "", name: user.name || user.username };
}

export function validUsername(username: string) {
  return /^[a-z0-9_.-]{3,24}$/.test(username);
}

export async function registerMember(username: string, passwordHash: string) {
  return mutateStore((store) => {
    if (store.users.some((user) => user.username === username)) throw new Error("USERNAME_TAKEN");
    const user: StoredUser = {
      id: randomBytes(16).toString("hex"),
      username,
      email: "",
      name: username,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    store.users.push(user);
    return user;
  });
}

export async function findMember(username: string) {
  const { data } = await readStore();
  return data.users.find((user) => user.username === username) || null;
}

export async function deleteMemberSession(_token: string) {
  // Stateless sessions are revoked in the browser by clearing the HttpOnly cookie.
}

export async function getMemberHistory(userId: string) {
  const { items } = await readUserHistory(userId);
  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 30);
}

export async function saveMemberHistoryBatch(userId: string, inputs: MemberHistoryInput[]) {
  return mutateUserHistory(userId, (items) => {
    const saved: StoredHistory[] = [];
    for (const input of inputs) {
      const index = items.findIndex((item) =>
        item.movieSlug === input.movieSlug &&
        (input.episodeSlug ? item.episodeSlug === input.episodeSlug : item.episodeName === input.episodeName),
      );
      const existing = index >= 0 ? items[index] : undefined;
      const item: StoredHistory = {
        ...input,
        id: existing?.id ?? randomBytes(12).toString("hex"),
        userId,
        updatedAt: new Date().toISOString(),
      };
      if (index >= 0) items[index] = item;
      else items.unshift(item);
      saved.push(item);
    }
    items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    items.splice(30);
    return saved;
  });
}

export async function saveMemberHistory(userId: string, input: MemberHistoryInput) {
  const [item] = await saveMemberHistoryBatch(userId, [input]);
  return item;
}
