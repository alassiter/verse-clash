"use client";

import { useState } from "react";
import type { PlayerView } from "@/lib/game";
import { BigButton, Panel } from "@/components/ui";
import { sendRevealReactionAction, sendTeamEmojiAction, sendTeamMessageAction, setReadyAction, submitChoiceAction, voteAction } from "@/app/actions/room";

export function Lobby(props: { view: PlayerView; roomCode: string }) {
  const players = props.view.lobby?.players ?? [];
  return (
    <Panel tone="red" title="Lobby">
      <p className="mb-6 text-xl text-stone-600">
        Room code <span className="font-mono font-bold text-stone-900">{props.roomCode}</span>
      </p>
      <ul className="mb-8 space-y-2 text-xl">
        {players.map((player) => (
          <li key={player.displayName} className="flex justify-between gap-4">
            <span>
              {player.displayName}
              {player.isHost ? " (host)" : ""}
            </span>
            <span className="text-stone-500">
              {player.teamName ?? "unseated"} · {player.isReady ? "ready" : "not ready"}
            </span>
          </li>
        ))}
      </ul>
      {props.view.team ? (
        <p className="mb-6 text-2xl">
          You are on <strong>Team {props.view.team.name}</strong>
        </p>
      ) : props.view.isHost ? (
        <p className="mb-6 text-2xl">You are the host. You will not join a team.</p>
      ) : (
        <p className="mb-6 text-2xl">You will get a team when the host starts.</p>
      )}
      <BigButton
        onClick={() => void setReadyAction(props.roomCode, !props.view.isReady)}
      >
        {props.view.isReady ? "I'm not ready" : "I'm ready"}
      </BigButton>
    </Panel>
  );
}

export function PromptStage(props: { view: PlayerView }) {
  return (
    <Panel tone="blue" title="Prompt">
      <h2 className="text-4xl font-bold leading-tight">{props.view.prompt?.text}</h2>
      {props.view.team ? (
        <p className="mt-6 text-2xl">
          You are on <strong>Team {props.view.team.name}</strong>
        </p>
      ) : null}
    </Panel>
  );
}

export function TeamRoom(props: { view: PlayerView; roomCode: string }) {
  const [draft, setDraft] = useState("");
  const selection = props.view.selection;
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Panel tone="blue" title="Prompt">
        <h2 className="mb-8 text-4xl font-bold leading-tight">{props.view.prompt?.text}</h2>
        {selection ? (
          <>
            <p className="mb-4 text-2xl">{selection.playerLabel}</p>
            <div className="grid gap-3">
              {selection.options.map((option) => (
                <BigButton
                  key={option.id}
                  tone={selection.selectedOptionId === option.id ? "primary" : "ghost"}
                  disabled={selection.submitted}
                  onClick={() => void submitChoiceAction(props.roomCode, option.id)}
                  className="text-left"
                >
                  {option.text}
                </BigButton>
              ))}
            </div>
            <p className="mt-6 text-xl">
              {selection.submitted ? "Submitted. Hang tight." : "Pick one. You cannot see teammates' words."}
            </p>
          </>
        ) : (
          <p className="text-2xl">Wait for the next round — this one already started.</p>
        )}
      </Panel>
      <Panel tone="green" title="Team">
        <h3 className="mb-3 text-2xl font-bold">Teammates</h3>
        <ul className="mb-6 space-y-2 text-xl">
          {props.view.teammates.map((mate) => (
            <li key={mate.id}>
              {mate.displayName} {mate.submitted ? "✓" : "…"}
            </li>
          ))}
        </ul>
        <h3 className="mb-3 text-2xl font-bold">Team chat</h3>
        <div className="mb-3 max-h-48 space-y-1 overflow-y-auto text-lg">
          {props.view.teamChat.map((message, index) => (
            <p key={`${message.playerName}-${index}`}>
              <strong>{message.playerName}:</strong> {message.body}
            </p>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!draft.trim()) return;
            void sendTeamMessageAction(props.roomCode, draft.trim());
            setDraft("");
          }}
        >
          <input
            className="min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-3 text-lg"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Tone check, not spoilers"
          />
          <BigButton type="submit" className="px-4 py-3 text-lg">
            Send
          </BigButton>
        </form>
        <div className="mt-3 flex gap-2">
          {["😂", "👏", "👍"].map((emoji) => (
            <button
              key={emoji}
              className="text-3xl"
              onClick={() => void sendTeamEmojiAction(props.roomCode, emoji)}
              type="button"
            >
              {emoji}
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function RevealStage(props: { view: PlayerView; roomCode: string }) {
  const reveal = props.view.reveal;
  return (
    <Panel
      tone="red"
      title={`Team ${reveal?.teamName ?? ""}`}
      className="relative overflow-hidden text-center"
    >
      <div className="mx-auto max-w-3xl space-y-4 py-6">
        {reveal?.visibleSegments.map((segment, index) =>
          segment.type === "static" ? (
            <p key={index} className="text-2xl text-stone-600">
              {segment.text}
            </p>
          ) : (
            <p key={index} className="text-5xl font-black text-stone-900">
              {segment.text}
            </p>
          ),
        )}
      </div>
      {reveal?.attribution ? (
        <p className="text-2xl text-orange-800">{reveal.attribution}</p>
      ) : null}
      <div className="pointer-events-none absolute inset-0 flex flex-wrap items-start justify-center gap-2 p-4 text-5xl opacity-80">
        {reveal?.bursts.slice(-8).map((burst, index) => (
          <span key={`${burst.emoji}-${index}`}>{burst.emoji}</span>
        ))}
      </div>
      <div className="mt-10 flex justify-center gap-3">
        {["😂", "👏", "🤯", "❤️", "😮"].map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="rounded-2xl bg-orange-100 px-4 py-3 text-4xl"
            onClick={() => void sendRevealReactionAction(props.roomCode, emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </Panel>
  );
}

export function VotingBoard(props: { view: PlayerView; roomCode: string }) {
  return (
    <Panel tone="blue" title="Crowd Favorite">
      <div className="grid gap-3 sm:grid-cols-2">
        {props.view.voting?.teams.map((team) => (
          <BigButton
            key={team.id}
            onClick={() => void voteAction(props.roomCode, team.id)}
          >
            Team {team.name}
          </BigButton>
        ))}
      </div>
    </Panel>
  );
}

export function StandingsBoard(props: { view: PlayerView }) {
  return (
    <Panel tone="red" title="Standings">
      <ul className="space-y-3 text-3xl">
        {props.view.standings?.map((row) => (
          <li key={row.teamId}>
            Team {row.teamName}: {row.wins}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
