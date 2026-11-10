"use client";

import Link from "next/link";

const TOPICS = [
  { name: "Hành động", href: "/the-loai/hanh-dong" },
  { name: "Phiêu lưu", href: "/the-loai/phieu-luu" },
  { name: "Tình cảm", href: "/the-loai/tinh-cam" },
  { name: "Hài hước", href: "/the-loai/hai-huoc" },
  { name: "Kinh dị", href: "/the-loai/kinh-di" },
  { name: "Fantasy", href: "/the-loai/vien-tuong" },
];

export const TopicGrid = () => {
  return (
    <section className="topic-grid-section w-full py-3 md:py-5">
      <div className="container mx-auto px-4 md:px-8">
        <div className="topic-grid-heading mb-3 flex items-center justify-between gap-3">
          <h2 className="topic-grid-title text-[17px] md:text-xl font-bold tracking-tight text-[#1f1a2e] dark:text-white">
            Bạn đang quan tâm gì
          </h2>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {TOPICS.map((topic, index) => (
            <Link
              key={topic.name}
              href={topic.href}
              className={
                "topic-grid-chip shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-all " +
                (index === 0
                  ? "bg-violet-600 text-white"
                  : "bg-white/90 text-[#4b4560] border border-violet-100")
              }
            >
              {topic.name}
            </Link>
          ))}
        </div>
      </div>
      <style jsx global>{`
        html[data-mobile-theme="dark"] .topic-grid-title {
          color: #f5f5f7 !important;
        }
        html[data-mobile-theme="dark"] .topic-grid-chip:not(:first-child) {
          background: rgba(255, 255, 255, 0.08) !important;
          color: rgba(255, 255, 255, 0.75) !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
          box-shadow: none !important;
          border-radius: 9999px !important;
        }
        html[data-mobile-theme="light"] .topic-grid-title {
          color: #1f1a2e !important;
        }
      `}</style>
    </section>
  );
};
