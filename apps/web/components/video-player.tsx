
"use client";

import { useEffect, useRef } from "react";
import Artplayer from "artplayer";
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
  onProgress?: (seconds: number) => void;
}

export const VideoPlayer = ({
  url,
  poster,
  title,
  onReady,
  startAtSeconds = 0,
  onProgress,
}: VideoPlayerProps) => {
  const artRef = useRef<HTMLDivElement>(null);

  const isEmbed =
    typeof url === "string" &&
    (url.includes("/player/?url=") ||
      url.includes("/embed/") ||
      url.includes("youtube.com") ||
      url.includes("streamvsmov.com") ||
      url.includes("vsmov.com/video") ||
      url.includes("/video/") ||
      url.includes("embed"));

  useEffect(() => {
    if (!artRef.current || isEmbed) return;

    let hlsInstance: Hls | null = null;
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
        loop: false,
        flip: true,
        playbackRate: true,
        aspectRatio: true,
        fullscreen: true,
        fullscreenWeb: true,
        subtitleOffset: true,
        miniProgressBar: true,
        mutex: true,
        backdrop: true,
        playsInline: true,
        autoPlayback: true,
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
                video.play().catch(() => {});
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
        const video = art.video as HTMLVideoElement;
        const restorePosition = () => {
          if (startAtSeconds > 0 && Number.isFinite(video.duration)) {
            video.currentTime = Math.min(startAtSeconds, Math.max(0, video.duration - 2));
          }
        };
        const reportProgress = () => {
          if (!video.paused && Number.isFinite(video.currentTime)) onProgress?.(video.currentTime);
        };
        video.addEventListener("loadedmetadata", restorePosition, { once: true });
        if (video.readyState >= 1) restorePosition();
        video.addEventListener("timeupdate", reportProgress);
        const previousCleanup = (art as any).__seekCleanup as (() => void) | undefined;
        (art as any).__seekCleanup = () => {
          video.removeEventListener("loadedmetadata", restorePosition);
          video.removeEventListener("timeupdate", reportProgress);
          previousCleanup?.();
        };
      }

      if (onReady && art) {
        onReady(art);
      }

      // Double tap: trái -30 giây, phải +30 giây
      if (art) {
        const container = art.template.$player as HTMLElement;

        let lastTap = 0;
        let lastSide: "left" | "right" | null = null;

        const skipBy = (seconds: number) => {
          const video = art!.video as
            | HTMLVideoElement
            | undefined;

          if (!video || !Number.isFinite(video.duration)) {
            return;
          }

          const next = Math.max(
            0,
            Math.min(
              video.duration,
              video.currentTime + seconds,
            ),
          );

          video.currentTime = next;

          try {
            const hls = (art as any).hls as Hls | undefined;
            hls?.startLoad(next);
          } catch {
            // ignore
          }

          art!.notice.show =
            seconds < 0 ? "⏪  -30s" : "+30s  ⏩";

          video.play().catch(() => {});
        };

        // Chỉ sử dụng pointerup, không dùng click + touchend cùng lúc
        const onPointerUp = (e: PointerEvent) => {
          const target = e.target as HTMLElement | null;

          // Không xử lý khi nhấn vào các nút điều khiển
          if (
            target?.closest(
              ".art-controls, .art-bottom, .art-settings, .art-mask, .art-control, .art-progress, button, input",
            )
          ) {
            return;
          }

          const rect = container.getBoundingClientRect();
          const x = e.clientX - rect.left;

          const side: "left" | "right" =
            x < rect.width / 2 ? "left" : "right";

          const now = Date.now();

          // Hai lần nhấn cùng một bên trong 320ms mới tua
          if (
            now - lastTap < 320 &&
            lastSide === side
          ) {
            skipBy(side === "left" ? -30 : 30);

            lastTap = 0;
            lastSide = null;
          } else {
            lastTap = now;
            lastSide = side;
          }
        };

        container.addEventListener(
          "pointerup",
          onPointerUp,
        );

        const prevCleanup = (art as any).__seekCleanup as
          | (() => void)
          | undefined;

        (art as any).__seekCleanup = () => {
          container.removeEventListener(
            "pointerup",
            onPointerUp,
          );

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
  }, [url, poster, title, onReady, isEmbed, startAtSeconds, onProgress]);

  if (isEmbed) {
    return (
      <div className="w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl transition-all duration-300 border border-white/5 ring-1 ring-white/10">
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
    <div
      ref={artRef}
      className="w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl transition-all duration-300 border border-white/5 ring-1 ring-white/10"
    />
  );
};
