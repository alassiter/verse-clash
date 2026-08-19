import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { playClick, playTick, playTimesUp } from "@/lib/sfx";

export function PhaseBanner(props: {
  phaseName: string;
  instruction: string;
  teamName?: string | null;
  paused?: boolean;
  children?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 bg-comic-cream/95 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 pb-4 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pl-28 sm:pl-36">
          <div>
            <p className="font-script text-3xl leading-none text-comic-red sm:text-4xl">
              {props.paused ? "Paused · " : ""}
              {props.phaseName}
            </p>
            <p className="mt-1 text-2xl font-semibold text-stone-900 sm:text-3xl">
              {props.instruction}
            </p>
          </div>
          <div className="flex items-center gap-4 text-lg">
            {props.teamName ? (
              <span className="rounded-full border-2 border-comic-ink bg-comic-ink px-4 py-1 font-medium text-comic-cream">
                Team {props.teamName}
              </span>
            ) : null}
            {props.children}
          </div>
        </div>
      </div>
      <Image
        src="/brand/verse-clash-logo-compact.png"
        alt="Verse Clash"
        width={112}
        height={112}
        className="absolute -top-1 left-2 z-20 h-24 w-24 -rotate-6 drop-shadow-lg sm:h-28 sm:w-28"
      />
      <div className="border-b-4 border-comic-ink" />
      <div className="h-3 bg-comic-blue" />
    </header>
  );
}

export function BigButton(
  props: ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: "primary" | "secondary" | "ghost" | "danger";
  },
) {
  const { tone = "primary", className = "", onClick, ...rest } = props;
  const tones = {
    primary: "bg-comic-red text-white hover:brightness-110",
    secondary: "bg-comic-blue text-white hover:brightness-110",
    ghost: "bg-comic-cream text-stone-900 hover:brightness-95",
    danger: "bg-comic-ink text-white hover:brightness-125",
  };
  return (
    <button
      className={`comic-press rounded-2xl px-6 py-4 font-comic text-xl uppercase tracking-wide disabled:opacity-50 disabled:active:translate-x-0 disabled:active:translate-y-0 ${tones[tone]} ${className}`}
      onClick={(event) => {
        playClick();
        onClick?.(event);
      }}
      {...rest}
    />
  );
}

export function Panel(props: {
  children: ReactNode;
  className?: string;
  tone?: "red" | "blue" | "green" | "cream";
  title?: string;
}) {
  const tone = props.tone ?? "cream";
  const headerTones = {
    red: "bg-comic-red text-white",
    blue: "bg-comic-blue text-white",
    green: "bg-comic-green text-white",
    cream: "",
  };
  return (
    <section
      className={`overflow-hidden rounded-3xl bg-comic-cream ${props.className ?? ""}`}
    >
      {tone !== "cream" && props.title ? (
        <div className={`px-6 py-3 ${headerTones[tone]}`}>
          <h2 className="font-comic text-2xl uppercase tracking-wide">{props.title}</h2>
        </div>
      ) : null}
      <div className="p-6">{props.children}</div>
    </section>
  );
}

export function Countdown(props: { endsAt?: number; paused?: boolean }) {
  const [now, setNow] = useState(0);
  const lastSecondRef = useRef<number | null>(null);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const remaining =
    props.paused || !props.endsAt || !now
      ? undefined
      : Math.max(0, Math.ceil((props.endsAt - now) / 1000));

  useEffect(() => {
    if (remaining === undefined) return;
    const previous = lastSecondRef.current;
    if (remaining === previous) return;
    lastSecondRef.current = remaining;
    if (previous === null) return;
    if (remaining === 0) {
      playTimesUp();
    } else if (remaining < 10) {
      playTick();
    }
  }, [remaining]);

  if (!props.endsAt || !now) return <span className="font-mono text-xl">—</span>;
  const display = props.paused ? "paused" : remaining;
  return (
    <span className="font-mono text-2xl font-bold tabular-nums">
      {typeof display === "number" ? `${display}s` : display}
    </span>
  );
}
