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
 * Remote sources use the same-origin proxy for reliable CDN access, then Next.js
 * image optimization to resize and encode the result for the requesting device.
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
  const remoteSrc = candidates[attempt] ?? fallbackSrc;
  // Serve remote poster artwork through our same-origin image proxy. This
  // avoids browser hotlink/CORS failures on movie CDNs while retaining the
  // ordered retry behavior when a source itself is unavailable.
  const src = usingFallback
    ? fallbackSrc
    : `/api/refraction-image?url=${encodeURIComponent(remoteSrc)}`;

  return (
    <Image
      {...imageProps}
      src={src}
      alt={alt}
      onError={() => {
        if (!usingFallback) setAttempt((current) => current + 1);
      }}
    />
  );
}
