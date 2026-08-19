"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getHostViewAction } from "@/app/actions/room";
import type { HostView } from "@/lib/game";
import { HostDashboard } from "@/components/HostDashboard";
import { Countdown, PhaseBanner } from "@/components/ui";

// After a room we were already connected to starts failing to load this many
// polls in a row (~2.4s), treat it as the session having timed out — the
// in-memory game state is gone (server restart, expired room) — and bail
// back to the landing page rather than leaving the host on a dead screen.
const TIMEOUT_FAIL_THRESHOLD = 3;

function DeployStamp() {
  const sha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;
  const label = sha ? sha.slice(0, 7) : "local";
  return (
    <p
      className="fixed bottom-2 right-3 z-20 font-mono text-xs text-stone-800/50"
      title={sha ?? "local build"}
    >
      {label}
    </p>
  );
}

export function HostShell(props: { roomCode: string }) {
  const [view, setView] = useState<HostView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const hasConnectedRef = useRef(false);
  const failCountRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    function noteFailure(message: string) {
      setError(message);
      if (hasConnectedRef.current) {
        failCountRef.current += 1;
        if (failCountRef.current >= TIMEOUT_FAIL_THRESHOLD) {
          router.replace("/");
        }
      }
    }
    async function tick() {
      let result: Awaited<ReturnType<typeof getHostViewAction>>;
      try {
        result = await getHostViewAction(props.roomCode);
      } catch {
        if (!cancelled) noteFailure("Lost connection to the server.");
        return;
      }
      if (cancelled) return;
      if (result.ok) {
        hasConnectedRef.current = true;
        failCountRef.current = 0;
        setView(result.view);
        setError(null);
      } else {
        noteFailure(result.error);
      }
    }
    void tick();
    const id = window.setInterval(() => void tick(), 800);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [props.roomCode, router]);

  if (error) {
    return (
      <>
        <main className="p-8 text-2xl">
          {error} — <a className="underline" href={`/room/${props.roomCode}`}>player view</a>
        </main>
        <DeployStamp />
      </>
    );
  }
  if (!view) {
    return (
      <>
        <p className="p-8 text-2xl">Loading host board…</p>
        <DeployStamp />
      </>
    );
  }

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
      <DeployStamp />
    </div>
  );
}
