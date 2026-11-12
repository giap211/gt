
import { NextResponse } from "next/server";

export const revalidate = 86400;

type TmdbImage = {
  file_path?: string;
  filePath?: string;
  url?: string;
  type?: string;
  image_type?: string;
  aspect_ratio?: number;
  width?: number;
  height?: number;
};

type ImagesResponse = {
  data?: {
    image_sizes?: {
      backdrop?: {
        w1280?: string;
        original?: string;
      };
    };
    images?: TmdbImage[];
  };
};

function isTmdbImageUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "image.tmdb.org" &&
      url.pathname.startsWith("/t/p/")
    );
  } catch {
    return false;
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  if (!slug || !/^[a-z0-9-]{1,180}$/i.test(slug)) {
    return NextResponse.json({ backdropUrl: null }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://phimapi.com/v1/api/phim/${encodeURIComponent(slug)}/images`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate },
      },
    );

    if (!response.ok) {
      return NextResponse.json({ backdropUrl: null });
    }

    const payload = (await response.json()) as ImagesResponse;
    const data = payload.data;
    const images = Array.isArray(data?.images) ? data.images : [];

    const backdropImages = images.filter((image) => {
      const type = (
        image.type ||
        image.image_type ||
        ""
      ).toLowerCase();

      if (type) return type.includes("backdrop");

      const ratio =
        image.aspect_ratio ||
        (image.width && image.height
          ? image.width / image.height
          : 0);

      return ratio >= 1.3;
    });

    const image = backdropImages[0];

    const rawPath =
      image?.file_path ||
      image?.filePath ||
      image?.url ||
      "";

    const sizes = data?.image_sizes?.backdrop;
    const base = sizes?.w1280 || sizes?.original || "";

    let backdropUrl: string | null = null;

    if (rawPath.startsWith("https://") && isTmdbImageUrl(rawPath)) {
      backdropUrl = rawPath;
    } else if (
      rawPath.startsWith("/") &&
      base.startsWith("https://image.tmdb.org/t/p/")
    ) {
      backdropUrl = `${base.replace(/\/$/, "")}${rawPath}`;
    }

    if (backdropUrl && !isTmdbImageUrl(backdropUrl)) {
      backdropUrl = null;
    }

    return NextResponse.json(
      { backdropUrl },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { backdropUrl: null },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  }
}
