"use client";

import { useEffect, useState } from "react";
import { Heart, Bell, Plus, Send } from "lucide-react";
import { memberClient, type MoviePayload } from "@/lib/member-client";
import { useMember } from "./member-provider";

export function MemberMovieActions({ movie, variant = "default" }: { movie: MoviePayload; variant?: "default" | "mobile" }) {
  const { openLibrary, openAuth } = useMember();
  const [favorited, setFavorited] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    memberClient.favorites()
      .then(({ items }) => {
        if (active) setFavorited(items.some((item) => item.movieSlug === movie.movieSlug));
      })
      .catch((error) => console.error("[Member] Could not load favorite state", error));
    return () => { active = false; };
  }, [movie.movieSlug]);

  const toggleFavorite = async () => {
    setPending(true);
    try {
      const result = await memberClient.toggleFavorite(movie);
      setFavorited(result.favorited);
    } finally {
      setPending(false);
    }
  };

  const saveToLibrary = async () => {
    setPending(true);
    try {
      await memberClient.saveFavorite(movie);
      setFavorited(true);
      openLibrary("favorites");
    } finally {
      setPending(false);
    }
  };

  const shareMovie = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: movie.movieTitle,
          url: window.location.href,
        });
        return;
      }
      await navigator.clipboard?.writeText(window.location.href);
    } catch {
      // user cancelled share
    }
  };

  const mobile = variant === "mobile";
  const actionClass = mobile
    ? "flex min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] py-3 text-white/70 transition-colors active:bg-white/10"
    : "flex flex-col items-center gap-0.5 text-white/60 transition-colors hover:text-white";

  return (
    <div className={mobile ? "grid w-full grid-cols-4 gap-2 rounded-[26px] border border-white/10 bg-white/[0.035] p-2" : "flex items-center gap-4 sm:gap-5"}>
      <button
        onClick={toggleFavorite}
        disabled={pending}
        className={`${actionClass} ${
          favorited ? "text-[#ffd875]" : "text-white/60 hover:text-white"
        }`}
      >
        <Heart size={mobile ? 20 : 18} className={favorited ? "fill-[#ffd875]" : ""} />
        <span className={mobile ? "text-[10px] font-medium" : "text-[10px]"}>Yêu thích</span>
      </button>

      <button
        onClick={() => openAuth("login")}
        className={actionClass}
      >
        <Bell size={mobile ? 20 : 18} />
        <span className={mobile ? "text-[10px] font-medium" : "text-[10px]"}>Theo dõi</span>
      </button>

      <button
        onClick={saveToLibrary}
        disabled={pending}
        className={actionClass}
      >
        <Plus size={mobile ? 20 : 18} />
        <span className={mobile ? "text-[10px] font-medium" : "text-[10px]"}>Thêm vào</span>
      </button>

      <button
        onClick={shareMovie}
        className={actionClass}
      >
        <Send size={mobile ? 20 : 18} />
        <span className={mobile ? "text-[10px] font-medium" : "text-[10px]"}>Chia sẻ</span>
      </button>
    </div>
  );
}

export function SaveToLibraryButton({ movie }: { movie: MoviePayload }) {
  const { openLibrary } = useMember();
  const [pending, setPending] = useState(false);

  const saveToLibrary = async () => {
    setPending(true);
    try {
      await memberClient.saveFavorite(movie);
      openLibrary("favorites");
    } catch (error) {
      console.error("[Member] Could not save movie to library", error);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={saveToLibrary}
      disabled={pending}
      className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 text-[13px] font-semibold text-white backdrop-blur-xl transition active:scale-[.98] disabled:opacity-60 sm:px-4 sm:text-[14px]"
    >
      <Plus size={18} />
      {pending ? "Đang lưu..." : "Lưu vào tủ phim"}
    </button>
  );
}
