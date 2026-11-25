"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

type ResilientMovieImageProps = {
  sources: Array<string | null | undefined>;
  fallbackSrc: string;
  alt: string;
  fill?: boolean;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
  loading?: "eager" | "lazy";
  sizes?: string;
  quality?: number;
};

/**
 * Follow the image-loading strategy used by giap211/rophim:
 * Next Image with unoptimized enabled, remotePatterns allowlisting and
 * browser-native lazy loading. This deliberately bypasses the Next image
 * optimizer because movie CDN URLs often reject optimizer requests.
 */
export function ResilientMovieImage({
  sources,
  fallbackSrc,
  alt,
  fill = false,
  className,
  style,
  priority = false,
  loading,
  sizes = "100vw",
  quality = 75,
}: ResilientMovieImageProps) {
  const sourceKey = sources.filter(Boolean).join("\n");
  const candidates = useMemo(
    () =>
      Array.from(
        new Set(
          sources
            .filter((source): source is string => typeof source === "string")
            .map((source) => source.trim())
            .map((source) =>
              source.startsWith("//")
                ? `https:${source}`
                : source.startsWith("http://")
                  ? `https://${source.slice(7)}`
                  : source,
            )
            .filter((source) => /^(https:\/\/|\/)/i.test(source)),
        ),
      ),
    // sourceKey represents the ordered source list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sourceKey],
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setAttempt(0);
  }, [sourceKey]);

  const usingFallback = attempt >= candidates.length;
  const src = usingFallback ? fallbackSrc : candidates[attempt] || fallbackSrc;

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      sizes={sizes}
      quality={quality}
      unoptimized
      priority={priority}
      loading={priority ? "eager" : loading ?? "lazy"}
      className={className}
      style={style}
      onError={() => {
        if (!usingFallback) setAttempt((current) => current + 1);
      }}
    />
  );
}
