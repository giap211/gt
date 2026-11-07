"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Clapperboard,
  Search,
  Tv,
  UserCircle,
} from "lucide-react";
import { useMember } from "./member-provider";

const DOCK_ITEMS = [
  {
    href: "/",
    label: "Trang chủ",
    icon: Home,
    match: (path: string) => path === "/",
  },
  {
    href: "/danh-sach/phim-bo",
    label: "Phim bộ",
    icon: Tv,
    match: (path: string) => path.startsWith("/danh-sach/phim-bo"),
  },
  {
    href: "/tim-kiem",
    label: "Tìm kiếm",
    icon: Search,
    match: (path: string) => path.startsWith("/tim-kiem"),
    isCenter: true,
  },
  {
    href: "/danh-sach/phim-le",
    label: "Phim lẻ",
    icon: Clapperboard,
    match: (path: string) => path.startsWith("/danh-sach/phim-le"),
  },
  {
    href: "#account",
    label: "Tài khoản",
    icon: UserCircle,
    match: () => false,
    isAccount: true,
  },
] as const;

export function BottomDock() {
  const pathname = usePathname();
  const { user, openAuth, openLibrary } = useMember();

  const handleAccount = () => {
    if (user) {
      openLibrary("favorites");
    } else {
      openAuth();
    }
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[80] pointer-events-none pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md px-4 pb-3 pt-2">
        <nav
          className="pointer-events-auto relative flex items-center justify-between gap-1 rounded-[28px] px-2 py-2
            bg-white/[0.08] border border-white/20
            shadow-[0_8px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.25)]
            backdrop-blur-2xl backdrop-saturate-150"
          style={{
            WebkitBackdropFilter: "blur(28px) saturate(160%)",
          }}
        >
          {/* subtle top highlight */}
          <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

          {DOCK_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.match(pathname);

            if ("isAccount" in item && item.isAccount) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={handleAccount}
                  className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 rounded-2xl transition-all active:scale-95"
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-2xl transition-all ${
                      user
                        ? "bg-[#ffd875]/20 text-[#ffd875]"
                        : "text-white/70"
                    }`}
                  >
                    <Icon size={22} strokeWidth={1.8} />
                  </div>
                  <span className="text-[10px] font-medium text-white/60 leading-none">
                    {item.label}
                  </span>
                </button>
              );
            }

            if ("isCenter" in item && item.isCenter) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex flex-1 flex-col items-center justify-center -mt-5"
                >
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-full border border-white/30
                      shadow-[0_8px_24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.4)]
                      transition-transform active:scale-90 ${
                      active
                        ? "bg-gradient-to-br from-[#ffd875] to-[#e8b84a] text-black"
                        : "bg-white/15 text-white backdrop-blur-md"
                    }`}
                  >
                    <Icon size={24} strokeWidth={2.2} />
                  </div>
                  <span
                    className={`mt-1 text-[10px] font-semibold leading-none ${
                      active ? "text-[#ffd875]" : "text-white/60"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 rounded-2xl transition-all active:scale-95"
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-2xl transition-all ${
                    active
                      ? "bg-[#ffd875]/20 text-[#ffd875]"
                      : "text-white/70"
                  }`}
                >
                  <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                </div>
                <span
                  className={`text-[10px] font-medium leading-none ${
                    active ? "text-[#ffd875]" : "text-white/60"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
