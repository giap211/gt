import { NextResponse } from "next/server";

export const revalidate = 86400;

type WikipediaResponse = {
  query?: {
    pages?: Record<string, { thumbnail?: { source?: string } }>;
  };
};

async function findActorImage(name: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: name,
      gsrnamespace: "0",
      gsrlimit: "1",
      prop: "pageimages",
      piprop: "thumbnail",
      pithumbsize: "500",
      format: "json",
      origin: "*",
    });

    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "GiapTranMovieSite/1.0 (actor portrait lookup)",
        },
        next: { revalidate },
      },
    );

    if (!response.ok) return null;

    const data = (await response.json()) as WikipediaResponse;
    const pages = Object.values(data.query?.pages || {});
    const imageUrl = pages[0]?.thumbnail?.source;

    if (!imageUrl) return null;
    const image = new URL(imageUrl);
    if (
      image.protocol !== "https:" ||
      image.hostname !== "upload.wikimedia.org"
    ) {
      return null;
    }

    return image.toString();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { names?: unknown };
    const names = Array.isArray(body.names)
      ? body.names
          .filter((name): name is string => typeof name === "string")
          .map((name) => name.trim())
          .filter((name) => name.length > 0 && name.length <= 100)
          .slice(0, 18)
      : [];

    if (names.length === 0) {
      return NextResponse.json({ images: {} });
    }

    const entries = await Promise.all(
      names.map(async (name) => [name, await findActorImage(name)] as const),
    );
    const images = Object.fromEntries(
      entries.filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
    );

    return NextResponse.json(
      { images },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch {
    return NextResponse.json({ images: {} }, { status: 400 });
  }
}
