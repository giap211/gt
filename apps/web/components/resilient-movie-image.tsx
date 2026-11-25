"use client";

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
 * Movie artwork is loaded as a normal browser image through our same-origin
 * image endpoint. The browser and Vercel CDN cache the returned bytes; no
 * Next.js image optimizer or remote image loader is involved.
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
            .filter((source) => /^https:\/\//i.test(source)),
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
  const remoteSrc = candidates[attempt];
  const src = usingFallback || !remoteSrc
    ? fallbackSrc
    : `/api/refraction-image?url=${encodeURIComponent(remoteSrc)}`;

  const fillStyle: CSSProperties = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%" }
    : {};

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ ...fillStyle, ...style }}
      loading={priority ? "eager" : loading ?? "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      onError={() => {
        if (!usingFallback) setAttempt((current) => current + 1);
      }}
    />
  );
}
