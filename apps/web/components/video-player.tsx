
"use client";

import { useEffect, useRef, useState } from "react";
import Artplayer from "artplayer";
import { ArrowLeft, Play, Pause, RotateCw, SkipBack, SkipForward, Subtitles, Maximize2, Settings2 } from "lucide-react";
import Hls from "hls.js";

// Tắt double-click fullscreen / play mặc định
Artplayer.DBCLICK_FULLSCREEN = false;
Artplayer.MOBILE_DBCLICK_PLAY = false;

interface SpeechCue {
  start: number;
  end: number;
  text: string;
}

function parseVttTime(value: string): number {
  const parts = value.trim().replace(",", ".").split(":");
  const seconds = Number(parts.pop()?.replace(",", ".") || 0);
  const minutesOrHours = Number(parts.pop() || 0);
  const hours = Number(parts.pop() || 0);
  return hours * 3600 + minutesOrHours * 60 + seconds;
}

function parseWebVttSpeechCues(vtt: string): SpeechCue[] {
  return vtt
    .replace(/^\uFEFF?WEBVTT[^\n]*\n/i, "")
    .split(/\n{2,}/)
    .flatMap((block) => {
      const lines = block.split(/\n/).map((line) => line.trim()).filter(Boolean);
      const timingIndex = lines.findIndex((line) => line.includes("-->"));
      if (timingIndex < 0) return [];
      const timingParts = (lines[timingIndex] || "").split("-->").map((part) => part.trim().split(/\s+/)[0] || "");
      const startText = timingParts[0] || "";
      const endText = timingParts[1] || "";
      const start = parseVttTime(startText);
      const end = parseVttTime(endText);
      const text = lines.slice(timingIndex + 1).join(" ")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/\s+/g, " ")
        .trim();
      return Number.isFinite(start) && Number.isFinite(end) && end > start && text ? [{ start, end, text }] : [];
    });
}

interface VideoPlayerProps {
  url: string;
  poster?: string;
  title?: string;
  onReady?: (art: Artplayer) => void;
  startAtSeconds?: number;
  introStartSeconds?: number;
  introEndSeconds?: number;
  introDebugStatus?: string;
  onProgress?: (seconds: number, durationSeconds: number, force?: boolean) => void;
  onUserInteraction?: () => void;
  rotated?: boolean;
  backLabel?: string;
  onBack?: () => void;
  onRotate?: () => void;
  showNextEpisode?: boolean;
  onNextEpisode?: () => void;
  subtitleSearch?: { title: string; year?: number; tmdbId?: number | string; type?: "movie" | "tv"; season?: number; episode?: number };
}

export const VideoPlayer = ({
  url,
  poster,
  title,
  onReady,
  startAtSeconds = 0,
  introStartSeconds,
  introEndSeconds,
  introDebugStatus = "Chưa có trạng thái API",
  onProgress,
  onUserInteraction,
  rotated = false,
  backLabel = "Trở về",
  onBack,
  onRotate,
  showNextEpisode = false,
  onNextEpisode,
  subtitleSearch,
}: VideoPlayerProps) => {
  const artRef = useRef<HTMLDivElement>(null);
  const artPlayerRef = useRef<Artplayer | null>(null);
  const subtitleToggleRef = useRef<() => void>(() => {});
  const subtitleEnabledRef = useRef(false);
  const rotatedRef = useRef(rotated);
  rotatedRef.current = rotated;
  const onBackRef = useRef(onBack);
  const onRotateRef = useRef(onRotate);
  const onNextEpisodeRef = useRef(onNextEpisode);
  onBackRef.current = onBack;
  onRotateRef.current = onRotate;
  onNextEpisodeRef.current = onNextEpisode;
  const safeBackLabel = backLabel.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const introSegmentRef = useRef({
    startSeconds: introStartSeconds,
    endSeconds: introEndSeconds,
  });

  // Keep intro timing current without rebuilding Artplayer when the API responds.
  useEffect(() => {
    introSegmentRef.current = {
      startSeconds: introStartSeconds,
      endSeconds: introEndSeconds,
    };
    console.debug("[SkipIntro][player-props]", {
      introStartSeconds,
      introEndSeconds,
    });
  }, [introStartSeconds, introEndSeconds]);

  // Direct HLS streams must always use Artplayer, even if their URL contains
  // words such as "video" or "embed" in a path or query parameter.
  const isHlsStream = /\.m3u8(?:$|[?#])/i.test(url);
  // NguonC cung cấp link_embed từ máy chủ phát riêng; host của embed thay đổi
  // nên không thể chỉ nhận diện theo danh sách domain cố định.
  const isDirectVideoFile = /\.(?:mp4|webm|ogg|mp3)(?:$|[?#])/i.test(url);
  const isEmbed =
    !isHlsStream &&
    typeof url === "string" &&
    /^https?:\/\//i.test(url) &&
    !isDirectVideoFile;

  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showPlayerHeader, setShowPlayerHeader] = useState(true);
  const [playerTime, setPlayerTime] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(0);
  const [playerIsPlaying, setPlayerIsPlaying] = useState(false);
  const [subtitlePanelOpen, setSubtitlePanelOpen] = useState(false);
  const [subtitleCandidates, setSubtitleCandidates] = useState<any[]>([]);
  const [subtitleLoading, setSubtitleLoading] = useState(false);
  const [subtitleError, setSubtitleError] = useState("");
  const [subtitleDownloading, setSubtitleDownloading] = useState("");
  const [selectedSubtitle, setSelectedSubtitle] = useState("");
  const [voiceoverEnabled, setVoiceoverEnabled] = useState(false);
  const [voiceoverReady, setVoiceoverReady] = useState(false);
  const [voiceoverStatus, setVoiceoverStatus] = useState("");
  const speechCuesRef = useRef<SpeechCue[]>([]);
  const speechEnabledRef = useRef(false);
  const subtitleSelectRef = useRef<(candidate: any) => void>(() => {});
  const [showDebug, setShowDebug] = useState(() => {
    try {
      return typeof window !== "undefined" && window.localStorage.getItem("player-skip-intro-debug") === "on";
    } catch {
      return false;
    }
  });
  const [debugCurrentTime, setDebugCurrentTime] = useState<number | null>(null);
  const [debugVideoState, setDebugVideoState] = useState("Đang chờ trình phát");


  useEffect(() => {
    if (!artRef.current || isEmbed) return;

    let hlsInstance: Hls | null = null;
    let knownDurationSeconds = 0;
    let skipIntroControlVisible = false;
    let art: Artplayer | null = null;
    let seekWatchTimer: ReturnType<typeof setTimeout> | null = null;
    let stallWatchTimer: ReturnType<typeof setInterval> | null = null;
    let lastTime = 0;
    let stuckCount = 0;

    const clearTimers = () => {
      if (seekWatchTimer) {
        clearTimeout(seekWatchTimer);
        seekWatchTimer = null;
      }

      if (stallWatchTimer) {
        clearInterval(stallWatchTimer);
        stallWatchTimer = null;
      }
    };

    const recoverPlayback = (
      video: HTMLMediaElement,
      atTime?: number,
    ) => {
      const t =
        typeof atTime === "number" ? atTime : video.currentTime;

      try {
        if (hlsInstance) {
          hlsInstance.recoverMediaError();
          hlsInstance.startLoad(t);
        }

        if (Number.isFinite(t)) {
          video.currentTime = t;
        }

        video.play().catch(() => {});
      } catch {
        // ignore
      }
    };

    try {
      art = new Artplayer({
        container: artRef.current,
        url: url,
        type: url.includes(".m3u8") ? "m3u8" : undefined,
        poster: poster,
        volume: 0.7,
        isLive: false,
        muted: false,
        autoplay: true,
        pip: true,
        autoSize: false,
        autoMini: false,
        screenshot: true,
        setting: true,
        controls: [
          {
            name: "seek-back-30", position: "left", index: 10,
            html: '<span style="font-size:12px;font-weight:700;white-space:nowrap">−30s</span>',
            tooltip: "Lùi 30 giây",
            click: () => { if (!art) return; art.seek = Math.max(0, art.currentTime - 30); art.play().catch(() => {}); art.notice.show = "Lùi 30 giây"; },
          },
          {
            name: "seek-forward-30", position: "left", index: 11,
            html: '<span style="font-size:12px;font-weight:700;white-space:nowrap">+30s</span>',
            tooltip: "Tiến 30 giây",
            click: () => { if (!art) return; art.seek = Math.min(art.duration || Infinity, art.currentTime + 30); art.play().catch(() => {}); art.notice.show = "Tiến 30 giây"; },
          },
          {
            name: "subtitle-toggle",
            position: "right",
            index: 98,
            html: '<span style="display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:24px;padding:0 6px;border:1px solid currentColor;border-radius:6px;font-size:11px;font-weight:850;letter-spacing:.04em">SUB</span>',
            tooltip: "Bật / tắt phụ đề",
            click: () => setSubtitlePanelOpen(true),
          },
          ...(showNextEpisode ? [{
            name: "next-episode",
            position: "right" as const,
            index: 99,
            html: '<span style="display:inline-flex;align-items:center;gap:7px;padding:0 10px;font-size:12px;font-weight:750;white-space:nowrap;letter-spacing:.01em">TẬP TIẾP THEO <span style="font-size:15px;line-height:1">›</span></span>',
            tooltip: "Chuyển sang tập tiếp theo",
            click: () => onNextEpisodeRef.current?.(),
          }] : []),
        ],
        settings: [
          {
            html: "Hiện debug Skip Intro",
            tooltip: "Hiển thị thông tin kiểm tra Skip Intro trên trình phát",
            switch: showDebug,
            onSwitch: (item) => {
              const enabled = !item.switch;
              setShowDebug(enabled);
              try {
                window.localStorage.setItem("player-skip-intro-debug", enabled ? "on" : "off");
              } catch {
                // Bỏ qua nếu trình duyệt không cho phép lưu cài đặt.
              }
              return enabled;
            },
          },
        ],
        loop: false,
        flip: true,
        playbackRate: true,
        aspectRatio: true,
        fullscreen: true,
        fullscreenWeb: true,
        subtitleOffset: true,
        miniProgressBar: false,
        mutex: true,
        backdrop: true,
        playsInline: true,
        autoPlayback: false,
        airplay: true,
        theme: "#8b5cf6",
        moreVideoAttr: {},

        customType: {
          m3u8: function (
            video: HTMLMediaElement,
            sourceUrl: string,
            artPlayer: Artplayer,
          ) {
            if (Hls.isSupported()) {
              if (hlsInstance) {
                try {
                  hlsInstance.destroy();
                } catch {
                  // ignore
                }

                hlsInstance = null;
              }

              const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: false,
                backBufferLength: 30,
                maxBufferLength: 40,
                maxMaxBufferLength: 80,
                maxBufferSize: 80 * 1000 * 1000,
                maxBufferHole: 1.5,
                highBufferWatchdogPeriod: 1,
                nudgeOffset: 0.2,
                nudgeMaxRetry: 8,
                maxFragLookUpTolerance: 0.25,
                fragLoadingMaxRetry: 6,
                fragLoadingRetryDelay: 1000,
                manifestLoadingMaxRetry: 4,
                levelLoadingMaxRetry: 4,
                startLevel: -1,
              });

              hls.loadSource(sourceUrl);
              hls.attachMedia(video);

              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                // HLS có thể chỉ xác định duration sau khi manifest được phân tích.
                if (startAtSeconds <= 0) video.play().catch(() => {});
              });

              hls.on(Hls.Events.LEVEL_LOADED, (_event, data) => {
                const duration = Number(data.details?.totalduration);
                if (Number.isFinite(duration) && duration > 0) {
                  knownDurationSeconds = duration;
                }
              });

              hls.on(Hls.Events.ERROR, (_event, data) => {
                if (!data.fatal) return;

                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    hls.startLoad(video.currentTime || 0);
                    break;

                  case Hls.ErrorTypes.MEDIA_ERROR:
                    try {
                      hls.recoverMediaError();
                      hls.startLoad(video.currentTime || 0);
                    } catch {
                      hls.destroy();
                    }
                    break;

                  default:
                    try {
                      hls.destroy();
                    } catch {
                      // ignore
                    }
                    break;
                }
              });

              const onSeeking = () => {
                if (hlsInstance) {
                  try {
                    hlsInstance.startLoad(video.currentTime);
                  } catch {
                    // ignore
                  }
                }
              };

              const onSeeked = () => {
                if (seekWatchTimer) {
                  clearTimeout(seekWatchTimer);
                }

                const target = video.currentTime;

                seekWatchTimer = setTimeout(() => {
                  const stalled =
                    !video.paused &&
                    video.readyState < 3 &&
                    Math.abs(video.currentTime - target) < 0.35;

                  if (stalled) {
                    recoverPlayback(video, target);
                  }
                }, 2500);
              };

              video.addEventListener("seeking", onSeeking);
              video.addEventListener("seeked", onSeeked);

              lastTime = 0;
              stuckCount = 0;

              stallWatchTimer = setInterval(() => {
                if (video.paused || video.ended) {
                  stuckCount = 0;
                  lastTime = video.currentTime;
                  return;
                }

                if (Math.abs(video.currentTime - lastTime) < 0.05) {
                  stuckCount += 1;
                } else {
                  stuckCount = 0;
                }

                lastTime = video.currentTime;

                if (stuckCount >= 3) {
                  stuckCount = 0;
                  recoverPlayback(video, video.currentTime);
                }
              }, 1000);

              const originalDestroy = () => {
                video.removeEventListener("seeking", onSeeking);
                video.removeEventListener("seeked", onSeeked);
                clearTimers();
              };

              hlsInstance = hls;

              (artPlayer as any).hls = hls;
              (artPlayer as any).__seekCleanup = originalDestroy;
            } else if (
              video.canPlayType("application/vnd.apple.mpegurl")
            ) {
              video.src = sourceUrl;
            } else if (artPlayer) {
              artPlayer.notice.show =
                "Định dạng video không được hỗ trợ";
            }
          },
        },
      });
      artPlayerRef.current = art;

      if (art && startAtSeconds > 0) {
        const resumeVideo = art.video as HTMLVideoElement;
        const resumePlayback = () => {
          if (Number.isFinite(resumeVideo.duration) && resumeVideo.duration > 0) {
            resumeVideo.currentTime = Math.min(startAtSeconds, Math.max(0, resumeVideo.duration - 2));
          }
          resumeVideo.play().catch(() => {});
        };
        if (resumeVideo.readyState >= 1) resumePlayback();
        else resumeVideo.addEventListener("loadedmetadata", resumePlayback, { once: true });
      }

      if (art) {
        const video = art.video as HTMLVideoElement;
        let activeSpeechCue = -1;
        const cancelVoiceover = () => {
          if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
          }
          activeSpeechCue = -1;
        };
        const syncVoiceover = () => {
          if (!speechEnabledRef.current || video.paused || video.ended ||
              typeof window === "undefined" || !("speechSynthesis" in window)) return;
          const now = video.currentTime;
          const cueIndex = speechCuesRef.current.findIndex((cue) => now >= cue.start && now < cue.end);
          if (cueIndex === activeSpeechCue) return;
          window.speechSynthesis.cancel();
          activeSpeechCue = cueIndex;
          if (cueIndex < 0) return;
          const cue = speechCuesRef.current[cueIndex];
          if (!cue) return;
          const utterance = new SpeechSynthesisUtterance(cue.text);
          utterance.lang = "vi-VN";
          utterance.rate = 1.04;
          utterance.pitch = 1;
          utterance.volume = 1;
          const vietnameseVoice = window.speechSynthesis.getVoices().find((voice) => /^vi([_-]|$)/i.test(voice.lang));
          if (vietnameseVoice) utterance.voice = vietnameseVoice;
          window.speechSynthesis.speak(utterance);
        };
        const onVideoPauseForVoiceover = () => cancelVoiceover();
        const onVideoSeekForVoiceover = () => cancelVoiceover();
        const onVideoPlayForVoiceover = () => syncVoiceover();
        const reportProgress = () => {
          syncVoiceover();
          setPlayerTime(Number.isFinite(video.currentTime) ? video.currentTime : 0);
          const uiDuration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : knownDurationSeconds;
          if (uiDuration > 0) setPlayerDuration(uiDuration);
          const intro = introSegmentRef.current;
          if (showDebug) {
            setDebugCurrentTime(Number(video.currentTime.toFixed(2)));
            setDebugVideoState(
              `${video.paused ? "Đang tạm dừng" : "Đang phát"} · readyState ${video.readyState} · ${video.networkState === 1 ? "có nguồn" : `networkState ${video.networkState}`}`,
            );
          }
          const hasIntro =
            typeof intro.startSeconds === "number" &&
            typeof intro.endSeconds === "number" &&
            Number.isFinite(intro.startSeconds) &&
            Number.isFinite(intro.endSeconds) &&
            intro.endSeconds > intro.startSeconds;
          const inIntroRange =
            hasIntro &&
            video.currentTime >= intro.startSeconds! &&
            video.currentTime < intro.endSeconds!;
          if (inIntroRange && Math.floor(video.currentTime) % 2 === 0) {
            console.debug("[SkipIntro][player-timeupdate]", {
              currentTime: Number(video.currentTime.toFixed(2)),
              startSeconds: intro.startSeconds,
              endSeconds: intro.endSeconds,
              hasIntro,
              inIntroRange,
              buttonShouldRender: inIntroRange,
            });
          }
          setShowSkipIntro(inIntroRange);
          if (art && inIntroRange && !skipIntroControlVisible) {
            art.controls.add({
              name: "skip-intro",
              position: "left",
              index: 12,
              html: '<span style="font-weight:700;white-space:nowrap">Bỏ qua intro »</span>',
              tooltip: "Bỏ qua đoạn giới thiệu",
              click: () => {
                const endSeconds = introSegmentRef.current.endSeconds;
                if (typeof endSeconds !== "number" || !Number.isFinite(endSeconds)) return;
                art!.seek = endSeconds;
                art!.play().catch(() => {});
                art!.controls.remove("skip-intro");
                skipIntroControlVisible = false;
              },
            });
            skipIntroControlVisible = true;
          } else if (art && !inIntroRange && skipIntroControlVisible) {
            art.controls.remove("skip-intro");
            skipIntroControlVisible = false;
          }
          if (!video.paused && Number.isFinite(video.currentTime)) {
            const mediaDuration = Number.isFinite(video.duration) && video.duration > 0
              ? video.duration
              : knownDurationSeconds;
            onProgress?.(video.currentTime, mediaDuration);
          }
        };

        const reportFinalProgress = () => {
          if (!Number.isFinite(video.currentTime)) return;
          const mediaDuration = Number.isFinite(video.duration) && video.duration > 0
            ? video.duration
            : knownDurationSeconds;
          onProgress?.(video.currentTime, mediaDuration, true);
        };
        const syncPlayerUi = () => {
          setPlayerTime(Number.isFinite(video.currentTime) ? video.currentTime : 0);
          const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : knownDurationSeconds;
          if (duration > 0) setPlayerDuration(duration);
          setPlayerIsPlaying(!video.paused && !video.ended);
        };
        video.addEventListener("loadedmetadata", syncPlayerUi);
        video.addEventListener("durationchange", syncPlayerUi);
        video.addEventListener("play", syncPlayerUi);
        video.addEventListener("pause", syncPlayerUi);
        video.addEventListener("timeupdate", reportProgress);
        video.addEventListener("pause", reportFinalProgress);
        video.addEventListener("ended", reportFinalProgress);
        video.addEventListener("pause", onVideoPauseForVoiceover);
        video.addEventListener("seeking", onVideoSeekForVoiceover);
        video.addEventListener("seeked", onVideoPlayForVoiceover);
        video.addEventListener("play", onVideoPlayForVoiceover);

        const previousCleanup = (art as any).__seekCleanup as (() => void) | undefined;
        (art as any).__seekCleanup = () => {
          cancelVoiceover();
          video.removeEventListener("loadedmetadata", syncPlayerUi);
          video.removeEventListener("durationchange", syncPlayerUi);
          video.removeEventListener("play", syncPlayerUi);
          video.removeEventListener("pause", syncPlayerUi);
          video.removeEventListener("timeupdate", reportProgress);
          video.removeEventListener("pause", reportFinalProgress);
          video.removeEventListener("ended", reportFinalProgress);
          video.removeEventListener("pause", onVideoPauseForVoiceover);
          video.removeEventListener("seeking", onVideoSeekForVoiceover);
          video.removeEventListener("seeked", onVideoPlayForVoiceover);
          video.removeEventListener("play", onVideoPlayForVoiceover);
          previousCleanup?.();
        };
      }

      if (art) {
        // Đồng bộ hàng tên phim/nút xoay với trạng thái hiện/ẩn controls của Artplayer.
        art.on("control", (visible: boolean) => {
          setShowPlayerHeader(Boolean(visible));
        });
      }

      if (onReady && art) {
        onReady(art);
      }

      // Double tap: trái -30 giây, phải +30 giây
      if (art) {
        const container = art.template.$player as HTMLElement;
        // Giữ thao tác kéo thanh tiến trình để tua chính xác theo vị trí.
        let progressDragging = false;
        let progressPointerId: number | null = null;
        const progressElement = (art.template as any).$progress as HTMLElement | undefined;

        if (progressElement) {
          progressElement.style.touchAction = "none";
        }

        const seekFromRotatedProgress = (clientY: number) => {
          if (!progressElement || !art || !rotatedRef.current) return;
          const rect = progressElement.getBoundingClientRect();
          const duration = Number.isFinite(art.duration) ? art.duration : 0;
          if (duration <= 0 || rect.height <= 0) return;
          const fraction = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
          const seconds = fraction * duration;
          art.emit("setBar", "played", fraction);
          art.seek = seconds;
        };

        const onProgressPointerDown = (event: PointerEvent) => {
          if (!rotatedRef.current || !progressElement) return;
          const target = event.target as Node | null;
          if (!target || !progressElement.contains(target)) return;

          progressDragging = true;
          progressPointerId = event.pointerId;
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          seekFromRotatedProgress(event.clientY);
        };

        const onProgressPointerMove = (event: PointerEvent) => {
          if (!progressDragging || event.pointerId !== progressPointerId) return;
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          seekFromRotatedProgress(event.clientY);
        };

        const onProgressPointerUp = (event: PointerEvent) => {
          if (!progressDragging || event.pointerId !== progressPointerId) return;
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          seekFromRotatedProgress(event.clientY);
          progressDragging = false;
          progressPointerId = null;
        };

        container.addEventListener("pointerdown", onProgressPointerDown, true);

        document.addEventListener("pointermove", onProgressPointerMove, true);
        document.addEventListener("pointerup", onProgressPointerUp, true);
        document.addEventListener("pointercancel", onProgressPointerUp, true);

        // Vuốt trên vùng hình video không thay đổi thời gian phát.
        // Chỉ nhấn hai lần cùng một nửa màn hình mới tua ±30 giây.
        let lastTap = 0;
        let lastSide: "left" | "right" | null = null;
        let tapPointerId: number | null = null;
        let tapStartX = 0;
        let tapStartY = 0;
        let tapMoved = false;

        const isControlTarget = (target: EventTarget | null) =>
          target instanceof HTMLElement &&
          !!target.closest(
            ".art-controls, .art-bottom, .art-settings, .art-mask, .art-control, .art-progress, button, input",
          );

        const onTapPointerDown = (event: PointerEvent) => {
          if (isControlTarget(event.target)) return;
          tapPointerId = event.pointerId;
          tapStartX = event.clientX;
          tapStartY = event.clientY;
          tapMoved = false;
        };

        const onTapPointerMove = (event: PointerEvent) => {
          if (event.pointerId !== tapPointerId || tapMoved) return;
          if (Math.hypot(event.clientX - tapStartX, event.clientY - tapStartY) > 12) {
            tapMoved = true;
            lastTap = 0;
            lastSide = null;
          }
        };

        const skipBy = (seconds: number) => {
          const video = art!.video as HTMLVideoElement | undefined;
          if (!video || !Number.isFinite(video.duration)) return;

          const next = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
          video.currentTime = next;

          try {
            const hls = (art as any).hls as Hls | undefined;
            hls?.startLoad(next);
          } catch {
            // ignore
          }

          // YouTube-style visual feedback centered in the tapped half.
          art!.notice.show = seconds < 0 ? "Lùi 30 giây" : "Tiến 30 giây";
          video.play().catch(() => {});
        };

        const onPointerUp = (event: PointerEvent) => {
          if (event.pointerId !== tapPointerId) return;
          const wasSwipe = tapMoved;
          tapPointerId = null;
          tapMoved = false;
          if (wasSwipe || isControlTarget(event.target)) return;

          const rect = container.getBoundingClientRect();
          const isLandscapePlayer =
            rotatedRef.current ||
            window.matchMedia("(orientation: landscape)").matches;
          const half: "left" | "right" = isLandscapePlayer
            ? (event.clientY < rect.top + rect.height / 2 ? "left" : "right")
            : (event.clientX < rect.left + rect.width / 2 ? "left" : "right");

          const now = Date.now();
          if (now - lastTap < 320 && lastSide === half) {
            skipBy(half === "left" ? -30 : 30);
            lastTap = 0;
            lastSide = null;
          } else {
            lastTap = now;
            lastSide = half;
          }
        };

        container.addEventListener("pointerdown", onTapPointerDown);
        container.addEventListener("pointermove", onTapPointerMove, { passive: true });
        const onTapPointerCancel = () => {
          tapPointerId = null;
          tapMoved = false;
          lastTap = 0;
          lastSide = null;
        };

        container.addEventListener("pointerup", onPointerUp);
        container.addEventListener("pointercancel", onTapPointerCancel);


        // Người xem chỉ tua bằng thanh tiến trình hoặc các nút điều khiển.


        const prevCleanup = (art as any).__seekCleanup as
          | (() => void)
          | undefined;

        (art as any).__seekCleanup = () => {
          container.removeEventListener("pointerdown", onProgressPointerDown, true);
          document.removeEventListener("pointermove", onProgressPointerMove, true);
          document.removeEventListener("pointerup", onProgressPointerUp, true);
          document.removeEventListener("pointercancel", onProgressPointerUp, true);
          if (progressElement) progressElement.style.touchAction = "";
          container.removeEventListener("pointerdown", onTapPointerDown);
          container.removeEventListener("pointermove", onTapPointerMove);
          container.removeEventListener("pointerup", onPointerUp);
          container.removeEventListener("pointercancel", onTapPointerCancel);

          prevCleanup?.();
        };
      }
    } catch (err) {
      console.error(
        "Failed to initialize Artplayer:",
        err,
      );
    }

    return () => {
      clearTimers();

      try {
        const cleanup = (art as any)?.__seekCleanup;

        if (typeof cleanup === "function") {
          cleanup();
        }
      } catch {
        // ignore
      }

      if (hlsInstance) {
        try {
          hlsInstance.destroy();
        } catch {
          // ignore
        }

        hlsInstance = null;
      }

      if (art) {
        try {
          if (art.mini) art.mini = false;
          if (art.pip) art.pip = false;
        } catch {
          // ignore
        }

        try {
          if (typeof art.destroy === "function") {
            art.destroy(true);
          }
        } catch {
          // ignore
        }

        if (artPlayerRef.current === art) artPlayerRef.current = null;
        art = null;
      }

      if (typeof document !== "undefined") {
        document
          .querySelectorAll(
            ".art-auto-mini, .art-mini, .artplayer-app.art-auto-mini, .artplayer-mini",
          )
          .forEach((el) => el.remove());
      }
    };
  }, [url, poster, title, onReady, isEmbed, startAtSeconds, onProgress, showNextEpisode]);

  // Tìm danh sách phụ đề SubDL; chỉ tải file khi người xem chọn một bản.
  useEffect(() => {
    if (!subtitleSearch?.title?.trim() || isEmbed) return;

    let cancelled = false;
    const subtitleObjectUrls: string[] = [];
    const attachedTracks: HTMLTrackElement[] = [];
    const loaded: Array<{ key: string; label: string; track: HTMLTrackElement; cues: SpeechCue[] }> = [];
    speechCuesRef.current = [];
    speechEnabledRef.current = false;
    setVoiceoverEnabled(false);
    setVoiceoverReady(false);
    setVoiceoverStatus("");
    setSubtitleCandidates([]);
    setSubtitleLoading(true);
    setSubtitleError("");
    setSelectedSubtitle("");
    subtitleSelectRef.current = async (candidate: any) => {
      const key = String(candidate?.nId || "") + ":" + String(candidate?.fileNId || candidate?.downloadUrl || "");
      const existing = loaded.find((item) => item.key === key);
      if (existing) {
        loaded.forEach((item) => { item.track.track.mode = item === existing ? "showing" : "disabled"; });
        speechCuesRef.current = existing.cues;
        setVoiceoverReady(existing.cues.length > 0);
        setSelectedSubtitle(existing.label);
        return;
      }

      setSubtitleDownloading(key);
      setSubtitleError("");
      try {
        const response = await fetch("/api/subtitles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nId: candidate.nId, fileNId: candidate.fileNId, downloadUrl: candidate.downloadUrl }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || typeof data?.content !== "string") {
          throw new Error(data?.error || "Không tải được phụ đề này.");
        }
        const format = String(candidate.format || "srt").toLowerCase();
        const normalized = data.content
          .replace(/^\uFEFF/, "")
          .replace(/\r\n?/g, "\n")
          .trim();

        const toVttTimestamp = (value: string) => {
          const match = value.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})$/);
          if (!match) return value.trim();
          const [, hours = "00", minutes = "00", seconds = "00", milliseconds = "000"] = match;
          return `${hours.padStart(2, "0")}:${minutes}:${seconds}.${milliseconds.padEnd(3, "0")}`;
        };

        let vtt = "";
        if (format === "ass" || format === "ssa" || /^\[Script Info\]/im.test(normalized)) {
          const lines = normalized.split("\n");
          let inEvents = false;
          let fields = ["Layer", "Start", "End", "Style", "Name", "MarginL", "MarginR", "MarginV", "Effect", "Text"];
          const cues: string[] = [];
          for (const line of lines) {
            const trimmed = line.trim();
            if (/^\[Events\]$/i.test(trimmed)) {
              inEvents = true;
              continue;
            }
            if (/^\[.+\]$/.test(trimmed)) {
              inEvents = false;
              continue;
            }
            if (!inEvents) continue;
            if (/^Format\s*:/i.test(trimmed)) {
              fields = trimmed.slice(trimmed.indexOf(":") + 1).split(",").map((field: string) => field.trim());
              continue;
            }
            if (!/^Dialogue\s*:/i.test(trimmed)) continue;
            const raw = trimmed.slice(trimmed.indexOf(":") + 1);
            const textIndex = fields.findIndex((field) => field.toLowerCase() === "text");
            const startIndex = fields.findIndex((field) => field.toLowerCase() === "start");
            const endIndex = fields.findIndex((field) => field.toLowerCase() === "end");
            if (textIndex < 0 || startIndex < 0 || endIndex < 0) continue;
            const parts = raw.split(",");
            const values = parts.slice(0, textIndex);
            values.push(parts.slice(textIndex).join(","));
            const start = toVttTimestamp(values[startIndex] || "");
            const end = toVttTimestamp(values[endIndex] || "");
            const caption = (values[textIndex] || "")
              .replace(/\{[^}]*\}/g, "")
              .replace(/\\[Nn]/g, "\n")
              .replace(/\\h/g, " ")
              .replace(/\\\\/g, "\\")
              .trim();
            if (/^\d{2}:\d{2}:\d{2}\.\d{3}$/.test(start) &&
                /^\d{2}:\d{2}:\d{2}\.\d{3}$/.test(end) && caption) {
              cues.push(`${start} --> ${end}\n${caption}`);
            }
          }
          vtt = "WEBVTT\n\n" + cues.join("\n\n");
        } else if (/^WEBVTT(?:\s|$)/i.test(normalized)) {
          vtt = normalized;
        } else {
          const cues = normalized
            .replace(/(\d{1,2}:\d{2}:\d{2}),(\d{1,3})/g, (_match: string, time: string, millis: string) => `${time}.${String(millis).padEnd(3, "0")}`);
          vtt = "WEBVTT\n\n" + cues;
        }
        if (!/^WEBVTT(?:\s|$)/i.test(vtt) || !/-->/.test(vtt)) {
          throw new Error("File phụ đề không có câu thoại hợp lệ hoặc định dạng không được hỗ trợ.");
        }
        const speechCues = parseWebVttSpeechCues(vtt);
        if (!speechCues.length) {
          throw new Error("Không đọc được mốc thời gian và lời thoại trong phụ đề này.");
        }
        const objectUrl = URL.createObjectURL(new Blob([vtt], { type: "text/vtt;charset=utf-8" }));
        subtitleObjectUrls.push(objectUrl);
        const video = artRef.current?.querySelector("video") as HTMLVideoElement | null;
        if (!video) throw new Error("Trình phát chưa sẵn sàng.");
        const track = document.createElement("track");
        track.kind = "subtitles";
        track.label = String(candidate.label || candidate.fileName || "Phụ đề tiếng Việt");
        track.srclang = "vi";
        track.src = objectUrl;
        track.default = true;
        video.appendChild(track);
        attachedTracks.push(track);
        const entry = { key, label: track.label, track, cues: speechCues };
        loaded.push(entry);
        speechCuesRef.current = speechCues;
        setVoiceoverReady(true);
        const activateTrack = () => {
          if (cancelled || !video.isConnected) return;
          loaded.forEach((item) => {
            item.track.track.mode = item === entry ? "showing" : "disabled";
          });
          // Safari/iOS đôi khi chỉ cập nhật cue sau khi track đã tải xong.
          if (entry.track.track.mode !== "showing") entry.track.track.mode = "showing";
        };
        track.addEventListener("load", activateTrack, { once: true });
        track.addEventListener("error", () => {
          if (!cancelled) setSubtitleError("Trình duyệt không đọc được file phụ đề này.");
        }, { once: true });
        activateTrack();
        window.setTimeout(activateTrack, 150);
        setSelectedSubtitle(entry.label);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Không tải được phụ đề.";
        setSubtitleError(message);
      } finally {
        setSubtitleDownloading("");
      }
    };

    const loadSubtitles = async () => {
      try {
        const params = new URLSearchParams({ title: subtitleSearch.title.trim(), language: "vi" });
        if (subtitleSearch.year) params.set("year", String(subtitleSearch.year));
        if (subtitleSearch.tmdbId) params.set("tmdbId", String(subtitleSearch.tmdbId));
        if (subtitleSearch.type) params.set("type", subtitleSearch.type);
        if (subtitleSearch.type === "tv" && Number.isInteger(subtitleSearch.season) && Number(subtitleSearch.season) > 0) params.set("season", String(subtitleSearch.season));
        if (subtitleSearch.type === "tv" && Number.isInteger(subtitleSearch.episode) && Number(subtitleSearch.episode) > 0) params.set("episode", String(subtitleSearch.episode));

        let response = await fetch("/api/subtitles?" + params.toString());
        let data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "Không thể tìm phụ đề SubDL.");
        let candidates = Array.isArray(data?.subtitles) ? data.subtitles : [];
        if (!candidates.length && subtitleSearch.tmdbId) {
          params.delete("tmdbId");
          response = await fetch("/api/subtitles?" + params.toString());
          data = await response.json().catch(() => null);
          if (!response.ok) throw new Error(data?.error || "Không thể tìm phụ đề SubDL.");
          candidates = Array.isArray(data?.subtitles) ? data.subtitles : [];
        }
        if (cancelled) return;
        setSubtitleCandidates(candidates);
        if (!candidates.length) setSubtitleError("SubDL không có phụ đề tiếng Việt phù hợp cho phim/tập này.");
      } catch (error) {
        if (!cancelled) setSubtitleError(error instanceof Error ? error.message : "Không thể kết nối SubDL.");
      } finally {
        if (!cancelled) setSubtitleLoading(false);
      }
    };

    void loadSubtitles();
    return () => {
      cancelled = true;
      subtitleSelectRef.current = () => {};
      attachedTracks.forEach((track) => { if (track.parentNode) track.parentNode.removeChild(track); });
      subtitleObjectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
  }, [url, isEmbed, subtitleSearch?.title, subtitleSearch?.year, subtitleSearch?.tmdbId, subtitleSearch?.type, subtitleSearch?.season, subtitleSearch?.episode]);

  if (isEmbed) {
    return (
      <div
        className="w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl transition-all duration-300 border border-white/5 ring-1 ring-white/10"
        onPointerDownCapture={() => onUserInteraction?.()}
        onFocusCapture={() => onUserInteraction?.()}
      >
        <iframe
          src={url}
          title={title || "Xem phim Player"}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  const formatPlayerTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const total = Math.floor(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    return hours > 0 ? hours + ":" + String(minutes).padStart(2, "0") + ":" + String(secs).padStart(2, "0") : minutes + ":" + String(secs).padStart(2, "0");
  };
  const seekPlayerTo = (value: number) => {
    const art = artPlayerRef.current;
    if (!art || !Number.isFinite(value)) return;
    art.seek = Math.max(0, Math.min(playerDuration || art.duration || value, value));
    setPlayerTime(art.currentTime);
  };
  const togglePlayerPlayback = () => {
    const art = artPlayerRef.current;
    if (!art) return;
    if (art.video.paused) art.play().catch(() => {});
    else art.pause();
  };
  const seekPlayerBy = (delta: number) => {
    const art = artPlayerRef.current;
    if (!art) return;
    const duration = Number.isFinite(art.duration) && art.duration > 0 ? art.duration : Infinity;
    art.seek = Math.max(0, Math.min(duration, art.currentTime + delta));
    art.play().catch(() => {});
    setPlayerTime(art.currentTime);
  };

  return (
    <div className="player-controls-frame relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl transition-all duration-300 border border-white/5 ring-1 ring-white/10">
      <div ref={artRef} className="h-full w-full" />
      <div className={"player-custom-dock absolute inset-x-0 bottom-0 z-[45] px-4 pb-4 pt-16 text-white transition-all duration-200 sm:px-6 " + (showPlayerHeader ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0 pointer-events-none")} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 rounded-[22px] border border-white/20 bg-[#171321]/90 p-3 shadow-2xl backdrop-blur-2xl sm:p-4">
          <div className="flex items-center gap-3">
            <span className="min-w-[42px] text-right text-[11px] font-semibold tabular-nums text-white/85">{formatPlayerTime(playerTime)}</span>
            <input aria-label="Tua video" type="range" min={0} max={Math.max(1, playerDuration)} step={0.1} value={Math.min(playerTime, Math.max(1, playerDuration))} onChange={(event) => seekPlayerTo(Number(event.target.value))} className="player-custom-seek min-w-0 flex-1" />
            <span className="min-w-[42px] text-[11px] font-semibold tabular-nums text-white/55">{formatPlayerTime(playerDuration)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <button type="button" onClick={togglePlayerPlayback} aria-label={playerIsPlaying ? "Tạm dừng" : "Phát"} className="player-dock-main">{playerIsPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</button>
              <button type="button" onClick={() => seekPlayerBy(-30)} aria-label="Lùi 30 giây" className="player-dock-button"><SkipBack size={18} /><span>30</span></button>
              <button type="button" onClick={() => seekPlayerBy(30)} aria-label="Tiến 30 giây" className="player-dock-button"><SkipForward size={18} /><span>30</span></button>
              {showSkipIntro && <button type="button" onClick={() => { const end = introSegmentRef.current.endSeconds; if (typeof end === "number" && Number.isFinite(end)) seekPlayerTo(end); }} className="player-dock-skip">Bỏ qua intro ›</button>}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button type="button" onClick={() => setSubtitlePanelOpen(true)} className="player-dock-button" aria-label="Chọn phụ đề"><Subtitles size={19} /><span className="hidden sm:inline">Phụ đề</span></button>
              {showNextEpisode && <button type="button" onClick={() => onNextEpisodeRef.current?.()} className="player-dock-button" aria-label="Tập tiếp theo"><SkipForward size={18} /><span className="hidden sm:inline">Tập tiếp</span></button>}
              <button type="button" onClick={() => { const art = artPlayerRef.current; if (art) art.fullscreen = !art.fullscreen; }} className="player-dock-button" aria-label="Toàn màn hình"><Maximize2 size={18} /></button>
              <button type="button" onClick={() => { const art = artPlayerRef.current as any; if (art?.setting) art.setting.show = !art.setting.show; }} className="player-dock-button" aria-label="Cài đặt phát"><Settings2 size={18} /></button>
            </div>
          </div>
        </div>
      </div>
      {subtitlePanelOpen && (
        <div className="absolute inset-0 z-[80] flex items-end justify-center bg-black/65 p-3 backdrop-blur-sm sm:items-center sm:p-5" onClick={() => setSubtitlePanelOpen(false)}>
          <section role="dialog" aria-modal="true" aria-label="Chọn phụ đề" className="max-h-[82%] w-full max-w-lg overflow-hidden rounded-3xl border border-white/15 bg-[#111018]/95 text-white shadow-2xl shadow-purple-950/40" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <div className="text-base font-bold">Chọn phụ đề</div>
                <div className="mt-1 text-xs text-white/55">Nguồn SubDL · Tiếng Việt</div>
              </div>
              <button type="button" onClick={() => setSubtitlePanelOpen(false)} aria-label="Đóng bảng phụ đề" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl text-white/80 hover:bg-white/15">×</button>
            </div>
            <div className="max-h-[min(58vh,480px)] overflow-y-auto p-3">
              <button
                type="button"
                disabled={!voiceoverReady}
                onClick={() => {
                  const nextEnabled = !speechEnabledRef.current;
                  speechEnabledRef.current = nextEnabled;
                  setVoiceoverEnabled(nextEnabled);
                  if (!nextEnabled) {
                    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
                    setVoiceoverStatus("Đã tắt thuyết minh");
                    return;
                  }
                  if (!("speechSynthesis" in window)) {
                    speechEnabledRef.current = false;
                    setVoiceoverEnabled(false);
                    setVoiceoverStatus("Trình duyệt không hỗ trợ đọc văn bản");
                    return;
                  }
                  setVoiceoverStatus("Đang thuyết minh bằng giọng có sẵn trên thiết bị");
                  const video = artRef.current?.querySelector("video") as HTMLVideoElement | null;
                  if (video && !video.paused) video.dispatchEvent(new Event("timeupdate"));
                }}
                className="mb-3 flex w-full items-center justify-between rounded-2xl border border-purple-400/40 bg-purple-500/15 px-4 py-3 text-left text-sm transition hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>
                  <span className="block font-semibold">Thuyết minh tiếng Việt</span>
                  <span className="mt-1 block text-xs text-white/55">{voiceoverStatus || (voiceoverReady ? "Đọc lời thoại bằng giọng có sẵn trên thiết bị" : "Chọn một phụ đề tiếng Việt trước")}</span>
                </span>
                <span className="rounded-full bg-purple-400/20 px-3 py-1 text-xs font-bold text-purple-200">{voiceoverEnabled ? "ĐANG BẬT" : "TẮT"}</span>
              </button>
              <button type="button" onClick={() => {
                const video = artRef.current?.querySelector("video") as HTMLVideoElement | null;
                if (video) Array.from(video.querySelectorAll("track")).forEach((track) => { track.track.mode = "disabled"; });
                setSelectedSubtitle("");
                setSubtitlePanelOpen(false);
              }} className="mb-2 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-left text-sm hover:bg-white/10">
                <span><span className="block font-semibold">Tắt phụ đề</span><span className="mt-1 block text-xs text-white/45">Không hiển thị phụ đề</span></span>
                {!selectedSubtitle && <span className="text-purple-300">✓</span>}
              </button>
              {subtitleLoading && <div className="px-4 py-8 text-center text-sm text-white/65">Đang tìm phụ đề trên SubDL…</div>}
              {!subtitleLoading && subtitleCandidates.map((candidate, index) => {
                const key = String(candidate.nId || "") + ":" + String(candidate.fileNId || candidate.downloadUrl || "");
                const label = String(candidate.label || candidate.fileName || "Phụ đề tiếng Việt");
                return (
                  <button key={key || index} type="button" disabled={Boolean(subtitleDownloading)} onClick={async () => {
                    await subtitleSelectRef.current(candidate);
                    if (!subtitleError) setSubtitlePanelOpen(false);
                  }} className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-left transition hover:border-purple-400/60 hover:bg-purple-500/10 disabled:opacity-60">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-[10px] font-black text-purple-200">{String(candidate.format || "SUB").toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{label}</span>
                      <span className="mt-1 block text-xs text-white/45">{candidate.fileName || "Phụ đề tiếng Việt"} · SubDL</span>
                    </span>
                    {subtitleDownloading === key ? <span className="text-xs text-purple-200">Đang tải…</span> : selectedSubtitle === label ? <span className="text-purple-300">✓</span> : <span className="text-white/45">›</span>}
                  </button>
                );
              })}
              {subtitleError && <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{subtitleError}</div>}
              {!subtitleLoading && !subtitleCandidates.length && !subtitleError && <div className="px-4 py-8 text-center text-sm text-white/55">Chưa có phụ đề để hiển thị.</div>}
            </div>
            <div className="border-t border-white/10 px-5 py-3 text-xs text-white/40">Chọn một bản để tải và phát trực tiếp trong player.</div>
          </section>
        </div>
      )}
      <style jsx global>{`
        .player-controls-frame .artplayer-app .art-controls,
        .player-controls-frame .artplayer-app .art-bottom { display:none!important; }
        .player-custom-seek { appearance:none;-webkit-appearance:none;width:100%;height:5px;border-radius:999px;outline:none;background:linear-gradient(90deg,#8b5cf6,#c084fc);cursor:pointer;touch-action:pan-x; }
        .player-custom-seek::-webkit-slider-thumb { appearance:none;-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid #a78bfa;box-shadow:0 0 0 4px rgba(139,92,246,.2); }
        .player-custom-seek::-moz-range-thumb { width:9px;height:9px;border-radius:50%;background:#fff;border:3px solid #a78bfa; }
        .player-dock-main { display:flex;align-items:center;justify-content:center;width:44px;height:44px;flex:0 0 44px;border-radius:15px;background:linear-gradient(135deg,#8b5cf6,#c084fc);color:white;box-shadow:0 6px 22px rgba(139,92,246,.35); }
        .player-dock-button { display:inline-flex;align-items:center;justify-content:center;gap:5px;min-width:42px;height:42px;padding:0 10px;border:1px solid rgba(255,255,255,.16);border-radius:14px;background:rgba(255,255,255,.09);color:white; }
        .player-dock-button > span {font-size:10px;font-weight:800;line-height:1}
        .player-dock-skip {display:inline-flex;align-items:center;min-height:40px;padding:0 12px;border:1px solid rgba(196,181,253,.35);border-radius:13px;background:rgba(139,92,246,.2);color:#ede9fe;font-size:12px;font-weight:750;white-space:nowrap}
        @media(max-width:600px) {
          .player-custom-dock {padding-left:10px!important;padding-right:10px!important;padding-bottom:max(12px,env(safe-area-inset-bottom))!important}
          .player-custom-dock > div {gap:10px!important;padding:10px!important;border-radius:18px!important}
          .player-dock-main {width:40px;height:40px;flex-basis:40px}
          .player-dock-button {min-width:36px;height:38px;padding:0 7px;border-radius:12px}
          .player-dock-skip {min-height:38px;padding:0 8px;font-size:10px}
        }
        .player-controls-frame .artplayer-app { --art-theme: #a78bfa; }
        .player-controls-frame .artplayer-app .art-controls-right .art-control:not(.art-control-next-episode):not(.art-control-subtitle-toggle) { display:none!important; }
        .player-controls-frame .artplayer-app .art-control-subtitle-toggle,
        .player-controls-frame .artplayer-app .art-control-next-episode {
          display:flex!important;align-items:center!important;justify-content:center!important;
          min-height:46px!important;padding:0 15px!important;margin:0 0 0 8px!important;
          border:1px solid rgba(196,181,253,.32)!important;border-radius:15px!important;
          background:linear-gradient(135deg,rgba(124,58,237,.42),rgba(168,85,247,.2))!important;
          color:#fff!important;backdrop-filter:blur(18px)!important;-webkit-backdrop-filter:blur(18px)!important;
        }
        .player-controls-frame .artplayer-app .art-control-next-episode { display:${showNextEpisode ? 'flex' : 'none'}!important; }
        .player-controls-frame .artplayer-app .art-controls {
          left:max(18px,env(safe-area-inset-left,0px) + 16px)!important;
          right:max(18px,env(safe-area-inset-right,0px) + 16px)!important;
          bottom:max(62px,env(safe-area-inset-bottom,0px) + 54px)!important;width:auto!important;
          min-height:66px!important;box-sizing:border-box!important;display:flex!important;
          align-items:center!important;justify-content:space-between!important;gap:14px!important;
          padding:10px 14px!important;border:1px solid rgba(255,255,255,.18)!important;border-radius:22px!important;
          background:linear-gradient(120deg,rgba(17,15,27,.88),rgba(28,22,43,.76))!important;
          box-shadow:0 16px 42px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.14)!important;
          -webkit-backdrop-filter:blur(24px) saturate(165%)!important;backdrop-filter:blur(24px) saturate(165%)!important;
        }
        .player-controls-frame .artplayer-app .art-controls-left,.player-controls-frame .artplayer-app .art-controls-right {
          display:flex!important;align-items:center!important;gap:10px!important;min-width:0!important;
        }
        .player-controls-frame .artplayer-app .art-controls .art-control {
          display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:0 0 auto!important;
          min-width:46px!important;min-height:46px!important;margin:0!important;padding:0 12px!important;
          border:1px solid rgba(255,255,255,.16)!important;border-radius:15px!important;
          background:rgba(255,255,255,.09)!important;color:#fff!important;font-size:13px!important;line-height:1!important;
          transition:transform .16s ease,background .16s ease,border-color .16s ease!important;
        }
        .player-controls-frame .artplayer-app .art-controls .art-control:active {
          transform:scale(.93)!important;background:rgba(139,92,246,.4)!important;border-color:rgba(196,181,253,.7)!important;
        }
        .player-controls-frame .artplayer-app .art-control-seek-back-30,.player-controls-frame .artplayer-app .art-control-seek-forward-30 {
          min-width:58px!important;border-radius:15px!important;background:rgba(139,92,246,.2)!important;
          border-color:rgba(196,181,253,.3)!important;font-weight:800!important;
        }
        .player-controls-frame .artplayer-app .art-control-subtitle-toggle { min-width:54px!important;letter-spacing:.04em!important; }
        .player-controls-frame .artplayer-app .art-bottom {
          left:max(24px,env(safe-area-inset-left,0px) + 20px)!important;
          right:max(24px,env(safe-area-inset-right,0px) + 20px)!important;
          bottom:max(13px,env(safe-area-inset-bottom,0px) + 10px)!important;width:auto!important;
          padding:0 4px!important;box-sizing:border-box!important;transform:none!important;
        }
        .player-controls-frame .artplayer-app .art-progress { height:10px!important;padding-block:6px!important;cursor:pointer!important; }
        .player-controls-frame .artplayer-app .art-progress .art-progress-loaded,.player-controls-frame .artplayer-app .art-progress .art-progress-played { border-radius:999px!important; }
        .player-controls-frame .artplayer-app .art-progress .art-progress-played { background:linear-gradient(90deg,#8b5cf6,#c084fc,#e879f9)!important; }
        .player-controls-frame .artplayer-app .art-state { filter:drop-shadow(0 8px 24px rgba(0,0,0,.55)); }
        .player-controls-frame .artplayer-app .art-state .art-icon {
          width:76px!important;height:76px!important;border:1px solid rgba(255,255,255,.28)!important;border-radius:50%!important;
          background:rgba(30,20,48,.62)!important;-webkit-backdrop-filter:blur(18px)!important;backdrop-filter:blur(18px)!important;
        }
        @media(max-width:600px) {
          .player-controls-frame .artplayer-app .art-controls {
            left:max(12px,env(safe-area-inset-left,0px) + 10px)!important;right:max(12px,env(safe-area-inset-right,0px) + 10px)!important;
            bottom:max(58px,env(safe-area-inset-bottom,0px) + 50px)!important;min-height:58px!important;gap:6px!important;
            padding:7px 8px!important;border-radius:18px!important;
          }
          .player-controls-frame .artplayer-app .art-controls-left,.player-controls-frame .artplayer-app .art-controls-right { gap:6px!important; }
          .player-controls-frame .artplayer-app .art-controls .art-control { min-width:40px!important;min-height:42px!important;padding:0 8px!important;border-radius:13px!important; }
          .player-controls-frame .artplayer-app .art-control-seek-back-30,.player-controls-frame .artplayer-app .art-control-seek-forward-30 { min-width:46px!important; }
          .player-controls-frame .artplayer-app .art-control-subtitle-toggle,.player-controls-frame .artplayer-app .art-control-next-episode { min-height:42px!important;padding-inline:10px!important;margin-left:4px!important; }
          .player-controls-frame .artplayer-app .art-bottom { left:max(18px,env(safe-area-inset-left,0px) + 14px)!important;right:max(18px,env(safe-area-inset-right,0px) + 14px)!important; }
          .player-controls-frame .artplayer-app .art-state .art-icon { width:64px!important;height:64px!important; }
        }
        /* Keep Artplayer's actual controls horizontal; do not rely on child defaults. */
        .player-controls-frame .artplayer-app .art-controls { flex-direction:row!important; }
        .player-controls-frame .artplayer-app .art-controls-left,
        .player-controls-frame .artplayer-app .art-controls-right {
          position:static!important;inset:auto!important;float:none!important;
          flex-direction:row!important;flex-wrap:nowrap!important;align-items:center!important;
        }
        .player-controls-frame .artplayer-app .art-controls .art-control {
          position:relative!important;inset:auto!important;float:none!important;
        }
        @media(max-width:380px) {
          .player-controls-frame .artplayer-app .art-controls { left:8px!important;right:8px!important;padding-inline:6px!important; }
          .player-controls-frame .artplayer-app .art-controls .art-control { min-width:36px!important;padding-inline:5px!important; }
          .player-controls-frame .artplayer-app .art-control-seek-back-30,.player-controls-frame .artplayer-app .art-control-seek-forward-30 { min-width:42px!important; }
        }
        /* Final override: hide Artplayer's legacy control layer regardless of its internal root class. */
        .player-controls-frame .art-controls,
        .player-controls-frame .art-bottom,
        .player-controls-frame .art-progress {
          display:none!important;
          visibility:hidden!important;
          opacity:0!important;
          pointer-events:none!important;
        }
        .player-controls-frame .art-control,
        .player-controls-frame .art-control-volume,
        .player-controls-frame .art-control-fullscreen,
        .player-controls-frame .art-control-setting {
          display:none!important;
          visibility:hidden!important;
          pointer-events:none!important;
        }
`}</style>
      <div className={`pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 bg-gradient-to-b from-black/85 via-black/45 to-transparent px-3 pb-7 pt-3 text-white transition-all duration-200 sm:px-5 sm:pt-4 ${showPlayerHeader ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"}`} style={{ pointerEvents: showPlayerHeader ? "auto" : "none" }}>
        <button
          type="button"
          onClick={() => onBackRef.current?.()}
          aria-label="Quay về trang phim"
          title="Quay về trang phim"
          className="pointer-events-auto flex min-w-0 max-w-[calc(100%-56px)] items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-2 text-left text-sm font-semibold text-white shadow-lg backdrop-blur-md transition hover:bg-black/55 active:scale-95"
        >
          <ArrowLeft className="h-5 w-5 shrink-0" />
          <span className="truncate">{safeBackLabel}</span>
        </button>
        <button
          type="button"
          onClick={() => onRotateRef.current?.()}
          aria-label="Xoay ngang hoặc dọc"
          title="Xoay ngang / dọc"
          className="pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white shadow-lg backdrop-blur-md transition hover:bg-black/55 active:scale-95"
        >
          <RotateCw className="h-5 w-5" />
        </button>
      </div>
      {showDebug && (
      <div className="absolute left-2 top-2 z-40 max-w-[min(92%,420px)] rounded-lg border border-cyan-300/40 bg-black/90 p-2.5 text-[10px] leading-relaxed text-white shadow-xl sm:left-3 sm:top-3 sm:text-xs">
        <div className="mb-1 flex items-center justify-between gap-3">
          <strong className="text-cyan-300">DEBUG SKIP INTRO</strong>
          <span className="text-white/60">{isEmbed ? "EMBED" : isHlsStream ? "HLS" : "VIDEO"}</span>
        </div>
        <div>API intro: <b>{typeof introStartSeconds === "number" && typeof introEndSeconds === "number" ? "ĐÃ NHẬN" : "CHƯA NHẬN"}</b></div>
        <div className="break-words text-cyan-100">Nguồn: {introDebugStatus}</div>
        <div>Mốc: {typeof introStartSeconds === "number" ? introStartSeconds.toFixed(2) : "null"}s → {typeof introEndSeconds === "number" ? introEndSeconds.toFixed(2) : "null"}s</div>
        <div>Thời gian video: {debugCurrentTime === null ? "chưa có timeupdate" : `${debugCurrentTime.toFixed(2)}s`}</div>
        <div>Trạng thái: {debugVideoState}</div>
        <div>Trong đoạn intro: <b>{showSkipIntro ? "CÓ" : "KHÔNG"}</b></div>
        <div>Nút cần hiện: <b className={showSkipIntro ? "text-green-300" : "text-amber-300"}>{showSkipIntro ? "CÓ" : "KHÔNG"}</b></div>
      </div>
      )}

    </div>
  );
};
