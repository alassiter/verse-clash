"use client";

import type { HostView } from "@/lib/game";
import {
  endGameAction,
  endRoundAction,
  movePlayerAction,
  pauseAction,
  resumeAction,
  shuffleTeamsAction,
  startNextRoundAction,
  startRoundAction,
} from "@/app/actions/room";
import { BigButton, Panel } from "@/components/ui";

export function HostDashboard(props: { view: HostView; roomCode: string }) {
  const share =
    typeof window !== "undefined"
      ? `${window.location.origin}/room/${props.roomCode}`
      : `/room/${props.roomCode}`;
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
                    void movePlayerAction(props.roomCode, player.id, team?.id ?? null);
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
            <BigButton onClick={() => void shuffleTeamsAction(props.roomCode)} tone="ghost">
              Shuffle teams
            </BigButton>
            <BigButton onClick={() => void startRoundAction(props.roomCode)}>
              Start round
            </BigButton>
          </>
        ) : null}
        {props.view.phase === "prompt_reveal" || props.view.phase === "selecting" ? (
          <>
            {props.view.paused ? (
              <BigButton onClick={() => void resumeAction(props.roomCode)}>Resume</BigButton>
            ) : (
              <BigButton onClick={() => void pauseAction(props.roomCode)} tone="ghost">
                Pause
              </BigButton>
            )}
          </>
        ) : null}
        {props.view.phase === "standings" ? (
          <BigButton onClick={() => void startNextRoundAction(props.roomCode)}>
            Next round
          </BigButton>
        ) : null}
        {props.view.phase !== "ended" &&
        props.view.phase !== "gathering" &&
        props.view.phase !== "standings" ? (
          <BigButton onClick={() => void endRoundAction(props.roomCode)} tone="ghost">
            End this round
          </BigButton>
        ) : null}
        {props.view.phase !== "ended" && props.view.phase !== "gathering" ? (
          <BigButton tone="danger" onClick={() => void endGameAction(props.roomCode)}>
            End game
          </BigButton>
        ) : null}
      </Panel>
    </div>
  );
}
