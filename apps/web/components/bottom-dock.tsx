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
} from "lucide-react";
import { useMember } from "./member-provider";
import { searchMovies, type ListMovie } from "@/lib/ophim-client";

export function BottomDock() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, openAuth, openLibrary } = useMember();

  const [searchOpen, setSearchOpen] = useState(false);
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

  const handleAccount = () => {
    if (user) openLibrary("favorites");
    else openAuth();
  };

  const submitSearch = () => {
    const q = query.trim();
    if (!q) return;
    setSearchOpen(false);
    router.push(`/tim-kiem?keyword=${encodeURIComponent(q)}`);
  };

  return (
    <>
      {/* Full-screen search overlay */}
      {searchOpen && (
        <div className="lg:hidden fixed inset-0 z-[90] bg-[#0a0b10] flex flex-col">
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
                className="w-full h-11 rounded-full bg-white/[0.08] border border-white/10 pl-10 pr-10 text-[15px] text-white outline-none placeholder:text-white/35 focus:border-[#ffd875]/50"
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

      {/* Bottom dock */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[80] pointer-events-none pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-md px-3 pb-2.5 pt-1">
          <nav
            className="pointer-events-auto grid grid-cols-5 items-end rounded-[26px] px-1.5 pt-1.5 pb-1.5
              bg-white/[0.1] border border-white/20
              shadow-[0_8px_36px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.22)]
              backdrop-blur-2xl"
            style={{ WebkitBackdropFilter: "blur(28px) saturate(160%)" }}
          >
            {/* Home */}
            <Link
              href="/"
              className="flex flex-col items-center justify-end gap-0.5 py-1.5"
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
              className="flex flex-col items-center justify-end gap-0.5 py-1.5"
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
              className="flex flex-col items-center justify-end gap-0.5 py-1.5"
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
              <span className="mt-1 text-[10px] font-semibold text-white/55">
                Tìm kiếm
              </span>
            </button>

            {/* Movies */}
            <Link
              href="/danh-sach/phim-le"
              className="flex flex-col items-center justify-end gap-0.5 py-1.5"
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
              className="flex flex-col items-center justify-end gap-0.5 py-1.5"
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
