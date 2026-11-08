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
  ChevronRight,
  History,
  Settings2,
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
  const isWatchPage = pathname.startsWith("/xem-phim/");

  useEffect(() => {
    setSearchOpen(false);
  }, [pathname]);

  // Prefetch the main dock destinations while the current page is idle.
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

  if (isWatchPage) return null;

  return (
    <>
      <style jsx global>{`
        @media (max-width: 1023px) {
          html[data-mobile-theme="light"] body { background: #eef1f5 !important; color: #252a36 !important; }
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
          html[data-mobile-theme="light"] body [class*="bg-[#2"] { background-color: #eef1f5 !important; }
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
          html[data-mobile-theme="light"] body .mobile-search-overlay { background: #eef1f5 !important; }

          /* Home hero: preserve readable cinematic text over the image. */
          html[data-mobile-theme="light"] body main > section:first-child {
            background: #eef1f5 !important;
          }
          html[data-mobile-theme="light"] body main > section:first-child a {
            color: #fff !important;
          }
          html[data-mobile-theme="light"] body main > section:first-child a h1 {
            color: #fff !important;
            text-shadow: 0 2px 5px rgba(0,0,0,.9), 0 5px 18px rgba(0,0,0,.72);
          }
          html[data-mobile-theme="light"] body main > section:first-child .container p {
            color: #ffe3a0 !important;
            text-shadow: 0 2px 5px rgba(0,0,0,.9);
          }
          html[data-mobile-theme="light"] body main > section:first-child .container span {
            text-shadow: none;
          }
          /* Clear, coordinated hero labels for the light theme. */
          html[data-mobile-theme="light"] body main > section:first-child .hero-source-badge {
            border: 1px solid transparent !important;
            box-shadow: 0 3px 10px rgba(15,23,42,.16) !important;
            letter-spacing: .075em !important;
            text-shadow: none !important;
          }
          html[data-mobile-theme="light"] body main > section:first-child .hero-source-netflix {
            color: #fff !important;
            background: #e50914 !important;
            border-color: rgba(255,255,255,.55) !important;
          }
          html[data-mobile-theme="light"] body main > section:first-child .hero-source-tmdb {
            color: #eaf5ff !important;
            background: #173b59 !important;
            border-color: rgba(255,255,255,.35) !important;
          }
          html[data-mobile-theme="light"] body main > section:first-child .hero-source-latest {
            color: #63440c !important;
            background: #f8e7b8 !important;
            border-color: #e6c46d !important;
          }
          html[data-mobile-theme="light"] body main > section:first-child .hero-meta-badge {
            display: inline-flex;
            align-items: center;
            min-height: 22px;
            padding: 3px 9px !important;
            border-radius: 7px !important;
            border: 1px solid rgba(42,55,78,.14) !important;
            background: rgba(248,250,253,.94) !important;
            color: #344258 !important;
            font-weight: 700 !important;
            letter-spacing: .025em;
            box-shadow: 0 2px 7px rgba(15,23,42,.10);
            text-shadow: none !important;
          }
          html[data-mobile-theme="light"] body main > section:first-child .hero-meta-quality {
            color: #155b50 !important;
            background: #dff4ed !important;
            border-color: #a8dccc !important;
          }
          html[data-mobile-theme="light"] body main > section:first-child .hero-meta-year {
            color: #344258 !important;
            background: rgba(255,255,255,.96) !important;
          }
          html[data-mobile-theme="light"] body main > section:first-child .hero-meta-episode {
            color: #46536a !important;
            background: #e9edf4 !important;
          }
          html[data-mobile-theme="light"] body main > section:first-child .hero-meta-language {
            color: #654b19 !important;
            background: #fbf0d7 !important;
            border-color: #ead7a8 !important;
          }
          /* Fade the home hero into the soft light page surface, not over the thumbnail dots. */
          html[data-mobile-theme="light"] body main > section:first-child .swiper-slide > div.pointer-events-none {
            background: linear-gradient(
              to bottom,
              rgba(238,241,245,0) 0%,
              rgba(238,241,245,.76) 52%,
              #eef1f5 100%
            ) !important;
          }
          html[data-mobile-theme="light"] body main > section:first-child .hero-cast-slider .swiper-slide > div {
            background-color: #292c38 !important;
            border-color: rgba(255,255,255,.45) !important;
          }
          /* Detail-page hero fades into the same light surface as its content. */
          html[data-mobile-theme="light"] body .movie-detail-hero {
            background: #eef1f5 !important;
          }
          html[data-mobile-theme="light"] body .movie-detail-hero-fade {
            background: linear-gradient(
              to bottom,
              rgba(238,241,245,0) 0%,
              rgba(238,241,245,.38) 38%,
              rgba(238,241,245,.88) 72%,
              #eef1f5 100%
            ) !important;
          }
          html[data-mobile-theme="light"] body .movie-detail-content h1 {
            color: #263247 !important;
            text-shadow: none !important;
            letter-spacing: -.025em;
          }
          html[data-mobile-theme="light"] body .movie-detail-content > p {
            color: #96702b !important;
            font-weight: 600;
          }
          html[data-mobile-theme="light"] body .movie-detail-content > button {
            color: #8a641f !important;
          }
          /* Remove the heavy drop shadows from the topic chips in light mode. */
          html[data-mobile-theme="light"] body main > div > section:has(a[href="/the-loai/chieu-rap"]) a {
            box-shadow: none !important;
            border: 1px solid rgba(255,255,255,.32);
          }

          /* Give the topic heading a deliberate hierarchy in light mode. */
          html[data-mobile-theme="light"] body main > div > section:has(a[href="/the-loai/chieu-rap"]) h2 {
            display: flex;
            align-items: center;
            gap: 9px;
            color: #263247 !important;
            letter-spacing: -.01em;
          }
          html[data-mobile-theme="light"] body main > div > section:has(a[href="/the-loai/chieu-rap"]) h2::before {
            content: "";
            display: inline-block;
            width: 3px;
            height: 17px;
            flex: 0 0 3px;
            border-radius: 99px;
            background: linear-gradient(180deg, #e8b94f, #d99a25);
            box-shadow: 0 2px 8px rgba(217,154,37,.2);
          }
          html[data-mobile-theme="light"] body main > div > section:has(a[href="/the-loai/chieu-rap"]) a span {
            color: #fff !important;
            text-shadow: 0 1px 2px rgba(0,0,0,.22);
          }
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
        <div
          className="lg:hidden fixed inset-0 z-[70] flex items-end justify-center bg-black/60 px-3 pt-[max(16px,env(safe-area-inset-top))] pb-[calc(env(safe-area-inset-bottom)+104px)] backdrop-blur-md"
          onClick={() => setAccountOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Tài khoản"
            className="mobile-account-sheet flex w-full max-w-md flex-col overflow-hidden rounded-[30px] border border-white/20 bg-[#171923]/95 shadow-[0_24px_80px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,.18)] backdrop-blur-2xl"
            style={{
              maxHeight: "calc(100dvh - env(safe-area-inset-top) - 124px)",
              WebkitBackdropFilter: "blur(30px) saturate(175%)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="shrink-0 px-5 pt-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#ffd875]">Không gian của bạn</p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-white">Tài khoản</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setAccountOpen(false)}
                  aria-label="Đóng menu tài khoản"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-white/75 transition active:scale-95 active:bg-white/15"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="relative mb-4 overflow-hidden rounded-[22px] border border-white/15 bg-gradient-to-br from-white/[0.13] via-white/[0.07] to-[#ffd875]/[0.08] p-4">
                <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#ffd875]/10 blur-2xl" />
                <div className="relative flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#ffd875]/30 bg-[#ffd875]/15 text-[#ffd875] shadow-inner">
                    <UserCircle size={27} strokeWidth={1.7} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-white/50">{user ? "Chào mừng trở lại" : "Trải nghiệm xem phim của bạn"}</p>
                    <p className="mt-0.5 truncate text-base font-bold text-white">{user ? user.username : "Chào mừng bạn!"}</p>
                    <p className="mt-0.5 text-xs text-white/50">{user ? "Tài khoản GiapTran" : "Đăng nhập để đồng bộ lịch sử và tủ phim"}</p>
                  </div>
                  {user && <span className="rounded-full border border-[#ffd875]/25 bg-[#ffd875]/10 px-2.5 py-1 text-[10px] font-semibold text-[#ffd875]">Thành viên</span>}
                </div>
                {!user && (
                  <div className="relative mt-4 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => { setAccountOpen(false); openAuth("login"); }} className="rounded-full bg-[#ffd875] px-3 py-2.5 text-sm font-bold text-[#171923] shadow-[0_5px_18px_rgba(255,216,117,.18)] active:scale-[.98]">Đăng nhập</button>
                    <button type="button" onClick={() => { setAccountOpen(false); openAuth("register"); }} className="rounded-full border border-white/20 bg-white/[0.08] px-3 py-2.5 text-sm font-semibold text-white active:bg-white/15">Tạo tài khoản</button>
                  </div>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
              {user && (
                <div className="mb-4">
                  <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Thư viện cá nhân</p>
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045]">
                    <button type="button" onClick={() => { setAccountOpen(false); openLibrary("favorites"); }} className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left text-sm text-white/90 transition active:bg-white/10">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ffd875]/12 text-[#ffd875]"><Bookmark size={18} /></span>
                      <span className="min-w-0 flex-1"><span className="block font-semibold">Tủ phim của tôi</span><span className="mt-0.5 block text-xs text-white/40">Phim đã lưu và yêu thích</span></span>
                      <ChevronRight size={17} className="text-white/35" />
                    </button>
                    <div className="mx-3.5 border-t border-white/[0.08]" />
                    <button type="button" onClick={() => { setAccountOpen(false); openLibrary("history"); }} className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left text-sm text-white/90 transition active:bg-white/10">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300"><History size={18} /></span>
                      <span className="min-w-0 flex-1"><span className="block font-semibold">Phim đang xem</span><span className="mt-0.5 block text-xs text-white/40">Tiếp tục từ nơi bạn đã dừng</span></span>
                      <ChevronRight size={17} className="text-white/35" />
                    </button>
                  </div>
                </div>
              )}

              <div className="mb-3">
                <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Tùy chỉnh ứng dụng</p>
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045]">
                  <button type="button" onClick={toggleMobileTheme} className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left text-sm text-white/90 transition active:bg-white/10">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">{mobileTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</span>
                    <span className="min-w-0 flex-1"><span className="block font-semibold">Giao diện</span><span className="mt-0.5 block text-xs text-white/40">Chuyển sang chế độ {mobileTheme === "dark" ? "sáng" : "tối"}</span></span>
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-white/65">{mobileTheme === "dark" ? "Tối" : "Sáng"}</span>
                  </button>
                </div>
              </div>

              {user && (
                <button type="button" onClick={async () => { setAccountOpen(false); await logout(); }} className="flex w-full items-center gap-3 rounded-2xl border border-red-400/15 bg-red-400/[0.055] px-3.5 py-3 text-left text-sm font-semibold text-red-300 transition active:bg-red-400/10">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-400/10"><LogOut size={18} /></span>
                  Đăng xuất
                  <ChevronRight size={17} className="ml-auto text-red-300/50" />
                </button>
              )}
              <p className="px-1 pt-3 text-center text-[10px] text-white/25">GIAPTRAN · XEM PHIM THEO CÁCH CỦA BẠN</p>
            </div>
          </section>
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
                className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-gradient-to-br from-white/25 to-white/10 border border-white/35 shadow-[0_6px_20px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-md active:scale-90 transition-transform"
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
