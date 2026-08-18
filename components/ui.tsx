import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useEffect, useState } from "react";

export function PhaseBanner(props: {
  phaseName: string;
  instruction: string;
  teamName?: string | null;
  paused?: boolean;
  children?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-stone-300 bg-orange-50/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-700">
            {props.paused ? "Paused · " : ""}
            {props.phaseName}
          </p>
          <p className="text-2xl font-semibold text-stone-900 sm:text-3xl">
            {props.instruction}
          </p>
        </div>
        <div className="flex items-center gap-4 text-lg">
          {props.teamName ? (
            <span className="rounded-full bg-stone-900 px-4 py-1 font-medium text-orange-100">
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
  props: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "ghost" | "danger" },
) {
  const { tone = "primary", className = "", ...rest } = props;
  const tones = {
    primary: "bg-orange-600 text-white hover:bg-orange-700",
    ghost: "bg-white text-stone-900 ring-1 ring-stone-300 hover:bg-stone-100",
    danger: "bg-stone-900 text-white hover:bg-stone-700",
  };
  return (
    <button
      className={`rounded-2xl px-6 py-4 text-xl font-semibold disabled:opacity-50 ${tones[tone]} ${className}`}
      {...rest}
    />
  );
}

export function Panel(props: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200 ${props.className ?? ""}`}
    >
      {props.children}
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
