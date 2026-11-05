"use client";

import { useEffect, useState, use } from "react";
import {
  Play,
  ChevronDown,
  List,
  Heart,
  Bell,
  Plus,
  Send,
  MessageCircle,
  Star,
} from "lucide-react";
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

        if (movieRes && movieRes.status) {
          setMovie(movieRes.movie);
          setEpisodes(movieRes.episodes || []);
        }

        if (latestRes && latestRes.status) {
          setLatestMovies(latestRes.items);
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchData();
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    const loadBackdrop = async () => {
      try {
        const response = await fetch(
          `/api/hero-image/${encodeURIComponent(slug)}`,
        );
        if (!response.ok) return;
        const result = await response.json();
        if (!cancelled && result.backdropUrl) {
          setBackdropUrl(result.backdropUrl);
        }
      } catch (error) {
        console.error("Không tải được ảnh nền:", error);
      }
    };

    loadBackdrop();
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
    const loadActorImages = async () => {
      try {
        const response = await fetch("/api/actor-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmdbId: movie.tmdb?.id,
            tmdbType: movie.tmdb?.type,
            names: movie.actor.slice(0, 18),
          }),
        });
        if (!response.ok) return;
        const data = (await response.json()) as {
          images?: Record<string, string>;
        };
        if (!cancelled) setActorImages(data.images || {});
      } catch (error) {
        console.error("Không tải được ảnh diễn viên TMDB:", error);
      }
    };

    loadActorImages();
    return () => {
      cancelled = true;
    };
  }, [movie?.actor, movie?.tmdb?.id, movie?.tmdb?.type]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0f111a] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="w-14 h-14 border-4 border-[#ffd875] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#ffd875] text-sm font-bold uppercase tracking-widest animate-pulse">
            Đang tải thông tin phim...
          </p>
        </div>
      </main>
    );
  }

  if (!movie) {
    return (
      <main className="min-h-screen bg-[#0f111a] text-white">
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-red-500">
            Không tìm thấy phim này!
          </h1>
          <Link href="/" className="text-[#ffd875] hover:underline mt-4 block">
            Quay lại trang chủ
          </Link>
        </div>
      </main>
    );
  }

  const currentServerData = episodes[selectedServer]?.server_data || [];
  const imdbScore =
    movie.tmdb?.vote_average != null
      ? Number(movie.tmdb.vote_average).toFixed(1)
      : null;

  const suggestedMovies = latestMovies.map((m) => ({
    id: m._id,
    title: m.name,
    originalTitle: m.origin_name,
    posterUrl: m.poster_url,
    slug: m.slug,
    episodeCurrent: m.episode_current,
  }));

  const TABS = ["Tập phim", "Gallery", "OST", "Diễn viên", "Đề xuất"];

  return (
    <main className="min-h-screen bg-[#0f111a] text-white font-sans overflow-x-hidden pb-16">
      {/* ========== HERO BACKDROP ========== */}
      <div className="relative w-full h-[240px] sm:h-[320px] md:h-[420px] lg:h-[480px] overflow-hidden">
        <Image
          src={backdropUrl || movie.thumb_url || movie.poster_url}
          alt={movie.name}
          fill
          className="object-cover object-top"
          priority
          sizes="100vw"
          quality={90}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f111a] via-[#0f111a]/50 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f111a]/80 via-transparent to-transparent z-10" />

        {/* Floating Xem Ngay on hero (mobile center) */}
        <div className="absolute inset-0 z-20 flex items-center justify-center md:hidden">
          <Link
            href={`/xem-phim/${movie.slug}`}
            className="flex items-center justify-center w-16 h-16 rounded-full bg-[#ffd875] text-[#1a1a1a] shadow-xl shadow-[#ffd875]/30"
          >
            <Play size={28} className="fill-current ml-1" />
          </Link>
        </div>
      </div>

      {/* ========== ACTION BAR ========== */}
      <div className="relative z-30 -mt-8 md:-mt-12 px-3 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#161822]/95 backdrop-blur-xl border border-white/8 rounded-2xl px-4 py-3 shadow-2xl">
            <Link
              href={`/xem-phim/${movie.slug}`}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#ffd875] to-[#f5c84c] text-[#1a1a1a] font-bold text-[15px] px-6 py-2.5 rounded-full shadow-lg shadow-[#ffd875]/20 hover:brightness-105 active:scale-[0.98] transition-all shrink-0"
            >
              <Play size={16} className="fill-current" />
              Xem Ngay
            </Link>

            <div className="flex items-center justify-between sm:justify-end gap-1 sm:gap-2 flex-1">
              <MemberMovieActions
                movie={{
                  movieSlug: movie.slug,
                  movieTitle: movie.name,
                  posterUrl: movie.poster_url,
                }}
              />

              <button className="flex flex-col items-center gap-0.5 px-2 py-1 text-white/50 hover:text-white transition-colors">
                <div className="flex items-center gap-1">
                  <Star size={16} className="text-[#ffd875]" />
                  <span className="text-xs font-bold text-white">0</span>
                </div>
                <span className="text-[10px]">Đánh giá</span>
              </button>

              <button
                onClick={() => {
                  document
                    .getElementById("comments-section")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex flex-col items-center gap-0.5 px-2 py-1 text-white/50 hover:text-white transition-colors"
              >
                <MessageCircle size={16} />
                <span className="text-[10px]">Bình luận</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========== MAIN 2-COLUMN CONTENT ========== */}
      <div className="relative z-20 max-w-6xl mx-auto px-3 sm:px-6 mt-6 md:mt-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* ---- LEFT SIDEBAR ---- */}
          <aside className="lg:w-[260px] xl:w-[280px] shrink-0">
            {/* Poster */}
            <div className="relative w-[140px] sm:w-[180px] lg:w-full mx-auto lg:mx-0 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-white/10 mb-4">
              <Image
                src={movie.poster_url}
                alt={movie.name}
                fill
                className="object-cover"
                sizes="280px"
                priority
              />
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight text-center lg:text-left">
              {movie.name}
            </h1>
            <p className="text-sm text-[#ffd875]/80 mt-1 text-center lg:text-left">
              {movie.origin_name}
            </p>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mt-3 justify-center lg:justify-start">
              {imdbScore && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[#f5c518]/60 bg-[#f5c518]/10 text-[#f5c518] text-[11px] font-bold">
                  IMDb {imdbScore}
                </span>
              )}
              {movie.quality && (
                <span className="px-2 py-0.5 rounded bg-white text-black text-[11px] font-bold">
                  {movie.quality}
                </span>
              )}
              <span className="px-2 py-0.5 rounded border border-white/20 text-white/70 text-[11px]">
                {movie.year}
              </span>
              {movie.episode_current && (
                <span className="px-2 py-0.5 rounded border border-white/20 text-white/70 text-[11px]">
                  {movie.episode_current}
                </span>
              )}
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-1.5 mt-3 justify-center lg:justify-start">
              {movie.category?.map((c) => (
                <Link
                  key={c.id}
                  href={`/the-loai/${c.slug}`}
                  className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] text-white/60 hover:text-white hover:border-white/25 transition-colors"
                >
                  {c.name}
                </Link>
              ))}
            </div>

            {/* Progress */}
            {movie.episode_current && movie.episode_total && (
              <div className="mt-3 flex items-center gap-1.5 text-[#ff9800] text-xs font-medium justify-center lg:justify-start">
                <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-[#ff9800] border-t-transparent animate-spin" />
                Đã chiếu: {movie.episode_current} / {movie.episode_total} tập
              </div>
            )}

            {/* Intro */}
            <div className="mt-4 hidden lg:block">
              <p className="text-xs font-semibold text-white/50 mb-1.5">
                Giới thiệu:
              </p>
              <div
                className="text-sm text-white/55 leading-relaxed line-clamp-5"
                dangerouslySetInnerHTML={{
                  __html: movie.content || "Đang cập nhật...",
                }}
              />
            </div>

            {/* Meta */}
            <div className="mt-4 space-y-1.5 text-sm hidden lg:block">
              <p>
                <span className="text-white/40">Thời lượng: </span>
                <span className="text-white/80">
                  {movie.time || "Đang cập nhật"}
                </span>
              </p>
              <p>
                <span className="text-white/40">Quốc gia: </span>
                <span className="text-white/80">
                  {movie.country?.[0]?.name || "—"}
                </span>
              </p>
              {movie.director && movie.director.length > 0 && (
                <p>
                  <span className="text-white/40">Đạo diễn: </span>
                  <span className="text-white/80">
                    {movie.director.join(", ")}
                  </span>
                </p>
              )}
            </div>

            {/* Actors - left column circles */}
            {movie.actor && movie.actor.length > 0 && (
              <div className="mt-5 hidden lg:block">
                <p className="text-xs font-semibold text-white/50 mb-3">
                  Diễn viên
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {movie.actor.slice(0, 8).map((name) => (
                    <div key={name} className="flex flex-col items-center gap-1.5">
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-white/5 border border-white/10">
                        {actorImages[name] ? (
                          <img
                            src={actorImages[name]}
                            alt={name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white/30">
                            {name.trim().charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] text-white/60 text-center line-clamp-2 leading-tight">
                        {name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* ---- RIGHT CONTENT ---- */}
          <div className="flex-1 min-w-0">
            {/* Tabs */}
            <div className="border-b border-white/10 mb-4">
              <div className="flex items-center gap-5 overflow-x-auto no-scrollbar">
                {TABS.map((tab) => {
                  const key = tab.toLowerCase();
                  const isActive = activeTab === key;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(key)}
                      className={`relative pb-3 text-sm font-medium whitespace-nowrap transition-colors ${
                        isActive
                          ? "text-[#ffd875]"
                          : "text-white/40 hover:text-white/70"
                      }`}
                    >
                      {tab}
                      {isActive && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ffd875] rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TAB: Tập phim */}
            {activeTab === "tập phim" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 text-white font-semibold text-[15px]">
                      <List size={16} className="text-white/50" />
                      Phần 1
                      <ChevronDown size={14} className="text-white/40" />
                    </button>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {episodes.length > 0 ? (
                        episodes.map((ep, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedServer(idx)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                              selectedServer === idx
                                ? "bg-[#ffd875]/15 border-[#ffd875]/50 text-[#ffd875]"
                                : "bg-white/5 border-white/10 text-white/55 hover:bg-white/10"
                            }`}
                          >
                            {ep.server_name || `Server ${idx + 1}`}
                          </button>
                        ))
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white/5 border border-white/10 text-white/55">
                          Vietsub
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/45">Rút gọn</span>
                    <button
                      onClick={() => setIsCompact(!isCompact)}
                      className={`relative w-9 h-[18px] rounded-full transition-colors ${
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
                        href={`/xem-phim/${movie.slug}?tap=${ep.slug || ep.name}`}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg bg-[#1c1e2a] border border-white/5 text-[13px] font-medium text-white/75 hover:bg-[#ffd875]/10 hover:border-[#ffd875]/30 hover:text-[#ffd875] transition-all active:scale-[0.97]"
                      >
                        <Play size={11} className="opacity-50" />
                        {formatEpisodeName(ep.name)}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center text-white/40 text-sm">
                    Chưa có danh sách tập.
                  </div>
                )}
              </div>
            )}

            {/* TAB: Gallery */}
            {activeTab === "gallery" && (
              <div className="py-10 text-center text-white/40 text-sm">
                Gallery đang được cập nhật.
              </div>
            )}

            {/* TAB: OST */}
            {activeTab === "ost" && (
              <div className="py-10 text-center text-white/40 text-sm">
                OST đang được cập nhật.
              </div>
            )}

            {/* TAB: Diễn viên */}
            {activeTab === "diễn viên" && (
              <div className="py-4">
                {movie.actor && movie.actor.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-3 gap-y-5">
                    {movie.actor.map((name) => (
                      <div key={name} className="min-w-0 text-center group">
                        <div className="relative mx-auto w-full max-w-[100px] aspect-square rounded-full overflow-hidden bg-white/[0.06] border border-white/10">
                          {actorImages[name] ? (
                            <img
                              src={actorImages[name]}
                              alt={name}
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl font-bold text-white/30">
                              {name.trim().charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <p className="mt-2 text-xs font-medium text-white/80 line-clamp-2 group-hover:text-[#ffd875]">
                          {name}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-white/40 text-sm py-6">
                    Thông tin diễn viên đang được cập nhật.
                  </p>
                )}
              </div>
            )}

            {/* TAB: Đề xuất */}
            {activeTab === "đề xuất" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {suggestedMovies.slice(0, 12).map((m) => (
                  <Link key={m.id} href={`/phim/${m.slug}`} className="group">
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden border border-white/5">
                      <Image
                        src={m.posterUrl}
                        alt={m.title}
                        fill
                        sizes="(max-width: 640px) 50vw, 20vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {m.episodeCurrent && (
                        <span className="absolute bottom-1.5 left-1.5 bg-[#2ca35d] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {m.episodeCurrent}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs font-semibold text-white/80 line-clamp-1 group-hover:text-[#ffd875]">
                      {m.title}
                    </p>
                  </Link>
                ))}
              </div>
            )}

            {/* Comments */}
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
