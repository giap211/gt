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
  const dockNavRef = useRef<HTMLElement>(null);
  const dockPointerRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startIndex: number;
    lastIndex: number;
    dragging: boolean;
  } | null>(null);
  const suppressDockClickRef = useRef(false);
  const [dockDragIndex, setDockDragIndex] = useState<number | null>(null);
  const [dockDragRect, setDockDragRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

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
    if (suppressDockClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    closeDockPanels();
    if (active) {
      event.preventDefault();
      scrollToTop();
    }
  };
  const handleSearch = () => {
    if (suppressDockClickRef.current) return;
    setAccountOpen(false);
    setSearchOpen((open) => !open);
  };
  const handleAccount = () => {
    if (suppressDockClickRef.current) return;
    setSearchOpen(false);
    setAccountOpen((open) => !open);
  };
  const submitSearch = () => {
    const q = query.trim();
    if (!q) return;
    setSearchOpen(false);
    router.push(`/tim-kiem?keyword=${encodeURIComponent(q)}`);
  };

  const dockItemAtPoint = (clientX: number, clientY: number) => {
    const nav = dockNavRef.current;
    const target = document.elementFromPoint(clientX, clientY);
    const item = target instanceof HTMLElement ? target.closest<HTMLElement>(".gt-dock-item") : null;
    if (!nav || !item || !nav.contains(item)) return null;
    const items = Array.from(nav.querySelectorAll<HTMLElement>(".gt-dock-item"));
    const index = items.indexOf(item);
    if (index < 0) return null;
    const navRect = nav.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    return {
      index,
      rect: {
        left: itemRect.left - navRect.left,
        top: itemRect.top - navRect.top,
        width: itemRect.width,
        height: itemRect.height,
      },
    };
  };

  const activateDockItem = (index: number) => {
    if (index === 0) {
      closeDockPanels();
      if (isHome) scrollToTop();
      else router.push("/");
    } else if (index === 1) {
      closeDockPanels();
      if (isList) scrollToTop();
      else router.push("/danh-sach/phim-bo");
    } else if (index === 2) {
      setAccountOpen(false);
      setSearchOpen(true);
    } else if (index === 3) {
      setSearchOpen(false);
      setAccountOpen(true);
    }
  };

  const handleDockPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    const target = event.target as HTMLElement;
    const item = target.closest<HTMLElement>(".gt-dock-item");
    const nav = dockNavRef.current;
    if (!item || !nav) return;
    const items = Array.from(nav.querySelectorAll<HTMLElement>(".gt-dock-item"));
    const index = items.indexOf(item);
    if (index < 0) return;
    dockPointerRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startIndex: index,
      lastIndex: index,
      dragging: false,
    };
    const hit = dockItemAtPoint(event.clientX, event.clientY);
    if (hit) {
      setDockDragIndex(index);
      setDockDragRect(hit.rect);
    }
    dockNavRef.current?.classList.add("is-pressing");
  };

  const handleDockPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const pointer = dockPointerRef.current;
    const nav = dockNavRef.current;
    if (!pointer || !nav || pointer.pointerId !== event.pointerId) return;
    if (!pointer.dragging) {
      if (Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) < 8) return;
      pointer.dragging = true;
      suppressDockClickRef.current = true;
      try { nav.setPointerCapture(event.pointerId); } catch { /* capture may be unavailable */ }
      nav.classList.add("is-dragging");
    }
    event.preventDefault();
    const hit = dockItemAtPoint(event.clientX, event.clientY);
    if (!hit) {
      pointer.lastIndex = -1;
      setDockDragIndex(null);
      setDockDragRect(null);
      return;
    }
    pointer.lastIndex = hit.index;
    setDockDragIndex(hit.index);
    setDockDragRect(hit.rect);
  };

  const finishDockPointer = (event: React.PointerEvent<HTMLElement>, cancelled = false) => {
    const pointer = dockPointerRef.current;
    const nav = dockNavRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    dockPointerRef.current = null;
    nav?.classList.remove("is-pressing");
    if (pointer.dragging) {
      event.preventDefault();
      nav?.classList.remove("is-dragging");
      try { if (nav?.hasPointerCapture(event.pointerId)) nav.releasePointerCapture(event.pointerId); } catch { /* ignore */ }
      const finalHit = dockItemAtPoint(event.clientX, event.clientY);
      const finalIndex = finalHit?.index ?? -1;
      setDockDragIndex(null);
      setDockDragRect(null);
      if (!cancelled && finalIndex >= 0) activateDockItem(finalIndex);
      // Keep the guard alive through the browser's synthetic click after pointerup.
      window.setTimeout(() => { suppressDockClickRef.current = false; }, 180);
    } else {
      setDockDragIndex(null);
      setDockDragRect(null);
      suppressDockClickRef.current = false;
    }
  };

  const handleDockClickCapture = (event: React.MouseEvent<HTMLElement>) => {
    if (!suppressDockClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
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
                className="w-full h-11 rounded-xl bg-white/[0.06] border border-white/10 pl-10 pr-10 text-base text-white placeholder:text-white/35 outline-none focus:border-violet-400/50"
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
          <nav
            ref={dockNavRef}
            className={`gt-dock-nav pointer-events-auto ${dockDragIndex !== null ? "is-dragging" : ""}`}
            aria-label="Điều hướng chính"
            onPointerDown={handleDockPointerDown}
            onPointerMove={handleDockPointerMove}
            onPointerUp={(event) => finishDockPointer(event)}
            onPointerCancel={(event) => finishDockPointer(event, true)}
            onClickCapture={handleDockClickCapture}
          >
            {dockDragRect && (
              <span
                className="gt-dock-drag-indicator"
                aria-hidden="true"
                style={{
                  left: dockDragRect.left,
                  top: dockDragRect.top,
                  width: dockDragRect.width,
                  height: dockDragRect.height,
                }}
              />
            )}
            <Link
              href="/"
              onClick={(e) => handleDockNavigation(e, isHome)}
              className={`gt-dock-item ${isHome && !searchOpen && !accountOpen ? "is-active" : ""} ${dockDragIndex === 0 ? "is-drag-target" : ""}`}
              aria-current={isHome && !searchOpen && !accountOpen ? "page" : undefined}
            >
              <Home size={22} strokeWidth={isHome && !searchOpen && !accountOpen ? 2.4 : 1.8} />
              <span>Trang chủ</span>
            </Link>
            <Link
              href="/danh-sach/phim-bo"
              onClick={(e) => handleDockNavigation(e, isList)}
              className={`gt-dock-item ${isList && !searchOpen && !accountOpen ? "is-active" : ""} ${dockDragIndex === 1 ? "is-drag-target" : ""}`}
              aria-current={isList && !searchOpen && !accountOpen ? "page" : undefined}
            >
              <Clapperboard size={22} strokeWidth={isList && !searchOpen && !accountOpen ? 2.4 : 1.8} />
              <span>Danh sách</span>
            </Link>
            <button
              type="button"
              onClick={handleSearch}
              className={`gt-dock-item ${searchOpen ? "is-active" : ""} ${dockDragIndex === 2 ? "is-drag-target" : ""}`}
              aria-label="Tìm kiếm"
              aria-pressed={searchOpen}
            >
              <Search size={22} strokeWidth={searchOpen ? 2.4 : 1.8} />
              <span>Tìm kiếm</span>
            </button>
            <button
              type="button"
              onClick={handleAccount}
              className={`gt-dock-item ${accountOpen ? "is-active" : ""} ${dockDragIndex === 3 ? "is-drag-target" : ""}`}
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
          position: relative;
          touch-action: pan-y;
          isolation: isolate;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 4px;
          padding: 8px 10px;
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.23);
          border: 1px solid rgba(139, 92, 246, 0.06);
          box-shadow: 0 10px 40px rgba(88, 28, 135, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04);
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
        }
        /* Directional specular rim: concentrated highlights, not a flat white outline. */
        .gt-dock-nav::before {
          content: "";
          position: absolute;
          inset: 0;
          padding: 1.15px;
          border-radius: inherit;
          pointer-events: none;
          background: conic-gradient(
            from -38deg,
            rgba(255,255,255,.08) 0deg,
            rgba(255,255,255,.72) 34deg,
            rgba(221,214,254,.48) 62deg,
            rgba(255,255,255,.06) 108deg,
            rgba(255,255,255,.02) 190deg,
            rgba(196,181,253,.24) 248deg,
            rgba(255,255,255,.82) 286deg,
            rgba(255,255,255,.08) 322deg,
            rgba(255,255,255,.08) 360deg
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: .9;
        }
        .gt-dock-nav::after {
          content: "";
          position: absolute;
          inset: 1px;
          border-radius: inherit;
          pointer-events: none;
          background: linear-gradient(115deg, rgba(255,255,255,.13), transparent 24%, transparent 72%, rgba(196,181,253,.07));
          opacity: .55;
          z-index: -1;
        }
        html[data-mobile-theme="dark"] .gt-dock-nav {
          background: rgba(24, 24, 32, 0.24);
          border-color: rgba(255, 255, 255, 0.08);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255,255,255,.035);
        }
        html[data-mobile-theme="dark"] .gt-dock-nav::before { opacity: .82; }
        html[data-mobile-theme="light"] .gt-dock-nav::before { opacity: .72; }

        .gt-dock-drag-indicator {
          position: absolute;
          z-index: 0;
          pointer-events: none;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(255,255,255,.46), rgba(221,214,254,.20) 52%, rgba(255,255,255,.28));
          border: 1px solid rgba(255,255,255,.58);
          box-shadow: 0 5px 22px rgba(124,58,237,.18), inset 0 1px 0 rgba(255,255,255,.78), inset 0 -1px 0 rgba(196,181,253,.24);
          backdrop-filter: blur(18px) saturate(190%);
          -webkit-backdrop-filter: blur(18px) saturate(190%);
          transform: scale(1.055);
          opacity: .82;
          transition: left .075s linear, width .075s linear, top .075s linear, height .075s linear;
        }
        html[data-mobile-theme="dark"] .gt-dock-drag-indicator {
          background: linear-gradient(135deg, rgba(255,255,255,.30), rgba(196,181,253,.18) 52%, rgba(255,255,255,.16));
          border-color: rgba(255,255,255,.48);
        }
        .gt-dock-nav.is-pressing .gt-dock-item.is-active {
          background: transparent;
          box-shadow: none;
        }
        .gt-dock-nav.is-pressing .gt-dock-item.is-active::before,
        .gt-dock-nav.is-pressing .gt-dock-item.is-active::after { opacity: 0; }
        .gt-dock-nav.is-pressing .gt-dock-drag-indicator {
          opacity: .78;
          transform: scale(1.075);
          filter: blur(.35px);
        }
        .gt-dock-nav.is-dragging .gt-dock-item.is-active {
          background: transparent;
          box-shadow: none;
        }
        .gt-dock-nav.is-dragging .gt-dock-item.is-active::before,
        .gt-dock-nav.is-dragging .gt-dock-item.is-active::after { opacity: 0; }
        .gt-dock-item.is-drag-target {
          color: inherit;
          transform: none;
          text-shadow: none;
        }
        .gt-dock-nav.is-dragging .gt-dock-drag-indicator {
          opacity: .92;
          transform: scale(1.045);
        }
        .gt-dock-item {
          position: relative;
          z-index: 1;
          isolation: isolate;
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
          transition: color .2s ease, background .25s ease, box-shadow .25s ease, transform .25s ease;
          border: none;
          background: transparent;
          cursor: pointer;
          text-decoration: none;
          -webkit-tap-highlight-color: transparent;
        }
        .gt-dock-item.is-active {
          color: #fff;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.13) 0%, rgba(124, 58, 237, 0.075) 52%, rgba(196,181,253,.12) 100%);
          box-shadow: 0 4px 18px rgba(124, 58, 237, 0.10), inset 0 1px 0 rgba(255,255,255,.18), inset 0 -1px 0 rgba(167,139,250,.12);
        }
        /* The selected capsule gets its own matching specular edge and soft glass sheen. */
        .gt-dock-item.is-active::before {
          content: "";
          position: absolute;
          inset: 0;
          padding: 1px;
          border-radius: inherit;
          pointer-events: none;
          background: conic-gradient(
            from -42deg,
            rgba(255,255,255,.10) 0deg,
            rgba(255,255,255,.92) 38deg,
            rgba(221,214,254,.72) 68deg,
            rgba(255,255,255,.12) 126deg,
            rgba(167,139,250,.10) 208deg,
            rgba(196,181,253,.62) 260deg,
            rgba(255,255,255,.88) 296deg,
            rgba(255,255,255,.10) 336deg,
            rgba(255,255,255,.10) 360deg
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: .9;
        }
        .gt-dock-item.is-active::after {
          content: "";
          position: absolute;
          inset: 1px;
          border-radius: inherit;
          pointer-events: none;
          background: linear-gradient(115deg, rgba(255,255,255,.20), transparent 38%, transparent 72%, rgba(196,181,253,.10));
          opacity: .8;
        }
        .gt-dock-item > svg,
        .gt-dock-item > span { position: relative; z-index: 1; }
        html[data-mobile-theme="light"] .gt-dock-item:not(.is-active) { color: #9ca3af; }
        html[data-mobile-theme="dark"] .gt-dock-item:not(.is-active) { color: rgba(255, 255, 255, 0.45); }
        html[data-mobile-theme="light"] .gt-dock-item.is-active { color: #5b21b6; }
        html[data-mobile-theme="dark"] .gt-dock-item.is-active { color: #fff; }
        html[data-mobile-theme="light"] body {
          background: linear-gradient(180deg, #f3f0ff 0%, #f8f7fc 40%, #f5f3fb 100%) !important;
        }
        html[data-mobile-theme="dark"] body { background: #0c0c12 !important; }
        @media (prefers-reduced-motion: reduce) {
          .gt-dock-item { transition: none; }
        }
        @media (min-width: 1024px) { .gt-dock { display: none !important; } }
      `}</style>
    </>
  );
}
