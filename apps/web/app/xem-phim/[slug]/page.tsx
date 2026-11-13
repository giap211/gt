"use client";

import { useEffect, useState, useRef, useCallback, Suspense, use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Play,
  Star,
  Share2,
  List,
  Zap,
  Moon,
  Sun,
  SkipBack,
  SkipForward,
  Check,
  Settings2,
  X,
  Gauge,
  MonitorPlay,
  RotateCw,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { VideoPlayer } from "@/components/video-player";
import { MovieCarousel } from "@/components/movie-carousel";
import { CommentsPanel } from "@/components/comments-panel";
import { MemberMovieActions } from "@/components/member-movie-actions";
import { useMember } from "@/components/member-provider";
import { memberClient } from "@/lib/member-client";
import {
  getMovieDetail,
  getLatestMovies,
  type DetailMovie,
  type Episode,
  type ListMovie,
  type ServerData,
} from "@/lib/ophim-client";

const formatEpisodeName = (name?: string) => {
  if (!name) return "";
  const trimmed = name.trim();
  if (/^tập\s+/i.test(trimmed)) {
    return trimmed;
  }
  if (/^\d+$/.test(trimmed)) {
    return `Tập ${trimmed}`;
  }
  return trimmed;
};

function WatchPageContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [movie, setMovie] = useState<DetailMovie | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [latestMovies, setLatestMovies] = useState<ListMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentEpisode, setCurrentEpisode] = useState<{
    name: string;
    slug: string;
    url: string;
  } | null>(null);
  const [currentServer, setCurrentServer] = useState(0);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [introSegment, setIntroSegment] = useState<{ startSeconds: number; endSeconds: number } | null>(null);
  const [introDebugStatus, setIntroDebugStatus] = useState("Chưa kiểm tra");
  const [copiedToast, setCopiedToast] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [showPlayerChrome, setShowPlayerChrome] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isPlayerRotated, setIsPlayerRotated] = useState(false);
  useEffect(() => {
    if (overlayOpen || !showPlayerChrome) return;
    const timeout = window.setTimeout(() => setShowPlayerChrome(false), 3200);
    return () => window.clearTimeout(timeout);
  }, [overlayOpen, showPlayerChrome]);

  const handlePlayerBack = useCallback(() => {
    router.push(`/phim/${slug}`);
  }, [router, slug]);
  const handlePlayerRotate = useCallback(() => {
    setIsPlayerRotated((rotated) => !rotated);
  }, []);

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    document.querySelectorAll<HTMLVideoElement>(".watch-player-shell video").forEach((video) => {
      video.playbackRate = rate;
    });
  };

  const enterPlayerFullscreen = async () => {
    const playerPage = document.querySelector(".watch-player-page") as HTMLElement | null;
    try {
      if (!document.fullscreenElement && playerPage?.requestFullscreen) {
        // Fullscreen toàn bộ player để overlay và nút tùy chọn vẫn nằm trên video.
        // Không khóa hướng hệ điều hành: chế độ ngang được xử lý bằng CSS.
        await playerPage.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Một số phiên bản iOS Safari không hỗ trợ fullscreen cho phần tử tùy ý.
      // Player vẫn phủ toàn màn hình bằng CSS.
    }
  };

  const { user } = useMember();
  const lastHistorySaveRef = useRef(0);
  const latestProgressRef = useRef<{ seconds: number; durationSeconds: number } | null>(null);
  const [tmdbRuntimeSeconds, setTmdbRuntimeSeconds] = useState(0);
  const [episodeStills, setEpisodeStills] = useState<Record<number, string>>({});
  const resumeAt = Math.max(0, Number(searchParams.get("at") || 0));

  const tapParam = searchParams.get("tap");
  const serverParam = searchParams.get("sv");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [movieRes, latestRes] = await Promise.all([
          getMovieDetail(slug),
          getLatestMovies(1),
        ]);

        if (movieRes && movieRes.status) {
          setMovie(movieRes.movie);

          // Giữ nhãn Thuyết minh từ nguồn; các server thông thường vẫn đánh số SV.
          const merged = (movieRes.episodes || [])
            .map((server, i) => ({
              ...server,
              server_data: (server.server_data || []).filter((episode) => Boolean(episode.link_m3u8)),
              server_name: /thuyết minh|thuyet minh|lồng tiếng|long tieng|dự phòng/i.test(server.server_name)
                ? server.server_name
                : `SV ${i + 1}`,
            }))
            .filter((server) =>
              server.server_data.length > 0 &&
              !/dự phòng|backup|iframe|embed/i.test(server.server_name),
            );
          setEpisodes(merged);

          // Khôi phục đúng server chứa tập đã lưu, không mặc định server đầu tiên.
          const requestedServerIndex = serverParam !== null ? Number(serverParam) : -1;
          const validRequestedServer =
            Number.isInteger(requestedServerIndex) &&
            requestedServerIndex >= 0 &&
            requestedServerIndex < merged.length &&
            (!tapParam || merged[requestedServerIndex]?.server_data?.some((episode) => episode.slug === tapParam));
          const narrationServerIndex = merged.findIndex((server) =>
            /thuyết minh|thuyet minh|lồng tiếng|long tieng/i.test(server.server_name),
          );
          const matchedServerIndexes = tapParam
            ? merged
                .map((server, index) =>
                  server.server_data?.some((episode) => episode.slug === tapParam)
                    ? index
                    : -1,
                )
                .filter((index) => index >= 0)
            : [];
          // Khi cùng một tập có ở nhiều server, ưu tiên Thuyết minh.
          const matchedServerIndex =
            matchedServerIndexes.includes(narrationServerIndex)
              ? narrationServerIndex
              : matchedServerIndexes[0] ?? -1;
          const selectedServerIndex = validRequestedServer
            ? requestedServerIndex
            : matchedServerIndex >= 0
              ? matchedServerIndex
              : narrationServerIndex >= 0
                ? narrationServerIndex
                : 0;
          setCurrentServer(selectedServerIndex);

          const selectedServer = merged[selectedServerIndex];
          const serverEpisodes = selectedServer?.server_data || [];
          if (serverEpisodes.length > 0) {
            const ep = (tapParam
              ? serverEpisodes.find((episode) => episode.slug === tapParam)
              : undefined) || serverEpisodes[0];

            if (ep) {
              setCurrentEpisode({
                name: ep.name,
                slug: ep.slug,
                url: ep.link_m3u8 || "",
              });
            }
          }
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
  }, [slug, tapParam, serverParam]);

  useEffect(() => {
    let cancelled = false;
    setTmdbRuntimeSeconds(0);
    setEpisodeStills({});
    const movieId = movie?.tmdb?.id;
    const episodeName = currentEpisode?.name ?? "";
    if (!movieId || !episodeName) return;
    const namedEpisode = episodeName.match(/s(\d{1,2})\s*e(\d{1,3})/i);
    const simpleEpisode = episodeName.match(/(?:tập|episode|ep)\s*0*(\d+)/i) ||
      episodeName.match(/^0*(\d+)$/);
    const isSeries =
      movie?.tmdb?.type?.toLowerCase() === "tv" ||
      movie?.type === "series" ||
      movie?.type === "tvshows" ||
      Boolean(namedEpisode || simpleEpisode);
    if (!isSeries) return;
    const season = namedEpisode ? Number(namedEpisode[1]) : 1;
    const episode = namedEpisode ? Number(namedEpisode[2]) : Number(simpleEpisode?.[1] || 0);
    if (!episode) return;
    const params = new URLSearchParams({
      id: String(movieId),
      type: "tv",
      season: String(season),
      episode: String(episode),
    });
    fetch(`/api/tmdb-runtime?${params.toString()}`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (cancelled) return;
        if (Number(data?.runtimeSeconds) > 0) {
          setTmdbRuntimeSeconds(Math.floor(Number(data.runtimeSeconds)));
        }
        if (Array.isArray(data?.episodeStills)) {
          setEpisodeStills(Object.fromEntries(
            data.episodeStills
              .filter((item: { episodeNumber?: number; stillPath?: string }) => Number(item.episodeNumber) > 0 && item.stillPath)
              .map((item: { episodeNumber: number; stillPath: string }) => [
                Number(item.episodeNumber),
                `https://image.tmdb.org/t/p/w500${item.stillPath}`,
              ]),
          ));
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [movie, currentEpisode]);

  useEffect(() => {
    let cancelled = false;
    setIntroSegment(null);
    setIntroDebugStatus("Đang kiểm tra dữ liệu phim...");
    if (!movie) { setIntroDebugStatus("Chưa tải được thông tin phim"); return; }
    if (!currentEpisode) { setIntroDebugStatus("DỪNG: chưa xác định tập đang xem"); return; }

    let season = 1;
    let episodeNumber = 0;
    const namedEpisode = currentEpisode.name.match(/s(\d{1,2})\s*e(\d{1,3})/i);
    const simpleEpisode = currentEpisode.name.match(/(?:tập|episode|ep)\s*0*(\d+)/i) ||
      currentEpisode.name.match(/^0*(\d+)$/);
    // Some OPhim entries omit or mislabel tmdb.type. A numbered episode name
    // is a reliable fallback for identifying a TV episode.
    const isSeries =
      movie.tmdb?.type?.toLowerCase() === "tv" ||
      movie.type === "series" ||
      movie.type === "tvshows" ||
      Boolean(namedEpisode || simpleEpisode);
    if (namedEpisode) {
      season = Number(namedEpisode[1]);
      episodeNumber = Number(namedEpisode[2]);
    } else if (simpleEpisode) {
      episodeNumber = Number(simpleEpisode[1]);
    }

    if (isSeries && (!episodeNumber || !Number.isInteger(episodeNumber))) { setIntroDebugStatus(`DỪNG: không đọc được số tập từ tên “${currentEpisode.name}”`); return; }
    const titleForLookup = (movie.origin_name || movie.name || "").trim();
    const tmdbId = movie.tmdb?.id ? String(movie.tmdb.id) : "";
    // Use AniSkip for Japanese animation series; other titles continue using SkipDB.
    const hasAnimationCategory = movie.type === "hoathinh" || (movie.category?.some((category) =>
      category.slug?.toLowerCase() === "hoat-hinh" ||
      /hoạt hình|animation|anime/i.test(category.name || "")
    ) ?? false);
    const hasJapaneseOrigin = movie.country?.some((country) =>
      country.slug?.toLowerCase() === "nhat-ban" ||
      /nhật bản|japan/i.test(country.name || "")
    ) ?? false;
    const useAniSkip = hasAnimationCategory && hasJapaneseOrigin && isSeries;
    setIntroDebugStatus(`Đang gọi API · ${useAniSkip ? "AniSkip (anime)" : (tmdbId ? `TMDB ${tmdbId}` : "Tìm TMDB theo tên")} · ${isSeries ? `TV S${season}E${episodeNumber}` : "Movie"}`);
    const params = new URLSearchParams({
      ...(useAniSkip ? {
        anime: "1",
        animeTitle: titleForLookup,
        animeYear: String(movie.year || ""),
      } : {}),
      ...(tmdbId ? { tmdbId } : { title: titleForLookup, year: String(movie.year || "") }),
      type: isSeries ? "tv" : "movie",
      ...(isSeries ? { season: String(season), episode: String(episodeNumber) } : {}),
    });

    console.debug("[SkipIntro][page-request]", {
      movie: movie.name,
      episodeName: currentEpisode.name,
      tmdbId: tmdbId || null,
      titleForLookup,
      type: isSeries ? "tv" : "movie",
      season,
      episode: episodeNumber,
      query: params.toString(),
    });
    fetch(`/api/skip-intro?${params.toString()}`)
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        console.debug("[SkipIntro][page-response]", {
          status: response.status,
          ok: response.ok,
          data,
          cancelled,
        });
        if (!cancelled) {
          const detail = data?.reason ? ` · ${data.reason}` : "";
          const resolved = data?.source ? ` · Nguồn ${data.source}` : (data?.resolvedTmdbId ? ` · TMDB ${data.resolvedTmdbId}` : "");
          setIntroDebugStatus(`API HTTP ${response.status}${resolved}${detail}`);
        }
        return data;
      })
      .then((data) => {
        if (cancelled || !data || !Number.isFinite(data.startSeconds) || !Number.isFinite(data.endSeconds)) {
          console.debug("[SkipIntro][page-rejected]", { cancelled, data });
          return;
        }
        if (data.endSeconds > data.startSeconds) {
          console.debug("[SkipIntro][page-set-segment]", {
            startSeconds: data.startSeconds,
            endSeconds: data.endSeconds,
          });
          setIntroSegment({ startSeconds: data.startSeconds, endSeconds: data.endSeconds });
          setIntroDebugStatus(`ĐÃ NHẬN · ${data.source || (data.resolvedTmdbId ? "SkipDB" : "API")} · ${data.startSeconds}s → ${data.endSeconds}s`);
        } else {
          console.debug("[SkipIntro][page-invalid-range]", data);
        }
      })
      .catch((error) => { console.error("[SkipIntro][page-error]", error); if (!cancelled) setIntroDebugStatus(`LỖI FETCH: ${String(error)}`); });

    return () => { cancelled = true; };
  }, [movie, currentEpisode]);

  useEffect(() => {
    if (!user || !movie || !currentEpisode) return;

    const timeoutId = window.setTimeout(() => {
      void memberClient
        .saveHistory({
          movieSlug: movie.slug,
          movieTitle: movie.name,
          posterUrl: movie.poster_url,
          episodeName: currentEpisode.name,
          episodeSlug: currentEpisode.slug,
          progressSeconds: resumeAt,
          totalDurationSeconds: tmdbRuntimeSeconds,
        })
        .catch(() => undefined);
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [user, movie, currentEpisode, resumeAt, tmdbRuntimeSeconds]);

  const persistPlaybackProgress = useCallback((seconds: number, durationSeconds: number, force = false) => {
    if (!user || !movie || !currentEpisode || !Number.isFinite(seconds)) return;
    latestProgressRef.current = { seconds, durationSeconds };
    const now = Date.now();
    if (!force && now - lastHistorySaveRef.current < 3000) return;
    lastHistorySaveRef.current = now;
    void memberClient.saveHistory({
      movieSlug: movie.slug,
      movieTitle: movie.name,
      posterUrl: movie.poster_url,
      episodeName: currentEpisode.name,
      episodeSlug: currentEpisode.slug,
      progressSeconds: Math.floor(Math.max(0, seconds)),
      totalDurationSeconds: Math.floor(durationSeconds > 0 ? durationSeconds : tmdbRuntimeSeconds),
    }).catch(() => undefined);
  }, [user, movie, currentEpisode, tmdbRuntimeSeconds]);

  const handlePlaybackProgress = useCallback((seconds: number, durationSeconds: number, force = false) => {
    persistPlaybackProgress(seconds, durationSeconds, force);
  }, [persistPlaybackProgress]);

  useEffect(() => {
    if (!user || !movie || !currentEpisode) return;
    const flushProgress = () => {
      const latest = latestProgressRef.current;
      if (!latest) return;
      const payload = {
        movieSlug: movie.slug,
        movieTitle: movie.name,
        posterUrl: movie.poster_url,
        episodeName: currentEpisode.name,
        episodeSlug: currentEpisode.slug,
        progressSeconds: Math.floor(Math.max(0, latest.seconds)),
        totalDurationSeconds: Math.floor(latest.durationSeconds > 0 ? latest.durationSeconds : tmdbRuntimeSeconds),
      };
      void fetch("/api/member/history", {
        method: "POST",
        credentials: "include",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => undefined);
    };
    window.addEventListener("pagehide", flushProgress);
    document.addEventListener("visibilitychange", flushProgress);
    return () => {
      flushProgress();
      window.removeEventListener("pagehide", flushProgress);
      document.removeEventListener("visibilitychange", flushProgress);
    };
  }, [user, movie, currentEpisode, tmdbRuntimeSeconds]);
  const handleShare = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 3000);
      }
    } catch {
      // Fallback
    }
  };

      const handleServerChange = (serverIndex: number) => {
    setCurrentServer(serverIndex);
    const serverEps = episodes[serverIndex]?.server_data || [];
    if (serverEps.length === 0) return;

    const matched =
      serverEps.find(
        (e) =>
          e.slug === currentEpisode?.slug ||
          e.name === currentEpisode?.name ||
          e.name === currentEpisode?.slug,
      ) ?? serverEps[0];

    if (!matched) return;

    setCurrentEpisode({
      name: matched.name,
      slug: matched.slug,
      url: matched.link_m3u8 || "",
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0b0d14] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-[#ffd875] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#ffd875] font-black uppercase tracking-widest text-sm animate-pulse">
            Đang đồng bộ luồng phát...
          </p>
        </div>
      </main>
    );
  }

  if (!movie) return null;

  const currentServerEpisodes = episodes[currentServer]?.server_data || [];
  const currentEpIndex = currentServerEpisodes.findIndex(
    (e) => e.slug === currentEpisode?.slug || e.name === currentEpisode?.name,
  );
  const prevEp =
    currentEpIndex > 0 ? currentServerEpisodes[currentEpIndex - 1] : null;
  const nextEp =
    currentEpIndex >= 0 && currentEpIndex < currentServerEpisodes.length - 1
      ? currentServerEpisodes[currentEpIndex + 1]
      : null;

  const transformListMovies = (list: ListMovie[]) => {
    return list.map((m) => ({
      id: m._id,
      title: m.name,
      originalTitle: m.origin_name,
      posterUrl: m.poster_url,
      slug: m.slug,
      year: m.year,
      quality: "HD",
      language: "Vietsub",
      isSeries: false,
    }));
  };

  const suggestedMovies = transformListMovies(latestMovies);

  return (
    <main className={`watch-page watch-player-page fixed inset-0 z-[80] overflow-hidden bg-black text-white ${isPlayerRotated ? "watch-player-rotated" : ""}`}>
      <style jsx global>{`
        .watch-player-page { width:100vw; height:100dvh; }
        .watch-player-shell { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:#000; }
        .watch-player-shell > div { width:100%; height:100%; aspect-ratio:auto !important; border:0 !important; border-radius:0 !important; box-shadow:none !important; }
        .watch-player-shell .native-player { width:100% !important; height:100% !important; aspect-ratio:auto !important; border:0 !important; border-radius:0 !important; box-shadow:none !important; }
        .watch-player-top { position:absolute; z-index:50; top:max(14px,env(safe-area-inset-top)); left:max(16px,env(safe-area-inset-left)); right:max(16px,env(safe-area-inset-right)); display:flex; align-items:center; justify-content:space-between; pointer-events:none; transition:opacity .25s ease,transform .25s ease; }
        .watch-player-top > * { pointer-events:auto; }
        .watch-player-top > div { min-width:0; max-width:calc(100% - 112px); }
        .watch-player-top > div > div { min-width:0; flex:1 1 auto; overflow:hidden; }
        .watch-player-top > div > div > div { max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .watch-player-glass { background:rgba(224,230,238,.10); border:1px solid rgba(255,255,255,.28); color:#fff; backdrop-filter:blur(22px) saturate(160%); -webkit-backdrop-filter:blur(22px) saturate(160%); box-shadow:0 8px 28px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.16); }
        .watch-player-menu { position:absolute; z-index:60; inset:0; width:100%; height:100%; min-height:0; max-height:none; overflow:hidden; display:flex; flex-direction:column; gap:0; padding:max(18px,env(safe-area-inset-top)) max(22px,env(safe-area-inset-right)) max(18px,env(safe-area-inset-bottom)) max(22px,env(safe-area-inset-left)); border-radius:0; background:radial-gradient(ellipse at 78% 12%,rgba(105,128,158,.24),transparent 42%),linear-gradient(135deg,rgba(27,37,51,.97),rgba(9,14,22,.985) 62%,rgba(18,25,36,.98)); border:0; color:#f3f6fa; backdrop-filter:blur(34px) saturate(145%); -webkit-backdrop-filter:blur(34px) saturate(145%); box-shadow:none; }
        .watch-player-picker-layout { display:grid; grid-template-columns:minmax(220px,.34fr) minmax(0,1fr); flex:1 1 0%; min-height:0; gap:0; border:1px solid rgba(218,228,240,.19); border-radius:26px; background:linear-gradient(145deg,rgba(207,218,232,.075),rgba(93,111,135,.055)); box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 18px 50px rgba(0,0,0,.2); overflow:hidden; }
        .watch-player-server-column { min-width:0; padding:22px 20px; border-right:1px solid rgba(221,230,241,.17); background:linear-gradient(180deg,rgba(190,204,222,.055),rgba(16,23,34,.12)); }
        .watch-player-episode-column { display:flex; min-width:0; min-height:0; flex-direction:column; padding:22px 24px; }
        .watch-player-episode-scroll { position:relative; z-index:1; display:block; flex:1 1 0%; min-height:0; height:0; width:100%; overflow-x:hidden; overflow-y:auto; -webkit-overflow-scrolling:touch; overscroll-behavior-y:contain; touch-action:pan-y; pointer-events:auto; scrollbar-width:thin; scrollbar-color:rgba(220,230,242,.28) transparent; }
        .watch-player-episode-grid { display:grid; width:100%; min-height:min-content; grid-template-columns:repeat(5,minmax(0,1fr)); align-content:start; gap:8px; padding:4px 8px 16px 0; }
        .watch-player-menu button { transition:background .18s ease,border-color .18s ease,transform .18s ease,color .18s ease; }
        .watch-player-menu button:active { transform:scale(.98); }
        .watch-player-menu .active-choice { color:#182230; background:linear-gradient(145deg,#f5f7fa 0%,#c4cedb 100%); border-color:rgba(255,255,255,.92); box-shadow:inset 0 1px 0 rgba(255,255,255,.95),0 5px 18px rgba(207,220,237,.2); }
        .watch-player-menu > header { margin:0 0 18px; padding:16px 20px; border:1px solid rgba(218,228,240,.2); border-radius:22px; background:linear-gradient(120deg,rgba(194,207,224,.12),rgba(92,109,132,.09)); box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 12px 30px rgba(0,0,0,.16); backdrop-filter:blur(26px) saturate(135%); -webkit-backdrop-filter:blur(26px) saturate(135%); }
        .watch-player-server-list { display:flex; flex-direction:column; gap:10px; margin-top:18px; }
        .watch-player-server-list > button { display:flex; width:100%; min-height:54px; align-items:center; gap:12px; border:1px solid rgba(219,229,241,.17); border-radius:16px; padding:10px 14px; text-align:left; color:rgba(239,244,250,.82); background:linear-gradient(145deg,rgba(205,216,230,.11),rgba(116,132,153,.07)); box-shadow:inset 0 1px 0 rgba(255,255,255,.09); backdrop-filter:blur(20px) saturate(125%); -webkit-backdrop-filter:blur(20px) saturate(125%); }
        .watch-player-server-list > button.active-choice { color:#182230; background:linear-gradient(145deg,#f5f7fa 0%,#c4cedb 100%); border-color:rgba(255,255,255,.92); }
        .watch-player-server-index { display:grid; width:28px; height:28px; flex:0 0 28px; place-items:center; border-radius:9px; color:inherit; background:rgba(116,132,153,.2); font-size:10px; font-weight:800; }
        .watch-player-episode-grid > button { display:flex; min-width:0; min-height:42px; align-items:center; justify-content:center; gap:5px; border:1px solid rgba(219,229,241,.17); border-radius:12px; padding:7px 7px; color:rgba(241,245,250,.9); font-size:12px; background:linear-gradient(145deg,rgba(205,216,230,.12),rgba(116,132,153,.075)); box-shadow:inset 0 1px 0 rgba(255,255,255,.09); backdrop-filter:blur(20px) saturate(125%); -webkit-backdrop-filter:blur(20px) saturate(125%); }
        .watch-player-episode-grid > button.active-choice { color:#182230; border-color:rgba(255,255,255,.96); background:linear-gradient(145deg,#f7f9fc 0%,#c5cfdd 100%); box-shadow:inset 0 1px 0 #fff,0 5px 18px rgba(207,220,237,.18); }
        .watch-player-episode-grid > button:not(.active-choice):hover,.watch-player-server-list > button:not(.active-choice):hover { border-color:rgba(232,240,249,.42); background:linear-gradient(145deg,rgba(218,228,240,.17),rgba(129,146,168,.12)); }
        .watch-player-menu .picker-section-label { color:rgba(226,235,246,.72); font-size:12px; font-weight:750; letter-spacing:.04em; text-transform:uppercase; }
        .watch-player-menu .picker-muted { color:rgba(220,230,242,.5); }
        @media(max-width:700px) {
          .watch-player-menu { padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left)); }
          .watch-player-picker-layout { grid-template-columns:minmax(0,1fr); grid-template-rows:auto minmax(0,1fr); border-radius:20px; }
          .watch-player-server-column { padding:14px 14px 12px; border-right:0; border-bottom:1px solid rgba(221,230,241,.17); }
          .watch-player-server-list { flex-direction:row; overflow-x:auto; margin-top:12px; padding-bottom:3px; scrollbar-width:none; }
          .watch-player-server-list > button { width:auto; min-width:max-content; min-height:44px; padding:8px 12px; }
          .watch-player-episode-column { padding:14px; }
          .watch-player-episode-grid { grid-template-columns:repeat(4,minmax(0,1fr)); gap:6px; }
          .watch-player-episode-grid > button { min-height:36px; padding:5px 3px; border-radius:10px; font-size:11px; }
        }
        @media(min-width:701px) and (max-width:1023px) { .watch-player-episode-grid { grid-template-columns:repeat(5,minmax(0,1fr)); gap:7px; } }
        @media(min-width:1024px) { .watch-player-menu { padding:28px clamp(28px,5vw,80px); } .watch-player-episode-grid { grid-template-columns:repeat(auto-fill,minmax(112px,1fr)); gap:8px; } }
        .watch-player-round { width:54px;height:54px;border-radius:999px;display:grid;place-items:center; flex:0 0 54px; cursor:pointer; }
        .watch-player-page > .watch-player-round { position:absolute; z-index:70; pointer-events:auto; }
        .watch-player-page .watch-player-top { z-index:50; }
        .watch-player-hidden { opacity:0; pointer-events:none; transform:translateY(-8px); }
        .watch-player-rotate-hint { display:none; }
        @media (orientation:landscape) and (max-width:1023px) {
          .watch-player-shell .native-player { height:100% !important; }
        }
        @media (orientation:portrait) and (max-width:1023px) {
          /* Xoay thủ công bằng nút; không đọc cảm biến và không phụ thuộc khóa xoay iPhone. */
          .watch-player-page.watch-player-rotated {
            position:fixed !important;
            inset:auto !important;
            top:50% !important;
            left:50% !important;
            right:auto !important;
            bottom:auto !important;
            width:100dvh !important;
            height:100dvw !important;
            max-width:none !important;
            max-height:none !important;
            margin:0 !important;
            transform:translate(-50%,-50%) rotate(90deg);
            transform-origin:center center;
            overflow:hidden !important;
          }
          .watch-player-shell > div,
          .watch-player-shell .native-player {
            width:100% !important;
            height:100% !important;
            aspect-ratio:auto !important;
          }
          /* Dùng hệ kích thước của khung đã xoay: d/vh là chiều ngang, vw là chiều dọc. */
          .watch-player-menu {
            inset:0 !important;
            width:100% !important;
            height:100% !important;
            max-height:none !important;
            border-radius:0 !important;
            transform:none !important;
            padding:max(14px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));
          }
          .watch-player-top { top:12px; left:16px; right:16px; }
          .watch-player-rotate-hint { display:none !important; }
        }
        @media (min-width:1024px) { .watch-player-menu { padding:28px clamp(28px,5vw,80px); } .watch-player-episode-grid { grid-template-columns:repeat(auto-fill,minmax(112px,1fr)); gap:8px; } }

        .watch-player-page.watch-player-rotated .watch-player-shell,
        .watch-player-page.watch-player-rotated .watch-player-shell > div,
        .watch-player-page.watch-player-rotated .watch-player-shell .native-player {
          width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;
        }
        .watch-player-page.watch-player-rotated .native-player-video { object-fit:contain!important; }
      `}</style>

      <div
        className="watch-player-shell"
      >
        {currentEpisode?.url && (
          <VideoPlayer
            url={currentEpisode.url}
            poster={movie.thumb_url}
            title={`${movie.name} - ${formatEpisodeName(currentEpisode.name)}`}
            startAtSeconds={resumeAt}
            introStartSeconds={introSegment?.startSeconds}
            introEndSeconds={introSegment?.endSeconds}
            introDebugStatus={introDebugStatus}
            onProgress={handlePlaybackProgress}
            rotated={isPlayerRotated}
            backLabel={movie.name}
            onBack={handlePlayerBack}
            onRotate={handlePlayerRotate}
            onOpenEpisodePicker={() => { setOverlayOpen(true); setShowPlayerChrome(true); }}
            showNextEpisode={Boolean(nextEp)}
            onNextEpisode={nextEp ? () => router.push(`/xem-phim/${slug}?tap=${nextEp.slug}&sv=${currentServer}`) : undefined}
            subtitleSearch={{
              // Ưu tiên loại nội dung TMDB do PhimAPI trả về; fallback sang type của PhimAPI.
              title: movie.origin_name || movie.original_name || movie.name,
              year: movie.year,
              tmdbId: movie.tmdb?.id,
              type: movie.tmdb?.type === "tv" || (!movie.tmdb?.type && (movie.type === "series" || movie.type === "tvshows" || movie.type === "hoathinh")) ? "tv" : "movie",
              season: (() => {
                const match = currentEpisode.name.match(/s(\d{1,2})\s*e\d{1,3}/i);
                return match ? Number(match[1]) : 1;
              })(),
              episode: (() => {
                const named = currentEpisode.name.match(/s\d{1,2}\s*e(\d{1,3})/i);
                const numbered = currentEpisode.name.match(/(?:tập|episode|ep)\s*0*(\d+)/i) || currentEpisode.name.match(/^0*(\d+)$/);
                const value = Number(named?.[1] || numbered?.[1] || 0);
                return value > 0 ? value : undefined;
              })(),
            }}
          />
        )}
      </div>
      {overlayOpen && (
        <section className="watch-player-menu" role="dialog" aria-modal="true" aria-label="Chọn tập và máy chủ">
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-white/55">Danh sách phát</p>
              <h2 className="mt-1 truncate text-xl font-bold">{movie.name}</h2>
              <p className="mt-1 text-xs text-white/50">{currentServerEpisodes.length} tập · {episodes[currentServer]?.server_name || "SV " + (currentServer + 1)}</p>
            </div>
            <button type="button" onClick={() => setOverlayOpen(false)} aria-label="Đóng danh sách tập" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-2xl text-white">×</button>
          </header>
          <div className="watch-player-picker-layout">
            <aside className="watch-player-server-column">
              <p className="picker-section-label">Máy chủ phát</p>
              <div className="watch-player-server-list">
                {episodes.map((server, index) => (
                  <button key={server.server_name + "-" + index} type="button" onClick={() => {
                    const list = server.server_data || [];
                    const matched = list.find((ep) => ep.slug === currentEpisode?.slug || ep.name === currentEpisode?.name) || list[0];
                    if (!matched) return;
                    setOverlayOpen(false);
                    router.push("/xem-phim/" + slug + "?tap=" + matched.slug + "&sv=" + index);
                  }} className={currentServer === index ? "active-choice" : ""}>
                    <span className="watch-player-server-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 truncate text-sm font-semibold">{server.server_name || "SV " + (index + 1)}</span>
                    {currentServer === index && <span className="ml-auto text-sm font-black">✓</span>}
                  </button>
                ))}
              </div>
            </aside>
            <section className="watch-player-episode-column">
              <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
                <div>
                  <h3 className="picker-section-label">Danh sách tập</h3>
                  <p className="mt-1 text-xs picker-muted">{currentServerEpisodes.length} tập · Đang xem {formatEpisodeName(currentEpisode?.name)}</p>
                </div>
              </div>
              <div className="watch-player-episode-scroll">
                <div className="watch-player-episode-grid">
                  {currentServerEpisodes.map((ep, index) => {
                    const match = ep.name.match(/(?:tập|episode|ep)\s*0*(\d+)/i) || ep.name.match(/^0*(\d+)$/);
                    const number = Number(match?.[1] || index + 1);
                    const active = ep.slug === currentEpisode?.slug;
                    return (
                      <button key={ep.slug || ep.name + "-" + index} type="button" title={formatEpisodeName(ep.name)} aria-current={active ? "true" : undefined} onClick={() => {
                        setOverlayOpen(false);
                        router.push("/xem-phim/" + slug + "?tap=" + ep.slug + "&sv=" + currentServer);
                      }} className={active ? "active-choice" : ""}>
                        <span className="truncate text-sm font-semibold">Tập {String(number).padStart(2, "0")}</span>
                        {active && <span className="text-xs font-black" aria-label="Đang xem">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        </section>
      )}

    </main>
  );
}

interface EpisodeListProps {
  episodes: Episode[];
  currentEpisode: { name: string; url: string } | null;
  slug: string;
  currentServer: number;
  onServerChange: (serverIndex: number) => void;
  episodeStills: Record<number, string>;
}

function EpisodeList({
  episodes,
  currentEpisode,
  slug,
  currentServer,
  onServerChange,
  episodeStills,
}: EpisodeListProps) {
  if (!episodes || episodes.length === 0) return null;

  const activeEpisodes = episodes[currentServer]?.server_data || [];
  return (
    <section className="watch-episode-list space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[.22em] text-white/35 font-semibold">Tiếp tục hành trình</p>
          <h3 className="mt-1 flex items-center gap-2 text-base font-bold tracking-tight">
            <List className="text-white/75" size={17} /> Danh sách tập
            <span className="text-xs font-medium text-white/35">{activeEpisodes.length} tập</span>
          </h3>
        </div>
        {episodes.length > 1 && (
          <div className="watch-server-picker flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] p-1">
            {episodes.map((server, i) => (
              <button
                key={`${server.server_name}-${i}`}
                onClick={() => onServerChange(i)}
                className={`rounded-full px-3 py-2 text-[10px] font-semibold transition-all ${
                  currentServer === i ? "bg-white text-[#10131a] shadow-lg" : "text-white/55 hover:text-white"
                }`}
              >
                {server.server_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:grid xl:grid-cols-2 xl:overflow-y-auto xl:max-h-[520px] xl:overflow-x-hidden">
        {activeEpisodes.map((ep: ServerData, index: number) => {
          const active = currentEpisode?.name === ep.name;
          const episodeNumberMatch = ep.name.match(/(?:tập|episode|ep)\\s*0*(\\d+)/i) || ep.name.match(/^0*(\\d+)$/);
          const episodeNumber = Number(episodeNumberMatch?.[1] || index + 1);
          const stillUrl = episodeStills[episodeNumber];
          return (
            <Link
              key={ep.slug}
              href={`/xem-phim/${slug}?tap=${ep.slug}&sv=${currentServer}`}
              className={`watch-episode-card group relative flex w-[142px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border text-left transition-all xl:w-auto ${
                active ? "border-white/75 bg-white/[0.12] shadow-[0_8px_28px_rgba(255,255,255,.08)]" : "border-white/[0.08] bg-white/[0.045] hover:border-white/25"
              }`}
            >
              <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-white/15 to-white/[0.025]">
                {stillUrl ? (
                  <Image src={stillUrl} alt={formatEpisodeName(ep.name)} fill sizes="(max-width: 1280px) 142px, 180px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-light text-white/20">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                {active && <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-1 text-[9px] font-bold text-black">ĐANG XEM</span>}
                <span className="absolute bottom-2 right-2 rounded bg-black/55 px-1.5 py-0.5 text-[9px] text-white/80">Tập {index + 1}</span>
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                <span className={`episode-card-title truncate text-xs font-semibold ${active ? "text-white" : "text-white/65"}`}>{formatEpisodeName(ep.name)}</span>
                {active ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white shadow-[0_0_8px_white]" /> : <Play size={12} className="shrink-0 text-white/35" />}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function WatchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0b0d14] text-white flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#ffd875] border-t-transparent rounded-full animate-spin"></div>
        </main>
      }
    >
      <WatchPageContent params={params} />
    </Suspense>
  );
}