"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Clapperboard,
  Search,
  Tv,
  UserCircle,
  X,
  Loader2,
  Film,
  Bookmark,
  Clock3,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { useMember } from "./member-provider";
import { searchMovies, type ListMovie } from "@/lib/ophim-client";

export function BottomDock() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, openAuth, openLibrary, logout } = useMember();

  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileTheme, setMobileTheme] = useState<"dark" | "light">("dark");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ListMovie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isHome = pathname === "/";
  const isSeries = pathname.startsWith("/danh-sach/phim-bo");
  const isSingle = pathname.startsWith("/danh-sach/phim-le");

  useEffect(() => {
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const saved = window.localStorage.getItem("gt-mobile-theme");
    const theme = saved === "light" ? "light" : "dark";
    setMobileTheme(theme);
    document.documentElement.dataset.mobileTheme = theme;
  }, []);

  const toggleMobileTheme = () => {
    const next = mobileTheme === "dark" ? "light" : "dark";
    setMobileTheme(next);
    document.documentElement.dataset.mobileTheme = next;
    window.localStorage.setItem("gt-mobile-theme", next);
  };

  useEffect(() => {
    if (searchOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      document.body.style.overflow = "hidden";
      return () => {
        clearTimeout(t);
        document.body.style.overflow = "";
      };
    }
    document.body.style.overflow = "";
  }, [searchOpen]);

  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchMovies(q, 1, 12);
        setResults(res?.items?.slice(0, 10) || []);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleDockNavigation = (event: React.MouseEvent<HTMLAnchorElement>, active: boolean) => {
    if (active) { event.preventDefault(); scrollToTop(); }
  };

  const handleAccount = () => setAccountOpen(true);

  const submitSearch = () => {
    const q = query.trim();
    if (!q) return;
    setSearchOpen(false);
    router.push(`/tim-kiem?keyword=${encodeURIComponent(q)}`);
  };

  return (
    <>
      <style jsx global>{`
        @media (max-width: 1023px) {
          html[data-mobile-theme="light"] body { background: #f4f6fb !important; color: #252a36 !important; }
          html[data-mobile-theme="light"] body [class~="text-white"],
          html[data-mobile-theme="light"] body [class~="text-white/90"],
          html[data-mobile-theme="light"] body [class~="text-white/85"],
          html[data-mobile-theme="light"] body [class~="text-white/80"],
          html[data-mobile-theme="light"] body [class~="text-white/75"],
          html[data-mobile-theme="light"] body [class~="text-white/70"],
          html[data-mobile-theme="light"] body [class~="text-white/65"],
          html[data-mobile-theme="light"] body [class~="text-white/60"],
          html[data-mobile-theme="light"] body [class~="text-white/55"] { color: #303746 !important; }
          html[data-mobile-theme="light"] body [class~="text-white/50"],
          html[data-mobile-theme="light"] body [class~="text-white/45"],
          html[data-mobile-theme="light"] body [class~="text-white/40"],
          html[data-mobile-theme="light"] body [class~="text-white/35"],
          html[data-mobile-theme="light"] body [class~="text-white/30"] { color: #687184 !important; }
          html[data-mobile-theme="light"] body [class*="bg-[#0"],
          html[data-mobile-theme="light"] body [class*="bg-[#1"],
          html[data-mobile-theme="light"] body [class*="bg-[#2"] { background-color: #fff !important; }
          html[data-mobile-theme="light"] body [class*="border-white/"] { border-color: rgba(40,48,65,.14) !important; }
          html[data-mobile-theme="light"] header.fixed {
            background: rgba(250,251,255,.9) !important; border-color: rgba(40,48,65,.12) !important;
            box-shadow: 0 8px 28px rgba(35,45,65,.1) !important;
          }
          html[data-mobile-theme="light"] header.fixed a,
          html[data-mobile-theme="light"] header.fixed button { color: #303746; }
          html[data-mobile-theme="light"] body input,
          html[data-mobile-theme="light"] body select {
            color: #252a36 !important; background-color: #fff !important; border-color: rgba(40,48,65,.18) !important;
          }
          html[data-mobile-theme="light"] body input::placeholder { color: #8992a3 !important; }
          html[data-mobile-theme="light"] body .bottom-dock-surface {
            background: rgba(255,255,255,.84) !important; border-color: rgba(40,48,65,.15) !important;
            box-shadow: 0 8px 30px rgba(35,45,65,.14), inset 0 1px 0 rgba(255,255,255,.9) !important;
          }
          html[data-mobile-theme="light"] body .mobile-account-sheet {
            background: rgba(255,255,255,.95) !important; border-color: rgba(40,48,65,.15) !important;
          }
          html[data-mobile-theme="light"] body .mobile-account-sheet button { color: #303746; }
          html[data-mobile-theme="light"] body .mobile-search-overlay { background: #f4f6fb !important; }
        }
      `}</style>

      {/* Full-screen search overlay */}
      {searchOpen && (
        <div className="mobile-search-overlay lg:hidden fixed inset-0 z-[70] bg-[#0a0b10] flex flex-col pb-[calc(env(safe-area-inset-bottom)+88px)]">
          <div className="flex items-center gap-2 px-3 pt-[max(12px,env(safe-area-inset-top))] pb-2 border-b border-white/10">
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="w-10 h-10 flex items-center justify-center text-white/70 active:text-white"
              aria-label="Đóng"
            >
              <X size={22} />
            </button>
            <form
              className="flex-1 relative"
              onSubmit={(e) => {
                e.preventDefault();
                submitSearch();
              }}
            >
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
              />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm phim, diễn viên..."
                className="w-full h-11 rounded-full bg-white/[0.08] border border-white/10 pl-10 pr-10 text-base text-white outline-none placeholder:text-white/35 focus:border-[#ffd875]/50"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setResults([]);
                    inputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
                >
                  <X size={16} />
                </button>
              )}
            </form>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-2">
            {isSearching && (
              <div className="flex items-center justify-center gap-2 py-10 text-white/40 text-sm">
                <Loader2 size={16} className="animate-spin text-[#ffd875]" />
                Đang tìm...
              </div>
            )}

            {!isSearching && query.trim().length >= 2 && results.length === 0 && (
              <div className="py-12 text-center text-sm text-white/40">
                Không tìm thấy kết quả
              </div>
            )}

            {!isSearching && results.length > 0 && (
              <div className="space-y-1">
                {results.map((item) => (
                  <Link
                    key={item._id}
                    href={`/phim/${item.slug}`}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center gap-3 p-2.5 rounded-xl active:bg-white/[0.06]"
                  >
                    <div className="relative w-11 h-14 rounded-lg overflow-hidden bg-white/5 shrink-0 border border-white/10">
                      <Image
                        src={item.poster_url}
                        alt={item.name}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-white line-clamp-1">
                        {item.name}
                      </p>
                      <p className="text-[12px] text-white/45 line-clamp-1 mt-0.5">
                        {item.origin_name}
                      </p>
                      <p className="text-[11px] text-[#ffd875]/80 mt-1">
                        {item.year || "—"} · HD
                      </p>
                    </div>
                  </Link>
                ))}

                <button
                  type="button"
                  onClick={submitSearch}
                  className="w-full mt-2 py-3 text-center text-[13px] font-bold text-[#ffd875]"
                >
                  Xem tất cả kết quả →
                </button>
              </div>
            )}

            {!query.trim() && (
              <div className="px-2 pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35 mb-3 flex items-center gap-1.5">
                  <Film size={12} /> Gợi ý tìm kiếm
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Phim Hàn Quốc",
                    "Anime",
                    "Phim chiếu rạp",
                    "Netflix",
                    "Cổ trang",
                    "Kinh dị",
                  ].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setQuery(s)}
                      className="px-3.5 py-2 rounded-full bg-white/[0.06] border border-white/10 text-[13px] text-white/70 active:bg-white/10"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Account menu overlay */}
      {accountOpen && (
        <div className="lg:hidden fixed inset-0 z-[70] flex items-end justify-center bg-black/65 px-4 pb-[calc(env(safe-area-inset-bottom)+92px)] backdrop-blur-md" onClick={() => setAccountOpen(false)}>
          <div className="mobile-account-sheet w-full max-w-sm overflow-hidden rounded-[26px] border border-white/20 bg-[#171923]/90 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-2xl" style={{ WebkitBackdropFilter: "blur(30px) saturate(170%)" }} onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between border-b border-white/10 px-1 pb-3">
              <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ffd875]">Tài khoản</p><p className="mt-1 truncate text-sm font-semibold text-white">{user ? user.username : "Chào mừng bạn"}</p></div>
              <button type="button" onClick={() => setAccountOpen(false)} aria-label="Đóng menu tài khoản" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70"><X size={18} /></button>
            </div>
            <button type="button" onClick={toggleMobileTheme} className="mb-2 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.07] px-3 py-3 text-left text-sm text-white/90 active:bg-white/10">
              <span className="flex items-center gap-3">{mobileTheme === "dark" ? <Sun size={18} className="text-[#ffd875]" /> : <Moon size={18} className="text-[#ffd875]" />} Giao diện {mobileTheme === "dark" ? "sáng" : "tối"}</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs">{mobileTheme === "dark" ? "Tối" : "Sáng"}</span>
            </button>
            {user ? (
              <div className="space-y-1">
                <button type="button" onClick={() => { setAccountOpen(false); openLibrary("favorites"); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-white/85 active:bg-white/10"><Bookmark size={18} className="text-[#ffd875]" /> Tủ phim của tôi</button>
                <button type="button" onClick={() => { setAccountOpen(false); openLibrary("history"); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-white/85 active:bg-white/10"><Clock3 size={18} className="text-[#ffd875]" /> Phim đang xem</button>
                <button type="button" onClick={async () => { setAccountOpen(false); await logout(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-red-300 active:bg-white/10"><LogOut size={18} /> Đăng xuất</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setAccountOpen(false); openAuth("login"); }} className="rounded-full bg-[#ffd875] px-3 py-3 text-sm font-bold text-black">Đăng nhập</button>
                <button type="button" onClick={() => { setAccountOpen(false); openAuth("register"); }} className="rounded-full border border-white/20 bg-white/10 px-3 py-3 text-sm font-bold text-white">Đăng ký</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom dock */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[80] pointer-events-none pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-md px-3 pb-2.5 pt-1">
          <nav
            className="bottom-dock-surface pointer-events-auto grid grid-cols-5 items-center rounded-[26px] px-1.5 py-2 bg-white/[0.1] border border-white/20 shadow-[0_8px_36px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-2xl"
            style={{ WebkitBackdropFilter: "blur(28px) saturate(160%)" }}
          >
            {/* Home */}
            <Link
              href="/"
              onClick={(event) => handleDockNavigation(event, isHome)}
              className="flex flex-col items-center justify-center gap-0.5 py-1"
            >
              <Home
                size={22}
                strokeWidth={isHome ? 2.3 : 1.7}
                className={isHome ? "text-[#ffd875]" : "text-white/65"}
              />
              <span
                className={`text-[10px] font-medium ${
                  isHome ? "text-[#ffd875]" : "text-white/55"
                }`}
              >
                Trang chủ
              </span>
            </Link>

            {/* Series */}
            <Link
              href="/danh-sach/phim-bo"
              onClick={(event) => handleDockNavigation(event, isSeries)}
              className="flex flex-col items-center justify-center gap-0.5 py-1"
            >
              <Tv
                size={22}
                strokeWidth={isSeries ? 2.3 : 1.7}
                className={isSeries ? "text-[#ffd875]" : "text-white/65"}
              />
              <span
                className={`text-[10px] font-medium ${
                  isSeries ? "text-[#ffd875]" : "text-white/55"
                }`}
              >
                Phim bộ
              </span>
            </Link>

            {/* Search — center raised */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-full flex-col items-center justify-center py-1"
              aria-label="Tìm kiếm"
            >
              <div
                className="flex h-[44px] w-[44px] items-center justify-center rounded-full
                  bg-gradient-to-br from-white/25 to-white/10
                  border border-white/35
                  shadow-[0_6px_20px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.45)]
                  backdrop-blur-md active:scale-90 transition-transform"
              >
                <Search size={24} strokeWidth={2.2} className="text-white" />
              </div>
            </button>

            {/* Movies */}
            <Link
              href="/danh-sach/phim-le"
              onClick={(event) => handleDockNavigation(event, isSingle)}
              className="flex flex-col items-center justify-center gap-0.5 py-1"
            >
              <Clapperboard
                size={22}
                strokeWidth={isSingle ? 2.3 : 1.7}
                className={isSingle ? "text-[#ffd875]" : "text-white/65"}
              />
              <span
                className={`text-[10px] font-medium ${
                  isSingle ? "text-[#ffd875]" : "text-white/55"
                }`}
              >
                Phim lẻ
              </span>
            </Link>

            {/* Account */}
            <button
              type="button"
              onClick={handleAccount}
              className="flex flex-col items-center justify-center gap-0.5 py-1"
            >
              <UserCircle
                size={22}
                strokeWidth={user ? 2.3 : 1.7}
                className={user ? "text-[#ffd875]" : "text-white/65"}
              />
              <span
                className={`text-[10px] font-medium ${
                  user ? "text-[#ffd875]" : "text-white/55"
                }`}
              >
                Tài khoản
              </span>
            </button>
          </nav>
        </div>
      </div>
    </>
  );
}
