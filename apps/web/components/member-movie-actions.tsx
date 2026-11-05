"use client";

import { useState } from "react";
import { Heart, Bell, Plus, Send } from "lucide-react";
import { memberClient, type MoviePayload } from "@/lib/member-client";
import { useMember } from "./member-provider";

export function MemberMovieActions({ movie }: { movie: MoviePayload }) {
  const { user, openAuth, openLibrary } = useMember();
  const [favorited, setFavorited] = useState(false);
  const [pending, setPending] = useState(false);

  const requireMember = () => {
    if (!user) {
      openAuth("login");
      return false;
    }
    return true;
  };

  const toggleFavorite = async () => {
    if (!requireMember()) return;
    setPending(true);
    try {
      const result = await memberClient.toggleFavorite(movie);
      setFavorited(result.favorited);
    } finally {
      setPending(false);
    }
  };

  const saveToLibrary = async () => {
    if (!requireMember()) return;
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

  return (
    <div className="flex items-center gap-4 sm:gap-5">
      <button
        onClick={toggleFavorite}
        disabled={pending}
        className={`flex flex-col items-center gap-0.5 transition-colors ${
          favorited ? "text-[#ffd875]" : "text-white/60 hover:text-white"
        }`}
      >
        <Heart size={18} className={favorited ? "fill-[#ffd875]" : ""} />
        <span className="text-[10px]">Yêu thích</span>
      </button>

      <button
        onClick={() => requireMember()}
        className="flex flex-col items-center gap-0.5 text-white/60 hover:text-white transition-colors"
      >
        <Bell size={18} />
        <span className="text-[10px]">Theo dõi</span>
      </button>

      <button
        onClick={saveToLibrary}
        disabled={pending}
        className="flex flex-col items-center gap-0.5 text-white/60 hover:text-white transition-colors"
      >
        <Plus size={18} />
        <span className="text-[10px]">Thêm vào</span>
      </button>

      <button
        onClick={shareMovie}
        className="flex flex-col items-center gap-0.5 text-white/60 hover:text-white transition-colors"
      >
        <Send size={18} />
        <span className="text-[10px]">Chia sẻ</span>
      </button>
    </div>
  );
}
