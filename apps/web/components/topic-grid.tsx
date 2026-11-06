"use client";

import Link from "next/link";

// Matching Phim Lậu screenshot category pills
const TOPICS = [
  {
    name: "Phim 4K",
    slug: "phim-4k",
    href: "/danh-sach/phim-le",
    color: "from-[#e91e8c] to-[#c2185b]",
  },
  {
    name: "Chiếu Rạp",
    slug: "chieu-rap",
    href: "/the-loai/chieu-rap",
    color: "from-[#9c27b0] to-[#6a1b9a]",
  },
  {
    name: "Hàn Quốc",
    slug: "han-quoc",
    href: "/quoc-gia/han-quoc",
    color: "from-[#3f51b5] to-[#1a237e]",
  },
  {
    name: "Cổ Trang",
    slug: "co-trang",
    href: "/the-loai/co-trang",
    color: "from-[#00bcd4] to-[#00838f]",
  },
  {
    name: "Hoạt Hình",
    slug: "hoat-hinh",
    href: "/danh-sach/hoat-hinh",
    color: "from-[#4caf50] to-[#2e7d32]",
  },
  {
    name: "Kinh Dị",
    slug: "kinh-di",
    href: "/the-loai/kinh-di",
    color: "from-[#8d6e63] to-[#5d4037]",
  },
  {
    name: "Âu Mỹ",
    slug: "au-my",
    href: "/quoc-gia/au-my",
    color: "from-[#d84315] to-[#bf360c]",
  },
  {
    name: "Trung Quốc",
    slug: "trung-quoc",
    href: "/quoc-gia/trung-quoc",
    color: "from-[#009688] to-[#00695c]",
  },
];

export const TopicGrid = () => {
  return (
    <section className="py-3 md:py-5 w-full">
      <div className="container mx-auto px-3 md:px-8">
        <h2 className="text-sm md:text-base font-bold text-white mb-3 md:mb-4">
          Bạn đang quan tâm gì?
        </h2>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {TOPICS.map((topic) => (
            <Link
              key={topic.slug}
              href={topic.href}
              className={`bg-gradient-to-br ${topic.color} rounded-xl px-4 py-2.5 md:px-5 md:py-3 min-w-[100px] md:min-w-[120px] flex items-center justify-center shrink-0 group transition-all duration-300 hover:scale-[1.04] hover:brightness-110 shadow-lg`}
            >
              <span className="text-white font-bold text-xs md:text-sm whitespace-nowrap tracking-wide">
                {topic.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
