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
  const t = name.trim();
  if (/^tập\s+/i.test(t)) return t;
  if (/^\d+$/.test(t)) return `Tập ${t}`;
  return t;
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
    (async () => {
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
    })();
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    let c = false;
    (async () => {
      try {
        const res = await fetch(`/api/hero-image/${encodeURIComponent(slug)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!c && data.backdropUrl) setBackdropUrl(data.backdropUrl);
      } catch {
        /* */
      }
    })();
    return () => {
      c = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!movie?.actor?.length || !movie.tmdb?.id) {
      setActorImages({});
      return;
    }
    let c = false;
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
        if (!c) setActorImages(data.images || {});
      } catch {
        /* */
      }
    })();
    return () => {
      c = true;
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
        <Link href="/" className="text-[#ffd875]">
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
  // Nút Xem Ngay phải mở tập đầu của đúng bản chiếu đang được chọn,
  // không để trang xem tự suy đoán và ưu tiên Thuyết minh.
  const firstSelectedEpisode = currentServerData[0];
  const watchHref = firstSelectedEpisode
    ? `/xem-phim/${movie.slug}?sv=${selectedServer}&tap=${encodeURIComponent(firstSelectedEpisode.slug || firstSelectedEpisode.name)}`
    : `/xem-phim/${movie.slug}?sv=${selectedServer}`;
  const imdbScore =
    movie.tmdb?.vote_average != null
      ? Number(movie.tmdb.vote_average).toFixed(1)
      : null;

  const TABS = ["Tập phim", "Gallery", "OST", "Diễn viên", "Đề xuất"];
  const heroSrc = backdropUrl || movie.thumb_url || movie.poster_url;
  const topWeek = [...latestMovies]
    .sort((a, b) => (b.view || 0) - (a.view || 0))
    .slice(0, 10);
  const related = latestMovies.filter((m) => m.slug !== movie.slug).slice(0, 12);

  const faqItems = [
    {
      q: `Phim ${movie.name} có bản chất lượng nào?`,
      a: `${movie.name} hiện có bản Vietsub chất lượng ${movie.quality || "HD"}, xem online miễn phí tại Phim Lậu.`,
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
      a: `Bạn có thể xem online miễn phí, chất lượng cao tại Phim Lậu.`,
    },
  ];

  const completed =
    movie.status === "completed" ||
    /full|hoàn/i.test(movie.episode_current || "");

  const InfoBlock = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={mobile ? "text-center" : "text-left"}>
      {!mobile && (
        <>
          <h1 className="text-[22px] font-bold leading-snug text-white">
            {movie.name}
          </h1>
          <p className="text-[13px] text-[#d4a84b] mt-1">{movie.origin_name}</p>
        </>
      )}

      <div className={`flex flex-wrap gap-1.5 mt-3 ${mobile ? "justify-center" : ""}`}>
        {imdbScore && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-[#f5c518]/60 text-[#f5c518] text-[11px] font-bold">
            IMDb {imdbScore}
          </span>
        )}
        {movie.quality && (
          <span className="px-1.5 py-0.5 rounded bg-white text-black text-[11px] font-bold">
            {movie.quality}
          </span>
        )}
        <span className="px-1.5 py-0.5 rounded border border-white/20 text-white/65 text-[11px]">
          {movie.year}
        </span>
        {movie.episode_current && (
          <span className="px-1.5 py-0.5 rounded border border-white/20 text-white/65 text-[11px]">
            {/full/i.test(movie.episode_current) ? "Full" : movie.episode_current}
          </span>
        )}
      </div>

      <div className={`flex flex-wrap gap-1.5 mt-2 ${mobile ? "justify-center" : ""}`}>
        {movie.category?.map((c) => (
          <Link
            key={c.id}
            href={`/the-loai/${c.slug}`}
            className="px-2 py-0.5 rounded-md bg-[#1c1e2a] border border-white/10 text-[11px] text-white/55 hover:text-white"
          >
            {c.name}
          </Link>
        ))}
      </div>

      <p
        className={`mt-2.5 text-xs font-medium flex items-center gap-1.5 ${mobile ? "justify-center" : ""} ${completed ? "text-emerald-400" : "text-[#ff9800]"}`}
      >
        <span className={`w-2 h-2 rounded-full ${completed ? "bg-emerald-400" : "bg-[#ff9800]"}`} />
        {completed
          ? `Đã hoàn thành: ${movie.episode_current || "1 tập"}`
          : `Đang chiếu: ${movie.episode_current || "—"}`}
      </p>

      <div className={`mt-4 ${mobile ? "text-left" : ""}`}>
        <p className="text-[12px] text-white/40 mb-1">Giới thiệu:</p>
        <div
          className="text-[13px] text-white/55 leading-relaxed line-clamp-4"
          dangerouslySetInnerHTML={{ __html: movie.content || "Đang cập nhật..." }}
        />
      </div>

      <div className={`mt-3 space-y-1 text-[13px] ${mobile ? "text-left" : ""}`}>
        <p>
          <span className="text-white/35">Thời lượng: </span>
          <span className="text-white/75">{movie.time || "—"}</span>
        </p>
        <p>
          <span className="text-white/35">Quốc gia: </span>
          <span className="text-white/75">
            {movie.country?.map((c) => c.name).join(", ") || "—"}
          </span>
        </p>
        {movie.director?.length > 0 && (
          <p>
            <span className="text-white/35">Đạo diễn: </span>
            <span className="text-white/75">{movie.director.join(", ")}</span>
          </p>
        )}
      </div>

      {movie.actor?.length > 0 && (
        <div className="mt-4">
          <p className="text-[12px] text-white/40 mb-2.5">Diễn viên</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-3">
            {movie.actor.slice(0, 6).map((name) => (
              <div key={name} className="flex flex-col items-center gap-1">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-[#1c1e2a] border border-white/10">
                  {actorImages[name] ? (
                    <img
                      src={actorImages[name]}
                      alt={name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white/25">
                      {name.trim().charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-white/55 text-center line-clamp-2 leading-tight">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <main className="min-h-screen bg-[#0f111a] text-white">
      {/* HERO — shorter + lighter overlay so image shows */}
      <div className="relative w-full h-[220px] md:h-[340px] lg:h-[420px]">
        <Image
          src={heroSrc}
          alt={movie.name}
          fill
          priority
          quality={90}
          sizes="100vw"
          className="object-cover object-top"
        />
        {/* soft bottom fade only */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f111a] via-[#0f111a]/25 to-black/20" />

        {/* center play — desktop */}
        <div className="absolute inset-0 hidden lg:flex items-center justify-center z-10 pointer-events-none">
          <Link
            href={watchHref}
            className="pointer-events-auto w-16 h-16 rounded-full bg-[#ffd875] text-[#1a1a1a] flex items-center justify-center shadow-[0_0_32px_rgba(255,216,117,0.4)] hover:scale-105 transition-transform"
          >
            <Play size={26} className="fill-current ml-0.5" />
          </Link>
        </div>
      </div>

      {/* ========== MOBILE ========== */}
      <div className="lg:hidden relative z-10 -mt-16 px-4 pb-6">
        <div className="flex flex-col items-center">
          <div className="relative w-[130px] aspect-[2/3] rounded-xl overflow-hidden border border-white/10 shadow-2xl mb-3">
            <Image src={movie.poster_url} alt={movie.name} fill priority sizes="130px" className="object-cover" />
          </div>
          <h1 className="text-xl font-bold text-center leading-tight">{movie.name}</h1>
          <p className="text-sm text-[#d4a84b] mt-0.5 text-center">{movie.origin_name}</p>

          <button
            onClick={() => setShowInfo(!showInfo)}
            className="mt-2 flex items-center gap-1 text-[#ffd875] text-sm"
          >
            Thông tin phim
            <ChevronDown size={14} className={showInfo ? "rotate-180" : ""} />
          </button>

          {showInfo && (
            <div className="mt-3 w-full bg-white/5 rounded-xl p-3 border border-white/5">
              <InfoBlock mobile />
            </div>
          )}

          <Link
            href={watchHref}
            className="mt-4 w-full max-w-xs inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#ffd875] to-[#f0c24d] text-[#1a1a1a] font-bold py-3 rounded-full"
          >
            <Play size={18} className="fill-current" />
            Xem Ngay
          </Link>

          <div className="mt-4 flex items-center gap-5">
            <MemberMovieActions
              movie={{
                movieSlug: movie.slug,
                movieTitle: movie.name,
                posterUrl: movie.poster_url,
              }}
            />
            <button className="flex flex-col items-center gap-0.5 text-white/60">
              <span className="flex items-center gap-1 rounded-full bg-[#282b3a] px-2.5 py-1">
                <Star size={13} className="fill-[#ffd875] text-[#ffd875]" />
                <span className="text-xs font-bold">0</span>
              </span>
              <span className="text-[10px]">Điểm</span>
            </button>
          </div>
        </div>

        <div className="mt-5 border-b border-white/10">
          <div className="flex gap-4 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => {
              const key = tab.toLowerCase();
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(key)}
                  className={`relative pb-2.5 text-sm whitespace-nowrap ${activeTab === key ? "text-[#ffd875]" : "text-white/40"}`}
                >
                  {tab}
                  {activeTab === key && (
                    <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#ffd875] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 space-y-5">
          <TabContent
            activeTab={activeTab}
            isSeries={isSeries}
            episodes={episodes}
            selectedServer={selectedServer}
            setSelectedServer={setSelectedServer}
            currentServerData={currentServerData}
            movie={movie}
            related={related}
            actorImages={actorImages}
          />
          {activeTab === "tập phim" && (
            <>
              <div id="comments-section">
                <CommentsPanel
                  movie={{
                    movieSlug: movie.slug,
                    movieTitle: movie.name,
                    posterUrl: movie.poster_url,
                  }}
                />
              </div>
              <FaqSection name={movie.name} items={faqItems} />
              <RelatedSection related={related} />
            </>
          )}
        </div>
      </div>

      {/* ========== DESKTOP PC ========== */}
      <div className="hidden lg:block relative z-10 -mt-28 pb-10">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex gap-6 items-start">
            {/* LEFT column */}
            <div className="w-[240px] shrink-0 -mt-16">
              {/* poster floats higher into hero */}
              <div className="rounded-2xl bg-[#161822]/90 border border-white/8 p-2.5 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
                <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden">
                  <Image
                    src={movie.poster_url}
                    alt={movie.name}
                    fill
                    priority
                    sizes="220px"
                    className="object-cover"
                  />
                </div>
              </div>

              <div className="mt-4">
                <InfoBlock />
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <span>🔥</span> Top phim tuần này
                </p>
                <div className="space-y-2.5">
                  {topWeek.map((m, i) => (
                    <Link key={m._id} href={`/phim/${m.slug}`} className="flex items-center gap-2 group">
                      <span className="text-lg font-black italic text-white/20 w-5 shrink-0">
                        {i + 1}
                      </span>
                      <div className="relative w-10 h-14 rounded overflow-hidden shrink-0">
                        <Image src={m.poster_url} alt={m.name} fill sizes="40px" className="object-cover" />
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
            </div>

            {/* RIGHT column */}
            <div className="flex-1 min-w-0 pt-2">
              {/* Action bar — aligns with top of poster card area */}
              <div className="flex items-center gap-4 bg-[#161822]/95 backdrop-blur-md border border-white/8 rounded-2xl px-5 py-3 shadow-xl">
                <Link
                  href={watchHref}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-[#ffd875] to-[#f0c24d] text-[#1a1a1a] font-bold text-[15px] px-6 py-2.5 rounded-full shrink-0 hover:brightness-105"
                >
                  <Play size={16} className="fill-current" />
                  Xem Ngay
                </Link>

                <div className="flex items-center gap-5 ml-auto">
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
                      document.getElementById("comments-section-pc")?.scrollIntoView({ behavior: "smooth" })
                    }
                    className="flex flex-col items-center gap-0.5 text-white/55 hover:text-white"
                  >
                    <MessageCircle size={18} />
                    <span className="text-[10px]">Bình luận</span>
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="mt-4 border-b border-white/10">
                <div className="flex gap-6">
                  {TABS.map((tab) => {
                    const key = tab.toLowerCase();
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(key)}
                        className={`relative pb-3 text-sm font-medium ${activeTab === key ? "text-[#ffd875]" : "text-white/40 hover:text-white/70"}`}
                      >
                        {tab}
                        {activeTab === key && (
                          <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#ffd875] rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 space-y-6">
                <TabContent
                  activeTab={activeTab}
                  isSeries={isSeries}
                  episodes={episodes}
                  selectedServer={selectedServer}
                  setSelectedServer={setSelectedServer}
                  currentServerData={currentServerData}
                  movie={movie}
                  related={related}
                  actorImages={actorImages}
                />

                {activeTab === "tập phim" && (
                  <>
                    <div id="comments-section-pc">
                      <CommentsPanel
                        movie={{
                          movieSlug: movie.slug,
                          movieTitle: movie.name,
                          posterUrl: movie.poster_url,
                        }}
                      />
                    </div>
                    <FaqSection name={movie.name} items={faqItems} />
                    <RelatedSection related={related} />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function TabContent({
  activeTab,
  isSeries,
  episodes,
  selectedServer,
  setSelectedServer,
  currentServerData,
  movie,
  related,
  actorImages,
}: {
  activeTab: string;
  isSeries: boolean;
  episodes: Episode[];
  selectedServer: number;
  setSelectedServer: (n: number) => void;
  currentServerData: Episode["server_data"];
  movie: DetailMovie;
  related: ListMovie[];
  actorImages: Record<string, string>;
}) {
  if (activeTab === "tập phim") {
    if (isSeries && currentServerData.length > 1) {
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
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
                href={`/xem-phim/${movie.slug}?sv=${selectedServer}&tap=${encodeURIComponent(ep.slug || ep.name)}`}
                className="flex items-center justify-center gap-1 py-2.5 px-2 rounded-lg bg-[#1c1e2a] border border-white/5 text-[13px] text-white/75 hover:bg-[#ffd875]/10 hover:border-[#ffd875]/30 hover:text-[#ffd875]"
              >
                <Play size={11} className="opacity-40" />
                {formatEpisodeName(ep.name)}
              </Link>
            ))}
          </div>
        </div>
      );
    }

    const selectedVersion = episodes[selectedServer] || episodes[0];
    const selectedVersionEpisode = selectedVersion?.server_data?.[0];
    const versionName = selectedVersion?.server_name || "Vietsub 1";
    const versionHref = selectedVersionEpisode
      ? `/xem-phim/${movie.slug}?sv=${selectedServer}&tap=${encodeURIComponent(selectedVersionEpisode.slug || selectedVersionEpisode.name)}`
      : `/xem-phim/${movie.slug}`;

    return (
      <div className="w-full">
        <h2 className="mb-4 text-xl font-semibold leading-tight text-white sm:text-[26px]">
          Các bản chiếu
        </h2>

        <div className="mb-3 flex flex-wrap gap-2">
          {episodes.length > 0 ? episodes.map((version, idx) => (
            <button
              key={`${version.server_name}-${idx}`}
              type="button"
              onClick={() => setSelectedServer(idx)}
              className={`rounded-lg border px-2.5 py-1.5 text-[13px] font-medium transition-all sm:text-sm ${
                selectedServer === idx
                  ? "border-[#ffd15a] bg-[#202331] text-[#ffd15a] shadow-[0_0_14px_rgba(255,209,90,0.12)]"
                  : "border-white/15 bg-[#202331] text-white/85 hover:border-white/30"
              }`}
            >
              {version.server_name || `Bản chiếu ${idx + 1}`}
            </button>
          )) : (
            <span className="rounded-lg border border-[#ffd15a] bg-[#202331] px-2.5 py-1.5 text-[13px] font-medium text-[#ffd15a] sm:text-sm">
              Vietsub 1
            </span>
          )}
        </div>

        <Link
          href={versionHref}
          className="group relative flex min-h-[148px] w-full items-center overflow-hidden rounded-xl border border-white/[0.06] bg-[#626474] transition-colors hover:border-[#ffd15a]/40 sm:min-h-[164px]"
        >
          <div className="absolute inset-y-0 right-0 w-[40%] sm:w-[32%]">
            <Image
              src={movie.thumb_url || movie.poster_url}
              alt=""
              fill
              sizes="(max-width: 640px) 40vw, 32vw"
              className="object-cover object-[center_25%] transition-transform duration-500 group-hover:scale-105"
              style={{
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,.18) 18%, black 62%)",
                maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,.18) 18%, black 62%)",
              }}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#626474] via-[#626474]/90 via-[54%] to-transparent" />
          <div className="relative z-10 flex w-full flex-col items-start p-4 sm:p-5">
            <div className="mb-2 flex items-center gap-2 text-white">
              <MessageCircle
                size={24}
                strokeWidth={2.5}
                fill="#6675ee"
                color="#6675ee"
                className="shrink-0 drop-shadow-sm"
              />
              <span className="text-sm font-medium sm:text-base">{versionName}</span>
            </div>
            <p className="max-w-[72%] text-lg font-bold leading-snug text-white sm:text-xl">
              {movie.name}
            </p>
            <span className="mt-3 inline-flex items-center rounded-md bg-white px-3.5 py-2 text-xs font-semibold text-[#171923] shadow-sm transition-colors group-hover:bg-[#ffd15a]">
              Xem bản này
            </span>
          </div>
        </Link>
      </div>
    );
  }

  if (activeTab === "gallery") {
    return <p className="py-8 text-center text-white/35 text-sm">Gallery đang cập nhật.</p>;
  }
  if (activeTab === "ost") {
    return <p className="py-8 text-center text-white/35 text-sm">OST đang cập nhật.</p>;
  }
  if (activeTab === "diễn viên") {
    return (
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
            <p className="mt-1.5 text-xs text-white/70 line-clamp-2">{name}</p>
          </div>
        ))}
      </div>
    );
  }
  if (activeTab === "đề xuất") {
    return (
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
    );
  }
  return null;
}

function FaqSection({ name, items }: { name: string; items: { q: string; a: string }[] }) {
  return (
    <div>
      <h2 className="text-[17px] font-semibold mb-3">Câu hỏi thường gặp về {name}</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.q}>
            <p className="text-sm font-medium text-white/85 mb-0.5">{item.q}</p>
            <p className="text-[13px] text-white/45 leading-relaxed">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RelatedSection({ related }: { related: ListMovie[] }) {
  if (!related.length) return null;
  return (
    <div>
      <h2 className="text-[17px] font-semibold mb-3">Phim liên quan</h2>
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
            <p className="text-[11px] text-white/35 line-clamp-1">{m.origin_name}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
