"use client";

import { useEffect, useState, use } from "react";
import { Play, ChevronDown, List, MessageCircle, Star } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  getMovieDetail,
  getLatestMovies,
  type DetailMovie,
  type Episode,
  type ListMovie,
} from "@/lib/ophim-client";
import { CommentsPanel } from "@/components/comments-panel";
import { MemberMovieActions } from "@/components/member-movie-actions";

const formatEpisodeName = (name?: string) => {
  if (!name) return "";
  const trimmed = name.trim();
  if (/^tập\s+/i.test(trimmed)) return trimmed;
  if (/^\d+$/.test(trimmed)) return `Tập ${trimmed}`;
  return trimmed;
};

export default function MovieDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [movie, setMovie] = useState<DetailMovie | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [latestMovies, setLatestMovies] = useState<ListMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tập phim");
  const [isCompact, setIsCompact] = useState(true);
  const [backdropUrl, setBackdropUrl] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState(0);
  const [actorImages, setActorImages] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [movieRes, latestRes] = await Promise.all([
          getMovieDetail(slug),
          getLatestMovies(1),
        ]);
        if (movieRes?.status) {
          setMovie(movieRes.movie);
          setEpisodes(movieRes.episodes || []);
        }
        if (latestRes?.status) setLatestMovies(latestRes.items);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchData();
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/hero-image/${encodeURIComponent(slug)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.backdropUrl) setBackdropUrl(data.backdropUrl);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!movie?.actor?.length || !movie.tmdb?.id) {
      setActorImages({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/actor-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmdbId: movie.tmdb?.id,
            tmdbType: movie.tmdb?.type,
            names: movie.actor.slice(0, 18),
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { images?: Record<string, string> };
        if (!cancelled) setActorImages(data.images || {});
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [movie?.actor, movie?.tmdb?.id, movie?.tmdb?.type]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0f111a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#ffd875] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!movie) {
    return (
      <main className="min-h-screen bg-[#0f111a] text-white flex flex-col items-center justify-center gap-4">
        <h1 className="text-xl font-bold text-red-400">Không tìm thấy phim</h1>
        <Link href="/" className="text-[#ffd875] hover:underline">
          Về trang chủ
        </Link>
      </main>
    );
  }

  const currentServerData = episodes[selectedServer]?.server_data || [];
  const imdbScore =
    movie.tmdb?.vote_average != null
      ? Number(movie.tmdb.vote_average).toFixed(1)
      : null;

  const TABS = ["Tập phim", "Gallery", "OST", "Diễn viên", "Đề xuất"];

  const heroSrc = backdropUrl || movie.thumb_url || movie.poster_url;

  return (
    <main className="min-h-screen bg-[#0f111a] text-white overflow-x-hidden pb-20">
      {/* ===== HERO ===== */}
      <section className="relative w-full h-[280px] sm:h-[360px] md:h-[440px] lg:h-[520px]">
        <Image
          src={heroSrc}
          alt={movie.name}
          fill
          priority
          quality={90}
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f111a] via-[#0f111a]/40 to-black/30" />

        {/* Center play (desktop) */}
        <div className="absolute inset-0 hidden md:flex items-center justify-center z-10">
          <Link
            href={`/xem-phim/${movie.slug}`}
            className="w-[72px] h-[72px] rounded-full bg-[#ffd875] text-[#1a1a1a] flex items-center justify-center shadow-[0_0_40px_rgba(255,216,117,0.45)] hover:scale-105 transition-transform"
          >
            <Play size={30} className="fill-current ml-1" />
          </Link>
        </div>
      </section>

      {/* ===== OVERLAP: poster + action bar ===== */}
      <div className="relative z-20 max-w-[1200px] mx-auto px-3 sm:px-5 -mt-16 sm:-mt-20 md:-mt-24">
        <div className="flex items-end gap-3 sm:gap-4">
          {/* Poster card - overlaps hero */}
          <div className="shrink-0 w-[110px] sm:w-[150px] md:w-[180px] lg:w-[200px]">
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#161822]">
              <Image
                src={movie.poster_url}
                alt={movie.name}
                fill
                priority
                sizes="200px"
                className="object-cover"
              />
            </div>
          </div>

          {/* Action bar */}
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 bg-[#161822]/95 backdrop-blur-md border border-white/8 rounded-2xl px-3 sm:px-5 py-2.5 sm:py-3 shadow-xl">
              <Link
                href={`/xem-phim/${movie.slug}`}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[#ffd875] to-[#f0c24d] text-[#1a1a1a] font-bold text-sm sm:text-[15px] px-5 sm:px-6 py-2.5 rounded-full shrink-0 hover:brightness-105 transition-all"
              >
                <Play size={15} className="fill-current" />
                Xem Ngay
              </Link>

              <div className="flex items-center gap-3 sm:gap-4 ml-auto">
                <MemberMovieActions
                  movie={{
                    movieSlug: movie.slug,
                    movieTitle: movie.name,
                    posterUrl: movie.poster_url,
                  }}
                />

                <button className="hidden sm:flex items-center gap-1.5 rounded-full bg-[#282b3a] px-3 py-1.5 hover:bg-[#32364a] transition-colors">
                  <Star size={14} className="fill-[#ffd875] text-[#ffd875]" />
                  <span className="text-sm font-bold">0</span>
                  <span className="text-[11px] text-white/50">Đánh giá</span>
                </button>

                <button
                  onClick={() =>
                    document
                      .getElementById("comments-section")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="hidden sm:flex flex-col items-center gap-0.5 text-white/60 hover:text-white transition-colors"
                >
                  <MessageCircle size={18} />
                  <span className="text-[10px]">Bình luận</span>
                </button>
              </div>
            </div>

            {/* Tabs under action bar */}
            <div className="mt-3 border-b border-white/10">
              <div className="flex gap-4 sm:gap-5 overflow-x-auto no-scrollbar">
                {TABS.map((tab) => {
                  const key = tab.toLowerCase();
                  const active = activeTab === key;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(key)}
                      className={`relative pb-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                        active
                          ? "text-[#ffd875]"
                          : "text-white/40 hover:text-white/70"
                      }`}
                    >
                      {tab}
                      {active && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ffd875] rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ===== 2 COL: info left + content right ===== */}
        <div className="mt-5 flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* LEFT info under poster */}
          <aside className="lg:w-[200px] shrink-0 space-y-3">
            <div>
              <h1 className="text-lg sm:text-xl font-bold leading-snug">
                {movie.name}
              </h1>
              <p className="text-sm text-[#ffd875]/85 mt-0.5">
                {movie.origin_name}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {imdbScore && (
                <span className="px-2 py-0.5 rounded border border-[#f5c518]/50 text-[#f5c518] text-[11px] font-bold">
                  IMDb {imdbScore}
                </span>
              )}
              {movie.quality && (
                <span className="px-2 py-0.5 rounded bg-white text-black text-[11px] font-bold">
                  {movie.quality}
                </span>
              )}
              <span className="px-2 py-0.5 rounded border border-white/15 text-white/60 text-[11px]">
                {movie.year}
              </span>
              {movie.episode_current && (
                <span className="px-2 py-0.5 rounded border border-white/15 text-white/60 text-[11px]">
                  {movie.episode_current}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {movie.category?.map((c) => (
                <Link
                  key={c.id}
                  href={`/the-loai/${c.slug}`}
                  className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-white/55 hover:text-white"
                >
                  {c.name}
                </Link>
              ))}
            </div>

            {movie.episode_current && movie.episode_total && (
              <p className="text-[#ff9800] text-xs font-medium flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border-2 border-[#ff9800] border-t-transparent animate-spin inline-block" />
                Đã chiếu: {movie.episode_current} / {movie.episode_total} tập
              </p>
            )}

            <div className="hidden lg:block space-y-3 pt-1">
              <div>
                <p className="text-xs text-white/40 mb-1">Giới thiệu:</p>
                <div
                  className="text-[13px] text-white/55 leading-relaxed line-clamp-6"
                  dangerouslySetInnerHTML={{
                    __html: movie.content || "Đang cập nhật...",
                  }}
                />
              </div>

              <div className="text-[13px] space-y-1">
                <p>
                  <span className="text-white/35">Thời lượng: </span>
                  {movie.time || "—"}
                </p>
                <p>
                  <span className="text-white/35">Quốc gia: </span>
                  {movie.country?.[0]?.name || "—"}
                </p>
                {movie.director?.length > 0 && (
                  <p>
                    <span className="text-white/35">Đạo diễn: </span>
                    {movie.director.join(", ")}
                  </p>
                )}
              </div>

              {movie.actor?.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 mb-2">Diễn viên</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {movie.actor.slice(0, 6).map((name) => (
                      <div
                        key={name}
                        className="flex flex-col items-center gap-1"
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-white/5 border border-white/10">
                          {actorImages[name] ? (
                            <img
                              src={actorImages[name]}
                              alt={name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/30">
                              {name.trim().charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-white/55 text-center line-clamp-2 leading-tight">
                          {name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* RIGHT tab content */}
          <div className="flex-1 min-w-0">
            {activeTab === "tập phim" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button className="flex items-center gap-1.5 text-sm font-semibold">
                      <List size={15} className="text-white/40" />
                      Phần 1
                      <ChevronDown size={13} className="text-white/35" />
                    </button>
                    {episodes.length > 0
                      ? episodes.map((ep, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedServer(idx)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border ${
                              selectedServer === idx
                                ? "bg-[#ffd875]/15 border-[#ffd875]/45 text-[#ffd875]"
                                : "bg-white/5 border-white/10 text-white/50"
                            }`}
                          >
                            {ep.server_name || `Server ${idx + 1}`}
                          </button>
                        ))
                      : (
                          <span className="px-2.5 py-1 rounded-md text-[11px] bg-white/5 border border-white/10 text-white/50">
                            Vietsub
                          </span>
                        )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">Rút gọn</span>
                    <button
                      onClick={() => setIsCompact(!isCompact)}
                      className={`relative w-9 h-[18px] rounded-full ${
                        isCompact ? "bg-[#ffd875]" : "bg-white/20"
                      }`}
                    >
                      <span
                        className={`absolute top-[2px] w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${
                          isCompact ? "left-[18px]" : "left-[2px]"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {currentServerData.length > 0 ? (
                  <div
                    className={`grid gap-2 ${
                      isCompact
                        ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8"
                        : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
                    }`}
                  >
                    {currentServerData.map((ep) => (
                      <Link
                        key={ep.slug || ep.name}
                        href={`/xem-phim/${movie.slug}?tap=${encodeURIComponent(ep.slug || ep.name)}`}
                        className="flex items-center justify-center gap-1 py-2.5 px-2 rounded-lg bg-[#1c1e2a] border border-white/5 text-[13px] text-white/75 hover:bg-[#ffd875]/10 hover:border-[#ffd875]/30 hover:text-[#ffd875] transition-all"
                      >
                        <Play size={11} className="opacity-40" />
                        {formatEpisodeName(ep.name)}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-white/35 text-sm">
                    Chưa có danh sách tập.
                  </p>
                )}
              </div>
            )}

            {activeTab === "gallery" && (
              <p className="py-10 text-center text-white/35 text-sm">
                Gallery đang cập nhật.
              </p>
            )}

            {activeTab === "ost" && (
              <p className="py-10 text-center text-white/35 text-sm">
                OST đang cập nhật.
              </p>
            )}

            {activeTab === "diễn viên" && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {(movie.actor || []).map((name) => (
                  <div key={name} className="text-center">
                    <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-white/5 border border-white/10">
                      {actorImages[name] ? (
                        <img
                          src={actorImages[name]}
                          alt={name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white/25">
                          {name.trim().charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-white/70 line-clamp-2">
                      {name}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "đề xuất" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {latestMovies.slice(0, 12).map((m) => (
                  <Link key={m._id} href={`/phim/${m.slug}`} className="group">
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
                      <Image
                        src={m.poster_url}
                        alt={m.name}
                        fill
                        sizes="25vw"
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <p className="mt-1.5 text-xs font-medium text-white/80 line-clamp-1 group-hover:text-[#ffd875]">
                      {m.name}
                    </p>
                  </Link>
                ))}
              </div>
            )}

            <div id="comments-section" className="mt-8">
              <CommentsPanel
                movie={{
                  movieSlug: movie.slug,
                  movieTitle: movie.name,
                  posterUrl: movie.poster_url,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
