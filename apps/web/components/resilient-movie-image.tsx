"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useMemo, useState } from "react";

type ResilientMovieImageProps = Omit<ImageProps, "src" | "alt" | "onError"> & {
  sources: Array<string | null | undefined>;
  fallbackSrc: string;
  alt: string;
};

/**
 * Tries every distinct movie-art URL in order, then displays the local fallback.
 * Remote sources are loaded directly in the browser to avoid failures in the
 * Next.js image optimizer when a third-party movie CDN blocks server requests.
 */
export function ResilientMovieImage({
  sources,
  fallbackSrc,
  alt,
  ...imageProps
}: ResilientMovieImageProps) {
  const sourceKey = sources.filter(Boolean).join("\n");
  const candidates = useMemo(
    () => Array.from(new Set(
      sources
        .filter((source): source is string => typeof source === "string")
        .map((source) => source.trim())
        .filter((source) => /^https?:\/\//i.test(source)),
    )),
    // sourceKey represents the ordered source list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sourceKey],
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setAttempt(0);
  }, [sourceKey]);

  const usingFallback = attempt >= candidates.length;
  const src = usingFallback ? fallbackSrc : (candidates[attempt] ?? fallbackSrc);

  return (
    <Image
      {...imageProps}
      src={src}
      alt={alt}
      unoptimized={!usingFallback}
      onError={() => {
        if (!usingFallback) setAttempt((current) => current + 1);
      }}
    />
  );
}
