"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Filter, RotateCcw, SlidersHorizontal, X } from "lucide-react";

export interface MovieListingFilters {
  genres: string[];
  countries: string[];
  years: string[];
  qualities: string[];
  languages: string[];
  sort: "latest" | "year-desc" | "year-asc" | "views" | "rating";
}

type MenuKey = "genre" | "country" | "year" | "quality" | "language" | "sort";
type MenuPosition = { top: number; left: number; width: number; maxHeight: number };

const EMPTY_FILTERS: MovieListingFilters = {
  genres: [],
  countries: [],
  years: [],
  qualities: [],
  languages: [],
  sort: "latest",
};

const GENRES = [
  ["hanh-dong", "Hành động"], ["tinh-cam", "Tình cảm"], ["hai-huoc", "Hài hước"],
  ["kinh-di", "Kinh dị"], ["vien-tuong", "Viễn tưởng"], ["phieu-luu", "Phiêu lưu"],
  ["tam-ly", "Tâm lý"], ["co-trang", "Cổ trang"], ["vo-thuat", "Võ thuật"],
  ["hinh-su", "Hình sự"], ["chien-tranh", "Chiến tranh"], ["hoat-hinh", "Hoạt hình"],
  ["bi-an", "Bí ẩn"], ["gia-dinh", "Gia đình"], ["hoc-duong", "Học đường"],
] as const;

const COUNTRIES = [
  ["nhat-ban", "🇯🇵 Nhật Bản"], ["han-quoc", "🇰🇷 Hàn Quốc"], ["trung-quoc", "🇨🇳 Trung Quốc"],
  ["au-my", "🇺🇸 Âu Mỹ"], ["thai-lan", "🇹🇭 Thái Lan"], ["viet-nam", "🇻🇳 Việt Nam"],
  ["hong-kong", "🇭🇰 Hồng Kông"], ["dai-loan", "🇹🇼 Đài Loan"], ["an-do", "🇮🇳 Ấn Độ"],
  ["anh", "🇬🇧 Anh"], ["phap", "🇫🇷 Pháp"], ["duc", "🇩🇪 Đức"],
  ["uc", "🇦🇺 Úc"], ["canada", "🇨🇦 Canada"], ["indonesia", "🇮🇩 Indonesia"],
] as const;

const YEARS = Array.from({ length: 27 }, (_, index) => String(new Date().getFullYear() - index));
const QUALITIES = ["4K", "2K", "Full HD", "HD", "SD"];
const LANGUAGES = ["Vietsub", "Thuyết Minh", "Lồng Tiếng"];
const SORTS: Array<[MovieListingFilters["sort"], string]> = [
  ["latest", "Mới cập nhật"], ["year-desc", "Năm mới nhất"], ["year-asc", "Năm cũ nhất"],
  ["views", "Lượt xem"], ["rating", "Đánh giá"],
];

const countFilters = (filters: MovieListingFilters) =>
  filters.genres.length + filters.countries.length + filters.years.length +
  filters.qualities.length + filters.languages.length + (filters.sort === "latest" ? 0 : 1);

export const FilterBar = () => {
  const [draft, setDraft] = useState<MovieListingFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<MovieListingFilters>(EMPTY_FILTERS);
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const open = (key: MenuKey, event: MouseEvent<HTMLButtonElement>) => {
    if (openMenu === key) {
      setOpenMenu(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    // Reserve the bottom-dock area on phones so the panel never sits behind it.
    const safeBottom = window.innerWidth < 1024 ? 112 : 24;
    const maxHeight = Math.max(180, Math.min(window.innerHeight * 0.66, 440, window.innerHeight - safeBottom - 24));
    const top = Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - maxHeight - safeBottom));
    setPosition({ top, left, width, maxHeight });
    setOpenMenu(key);
  };

  useEffect(() => {
    const handlePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpenMenu(null);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const toggleValue = (group: "genres" | "countries" | "years" | "qualities" | "languages", value: string) => {
    setDraft((current) => {
      const values = current[group];
      return { ...current, [group]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value] };
    });
  };

  const apply = () => {
    setApplied(draft);
    window.dispatchEvent(new CustomEvent<MovieListingFilters>("movie-listing-filters-change", { detail: draft }));
    setOpenMenu(null);
  };

  const reset = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    window.dispatchEvent(new CustomEvent<MovieListingFilters>("movie-listing-filters-change", { detail: EMPTY_FILTERS }));
    setOpenMenu(null);
  };

  const groups: Array<{ key: MenuKey; label: string; count: number }> = [
    { key: "genre", label: "Thể loại", count: draft.genres.length },
    { key: "country", label: "Quốc gia", count: draft.countries.length },
    { key: "year", label: "Năm", count: draft.years.length },
    { key: "quality", label: "Chất lượng", count: draft.qualities.length },
    { key: "language", label: "Ngôn ngữ", count: draft.languages.length },
    { key: "sort", label: "Sắp xếp", count: draft.sort === "latest" ? 0 : 1 },
  ];

  const choices = openMenu === "genre" ? GENRES
    : openMenu === "country" ? COUNTRIES
    : openMenu === "year" ? YEARS.map((year) => [year, year] as const)
    : openMenu === "quality" ? QUALITIES.map((quality) => [quality, quality] as const)
    : openMenu === "language" ? LANGUAGES.map((language) => [language, language] as const)
    : [];

  const groupForMenu = openMenu === "genre" ? "genres"
    : openMenu === "country" ? "countries"
    : openMenu === "year" ? "years"
    : openMenu === "quality" ? "qualities"
    : "languages";

  const selectedCount = countFilters(applied);

  return (
    <div ref={containerRef} className="relative z-30 mb-7 rounded-2xl border border-violet-300/15 bg-white/[0.045] p-3 shadow-[0_12px_36px_rgba(0,0,0,.12)] backdrop-blur-2xl sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-1 flex items-center gap-2 px-1 text-xs font-black uppercase tracking-wider text-violet-300">
          <SlidersHorizontal size={15} /> Bộ lọc
          {selectedCount > 0 && <span className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-2 py-0.5 text-[10px] text-white">{selectedCount}</span>}
        </div>
        {groups.map((group) => (
          <button
            key={group.key}
            type="button"
            aria-expanded={openMenu === group.key}
            onClick={(event) => open(group.key, event)}
            className={`inline-flex min-h-9 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${openMenu === group.key || group.count ? "border-violet-400/50 bg-violet-500/15 text-violet-100" : "border-white/10 bg-white/[0.04] text-current hover:border-violet-400/40 hover:bg-violet-500/10"}`}
          >
            {group.label}
            {group.count > 0 && <span className="rounded-full bg-violet-500 px-1.5 text-[10px] text-white">{group.count}</span>}
            <ChevronDown size={13} className={openMenu === group.key ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {selectedCount > 0 && <button type="button" onClick={reset} className="inline-flex min-h-9 items-center gap-1 rounded-xl px-2 text-xs font-semibold text-violet-300 hover:bg-violet-500/10"><RotateCcw size={13} /> Xóa lọc</button>}
          <button type="button" onClick={apply} className="min-h-9 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 px-4 text-xs font-extrabold text-white shadow-lg shadow-violet-950/20 transition-transform active:scale-95">Áp dụng</button>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[...applied.genres.map((v) => GENRES.find((x) => x[0] === v)?.[1] || v),
            ...applied.countries.map((v) => COUNTRIES.find((x) => x[0] === v)?.[1] || v),
            ...applied.years, ...applied.qualities, ...applied.languages,
            ...(applied.sort !== "latest" ? [SORTS.find((x) => x[0] === applied.sort)?.[1] || ""] : [])].map((label) => (
            <span key={label} className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold text-violet-200">{label}</span>
          ))}
        </div>
      )}

      {openMenu && position && typeof document !== "undefined" && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label={groups.find((group) => group.key === openMenu)?.label}
          style={{ position: "fixed", top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight }}
          className="z-[10000] flex flex-col overflow-hidden rounded-2xl border border-violet-300/20 bg-[#11111d]/95 p-3 text-white shadow-[0_24px_70px_rgba(0,0,0,.55)] backdrop-blur-2xl"
        >
          <div className="mb-2 flex shrink-0 items-center justify-between border-b border-white/10 pb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-violet-200">{groups.find((group) => group.key === openMenu)?.label}</span>
            <button type="button" onClick={() => setOpenMenu(null)} aria-label="Đóng bộ lọc" className="rounded-lg p-1.5 text-white/60 hover:bg-white/10"><X size={15} /></button>
          </div>
          {openMenu === "sort" ? (
            <div className="grid gap-1 overflow-y-auto overscroll-contain">
              {SORTS.map(([value, label]) => (
                <button key={value} type="button" onClick={() => setDraft((current) => ({ ...current, sort: value }))} className={`flex min-h-10 items-center justify-between rounded-xl px-3 text-left text-xs font-semibold ${draft.sort === value ? "bg-violet-500/20 text-violet-200" : "text-white/75 hover:bg-white/[0.06]"}`}>
                  {label}{draft.sort === value && <Check size={15} />}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid min-h-0 grid-cols-2 gap-1.5 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
              {choices.map(([value, label]) => {
                const checked = draft[groupForMenu as keyof Pick<MovieListingFilters, "genres" | "countries" | "years" | "qualities" | "languages">].includes(value);
                return (
                  <button key={value} type="button" aria-pressed={checked} onClick={() => toggleValue(groupForMenu as "genres" | "countries" | "years" | "qualities" | "languages", value)} className={`flex min-h-10 min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-[11px] font-semibold transition-colors ${checked ? "border-violet-400/50 bg-violet-500/20 text-violet-100" : "border-white/[0.06] bg-white/[0.035] text-white/75 hover:bg-white/[0.08]"}`}>
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? "border-violet-300 bg-violet-500 text-white" : "border-white/25"}`}>{checked && <Check size={11} />}</span>
                    <span className="min-w-0 break-words">{label}</span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="mt-3 flex shrink-0 items-center justify-between border-t border-white/10 pt-2">
            <button type="button" onClick={() => setDraft((current) => openMenu === "sort" ? { ...current, sort: "latest" } : { ...current, [groupForMenu]: [] })} className="px-2 py-2 text-[11px] font-semibold text-white/55 hover:text-white">Bỏ chọn nhóm này</button>
            <button type="button" onClick={apply} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-2 text-[11px] font-extrabold text-white">Xong</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};
