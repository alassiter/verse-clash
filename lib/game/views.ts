import type { ContentPack } from "@/lib/content";
import { CHAOS_CARD_COPY } from "@/lib/content/chaosCards";
import { slotsForTemplate } from "@/lib/content/deal";
import { buildTeamFills, current } from "@/lib/game/phase";
import {
  AUTO_FILL_PLAYER_PREFIX,
  currentRound,
  DISCONNECT_AFTER_MS,
  leadingTeams,
  type PlayerState,
  type RoomState,
} from "@/lib/game/state";
import type { HostView, PlayerView, TeammateView } from "@/lib/game/types";

const PHASE_COPY: Record<
  PlayerView["phase"],
  { name: string; instruction: string }
> = {
  gathering: { name: "Gathering", instruction: "Waiting for the host to start" },
  prompt_reveal: { name: "Prompt", instruction: "Read the shared prompt" },
  selecting: { name: "Selecting", instruction: "Choose one option" },
  composing: { name: "Composing", instruction: "The verses are being assembled" },
  reveal: { name: "Reveal", instruction: "Watch the shared stage" },
  voting: { name: "Voting", instruction: "Pick a Crowd Favorite" },
  standings: { name: "Standings", instruction: "See which team is ahead" },
  ended: { name: "Ended", instruction: "The host can start a new game" },
};

function teamById(room: RoomState, teamId: string | null) {
  if (!teamId) return null;
  return room.teams.find((team) => team.id === teamId) ?? null;
}

function teammates(
  room: RoomState,
  player: PlayerState,
): TeammateView[] {
  if (!player.teamId) return [];
  const round = currentRound(room);
  const phase = current(room);
  const hideWords =
    phase === "gathering" ||
    phase === "prompt_reveal" ||
    phase === "selecting" ||
    phase === "composing";
  return room.players
    .filter((mate) => mate.teamId === player.teamId)
    .map((mate) => {
      const mateAssignments =
        round?.assignments.filter((entry) => entry.playerId === mate.id) ?? [];
      const assignment = mateAssignments.find((entry) => !entry.submittedAt) ?? mateAssignments[0];
      const allSubmitted =
        mateAssignments.length > 0 && mateAssignments.every((entry) => entry.submittedAt);
      const selected = assignment?.options.find(
        (option) => option.id === assignment.selectedOptionId,
      );
      const view: TeammateView = {
        id: mate.id,
        displayName: mate.displayName,
        submitted: allSubmitted,
      };
      if (!hideWords && mate.id !== player.id) {
        view.selectedText = selected?.text;
      }
      if (mate.id === player.id && assignment) {
        view.options = assignment.options;
        view.selectedText = selected?.text;
      }
      return view;
    });
}

export function playerView(
  room: RoomState,
  player: PlayerState,
  pack: ContentPack,
): PlayerView {
  const phase = current(room);
  const copy = PHASE_COPY[phase];
  const team = teamById(room, player.teamId);
  const round = currentRound(room);
  const prompt = round
    ? pack.prompts.find((entry) => entry.id === round.promptId)
    : undefined;
  const ownAssignments = round?.assignments.filter((entry) => entry.playerId === player.id) ?? [];
  const assignment = ownAssignments.find((entry) => !entry.submittedAt) ?? ownAssignments[0];
  const waitingForNextRound = Boolean(
    round &&
      phase !== "gathering" &&
      phase !== "ended" &&
      player.joinedRound > round.number &&
      !assignment,
  );
  const mateViews = teammates(room, player);
  const view: PlayerView = {
    phase,
    phaseName: copy.name,
    instruction: copy.instruction,
    roomCode: room.code,
    displayName: player.displayName,
    isHost: player.isHost,
    paused: room.paused,
    isReady: player.isReady,
    timerEndsAt: round?.phaseEndsAt ?? undefined,
    team: team
      ? { id: team.id, name: team.name, teammates: mateViews }
      : null,
    teammates: mateViews,
    waitingForNextRound: waitingForNextRound || undefined,
    soloAutoFill:
      team && round
        ? round.assignments.some(
            (entry) => entry.playerId === `${AUTO_FILL_PLAYER_PREFIX}${team.id}`,
          ) || undefined
        : undefined,
  };

  if (view.phase === "gathering") {
    view.lobby = {
      players: room.players.map((entry) => ({
        displayName: entry.displayName,
        isHost: entry.isHost,
        teamName: teamById(room, entry.teamId)?.name ?? null,
        isReady: entry.isReady,
      })),
    };
  }

  if (prompt && view.phase !== "gathering") {
    view.prompt = {
      text: prompt.text,
      tease: prompt.tease,
      formatHint: prompt.formatHint,
    };
  }

  if (round?.chaosCard && view.phase !== "gathering") {
    const copy = CHAOS_CARD_COPY[round.chaosCard];
    view.chaosCard = { id: round.chaosCard, name: copy.name, description: copy.description };
  }

  if (assignment && phase !== "gathering" && phase !== "prompt_reveal") {
    view.selection = {
      playerLabel: assignment.playerLabel,
      options: assignment.options,
      submitted: Boolean(assignment.submittedAt),
      selectedOptionId: assignment.selectedOptionId ?? undefined,
    };
  }

  if (round && team && view.phase === "composing") {
    const teamFills = buildTeamFills(room, round, pack).find(
      (entry) => entry.teamId === team.id,
    );
    view.composingWords = teamFills?.fills.map((fill) => ({
      text: fill.text,
      displayName: fill.displayName,
    }));
  }

  if (round && view.phase === "reveal") {
    const compositions = round.compositions;
    const shown = compositions[round.reveal.teamIndex] ?? compositions[0];
    const teamName =
      room.teams.find((entry) => entry.id === shown?.teamId)?.name ?? "";
    const visible = shown?.segments.slice(0, round.reveal.segmentIndex + 1) ?? [];
    const last = visible.at(-1);
    view.reveal = {
      teamName,
      composition: shown?.segments ?? [],
      visibleSegments: visible.map((segment, segmentIndex) => {
        if (segment.type === "static") return segment;
        const myVote = round.reactions.find(
          (reaction) =>
            reaction.playerId === player.id &&
            reaction.teamIndex === round.reveal.teamIndex &&
            reaction.segmentIndex === segmentIndex,
        )?.emoji;
        return {
          ...segment,
          segmentIndex,
          votedEmojis: myVote ? [myVote] : [],
        };
      }),
      attribution:
        last?.type === "contribution" ? `Selected by ${last.displayName}` : undefined,
    };
  }

  if (view.phase === "voting") {
    view.voting = {
      teams: room.teams
        .filter((entry) =>
          room.players.some((person) => person.teamId === entry.id),
        )
        .map((entry) => ({ id: entry.id, name: entry.name })),
    };
  }

  if (view.phase === "standings" || view.phase === "ended") {
    view.isTiebreaker = round?.isTiebreaker ?? false;
    view.standings = room.teams.map((entry) => ({
      teamId: entry.id,
      teamName: entry.name,
      totalScore: entry.totalScore,
      roundsWon: entry.roundsWon,
      lastRound: round?.scoring?.find((score) => score.teamId === entry.id),
      lastComposition: round?.compositions.find((composition) => composition.teamId === entry.id)?.segments,
    }));
  }

  if (view.phase === "ended") {
    view.bestVerse = findBestVerse(room, pack);
    view.winner = findWinner(room);
  }

  return view;
}

// The single highest-scoring team-verse across every round played, shown on
// the final "ended" screen as the game's highlight.
function findBestVerse(
  room: RoomState,
  pack: ContentPack,
): PlayerView["bestVerse"] {
  let bestRoundIndex = -1;
  let bestTeamId = "";
  let bestScore = -Infinity;
  for (let roundIndex = 0; roundIndex < room.rounds.length; roundIndex += 1) {
    for (const score of room.rounds[roundIndex].scoring ?? []) {
      if (score.totalRoundScore > bestScore) {
        bestRoundIndex = roundIndex;
        bestTeamId = score.teamId;
        bestScore = score.totalRoundScore;
      }
    }
  }
  if (bestRoundIndex === -1) return undefined;
  const bestRound = room.rounds[bestRoundIndex];
  const prompt = pack.prompts.find((entry) => entry.id === bestRound.promptId);
  const composition = bestRound.compositions.find((entry) => entry.teamId === bestTeamId);
  const teamName = room.teams.find((entry) => entry.id === bestTeamId)?.name;
  if (!prompt || !composition || !teamName) return undefined;
  return {
    promptText: prompt.text,
    teamName,
    segments: composition.segments,
    score: bestScore,
  };
}

function findWinner(room: RoomState): PlayerView["winner"] {
  const teams = leadingTeams(room);
  if (teams.length === 0) return undefined;
  return { teamNames: teams.map((team) => team.name), totalScore: teams[0].totalScore };
}

export function hostView(
  room: RoomState,
  player: PlayerState,
  pack: ContentPack,
  now: number,
): HostView {
  const upcoming =
    pack.prompts.find((prompt) => prompt.id === room.nextPromptId) ?? pack.prompts[0];
  const templateId = upcoming.compatibleTemplateIds[0];
  const slots = slotsForTemplate(pack, templateId);
  const phase = current(room);
  return {
    ...playerView(room, player, pack),
    players: room.players.map((entry) => ({
      id: entry.id,
      displayName: entry.displayName,
      teamName: teamById(room, entry.teamId)?.name ?? null,
      isReady: entry.isReady,
      lastSeenAt: entry.lastSeenAt,
      disconnected: now - entry.lastSeenAt > DISCONNECT_AFTER_MS,
      isHost: entry.isHost,
    })),
    teams: room.teams.map((team) => ({ id: team.id, name: team.name })),
    promptPreview:
      phase === "gathering" || phase === "standings"
        ? {
            text: upcoming.text,
            formatHint: upcoming.formatHint,
            wordPools: slots.map((slot) => ({
              label: slot.playerLabel,
              samples: pack.words
                .filter((word) => word.grammaticalRole === slot.grammaticalRole)
                .slice(0, 4)
                .map((word) => word.text),
            })),
          }
        : undefined,
  };
}
