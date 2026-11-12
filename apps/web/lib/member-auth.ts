import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { get } from "@vercel/blob";
import type { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const MEMBER_SESSION_COOKIE = "gt_member_session";
const SESSION_DAYS = 30;
const STORE_PATH = "private/member-data.json";
const HISTORY_PATH = (userId: string) => `private/member-history/${userId}.json`;

type LegacyUser = {
  id: string;
  username: string;
  email?: string;
  name?: string;
  passwordHash: string;
  createdAt?: string;
};
type LegacySession = { tokenHash: string; userId: string; expiresAt: string };
type LegacyHistory = {
  id?: string;
  userId?: string;
  movieSlug: string;
  movieTitle: string;
  posterUrl?: string | null;
  episodeName: string;
  episodeSlug?: string | null;
  progressSeconds?: number;
  totalDurationSeconds?: number;
  updatedAt?: string;
};
type LegacyStore = {
  users: LegacyUser[];
  sessions: LegacySession[];
  history: LegacyHistory[];
};
type LegacyRead<T> = { ok: true; value: T | null } | { ok: false; value: null };
export type MemberHistoryInput = {
  movieSlug: string;
  movieTitle: string;
  posterUrl: string | null;
  episodeName: string;
  episodeSlug: string | null;
  progressSeconds: number;
  totalDurationSeconds: number;
};

const hashSessionToken = (token: string) => createHash("sha256").update(token).digest("hex");
const isUniqueViolation = (error: unknown) =>
  !!error && typeof error === "object" && "code" in error && error.code === "P2002";

async function readPrivateBlobJson<T>(path: string): Promise<LegacyRead<T>> {
  try {
    const blob = await get(path, {
      access: "private",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!blob || blob.statusCode !== 200 || !blob.stream) return { ok: true, value: null };
    const raw = await new Response(blob.stream).text();
    return { ok: true, value: JSON.parse(raw) as T };
  } catch (error) {
    console.warn("[MemberMigration] Could not read legacy Blob data", error);
    return { ok: false, value: null };
  }
}

async function readLegacyStore(): Promise<LegacyStore | null> {
  const result = await readPrivateBlobJson<Partial<LegacyStore>>(STORE_PATH);
  if (!result.ok) return null;
  const value = result.value;
  return {
    users: Array.isArray(value?.users) ? value.users : [],
    sessions: Array.isArray(value?.sessions) ? value.sessions : [],
    history: Array.isArray(value?.history) ? value.history : [],
  };
}

function sessionSecret(): Buffer | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  return createHash("sha256").update("gt-member-session-v1:").update(token).digest();
}

/** Accept the signed stateless cookie issued by the immediately previous Blob-backed version. */
function readLegacySignedSession(token: string): { userId: string; expiresAt: number } | null {
  try {
    const secret = sessionSecret();
    if (!secret) return null;
    const separator = token.lastIndexOf(".");
    if (separator <= 0) return null;
    const payload = token.slice(0, separator);
    const supplied = Buffer.from(token.slice(separator + 1), "base64url");
    const expected = createHmac("sha256", secret).update(payload).digest();
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      userId?: unknown;
      expiresAt?: unknown;
    };
    if (
      typeof decoded.userId !== "string" ||
      typeof decoded.expiresAt !== "number" ||
      decoded.expiresAt <= Date.now()
    ) return null;
    return { userId: decoded.userId, expiresAt: decoded.expiresAt };
  } catch {
    return null;
  }
}

async function importLegacyHistory(userId: string, legacyUserId: string): Promise<boolean> {
  const [store, separateHistory] = await Promise.all([
    readLegacyStore(),
    readPrivateBlobJson<{ items?: LegacyHistory[] }>(HISTORY_PATH(legacyUserId)),
  ]);
  if (!store || !separateHistory.ok) return false;

  const separateItems = Array.isArray(separateHistory.value?.items)
    ? separateHistory.value.items
    : [];
  const items = [
    ...store.history.filter((item) => item.userId === legacyUserId),
    ...separateItems,
  ];
  const deduplicated = new Map<string, LegacyHistory>();
  for (const item of items) {
    if (!item.movieSlug || !item.movieTitle || !item.episodeName) continue;
    const key = `${item.movieSlug}::${item.episodeSlug || item.episodeName}`;
    const previous = deduplicated.get(key);
    if (!previous || (item.updatedAt || "") > (previous.updatedAt || "")) {
      deduplicated.set(key, item);
    }
  }

  if (deduplicated.size) {
    await prisma.watchHistory.createMany({
      data: [...deduplicated.values()].map((item) => {
        const timestamp = item.updatedAt ? Date.parse(item.updatedAt) : Number.NaN;
        const updatedAt = Number.isFinite(timestamp) ? new Date(timestamp) : new Date();
        return {
          id: randomBytes(12).toString("hex"),
          userId,
          movieSlug: item.movieSlug.slice(0, 180),
          movieTitle: item.movieTitle.slice(0, 240),
          posterUrl: item.posterUrl || null,
          episodeName: item.episodeName.slice(0, 100),
          episodeSlug: item.episodeSlug || null,
          progressSeconds: Math.max(0, Math.min(86400, Math.floor(Number(item.progressSeconds) || 0))),
          totalDurationSeconds: Math.max(0, Math.min(86400, Math.floor(Number(item.totalDurationSeconds) || 0))),
          createdAt: updatedAt,
          updatedAt,
        };
      }),
      skipDuplicates: true,
    });
  }
  return true;
}

async function migrateLegacyUser(legacy: LegacyUser, existingUser?: Awaited<ReturnType<typeof prisma.user.findUnique>>) {
  let user = existingUser || await prisma.user.findUnique({ where: { username: legacy.username } });
  if (!user) {
    try {
      user = await prisma.user.create({
        data: {
          id: legacy.id,
          username: legacy.username,
          // The member UI intentionally uses username + password, not email.
          email: `${legacy.username}.${legacy.id.slice(0, 8)}@members.giaptran.invalid`,
          name: legacy.name || legacy.username,
          passwordHash: legacy.passwordHash,
          createdAt: legacy.createdAt ? new Date(legacy.createdAt) : new Date(),
        },
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      user = await prisma.user.findUnique({ where: { username: legacy.username } });
      if (!user) throw error;
    }
  }

  if (!user) throw new Error("Không thể chuyển tài khoản cũ sang database.");
  if (!user.legacyHistoryMigratedAt) {
    const imported = await importLegacyHistory(user.id, legacy.id);
    if (imported) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { legacyHistoryMigratedAt: new Date() },
      });
    }
  }
  return user;
}

async function ensureLegacyMigrationForUser(user: Awaited<ReturnType<typeof prisma.user.findUnique>>) {
  if (!user || user.legacyHistoryMigratedAt) return user;
  const store = await readLegacyStore();
  if (!store) return user;
  const legacy = store.users.find((item) => item.username === user.username);
  if (legacy) return migrateLegacyUser(legacy, user);
  return prisma.user.update({
    where: { id: user.id },
    data: { legacyHistoryMigratedAt: new Date() },
  });
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

export function validUsername(username: string) {
  return /^[\p{L}\p{N}@]{3,20}$/u.test(username);
}

export async function createMemberSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await prisma.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000),
    },
  });
  return token;
}

export async function getMemberFromRequest(request: NextRequest) {
  const token = request.cookies.get(MEMBER_SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = hashSessionToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (session && session.expiresAt.getTime() > Date.now()) {
    return ensureLegacyMigrationForUser(session.user);
  }
  if (session) {
    await prisma.session.deleteMany({ where: { tokenHash } });
  }

  // One-time compatibility for sessions created by the previous Blob versions.
  const store = await readLegacyStore();
  if (!store) return null;
  const oldStoredSession = store.sessions.find(
    (item) => item.tokenHash === tokenHash && Date.parse(item.expiresAt) > Date.now(),
  );
  const signedSession = readLegacySignedSession(token);
  const legacyUserId = oldStoredSession?.userId || signedSession?.userId;
  if (!legacyUserId) return null;
  const legacyUser = store.users.find((item) => item.id === legacyUserId);
  if (!legacyUser) return null;
  const user = await migrateLegacyUser(legacyUser);
  const expiresAt = oldStoredSession
    ? new Date(oldStoredSession.expiresAt)
    : new Date(signedSession!.expiresAt);
  await prisma.session.upsert({
    where: { tokenHash },
    create: { tokenHash, userId: user.id, expiresAt },
    update: { userId: user.id, expiresAt },
  });
  return user;
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

export function publicMember(user: { id: string; username: string; email?: string | null; name?: string | null }) {
  return { id: user.id, username: user.username, email: user.email || "", name: user.name || user.username };
}

export async function registerMember(username: string, passwordHash: string) {
  const existing = await findMember(username);
  if (existing) throw new Error("USERNAME_TAKEN");
  try {
    return await prisma.user.create({
      data: {
        username,
        email: `${username}.${randomBytes(4).toString("hex")}@members.giaptran.invalid`,
        name: username,
        passwordHash,
        legacyHistoryMigratedAt: new Date(),
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new Error("USERNAME_TAKEN");
    throw error;
  }
}

export async function findMember(username: string) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return ensureLegacyMigrationForUser(existing);
  const store = await readLegacyStore();
  const legacy = store?.users.find((item) => item.username === username);
  return legacy ? migrateLegacyUser(legacy) : null;
}

export async function deleteMemberSession(token?: string | null) {
  if (!token) return;
  await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
}

export async function getMemberHistory(userId: string) {
  return prisma.watchHistory.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });
}

export async function saveMemberHistoryBatch(userId: string, inputs: MemberHistoryInput[]) {
  const operations = inputs.map((input) => prisma.watchHistory.upsert({
    where: {
      userId_movieSlug_episodeName: {
        userId,
        movieSlug: input.movieSlug,
        episodeName: input.episodeName,
      },
    },
    update: {
      movieTitle: input.movieTitle,
      posterUrl: input.posterUrl,
      episodeSlug: input.episodeSlug,
      progressSeconds: input.progressSeconds,
      totalDurationSeconds: input.totalDurationSeconds,
    },
    create: {
      userId,
      movieSlug: input.movieSlug,
      movieTitle: input.movieTitle,
      posterUrl: input.posterUrl,
      episodeName: input.episodeName,
      episodeSlug: input.episodeSlug,
      progressSeconds: input.progressSeconds,
      totalDurationSeconds: input.totalDurationSeconds,
    },
  }));
  return prisma.$transaction(operations);
}

export async function saveMemberHistory(userId: string, input: MemberHistoryInput) {
  const [item] = await saveMemberHistoryBatch(userId, [input]);
  return item;
}
