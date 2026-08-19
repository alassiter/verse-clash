"use client";

import { useState } from "react";
import type { PlayerView } from "@/lib/game";
import { REVEAL_EMOJIS } from "@/lib/game/state";
import { BigButton, Panel } from "@/components/ui";
import { sendRevealReactionAction, setReadyAction, submitChoiceAction, voteAction } from "@/app/actions/room";

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

export function ChaosCardBanner(props: { view: PlayerView }) {
  const card = props.view.chaosCard;
  if (!card) return null;
  return (
    <div className="mb-6 rounded-2xl border-2 border-comic-ink bg-amber-100 px-5 py-4">
      <p className="text-lg font-black uppercase tracking-wide text-amber-800">
        Chaos Card: {card.name}
      </p>
      <p className="text-lg text-amber-900">{card.description}</p>
    </div>
  );
}

export function SoloAutoFillBanner(props: { view: PlayerView }) {
  if (!props.view.soloAutoFill) return null;
  return (
    <div className="mb-6 rounded-2xl border-2 border-comic-ink bg-sky-100 px-5 py-4">
      <p className="text-lg font-black uppercase tracking-wide text-sky-800">
        Flying Solo
      </p>
      <p className="text-lg text-sky-900">
        You&rsquo;re the only one on your team this round — we auto-picked the rest of your team&rsquo;s words.
      </p>
    </div>
  );
}

export function PromptStage(props: { view: PlayerView }) {
  return (
    <Panel tone="blue" title="Prompt">
      <ChaosCardBanner view={props.view} />
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
  const selection = props.view.selection;
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Panel tone="blue" title="Prompt">
        <ChaosCardBanner view={props.view} />
        <SoloAutoFillBanner view={props.view} />
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
        <ul className="space-y-2 text-xl">
          {props.view.teammates.map((mate) => (
            <li key={mate.id}>
              {mate.displayName} {mate.submitted ? "✓" : "…"}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

export function ComposingStage(props: { view: PlayerView }) {
  const words = props.view.composingWords;
  return (
    <Panel tone="blue" title="Composing" className="text-center">
      <p className="pt-4 text-3xl">
        {props.view.team ? `Team ${props.view.team.name} is` : "Every team is"}{" "}
        putting their words together…
      </p>
      {props.view.prompt?.text ? (
        <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-500">{props.view.prompt.text}</p>
      ) : null}
      {words && words.length > 0 ? (
        <>
          <p className="mt-8 text-sm font-bold uppercase tracking-wide text-stone-500">
            Off to the AI, in this order
          </p>
          <ol className="mx-auto mt-4 flex max-w-2xl flex-wrap justify-center gap-3">
            {words.map((word, index) => (
              <li
                key={`${word.text}-${index}`}
                className="rounded-2xl border-2 border-comic-ink bg-white px-4 py-2"
              >
                <span className="text-xl font-bold text-stone-900">{word.text}</span>
                <span className="ml-2 text-sm text-stone-500">{word.displayName}</span>
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </Panel>
  );
}

export function RevealStage(props: { view: PlayerView; roomCode: string }) {
  const reveal = props.view.reveal;
  const [localVotes, setLocalVotes] = useState<Record<string, string>>({});
  return (
    <Panel
      tone="red"
      title={`Team ${reveal?.teamName ?? ""}`}
      className="relative overflow-hidden text-center"
    >
      {props.view.prompt?.text ? (
        <p className="mx-auto max-w-3xl text-lg text-stone-500">{props.view.prompt.text}</p>
      ) : null}
      <div className="mx-auto max-w-3xl space-y-4 py-6">
        {reveal?.visibleSegments.map((segment, index) =>
          segment.type === "static" ? (
            <span key={index}>{segment.text}</span>
          ) : (
            <span
              key={index}
              className="mr-1 inline-flex items-baseline gap-1 whitespace-nowrap align-baseline"
            >
              <span className="text-3xl font-black text-stone-900">{segment.text}</span>
              <span className="inline-flex items-center gap-0.5 self-center">
                {REVEAL_EMOJIS.map((emoji) => {
                  const darkened =
                    segment.votedEmojis[0] === emoji ||
                    localVotes[`${reveal.teamName}:${segment.segmentIndex}`] === emoji;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      className={`text-sm leading-none transition duration-150 ${
                        darkened
                          ? "opacity-100 grayscale-0"
                          : "opacity-75 grayscale hover:opacity-90"
                      }`}
                      onClick={() => {
                        const key = `${reveal.teamName}:${segment.segmentIndex}`;
                        setLocalVotes((current) => ({
                          ...current,
                          [key]: emoji,
                        }));
                        void sendRevealReactionAction(
                          props.roomCode,
                          emoji,
                          segment.segmentIndex,
                        );
                      }}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </span>
            </span>
          ),
        )}
      </div>
      {reveal?.attribution ? (
        <p className="text-2xl text-orange-800">{reveal.attribution}</p>
      ) : null}
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
  const rows = [...(props.view.standings ?? [])].sort((a, b) => b.totalScore - a.totalScore);
  return (
    <Panel tone="red" title="Standings">
      {props.view.isTiebreaker ? (
        <p className="mb-4 text-center text-lg font-bold text-red-700">
          It&rsquo;s a tie! Sudden-death round &mdash; next team to lead wins.
        </p>
      ) : null}
      <ul className="space-y-6">
        {rows.map((row) => (
          <li key={row.teamId}>
            <div className="flex items-baseline justify-between text-3xl">
              <span>Team {row.teamName}</span>
              <span>
                {row.totalScore} pts <span className="text-lg text-stone-500">- {row.roundsWon} round{row.roundsWon === 1 ? "" : "s"} won</span>
              </span>
            </div>
            {row.lastComposition ? (
              <p className="mt-2 text-xl text-stone-700">
                {row.lastComposition.map((segment, index) =>
                  segment.type === "contribution" ? (
                    <strong key={index}>{segment.text}</strong>
                  ) : (
                    <span key={index}>{segment.text}</span>
                  ),
                )}
              </p>
            ) : null}
            {row.lastRound ? (
              <div className="mt-2 flex flex-wrap gap-2 text-sm text-stone-600">
                <span className="rounded-full bg-stone-200 px-3 py-1">Words +{row.lastRound.wordPoints}</span>
                {row.lastRound.comboBonuses.map((combo, index) => (
                  <span key={`${combo.type}-${index}`} className="rounded-full bg-amber-200 px-3 py-1">
                    {combo.type.replace("_", " ")} +{combo.points}
                  </span>
                ))}
                {row.lastRound.promptBonus > 0 ? (
                  <span className="rounded-full bg-blue-200 px-3 py-1">Prompt +{row.lastRound.promptBonus}</span>
                ) : null}
                {row.lastRound.cohesionBonus > 0 ? (
                  <span className="rounded-full bg-blue-200 px-3 py-1">Cohesion +{row.lastRound.cohesionBonus}</span>
                ) : null}
                {row.lastRound.crowdFavoriteBonus > 0 ? (
                  <span className="rounded-full bg-pink-200 px-3 py-1">Crowd favorite +{row.lastRound.crowdFavoriteBonus}</span>
                ) : null}
                <span className="rounded-full bg-stone-900 px-3 py-1 text-white">
                  Placement +{row.lastRound.placementPoints}
                </span>
              </div>
            ) : null}
            {row.lastRound?.sabotage ? (
              <p className="mt-2 text-sm font-bold text-purple-700">
                {row.lastRound.sabotage.direction === "sent"
                  ? `Sabotage: ${row.lastRound.sabotage.playerDisplayName}'s word "${row.lastRound.sabotage.text}" was smuggled into another team's verse.`
                  : `Sabotage: this team snuck in "${row.lastRound.sabotage.text}" from a rival team.`}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function GameOverStage(props: { view: PlayerView }) {
  const bestVerse = props.view.bestVerse;
  const winner = props.view.winner;
  return (
    <div className="space-y-6">
      {bestVerse ? (
        <Panel tone="blue" title="Best Verse of the Game" className="text-center">
          <p className="mx-auto max-w-2xl text-lg text-stone-500">{bestVerse.promptText}</p>
          <p className="mx-auto mt-4 max-w-2xl text-3xl font-bold text-stone-900">
            {bestVerse.segments.map((segment, index) =>
              segment.type === "contribution" ? (
                <strong key={index}>{segment.text}</strong>
              ) : (
                <span key={index}>{segment.text}</span>
              ),
            )}
          </p>
          <p className="mt-4 text-xl text-stone-600">
            Team {bestVerse.teamName} &middot; {bestVerse.score} pts
          </p>
        </Panel>
      ) : null}
      {winner ? (
        <Panel tone="red" title="Winner" className="text-center">
          <p className="text-5xl">🏆</p>
          <p className="mt-4 text-4xl font-black">
            {winner.teamNames.length > 1
              ? `${winner.teamNames.map((name) => `Team ${name}`).join(" & ")} tie!`
              : `Team ${winner.teamNames[0]} wins!`}
          </p>
          <p className="mt-2 text-xl text-stone-600">{winner.totalScore} pts</p>
        </Panel>
      ) : null}
      <StandingsBoard view={props.view} />
    </div>
  );
}
