"use client";

import { useEffect, useState, use } from "react";
import { Play, ChevronDown, MessageCircle, Star, Search, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { ResilientMovieImage } from "@/components/resilient-movie-image";
import {
  getMovieDetail,
  getLatestMovies,
  type DetailMovie,
  type Episode,
  type ListMovie,
} from "@/lib/ophim-client";
import { CommentsPanel } from "@/components/comments-panel";
import { MemberMovieActions, SaveToLibraryButton } from "@/components/member-movie-actions";

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
  const [mobileEpisodePage, setMobileEpisodePage] = useState(0);
  const [mobileEpisodeSearch, setMobileEpisodeSearch] = useState("");
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
  const mobileEpisodePageSize = 50;
  const mobileEpisodeQuery = mobileEpisodeSearch.trim().toLocaleLowerCase("vi");
  const mobileFilteredEpisodes = mobileEpisodeQuery
    ? currentServerData.filter((ep) =>
        (String(ep.name || "") + " " + formatEpisodeName(ep.name)).toLocaleLowerCase("vi").includes(mobileEpisodeQuery)
      )
    : currentServerData;
  const mobileEpisodePageCount = Math.max(1, Math.ceil(mobileFilteredEpisodes.length / mobileEpisodePageSize));
  const safeMobileEpisodePage = Math.min(mobileEpisodePage, mobileEpisodePageCount - 1);
  const mobileVisibleEpisodes = mobileFilteredEpisodes.slice(
    safeMobileEpisodePage * mobileEpisodePageSize,
    (safeMobileEpisodePage + 1) * mobileEpisodePageSize
  );
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
    <main className="movie-detail-page min-h-screen bg-[#100f1e] text-white">
      <style jsx global>{`
        .movie-detail-content{background:radial-gradient(ellipse 78% 20% at 50% 0%,rgba(139,92,246,.11),transparent 78%),linear-gradient(180deg,#100f1e 0%,#100f1e 100%)}
        .movie-detail-hero-fade{background:linear-gradient(180deg,transparent 34%,rgba(16,15,30,.18) 54%,rgba(16,15,30,.62) 78%,#100f1e 100%)}
        .movie-detail-mobile-fade{background:linear-gradient(180deg,rgba(16,15,30,0) 0%,rgba(16,15,30,.10) 42%,rgba(16,15,30,.54) 70%,#100f1e 100%)}
        /* Remove the old card layout: content should flow freely, with glass only on controls. */
        .movie-glass-panel{background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;padding-left:0!important;padding-right:0!important}
        .movie-poster-glass{background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important}
        .movie-tabs{border-color:rgba(196,181,253,.2)}
        .movie-detail-page a,.movie-detail-page button{-webkit-tap-highlight-color:transparent}
        .movie-detail-page :is(button,a){transition:background .22s ease,color .22s ease,transform .22s ease,border-color .22s ease}
        .movie-detail-page .movie-glass-panel :is(button,a){backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
        .movie-detail-page #movie-episodes>div:first-child h2,.movie-detail-page h2{letter-spacing:-.025em}
        .movie-detail-page #movie-episodes>div:nth-child(2) button{border:1px solid rgba(196,181,253,.14);background:linear-gradient(135deg,rgba(255,255,255,.11),rgba(139,92,246,.07));box-shadow:inset 0 1px 0 rgba(255,255,255,.1);backdrop-filter:blur(16px)}
        .movie-detail-page #movie-episodes>div:nth-child(2) button:active{transform:scale(.96)}
        .movie-detail-page #movie-episodes>div:nth-child(3)>a{border:0;background:linear-gradient(110deg,rgba(255,255,255,.075),rgba(139,92,246,.09));box-shadow:inset 0 1px 0 rgba(255,255,255,.08);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
        .movie-detail-page #movie-episodes>div:nth-child(3)>a:hover{background:linear-gradient(110deg,rgba(167,139,250,.18),rgba(217,70,239,.12))}
        .movie-detail-page .movie-tabs{position:relative;border:0}
        .movie-detail-page .movie-tabs:after{content:"";display:block;height:1px;margin-top:-1px;background:linear-gradient(90deg,rgba(167,139,250,.55),rgba(255,255,255,.08),transparent)}
        .movie-detail-page .movie-tabs button{border:0!important}
        .movie-detail-page .movie-tabs button[aria-selected="true"]{color:#c4b5fd}
        .movie-detail-page .movie-detail-content section>h2{color:#fff}
        .movie-detail-page .movie-detail-content .snap-x>div{transition:transform .25s ease}
        .movie-detail-page .movie-detail-content .snap-x>div:active{transform:scale(.97)}
        html[data-theme="light"] .movie-detail-content,html[data-mobile-theme="light"] .movie-detail-content{background:radial-gradient(ellipse 78% 14% at 50% 0%,rgba(167,139,250,.07),transparent 78%),linear-gradient(180deg,#f7f6fc 0%,#f7f6fc 100%);color:#28243a}
        /* Keep the detail-page base surface theme-aware so the liquid-glass
           scene capture never paints its dark default over the light theme. */
        html[data-theme="light"] .movie-detail-page,html[data-mobile-theme="light"] .movie-detail-page{background-color:#f7f6fc!important;color:#28243a}
        html[data-theme="light"] .movie-detail-hero-fade,html[data-mobile-theme="light"] .movie-detail-hero-fade{background:linear-gradient(180deg,rgba(247,246,252,0) 34%,rgba(247,246,252,.08) 54%,rgba(247,246,252,.58) 78%,#f7f6fc 100%)!important}
        html[data-theme="light"] .movie-detail-mobile-fade,html[data-mobile-theme="light"] .movie-detail-mobile-fade{background:linear-gradient(180deg,rgba(16,15,30,.04) 0%,rgba(16,15,30,.10) 42%,rgba(16,15,30,.42) 68%,#f7f6fc 100%)!important}
        html[data-theme="light"] .movie-detail-hero-fade,html[data-mobile-theme="light"] .movie-detail-mobile-fade{background:linear-gradient(180deg,rgba(16,15,30,.04) 0%,rgba(16,15,30,.10) 42%,rgba(16,15,30,.56) 72%,#100f1e 100%)!important}
        html[data-theme="light"] .movie-glass-panel,html[data-mobile-theme="light"] .movie-glass-panel{background:transparent!important;border:0!important;box-shadow:none!important}
        html[data-theme="light"] .movie-poster-glass,html[data-mobile-theme="light"] .movie-poster-glass{background:transparent!important;border:0!important;box-shadow:none!important}
        html[data-theme="light"] .movie-tabs,html[data-mobile-theme="light"] .movie-tabs{border-color:transparent}
        html[data-theme="light"] .movie-detail-page #movie-episodes>div:nth-child(2) button,html[data-mobile-theme="light"] .movie-detail-page #movie-episodes>div:nth-child(2) button{background:linear-gradient(135deg,rgba(255,255,255,.9),rgba(225,215,255,.55));border-color:rgba(139,92,246,.16);color:#55447d;box-shadow:inset 0 1px 0 #fff,0 5px 18px rgba(90,65,150,.06)}
        html[data-theme="light"] .movie-detail-page #movie-episodes>div:nth-child(3)>a,html[data-mobile-theme="light"] .movie-detail-page #movie-episodes>div:nth-child(3)>a{background:linear-gradient(110deg,rgba(255,255,255,.72),rgba(226,217,255,.48));box-shadow:inset 0 1px 0 #fff}
        /* Final light-theme override: keep the detail hero fade connected to the light page surface. */
        html[data-theme="light"] .movie-detail-hero-fade,html[data-mobile-theme="light"] .movie-detail-hero-fade{background:linear-gradient(180deg,rgba(247,246,252,0) 34%,rgba(247,246,252,.08) 54%,rgba(247,246,252,.58) 78%,#f7f6fc 100%)!important}
        html[data-theme="light"] .movie-detail-mobile-fade,html[data-mobile-theme="light"] .movie-detail-mobile-fade{background:linear-gradient(180deg,rgba(16,15,30,.04) 0%,rgba(16,15,30,.10) 42%,rgba(16,15,30,.42) 68%,#f7f6fc 100%)!important}
      `}</style>

      {/* HERO — shorter + lighter overlay so image shows */}
      <div className="movie-detail-hero relative hidden w-full h-[420px] lg:block">
        <ResilientMovieImage
          sources={[backdropUrl, movie.thumb_url, movie.poster_url]}
          fallbackSrc="/images/fallback-horizontal.svg"
          alt={movie.name}
          fill
          priority
          quality={90}
          sizes="100vw"
          className="object-cover object-top"
        />
        {/* soft bottom fade only */}
        <div className="movie-detail-hero-fade absolute inset-0 bg-gradient-to-t from-[#0b0d16] via-[#0b0d16]/25 to-black/20" />

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

      {/* ========== MOBILE — APPLE TV STYLE ========== */}
      <section className="movie-detail-mobile lg:hidden">
        <div className="relative h-[570px] w-full overflow-hidden">
          <ResilientMovieImage
            sources={[backdropUrl, movie.thumb_url, movie.poster_url]}
            fallbackSrc="/images/fallback-horizontal.svg"
            alt={movie.name}
            fill
            priority
            quality={92}
            sizes="100vw"
            className="object-cover object-[center_25%]"
          />
          <div className="movie-detail-mobile-fade absolute inset-0" />
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),14px)]">
            <Link href="/" aria-label="Quay lại" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white shadow-lg backdrop-blur-xl">
              <span className="text-[26px] leading-none">‹</span>
            </Link>

          </div>

          <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-7 pt-24">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.34em] text-white/65">PHIM ĐẶC SẮC</p>
            <h1 className="max-w-[95%] text-[34px] font-bold leading-[1.06] tracking-[-0.04em] text-white drop-shadow-lg">{movie.name}</h1>
            {movie.origin_name && <p className="mt-2 text-sm font-medium text-white/70">{movie.origin_name}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-white/80">
              {movie.year && <span>{movie.year}</span>}
              {movie.year && movie.time && <span className="text-white/35">·</span>}
              {movie.time && <span>{movie.time}</span>}
              {imdbScore && <span className="rounded-md border border-amber-300/50 px-1.5 py-0.5 font-semibold text-amber-200">★ {imdbScore}</span>}
              {movie.quality && <span className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-900">{movie.quality}</span>}
              {movie.episode_current && <span className="rounded-md border border-white/25 px-1.5 py-0.5">{movie.episode_current}</span>}
            </div>
            {movie.category?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {movie.category.slice(0, 4).map((c) => (
                  <Link key={c.id} href={`/the-loai/${c.slug}`} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] text-white/85 backdrop-blur-md">{c.name}</Link>
                ))}
              </div>
            )}
            <div className="mt-5 grid grid-cols-[1fr_1.25fr] gap-2.5">
              <Link href={watchHref} className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-white px-5 text-[15px] font-bold text-[#10131a] shadow-[0_8px_28px_rgba(255,255,255,.18)] active:scale-[.98]">
                <Play size={19} fill="currentColor" /> Phát ngay
              </Link>
              <SaveToLibraryButton
                movie={{ movieSlug: movie.slug, movieTitle: movie.name, posterUrl: movie.poster_url }}
              />
            </div>
          </div>
        </div>

        <div className="movie-detail-content relative -mt-1 space-y-7 px-4 pb-10 pt-5">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[14px] leading-6 text-white/75 line-clamp-3" dangerouslySetInnerHTML={{ __html: movie.content || "Nội dung phim đang được cập nhật." }} />
            </div>
            <button type="button" onClick={() => setShowInfo(!showInfo)} className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-white/65">
              {showInfo ? "Thu gọn" : "Xem thêm"} <ChevronDown size={15} className={showInfo ? "rotate-180" : ""} />
            </button>
            {showInfo && (
              <div className="mt-3 space-y-2 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-[13px] text-white/70 backdrop-blur-xl">
                <p><span className="text-white/40">Quốc gia: </span>{movie.country?.map((c) => c.name).join(", ") || "Đang cập nhật"}</p>
                {movie.director?.length > 0 && <p><span className="text-white/40">Đạo diễn: </span>{movie.director.join(", ")}</p>}
                <p><span className="text-white/40">Trạng thái: </span>{completed ? "Đã hoàn thành" : "Đang chiếu"}</p>
              </div>
            )}
          </div>

          <section aria-label="Thao tác phim" className="movie-glass-panel px-3 py-3">
            <MemberMovieActions
              variant="mobile"
              movie={{ movieSlug: movie.slug, movieTitle: movie.name, posterUrl: movie.poster_url }}
            />
          </section>

          {movie.actor?.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[17px] font-semibold tracking-tight text-white">Diễn viên nổi bật</h2>
                <button type="button" onClick={() => setActiveTab("diễn viên")} className="text-[12px] text-white/50">Xem tất cả ›</button>
              </div>
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar snap-x">
                {movie.actor.slice(0, 12).map((name) => (
                  <div key={name} className="w-[104px] shrink-0 snap-start">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                      {actorImages[name] ? <img src={actorImages[name]} alt={name} className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" /> : <div className="flex h-full items-center justify-center text-2xl font-semibold text-white/30">{name.trim().charAt(0).toUpperCase()}</div>}
                    </div>
                    <p className="mt-2 line-clamp-2 text-[12px] font-medium leading-snug text-white/85">{name}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section id="movie-episodes" className="movie-glass-panel scroll-mt-5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold tracking-tight text-white">Danh sách tập</h2>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] text-white/70">{episodes[selectedServer]?.server_name || "Bản chiếu"}</span>
            </div>
            <div className="mb-3 flex gap-2 overflow-x-auto no-scrollbar">
              {episodes.map((ep, idx) => (
                <button key={idx} type="button" onClick={() => { setSelectedServer(idx); setMobileEpisodePage(0); setMobileEpisodeSearch(""); }} className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] ${selectedServer === idx ? "border-white/60 bg-white text-slate-900" : "border-white/15 bg-white/[0.06] text-white/65"}`}>{ep.server_name || `Server ${idx + 1}`}</button>
              ))}
            </div>
            <div className="mb-3 flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 text-white/45">
              <Search size={15} className="shrink-0" />
              <input
                value={mobileEpisodeSearch}
                onChange={(event) => { setMobileEpisodeSearch(event.target.value); setMobileEpisodePage(0); }}
                placeholder="Tìm số tập..."
                inputMode="search"
                aria-label="Tìm tập phim"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/35"
              />
              <span className="shrink-0 text-[10px] tabular-nums">{mobileFilteredEpisodes.length} tập</span>
            </div>
            {mobileEpisodePageCount > 1 && (
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {Array.from({ length: mobileEpisodePageCount }, (_, page) => {
                  const start = page * mobileEpisodePageSize + 1;
                  const end = Math.min((page + 1) * mobileEpisodePageSize, mobileFilteredEpisodes.length);
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setMobileEpisodePage(page)}
                      aria-pressed={safeMobileEpisodePage === page}
                      className={`shrink-0 rounded-full border px-3.5 py-2 text-[11px] font-semibold ${safeMobileEpisodePage === page ? "border-violet-300/50 bg-gradient-to-r from-fuchsia-500/20 to-violet-500/20 text-violet-200" : "border-white/10 bg-white/[0.04] text-white/55"}`}
                    >
                      {start}–{end}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="space-y-2">
              {mobileVisibleEpisodes.map((ep, idx) => (
                <Link key={ep.slug || ep.name} href={"/xem-phim/" + movie.slug + "?sv=" + selectedServer + "&tap=" + encodeURIComponent(ep.slug || ep.name)} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-2.5 transition-colors active:bg-white/10">
                  <div className="movie-poster-frame relative h-[76px] w-[118px] shrink-0 overflow-hidden rounded-xl bg-white/10">
                    <ResilientMovieImage
                      sources={[movie.thumb_url, movie.poster_url]}
                      fallbackSrc="/images/fallback-horizontal.svg"
                      alt=""
                      fill
                      sizes="118px"
                      className="object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25"><Play size={22} fill="white" /></span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-white">{formatEpisodeName(ep.name) || "Tập " + (safeMobileEpisodePage * mobileEpisodePageSize + idx + 1)}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/45">{movie.name} · {movie.time || "Thời lượng đang cập nhật"}</p>
                  </div>
                </Link>
              ))}
              {!mobileFilteredEpisodes.length && <p className="rounded-xl bg-white/[0.06] p-4 text-sm text-white/50">Không tìm thấy tập phù hợp.</p>}
            </div>
            {mobileEpisodePageCount > 1 && (
              <div className="mt-3 flex items-center justify-between border-t border-white/[0.08] pt-3">
                <button type="button" disabled={safeMobileEpisodePage === 0} onClick={() => setMobileEpisodePage((page) => Math.max(0, page - 1))} className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs text-white/65 disabled:opacity-25"><ChevronLeft size={15} /> Trước</button>
                <span className="text-[11px] tabular-nums text-white/40">{safeMobileEpisodePage + 1} / {mobileEpisodePageCount}</span>
                <button type="button" disabled={safeMobileEpisodePage >= mobileEpisodePageCount - 1} onClick={() => setMobileEpisodePage((page) => Math.min(mobileEpisodePageCount - 1, page + 1))} className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs text-white/65 disabled:opacity-25">Tiếp <ChevronRight size={15} /></button>
              </div>
            )}
          </section>

          <div className="movie-glass-panel p-4">
            <div className="mb-4 flex gap-4 overflow-x-auto no-scrollbar">
              {TABS.map((tab) => {
                const key = tab.toLowerCase();
                return <button key={tab} type="button" onClick={() => setActiveTab(key)} className={`shrink-0 pb-2 text-[13px] ${activeTab === key ? "border-b-2 border-white text-white" : "text-white/45"}`}>{tab}</button>;
              })}
            </div>
            <div className="space-y-5">
              {activeTab !== "tập phim" && <TabContent activeTab={activeTab} isSeries={isSeries} episodes={episodes} selectedServer={selectedServer} setSelectedServer={setSelectedServer} currentServerData={currentServerData} movie={movie} related={related} actorImages={actorImages} />}
              <div id="comments-section"><CommentsPanel movie={{ movieSlug: movie.slug, movieTitle: movie.name, posterUrl: movie.poster_url }} /></div>

            </div>
          </div>
        </div>
      </section>

      {/* ========== DESKTOP PC ========== */}
      <div className="hidden lg:block relative z-10 -mt-28 pb-10">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex gap-6 items-start">
            {/* LEFT column */}
            <div className="w-[240px] shrink-0 -mt-16">
              {/* poster floats higher into hero */}
              <div className="movie-poster-glass rounded-[26px] border p-2.5">
                <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden">
                  <ResilientMovieImage
                    sources={[movie.poster_url, movie.thumb_url]}
                    fallbackSrc="/images/fallback-vertical.svg"
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
                        <ResilientMovieImage
                          sources={[m.poster_url, m.thumb_url]}
                          fallbackSrc="/images/fallback-vertical.svg"
                          alt={m.name}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white/80 line-clamp-1 group-hover:text-violet-300">
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
              <div className="movie-glass-panel flex items-center gap-4 rounded-[24px] border px-5 py-3 backdrop-blur-2xl">
                <Link
                  href={watchHref}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-600 text-white font-bold text-[15px] px-6 py-2.5 rounded-full shrink-0 hover:brightness-105"
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
                    <Star size={14} className="fill-fuchsia-300 text-fuchsia-300" />
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
              <div className="movie-tabs mt-4 border-b">
                <div className="flex gap-6">
                  {TABS.map((tab) => {
                    const key = tab.toLowerCase();
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(key)}
                        className={`relative pb-3 text-sm font-medium ${activeTab === key ? "text-violet-300" : "text-white/45 hover:text-white/80"}`}
                      >
                        {tab}
                        {activeTab === key && (
                          <span className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-fuchsia-400 to-violet-500 rounded-full" />
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
  const [episodeSearch, setEpisodeSearch] = useState("");
  const [episodePage, setEpisodePage] = useState(0);
  const EPISODES_PER_PAGE = 50;
  const normalizedSearch = episodeSearch.trim().toLocaleLowerCase("vi");
  const filteredEpisodes = normalizedSearch
    ? currentServerData.filter((ep) =>
        `${ep.name || ""} ${formatEpisodeName(ep.name)}`.toLocaleLowerCase("vi").includes(normalizedSearch)
      )
    : currentServerData;
  const episodePageCount = Math.max(1, Math.ceil(filteredEpisodes.length / EPISODES_PER_PAGE));
  const safeEpisodePage = Math.min(episodePage, episodePageCount - 1);
  const visibleEpisodes = filteredEpisodes.slice(
    safeEpisodePage * EPISODES_PER_PAGE,
    (safeEpisodePage + 1) * EPISODES_PER_PAGE
  );
  const episodeRangeStart = filteredEpisodes.length ? safeEpisodePage * EPISODES_PER_PAGE + 1 : 0;
  const episodeRangeEnd = Math.min((safeEpisodePage + 1) * EPISODES_PER_PAGE, filteredEpisodes.length);

  if (activeTab === "tập phim") {
    if (isSeries && currentServerData.length > 1) {
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {episodes.map((ep, idx) => (
              <button
                key={idx}
                onClick={() => { setSelectedServer(idx); setEpisodePage(0); setEpisodeSearch(""); }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium border ${
                  selectedServer === idx
                    ? "bg-violet-400/15 border-violet-300/40 text-violet-200"
                    : "bg-white/5 border-white/10 text-white/50"
                }`}
              >
                {ep.server_name || `Server ${idx + 1}`}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Danh sách tập</p>
                <p className="mt-0.5 text-[11px] text-white/40">
                  {filteredEpisodes.length.toLocaleString("vi-VN")} tập{normalizedSearch ? " phù hợp" : ""}
                  {filteredEpisodes.length > EPISODES_PER_PAGE ? ` · Đang hiển thị ${episodeRangeStart}–${episodeRangeEnd}` : ""}
                </p>
              </div>
              <label className="flex h-10 w-full items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 text-white/45 sm:max-w-[250px]">
                <Search size={15} className="shrink-0" />
                <input
                  value={episodeSearch}
                  onChange={(event) => { setEpisodeSearch(event.target.value); setEpisodePage(0); }}
                  placeholder="Tìm số tập..."
                  inputMode="search"
                  aria-label="Tìm tập phim"
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/35"
                />
              </label>
            </div>
            {episodePageCount > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {Array.from({ length: episodePageCount }, (_, page) => {
                  const start = page * EPISODES_PER_PAGE + 1;
                  const end = Math.min((page + 1) * EPISODES_PER_PAGE, filteredEpisodes.length);
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setEpisodePage(page)}
                      aria-pressed={safeEpisodePage === page}
                      className={`shrink-0 rounded-full border px-3.5 py-2 text-[11px] font-semibold transition-all ${safeEpisodePage === page ? "border-violet-300/50 bg-gradient-to-r from-fuchsia-500/20 to-violet-500/20 text-violet-200 shadow-[0_0_16px_rgba(139,92,246,.12)]" : "border-white/10 bg-white/[0.035] text-white/50 hover:border-violet-300/30 hover:text-white/80"}`}
                    >
                      {start}–{end}
                    </button>
                  );
                })}
              </div>
            )}
            {visibleEpisodes.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {visibleEpisodes.map((ep) => (
                  <Link
                    key={ep.slug || ep.name}
                    href={`/xem-phim/${movie.slug}?sv=${selectedServer}&tap=${encodeURIComponent(ep.slug || ep.name)}`}
                    className="flex min-h-10 items-center justify-center gap-1 rounded-xl border border-white/[0.06] bg-[#1c1e2a]/80 px-2 py-2.5 text-[12px] text-white/75 transition-colors hover:border-violet-300/40 hover:bg-violet-400/15 hover:text-violet-200"
                  >
                    <Play size={10} className="shrink-0 opacity-40" />
                    <span className="truncate">{formatEpisodeName(ep.name)}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-white/40">Không tìm thấy tập phù hợp.</p>
            )}
            {episodePageCount > 1 && (
              <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
                <button
                  type="button"
                  disabled={safeEpisodePage === 0}
                  onClick={() => setEpisodePage((page) => Math.max(0, page - 1))}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-medium text-white/65 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-25"
                >
                  <ChevronLeft size={15} /> Trước
                </button>
                <span className="text-[11px] tabular-nums text-white/40">{safeEpisodePage + 1} / {episodePageCount}</span>
                <button
                  type="button"
                  disabled={safeEpisodePage >= episodePageCount - 1}
                  onClick={() => setEpisodePage((page) => Math.min(episodePageCount - 1, page + 1))}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-medium text-white/65 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-25"
                >
                  Tiếp <ChevronRight size={15} />
                </button>
              </div>
            )}
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
              onClick={() => { setSelectedServer(idx); setEpisodePage(0); setEpisodeSearch(""); }}
              className={`rounded-lg border px-2.5 py-1.5 text-[13px] font-medium transition-all sm:text-sm ${
                selectedServer === idx
                  ? "border-violet-300/50 bg-violet-400/15 text-violet-200 shadow-[0_0_18px_rgba(139,92,246,.16)]"
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
          className="group relative flex min-h-[148px] w-full items-center overflow-hidden rounded-xl border border-white/[0.06] bg-[#626474] transition-colors hover:border-violet-300/40 sm:min-h-[164px]"
        >
          <div className="absolute inset-y-0 right-0 w-[40%] sm:w-[32%]">
            <ResilientMovieImage
              sources={[movie.thumb_url, movie.poster_url]}
              fallbackSrc="/images/fallback-horizontal.svg"
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
            <span className="mt-3 inline-flex items-center rounded-md bg-white px-3.5 py-2 text-xs font-semibold text-[#171923] shadow-sm transition-colors group-hover:bg-violet-300">
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
              <ResilientMovieImage
                sources={[m.thumb_url, m.poster_url]}
                fallbackSrc="/images/fallback-horizontal.svg"
                alt={m.name}
                fill
                sizes="25vw"
                className="object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <p className="mt-1.5 text-xs font-medium text-white/80 line-clamp-1 group-hover:text-violet-300">
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
              <ResilientMovieImage
                sources={[m.thumb_url, m.poster_url]}
                fallbackSrc="/images/fallback-horizontal.svg"
                alt={m.name}
                fill
                sizes="25vw"
                className="object-cover group-hover:scale-105 transition-transform"
              />
              <span className="absolute top-1 left-1 text-[9px] bg-[#3b82f6] text-white px-1 rounded">
                Song ngữ
              </span>
            </div>
            <p className="mt-1.5 text-xs font-medium text-white/80 line-clamp-1 group-hover:text-violet-300">
              {m.name}
            </p>
            <p className="text-[11px] text-white/35 line-clamp-1">{m.origin_name}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
