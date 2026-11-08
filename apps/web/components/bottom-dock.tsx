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
  const dockActiveIndex = searchOpen ? 2 : accountOpen ? 4 : isSeries ? 1 : isSingle ? 3 : 0;

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
          html[data-mobile-theme="light"] body { background: #f2f3fc !important; color: #252a36 !important; }
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
          html[data-mobile-theme="light"] body [class*="bg-[#2"] { background-color: #f2f3fc !important; }
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
          html[data-mobile-theme="light"] body .mobile-account-sheet {
            background: rgba(255,255,255,.95) !important; border-color: rgba(40,48,65,.15) !important;
          }
          html[data-mobile-theme="light"] body .mobile-account-sheet button { color: #303746; }
          html[data-mobile-theme="light"] body .mobile-search-overlay { background: #f2f3fc !important; }

          /* Home hero: preserve readable cinematic text over the image. */
          html[data-mobile-theme="light"] body main > section:first-child {
            background: #f2f3fc !important;
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
              #f2f3fc 100%
            ) !important;
          }
          html[data-mobile-theme="light"] body main > section:first-child .hero-cast-slider .swiper-slide > div {
            background-color: #292c38 !important;
            border-color: rgba(255,255,255,.45) !important;
          }
          /* Detail-page hero fades into the same light surface as its content. */
          html[data-mobile-theme="light"] body .movie-detail-hero {
            background: #f2f3fc !important;
          }
          html[data-mobile-theme="light"] body .movie-detail-hero-fade {
            background: linear-gradient(
              to bottom,
              rgba(238,241,245,0) 0%,
              rgba(238,241,245,.38) 38%,
              rgba(238,241,245,.88) 72%,
              #f2f3fc 100%
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

          /* Refined lavender / ice-blue light palette. Layout and component geometry stay unchanged. */
          html[data-mobile-theme="light"] body {
            background: linear-gradient(145deg, #f2f3fc 0%, #edf5ff 48%, #f7f3ff 100%) !important;
            color: #252b40 !important;
          }
          html[data-mobile-theme="light"] body main {
            background-color: transparent !important;
            color: #252b40 !important;
          }
          html[data-mobile-theme="light"] body main > div:not(:first-child) {
            background: transparent !important;
          }
          html[data-mobile-theme="light"] body [class*="shadow-"] {
            --tw-shadow-color: rgba(75,82,130,.12);
          }
          html[data-mobile-theme="light"] body .mobile-account-sheet,
          html[data-mobile-theme="light"] body .mobile-search-overlay {
            background: linear-gradient(145deg, rgba(255,255,255,.98), rgba(239,245,255,.97)) !important;
            border-color: rgba(114,87,245,.15) !important;
          }
          html[data-mobile-theme="light"] body main > section:not(:first-child) h2,
          html[data-mobile-theme="light"] body main > div section h2 {
            color: #252b40 !important;
          }
          html[data-mobile-theme="light"] body main > section:not(:first-child) a,
          html[data-mobile-theme="light"] body main > div section a {
            border-color: rgba(114,87,245,.12);
          }
          html[data-mobile-theme="light"] body main > section:first-child a[class*="bg-[#ffd875]"] {
            background: linear-gradient(110deg, #7257f5, #42bdeb) !important;
            color: #fff !important;
            box-shadow: 0 9px 26px rgba(114,87,245,.28) !important;
          }
          html[data-mobile-theme="light"] body main > section:first-child .hero-cast-slider .swiper-slide > div {
            border-color: rgba(255,255,255,.88) !important;
            box-shadow: 0 4px 14px rgba(45,55,95,.2);
          }
          html[data-mobile-theme="light"] body [role="dialog"][aria-labelledby="notification-title"] {
            background: linear-gradient(145deg, #f2f3fc, #e8f5ff 58%, #f7f2ff) !important;
            color: #252b40 !important;
          }
          html[data-mobile-theme="light"] body [role="dialog"][aria-labelledby="notification-title"] header {
            border-color: rgba(114,87,245,.14) !important;
          }
          html[data-mobile-theme="light"] body [role="dialog"][aria-labelledby="notification-title"] article {
            background: linear-gradient(145deg, rgba(255,255,255,.96), rgba(237,244,255,.94)) !important;
            border-color: rgba(114,87,245,.16) !important;
            box-shadow: 0 18px 48px rgba(75,82,140,.13) !important;
          }
          html[data-mobile-theme="light"] body [role="dialog"][aria-labelledby="notification-title"] h2,
          html[data-mobile-theme="light"] body [role="dialog"][aria-labelledby="notification-title"] h3 {
            color: #252b40 !important;
          }
          html[data-mobile-theme="light"] body [role="dialog"][aria-labelledby="notification-title"] p {
            color: #68738c !important;
          }
          html[data-mobile-theme="light"] body [role="dialog"][aria-labelledby="notification-title"] button[class*="bg-[#ffd875]"] {
            background: linear-gradient(110deg, #7257f5, #42bdeb) !important;
            color: #fff !important;
            box-shadow: 0 8px 24px rgba(114,87,245,.22) !important;
          }

          /* Final mobile light-theme pass: cinematic imagery, crisp hierarchy, restrained accents. */
          html[data-mobile-theme="light"] body {
            background: linear-gradient(155deg, #f2f3fc 0%, #edf5ff 52%, #f8f5ff 100%) !important;
            color: #252b40 !important;
          }

          /* Home hero: keep the artwork vivid and reserve the light fade for its bottom edge. */
          html[data-mobile-theme="light"] body main > section:first-child {
            background: #f2f3fc !important;
          }
          html[data-mobile-theme="light"] body main > section:first-child .swiper-slide img {
            filter: brightness(.88) saturate(1.16) contrast(1.04);
          }
          html[data-mobile-theme="light"] body main > section:first-child .swiper-slide > div.pointer-events-none {
            background: linear-gradient(
              to bottom,
              rgba(20,24,43,.10) 0%,
              rgba(20,24,43,.06) 34%,
              rgba(20,24,43,.34) 56%,
              rgba(242,243,252,.76) 86%,
              #f2f3fc 100%
            ) !important;
            opacity: 1 !important;
          }
          html[data-mobile-theme="light"] body main > section:first-child .container h1 {
            color: #fff !important;
            text-shadow: 0 2px 5px rgba(12,17,35,.62), 0 8px 24px rgba(12,17,35,.38) !important;
            -webkit-text-stroke: 0 !important;
          }
          html[data-mobile-theme="light"] body main > section:first-child .container p {
            color: #f7f5ff !important;
            text-shadow: 0 2px 7px rgba(12,17,35,.62) !important;
          }
          html[data-mobile-theme="light"] body main > section:first-child .hero-source-badge {
            box-shadow: 0 4px 14px rgba(20,25,48,.2) !important;
          }
          html[data-mobile-theme="light"] body main > section:first-child .hero-meta-badge {
            background: rgba(250,251,255,.94) !important;
            color: #34415c !important;
            border-color: rgba(255,255,255,.78) !important;
            box-shadow: 0 3px 10px rgba(18,25,49,.16) !important;
          }
          html[data-mobile-theme="light"] body main > section:first-child a[class*="bg-[#ffd875]"] {
            background: linear-gradient(110deg, #7058ee 0%, #398fdf 100%) !important;
            color: #fff !important;
            box-shadow: 0 9px 24px rgba(91,88,220,.28) !important;
          }
          html[data-mobile-theme="light"] body main > section:first-child a[class*="bg-white/"] {
            background: rgba(255,255,255,.2) !important;
            border-color: rgba(255,255,255,.62) !important;
            color: #fff !important;
            text-shadow: 0 1px 5px rgba(12,17,35,.5);
            box-shadow: 0 6px 18px rgba(12,17,35,.16) !important;
          }
          html[data-mobile-theme="light"] body main > section:first-child [aria-label="Thông báo"] {
            color: #5545bd !important;
            background: rgba(255,255,255,.94) !important;
            border: 1px solid rgba(114,87,245,.22) !important;
            box-shadow: 0 7px 22px rgba(35,43,92,.2), inset 0 1px 0 #fff !important;
          }
          html[data-mobile-theme="light"] body main > section:first-child [aria-label="Thông báo"] svg {
            color: #5847c4 !important;
          }

          /* Topic chips: pastel glass instead of competing neon blocks. */
          html[data-mobile-theme="light"] body main a[href^="/the-loai/"] {
            background: linear-gradient(135deg, #fff 0%, #edf2ff 100%) !important;
            border: 1px solid rgba(114,87,245,.15) !important;
            color: #4b4a78 !important;
            box-shadow: 0 4px 14px rgba(75,82,140,.07) !important;
          }
          html[data-mobile-theme="light"] body main a[href^="/the-loai/"] span {
            color: #4b4a78 !important;
            text-shadow: none !important;
          }

          /* Movie detail: keep the poster cinematic, then blend naturally into the app surface. */
          html[data-mobile-theme="light"] body main:has(.movie-detail-mobile) {
            background: linear-gradient(155deg, #f2f3fc 0%, #e8f5ff 55%, #f8f4ff 100%) !important;
            color: #252b40 !important;
          }
          html[data-mobile-theme="light"] body .movie-detail-mobile > div:first-child {
            background: #20243a !important;
          }
          html[data-mobile-theme="light"] body .movie-detail-mobile > div:first-child img {
            filter: brightness(.9) saturate(1.12) contrast(1.04);
          }
          html[data-mobile-theme="light"] body .movie-detail-mobile > div:first-child > div.absolute.inset-0 {
            background: linear-gradient(
              to bottom,
              rgba(13,18,38,.22) 0%,
              rgba(13,18,38,.02) 27%,
              rgba(13,18,38,.30) 48%,
              rgba(13,18,38,.72) 68%,
              rgba(242,243,252,.94) 94%,
              #f2f3fc 100%
            ) !important;
          }
          html[data-mobile-theme="light"] body .movie-detail-mobile h1 {
            color: #fff !important;
            text-shadow: 0 2px 7px rgba(10,15,33,.72), 0 8px 24px rgba(10,15,33,.42) !important;
          }
          html[data-mobile-theme="light"] body .movie-detail-mobile > div:first-child p {
            color: #f8f7ff !important;
            text-shadow: 0 2px 6px rgba(10,15,33,.65) !important;
          }
          html[data-mobile-theme="light"] body .movie-detail-mobile > div:first-child span {
            text-shadow: none !important;
          }
          html[data-mobile-theme="light"] body .movie-detail-mobile > div:first-child a[aria-label="Quay lại"],
          html[data-mobile-theme="light"] body .movie-detail-mobile > div:first-child button {
            background: rgba(22,27,49,.46) !important;
            border-color: rgba(255,255,255,.32) !important;
            color: #fff !important;
            backdrop-filter: blur(16px);
          }
          html[data-mobile-theme="light"] body .movie-detail-mobile > div:nth-child(2) {
            background: linear-gradient(155deg, #f2f3fc 0%, #e8f5ff 54%, #f8f4ff 100%) !important;
            color: #303950 !important;
            padding-bottom: calc(112px + env(safe-area-inset-bottom)) !important;
          }
          html[data-mobile-theme="light"] body .movie-detail-mobile > div:nth-child(2) p {
            color: #58647d !important;
          }
          html[data-mobile-theme="light"] body .movie-detail-mobile > div:nth-child(2) h2,
          html[data-mobile-theme="light"] body .movie-detail-mobile > div:nth-child(2) h3 {
            color: #28334d !important;
          }
          html[data-mobile-theme="light"] body .movie-detail-mobile > div:nth-child(2) button {
            color: #5849b8 !important;
            border-color: rgba(114,87,245,.2) !important;
          }
          html[data-mobile-theme="light"] body .movie-detail-mobile > div:nth-child(2) [aria-label="Thao tác phim"] button,
          html[data-mobile-theme="light"] body .movie-detail-mobile > div:nth-child(2) [aria-label="Thao tác phim"] a {
            background: linear-gradient(145deg, rgba(255,255,255,.96), rgba(232,241,255,.94)) !important;
            border: 1px solid rgba(114,87,245,.16) !important;
            color: #5145a5 !important;
            box-shadow: 0 7px 20px rgba(66,76,133,.09) !important;
          }
          html[data-mobile-theme="light"] body .movie-detail-mobile > div:nth-child(2) [aria-label="Thao tác phim"] svg {
            color: #7257f5 !important;
          }
          html[data-mobile-theme="light"] body .movie-detail-mobile > div:nth-child(2) a {
            border-color: rgba(114,87,245,.14);
          }
          html[data-mobile-theme="light"] body .movie-detail-mobile > div:nth-child(2) a p,
          html[data-mobile-theme="light"] body .movie-detail-mobile > div:nth-child(2) a span {
            color: #465574 !important;
          }
          html[data-mobile-theme="light"] body .movie-detail-mobile > div:nth-child(2) [class*="bg-white/"],
          html[data-mobile-theme="light"] body .movie-detail-mobile > div:nth-child(2) [class*="bg-[#080b12"],
          html[data-mobile-theme="light"] body .movie-detail-mobile > div:nth-child(2) [class*="bg-[#1c1e2a"] {
            background: linear-gradient(145deg, rgba(255,255,255,.94), rgba(235,242,255,.9)) !important;
            border-color: rgba(114,87,245,.16) !important;
            box-shadow: 0 7px 22px rgba(65,75,130,.07) !important;
          }

          /* Movie detail hero metadata: give year, runtime and episode count a solid readable surface. */
          html[data-mobile-theme="light"] body .movie-detail-mobile > div:first-child .absolute.inset-x-0.bottom-0 > div.mt-3.flex.flex-wrap {
            color: #f8faff !important;
            gap: 7px !important;
          }
          html[data-mobile-theme="light"] body .movie-detail-mobile > div:first-child .absolute.inset-x-0.bottom-0 > div.mt-3.flex.flex-wrap > span {
            display: inline-flex;
            align-items: center;
            min-height: 27px;
            padding: 4px 9px !important;
            border: 1px solid rgba(255,255,255,.28) !important;
            border-radius: 8px !important;
            background: rgba(15,22,43,.78) !important;
            color: #fff !important;
            font-size: 12px !important;
            font-weight: 700 !important;
            line-height: 1.2 !important;
            text-shadow: 0 1px 2px rgba(0,0,0,.35) !important;
            box-shadow: 0 3px 10px rgba(0,0,0,.16) !important;
            backdrop-filter: blur(12px);
          }
          html[data-mobile-theme="light"] body .movie-detail-mobile > div:first-child .absolute.inset-x-0.bottom-0 > div.mt-3.flex.flex-wrap > span.rounded-md.border-amber-300\\/50 {
            background: rgba(111,75,17,.9) !important;
            color: #fff0c5 !important;
            border-color: rgba(255,220,140,.55) !important;
          }
          html[data-mobile-theme="light"] body .movie-detail-mobile > div:first-child .absolute.inset-x-0.bottom-0 > div.mt-3.flex.flex-wrap > span.rounded.bg-white\\/90 {
            background: #e8f1ff !important;
            color: #243653 !important;
            border-color: rgba(255,255,255,.7) !important;
            text-shadow: none !important;
          }
          html[data-mobile-theme="light"] body .movie-detail-mobile > div:first-child .absolute.inset-x-0.bottom-0 > div.mt-3.flex.flex-wrap > span.text-white\\/35 {
            min-height: 0;
            padding: 0 !important;
            border: 0 !important;
            background: transparent !important;
            color: rgba(255,255,255,.75) !important;
            box-shadow: none !important;
          }

          /* Make every interest tile distinct from the page surface, including special category links. */
          html[data-mobile-theme="light"] body main > div > section:has(a[href="/the-loai/chieu-rap"]) a {
            background: linear-gradient(135deg, #ffffff 0%, #e4eaff 100%) !important;
            border: 1px solid rgba(91,78,190,.24) !important;
            color: #3d3b70 !important;
            box-shadow: 0 5px 16px rgba(57,66,120,.12), inset 0 1px 0 rgba(255,255,255,.95) !important;
          }
          html[data-mobile-theme="light"] body main > div > section:has(a[href="/the-loai/chieu-rap"]) a span {
            color: #3d3b70 !important;
            text-shadow: none !important;
          }
          html[data-mobile-theme="light"] body main > div > section:has(a[href="/the-loai/chieu-rap"]) a:active {
            filter: brightness(.96);
            transform: scale(.98);
          }

          /* Keep the floating dock from covering the last content row. */
          html[data-mobile-theme="light"] body main:not(:has(.movie-detail-mobile)) {
            padding-bottom: calc(84px + env(safe-area-inset-bottom));
          }
        }

          /* Interest chips: compact, tactile glass pills inspired by the new home concept. */
          html[data-mobile-theme] body .topic-grid-section {
            padding-top: 17px !important;
            padding-bottom: 12px !important;
          }
          html[data-mobile-theme] body .topic-grid-heading { min-height: 27px; }
          html[data-mobile-theme] body .topic-grid-title {
            display: flex; align-items: center; gap: 10px;
            color: #f7f8ff !important; font-size: 18px !important;
            font-weight: 850 !important; letter-spacing: -.035em !important;
          }
          html[data-mobile-theme] body .topic-grid-title::before {
            content: ""; display: block; width: 4px; height: 21px; flex: 0 0 4px;
            border-radius: 99px; background: linear-gradient(180deg, #a78bfa, #4c8dff);
            box-shadow: 0 2px 12px rgba(139,92,246,.38);
          }
          html[data-mobile-theme] body .topic-grid-hint { color: #a9a3d8 !important; }
          html[data-mobile-theme] body .topic-grid-chip {
            min-height: 44px; padding: 0 15px !important; gap: 8px !important;
            border: 1px solid rgba(255,255,255,.19) !important; border-radius: 999px !important;
            background: linear-gradient(135deg, rgba(255,255,255,.105), rgba(255,255,255,.045)) !important;
            color: #f4f2ff !important;
            box-shadow: 0 5px 16px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.12) !important;
            -webkit-backdrop-filter: blur(16px) saturate(150%);
            backdrop-filter: blur(16px) saturate(150%);
          }
          html[data-mobile-theme] body .topic-grid-chip span { color: inherit !important; text-shadow: none !important; }
          html[data-mobile-theme] body .topic-grid-chip:active { transform: scale(.97); filter: brightness(1.12); }

          html[data-mobile-theme="light"] body .topic-grid-title { color: #202b50 !important; }
          html[data-mobile-theme="light"] body .topic-grid-title::before {
            background: linear-gradient(180deg, #895cff, #35aeea);
            box-shadow: 0 2px 10px rgba(114,87,245,.25);
          }
          html[data-mobile-theme="light"] body .topic-grid-hint { color: #536ac3 !important; }
          html[data-mobile-theme="light"] body .topic-grid-chip {
            border: 1px solid rgba(111,102,205,.2) !important;
            background: linear-gradient(135deg, rgba(255,255,255,.98), rgba(230,239,255,.94)) !important;
            color: #293b70 !important;
            box-shadow: 0 4px 13px rgba(71,86,150,.13), inset 0 1px 0 rgba(255,255,255,.98) !important;
          }
          html[data-mobile-theme="light"] body .topic-grid-chip:active { filter: brightness(.97); }

          /* Visible violet ambient glow on the interest chips, not just a flat glass fill. */
          html[data-mobile-theme="dark"] body .topic-grid-chip {
            border-color: rgba(177,145,255,.42) !important;
            box-shadow:
              0 0 0 1px rgba(139,92,246,.12),
              0 0 15px rgba(139,92,246,.34),
              0 0 30px rgba(99,102,241,.22),
              0 7px 18px rgba(0,0,0,.28),
              inset 0 1px 0 rgba(255,255,255,.18) !important;
          }
          html[data-mobile-theme="dark"] body .topic-grid-chip:active {
            box-shadow: 0 0 18px rgba(167,139,250,.55), 0 0 34px rgba(99,102,241,.32) !important;
          }
          html[data-mobile-theme="light"] body .topic-grid-chip {
            border-color: rgba(139,92,246,.34) !important;
            box-shadow:
              0 0 0 1px rgba(139,92,246,.08),
              0 0 13px rgba(139,92,246,.24),
              0 0 25px rgba(99,102,241,.13),
              0 6px 16px rgba(71,86,150,.14),
              inset 0 1px 0 rgba(255,255,255,.98) !important;
          }

          /* The "Xem toàn bộ" action becomes a compact glass capsule with a glowing arrow. */
          html[data-mobile-theme="dark"] body .movie-carousel-view-more {
            color: #e6dcff !important;
            border: 1px solid rgba(167,139,250,.42) !important;
            background: linear-gradient(135deg, rgba(139,92,246,.22), rgba(79,70,229,.12)) !important;
            box-shadow: 0 0 14px rgba(139,92,246,.2), inset 0 1px 0 rgba(255,255,255,.12) !important;
            text-shadow: 0 0 12px rgba(167,139,250,.28);
            white-space: nowrap;
          }
          html[data-mobile-theme="dark"] body .movie-carousel-view-more-icon {
            color: #fff !important;
            background: linear-gradient(135deg, #9b7aff, #6557df) !important;
            box-shadow: 0 0 12px rgba(139,92,246,.52), inset 0 1px 0 rgba(255,255,255,.35) !important;
          }
          html[data-mobile-theme="light"] body .movie-carousel-view-more {
            color: #55449e !important;
            border: 1px solid rgba(125,95,220,.27) !important;
            background: linear-gradient(135deg, rgba(255,255,255,.98), rgba(236,231,255,.94)) !important;
            box-shadow: 0 0 12px rgba(139,92,246,.17), 0 4px 12px rgba(71,86,150,.1), inset 0 1px 0 #fff !important;
            white-space: nowrap;
          }
          html[data-mobile-theme="light"] body .movie-carousel-view-more-icon {
            color: #fff !important;
            background: linear-gradient(135deg, #9877f5, #6557d8) !important;
            box-shadow: 0 0 10px rgba(139,92,246,.38) !important;
          }
          /* Interest chips: no glow or drop shadow; only a clean violet gradient outline. */
          html[data-mobile-theme] body .topic-grid-title::before {
            box-shadow: none !important;
          }
          html[data-mobile-theme] body .topic-grid-chip {
            border: 1.5px solid transparent !important;
            border-radius: 999px !important;
            background:
              linear-gradient(135deg, rgba(24,22,39,.96), rgba(18,23,39,.96)) padding-box,
              linear-gradient(115deg, #7657f5 0%, #bd79f6 48%, #557cf5 100%) border-box !important;
            box-shadow: none !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
          }
          html[data-mobile-theme="light"] body .topic-grid-chip {
            background:
              linear-gradient(135deg, #ffffff 0%, #f4f6ff 100%) padding-box,
              linear-gradient(115deg, #7657f5 0%, #bd79f6 48%, #557cf5 100%) border-box !important;
            box-shadow: none !important;
          }
          html[data-mobile-theme] body .topic-grid-chip:active {
            transform: scale(.97);
            filter: none !important;
            box-shadow: none !important;
          }
          html[data-mobile-theme] body .movie-carousel-view-more:active {
            transform: scale(.97);
          }


          /* Rophim Liquid Glass navigation: isolated selectors, no legacy dock cascade. */
          @media(max-width:1023px){
            html[data-mobile-theme] body .rophim-liquid-nav{
              --rln-glass-bg:linear-gradient(120deg,rgba(22,15,48,.76),rgba(35,18,62,.68) 52%,rgba(25,15,48,.78));
              --rln-glass-border:rgba(192,132,252,.48);--rln-glass-outer:rgba(91,33,182,.34);
              --rln-pill-bg:linear-gradient(115deg,#8b5cf6 0%,#a855f7 52%,#d946ef 100%);
              --rln-pill-shadow:rgba(168,85,247,.48);--rln-icon:rgba(221,210,255,.78);--rln-active:rgba(255,255,255,1);
              position:relative;isolation:isolate;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));align-items:center;gap:4px;
              width:min(100%,430px);min-height:62px;margin-inline:auto;padding:8px 10px;overflow:hidden;border-radius:9999px;
              background:var(--rln-glass-bg)!important;border:1px solid var(--rln-glass-border)!important;
              -webkit-backdrop-filter:blur(52px) saturate(210%) brightness(1.04);backdrop-filter:blur(52px) saturate(210%) brightness(1.04);
              box-shadow:0 18px 48px -8px var(--rln-glass-outer),0 5px 22px rgba(139,92,246,.16),0 0 0 1px rgba(192,132,252,.12),
                inset 0 1.5px 0 rgba(255,255,255,.22),inset 0 -1px 0 rgba(217,70,239,.14)!important;
              transition:background .6s ease,border-color .6s ease,box-shadow .6s ease;
            }
            html[data-mobile-theme] body .rophim-liquid-nav:before{
              content:"";position:absolute;top:1px;left:12%;right:12%;height:48%;border-radius:9999px 9999px 60% 60%/9999px 9999px 80% 80%;
              background:linear-gradient(180deg,rgba(255,255,255,.3),rgba(192,132,252,.12) 55%,transparent);pointer-events:none;z-index:1;
            }
            html[data-mobile-theme] body .rophim-liquid-nav:after{
              content:"";position:absolute;inset:0;border-radius:inherit;
              background:radial-gradient(circle 80px at var(--rln-mx,50%) var(--rln-my,50%),rgba(192,132,252,.38),transparent 70%);
              mix-blend-mode:screen;pointer-events:none;z-index:2;
            }
            html[data-mobile-theme] body .rophim-liquid-pill{
              position:absolute;z-index:3;top:8px;bottom:8px;left:10px;width:calc((100% - 20px - 16px)/5);border-radius:9999px;
              background:var(--rln-pill-bg);border:1px solid rgba(255,255,255,.34);box-shadow:0 5px 18px -2px var(--rln-pill-shadow),0 0 18px rgba(168,85,247,.24),inset 0 1px 0 rgba(255,255,255,.58),inset 0 -1px 0 rgba(80,20,120,.12);
              transform:translateX(calc(var(--rln-active,0)*(100% + 4px)));transition:transform .48s cubic-bezier(.34,1.2,.64,1),background .5s ease,box-shadow .5s ease;pointer-events:none;
            }
            html[data-mobile-theme] body .rophim-liquid-item{
              position:relative;z-index:4;display:flex;min-width:0;min-height:44px;flex-direction:column;align-items:center;justify-content:center;
              gap:4px;padding:5px 2px;border:0!important;border-radius:9999px;background:transparent!important;color:var(--rln-icon)!important;
              font-family:inherit;font-size:10px;line-height:1.1;font-weight:500;letter-spacing:.01em;white-space:nowrap;text-decoration:none;outline:none;
              -webkit-tap-highlight-color:transparent;user-select:none;transition:color .3s ease,transform .15s ease;
            }
            html[data-mobile-theme] body .rophim-liquid-item svg{width:19px;height:19px;flex:0 0 auto;filter:none;transition:transform .3s cubic-bezier(.34,1.2,.64,1),color .3s ease;}
            html[data-mobile-theme] body .rophim-liquid-item.is-active{color:var(--rln-active)!important;}
            html[data-mobile-theme] body .rophim-liquid-item:active{transform:scale(.92);}
            html[data-mobile-theme] body .rophim-liquid-item:active svg{transform:scale(.88);}
            html[data-mobile-theme="light"] body .rophim-liquid-nav{
              --rln-glass-bg:linear-gradient(120deg,rgba(255,255,255,.76),rgba(247,241,255,.7) 52%,rgba(255,255,255,.78));
              --rln-glass-border:rgba(168,85,247,.3);--rln-glass-outer:rgba(139,92,246,.2);
              --rln-pill-bg:linear-gradient(115deg,#8b5cf6 0%,#a855f7 52%,#d946ef 100%);
              --rln-pill-shadow:rgba(168,85,247,.38);--rln-icon:rgba(91,69,132,.86);--rln-active:rgba(255,255,255,1);
            }
            html[data-mobile-theme="light"] body .rophim-liquid-nav:before{background:linear-gradient(180deg,rgba(255,255,255,.9),rgba(216,180,254,.24) 55%,transparent);}
            html[data-mobile-theme="light"] body .rophim-liquid-nav:after{background:radial-gradient(circle 80px at var(--rln-mx,50%) var(--rln-my,50%),rgba(168,85,247,.18),transparent 70%);}
            @media(prefers-reduced-motion:reduce){
              html[data-mobile-theme] body .rophim-liquid-pill,html[data-mobile-theme] body .rophim-liquid-item,html[data-mobile-theme] body .rophim-liquid-item svg{transition:none!important;}
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

      {/* Liquid Glass bottom dock */}
      <div className="lg:hidden fixed bottom-[6px] left-0 right-0 z-[80] pointer-events-none pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-md px-3 pb-2.5 pt-1">
          <nav
            className="rophim-liquid-nav pointer-events-auto"
            style={{ "--rln-active": dockActiveIndex } as React.CSSProperties}
            aria-label="Điều hướng chính"
          >
            <span className="rophim-liquid-pill" aria-hidden="true" />
            <Link
              href="/"
              onClick={(event) => handleDockNavigation(event, isHome)}
              className={`rophim-liquid-item ${isHome ? "is-active" : ""}`}
              aria-current={isHome ? "page" : undefined}
            >
              <Home size={22} strokeWidth={isHome ? 2.25 : 1.8} />
              <span>Trang chủ</span>
            </Link>
            <Link
              href="/danh-sach/phim-bo"
              onClick={(event) => handleDockNavigation(event, isSeries)}
              className={`rophim-liquid-item ${isSeries ? "is-active" : ""}`}
              aria-current={isSeries ? "page" : undefined}
            >
              <Tv size={22} strokeWidth={isSeries ? 2.25 : 1.8} />
              <span>Phim bộ</span>
            </Link>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className={`rophim-liquid-item ${searchOpen ? "is-active" : ""}`}
              aria-label="Tìm kiếm"
              aria-pressed={searchOpen}
            >
              <Search size={23} strokeWidth={2} />
              <span>Tìm kiếm</span>
            </button>
            <Link
              href="/danh-sach/phim-le"
              onClick={(event) => handleDockNavigation(event, isSingle)}
              className={`rophim-liquid-item ${isSingle ? "is-active" : ""}`}
              aria-current={isSingle ? "page" : undefined}
            >
              <Clapperboard size={22} strokeWidth={isSingle ? 2.25 : 1.8} />
              <span>Phim lẻ</span>
            </Link>
            <button
              type="button"
              onClick={handleAccount}
              className={`rophim-liquid-item ${accountOpen ? "is-active" : ""}`}
              aria-label="Tài khoản"
              aria-pressed={accountOpen}
            >
              <UserCircle size={22} strokeWidth={user || accountOpen ? 2.2 : 1.8} />
              <span>Tài khoản</span>
            </button>
          </nav>
        </div>
      </div>
    </>
  );
}
