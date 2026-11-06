"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

interface MovieCardProps {
  title: string;
  originalTitle?: string;
  posterUrl: string;
  thumbUrl?: string;
  slug: string;
  year?: string | number;
  quality?: string;
  episodeCurrent?: string;
  language?: string;
  isSeries?: boolean;
  hideInfo?: boolean;
  view?: number;
  rating?: number | string;
  /** horizontal (Phim Lậu home) vs vertical (grids) */
  variant?: "horizontal" | "vertical";
}

const PLACEHOLDER =
  "https://placehold.co/640x360/1a1c28/ffffff?text=No+Image";

function buildLangChip(
  language?: string,
  episodeCurrent?: string,
): string | null {
  if (!language && !episodeCurrent) return null;

  const l = (language || "").toLowerCase();
  let prefix = "PĐ.";
  if (
    l.includes("vietsub") &&
    (l.includes("thuyết") || l.includes("tm") || l.includes("thuyet"))
  ) {
    prefix = "VS+TM.";
  } else if (
    l.includes("thuyết minh") ||
    l === "tm" ||
    l.includes("thuyet minh")
  ) {
    prefix = "TM.";
  } else if (l.includes("lồng") || l.includes("long tieng")) {
    prefix = "LT.";
  } else if (
    l.includes("vietsub") ||
    l.includes("phụ đề") ||
    l === "pđ" ||
    l === "pd"
  ) {
    prefix = "PĐ.";
  } else if (language) {
    prefix =
      language.length > 6
        ? language.slice(0, 4).toUpperCase() + "."
        : language.toUpperCase();
  }

  let ep = "";
  if (episodeCurrent) {
    const m = episodeCurrent.match(/(\d+)/);
    if (m) ep = ` ${m[1]}`;
    else if (/full/i.test(episodeCurrent)) ep = " Full";
    else ep = ` ${episodeCurrent.replace(/tập\s*/i, "").trim()}`;
  }

  return `${prefix}${ep}`.trim();
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
  quality = "HD",
  language,
  episodeCurrent,
  hideInfo = false,
  variant = "horizontal",
}: MovieCardProps) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  const handleLinkClick = () => setIsNavigating(true);

  const isHorizontal = variant === "horizontal";
  const imageSrc: string =
    (isHorizontal ? thumbUrl || posterUrl : posterUrl || thumbUrl) ||
    PLACEHOLDER;
  const langChip = buildLangChip(language, episodeCurrent);
  const qChip = qualityChip(quality);

  const showBilingual =
    (language || "").toLowerCase().includes("vietsub") ||
    (language || "").toLowerCase().includes("song") ||
    (language || "").toLowerCase().includes("tm") ||
    true;

  return (
    <div className="group relative w-full">
      <Link
        href={`/phim/${slug}`}
        onClick={handleLinkClick}
        className={`block relative overflow-hidden rounded-lg ${
          isHorizontal ? "aspect-[16/9]" : "aspect-[2/3]"
        }`}
      >
        <Image
          src={imageSrc}
          alt={title}
          fill
          sizes={
            isHorizontal
              ? "(max-width: 640px) 70vw, 280px"
              : "(max-width: 640px) 45vw, 20vw"
          }
          className="object-cover transition-transform duration-400 group-hover:scale-[1.03]"
          quality={80}
          loading="lazy"
        />

        {showBilingual && isHorizontal && (
          <span className="absolute top-2 left-2 z-20 rounded-md bg-[#3b82f6] px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
            Song ngữ
          </span>
        )}

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

        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 z-10 ${
            isNavigating ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        />
      </Link>

      {!hideInfo && (
        <div className="mt-2 px-0.5">
          <Link
            href={`/phim/${slug}`}
            onClick={handleLinkClick}
            className="block"
            title={title}
          >
            <h3 className="text-[13px] md:text-[14px] font-semibold text-white leading-snug line-clamp-1 group-hover:text-[#ffd875] transition-colors">
              {title}
            </h3>
            {originalTitle && originalTitle !== title && (
              <p className="text-[12px] text-white/45 leading-tight line-clamp-1 mt-0.5">
                {originalTitle}
              </p>
            )}
          </Link>
        </div>
      )}
    </div>
  );
};
