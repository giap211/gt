"use client";

import Link from "next/link";
import { ResilientMovieImage } from "./resilient-movie-image";
import { Star } from "lucide-react";

interface MovieCardProps {
  title: string;
  originalTitle?: string;
  posterUrl: string;
  thumbUrl?: string;
  slug: string;
  href?: string;
  progressSeconds?: number;
  totalDurationSeconds?: number;
  simulateProgressWhenEmpty?: boolean;
  year?: string | number;
  quality?: string;
  episodeCurrent?: string;
  language?: string;
  isSeries?: boolean;
  hideInfo?: boolean;
  view?: number;
  rating?: number | string;
  /** horizontal landscape cards vs vertical posters */
  variant?: "horizontal" | "vertical";
}

const formatPlaybackTime = (value: number) => {
  const seconds = Math.max(0, Math.floor(value));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
    : `${minutes}:${String(remaining).padStart(2, "0")}`;
};

function buildLangChip(
  language?: string,
  episodeCurrent?: string,
): string | null {
  if (!language) return null;

  const l = language.toLowerCase();
  const hasSubtitle = /vietsub|phụ đề|phu de|pđ|\\bpd\\b/.test(l);
  const hasNarration = /thuyết minh|thuyet minh|\\btm\\b/.test(l);
  const hasDubbing = /lồng tiếng|long tieng|\\blt\\b/.test(l);
  const formats = [
    hasSubtitle ? "PĐ" : "",
    hasNarration ? "TM" : "",
    hasDubbing ? "LT" : "",
  ].filter(Boolean);
  if (formats.length === 0) return null;

  let ep = "";
  if (episodeCurrent) {
    const m = episodeCurrent.match(/(\\d+)/);
    if (m) ep = ` ${m[1]}`;
    else if (/full/i.test(episodeCurrent)) ep = " Full";
    else ep = ` ${episodeCurrent.replace(/tập\\s*/i, "").trim()}`;
  }

  return `${formats.join(" ")}${ep}`.trim();
}
function qualityChip(quality?: string): string {
  if (!quality) return "QL. HD";
  const q = quality.toUpperCase();
  if (q.includes("4K")) return "QL. 4K";
  if (q.includes("FHD") || q.includes("FULL")) return "QL. FHD";
  if (q.includes("CAM")) return "QL. CAM";
  return `QL. ${q.replace(/FULL\s*/i, "").trim() || "HD"}`;
}

export const MovieCard = ({
  title,
  originalTitle,
  posterUrl,
  thumbUrl,
  slug,
  href,
  progressSeconds,
  totalDurationSeconds,
  simulateProgressWhenEmpty = false,
  quality = "HD",
  language,
  episodeCurrent,
  rating,
  hideInfo = false,
  variant = "horizontal",
}: MovieCardProps) => {
  const isHorizontal = variant === "horizontal";
  const imageSources = isHorizontal ? [thumbUrl, posterUrl] : [posterUrl, thumbUrl];
  const fallbackSrc = isHorizontal
    ? "/images/fallback-horizontal.svg"
    : "/images/fallback-vertical.svg";
  const langChip = buildLangChip(language, episodeCurrent);

  const qChip = qualityChip(quality);
  const numericRating = typeof rating === "number" ? rating : Number.parseFloat(String(rating ?? ""));
  const hasRating = Number.isFinite(numericRating) && numericRating > 0;
  const hasRuntime = Boolean(totalDurationSeconds && totalDurationSeconds > 0);
  const hasRealProgress = typeof progressSeconds === "number" && progressSeconds > 0;
  const displayProgressSeconds = hasRealProgress
    ? Math.min(progressSeconds as number, totalDurationSeconds || 0)
    : simulateProgressWhenEmpty && hasRuntime
      ? Math.round((totalDurationSeconds as number) * 0.18)
      : 0;
  const showProgressBar = hasRuntime && (hasRealProgress || simulateProgressWhenEmpty);
  const episodeNumber = episodeCurrent?.trim().replace(/^(?:tập\s*)+/i, "");
  const episodeLabel = episodeNumber ? `Tập ${episodeNumber}` : null;

  return (
    <div className="group relative w-full">
      <Link
        href={href || `/phim/${slug}`}
        className={`movie-poster-frame ${isHorizontal ? "movie-poster-frame-horizontal" : "movie-poster-frame-vertical"} block relative overflow-hidden rounded-lg ${
          isHorizontal ? "aspect-[16/9]" : "aspect-[2/3]"
        }`}
      >
        <ResilientMovieImage
          sources={imageSources}
          fallbackSrc={fallbackSrc}
          alt={title}
          fill
          sizes={
            isHorizontal
              ? "(max-width: 640px) 70vw, 280px"
              : "(max-width: 640px) 45vw, 20vw"
          }
          className="object-cover transition-transform duration-400 group-hover:scale-[1.03]"
          quality={75}
          loading="lazy"
        />

        <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-wrap gap-0.5 p-1.5 pointer-events-none">
          {langChip && (
            <span className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-[#1a1c28] shadow-sm">
              {langChip}
            </span>
          )}
          <span className="rounded bg-[#f0c24d] px-1.5 py-0.5 text-[10px] font-bold text-[#1a1c28] shadow-sm">
            {qChip}
          </span>
        </div>
      </Link>

      {showProgressBar && hasRealProgress && (
        <div className="mt-1 flex items-center justify-between gap-2 px-0.5 text-[9px] font-semibold tabular-nums text-white/50">
          <span className="min-w-0 truncate">{episodeLabel ? `${episodeLabel} · ` : ""}{formatPlaybackTime(displayProgressSeconds)} / {formatPlaybackTime(totalDurationSeconds || 0)}</span>
          <span className="text-[#ffd875]">{Math.min(100, Math.round((displayProgressSeconds / (totalDurationSeconds || 1)) * 100))}%</span>
        </div>
      )}

      {!hideInfo && (
        <div className="movie-card-info mt-2 px-0.5">
          <Link
            href={href || `/phim/${slug}`}
            className="block"
            title={title}
          >
            <h3 className="movie-card-title text-[12px] md:text-[14px] font-semibold leading-snug line-clamp-1 transition-colors">
              {title}
            </h3>
          </Link>
          {hasRating && (
            <div className="movie-card-rating mt-1 flex items-center gap-1 text-[10px] font-semibold tabular-nums" aria-label={`Đánh giá ${numericRating.toFixed(1)} trên 10`}>
              <Star size={11} strokeWidth={1.8} fill="currentColor" />
              <span>{numericRating.toFixed(1)}</span>
            </div>
          )}
          {originalTitle && originalTitle !== title && (
            <p className="movie-card-original mt-0.5 text-[10px] md:text-[11px] leading-tight line-clamp-1">
              {originalTitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
