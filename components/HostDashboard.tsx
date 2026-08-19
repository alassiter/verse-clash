"use client";

import { useState } from "react";
import type { HostView } from "@/lib/game";
import {
  endGameAction,
  endRoundAction,
  restartGameAction,
  movePlayerAction,
  pauseAction,
  resumeAction,
  shuffleTeamsAction,
  startNextRoundAction,
  startRoundAction,
} from "@/app/actions/room";
import { BigButton, Panel } from "@/components/ui";

export function HostDashboard(props: { view: HostView; roomCode: string }) {
  const [error, setError] = useState<string | null>(null);
  const share =
    typeof window !== "undefined"
      ? `${window.location.origin}/room/${props.roomCode}`
      : `/room/${props.roomCode}`;
  const run = (action: Promise<{ ok: true } | { ok: false; error: string }>) => {
    void action.then((result) => {
      setError(result.ok ? null : result.error);
    });
  };
  return (
    <div className="grid gap-6">
      <Panel tone="red" title="Room">
        <p className="font-mono text-5xl font-black">{props.roomCode}</p>
        <p className="mt-2 break-all text-lg">{share}</p>
      </Panel>
      {props.view.promptPreview ? (
        <Panel tone="blue" title="Next prompt">
          <p className="mb-4 text-3xl">{props.view.promptPreview.text}</p>
          <div className="grid gap-2 text-lg sm:grid-cols-2">
            {props.view.promptPreview.wordPools.map((pool) => (
              <p key={pool.label}>
                <strong>{pool.label}:</strong> {pool.samples.join(", ")}
              </p>
            ))}
          </div>
        </Panel>
      ) : null}
      <Panel tone="green" title="Players">
        <ul className="space-y-3">
          {props.view.players.map((player) => (
            <li key={player.id} className="flex flex-wrap items-center gap-3 text-lg">
              <span className="min-w-40 font-semibold">
                {player.displayName}
                {player.isHost ? " (host)" : ""}
                {player.disconnected ? " · dropped?" : ""}
              </span>
              <span>{player.isReady ? "ready" : "not ready"}</span>
              {player.isHost ? (
                <span className="text-stone-500">no team</span>
              ) : (
                <select
                  className="rounded-xl border border-stone-300 px-2 py-2"
                  value={player.teamName ?? ""}
                  onChange={(event) => {
                    const name = event.target.value;
                    const team = props.view.teams.find((entry) => entry.name === name);
                    run(movePlayerAction(props.roomCode, player.id, team?.id ?? null));
                  }}
                >
                  <option value="">Off-team</option>
                  {props.view.teams.map((team) => (
                    <option key={team.id} value={team.name}>
                      {team.name}
                    </option>
                  ))}
                </select>
              )}
            </li>
          ))}
        </ul>
      </Panel>
      <Panel className="flex flex-wrap gap-3">
        {props.view.phase === "gathering" ? (
          <>
            <BigButton onClick={() => run(shuffleTeamsAction(props.roomCode))} tone="ghost">
              Shuffle teams
            </BigButton>
            <BigButton onClick={() => run(startRoundAction(props.roomCode))}>
              Start round
            </BigButton>
          </>
        ) : null}
        {props.view.phase === "prompt_reveal" || props.view.phase === "selecting" ? (
          <>
            {props.view.paused ? (
              <BigButton onClick={() => run(resumeAction(props.roomCode))}>Resume</BigButton>
            ) : (
              <BigButton onClick={() => run(pauseAction(props.roomCode))} tone="ghost">
                Pause
              </BigButton>
            )}
          </>
        ) : null}
        {props.view.phase === "standings" ? (
          <BigButton onClick={() => run(startNextRoundAction(props.roomCode))}>
            Next round
          </BigButton>
        ) : null}
        {props.view.phase !== "ended" &&
        props.view.phase !== "gathering" &&
        props.view.phase !== "standings" ? (
          <BigButton onClick={() => run(endRoundAction(props.roomCode))} tone="ghost">
            End this round
          </BigButton>
        ) : null}
        {props.view.phase !== "ended" && props.view.phase !== "gathering" ? (
          <BigButton tone="danger" onClick={() => run(endGameAction(props.roomCode))}>
            End game
          </BigButton>
        ) : null}
        {props.view.phase === "ended" ? (
          <BigButton onClick={() => run(restartGameAction(props.roomCode))}>
            Start new game
          </BigButton>
        ) : null}
        {error ? <p className="w-full text-lg text-red-700">{error}</p> : null}
      </Panel>
    </div>
  );
}
