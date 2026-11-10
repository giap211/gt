"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Clapperboard,
  Search,
  UserCircle,
  X,
  Loader2,
  Bookmark,
  LogOut,
  Sun,
  Moon,
  History,
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
  const isList =
    pathname.startsWith("/danh-sach") ||
    pathname.startsWith("/the-loai") ||
    pathname.startsWith("/quoc-gia");
  const isWatchPage = pathname.startsWith("/xem-phim/");

  useEffect(() => {
    setSearchOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    const openSearchFromOutside = () => {
      setAccountOpen(false);
      setSearchOpen(true);
    };
    window.addEventListener("gt:open-search", openSearchFromOutside);
    return () => window.removeEventListener("gt:open-search", openSearchFromOutside);
  }, []);

  useEffect(() => {
    ["/", "/danh-sach/phim-bo", "/danh-sach/phim-le"].forEach((href) => {
      router.prefetch(href);
    });
  }, [router]);

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
  const closeDockPanels = () => {
    setSearchOpen(false);
    setAccountOpen(false);
  };
  const handleDockNavigation = (
    event: React.MouseEvent<HTMLAnchorElement>,
    active: boolean,
  ) => {
    closeDockPanels();
    if (active) {
      event.preventDefault();
      scrollToTop();
    }
  };
  const handleSearch = () => {
    setAccountOpen(false);
    setSearchOpen((open) => !open);
  };
  const handleAccount = () => {
    setSearchOpen(false);
    setAccountOpen((open) => !open);
  };
  const submitSearch = () => {
    const q = query.trim();
    if (!q) return;
    setSearchOpen(false);
    router.push(`/tim-kiem?keyword=${encodeURIComponent(q)}`);
  };

  if (isWatchPage) return null;

  return (
    <>
      {searchOpen && (
        <div className="mobile-search-overlay lg:hidden fixed inset-0 z-[70] bg-[#0a0b10] flex flex-col pb-[calc(env(safe-area-inset-bottom)+88px)]">
          <div className="flex items-center gap-2 px-3 pt-[max(12px,env(safe-area-inset-top))] pb-2 border-b border-white/10">
            <button type="button" onClick={() => setSearchOpen(false)} className="w-10 h-10 flex items-center justify-center text-white/70" aria-label="Đóng">
              <X size={22} />
            </button>
            <form className="flex-1 relative" onSubmit={(e) => { e.preventDefault(); submitSearch(); }}>
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm phim, diễn viên..."
                className="w-full h-11 rounded-xl bg-white/[0.06] border border-white/10 pl-10 pr-10 text-[15px] text-white placeholder:text-white/35 outline-none focus:border-violet-400/50"
              />
              {query && (
                <button type="button" onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
                  <X size={16} />
                </button>
              )}
            </form>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-2">
            {isSearching && (
              <div className="flex items-center justify-center gap-2 py-10 text-white/40 text-sm">
                <Loader2 size={16} className="animate-spin text-violet-400" />
                Đang tìm...
              </div>
            )}
            {!isSearching && query.trim().length >= 2 && results.length === 0 && (
              <div className="py-12 text-center text-sm text-white/40">Không tìm thấy kết quả</div>
            )}
            {!isSearching && results.length > 0 && (
              <div className="space-y-1">
                {results.map((item) => (
                  <Link key={item._id} href={`/phim/${item.slug}`} onClick={() => setSearchOpen(false)} className="flex items-center gap-3 p-2.5 rounded-xl active:bg-white/[0.06]">
                    <div className="relative w-11 h-14 rounded-lg overflow-hidden bg-white/5 shrink-0 border border-white/10">
                      <Image src={item.poster_url} alt={item.name} fill sizes="44px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-white line-clamp-1">{item.name}</p>
                      <p className="text-[12px] text-white/45 line-clamp-1 mt-0.5">{item.origin_name}</p>
                      <p className="text-[11px] text-violet-300/90 mt-1">{item.year || "—"} · HD</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {!isSearching && query.trim().length < 2 && (
              <div className="py-12 text-center text-sm text-white/35">Nhập ít nhất 2 ký tự để tìm kiếm</div>
            )}
          </div>
        </div>
      )}

      {accountOpen && (
        <div className="mobile-account-sheet lg:hidden fixed inset-0 z-[70] bg-[#0a0b10]/95 backdrop-blur-md flex flex-col pb-[calc(env(safe-area-inset-bottom)+88px)]">
          <div className="flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 border-b border-white/10">
            <h2 className="text-base font-bold text-white">Cá nhân</h2>
            <button type="button" onClick={() => setAccountOpen(false)} className="w-9 h-9 flex items-center justify-center text-white/60" aria-label="Đóng">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {user ? (
              <>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm font-semibold text-white">{user.name || user.email}</p>
                  <p className="text-xs text-white/45 mt-0.5">{user.email}</p>
                </div>
                <button type="button" onClick={() => { setAccountOpen(false); openLibrary("history"); }} className="w-full flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-white/85">
                  <History size={18} className="text-violet-400" /> Lịch sử xem
                </button>
                <button type="button" onClick={() => { setAccountOpen(false); openLibrary("favorites"); }} className="w-full flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-white/85">
                  <Bookmark size={18} className="text-violet-400" /> Đã lưu
                </button>
                <button type="button" onClick={toggleMobileTheme} className="w-full flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-white/85">
                  {mobileTheme === "dark" ? <Sun size={18} className="text-violet-400" /> : <Moon size={18} className="text-violet-400" />}
                  {mobileTheme === "dark" ? "Giao diện sáng" : "Giao diện tối"}
                </button>
                <button type="button" onClick={() => { logout(); setAccountOpen(false); }} className="w-full flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-left text-sm text-red-300">
                  <LogOut size={18} /> Đăng xuất
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => { setAccountOpen(false); openAuth("login"); }} className="w-full rounded-xl bg-violet-600 py-3 text-center text-sm font-bold text-white">
                  Đăng nhập
                </button>
                <button type="button" onClick={() => { setAccountOpen(false); openAuth("register"); }} className="w-full rounded-xl border border-white/15 py-3 text-center text-sm font-semibold text-white/80">
                  Đăng ký
                </button>
                <button type="button" onClick={toggleMobileTheme} className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm text-white/70">
                  {mobileTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                  {mobileTheme === "dark" ? "Giao diện sáng" : "Giao diện tối"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="gt-dock lg:hidden fixed bottom-0 left-0 right-0 z-[80] pointer-events-none pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-md px-4 pb-3 pt-1">
          <nav className="gt-dock-nav pointer-events-auto" aria-label="Điều hướng chính">
            <Link
              href="/"
              onClick={(e) => handleDockNavigation(e, isHome)}
              className={`gt-dock-item ${isHome && !searchOpen && !accountOpen ? "is-active" : ""}`}
              aria-current={isHome && !searchOpen && !accountOpen ? "page" : undefined}
            >
              <Home size={22} strokeWidth={isHome && !searchOpen && !accountOpen ? 2.4 : 1.8} />
              <span>Trang chủ</span>
            </Link>
            <Link
              href="/danh-sach/phim-bo"
              onClick={(e) => handleDockNavigation(e, isList)}
              className={`gt-dock-item ${isList && !searchOpen && !accountOpen ? "is-active" : ""}`}
              aria-current={isList && !searchOpen && !accountOpen ? "page" : undefined}
            >
              <Clapperboard size={22} strokeWidth={isList && !searchOpen && !accountOpen ? 2.4 : 1.8} />
              <span>Danh sách</span>
            </Link>
            <button
              type="button"
              onClick={handleSearch}
              className={`gt-dock-item ${searchOpen ? "is-active" : ""}`}
              aria-label="Tìm kiếm"
              aria-pressed={searchOpen}
            >
              <Search size={22} strokeWidth={searchOpen ? 2.4 : 1.8} />
              <span>Tìm kiếm</span>
            </button>
            <button
              type="button"
              onClick={handleAccount}
              className={`gt-dock-item ${accountOpen ? "is-active" : ""}`}
              aria-label="Cá nhân"
              aria-pressed={accountOpen}
            >
              <UserCircle size={22} strokeWidth={accountOpen || user ? 2.3 : 1.8} />
              <span>Cá nhân</span>
            </button>
          </nav>
        </div>
      </div>

      <style jsx global>{`
        .gt-dock-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 4px;
          padding: 8px 10px;
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(139, 92, 246, 0.12);
          box-shadow: 0 10px 40px rgba(88, 28, 135, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04);
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
        }
        html[data-mobile-theme="dark"] .gt-dock-nav {
          background: rgba(24, 24, 32, 0.92);
          border-color: rgba(255, 255, 255, 0.08);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.45);
        }
        .gt-dock-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          min-height: 52px;
          padding: 6px 4px;
          border-radius: 20px;
          color: #9ca3af;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: -0.01em;
          transition: all 0.2s ease;
          border: none;
          background: transparent;
          cursor: pointer;
          text-decoration: none;
        }
        .gt-dock-item.is-active {
          color: #fff;
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          box-shadow: 0 6px 18px rgba(124, 58, 237, 0.35);
        }
        html[data-mobile-theme="light"] .gt-dock-item:not(.is-active) {
          color: #9ca3af;
        }
        html[data-mobile-theme="dark"] .gt-dock-item:not(.is-active) {
          color: rgba(255, 255, 255, 0.45);
        }
        html[data-mobile-theme="light"] body {
          background: linear-gradient(180deg, #f3f0ff 0%, #f8f7fc 40%, #f5f3fb 100%) !important;
        }
        html[data-mobile-theme="dark"] body {
          background: #0c0c12 !important;
        }
        @media (min-width: 1024px) {
          .gt-dock { display: none !important; }
        }
      `}</style>
    </>
  );
}
