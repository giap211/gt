"use client";

import Link from "next/link";

const TOPICS = [
  { name: "Phim 4K", slug: "phim-4k", href: "/danh-sach/phim-le", icon: "🔥" },
  { name: "Chiếu Rạp", slug: "chieu-rap", href: "/the-loai/chieu-rap", icon: "🎬" },
  { name: "Hàn Quốc", slug: "han-quoc", href: "/quoc-gia/han-quoc", icon: "🇰🇷" },
  { name: "Cổ Trang", slug: "co-trang", href: "/the-loai/co-trang", icon: "⚔️" },
  { name: "Hoạt Hình", slug: "hoat-hinh", href: "/danh-sach/hoat-hinh", icon: "🪄" },
  { name: "Kinh Dị", slug: "kinh-di", href: "/the-loai/kinh-di", icon: "👻" },
  { name: "Âu Mỹ", slug: "au-my", href: "/quoc-gia/au-my", icon: "🌎" },
  { name: "Trung Quốc", slug: "trung-quoc", href: "/quoc-gia/trung-quoc", icon: "🐉" },
];

export const TopicGrid = () => {
  return (
    <section className="topic-grid-section w-full py-4 md:py-6">
      <div className="container mx-auto px-3 md:px-8">
        <div className="topic-grid-heading mb-3.5 flex items-center justify-between gap-3">
          <h2 className="topic-grid-title text-[17px] md:text-xl font-extrabold tracking-tight">
            Bạn đang quan tâm gì?
          </h2>
          <span className="topic-grid-hint shrink-0 text-xs md:text-sm font-semibold">
            Khám phá
          </span>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
          {TOPICS.map((topic) => (
            <Link
              key={topic.slug}
              href={topic.href}
              className="topic-grid-chip group inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[12px] md:text-sm font-bold tracking-tight transition-all duration-200 active:scale-[.97]"
            >
              <span aria-hidden="true" className="topic-grid-icon text-[16px] leading-none">
                {topic.icon}
              </span>
              <span className="whitespace-nowrap">{topic.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
