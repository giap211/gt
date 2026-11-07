import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 1800;

type SearchItem = {
  name?: string;
  origin_name?: string;
  original_name?: string;
  slug?: string;
  year?: string | number;
};

function normalizeTitle(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

async function fetchJson(url: string): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 GiapTran/1.0",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return { ok: false, status: response.status, data: null };
    return { ok: true, status: response.status, data: await response.json() };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

function getSearchItems(payload: any): SearchItem[] {
  const possible = [
    payload?.items,
    payload?.data?.items,
    payload?.data,
    payload?.results,
  ];
  return possible.find(Array.isArray) || [];
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const names = [
    params.get("original_name"),
    params.get("origin_name"),
    params.get("name"),
  ].filter((value): value is string => Boolean(value?.trim()));
  const expectedYear = Number(params.get("year")) || 0;

  if (!names.length) {
    return NextResponse.json({ episodes: [], reason: "missing-title" }, { status: 400 });
  }

  const normalizedNames = Array.from(new Set(names.map(normalizeTitle).filter(Boolean)));
  const normalizedOriginalNames = new Set(
    [params.get("original_name"), params.get("origin_name")]
      .map(normalizeTitle)
      .filter(Boolean),
  );

  const searches = await Promise.all(
    names.map(async (name) => {
      const result = await fetchJson(
        `https://phim.nguonc.com/api/films/search?keyword=${encodeURIComponent(name)}&page=1`,
      );
      return result.ok ? getSearchItems(result.data) : [];
    }),
  );

  const candidates = new Map<string, { item: SearchItem; score: number }>();
  for (const item of searches.flat()) {
    if (!item?.slug) continue;
    const itemOriginalNames = [item.original_name, item.origin_name]
      .map(normalizeTitle)
      .filter(Boolean);
    const itemNames = [item.original_name, item.origin_name, item.name]
      .map(normalizeTitle)
      .filter(Boolean);
    const originalMatch = itemOriginalNames.some((name) => normalizedOriginalNames.has(name));
    const titleMatch = itemNames.some((name) => normalizedNames.includes(name));
    if (!originalMatch && !titleMatch) continue;

    const itemYear = Number(item.year) || 0;
    if (expectedYear && itemYear && expectedYear !== itemYear) continue;

    const score =
      (originalMatch ? 20 : 0) +
      (titleMatch ? 10 : 0) +
      (expectedYear && itemYear === expectedYear ? 5 : itemYear === 0 ? 1 : 0);
    const previous = candidates.get(item.slug);
    if (!previous || score > previous.score) candidates.set(item.slug, { item, score });
  }

  const matchedSlug = Array.from(candidates.entries())
    .sort((a, b) => b[1].score - a[1].score)[0]?.[0];

  if (!matchedSlug) {
    return NextResponse.json({
      episodes: [],
      reason: searches.some((items) => items.length) ? "no-title-match" : "search-empty-or-failed",
      searchedNames: names,
      searchResultCounts: searches.map((items) => items.length),
    });
  }

  const detail = await fetchJson(
    `https://phim.nguonc.com/api/film/${encodeURIComponent(matchedSlug)}`,
  );
  if (!detail.ok) {
    return NextResponse.json({
      episodes: [],
      reason: detail.status ? `detail-http-${detail.status}` : "detail-fetch-failed",
      matchedSlug,
    });
  }

  const movie = detail.data?.movie || detail.data?.data?.movie || detail.data?.data || null;
  const groups = Array.isArray(movie?.episodes) ? movie.episodes : [];
  if (!groups.length) {
    return NextResponse.json({ episodes: [], reason: "detail-has-no-episodes", matchedSlug });
  }

  const categories = Array.isArray(movie?.category) ? movie.category : [];
  const isAdult = categories.some((group: any) =>
    (Array.isArray(group?.list) ? group.list : []).some((category: any) =>
      /18\s*\+|phim\s*18|người\s*lớn|adult/i.test(
        `${category?.name || ""} ${category?.slug || ""}`,
      ),
    ),
  );
  if (isAdult) {
    return NextResponse.json({ episodes: [], reason: "adult-category", matchedSlug });
  }

  const serverData = groups.flatMap((group: any) =>
    (Array.isArray(group?.items) ? group.items : []).flatMap((episode: any) => {
      const embed = episode?.embed || episode?.link_embed || episode?.url || "";
      const m3u8 = episode?.m3u8 || episode?.link_m3u8 || "";
      if (!embed && !m3u8) return [];
      const episodeSlug = String(episode?.slug || episode?.name || "tap-unknown");
      return [{
        name: String(episode?.name || episodeSlug),
        slug: episodeSlug,
        filename: String(episode?.name || ""),
        link_embed: String(embed),
        link_m3u8: String(m3u8),
      }];
    }),
  );

  const uniqueEpisodes = Array.from(
    new Map(serverData.map((episode: any) => [episode.slug, episode])).values(),
  );

  if (!uniqueEpisodes.length) {
    return NextResponse.json({ episodes: [], reason: "matched-movie-but-no-playable-links", matchedSlug });
  }

  return NextResponse.json({
    episodes: [{ server_name: "Dự phòng", server_data: uniqueEpisodes }],
    reason: "ok",
    matchedSlug,
    episodeCount: uniqueEpisodes.length,
  });
}
