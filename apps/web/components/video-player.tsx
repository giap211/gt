
"use client";

import { useEffect, useRef, useState } from "react";
import Artplayer from "artplayer";
import { Play } from "lucide-react";
import Hls from "hls.js";

// Tắt double-click fullscreen / play mặc định
Artplayer.DBCLICK_FULLSCREEN = false;
Artplayer.MOBILE_DBCLICK_PLAY = false;

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
}: VideoPlayerProps) => {
  const artRef = useRef<HTMLDivElement>(null);
  const rotatedRef = useRef(rotated);
  rotatedRef.current = rotated;
  const onBackRef = useRef(onBack);
  const onRotateRef = useRef(onRotate);
  onBackRef.current = onBack;
  onRotateRef.current = onRotate;
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

  const [showResumeChoice, setShowResumeChoice] = useState(startAtSeconds > 0 && !isEmbed);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
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
    setShowResumeChoice(startAtSeconds > 0 && !isEmbed);
  }, [startAtSeconds, isEmbed]);

  const startPlayback = (resume: boolean) => {
    const video = artRef.current?.querySelector("video");
    if (!video) return;
    const play = () => {
      if (resume && Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = Math.min(startAtSeconds, Math.max(0, video.duration - 2));
      } else if (!resume) {
        video.currentTime = 0;
      }
      video.play().catch(() => {});
    };
    if (video.readyState < 1) {
      video.addEventListener("loadedmetadata", play, { once: true });
    } else {
      play();
    }
    setShowResumeChoice(false);
  };

  useEffect(() => {
    if (!artRef.current || isEmbed) return;

    let hlsInstance: Hls | null = null;
    let knownDurationSeconds = 0;
    let skipIntroControlVisible = false;
    let art: Artplayer | null = null;
    let resumeObserver: MutationObserver | null = null;
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
        autoplay: startAtSeconds <= 0,
        pip: true,
        autoSize: false,
        autoMini: false,
        screenshot: true,
        setting: true,
        controls: [
          {
            name: "back-to-movie", position: "left", index: 0,
            html: '<span style="display:inline-flex;align-items:center;gap:6px;max-width:min(42vw,280px);font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span style="font-size:22px;line-height:1">‹</span><span style="overflow:hidden;text-overflow:ellipsis">' + safeBackLabel + '</span></span>',
            tooltip: "Quay về trang phim",
            click: () => onBackRef.current?.(),
          },
          {
            name: "rotate-player", position: "right", index: 30,
            html: '<span style="font-size:19px;font-weight:700;white-space:nowrap">↻</span>',
            tooltip: "Xoay ngang / dọc",
            click: () => onRotateRef.current?.(),
          },
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
        autoPlayback: startAtSeconds <= 0,
        airplay: true,
        theme: "#ffd875",
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

      if (art) {
        const player = art.template.$player as HTMLElement;
        const centerPlay = art.template.$state as HTMLElement;

        const configureResumeChoice = () => {
          const panel = player.querySelector(".art-layer-auto-playback") as HTMLElement | null;
          if (!panel) return;

          const lastSeen = panel.querySelector(".art-auto-playback-last") as HTMLElement | null;
          const jumpButton = panel.querySelector(".art-auto-playback-jump") as HTMLElement | null;
          const closeButton = panel.querySelector(".art-auto-playback-close") as HTMLElement | null;
          if (!jumpButton) return;

          if (lastSeen) lastSeen.style.display = "none";
          if (closeButton) closeButton.style.display = "none";

          let startButton = panel.querySelector(".art-auto-playback-start") as HTMLButtonElement | null;
          if (!startButton) {
            startButton = document.createElement("button");
            startButton.type = "button";
            startButton.className = "art-auto-playback-start";
            startButton.textContent = "Phát từ đầu";
            startButton.addEventListener("click", (event) => {
              event.stopPropagation();
              if (!art) return;
              art.seek = 0;
              art.play().catch(() => {});
              (art.template.$poster as HTMLElement).style.display = "none";
              panel.style.display = "none";
            });
            panel.insertBefore(startButton, jumpButton);
          }

          Object.assign(panel.style, {
            left: "50%",
            right: "auto",
            top: "50%",
            bottom: "auto",
            transform: "translate(-50%, -50%)",
            display: getComputedStyle(panel).display === "none" ? "none" : "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            flexWrap: "nowrap",
            gap: "10px",
            width: "max-content",
            maxWidth: "calc(100% - 20px)",
            padding: "0",
            border: "0",
            background: "transparent",
            zIndex: "30",
          });

          for (const button of [startButton, jumpButton]) {
            Object.assign(button.style, {
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              whiteSpace: "nowrap",
              minHeight: "42px",
              padding: "0 16px",
              borderRadius: "9999px",
              fontSize: "14px",
              fontWeight: "700",
              lineHeight: "1",
              cursor: "pointer",
              border: "1px solid rgba(255,255,255,.24)",
            });
          }
          Object.assign(startButton.style, {
            color: "#fff",
            background: "rgba(255,255,255,.16)",
          });
          jumpButton.textContent = "Tiếp tục xem";
          Object.assign(jumpButton.style, {
            color: "#111",
            background: "#ffd875",
            borderColor: "#ffd875",
          });

          const syncCenterPlay = () => {
            const activePanel = player.querySelector(".art-layer-auto-playback") as HTMLElement | null;
            const visible = !!activePanel && getComputedStyle(activePanel).display !== "none";
            if (visible) {
              // Remove Artplayer's original circular play overlay while the
              // start/resume choices are being shown.
              centerPlay.style.setProperty("display", "none", "important");
              centerPlay.style.setProperty("visibility", "hidden", "important");
              centerPlay.style.setProperty("pointer-events", "none", "important");
            } else {
              centerPlay.style.removeProperty("display");
              centerPlay.style.removeProperty("visibility");
              centerPlay.style.removeProperty("pointer-events");
            }
          };
          syncCenterPlay();
          resumeObserver?.disconnect();
          resumeObserver = new MutationObserver(() => {
            const activePanel = player.querySelector(".art-layer-auto-playback");
            if (activePanel && !activePanel.querySelector(".art-auto-playback-start")) {
              configureResumeChoice();
            }
            syncCenterPlay();
          });
          resumeObserver.observe(player, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["style", "class"],
          });
        };

        art.on("ready", configureResumeChoice);
        art.on("restart", configureResumeChoice);
      }

      if (art) {
        const video = art.video as HTMLVideoElement;
        const reportProgress = () => {
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
              showResumeChoice,
              buttonShouldRender: inIntroRange && !showResumeChoice,
            });
          }
          setShowSkipIntro(inIntroRange);
          if (art && inIntroRange && !skipIntroControlVisible) {
            art.controls.add({
              name: "skip-intro",
              position: "right",
              index: 20,
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
        video.addEventListener("timeupdate", reportProgress);
        video.addEventListener("pause", reportFinalProgress);
        video.addEventListener("ended", reportFinalProgress);

        const previousCleanup = (art as any).__seekCleanup as (() => void) | undefined;
        (art as any).__seekCleanup = () => {
          video.removeEventListener("timeupdate", reportProgress);
          video.removeEventListener("pause", reportFinalProgress);
          video.removeEventListener("ended", reportFinalProgress);
          previousCleanup?.();
        };
      }

      if (onReady && art) {
        onReady(art);
      }

      // Double tap: trái -30 giây, phải +30 giây
      if (art) {
        const container = art.template.$player as HTMLElement;
        // Gọi lại thanh tiêu đề ngay khi người dùng chạm player.
        const onPlayerPointerDown = () => onUserInteraction?.();
        container.addEventListener("pointerdown", onPlayerPointerDown, { passive: true });

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

        // Chặn gesture tua mặc định của Artplayer trên vùng hình video.
        // Chỉ vùng progress bar được phép nhận thao tác kéo để seek.
        const isProgressTarget = (target: EventTarget | null) =>
          target instanceof Element &&
          !!target.closest(".art-progress, .art-progress-played, .art-progress-loaded");

        const blockVideoSwipePointerMove = (event: PointerEvent) => {
          if (progressDragging || isProgressTarget(event.target)) return;

          // Vẫn ghi nhận ngưỡng di chuyển để không biến thao tác vuốt thành double-tap.
          if (event.pointerId === tapPointerId && !tapMoved &&
              Math.hypot(event.clientX - tapStartX, event.clientY - tapStartY) > 12) {
            tapMoved = true;
            lastTap = 0;
            lastSide = null;
          }

          event.stopImmediatePropagation();
        };

        const blockVideoSwipeTouchMove = (event: TouchEvent) => {
          if (progressDragging || isProgressTarget(event.target)) return;
          event.preventDefault();
          event.stopImmediatePropagation();
        };

        container.addEventListener("pointermove", blockVideoSwipePointerMove, true);
        container.addEventListener("touchmove", blockVideoSwipeTouchMove, {
          capture: true,
          passive: false,
        });

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
          container.removeEventListener("pointerdown", onPlayerPointerDown);
          container.removeEventListener("pointerdown", onProgressPointerDown, true);
          container.removeEventListener("pointermove", blockVideoSwipePointerMove, true);
          container.removeEventListener("touchmove", blockVideoSwipeTouchMove, true);
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
      resumeObserver?.disconnect();

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
  }, [url, poster, title, onReady, isEmbed, startAtSeconds, onProgress, onUserInteraction]);

  if (isEmbed) {
    return (
      <div
        className="w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl transition-all duration-300 border border-white/5 ring-1 ring-white/10"
        onPointerDownCapture={() => onUserInteraction?.()}
        onFocusCapture={() => onUserInteraction?.()}
      >
        <iframe
          src={url}
          title={title || "Phim Lậu Player"}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className={`relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl transition-all duration-300 border border-white/5 ring-1 ring-white/10 ${showResumeChoice ? "[&_.art-state]:!hidden [&_.art-controls]:!hidden [&_.art-bottom]:!hidden" : ""}`}>
      <div ref={artRef} className="h-full w-full" />
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
        <div>Resume overlay: <b>{showResumeChoice ? "ĐANG HIỆN" : "TẮT"}</b></div>
        <div>Nút cần hiện: <b className={showSkipIntro && !showResumeChoice ? "text-green-300" : "text-amber-300"}>{showSkipIntro && !showResumeChoice ? "CÓ" : "KHÔNG"}</b></div>
      </div>
      )}

    </div>
  );
};
