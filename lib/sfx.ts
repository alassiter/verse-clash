"use client";

import { getMutedSnapshot } from "@/lib/sound-mute";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    audioCtx = new Ctor();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

function tone(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  volume: number,
  type: OscillatorType = "sine",
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const startTime = ctx.currentTime + startOffset;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

export function playTick() {
  if (getMutedSnapshot()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  tone(ctx, 1500, 0, 0.08, 0.2, "square");
}

export function playTimesUp() {
  if (getMutedSnapshot()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  [0, 0.18, 0.36, 0.54].forEach((offset, i) => {
    tone(ctx, i % 2 === 0 ? 900 : 700, offset, 0.16, 0.25, "triangle");
  });
}

export function playClick() {
  if (getMutedSnapshot()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  tone(ctx, 600, 0, 0.05, 0.15, "square");
}
