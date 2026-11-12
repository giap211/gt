"use client";

const RENDER_API_BASE_URL = "https://rophim-server.onrender.com";
const BACKEND_PROXY_BASE_URL = "/api/backend";

export interface MemberUser {
  id: string;
  username: string;
  email: string;
  name: string;
}

export interface FavoriteItem {
  id: string;
  movieSlug: string;
  movieTitle: string;
  posterUrl?: string;
  createdAt: string;
}

export interface CommentItem {
  id: string;
  movieSlug: string;
  movieTitle: string;
  body: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
}

export const WATCH_HISTORY_UPDATED_EVENT = "gt:watch-history-updated";

export interface WatchHistoryItem {
  id: string;
  movieSlug: string;
  movieTitle: string;
  posterUrl?: string;
  episodeName: string;
  episodeSlug?: string;
  progressSeconds: number;
  totalDurationSeconds?: number;
  updatedAt: string;
}

export interface MoviePayload {
  movieSlug: string;
  movieTitle: string;
  posterUrl?: string;
}

export const memberApiBaseUrl = () => {
  const configuredUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost") {
      return configuredUrl?.replace(/\/$/, "") || "http://localhost:3001";
    }

    return BACKEND_PROXY_BASE_URL;
  }

  return configuredUrl?.replace(/\/$/, "") || RENDER_API_BASE_URL;
};

// Local storage fallback helpers for instant zero-latency experience
const STORAGE_KEYS = {
  USER: "rophim_member_current_user",
  ACCOUNTS: "rophim_member_accounts",
  FAVORITES: "rophim_member_favorites",
  HISTORY: "rophim_member_history",
  COMMENTS: "rophim_member_comments",
};

const getLocalItem = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const setLocalItem = <T>(key: string, value: T): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const url = path.startsWith("/api/") ? path : `${memberApiBaseUrl()}${path}`;
    const response = await fetch(url, {
      ...init,
      credentials: "include",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw Object.assign(
        new Error(payload?.message || "Không thể kết nối tài khoản thành viên"),
        { status: response.status },
      );
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const memberClient = {
  async me(): Promise<{ user: MemberUser | null }> {
    try {
      return await request<{ user: MemberUser | null }>("/api/auth/me");
    } catch {
      // Không giả lập trạng thái đăng nhập từ localStorage.
      return { user: null };
    }
  },

  async register(input: { username: string; password: string }): Promise<{ user: MemberUser }> {
    const previousUser = getLocalItem<MemberUser | null>(STORAGE_KEYS.USER, null);
    const res = await request<{ user: MemberUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setLocalItem(STORAGE_KEYS.USER, res.user);
    const canImportHistory =
      !previousUser ||
      previousUser.id === "usr_guest" ||
      previousUser.username?.toLowerCase() === res.user.username.toLowerCase();
    if (canImportHistory) {
      try {
        await this.syncLocalHistoryToAccount(res.user.username);
        await this.syncLocalFavoritesToAccount();
      } catch (error) {
        console.warn("[Member] Chưa thể đồng bộ lịch sử xem cũ:", error);
      }
    }
    return res;
  },

  async login(input: { username: string; password: string }): Promise<{ user: MemberUser }> {
    const previousUser = getLocalItem<MemberUser | null>(STORAGE_KEYS.USER, null);
    const res = await request<{ user: MemberUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setLocalItem(STORAGE_KEYS.USER, res.user);
    const canImportHistory =
      !previousUser ||
      previousUser.id === "usr_guest" ||
      previousUser.username?.toLowerCase() === res.user.username.toLowerCase();
    if (canImportHistory) {
      await this.syncLocalHistoryToAccount(res.user.username);
      await this.syncLocalFavoritesToAccount();
    }
    return res;
  },

  async syncLocalFavoritesToAccount(): Promise<void> {
    const localFavorites = getLocalItem<FavoriteItem[]>(STORAGE_KEYS.FAVORITES, []);
    if (!localFavorites.length) return;
    await request<{ ok: true }>("/api/member/favorites", {
      method: "POST",
      body: JSON.stringify({
        items: localFavorites.slice(0, 100).map((item) => ({
          movieSlug: item.movieSlug,
          movieTitle: item.movieTitle,
          posterUrl: item.posterUrl,
        })),
      }),
    });
  },

  async syncLocalHistoryToAccount(accountUsername: string): Promise<void> {
    const localUser = getLocalItem<MemberUser | null>(STORAGE_KEYS.USER, null);
    if (!localUser || localUser.username.toLowerCase() !== accountUsername.toLowerCase()) return;

    const localHistory = getLocalItem<WatchHistoryItem[]>(STORAGE_KEYS.HISTORY, []);
    if (!localHistory.length) return;

    await request<{ items: unknown[] }>("/api/member/history", {
      method: "POST",
      body: JSON.stringify({
        items: localHistory.slice(0, 50).map((item) => ({
          movieSlug: item.movieSlug,
          movieTitle: item.movieTitle,
          posterUrl: item.posterUrl,
          episodeName: item.episodeName,
          episodeSlug: item.episodeSlug,
          progressSeconds: item.progressSeconds,
          totalDurationSeconds: item.totalDurationSeconds,
        })),
      }),
    });
    setLocalItem(STORAGE_KEYS.HISTORY, []);
  },

  async logout(): Promise<{ ok: true }> {
    try {
      await request<{ ok: true }>("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
    return { ok: true };
  },

  async toggleFavorite(input: MoviePayload): Promise<{ favorited: boolean }> {
    try {
      const res = await request<{ favorited: boolean }>("/api/member/favorites/toggle", {
        method: "POST",
        body: JSON.stringify(input),
      });
      return res;
    } catch (error) {
      if ((error as { status?: number })?.status !== 401) throw error;
      const list = getLocalItem<FavoriteItem[]>(STORAGE_KEYS.FAVORITES, []);
      const index = list.findIndex((f) => f.movieSlug === input.movieSlug);
      const favorited = index < 0;
      if (favorited) {
        list.unshift({
          id: `fav_${Date.now().toString(36)}`,
          movieSlug: input.movieSlug,
          movieTitle: input.movieTitle,
          posterUrl: input.posterUrl,
          createdAt: new Date().toISOString(),
        });
      } else {
        list.splice(index, 1);
      }
      setLocalItem(STORAGE_KEYS.FAVORITES, list);
      return { favorited };
    }
  },

  async saveFavorite(input: MoviePayload): Promise<{ favorited: boolean }> {
    try {
      return await request<{ favorited: boolean }>("/api/member/favorites", {
        method: "POST",
        body: JSON.stringify(input),
      });
    } catch (error) {
      if ((error as { status?: number })?.status !== 401) throw error;
      const list = getLocalItem<FavoriteItem[]>(STORAGE_KEYS.FAVORITES, []);
      if (!list.some((item) => item.movieSlug === input.movieSlug)) {
        list.unshift({
          id: `fav_${Date.now().toString(36)}`,
          movieSlug: input.movieSlug,
          movieTitle: input.movieTitle,
          posterUrl: input.posterUrl,
          createdAt: new Date().toISOString(),
        });
        setLocalItem(STORAGE_KEYS.FAVORITES, list);
      }
      return { favorited: true };
    }
  },

  async favorites(): Promise<{ items: FavoriteItem[] }> {
    try {
      return await request<{ items: FavoriteItem[] }>("/api/member/favorites", { cache: "no-store" });
    } catch (error) {
      if ((error as { status?: number })?.status !== 401) throw error;
      const items = getLocalItem<FavoriteItem[]>(STORAGE_KEYS.FAVORITES, []);
      return { items };
    }
  },

  async history(): Promise<{ items: WatchHistoryItem[] }> {
    return await request<{ items: WatchHistoryItem[] }>("/api/member/history", { cache: "no-store" });
  },

  async comments(movieSlug: string): Promise<{ items: CommentItem[] }> {
    try {
      return await request<{ items: CommentItem[] }>(
        `/member/comments?movieSlug=${encodeURIComponent(movieSlug)}`,
      );
    } catch {
      const allComments = getLocalItem<CommentItem[]>(STORAGE_KEYS.COMMENTS, []);
      const items = allComments.filter((c) => c.movieSlug === movieSlug);
      return { items };
    }
  },

  async createComment(input: MoviePayload & { body: string }): Promise<{ item: CommentItem }> {
    try {
      return await request<{ item: CommentItem }>("/member/comments", {
        method: "POST",
        body: JSON.stringify(input),
      });
    } catch {
      const currentUser = getLocalItem<MemberUser | null>(STORAGE_KEYS.USER, {
        id: "usr_guest",
        username: "khach",
        email: "",
        name: "Thành viên Xem phim",
      });
      const newComment: CommentItem = {
        id: `cmt_${Date.now().toString(36)}`,
        movieSlug: input.movieSlug,
        movieTitle: input.movieTitle,
        body: input.body,
        createdAt: new Date().toISOString(),
        user: {
          id: currentUser?.id || "usr_guest",
          name: currentUser?.name || "Thành viên Xem phim",
        },
      };
      const all = getLocalItem<CommentItem[]>(STORAGE_KEYS.COMMENTS, []);
      all.unshift(newComment);
      setLocalItem(STORAGE_KEYS.COMMENTS, all);
      return { item: newComment };
    }
  },

  async saveHistory(
    input: MoviePayload & { episodeName: string; episodeSlug?: string; progressSeconds?: number; totalDurationSeconds?: number },
  ): Promise<{ item: WatchHistoryItem }> {
    const result = await request<{ item: WatchHistoryItem }>("/api/member/history", {
      method: "POST",
      body: JSON.stringify(input),
    });

    // Notify mounted screens immediately after the database confirms the save.
    if (typeof window !== "undefined" && result.item) {
      window.dispatchEvent(new CustomEvent<WatchHistoryItem>(
        WATCH_HISTORY_UPDATED_EVENT,
        { detail: result.item },
      ));
    }

    return result;
  },
};

