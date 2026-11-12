import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE = "https://api.opensubtitles.com/api/v1";
const USER_AGENT = "PhimLau/1.0";

function apiHeaders(json = false): HeadersInit {
  const apiKey = process.env.OPEN_SUBTITLES_API_KEY;
  const token = process.env.OPEN_SUBTITLES_TOKEN;
  return {
    Accept: "application/json",
    "Api-Key": apiKey || "",
    "User-Agent": USER_AGENT,
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.OPEN_SUBTITLES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Thiếu OPEN_SUBTITLES_API_KEY trong biến môi trường máy chủ." },
      { status: 503 },
    );
  }

  const params = request.nextUrl.searchParams;
  const title = (params.get("title") || "").trim().slice(0, 160);
  const year = params.get("year");
  const tmdbId = params.get("tmdbId");
  if (!title) return NextResponse.json({ error: "Thiếu tên phim." }, { status: 400 });

  const query = new URLSearchParams();
  query.set("languages", "vi");
  query.set("type", "movie");
  if (tmdbId && /^\d+$/.test(tmdbId)) query.set("tmdb_id", tmdbId);
  else query.set("query", title.toLowerCase());
  if (year && /^\d{4}$/.test(year)) query.set("year", year);
  query.set("machine_translated", "exclude");

  try {
    const response = await fetch(`${API_BASE}/subtitles?${query.toString()}`, {
      headers: apiHeaders(),
      cache: "no-store",
      redirect: "follow",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        { error: payload?.message || `OpenSubtitles trả về HTTP ${response.status}` },
        { status: response.status === 403 ? 502 : response.status },
      );
    }

    const subtitles = (Array.isArray(payload?.data) ? payload.data : [])
      .flatMap((item: any) => {
        const attributes = item?.attributes || {};
        const feature = attributes.feature_details || {};
        const files = Array.isArray(attributes.files) ? attributes.files : [];
        return files.map((file: any) => ({
          fileId: Number(file.file_id),
          fileName: String(file.file_name || ""),
          language: String(attributes.language || ""),
          release: String(attributes.release || ""),
          downloads: Number(attributes.download_count || 0),
          trusted: Boolean(attributes.from_trusted),
          aiTranslated: Boolean(attributes.ai_translated),
          movieTitle: String(feature.title || feature.movie_name || ""),
          year: Number(feature.year || 0),
        }));
      })
      .filter((item: any) =>
        Number.isSafeInteger(item.fileId) &&
        item.fileId > 0 &&
        item.language === "vi" &&
        /\.(srt|vtt|ass)$/i.test(item.fileName),
      )
      .sort((a: any, b: any) =>
        Number(b.trusted) - Number(a.trusted) ||
        b.downloads - a.downloads,
      )
      .slice(0, 12);

    return NextResponse.json({ subtitles });
  } catch {
    return NextResponse.json({ error: "Không kết nối được OpenSubtitles." }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPEN_SUBTITLES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Thiếu OPEN_SUBTITLES_API_KEY trong biến môi trường máy chủ." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const fileId = Number(body?.fileId);
  if (!Number.isSafeInteger(fileId) || fileId <= 0) {
    return NextResponse.json({ error: "Mã file phụ đề không hợp lệ." }, { status: 400 });
  }

  try {
    const response = await fetch(`${API_BASE}/download`, {
      method: "POST",
      headers: apiHeaders(true),
      body: JSON.stringify({ file_id: fileId, sub_format: "srt" }),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || typeof payload?.link !== "string") {
      return NextResponse.json(
        { error: payload?.message || `Không lấy được link phụ đề (HTTP ${response.status}).` },
        { status: response.status === 403 ? 502 : response.status },
      );
    }

    const fileResponse = await fetch(payload.link, { cache: "no-store", redirect: "follow" });
    if (!fileResponse.ok) {
      return NextResponse.json({ error: "Link phụ đề đã hết hạn hoặc không tải được." }, { status: 502 });
    }
    const content = await fileResponse.text();
    if (!content.trim() || content.length > 3_000_000) {
      return NextResponse.json({ error: "File phụ đề rỗng hoặc vượt quá dung lượng cho phép." }, { status: 422 });
    }

    return NextResponse.json({ content, fileName: payload.file_name || "subtitle.srt" });
  } catch {
    return NextResponse.json({ error: "Lỗi khi tải file phụ đề." }, { status: 502 });
  }
}
