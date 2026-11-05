"use client";

import { useEffect, useState, use } from "react";
import { Play, ChevronDown, MessageCircle, Star } from "lucide-react";
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
  const [showInfo, setShowInfo] = useState(false);
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
        if (latestRes?.status) setLatestMovies(latestRes.items || []);
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
            names: movie.actor.slice(0, 12),
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
      <main className="min-h-screen bg-[#0f111a] text-white flex flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-xl font-bold text-red-400">Không tìm thấy phim</h1>
        <Link href="/" className="text-[#ffd875] hover:underline">
          Về trang chủ
        </Link>
      </main>
    );
  }

  const isSeries =
    movie.type === "series" ||
    movie.type === "hoathinh" ||
    (episodes[0]?.server_data?.length || 0) > 1;

  const currentServerData = episodes[selectedServer]?.server_data || [];
  const imdbScore =
    movie.tmdb?.vote_average != null
      ? Number(movie.tmdb.vote_average).toFixed(1)
      : null;

  const TABS = ["Tập phim", "Gallery", "OST", "Diễn viên", "Đề xuất"];
  const heroSrc = backdropUrl || movie.thumb_url || movie.poster_url;

  const topWeek = [...latestMovies]
    .sort((a, b) => (b.view || 0) - (a.view || 0))
    .slice(0, 10);

  const related = latestMovies
    .filter((m) => m.slug !== movie.slug)
    .slice(0, 12);

  const faqItems = [
    {
      q: `Phim ${movie.name} có bản chất lượng nào?`,
      a: `${movie.name} hiện có bản Vietsub chất lượng ${movie.quality || "HD"}, xem online miễn phí tại RoPhim.`,
    },
    {
      q: `Phim ${movie.name} có bao nhiêu tập?`,
      a: `Trạng thái hiện tại: ${movie.episode_current || "Full"}${movie.episode_total ? ` (tổng ${movie.episode_total} tập)` : ""}.`,
    },
    {
      q: `Phim ${movie.name} thuộc thể loại gì?`,
      a: movie.category?.length
        ? `Phim thuộc thể loại: ${movie.category.map((c) => c.name).join(", ")}.`
        : "Đang cập nhật thể loại.",
    },
    {
      q: `Xem phim ${movie.name} ở đâu?`,
      a: `Bạn có thể xem online miễn phí, chất lượng cao tại RoPhim.`,
    },
  ];

  return (
    <main className="min-h-screen bg-[#0f111a] text-white overflow-x-hidden">
      {/* ===== HERO ===== */}
      <section className="relative w-full h-[220px] sm:h-[300px] md:h-[380px] lg:h-[460px]">
        <Image
          src={heroSrc}
          alt={movie.name}
          fill
          priority
          quality={90}
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f111a] via-[#0f111a]/45 to-black/25" />
      </section>

      {/* ===== MOBILE HEADER (poster centered) ===== */}
      <div className="lg:hidden relative z-20 -mt-24 px-4 flex flex-col items-center text-center">
        <div className="relative w-[120px] aspect-[2/3] rounded-xl overflow-hidden border border-white/10 shadow-2xl mb-3">
          <Image
            src={movie.poster_url}
            alt={movie.name}
            fill
            priority
            sizes="120px"
            className="object-cover"
          />
        </div>
        <h1 className="text-xl font-bold leading-tight">{movie.name}</h1>
        <p className="text-sm text-[#ffd875]/80 mt-0.5">{movie.origin_name}</p>

        <button
          onClick={() => setShowInfo(!showInfo)}
          className="mt-2 flex items-center gap-1 text-[#ffd875] text-sm"
        >
          Thông tin phim
          <ChevronDown
            size={14}
            className={`transition-transform ${showInfo ? "rotate-180" : ""}`}
          />
        </button>

        {showInfo && (
          <div className="mt-3 w-full text-left space-y-2 bg-white/5 rounded-xl p-3 border border-white/5">
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
            </div>
            <div
              className="text-sm text-white/55 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: movie.content || "Đang cập nhật...",
              }}
            />
            <p className="text-sm">
              <span className="text-white/40">Thời lượng: </span>
              {movie.time || "—"}
            </p>
            <p className="text-sm">
              <span className="text-white/40">Quốc gia: </span>
              {movie.country?.[0]?.name || "—"}
            </p>
          </div>
        )}

        <Link
          href={`/xem-phim/${movie.slug}`}
          className="mt-4 w-full max-w-sm inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#ffd875] to-[#f0c24d] text-[#1a1a1a] font-bold text-base py-3 rounded-full"
        >
          <Play size={18} className="fill-current" />
          Xem Ngay
        </Link>

        <div className="mt-4 flex items-center justify-center gap-5">
          <MemberMovieActions
            movie={{
              movieSlug: movie.slug,
              movieTitle: movie.name,
              posterUrl: movie.poster_url,
            }}
          />
          <button className="flex flex-col items-center gap-0.5 text-white/60">
            <div className="flex items-center gap-1 rounded-full bg-[#282b3a] px-2.5 py-1">
              <Star size={14} className="fill-[#ffd875] text-[#ffd875]" />
              <span className="text-xs font-bold">0</span>
            </div>
            <span className="text-[10px]">Điểm</span>
          </button>
        </div>
      </div>

      {/* ===== DESKTOP: poster + action bar overlap ===== */}
      <div className="hidden lg:block relative z-20 max-w-[1200px] mx-auto px-5 -mt-28">
        <div className="flex items-end gap-4">
          <div className="shrink-0 w-[200px]">
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/10 shadow-2xl">
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

          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-4 bg-[#161822]/95 backdrop-blur-md border border-white/8 rounded-2xl px-5 py-3 shadow-xl">
              <Link
                href={`/xem-phim/${movie.slug}`}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[#ffd875] to-[#f0c24d] text-[#1a1a1a] font-bold text-[15px] px-6 py-2.5 rounded-full shrink-0 hover:brightness-105"
              >
                <Play size={15} className="fill-current" />
                Xem Ngay
              </Link>

              <div className="flex items-center gap-4 ml-auto">
                <MemberMovieActions
                  movie={{
                    movieSlug: movie.slug,
                    movieTitle: movie.name,
                    posterUrl: movie.poster_url,
                  }}
                />
                <button className="flex items-center gap-1.5 rounded-full bg-[#282b3a] px-3 py-1.5">
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
                  className="flex flex-col items-center gap-0.5 text-white/60 hover:text-white"
                >
                  <MessageCircle size={18} />
                  <span className="text-[10px]">Bình luận</span>
                </button>
              </div>
            </div>

            <div className="mt-3 border-b border-white/10">
              <div className="flex gap-5">
                {TABS.map((tab) => {
                  const key = tab.toLowerCase();
                  const active = activeTab === key;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(key)}
                      className={`relative pb-2.5 text-sm font-medium ${
                        active ? "text-[#ffd875]" : "text-white/40 hover:text-white/70"
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
      </div>

      {/* Mobile tabs */}
      <div className="lg:hidden mt-5 px-4 border-b border-white/10">
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const key = tab.toLowerCase();
            const active = activeTab === key;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(key)}
                className={`relative pb-2.5 text-sm font-medium whitespace-nowrap ${
                  active ? "text-[#ffd875]" : "text-white/40"
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

      {/* ===== MAIN BODY ===== */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-5 mt-5 pb-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* LEFT sidebar desktop */}
          <aside className="hidden lg:block w-[200px] shrink-0 space-y-3">
            <div>
              <h1 className="text-xl font-bold leading-snug">{movie.name}</h1>
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

            <p className="text-emerald-400 text-xs font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {movie.status === "completed" || /full|hoàn/i.test(movie.episode_current || "")
                ? `Đã hoàn thành: ${movie.episode_current || "1 tập"}`
                : `Đang chiếu: ${movie.episode_current || "—"}`}
            </p>

            <div>
              <p className="text-xs text-white/40 mb-1">Giới thiệu:</p>
              <div
                className="text-[13px] text-white/55 leading-relaxed line-clamp-5"
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
                    <div key={name} className="flex flex-col items-center gap-1">
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

            {/* Top phim tuần này */}
            <div className="pt-4">
              <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <span>🔥</span> Top phim tuần này
              </p>
              <div className="space-y-2.5">
                {topWeek.map((m, i) => (
                  <Link
                    key={m._id}
                    href={`/phim/${m.slug}`}
                    className="flex items-center gap-2 group"
                  >
                    <span className="text-lg font-black italic text-white/25 w-5 shrink-0">
                      {i + 1}
                    </span>
                    <div className="relative w-10 h-14 rounded overflow-hidden shrink-0">
                      <Image
                        src={m.poster_url}
                        alt={m.name}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white/80 line-clamp-1 group-hover:text-[#ffd875]">
                        {m.name}
                      </p>
                      <p className="text-[10px] text-white/35 line-clamp-1">
                        {m.episode_current || m.year}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          {/* RIGHT content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Tập phim / Các bản chiếu */}
            {activeTab === "tập phim" && (
              <>
                {isSeries && currentServerData.length > 1 ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {episodes.map((ep, idx) => (
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
                      ))}
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                      {currentServerData.map((ep) => (
                        <Link
                          key={ep.slug || ep.name}
                          href={`/xem-phim/${movie.slug}?tap=${encodeURIComponent(ep.slug || ep.name)}`}
                          className="flex items-center justify-center gap-1 py-2.5 px-2 rounded-lg bg-[#1c1e2a] border border-white/5 text-[13px] text-white/75 hover:bg-[#ffd875]/10 hover:border-[#ffd875]/30 hover:text-[#ffd875]"
                        >
                          <Play size={11} className="opacity-40" />
                          {formatEpisodeName(ep.name)}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Phim lẻ: Các bản chiếu */
                  <div>
                    <h2 className="text-base font-semibold mb-3">Các bản chiếu</h2>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#3b82f6]/20 border border-[#3b82f6]/40 text-[#93c5fd]">
                        Song ngữ
                      </span>
                    </div>
                    <Link
                      href={`/xem-phim/${movie.slug}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[#1c1e2a] border border-white/8 hover:border-[#ffd875]/30 transition-colors group max-w-md"
                    >
                      <div className="relative w-16 h-10 rounded overflow-hidden shrink-0">
                        <Image
                          src={movie.thumb_url || movie.poster_url}
                          alt={movie.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                        <span className="absolute top-0.5 left-0.5 text-[8px] bg-[#3b82f6] text-white px-1 rounded">
                          Song ngữ
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white group-hover:text-[#ffd875] line-clamp-1">
                          {movie.name}
                        </p>
                      </div>
                      <span className="text-xs text-[#ffd875] font-medium shrink-0">
                        Xem bản này
                      </span>
                    </Link>
                  </div>
                )}
              </>
            )}

            {activeTab === "gallery" && (
              <p className="py-6 text-center text-white/35 text-sm">
                Gallery đang cập nhật.
              </p>
            )}
            {activeTab === "ost" && (
              <p className="py-6 text-center text-white/35 text-sm">
                OST đang cập nhật.
              </p>
            )}
            {activeTab === "diễn viên" && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {(movie.actor || []).map((name) => (
                  <div key={name} className="text-center">
                    <div className="mx-auto w-16 h-16 rounded-full overflow-hidden bg-white/5 border border-white/10">
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
                {related.map((m) => (
                  <Link key={m._id} href={`/phim/${m.slug}`} className="group">
                    <div className="relative aspect-[16/9] rounded-lg overflow-hidden">
                      <Image
                        src={m.thumb_url || m.poster_url}
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

            {/* Comments - always visible under tập phim */}
            {activeTab === "tập phim" && (
              <div id="comments-section">
                <CommentsPanel
                  movie={{
                    movieSlug: movie.slug,
                    movieTitle: movie.name,
                    posterUrl: movie.poster_url,
                  }}
                />
              </div>
            )}

            {/* FAQ */}
            {activeTab === "tập phim" && (
              <div>
                <h2 className="text-base font-semibold mb-3">
                  Câu hỏi thường gặp về {movie.name}
                </h2>
                <div className="space-y-3">
                  {faqItems.map((item) => (
                    <div key={item.q}>
                      <p className="text-sm font-medium text-white/85 mb-0.5">
                        {item.q}
                      </p>
                      <p className="text-[13px] text-white/45 leading-relaxed">
                        {item.a}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Phim liên quan */}
            {activeTab === "tập phim" && related.length > 0 && (
              <div>
                <h2 className="text-base font-semibold mb-3">Phim liên quan</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {related.map((m) => (
                    <Link key={m._id} href={`/phim/${m.slug}`} className="group">
                      <div className="relative aspect-[16/9] rounded-lg overflow-hidden">
                        <Image
                          src={m.thumb_url || m.poster_url}
                          alt={m.name}
                          fill
                          sizes="25vw"
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute top-1 left-1 text-[9px] bg-[#3b82f6] text-white px-1 rounded">
                          Song ngữ
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs font-medium text-white/80 line-clamp-1 group-hover:text-[#ffd875]">
                        {m.name}
                      </p>
                      <p className="text-[11px] text-white/35 line-clamp-1">
                        {m.origin_name}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile top week */}
            <div className="lg:hidden">
              <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <span>🔥</span> Top phim tuần này
              </p>
              <div className="space-y-2.5">
                {topWeek.slice(0, 5).map((m, i) => (
                  <Link
                    key={m._id}
                    href={`/phim/${m.slug}`}
                    className="flex items-center gap-2.5 group"
                  >
                    <span className="text-xl font-black italic text-white/20 w-6">
                      {i + 1}
                    </span>
                    <div className="relative w-12 h-[68px] rounded overflow-hidden shrink-0">
                      <Image
                        src={m.poster_url}
                        alt={m.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white/85 line-clamp-1 group-hover:text-[#ffd875]">
                        {m.name}
                      </p>
                      <p className="text-xs text-white/35 line-clamp-1">
                        {m.origin_name}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
