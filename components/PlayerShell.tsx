"use client";

import { useEffect, useState } from "react";
import { getPlayerViewAction, joinRoomAction } from "@/app/actions/room";
import type { PlayerView } from "@/lib/game";
import {
  Lobby,
  PromptStage,
  RevealStage,
  StandingsBoard,
  TeamRoom,
  VotingBoard,
} from "@/components/play-surfaces";
import { Countdown, PhaseBanner } from "@/components/ui";

export function PlayerShell(props: { roomCode: string }) {
  const [view, setView] = useState<PlayerView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      const result = await getPlayerViewAction(props.roomCode);
      if (cancelled) return;
      if (result.ok) {
        setView(result.view);
        setError(null);
        window.localStorage.setItem("verse-clash-room", props.roomCode);
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

  if (error && !view) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="mb-4 text-4xl font-bold">Join {props.roomCode}</h1>
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
            className="w-full rounded-2xl border border-stone-300 px-4 py-4 text-xl"
            placeholder="Display name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button className="w-full rounded-2xl bg-orange-600 px-4 py-4 text-xl font-semibold text-white">
            Join room
          </button>
          <p className="text-stone-500">{error}</p>
        </form>
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
        {view.phase === "reveal" ? <RevealStage view={view} roomCode={props.roomCode} /> : null}
        {view.phase === "voting" ? <VotingBoard view={view} roomCode={props.roomCode} /> : null}
        {view.phase === "standings" || view.phase === "ended" ? (
          <StandingsBoard view={view} />
        ) : null}
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
