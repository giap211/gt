"use client";

import Link from "next/link";

// Local images (downloaded via script)
const TOPICS = [
  { name: "Marvel", slug: "marvel", color: "from-[#4a47a3] to-[#2d2a6e]" },
  { name: "Sitcom", slug: "sitcom", color: "from-[#c93d6d] to-[#8a2546]" },
  {
    name: "Lồng Tiếng Cực Mạnh",
    slug: "long-tieng",
    color: "from-[#1f78d1] to-[#154a8a]",
  },
  {
    name: "Xuyên Không",
    slug: "xuyen-khong",
    color: "from-[#388e3c] to-[#1b5e20]",
  },
  { name: "Cổ Trang", slug: "co-trang", color: "from-[#fbc02d] to-[#f57f17]" },
  {
    name: "Phim Nhức Đầu",
    slug: "nhuc-dau",
    color: "from-[#1976d2] to-[#0d47a1]",
  },
];

export const TopicGrid = () => {
  return (
    <section className="py-4 md:py-7 w-full">
      <div className="container mx-auto px-4 md:px-10">
        <h2 className="text-sm md:text-lg font-bold text-white mb-3 md:mb-5 flex items-center gap-2">
          Bạn đang quan tâm gì?
        </h2>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide md:grid md:grid-cols-4 lg:grid-cols-7 md:gap-3 md:overflow-visible">
          {TOPICS.map((topic) => (
            <Link
              key={topic.slug}
              href={`/the-loai/${topic.slug}`}
              className={`bg-gradient-to-br ${topic.color} rounded-xl px-4 py-3 min-w-[112px] md:min-w-0 md:p-4 md:aspect-[2/1] flex flex-col justify-center md:justify-between group transition-all duration-300 hover:scale-[1.03] shadow-lg relative overflow-hidden`}
            >
              <div className="relative z-10">
                <h3 className="text-white font-black text-xs md:text-sm leading-tight uppercase tracking-tighter">
                  {topic.name}
                </h3>
              </div>
              <div className="relative z-10 mt-1 md:mt-3">
                <span className="text-[8px] md:text-[9px] font-bold text-white/50 uppercase tracking-widest group-hover:text-white transition-colors">
                  Xem chủ đề &gt;
                </span>
              </div>
              {/* Decorative element */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
            </Link>
          ))}

          {/* The +1 card */}
          <Link
            href="/the-loai"
            className="bg-[#2a2c3a] rounded-xl px-4 py-3 min-w-[112px] md:min-w-0 md:p-4 flex flex-col items-center justify-center group transition-all duration-300 hover:bg-[#323444] border border-white/5"
          >
            <span className="text-white font-black text-xs md:text-sm uppercase tracking-tighter whitespace-nowrap">
              + 1 chủ đề
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
};
