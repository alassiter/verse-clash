"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getPlayerViewAction, joinRoomAction } from "@/app/actions/room";
import type { PlayerView } from "@/lib/game";
import {
  ComposingStage,
  GameOverStage,
  Lobby,
  PromptStage,
  RevealStage,
  StandingsBoard,
  TeamRoom,
  VotingBoard,
} from "@/components/play-surfaces";
import { BigButton, Countdown, Panel, PhaseBanner } from "@/components/ui";

// After a room we were already connected to starts failing to load this many
// polls in a row (~2.4s), treat it as the session having timed out — the
// in-memory game state is gone (server restart, expired room) — and bail
// back to the landing page rather than leaving the player on a dead screen.
const TIMEOUT_FAIL_THRESHOLD = 3;

export function PlayerShell(props: { roomCode: string }) {
  const [view, setView] = useState<PlayerView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
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
      let result: Awaited<ReturnType<typeof getPlayerViewAction>>;
      try {
        result = await getPlayerViewAction(props.roomCode);
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
        window.localStorage.setItem("verse-clash-room", props.roomCode);
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

  if (error && !view) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <Panel tone="blue" title={`Join ${props.roomCode}`}>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void joinRoomAction(props.roomCode, name).then((result) => {
                if (!result.ok) setError(result.error);
              });
            }}
          >
            <input
              className="w-full rounded-2xl border-2 border-comic-ink bg-white px-4 py-4 text-xl focus:outline-none focus:ring-2 focus:ring-comic-blue"
              placeholder="Display name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <BigButton type="submit" tone="secondary" className="w-full">
              Join room
            </BigButton>
            <p className="text-stone-500">{error}</p>
          </form>
        </Panel>
      </main>
    );
  }

  if (!view) {
    return <p className="p-8 text-2xl">Connecting…</p>;
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
        {view.waitingForNextRound ? (
          <p className="text-3xl">This round already started. Hang on for the next one.</p>
        ) : null}
        {view.phase === "gathering" ? <Lobby view={view} roomCode={props.roomCode} /> : null}
        {view.phase === "prompt_reveal" ? <PromptStage view={view} /> : null}
        {view.phase === "selecting" ? (
          view.waitingForNextRound ? null : (
            <TeamRoom view={view} roomCode={props.roomCode} />
          )
        ) : null}
        {view.phase === "composing" ? <ComposingStage view={view} /> : null}
        {view.phase === "reveal" ? <RevealStage view={view} roomCode={props.roomCode} /> : null}
        {view.phase === "voting" ? <VotingBoard view={view} roomCode={props.roomCode} /> : null}
        {view.phase === "standings" ? <StandingsBoard view={view} /> : null}
        {view.phase === "ended" ? <GameOverStage view={view} /> : null}
        {view.isHost ? (
          <p className="mt-8 text-lg">
            <a className="underline" href={`/room/${props.roomCode}/host`}>
              Open host controls
            </a>
          </p>
        ) : null}
      </main>
    </div>
  );
}
