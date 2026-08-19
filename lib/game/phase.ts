import {
  assembleComposition,
  dealForTeam,
  type ContentPack,
  type CompositionFill,
} from "@/lib/content";
import {
  currentRound,
  TEAM_SEEDS,
  type RoomState,
  type RoundState,
} from "@/lib/game/state";
import type { Phase } from "@/lib/game/types";

export const PHASE_DURATIONS = {
  prompt_reveal: 12_000,
  selecting: 90_000,
  reveal: 2_500,
  voting: 30_000,
} as const;

export type PhaseContext = {
  pack: ContentPack;
  random: () => number;
  now: number;
};

export function current(room: RoomState): Phase {
  if (room.status === "ended") return "ended";
  const round = currentRound(room);
  if (!round || round.phase === "ended") return "gathering";
  return round.phase;
}

export function tick(room: RoomState, ctx: PhaseContext) {
  if (room.paused) return;
  const round = currentRound(room);
  if (!round) return;
  const phase = current(room);
  if (phase === "gathering" || phase === "standings" || phase === "ended") {
    return;
  }
  if (round.phaseEndsAt === null || ctx.now < round.phaseEndsAt) return;
  leave(room, ctx);
}

export function leave(room: RoomState, ctx: PhaseContext) {
  const phase = current(room);
  if (phase === "gathering" || phase === "standings") {
    beginPrompt(room, ctx);
    return;
  }
  const round = currentRound(room);
  if (!round) return;
  if (phase === "prompt_reveal") {
    enterSelecting(room, round, ctx.now);
    return;
  }
  if (phase === "selecting") {
    finishSelecting(room, round, ctx);
    return;
  }
  if (phase === "reveal") {
    stepReveal(round, ctx.now);
    if (round.phase === "voting") {
      room.status = "lobby";
    }
    return;
  }
  if (phase === "voting") {
    enter(room, ctx, "standings");
  }
}

export function enter(
  room: RoomState,
  ctx: PhaseContext,
  phase: "standings" | "ended",
) {
  if (phase === "ended") {
    room.status = "ended";
    const round = currentRound(room);
    if (round) {
      round.phase = "ended";
      round.phaseEndsAt = null;
    }
    return;
  }
  const round = currentRound(room);
  if (round) {
    tallyCrowdFavorite(room, round);
    round.phase = "standings";
    round.phaseEndsAt = null;
    room.promptCursor = (room.promptCursor + 1) % ctx.pack.prompts.length;
  }
  room.status = "lobby";
}

function seatUnseated(room: RoomState, random: () => number) {
  for (const player of room.players) {
    if (player.isHost) player.teamId = null;
  }
  const unseated = room.players.filter((player) => !player.isHost && !player.teamId);
  for (let i = unseated.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [unseated[i], unseated[j]] = [unseated[j], unseated[i]];
  }
  const teamIds = TEAM_SEEDS.map((seed) => seed.id);
  unseated.forEach((player, index) => {
    player.teamId = teamIds[index % teamIds.length];
  });
}

function beginPrompt(room: RoomState, ctx: PhaseContext) {
  seatUnseated(room, ctx.random);
  const prompt = ctx.pack.prompts[room.promptCursor % ctx.pack.prompts.length];
  const templateId = prompt.compatibleTemplateIds[0];
  const number = (currentRound(room)?.number ?? 0) + 1;
  const seated = room.players.filter(
    (player) => player.teamId && !player.isHost && player.joinedRound <= number,
  );
  const assignments: RoundState["assignments"] = [];
  for (const team of room.teams) {
    const members = seated.filter((player) => player.teamId === team.id);
    if (members.length === 0) continue;
    const dealt = dealForTeam(ctx.pack, {
      promptId: prompt.id,
      templateId,
      playerIds: members.map((member) => member.id),
      random: ctx.random,
    });
    for (const assignment of dealt) {
      assignments.push({
        ...assignment,
        selectedOptionId: null,
        submittedAt: null,
      });
    }
  }
  room.rounds.push({
    id: `round-${number}`,
    number,
    type: "straight",
    promptId: prompt.id,
    templateId,
    phase: "prompt_reveal",
    phaseEndsAt: ctx.now + PHASE_DURATIONS.prompt_reveal,
    assignments,
    compositions: [],
    reveal: { teamIndex: 0, segmentIndex: 0 },
    votes: [],
    reactions: [],
  });
  room.status = "lobby";
  room.paused = false;
  room.pauseStartedAt = null;
}

function enterSelecting(room: RoomState, round: RoundState, at: number) {
  round.phase = "selecting";
  round.phaseEndsAt = at + PHASE_DURATIONS.selecting;
  room.status = "in_progress";
}

function fillUnsubmitted(round: RoundState, random: () => number, now: number) {
  for (const assignment of round.assignments) {
    if (assignment.submittedAt || assignment.options.length === 0) continue;
    const index = Math.min(
      assignment.options.length - 1,
      Math.floor(random() * assignment.options.length),
    );
    assignment.selectedOptionId = assignment.options[index].id;
    assignment.submittedAt = now;
  }
}

function finishSelecting(room: RoomState, round: RoundState, ctx: PhaseContext) {
  fillUnsubmitted(round, ctx.random, ctx.now);
  const teamsWithAssignments = room.teams.filter((team) =>
    round.assignments.some((assignment) => {
      const player = room.players.find((entry) => entry.id === assignment.playerId);
      return player?.teamId === team.id;
    }),
  );
  round.compositions = teamsWithAssignments.map((team) => {
    const fills: CompositionFill[] = round.assignments
      .filter((assignment) => {
        const player = room.players.find((entry) => entry.id === assignment.playerId);
        return player?.teamId === team.id && assignment.selectedOptionId;
      })
      .map((assignment) => {
        const player = room.players.find((entry) => entry.id === assignment.playerId)!;
        const option = assignment.options.find(
          (entry) => entry.id === assignment.selectedOptionId,
        )!;
        const word = ctx.pack.words.find((entry) => entry.id === option.id);
        return {
          slotId: assignment.slotId,
          text: option.text,
          playerId: player.id,
          displayName: player.displayName,
          semanticCategory: word?.semanticCategory ?? "abstract",
          bannedPairCategories: word?.bannedPairCategories,
        };
      });
    return {
      teamId: team.id,
      segments: assembleComposition(ctx.pack, {
        templateId: round.templateId,
        fills,
      }).segments,
    };
  });
  round.reveal = { teamIndex: 0, segmentIndex: 0 };
  round.phase = "reveal";
  round.phaseEndsAt = ctx.now + PHASE_DURATIONS.reveal;
  room.status = "lobby";
}

function stepReveal(round: RoundState, at: number) {
  const currentComposition = round.compositions[round.reveal.teamIndex];
  if (!currentComposition) {
    round.phase = "voting";
    round.phaseEndsAt = at + PHASE_DURATIONS.voting;
    return;
  }
  if (round.reveal.segmentIndex + 1 < currentComposition.segments.length) {
    round.reveal.segmentIndex += 1;
    round.phaseEndsAt = at + PHASE_DURATIONS.reveal;
    return;
  }
  if (round.reveal.teamIndex + 1 < round.compositions.length) {
    round.reveal.teamIndex += 1;
    round.reveal.segmentIndex = 0;
    round.phaseEndsAt = at + PHASE_DURATIONS.reveal;
    return;
  }
  round.phase = "voting";
  round.phaseEndsAt = at + PHASE_DURATIONS.voting;
}

function tallyCrowdFavorite(room: RoomState, round: RoundState) {
  const counts = new Map<string, number>();
  for (const vote of round.votes) {
    counts.set(vote.teamId, (counts.get(vote.teamId) ?? 0) + 1);
  }
  let best = 0;
  for (const count of counts.values()) {
    best = Math.max(best, count);
  }
  if (best > 0) {
    for (const team of room.teams) {
      if ((counts.get(team.id) ?? 0) === best) {
        team.wins += 1;
      }
    }
  }
}

