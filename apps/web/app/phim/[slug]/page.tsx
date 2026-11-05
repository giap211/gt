"use client";

import { useEffect, useState, use } from "react";
import {
  Play,
  Star,
  ChevronDown,
  List,
  Clock,
  Globe,
  Hash,
  CheckCircle,
  Heart,
  Plus,
  Send,
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
  const [showInfo, setShowInfo] = useState(false);
  const [backdropUrl, setBackdropUrl] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState(0);

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
          `/api/hero-image/${encodeURIComponent(slug)}`
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

  const currentServerData =
    episodes[selectedServer]?.server_data || [];
  const serverName =
    episodes[selectedServer]?.server_name || "Vietsub";

  const transformListMovies = (list: ListMovie[]) =>
    list.map((m) => ({
      id: m._id,
      title: m.name,
      originalTitle: m.origin_name,
      posterUrl: m.poster_url,
      slug: m.slug,
      year: m.year,
      quality: m.quality || "HD",
      language: m.lang || "Vietsub",
      episodeCurrent: m.episode_current,
    }));

  const suggestedMovies = transformListMovies(latestMovies);

  return (
    <main className="min-h-screen bg-[#0f111a] text-white font-sans overflow-x-hidden pb-24">
      {/* ========== HERO / BACKDROP ========== */}
      <div className="relative w-full h-[320px] sm:h-[380px] md:h-[460px] overflow-hidden">
        <Image
          src={backdropUrl || movie.thumb_url || movie.poster_url}
          alt={movie.name}
          fill
          className="object-cover object-center scale-105"
          priority
          sizes="100vw"
          quality={90}
        />
        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f111a] via-[#0f111a]/70 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent z-10" />
      </div>

      {/* ========== CONTENT ========== */}
      <div className="relative z-20 -mt-40 sm:-mt-48 px-4 sm:px-6 max-w-3xl mx-auto">
        {/* Poster + Title block (giống app) */}
        <div className="flex flex-col items-center text-center">
          {/* Poster */}
          <div className="relative w-[140px] h-[210px] sm:w-[160px] sm:h-[240px] rounded-xl overflow-hidden shadow-2xl border border-white/10 mb-5">
            <Image
              src={movie.poster_url}
              alt={movie.name}
              fill
              className="object-cover"
              sizes="160px"
              priority
            />
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight px-2">
            {movie.name}
          </h1>
          <p className="text-sm text-white/50 mt-1.5">{movie.origin_name}</p>

          {/* Thông tin phim toggle */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="mt-3 flex items-center gap-1.5 text-[#ffd875] text-sm font-medium"
          >
            Thông tin phim
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${
                showInfo ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Expandable info */}
          {showInfo && (
            <div className="mt-4 w-full text-left space-y-3 bg-white/5 rounded-2xl p-4 border border-white/5">
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded border border-[#ffd875]/60 text-[#ffd875] text-xs font-bold">
                  IMDb {movie.tmdb?.vote_average != null ? Number(movie.tmdb.vote_average).toFixed(1) : "—"}
                </span>
                <span className="px-2.5 py-1 rounded border border-white/20 text-white/60 text-xs">
                  {movie.year}
                </span>
                <span className="px-2.5 py-1 rounded border border-white/20 text-white/60 text-xs">
                  {movie.episode_current || "Hoàn tất"}
                </span>
                {movie.quality && (
                  <span className="px-2.5 py-1 rounded border border-white/20 text-white/60 text-xs">
                    {movie.quality}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {movie.category?.map((c) => (
                  <Link
                    key={c.id}
                    href={`/the-loai/${c.slug}`}
                    className="px-3 py-1 bg-white/5 rounded-full text-xs text-white/70 hover:bg-white/10"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>

              <div
                className="text-sm text-white/60 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: movie.content || "" }}
              />

              <div className="space-y-2 text-sm pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-white/40" />
                  <span className="text-white/80">
                    Thời lượng: {movie.time || "Đang cập nhật"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-white/40" />
                  <span className="text-white/80">
                    Quốc gia: {movie.country?.[0]?.name || "—"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Nút Xem Ngay */}
        <div className="mt-6 flex justify-center">
          <Link
            href={`/xem-phim/${movie.slug}`}
            className="inline-flex items-center justify-center gap-2.5 w-full max-w-sm bg-gradient-to-r from-[#ffd875] to-[#f5c84c] text-[#1a1a1a] font-bold text-base py-3.5 rounded-full shadow-lg shadow-[#ffd875]/20 hover:brightness-105 active:scale-[0.98] transition-all"
          >
            <Play size={18} className="fill-current" />
            Xem Ngay
          </Link>
        </div>

        {/* Actions row */}
        <div className="mt-6 flex items-center justify-center gap-6 sm:gap-8">
          <MemberMovieActions
            movie={{
              movieSlug: movie.slug,
              movieTitle: movie.name,
              posterUrl: movie.poster_url,
            }}
          />
        </div>

        {/* ========== TABS ========== */}
        <div className="mt-8 border-b border-white/10">
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
            {["Tập phim", "Gallery", "Diễn viên", "Đề xuất"].map((tab) => {
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

        {/* ========== TAB CONTENT ========== */}
        <div className="mt-5">
          {/* TẬP PHIM */}
          {activeTab === "tập phim" && (
            <div className="space-y-4">
              {/* Header: Phần + Rút gọn */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 text-white font-semibold text-[15px]">
                    <List size={18} className="text-white/50" />
                    Phần 1
                    <ChevronDown size={15} className="text-white/40" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/50">Rút gọn</span>
                  <button
                    onClick={() => setIsCompact(!isCompact)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      isCompact ? "bg-[#ffd875]" : "bg-white/20"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        isCompact ? "left-5" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Server / Vietsub badge */}
              <div className="flex items-center gap-2 flex-wrap">
                {episodes.length > 0 ? (
                  episodes.map((ep, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedServer(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        selectedServer === idx
                          ? "bg-[#ffd875]/15 border-[#ffd875]/50 text-[#ffd875]"
                          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      {ep.server_name || `Server ${idx + 1}`}
                    </button>
                  ))
                ) : (
                  <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-white/60">
                    Vietsub
                  </span>
                )}
              </div>

              {/* Episode grid */}
              {currentServerData.length > 0 ? (
                <div
                  className={`grid gap-2 ${
                    isCompact
                      ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-5"
                      : "grid-cols-2 sm:grid-cols-3"
                  }`}
                >
                  {currentServerData.map((ep) => (
                    <Link
                      key={ep.slug || ep.name}
                      href={`/xem-phim/${movie.slug}?tap=${ep.slug || ep.name}`}
                      className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl bg-[#1c1e2a] border border-white/5 text-sm font-medium text-white/80 hover:bg-[#ffd875]/10 hover:border-[#ffd875]/30 hover:text-[#ffd875] transition-all active:scale-[0.97]"
                    >
                      <Play size={12} className="opacity-60" />
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

          {/* GALLERY */}
          {activeTab === "gallery" && (
            <div className="py-8 text-center text-white/40 text-sm">
              Gallery đang được cập nhật.
            </div>
          )}

          {/* DIỄN VIÊN */}
          {activeTab === "diễn viên" && (
            <div className="py-4 space-y-5">
              {movie.actor && movie.actor.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {movie.actor.map((name) => (
                    <span
                      key={name}
                      className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/80"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-center text-white/40 text-sm py-6">
                  Thông tin diễn viên đang được cập nhật.
                </p>
              )}

              {movie.director && movie.director.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">
                    Đạo diễn
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {movie.director.map((name) => (
                      <span
                        key={name}
                        className="px-3.5 py-1.5 rounded-full bg-[#ffd875]/10 border border-[#ffd875]/30 text-sm text-[#ffd875]"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ĐỀ XUẤT */}
          {activeTab === "đề xuất" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {suggestedMovies.slice(0, 9).map((m) => (
                <Link
                  key={m.id}
                  href={`/phim/${m.slug}`}
                  className="group"
                >
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/5">
                    <Image
                      src={m.posterUrl}
                      alt={m.title}
                      fill
                      sizes="(max-width: 640px) 50vw, 33vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {m.episodeCurrent && (
                      <span className="absolute bottom-2 left-2 bg-green-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        {m.episodeCurrent}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs font-semibold text-white/80 line-clamp-1 group-hover:text-[#ffd875]">
                    {m.title}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Comments */}
        <div className="mt-10">
          <CommentsPanel
            movie={{
              movieSlug: movie.slug,
              movieTitle: movie.name,
              posterUrl: movie.poster_url,
            }}
          />
        </div>
      </div>
    </main>
  );
}