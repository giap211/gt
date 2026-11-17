"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Filter, Layers, Globe, Sparkles, CalendarDays, ArrowDownWideNarrow, RotateCcw } from "lucide-react";
import { getMovieFilterOptions, type MovieFilterOptions, type MovieFilters } from "@/lib/ophim-client";

const EMPTY_OPTIONS: MovieFilterOptions = { categories: [], countries: [], years: [] };

const fieldClass = "h-10 min-w-0 w-full rounded-xl border border-white/10 bg-[#171927] px-3 text-xs font-semibold text-white outline-none transition focus:border-violet-400/70";

export const FilterBar = () => {
  const router = useRouter();
  const [options, setOptions] = useState<MovieFilterOptions>(EMPTY_OPTIONS);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [filters, setFilters] = useState<MovieFilters>({
    sortField: "modified.time",
    sortType: "desc",
  });

  useEffect(() => {
    let active = true;
    getMovieFilterOptions()
      .then((result) => { if (active) setOptions(result); })
      .catch((error) => console.error("Cannot load PhimAPI filter options", error))
      .finally(() => { if (active) setLoadingOptions(false); });
    const params = new URLSearchParams(window.location.search);
    const pathType = window.location.pathname.match(/^\\/danh-sach\\/([^/]+)/)?.[1] || "";
    setFilters({
      type: params.get("type") || pathType,
      category: params.get("category") || "",
      country: params.get("country") || "",
      year: params.get("year") || "",
      sortField: params.get("sort_field") || "modified.time",
      sortType: params.get("sort_type") || "desc",
      sortLang: params.get("sort_lang") || "",
    });
    return () => { active = false; };
  }, []);

  const update = (key: keyof MovieFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const apply = () => {
    const params = new URLSearchParams();
    if (filters.type) params.set("type", filters.type);
    if (filters.category) params.set("category", filters.category);
    if (filters.country) params.set("country", filters.country);
    if (filters.year) params.set("year", filters.year);
    if (filters.sortField) params.set("sort_field", filters.sortField);
    if (filters.sortType) params.set("sort_type", filters.sortType);
    if (filters.sortLang) params.set("sort_lang", filters.sortLang);
    router.push(`/bo-loc?${params.toString()}`);
  };

  const clear = () => {
    const reset = { sortField: "modified.time", sortType: "desc" };
    setFilters(reset);
    router.push("/bo-loc");
  };

  return (
    <section className="filter-bar relative z-30 mb-7 rounded-2xl border border-white/10 bg-[#11131d]/90 p-3 text-white shadow-sm backdrop-blur-xl sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white">
          <Filter className="h-4 w-4 text-violet-300" /> Bộ lọc phim
        </div>
        <span className="text-[10px] font-medium text-white/45">
          {loadingOptions ? "Đang tải danh mục PhimAPI…" : "Dữ liệu danh mục từ PhimAPI"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <label className="min-w-0">
          <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold text-white/60"><Layers size={12}/> Loại phim</span>
          <select className={fieldClass} value={filters.type || ""} onChange={(e) => update("type", e.target.value)}>
            <option value="">Tất cả</option>
            <option value="phim-le">Phim lẻ</option>
            <option value="phim-bo">Phim bộ</option>
            <option value="hoat-hinh">Hoạt hình</option>
            <option value="tv-shows">TV Shows</option>
          </select>
        </label>
        <label className="min-w-0">
          <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold text-white/60"><Sparkles size={12}/> Thể loại</span>
          <select className={fieldClass} value={filters.category || ""} onChange={(e) => update("category", e.target.value)}>
            <option value="">Tất cả thể loại</option>
            {options.categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </select>
        </label>
        <label className="min-w-0">
          <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold text-white/60"><Globe size={12}/> Quốc gia</span>
          <select className={fieldClass} value={filters.country || ""} onChange={(e) => update("country", e.target.value)}>
            <option value="">Tất cả quốc gia</option>
            {options.countries.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </select>
        </label>
        <label className="min-w-0">
          <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold text-white/60"><CalendarDays size={12}/> Năm phát hành</span>
          <select className={fieldClass} value={filters.year || ""} onChange={(e) => update("year", e.target.value)}>
            <option value="">Tất cả năm</option>
            {options.years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <label className="min-w-0">
          <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold text-white/60"><ArrowDownWideNarrow size={12}/> Sắp xếp</span>
          <select className={fieldClass} value={filters.sortField || "modified.time"} onChange={(e) => update("sortField", e.target.value)}>
            <option value="modified.time">Mới cập nhật</option>
            <option value="year">Năm phát hành</option>
            <option value="_id">Mới đăng</option>
          </select>
        </label>
        <label className="min-w-0">
          <span className="mb-1.5 block text-[10px] font-bold text-white/60">Thứ tự</span>
          <select className={fieldClass} value={filters.sortType || "desc"} onChange={(e) => update("sortType", e.target.value)}>
            <option value="desc">Giảm dần</option>
            <option value="asc">Tăng dần</option>
          </select>
        </label>
        <label className="min-w-0">
          <span className="mb-1.5 block text-[10px] font-bold text-white/60">Ngôn ngữ</span>
          <select className={fieldClass} value={filters.sortLang || ""} onChange={(e) => update("sortLang", e.target.value)}>
            <option value="">Tất cả ngôn ngữ</option>
            <option value="vietsub">Vietsub</option>
            <option value="thuyet-minh">Thuyết minh</option>
            <option value="long-tieng">Lồng tiếng</option>
          </select>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={clear} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-xs font-bold text-white/65 transition hover:bg-white/5">
          <RotateCcw size={13}/> Xóa lọc
        </button>
        <button type="button" onClick={apply} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 text-xs font-black text-white transition hover:brightness-110">
          Áp dụng bộ lọc <ChevronDown className="h-3.5 w-3.5 -rotate-90"/>
        </button>
      </div>
    </section>
  );
};
