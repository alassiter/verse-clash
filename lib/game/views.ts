import type { ContentPack } from "@/lib/content";
import { slotsForTemplate } from "@/lib/content/deal";
import { current } from "@/lib/game/phase";
import {
  currentRound,
  DISCONNECT_AFTER_MS,
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
    phase === "selecting";
  return room.players
    .filter((mate) => mate.teamId === player.teamId)
    .map((mate) => {
      const assignment = round?.assignments.find(
        (entry) => entry.playerId === mate.id,
      );
      const selected = assignment?.options.find(
        (option) => option.id === assignment.selectedOptionId,
      );
      const view: TeammateView = {
        id: mate.id,
        displayName: mate.displayName,
        submitted: Boolean(assignment?.submittedAt),
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
  const assignment = round?.assignments.find(
    (entry) => entry.playerId === player.id,
  );
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
    teamChat: player.teamId
      ? room.teamMessages
          .filter((message) => message.teamId === player.teamId)
          .map((message) => ({
            playerName:
              room.players.find((entry) => entry.id === message.playerId)
                ?.displayName ?? "Unknown",
            body: message.body,
          }))
      : [],
    waitingForNextRound: waitingForNextRound || undefined,
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

  if (assignment && phase !== "gathering" && phase !== "prompt_reveal") {
    view.selection = {
      playerLabel: assignment.playerLabel,
      options: assignment.options,
      submitted: Boolean(assignment.submittedAt),
      selectedOptionId: assignment.selectedOptionId ?? undefined,
    };
  }

  if (view.phase === "reveal" || view.phase === "voting" || view.phase === "standings") {
    view.teamChatPrimary = false;
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
    view.standings = room.teams.map((entry) => ({
      teamId: entry.id,
      teamName: entry.name,
      wins: entry.wins,
    }));
  }

  return view;
}

export function hostView(
  room: RoomState,
  player: PlayerState,
  pack: ContentPack,
  now: number,
): HostView {
  const upcoming = pack.prompts[room.promptCursor % pack.prompts.length];
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
