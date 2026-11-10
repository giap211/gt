"use client";

import Link from "next/link";
import Image from "next/image";
import { Play, Info } from "lucide-react";

export const GhibliSection = () => {
  return (
    <section className="ghibli-feature py-16 w-full">
      <div className="container mx-auto px-4 md:px-10">
        <div className="flex items-center gap-3 mb-8">
          <h2 className="ghibli-feature-title text-2xl font-black text-white uppercase tracking-tighter">
            Studio Ghibli
          </h2>
          <div className="ghibli-accent w-1.5 h-6 bg-[#ffd875] rounded-full" />
        </div>

        <div className="relative w-full min-h-[430px] sm:min-h-0 sm:aspect-[16/9] md:aspect-[21/9] rounded-3xl overflow-hidden group">
          <Image
            src="https://phimimg.com/upload/vod/20250716-1/3be680dcb8b627540ea2703730db511f.jpg"
            alt="Studio Ghibli"
            fill
            className="object-cover transition-transform duration-1000 group-hover:scale-105"
            unoptimized
          />
          <div className="ghibli-feature-art absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />

          <div className="absolute inset-0 flex flex-col justify-center p-5 sm:p-8 md:p-16">
            <div className="max-w-xl space-y-4 sm:space-y-6">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-[#ffd875] text-black text-[10px] font-black rounded-full uppercase">
                  Kinh điển
                </span>
                <span className="ghibli-feature-copy text-white/80 text-xs font-bold uppercase tracking-widest italic drop-shadow-[0_2px_8px_rgba(0,0,0,.8)]">
                  Hayao Miyazaki
                </span>
              </div>
              <h3 className="ghibli-feature-title text-2xl sm:text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none italic drop-shadow-[0_3px_12px_rgba(0,0,0,.9)]">
                Chuyến phiêu lưu
                <br />
                Vùng đất linh hồn
              </h3>
              <p className="ghibli-feature-copy text-white/85 text-xs sm:text-sm md:text-base line-clamp-3 sm:line-clamp-2 max-w-lg leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,.9)]">
                Đắm mình trong thế giới kỳ ảo của Studio Ghibli. Những tác phẩm
                nghệ thuật vượt thời gian, đầy cảm xúc và triết lý sâu sắc.
              </p>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-1 sm:pt-4">
                <Link
                  href="/phim/vung-dat-linh-hon"
                  className="flex shrink-0 items-center gap-2 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-violet-700 text-white px-5 sm:px-6 py-2.5 rounded-full font-black uppercase text-xs shadow-[0_5px_20px_rgba(139,92,246,.3)] hover:brightness-110 transition-all"
                >
                  <Play size={14} className="fill-black" />
                  Xem Ngay
                </Link>
                <button className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                  <Info size={16} />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    Bộ sưu tập
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
