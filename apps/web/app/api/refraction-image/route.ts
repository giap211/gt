import { NextResponse } from "next/server";

const ALLOWED_HOSTS = [
  "phimimg.com",
  "image.tmdb.org",
  "ophim.cc",
  "ophim.live",
  "ophim1.com",
  "phimapi.com",
  "nguonc.com",
];

function isAllowedHost(hostname: string) {
  return ALLOWED_HOSTS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  );
}

export async function GET(request: Request) {
  const rawUrl = new URL(request.url).searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ error: "Missing image URL" }, { status: 400 });
  }

  let imageUrl: URL;
  try {
    imageUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
  }

  if (imageUrl.protocol !== "https:" || !isAllowedHost(imageUrl.hostname)) {
    return NextResponse.json({ error: "Image host is not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(imageUrl, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; PhimLauImageProxy/1.0)",
        Referer: `${imageUrl.origin}/`,
      },
      next: { revalidate: 86400 },
      redirect: "error",
    });

    if (!upstream.ok || !upstream.body) {
      return new Response(null, { status: upstream.status || 502 });
    }

    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return new Response(null, { status: 415 });
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
