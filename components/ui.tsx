import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";

export function PhaseBanner(props: {
  phaseName: string;
  instruction: string;
  teamName?: string | null;
  paused?: boolean;
  children?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 border-b-4 border-comic-ink bg-comic-cream/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/verse-clash-logo-compact.png"
            alt="Verse Clash"
            width={44}
            height={44}
            className="shrink-0"
          />
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-comic-red">
              {props.paused ? "Paused · " : ""}
              {props.phaseName}
            </p>
            <p className="text-2xl font-semibold text-stone-900 sm:text-3xl">
              {props.instruction}
            </p>
          </div>
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
    </header>
  );
}

export function BigButton(
  props: ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: "primary" | "secondary" | "ghost" | "danger";
  },
) {
  const { tone = "primary", className = "", ...rest } = props;
  const tones = {
    primary: "bg-comic-red text-white hover:brightness-110",
    secondary: "bg-comic-blue text-white hover:brightness-110",
    ghost: "bg-comic-cream text-stone-900 hover:brightness-95",
    danger: "bg-comic-ink text-white hover:brightness-125",
  };
  return (
    <button
      className={`comic-press rounded-2xl px-6 py-4 font-comic text-xl uppercase tracking-wide disabled:opacity-50 disabled:active:translate-x-0 disabled:active:translate-y-0 ${tones[tone]} ${className}`}
      {...rest}
    />
  );
}

export function Panel(props: {
  children: ReactNode;
  className?: string;
  tone?: "red" | "blue" | "cream";
  title?: string;
}) {
  const tone = props.tone ?? "cream";
  const headerTones = {
    red: "bg-comic-red text-white",
    blue: "bg-comic-blue text-white",
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
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);
  if (!props.endsAt || !now) return <span className="font-mono text-xl">—</span>;
  const remaining = props.paused
    ? "paused"
    : Math.max(0, Math.ceil((props.endsAt - now) / 1000));
  return (
    <span className="font-mono text-2xl font-bold tabular-nums">
      {typeof remaining === "number" ? `${remaining}s` : remaining}
    </span>
  );
}
