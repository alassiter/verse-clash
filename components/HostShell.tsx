"use client";

import { useEffect, useState } from "react";
import { getHostViewAction } from "@/app/actions/room";
import type { HostView } from "@/lib/game";
import { HostDashboard } from "@/components/HostDashboard";
import { Countdown, PhaseBanner } from "@/components/ui";

export function HostShell(props: { roomCode: string }) {
  const [view, setView] = useState<HostView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      const result = await getHostViewAction(props.roomCode);
      if (cancelled) return;
      if (result.ok) {
        setView(result.view);
        setError(null);
      } else {
        setError(result.error);
      }
    }
    void tick();
    const id = window.setInterval(() => void tick(), 800);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [props.roomCode]);

  if (error) {
    return (
      <main className="p-8 text-2xl">
        {error} — <a className="underline" href={`/room/${props.roomCode}`}>player view</a>
      </main>
    );
  }
  if (!view) return <p className="p-8 text-2xl">Loading host board…</p>;

  return (
    <div className="min-h-full">
      <PhaseBanner
        phaseName={view.phaseName}
        instruction={view.instruction}
        teamName={view.team?.name}
        paused={view.paused}
      >
        <Countdown endsAt={view.timerEndsAt} paused={view.paused} />
      </PhaseBanner>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <HostDashboard view={view} roomCode={props.roomCode} />
        <p className="mt-6 text-lg">
          <a className="underline" href={`/room/${props.roomCode}`}>
            Open player view
          </a>
        </p>
      </main>
    </div>
  );
}
