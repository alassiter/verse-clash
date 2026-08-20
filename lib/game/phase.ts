import {
  cyclingFallback,
  CHAOS_CARD_IDS,
  dealHand,
  dealSlotsForTemplate,
  type ChaosCardId,
  type ContentPack,
  type CompositionFill,
  type Prompt,
} from "@/lib/content";
import {
  currentRound,
  leadingTeams,
  TEAM_SEEDS,
  type AssignmentState,
  type RoomState,
  type RoundState,
} from "@/lib/game/state";
import type {
  ComposeJudgeInput,
  ComposeJudgeResult,
  Phase,
} from "@/lib/game/types";
import { scoreRound } from "@/lib/scoring/combos";

const CROWD_FAVORITE_BONUS = 3;
const CHAOS_ROUND_INTERVAL = 3;
const MAX_ROUNDS = 3;

export const PHASE_DURATIONS = {
  prompt_reveal: 12_000,
  selecting: 90_000,
  composing: 20_000,
  reveal: 4_000,
  voting: 15_000,
} as const;

const FILL_FLOOR = 11;
const DOUBLE_TROUBLE_FILL_FLOOR = 22;

export function fillCountForTeam(memberCount: number, doubleTrouble: boolean): number {
  const perMember = doubleTrouble ? 2 : 1;
  const floor = doubleTrouble ? DOUBLE_TROUBLE_FILL_FLOOR : FILL_FLOOR;
  return Math.max(memberCount * perMember, floor);
}

function liveUsedTexts(room: RoomState, round: RoundState, teamId: string): Set<string> {
  const used = new Set<string>();
  for (const assignment of round.assignments) {
    if (resolveAssignmentTeamId(room, assignment) !== teamId) continue;
    if (assignment.submittedAt && assignment.selectedOptionId) {
      const chosen = assignment.options.find((option) => option.id === assignment.selectedOptionId);
      if (chosen) used.add(chosen.text);
      continue;
    }
    if (!assignment.submittedAt) {
      for (const option of assignment.options) used.add(option.text);
    }
  }
  return used;
}

function slotForAssignment(pack: ContentPack, assignment: AssignmentState) {
  const slot = pack.slots.find((entry) => entry.id === assignment.slotId);
  if (!slot) {
    throw new Error(`Missing slot ${assignment.slotId}`);
  }
  return slot;
}

function dealLiveHand(
  pack: ContentPack,
  room: RoomState,
  round: RoundState,
  assignment: AssignmentState,
  random: () => number,
) {
  const teamId = resolveAssignmentTeamId(room, assignment);
  assignment.options = dealHand(pack, {
    promptId: round.promptId,
    slot: slotForAssignment(pack, assignment),
    usedTexts: liveUsedTexts(room, round, teamId ?? ""),
    random,
    chaosCard: round.chaosCard,
  });
}

/** After a Fill is submitted, deal this player's next hand if they still owe one. */
export function dealNextHandForPlayer(
  pack: ContentPack,
  room: RoomState,
  round: RoundState,
  playerId: string,
  random: () => number,
) {
  const next = round.assignments.find(
    (entry) => entry.playerId === playerId && !entry.submittedAt,
  );
  if (!next || next.options.length > 0) return;
  dealLiveHand(pack, room, round, next, random);
}

function dealRemainingHands(
  pack: ContentPack,
  room: RoomState,
  round: RoundState,
  random: () => number,
) {
  for (const assignment of round.assignments) {
    if (assignment.submittedAt || assignment.options.length > 0) continue;
    dealLiveHand(pack, room, round, assignment, random);
  }
}

export type AiHooks = {
  composeAndJudge(input: ComposeJudgeInput): Promise<ComposeJudgeResult>;
  getRoom(roomId: string): RoomState | undefined;
  persistRoom(roomId: string): Promise<void>;
  now(): number;
};

export type PhaseContext = {
  pack: ContentPack;
  random: () => number;
  now: number;
  ai: AiHooks;
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
  if (phase === "composing") {
    if (
      round.pendingComposition?.status === "pending" &&
      round.phaseEndsAt !== null &&
      ctx.now >= round.phaseEndsAt
    ) {
      forceFallbackComposition(room, round, ctx);
    }
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
    beginComposing(room, round, ctx);
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
      cancelPendingComposition(round);
      round.phase = "ended";
      round.phaseEndsAt = null;
    }
    return;
  }
  const round = currentRound(room);
  if (!round) {
    room.status = "lobby";
    return;
  }
  cancelPendingComposition(round);
  finalizeRoundScoring(room, round);
  round.phaseEndsAt = null;
  if (round.number >= MAX_ROUNDS && leadingTeams(room).length <= 1) {
    // The game is a fixed-length match — the final round's standings are the
    // game's final results, so there's no "next round" to offer. If the top
    // teams are still tied, though, we keep playing sudden-death rounds below
    // instead of ending on a tie.
    round.phase = "ended";
    room.status = "ended";
    return;
  }
  round.phase = "standings";
  room.nextPromptId = pickNextPrompt(ctx.pack, ctx.random, round.promptId).id;
  room.status = "lobby";
}

function cancelPendingComposition(round: RoundState) {
  if (round.phase === "composing" && round.pendingComposition?.status === "pending") {
    round.pendingComposition.status = "cancelled";
  }
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

function pickChaosCard(random: () => number): ChaosCardId {
  const index = Math.min(
    CHAOS_CARD_IDS.length - 1,
    Math.floor(random() * CHAOS_CARD_IDS.length),
  );
  return CHAOS_CARD_IDS[index];
}

/**
 * Picks a random prompt, excluding the just-played one when there's more than
 * one candidate — so rounds never play back in the same fixed order and never
 * immediately repeat. Exported for room creation to seed the very first pick.
 */
export function pickNextPrompt(
  pack: ContentPack,
  random: () => number,
  excludeId: string | null,
): Prompt {
  const pool =
    excludeId && pack.prompts.length > 1
      ? pack.prompts.filter((prompt) => prompt.id !== excludeId)
      : pack.prompts;
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
  return pool[index];
}

function beginPrompt(room: RoomState, ctx: PhaseContext) {
  seatUnseated(room, ctx.random);
  const prompt =
    ctx.pack.prompts.find((entry) => entry.id === room.nextPromptId) ??
    pickNextPrompt(ctx.pack, ctx.random, null);
  const templateId = prompt.compatibleTemplateIds[0];
  const number = (currentRound(room)?.number ?? 0) + 1;
  const chaosCard = number % CHAOS_ROUND_INTERVAL === 0 ? pickChaosCard(ctx.random) : null;
  const seated = room.players.filter(
    (player) => player.teamId && !player.isHost && player.joinedRound <= number,
  );
  const assignments: RoundState["assignments"] = [];
  for (const team of room.teams) {
    const members = seated.filter((player) => player.teamId === team.id);
    if (members.length === 0) continue;
    const slots = dealSlotsForTemplate(ctx.pack, templateId, chaosCard);
    const count = fillCountForTeam(members.length, chaosCard === "double_trouble");
    const teamAssignments: AssignmentState[] = [];
    for (let i = 0; i < count; i += 1) {
      const slot = slots[i % slots.length];
      const member = members[i % members.length];
      teamAssignments.push({
        playerId: member.id,
        slotId: slot.id,
        playerLabel: slot.playerLabel,
        options: [],
        selectedOptionId: null,
        submittedAt: null,
      });
    }
    const firstWave = new Set<string>();
    const usedTexts = new Set<string>();
    for (const assignment of teamAssignments) {
      if (firstWave.has(assignment.playerId)) continue;
      firstWave.add(assignment.playerId);
      assignment.options = dealHand(ctx.pack, {
        promptId: prompt.id,
        slot: slotForAssignment(ctx.pack, assignment),
        usedTexts,
        random: ctx.random,
        chaosCard,
      });
    }
    assignments.push(...teamAssignments);
  }
  room.rounds.push({
    id: `round-${number}`,
    number,
    type: chaosCard ? "chaos" : "straight",
    isTiebreaker: number > MAX_ROUNDS,
    chaosCard,
    promptId: prompt.id,
    templateId,
    phase: "prompt_reveal",
    phaseEndsAt: ctx.now + PHASE_DURATIONS.prompt_reveal,
    assignments,
    pendingComposition: null,
    compositions: [],
    judging: null,
    scoring: null,
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

function fillUnsubmitted(
  pack: ContentPack,
  room: RoomState,
  round: RoundState,
  random: () => number,
  now: number,
) {
  dealRemainingHands(pack, room, round, random);
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

function resolveAssignmentTeamId(room: RoomState, assignment: AssignmentState): string | undefined {
  return room.players.find((entry) => entry.id === assignment.playerId)?.teamId ?? undefined;
}

// Exported so the composing screen can show a team its own fills in the exact
// order they'll be handed to the AI — this does not include a sabotage steal,
// which is only injected into a fresh copy at composing time (see
// beginComposing) and stays a secret until standings, by design.
export function buildTeamFills(
  room: RoomState,
  round: RoundState,
  pack: ContentPack,
): Array<{ teamId: string; fills: CompositionFill[] }> {
  const teamsWithAssignments = room.teams.filter((team) =>
    round.assignments.some((assignment) => resolveAssignmentTeamId(room, assignment) === team.id),
  );
  return teamsWithAssignments.map((team) => {
    const fills: CompositionFill[] = round.assignments
      .filter(
        (assignment) =>
          resolveAssignmentTeamId(room, assignment) === team.id && assignment.selectedOptionId,
      )
      .map((assignment) => {
        const player = room.players.find((entry) => entry.id === assignment.playerId)!;
        const option = assignment.options.find(
          (entry) => entry.id === assignment.selectedOptionId,
        )!;
        const word = pack.words.find((entry) => entry.id === option.id);
        return {
          slotId: assignment.slotId,
          text: option.text,
          playerId: assignment.playerId,
          displayName: player.displayName,
          semanticCategory: word?.semanticCategory ?? "abstract",
          bannedPairCategories: word?.bannedPairCategories,
          wordId: word?.id,
        };
      });
    return { teamId: team.id, fills };
  });
}

function flavorCompositions(
  pack: ContentPack,
  teamsFills: Array<{ teamId: string; fills: CompositionFill[] }>,
  random: () => number,
): RoundState["compositions"] {
  return teamsFills.map(({ teamId, fills }) => ({
    teamId,
    segments: cyclingFallback(pack, fills, random),
    source: "deterministic_fallback" as const,
  }));
}

function applySabotage(
  teamsFills: Array<{ teamId: string; fills: CompositionFill[] }>,
  random: () => number,
) {
  const sourceCandidates = teamsFills.filter((entry) => entry.fills.length > 0);
  if (sourceCandidates.length < 2) return;
  const source = sourceCandidates[Math.floor(random() * sourceCandidates.length)];
  const targetCandidates = teamsFills.filter((entry) => entry.teamId !== source.teamId);
  if (targetCandidates.length === 0) return;
  const target = targetCandidates[Math.floor(random() * targetCandidates.length)];
  const stolen = source.fills[Math.floor(random() * source.fills.length)];
  target.fills.push({ ...stolen, sabotagedFrom: { playerId: stolen.playerId, teamId: source.teamId } });
}

function beginComposing(room: RoomState, round: RoundState, ctx: PhaseContext) {
  fillUnsubmitted(ctx.pack, room, round, ctx.random, ctx.now);
  const teamsFills = buildTeamFills(room, round, ctx.pack);
  if (round.chaosCard === "sabotage") {
    applySabotage(teamsFills, ctx.random);
  }
  const requestId = `req-${round.id}-${ctx.now}-${Math.floor(ctx.random() * 1_000_000)}`;

  round.phase = "composing";
  round.phaseEndsAt = ctx.now + PHASE_DURATIONS.composing;
  round.pendingComposition = { requestId, status: "pending", startedAt: ctx.now };
  room.status = "lobby";

  const { ai, pack } = ctx;
  const roomId = room.id;
  const roundId = round.id;
  const templateId = round.templateId;
  const promptId = round.promptId;
  const random = ctx.random;

  ai
    .composeAndJudge({ roomId, roundId, requestId, templateId, promptId, teams: teamsFills })
    .then(async (result) => {
      applyComposition(ai, pack, roomId, roundId, requestId, teamsFills, result);
      await ai.persistRoom(roomId);
    })
    .catch(async () => {
      applyComposition(ai, pack, roomId, roundId, requestId, teamsFills, {
        requestId,
        compositions: flavorCompositions(pack, teamsFills, random),
      });
      await ai.persistRoom(roomId);
    });
}

function applyComposition(
  ai: AiHooks,
  pack: ContentPack,
  roomId: string,
  roundId: string,
  requestId: string,
  teamsFills: Array<{ teamId: string; fills: CompositionFill[] }>,
  result: ComposeJudgeResult,
) {
  const room = ai.getRoom(roomId);
  if (!room) return;
  const round = room.rounds.find((entry) => entry.id === roundId);
  if (!round) return;
  if (round.phase !== "composing" || round.pendingComposition?.requestId !== requestId) {
    return;
  }
  round.compositions = result.compositions;
  round.judging = result.judging ?? null;
  round.scoring = scoreRound(pack, teamsFills, round.judging);
  round.pendingComposition.status = "resolved";
  round.reveal = { teamIndex: 0, segmentIndex: 0 };
  round.phase = "reveal";
  round.phaseEndsAt = ai.now() + PHASE_DURATIONS.reveal;
  room.status = "lobby";
}

function forceFallbackComposition(room: RoomState, round: RoundState, ctx: PhaseContext) {
  const teamsFills = buildTeamFills(room, round, ctx.pack);
  if (round.chaosCard === "sabotage") {
    applySabotage(teamsFills, ctx.random);
  }
  round.compositions = flavorCompositions(ctx.pack, teamsFills, ctx.random);
  round.judging = null;
  round.scoring = scoreRound(ctx.pack, teamsFills, null);
  if (round.pendingComposition) {
    round.pendingComposition.status = "timed_out";
  }
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

function finalizeRoundScoring(room: RoomState, round: RoundState) {
  if (!round.scoring) return;

  const counts = new Map<string, number>();
  for (const vote of round.votes) {
    counts.set(vote.teamId, (counts.get(vote.teamId) ?? 0) + 1);
  }
  let bestVotes = 0;
  for (const count of counts.values()) {
    bestVotes = Math.max(bestVotes, count);
  }

  for (const entry of round.scoring) {
    const isCrowdFavorite = bestVotes > 0 && (counts.get(entry.teamId) ?? 0) === bestVotes;
    entry.crowdFavoriteBonus = isCrowdFavorite ? CROWD_FAVORITE_BONUS : 0;
    entry.totalRoundScore += entry.crowdFavoriteBonus;
  }

  let topScore = -Infinity;
  for (const entry of round.scoring) {
    topScore = Math.max(topScore, entry.totalRoundScore);
  }
  for (const entry of round.scoring) {
    const team = room.teams.find((candidate) => candidate.id === entry.teamId);
    if (!team) continue;
    team.totalScore += entry.totalRoundScore;
    if (entry.totalRoundScore === topScore) {
      team.roundsWon += 1;
    }
  }
}
