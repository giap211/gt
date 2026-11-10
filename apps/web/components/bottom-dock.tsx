"use client";

import { useEffect, useId, useRef, useState } from "react";
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

/**
 * Kube Playground refraction pipeline.
 * Adapted from https://github.com/kube/kube.io/tree/main/app/data/articles/2025_10_04_liquid_glass_css_svg
 * Keep the ray calculation, 512-sample profile, radial map and RG encoding unchanged.
 */
type KubeDockDisplacement = {
  url: string;
  width: number;
  height: number;
  scale: number;
};

function createKubeDockDisplacement(width: number, height: number): KubeDockDisplacement | null {
  if (typeof window === "undefined" || width < 2 || height < 2) return null;

  const dpr = window.devicePixelRatio || 1;
  const glassThickness = 50;
  const radius = Math.max(2, Math.min(28, height / 2 - 1));
  const bezelWidth = Math.max(1, Math.min(18, radius - 1));
  const refractiveIndex = 1.5;
  const samples = 512;
  const eta = 1 / refractiveIndex;

  // Playground's default surface: Convex Circle.
  const bezelHeightFn = (x: number) => Math.sqrt(1 - (1 - x) ** 2);

  // Exact simplified Snell refraction used by Kube's Playground.
  function refract(normalX: number, normalY: number): [number, number] | null {
    const dot = normalY;
    const k = 1 - eta * eta * (1 - dot * dot);
    if (k < 0) return null;
    const kSqrt = Math.sqrt(k);
    return [
      -(eta * dot + kSqrt) * normalX,
      eta - (eta * dot + kSqrt) * normalY,
    ];
  }

  // Exact 1D precomputed displacement profile from Kube's Playground.
  const profile = Array.from({ length: samples }, (_, i) => {
    const x = i / samples;
    const y = bezelHeightFn(x);
    const dx = x < 1 ? 0.0001 : -0.0001;
    const y2 = bezelHeightFn(x + dx);
    const derivative = (y2 - y) / dx;
    const magnitude = Math.sqrt(derivative * derivative + 1);
    const normal = [-derivative / magnitude, -1 / magnitude];
    const refracted = refract(normal[0], normal[1]);
    if (!refracted) return 0;
    const remainingHeightOnBezel = y * bezelWidth;
    const remainingHeight = remainingHeightOnBezel + glassThickness;
    return refracted[0] * (remainingHeight / refracted[1]);
  });

  const maximumDisplacement = Math.max(...profile.map((value) => Math.abs(value))) || 1;
  const bufferWidth = Math.max(1, Math.round(width * dpr));
  const bufferHeight = Math.max(1, Math.round(height * dpr));
  const imageDataCanvas = document.createElement("canvas");
  imageDataCanvas.width = bufferWidth;
  imageDataCanvas.height = bufferHeight;
  const imageContext = imageDataCanvas.getContext("2d");
  if (!imageContext) return null;

  // Exact radial rounded-rectangle displacement-map generation from Kube.
  const imageData = imageContext.createImageData(bufferWidth, bufferHeight);
  const neutral = 0xff008080;
  new Uint32Array(imageData.data.buffer).fill(neutral);

  const radius_ = radius * dpr;
  const bezel = bezelWidth * dpr;
  const radiusSquared = radius_ ** 2;
  const radiusPlusOneSquared = (radius_ + 1) ** 2;
  const radiusMinusBezelSquared = (radius_ - bezel) ** 2;
  const objectWidth_ = Math.max(1, (width - 2) * dpr);
  const objectHeight_ = Math.max(1, (height - 2) * dpr);
  const widthBetweenRadiuses = objectWidth_ - radius_ * 2;
  const heightBetweenRadiuses = objectHeight_ - radius_ * 2;
  const objectX = (bufferWidth - objectWidth_) / 2;
  const objectY = (bufferHeight - objectHeight_) / 2;

  for (let y1 = 0; y1 < objectHeight_; y1++) {
    for (let x1 = 0; x1 < objectWidth_; x1++) {
      const idx = ((objectY + y1) * bufferWidth + objectX + x1) * 4;
      const isOnLeftSide = x1 < radius_;
      const isOnRightSide = x1 >= objectWidth_ - radius_;
      const isOnTopSide = y1 < radius_;
      const isOnBottomSide = y1 >= objectHeight_ - radius_;
      const x = isOnLeftSide
        ? x1 - radius_
        : isOnRightSide
          ? x1 - radius_ - widthBetweenRadiuses
          : 0;
      const y = isOnTopSide
        ? y1 - radius_
        : isOnBottomSide
          ? y1 - radius_ - heightBetweenRadiuses
          : 0;
      const distanceToCenterSquared = x * x + y * y;
      const isInBezel =
        distanceToCenterSquared <= radiusPlusOneSquared &&
        distanceToCenterSquared >= radiusMinusBezelSquared;

      if (isInBezel) {
        const opacity =
          distanceToCenterSquared < radiusSquared
            ? 1
            : 1 -
              (Math.sqrt(distanceToCenterSquared) - Math.sqrt(radiusSquared)) /
                (Math.sqrt(radiusPlusOneSquared) - Math.sqrt(radiusSquared));
        const distanceFromCenter = Math.sqrt(distanceToCenterSquared);
        const distanceFromSide = radius_ - distanceFromCenter;
        const cos = x / distanceFromCenter;
        const sin = y / distanceFromCenter;
        const bezelIndex =
          ((distanceFromSide / bezel) * profile.length) | 0;
        const distance = profile[bezelIndex] ?? 0;
        const dX = (-cos * distance) / maximumDisplacement;
        const dY = (-sin * distance) / maximumDisplacement;
        imageData.data[idx] = 128 + dX * 127 * opacity;
        imageData.data[idx + 1] = 128 + dY * 127 * opacity;
        imageData.data[idx + 2] = 0;
        imageData.data[idx + 3] = 255;
      }
    }
  }

  imageContext.putImageData(imageData, 0, 0);
  return {
    url: imageDataCanvas.toDataURL("image/png"),
    width: bufferWidth,
    height: bufferHeight,
    scale: maximumDisplacement,
  };
}


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
  const refractionFilterId = `gt-kube-refraction-${useId().replace(/:/g, "")}`;
  const [refractionMap, setRefractionMap] = useState<KubeDockDisplacement | null>(null);
  const [supportsSvgBackdropFilter, setSupportsSvgBackdropFilter] = useState(false);

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


  // Build the Kube displacement map once for the dock's measured size.
  // ResizeObserver only rebuilds it when the dock dimensions actually change.
  useEffect(() => {
    const nav = dockNavRef.current;
    if (!nav) return;

    const supportsFilter =
      typeof CSS !== "undefined" &&
      CSS.supports("backdrop-filter", `url(#${refractionFilterId})`);
    setSupportsSvgBackdropFilter(supportsFilter);

    let frame = 0;
    let lastSize = "";
    const renderMap = () => {
      const rect = nav.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      if (!width || !height) return;
      const sizeKey = `${width}x${height}x${window.devicePixelRatio || 1}`;
      if (sizeKey === lastSize) return;
      lastSize = sizeKey;
      const nextMap = createKubeDockDisplacement(width, height);
      setRefractionMap(nextMap);
    };
    const scheduleMap = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(renderMap);
    };
    const observer = new ResizeObserver(scheduleMap);
    observer.observe(nav);
    scheduleMap();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [refractionFilterId]);

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
          {refractionMap && (
            <svg
              aria-hidden="true"
              className="gt-dock-filter-defs"
              width="0"
              height="0"
              style={{ position: "absolute", overflow: "hidden" }}
            >
              <defs>
                <filter id={refractionFilterId} colorInterpolationFilters="sRGB">
                  <feImage
                    href={refractionMap.url}
                    x={0}
                    y={0}
                    width={refractionMap.width}
                    height={refractionMap.height}
                    result="displacement_map"
                  />
                  <feDisplacementMap
                    in="SourceGraphic"
                    in2="displacement_map"
                    scale={refractionMap.scale}
                    xChannelSelector="R"
                    yChannelSelector="G"
                  />
                </filter>
              </defs>
            </svg>
          )}
          <nav
            ref={dockNavRef}
            className="gt-dock-nav pointer-events-auto"
            aria-label="Điều hướng chính"
            style={
              refractionMap && supportsSvgBackdropFilter
                ? {
                    backdropFilter: `url(#${refractionFilterId}) blur(20px) saturate(160%)`,
                    WebkitBackdropFilter: `url(#${refractionFilterId}) blur(20px) saturate(160%)`,
                  }
                : undefined
            }
          >
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
          position: relative;
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

        .gt-dock-item {
          position: relative;
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
