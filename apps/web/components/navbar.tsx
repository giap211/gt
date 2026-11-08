"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  Clock3,
  LogOut,
  Search,
  UserCircle,
  X,
  Film,
  Loader2,
  ChevronDown,
  Sparkles,
  Globe,
  Tv,
  Clapperboard,
  Flame,
  Menu,
  TrendingUp,
  Bookmark,
} from "lucide-react";
import { useMember } from "./member-provider";
import { searchMovies, type ListMovie } from "@/lib/ophim-client";

const GENRES = [
  { name: "Hành Động", slug: "hanh-dong" },
  { name: "Cổ Trang", slug: "co-trang" },
  { name: "Tình Cảm", slug: "tinh-cam" },
  { name: "Hài Hước", slug: "hai-huoc" },
  { name: "Kinh Dị", slug: "kinh-di" },
  { name: "Võ Thuật", slug: "vo-thuat" },
  { name: "Viễn Tưởng", slug: "vien-tuong" },
  { name: "Hình Sự", slug: "hinh-su" },
  { name: "Tâm Lý", slug: "tam-ly" },
  { name: "Học Đường", slug: "hoc-duong" },
  { name: "Phiêu Lưu", slug: "phieu-luu" },
  { name: "Chiến Tranh", slug: "chien-tranh" },
  { name: "Gia Đình", slug: "gia-dinh" },
  { name: "Khoa Học", slug: "khoa-hoc" },
];

const COUNTRIES = [
  { name: "Hàn Quốc", slug: "han-quoc", flag: "🇰🇷" },
  { name: "Trung Quốc", slug: "trung-quoc", flag: "🇨🇳" },
  { name: "Âu Mỹ", slug: "au-my", flag: "🇺🇸" },
  { name: "Nhật Bản", slug: "nhat-ban", flag: "🇯🇵" },
  { name: "Thái Lan", slug: "thai-lan", flag: "🇹🇭" },
  { name: "Việt Nam", slug: "viet-nam", flag: "🇻🇳" },
  { name: "Đài Loan", slug: "dai-loan", flag: "🇹🇼" },
  { name: "Hồng Kông", slug: "hong-kong", flag: "🇭🇰" },
];

const AnimatedBrand = () => {
  const target = Array.from("PHIM LẬU");
  const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
  const [letters, setLetters] = useState<string[]>(() =>
    target.map((char) => (char === " " ? " " : "·")),
  );

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setLetters(target);
      return;
    }

    let index = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const revealNext = () => {
      if (cancelled || index >= target.length) return;
      if (target[index] === " ") {
        setLetters((current) => current.map((char, i) => (i === index ? " " : char)));
        index += 1;
        timeout = setTimeout(revealNext, 70);
        return;
      }

      const currentIndex = index;
      let frame = 0;
      interval = setInterval(() => {
        if (cancelled) return;
        frame += 1;
        if (frame >= 9) {
          if (interval) clearInterval(interval);
          setLetters((current) =>
            current.map((char, i) => (i === currentIndex ? target[currentIndex] : char)),
          );
          index = currentIndex + 1;
          timeout = setTimeout(revealNext, 85);
          return;
        }

        const randomGlyph = glyphs[Math.floor(Math.random() * glyphs.length)];
        setLetters((current) =>
          current.map((char, i) => (i === currentIndex ? randomGlyph : char)),
        );
      }, 42);
    };

    timeout = setTimeout(revealNext, 180);
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  return (
    <span
      aria-label="PHIM LẬU"
      role="img"
      className="inline-flex items-center whitespace-nowrap select-none"
      style={{
        fontFamily: "var(--font-oswald), sans-serif",
        fontSize: "clamp(20px, 2vw, 27px)",
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: "-0.045em",
        filter: "drop-shadow(0 2px 10px rgba(139,92,246,.22))",
      }}
    >
      {letters.map((letter, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="inline-flex justify-center"
          style={{
            width: target[index] === " " ? "0.28em" : "0.62em",
            background: "linear-gradient(112deg, #c4b5fd 0%, #a78bfa 38%, #e879f9 72%, #818cf8 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {letter}
        </span>
      ))}
    </span>
  );
};

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileGenreOpen, setIsMobileGenreOpen] = useState(true);
  const [isMobileCountryOpen, setIsMobileCountryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ListMovie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showLiveSearch, setShowLiveSearch] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { user, openAuth, openLibrary, logout } = useMember();

  useEffect(() => {
    const updateScrollState = () => {
      const scrollTop = Math.max(
        window.scrollY || 0,
        document.documentElement.scrollTop || 0,
        document.body.scrollTop || 0,
      );
      setIsScrolled(scrollTop > 20);
    };
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    document.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("pageshow", updateScrollState);
    return () => {
      window.removeEventListener("scroll", updateScrollState);
      document.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("pageshow", updateScrollState);
    };
  }, []);

  useEffect(() => {
    setIsMobileDrawerOpen(false);
    setShowLiveSearch(false);
    setIsUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const cleanQuery = searchQuery.trim();
    if (!cleanQuery || cleanQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchMovies(cleanQuery, 1, 6);
        if (res && res.status && res.items) {
          setSearchResults(res.items.slice(0, 5));
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowLiveSearch(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowLiveSearch(false);
      router.push(`/tim-kiem?keyword=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Desktop-only top navbar (mobile uses BottomDock)
  return (
    <>
      <header
        className={`hidden lg:block fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-[#0b0d14]/90 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.8)] py-2.5 sm:py-3"
            : "bg-gradient-to-b from-black/80 via-black/30 to-transparent py-3 sm:py-4"
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-8">
            <Link href="/" className="shrink-0 flex items-center gap-2 group">
              <AnimatedBrand />
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-xl text-[13px] font-medium transition-all ${
                  pathname === "/"
                    ? "text-[#ffd875] bg-white/[0.08] font-semibold"
                    : "text-white/70 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                Trang Chủ
              </Link>
              <Link
                href="/danh-sach/phim-bo"
                className={`px-3 py-1.5 rounded-xl text-[13px] font-medium transition-all ${
                  pathname === "/danh-sach/phim-bo"
                    ? "text-[#ffd875] bg-white/[0.08] font-semibold"
                    : "text-white/70 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                Phim Bộ
              </Link>
              <Link
                href="/danh-sach/phim-le"
                className={`px-3 py-1.5 rounded-xl text-[13px] font-medium transition-all ${
                  pathname === "/danh-sach/phim-le"
                    ? "text-[#ffd875] bg-white/[0.08] font-semibold"
                    : "text-white/70 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                Phim Lẻ
              </Link>
              <Link
                href="/danh-sach/hoat-hinh"
                className={`px-3 py-1.5 rounded-xl text-[13px] font-medium transition-all ${
                  pathname === "/danh-sach/hoat-hinh"
                    ? "text-[#ffd875] bg-white/[0.08] font-semibold"
                    : "text-white/70 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                Hoạt Hình
              </Link>

              <div className="relative group">
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[13px] font-medium text-white/70 group-hover:text-white group-hover:bg-white/[0.05] transition-all">
                  <span>Thể Loại</span>
                  <ChevronDown size={13} className="text-white/40 group-hover:rotate-180 group-hover:text-white transition-transform" />
                </button>
                <div className="absolute top-full left-0 mt-2 w-80 bg-[#10121a]/95 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="px-2 py-1.5 mb-1.5 border-b border-white/[0.06] flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#ffd875] flex items-center gap-1.5">
                      <Sparkles size={12} />
                      Khám phá theo thể loại
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 max-h-72 overflow-y-auto custom-scrollbar">
                    {GENRES.map((g) => (
                      <Link
                        key={g.slug}
                        href={`/the-loai/${g.slug}`}
                        className={`px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                          pathname === `/the-loai/${g.slug}`
                            ? "bg-[#ffd875] text-black font-bold"
                            : "text-white/70 hover:bg-white/[0.08] hover:text-[#ffd875]"
                        }`}
                      >
                        {g.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative group">
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[13px] font-medium text-white/70 group-hover:text-white group-hover:bg-white/[0.05] transition-all">
                  <span>Quốc Gia</span>
                  <ChevronDown size={13} className="text-white/40 group-hover:rotate-180 group-hover:text-white transition-transform" />
                </button>
                <div className="absolute top-full left-0 mt-2 w-56 bg-[#10121a]/95 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl p-2.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="px-2 py-1.5 mb-1 border-b border-white/[0.06]">
                    <span className="text-[11px] font-semibold text-[#ffd875] flex items-center gap-1.5">
                      <Globe size={12} />
                      Khu vực sản xuất
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {COUNTRIES.map((c) => (
                      <Link
                        key={c.slug}
                        href={`/quoc-gia/${c.slug}`}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                          pathname === `/quoc-gia/${c.slug}`
                            ? "bg-[#ffd875] text-black font-bold"
                            : "text-white/70 hover:bg-white/[0.08] hover:text-[#ffd875]"
                        }`}
                      >
                        <span className="text-sm">{c.flag}</span>
                        <span>{c.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div ref={searchContainerRef} className="relative w-[220px] md:w-[260px]">
              <form onSubmit={handleSearchSubmit}>
                <div className="relative group">
                  <input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowLiveSearch(true);
                    }}
                    onFocus={() => setShowLiveSearch(true)}
                    className="w-full bg-white/[0.06] hover:bg-white/[0.09] focus:bg-white/[0.1] border border-white/[0.08] focus:border-[#ffd875]/60 text-white text-base rounded-full py-2 pl-4 pr-11 outline-none shadow-sm transition-all placeholder:text-white/35"
                    placeholder="Tìm phim..."
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                    {isSearching ? (
                      <Loader2 size={13} className="animate-spin text-[#ffd875]" />
                    ) : searchQuery ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                        className="p-1 text-white/40 hover:text-white transition-colors"
                      >
                        <X size={12} />
                      </button>
                    ) : null}
                    <button type="submit" aria-label="Tìm kiếm" className="p-1 text-white/40 group-focus-within:text-[#ffd875] hover:text-white transition-colors">
                      <Search size={14} />
                    </button>
                  </div>
                </div>
              </form>

              {showLiveSearch && searchQuery.trim().length >= 2 && (
                <div className="absolute top-full right-0 mt-2.5 w-[min(92vw,360px)] max-h-[min(58vh,420px)] bg-[#090b12] border border-white/15 rounded-2xl shadow-[0_24px_70px_rgba(0,0,0,0.98)] overflow-hidden z-[60]">
                  <div className="px-3 py-2 border-b border-white/10 bg-[#111521] flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#ffd875] flex items-center gap-1.5">
                      <Film size={12} />
                      Kết quả gợi ý
                    </span>
                  </div>
                  <div className="max-h-[340px] overflow-y-auto p-1.5 space-y-1">
                    {searchResults.length > 0 ? (
                      searchResults.map((item) => (
                        <Link
                          key={item._id}
                          href={`/phim/${item.slug}`}
                          onClick={() => setShowLiveSearch(false)}
                          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/[0.08] transition-all group"
                        >
                          <div className="relative w-10 h-13 rounded-lg overflow-hidden bg-black/50 shrink-0 border border-white/10">
                            <Image src={item.poster_url} alt={item.name} fill sizes="40px" className="object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-semibold text-white line-clamp-2 group-hover:text-[#ffd875]">{item.name}</h4>
                            <p className="text-[10px] text-white/55 truncate">{item.origin_name}</p>
                          </div>
                        </Link>
                      ))
                    ) : !isSearching ? (
                      <div className="py-6 text-center text-xs text-white/40">Không tìm thấy phim phù hợp</div>
                    ) : null}
                  </div>
                  <Link
                    href={`/tim-kiem?keyword=${encodeURIComponent(searchQuery.trim())}`}
                    onClick={() => setShowLiveSearch(false)}
                    className="block p-2.5 text-center bg-[#111521] hover:bg-[#ffd875] text-[11px] font-bold text-white hover:text-black border-t border-white/10"
                  >
                    Xem tất cả kết quả →
                  </Link>
                </div>
              )}
            </div>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex h-[42px] items-center gap-2 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 px-3 text-white transition-all"
                >
                  <UserCircle size={18} className="text-[#ffd875]" />
                  <span className="text-sm font-medium max-w-[80px] truncate">{user.username}</span>
                  <ChevronDown size={14} className="text-white/40" />
                </button>
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#10121a]/95 border border-white/10 rounded-2xl shadow-xl backdrop-blur-xl p-2 z-50">
                    <button
                      onClick={() => { openLibrary("favorites"); setIsUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white/80 hover:bg-white/10"
                    >
                      <Bookmark size={14} /> Tủ phim
                    </button>
                    <button
                      onClick={() => { openLibrary("history"); setIsUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white/80 hover:bg-white/10"
                    >
                      <Clock3 size={14} /> Đang xem
                    </button>
                    <button
                      onClick={async () => { await logout(); setIsUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-300 hover:bg-white/10"
                    >
                      <LogOut size={14} /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openAuth()}
                className="h-[42px] px-4 rounded-full bg-[#ffd875] text-black text-sm font-bold hover:brightness-110 transition-all"
              >
                Đăng nhập
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
