"use client";

const MUTE_STORAGE_KEY = "verse-clash-music-muted";

let listeners: Array<() => void> = [];

export function subscribeMuted(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function getMutedSnapshot() {
  return window.localStorage.getItem(MUTE_STORAGE_KEY) === "true";
}

export function getMutedServerSnapshot() {
  return true;
}

export function setMuted(next: boolean) {
  window.localStorage.setItem(MUTE_STORAGE_KEY, String(next));
  listeners.forEach((listener) => listener());
}
