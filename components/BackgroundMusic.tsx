"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

const VOLUME = 0.15;
const MUTE_STORAGE_KEY = "verse-clash-music-muted";

let listeners: Array<() => void> = [];

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot() {
  return window.localStorage.getItem(MUTE_STORAGE_KEY) === "true";
}

function getServerSnapshot() {
  return true;
}

function setMuted(next: boolean) {
  window.localStorage.setItem(MUTE_STORAGE_KEY, String(next));
  listeners.forEach((listener) => listener());
}

export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const muted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

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
