import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE = "https://api.subdl.com/api/v2";
const MAX_SUBTITLE_BYTES = 3_000_000;

function subdlHeaders(): HeadersInit {
  const apiKey = process.env.SUBDL_API_KEY;
  return {
    Accept: "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

function subtitleError(message: string, status = 502) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.SUBDL_API_KEY;
  if (!apiKey) {
    return subtitleError("Thiếu SUBDL_API_KEY trong biến môi trường máy chủ.", 503);
  }

  const params = request.nextUrl.searchParams;
  const title = (params.get("title") || "").trim().slice(0, 160);
  const year = params.get("year") || "";
  const tmdbId = params.get("tmdbId") || "";
  const mediaType = params.get("type") === "tv" ? "tv" : "movie";
  const season = params.get("season") || "";
  const episode = params.get("episode") || "";

  if (!title && !/^\d+$/.test(tmdbId)) {
    return subtitleError("Cần tên phim hoặc TMDB ID để tìm phụ đề.", 400);
  }

  const query = new URLSearchParams({
    languages: "vi",
    unpack: "1",
    subs_per_page: "20",
  });
  if (/^\d+$/.test(tmdbId)) {
    query.set("tmdb_id", tmdbId);
    query.set("type", mediaType);
  } else {
    query.set("film_name", title);
    query.set("type", mediaType);
  }
  if (/^\d{4}$/.test(year)) query.set("year", year);
  if (mediaType === "tv") {
    if (/^\d+$/.test(season)) query.set("season", season);
    if (/^\d+$/.test(episode)) query.set("episode", episode);
  }

  try {
    const response = await fetch(`${API_BASE}/subtitles/search?${query.toString()}`, {
      headers: subdlHeaders(),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload?.error?.message || payload?.message || `SubDL trả về HTTP ${response.status}`;
      return subtitleError(message, response.status === 401 || response.status === 403 ? 502 : response.status);
    }

    if (payload?.status === false) {
      return subtitleError(String(payload?.error || "SubDL không tìm thấy dữ liệu phù hợp."), 502);
    }

    const rawSubtitles = Array.isArray(payload?.subtitles) ? payload.subtitles : [];
    const subtitles = rawSubtitles.flatMap((item: any) => {
      const parentLanguage = String(item?.lang || item?.language || item?.language_name || "").trim();
      const parentNId = String(item?.n_id || item?.nId || item?.id || "");
      const unpacked = Array.isArray(item?.unpack_files) ? item.unpack_files : [];
      const files = unpacked.length ? unpacked : [item];

      return files.map((file: any) => {
        const rawUrl = typeof file?.url === "string" ? file.url : (typeof item?.url === "string" ? item.url : "");
        const urlMatch = rawUrl.match(/\/subtitle\/([^/?#]+)(?:\/([^/?#]+))?/i);
        const nId = parentNId || String(urlMatch?.[1] || "");
        const fileNId = String(file?.file_n_id || file?.fileNId || urlMatch?.[2] || "");
        const fileName = String(file?.name || item?.name || item?.release_name || "subtitle.srt");
        const extension = fileName.match(/\.([a-z0-9]{2,5})(?:$|[?#])/i)?.[1] || "";
        const format = String(file?.format || extension || "").toLowerCase();
        const language = String(file?.language || file?.lang || file?.language_name || parentLanguage).trim();
        const downloadUrl = rawUrl
          ? (rawUrl.startsWith("/") ? new URL(rawUrl, "https://dl.subdl.com").toString() : rawUrl)
          : "";
        return {
          nId,
          fileNId,
          downloadUrl,
          label: String(file?.release_name || item?.release_name || fileName),
          fileName,
          language,
          format,
        };
      });
    })
      .filter((item: any) => {
        const validId = /^[a-zA-Z0-9_-]{1,100}$/.test(item.nId);
        const validFileId = !item.fileNId || /^[a-zA-Z0-9_-]{1,100}$/.test(item.fileNId);
        // The search request already asks SubDL for Vietnamese. Some v2 records omit
        // per-file language metadata, so only reject an explicit non-Vietnamese value.
        const normalizedLanguage = item.language.toLowerCase().replace(/[\s_-]/g, "");
        const isVietnamese = !normalizedLanguage ||
          /^(vi|vie|vietnamese|vietnam)$/.test(normalizedLanguage);
        const validFormat = /^(srt|vtt|ass|ssa)$/.test(item.format);
        const validUrl = !item.downloadUrl || /^https:\/\/(?:dl|api)\.subdl\.com\//i.test(item.downloadUrl);
        return validId && validFileId && isVietnamese && validFormat && validUrl;
      })
      .slice(0, 20);

    return NextResponse.json({ subtitles, provider: "SubDL" });
  } catch {
    return subtitleError("Không kết nối được SubDL.", 502);
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.SUBDL_API_KEY;
  if (!apiKey) {
    return subtitleError("Thiếu SUBDL_API_KEY trong biến môi trường máy chủ.", 503);
  }

  const body = await request.json().catch(() => null);
  const nId = String(body?.nId || "");
  const fileNId = String(body?.fileNId || "");
  const rawDownloadUrl = typeof body?.downloadUrl === "string" ? body.downloadUrl : "";
  if (!/^[a-zA-Z0-9_-]{4,80}$/.test(nId) ||
      (fileNId && !/^[a-zA-Z0-9_-]{1,100}$/.test(fileNId))) {
    return subtitleError("Mã phụ đề SubDL không hợp lệ.", 400);
  }

  try {
    let targetUrl = `${API_BASE}/subtitles/${encodeURIComponent(nId)}/download?format=file`;
    if (fileNId) {
      if (rawDownloadUrl) {
        const parsed = new URL(rawDownloadUrl.startsWith("/") ? new URL(rawDownloadUrl, "https://dl.subdl.com").toString() : rawDownloadUrl);
        if (!["dl.subdl.com", "api.subdl.com", "subdl.com"].includes(parsed.hostname)) {
          return subtitleError("SubDL trả về host tải file không hợp lệ.");
        }
        targetUrl = parsed.toString();
      } else {
        targetUrl = `https://dl.subdl.com/subtitle/${encodeURIComponent(nId)}/${encodeURIComponent(fileNId)}`;
      }
    }
    const response = await fetch(targetUrl, {
      headers: subdlHeaders(),
      cache: "no-store",
      redirect: "follow",
    });

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      return subtitleError(payload?.error?.message || `Không tải được phụ đề từ SubDL (HTTP ${response.status}).`, response.status);
    }

    let content = "";
    let fileName = "subtitle.srt";
    if (contentType.includes("application/json")) {
      const payload = await response.json().catch(() => null);
      if (typeof payload?.content === "string") {
        content = payload.content;
      } else {
        const rawUrl = payload?.url || payload?.download_url || payload?.downloadUrl;
        if (typeof rawUrl !== "string") {
          return subtitleError("SubDL không trả về nội dung hoặc link tải phụ đề.");
        }
        const downloadUrl = rawUrl.startsWith("/")
          ? new URL(rawUrl, "https://dl.subdl.com").toString()
          : rawUrl;
        const parsedUrl = new URL(downloadUrl);
        if (!["dl.subdl.com", "api.subdl.com", "subdl.com"].includes(parsedUrl.hostname)) {
          return subtitleError("SubDL trả về host tải file không hợp lệ.");
        }
        const fileResponse = await fetch(parsedUrl, {
          headers: { Authorization: `Bearer ${apiKey}` },
          cache: "no-store",
          redirect: "follow",
        });
        if (!fileResponse.ok) return subtitleError("Không tải được file phụ đề.");
        content = await fileResponse.text();
        fileName = String(payload?.name || payload?.file_name || fileName);
      }
    } else {
      content = await response.text();
      fileName = response.headers.get("content-disposition")?.match(/filename="?([^";]+)"?/i)?.[1] || fileName;
    }

    if (!content.trim() || content.length > MAX_SUBTITLE_BYTES) {
      return subtitleError("File phụ đề rỗng hoặc vượt quá dung lượng cho phép.", 422);
    }
    return NextResponse.json({ content, fileName });
  } catch {
    return subtitleError("Lỗi khi tải file phụ đề từ SubDL.");
  }
}
