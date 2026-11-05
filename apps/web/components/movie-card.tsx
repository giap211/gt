"use client";

import Link from "next/link";
import Image from "next/image";
import { Play, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

interface MovieCardProps {
  title: string;
  originalTitle?: string;
  posterUrl: string;
  slug: string;
  year?: string | number;
  quality?: string;
  episodeCurrent?: string;
  language?: string;
  isSeries?: boolean;
  hideInfo?: boolean;
  view?: number;
  rating?: number | string;
}

export const MovieCard = ({
  title,
  originalTitle,
  posterUrl,
  slug,
  quality = "HD",
  language,
  episodeCurrent,
  hideInfo = false,
}: MovieCardProps) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  const handleLinkClick = () => {
    setIsNavigating(true);
  };

  // Normalize language badge like RoPhim (P.Đ / T.M / V.S)
  const langBadge = (() => {
    if (!language) return null;
    const l = language.toLowerCase();
    if (l.includes("vietsub") || l.includes("phụ đề") || l === "pđ" || l === "pd")
      return "P.Đ";
    if (l.includes("thuyết minh") || l === "tm") return "T.M";
    if (l.includes("lồng tiếng") || l.includes("long tieng")) return "L.T";
    return language.length > 4 ? language.slice(0, 3).toUpperCase() : language.toUpperCase();
  })();

  return (
    <div className="group relative w-full">
      <Link
        href={`/phim/${slug}`}
        onClick={handleLinkClick}
        className="block relative aspect-[2/3] overflow-hidden rounded-md shadow-lg"
      >
        <div className="relative w-full h-full overflow-hidden rounded-md">
          <Image
            src={posterUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            quality={75}
            loading="lazy"
          />
        </div>

        {/* Bottom badges - RoPhim style */}
        <div className="absolute bottom-0 left-0 right-0 flex z-20 pointer-events-none">
          {langBadge && (
            <div className="bg-[#5a5c6a]/95 text-white text-[9px] font-bold px-1.5 py-0.5 min-w-[28px] text-center uppercase tracking-tight">
              {langBadge}
            </div>
          )}
          {quality && (
            <div className="bg-[#2ca35d] text-white text-[9px] font-bold px-1.5 py-0.5 min-w-[28px] text-center uppercase tracking-tight">
              {quality === "Full HD" || quality === "FHD" ? "FHD" : quality}
            </div>
          )}
          {episodeCurrent && (
            <div className="bg-[#e8a317]/95 text-black text-[9px] font-bold px-1.5 py-0.5 min-w-[28px] text-center uppercase tracking-tight truncate max-w-[70px]">
              {episodeCurrent.replace("Tập ", "T.")}
            </div>
          )}
        </div>

        {/* Hover overlay */}
        <div
          className={`absolute inset-0 bg-black/55 transition-all duration-300 flex items-center justify-center z-10 ${
            isNavigating ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          {isNavigating ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-9 h-9 text-[#ffd875] animate-spin" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#ffd875]">
                Đang tải...
              </span>
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#ffd875] flex items-center justify-center text-[#1c1c1c] scale-90 group-hover:scale-100 transition-transform duration-300 shadow-[0_0_24px_rgba(255,216,117,0.45)]">
              <Play className="fill-current w-5 h-5 ml-0.5" />
            </div>
          )}
        </div>
      </Link>

      {!hideInfo && (
        <div className="mt-2 px-0.5">
          <h3 className="text-[12.5px] md:text-[13px] font-semibold text-white leading-snug line-clamp-1 group-hover:text-[#ffd875] transition-colors">
            <Link href={`/phim/${slug}`} title={title} onClick={handleLinkClick}>
              {title}
            </Link>
          </h3>
          {originalTitle && originalTitle !== title && (
            <p className="text-[11px] text-white/40 leading-tight line-clamp-1 mt-0.5">
              {originalTitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
