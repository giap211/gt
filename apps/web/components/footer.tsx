"use client";

import Link from "next/link";
import Image from "next/image";

const FOOTER_LINKS = [
  { name: "Hỏi-Đáp", url: "/hoi-dap" },
  { name: "Chính sách bảo mật", url: "/chinh-sach-bao-mat" },
  { name: "Điều khoản sử dụng", url: "/dieu-khoan-su-dung" },
  { name: "Giới thiệu", url: "/gioi-thieu" },
  { name: "Liên hệ", url: "/lien-he" },
];

const PARTNER_LINKS = [
  { name: "Dongphim", url: "#" },
  { name: "Ghienphim", url: "#" },
  { name: "Motphim", url: "#" },
  { name: "Subnhanh", url: "#" },
  { name: "Onflix", url: "#" },
];

export const Footer = () => {
  return (
    <footer className="relative bg-[#0b0d14] text-gray-400 pt-10 pb-8 border-t border-white/5 overflow-hidden">
      {/* Watermark play icon */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-1/2 opacity-[0.04] hidden md:block">
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="100" cy="100" r="70" />
          <circle cx="100" cy="100" r="50" />
          <path d="M85 70 L85 130 L135 100 Z" fill="currentColor" stroke="none" />
        </svg>
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Hoàng Sa badge */}
        <div className="mb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#8b1a1a] px-3.5 py-1.5 text-xs font-semibold text-white">
            <span className="text-[#ffd875]">★</span>
            Hoàng Sa &amp; Trường Sa là của Việt Nam!
          </span>
        </div>

        {/* Logo */}
        <div className="mb-5 flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image
              src="/images/logo.svg"
              alt="XemPhim Logo"
              width={130}
              height={40}
              className="h-9 w-auto"
            />
          </Link>
        </div>

        {/* Main links */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm mb-3">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.name}
              href={link.url}
              className="text-white/60 hover:text-[#ffd875] transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Partner links */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm mb-5">
          {PARTNER_LINKS.map((link) => (
            <a
              key={link.name}
              href={link.url}
              className="text-white/40 hover:text-white/70 transition-colors"
            >
              {link.name}
            </a>
          ))}
        </div>

        {/* Description */}
        <p className="text-white/35 text-xs leading-relaxed max-w-3xl mb-4">
          XemPhim – Nền tảng xem phim trực tuyến chất lượng cao miễn phí
          Vietsub, thuyết minh, lồng tiếng full HD. Kho phim mới khổng lồ, phim
          chiếu rạp, phim bộ, phim lẻ từ nhiều quốc gia như Việt Nam, Hàn Quốc,
          Trung Quốc, Thái Lan, Nhật Bản, Âu Mỹ… đa dạng thể loại. Khám phá nền
          tảng phim trực tuyến hay nhất 2026 chất lượng 4K!
        </p>

        <p className="text-white/30 text-xs">© 2026 XemPhim</p>
      </div>
    </footer>
  );
};
