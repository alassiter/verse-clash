"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { getMutedServerSnapshot, getMutedSnapshot, setMuted, subscribeMuted } from "@/lib/sound-mute";

const VOLUME = 0.15;

export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const muted = useSyncExternalStore(subscribeMuted, getMutedSnapshot, getMutedServerSnapshot);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = VOLUME;

    if (muted) {
      audio.pause();
      return;
    }

    void audio.play().catch(() => {
      const resume = () => {
        void audio.play();
      };
      window.addEventListener("pointerdown", resume, { once: true });
      window.addEventListener("keydown", resume, { once: true });
      return () => {
        window.removeEventListener("pointerdown", resume);
        window.removeEventListener("keydown", resume);
      };
    });
  }, [muted]);

  return (
    <>
      <audio ref={audioRef} src="/audio/theme.mp3" loop preload="auto" />
      <button
        type="button"
        aria-label={muted ? "Unmute music" : "Mute music"}
        aria-pressed={!muted}
        onClick={() => setMuted(!muted)}
        className="comic-panel fixed bottom-4 right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-comic-cream text-xl"
      >
        {muted ? "🔇" : "🔊"}
      </button>
    </>
  );
}
