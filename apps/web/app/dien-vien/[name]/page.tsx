"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Film } from "lucide-react";
import { ResilientMovieImage } from "@/components/resilient-movie-image";
import { searchMovies, type ListMovie } from "@/lib/ophim-client";

type ActorData = {
  person: { id: number; name: string; profileUrl: string | null } | null;
  credits: Array<{ title: string; originalTitle: string; year: string; mediaType: string }>;
};

export default function ActorPage({ params }: { params: Promise<{ name: string }> }) {
  const { name: encodedName } = use(params);
  const name = decodeURIComponent(encodedName);
  const [actor, setActor] = useState<ActorData["person"]>(null);
  const [movies, setMovies] = useState<ListMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMovies([]);
    setActor(null);
    setNotFound(false);
    (async () => {
      try {
        const response = await fetch(`/api/actor-movies?name=${encodeURIComponent(name)}`);
        if (!response.ok) throw new Error("Không thể tải dữ liệu diễn viên");
        const data = await response.json() as ActorData;
        if (cancelled) return;
        setActor(data.person);
        if (!data.person) {
          setNotFound(true);
          return;
        }
        const titles = Array.from(new Set(data.credits.flatMap(item =>
          [item.title, item.originalTitle].map(value => value.trim()).filter(Boolean)
        ))).slice(0, 24);
        const results = await Promise.all(titles.map(title => searchMovies(title, 1, 8)));
        if (cancelled) return;
        const seen = new Set<string>();
        const matched = results.flatMap(result => result.status ? result.items : [])
          .filter(item => {
            if (!item.slug || seen.has(item.slug)) return false;
            seen.add(item.slug);
            return true;
          }).slice(0, 48);
        setMovies(matched);
      } catch (error) {
        console.error("Actor movies failed:", error);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [name]);

  return (
    <main className="min-h-screen bg-[#0f111a] px-4 pb-24 pt-24 text-white lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-violet-300">
          <ArrowLeft size={16} /> Quay lại
        </Link>
        <header className="mb-8 flex items-center gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-violet-400/30 bg-white/5">
            {actor?.profileUrl ? <img src={actor.profileUrl} alt={actor.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-2xl font-bold text-white/30">{name.charAt(0)}</div>}
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[.18em] text-violet-300">Diễn viên</p>
            <h1 className="text-2xl font-black sm:text-3xl">{actor?.name || name}</h1>
            <p className="mt-1 text-sm text-white/40">{loading ? "Đang tìm phim..." : `${movies.length} phim có trên hệ thống`}</p>
          </div>
        </header>
        <div className="mb-5 flex items-center gap-2">
          <Film size={18} className="text-violet-300" />
          <h2 className="text-lg font-bold">Phim có sự tham gia</h2>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }, (_, index) => <div key={index} className="aspect-[2/3] animate-pulse rounded-xl bg-white/[0.06]" />)}
          </div>
        ) : movies.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {movies.map(movie => (
              <Link key={movie._id || movie.slug} href={`/phim/${movie.slug}`} className="group min-w-0">
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.04] transition group-hover:border-violet-400/50">
                  <ResilientMovieImage sources={[movie.poster_url, movie.thumb_url]} fallbackSrc="/images/fallback-vertical.svg" alt={movie.name} fill sizes="(max-width: 640px) 45vw, 16vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-semibold text-white/85 group-hover:text-violet-300">{movie.name}</p>
                <p className="mt-1 line-clamp-1 text-xs text-white/40">{movie.origin_name}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] py-16 text-center text-sm text-white/45">
            {notFound ? "Chưa tìm thấy thông tin diễn viên hoặc phim phù hợp." : "Chưa có phim phù hợp trên hệ thống."}
          </div>
        )}
      </div>
    </main>
  );
}
