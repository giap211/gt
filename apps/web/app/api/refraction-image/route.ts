const ALLOWED_HOSTS = [
  "phimimg.com",
  "phimapi.com",
  "ophim.cc",
  "ophim.live",
  "ophim1.com",
  "nguonc.com",
  "image.tmdb.org",
];

const CACHE_CONTROL =
  "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800";

function isAllowedImageUrl(url: URL) {
  const hostname = url.hostname.toLowerCase();
  return (
    url.protocol === "https:" &&
    ALLOWED_HOSTS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    )
  );
}

function errorResponse(status: number, message: string) {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: Request) {
  const rawUrl = new URL(request.url).searchParams.get("url");
  if (!rawUrl) return errorResponse(400, "Missing image URL");

  let imageUrl: URL;
  try {
    imageUrl = new URL(rawUrl);
  } catch {
    return errorResponse(400, "Invalid image URL");
  }

  if (!isAllowedImageUrl(imageUrl)) {
    return errorResponse(403, "Image host is not allowed");
  }

  try {
    let currentUrl = imageUrl;
    let upstream: Response | null = null;

    // Some movie CDNs redirect to their actual image host. Follow redirects
    // deliberately and validate every hop to prevent open-proxy/SSRF abuse.
    for (let redirectCount = 0; redirectCount <= 4; redirectCount += 1) {
      upstream = await fetch(currentUrl, {
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
          Referer:
            currentUrl.hostname === "image.tmdb.org"
              ? "https://www.themoviedb.org/"
              : "https://phimapi.com/",
        },
        redirect: "manual",
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(12000),
      });

      if (![301, 302, 303, 307, 308].includes(upstream.status)) break;

      const location = upstream.headers.get("location");
      if (!location || redirectCount === 4) {
        return errorResponse(502, "Image redirect failed");
      }

      const redirectedUrl = new URL(location, currentUrl);
      if (!isAllowedImageUrl(redirectedUrl)) {
        return errorResponse(403, "Image redirect host is not allowed");
      }
      currentUrl = redirectedUrl;
    }

    const imageResponse = upstream;
    if (imageResponse === null) {
      return errorResponse(502, "Image unavailable");
    }
    if (!imageResponse.ok) {
      return errorResponse(imageResponse.status || 502, "Image unavailable");
    }
    const imageBody = imageResponse.body;
    if (imageBody === null) {
      return errorResponse(502, "Image unavailable");
    }

    const contentType = (
      imageResponse.headers.get("content-type") || ""
    ).split(";")[0].trim().toLowerCase();

    const allowedTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
      "image/gif",
      "image/svg+xml",
    ]);

    if (!allowedTypes.has(contentType)) {
      return errorResponse(415, "Upstream response is not a supported image");
    }

    const contentLength = Number(imageResponse.headers.get("content-length") || 0);
    if (contentLength > 20 * 1024 * 1024) {
      return errorResponse(413, "Image is too large");
    }

    const headers = new Headers({
      "Content-Type": contentType,
      "Cache-Control": CACHE_CONTROL,
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "cross-origin",
    });

    if (contentLength > 0) {
      headers.set("Content-Length", String(contentLength));
    }

    const etag = imageResponse.headers.get("etag");
    const lastModified = imageResponse.headers.get("last-modified");
    if (etag) headers.set("ETag", etag);
    if (lastModified) headers.set("Last-Modified", lastModified);

    return new Response(imageBody, { status: 200, headers });
  } catch {
    return errorResponse(502, "Unable to fetch image");
  }
}
