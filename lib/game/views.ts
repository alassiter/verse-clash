import type { ContentPack } from "@/lib/content";
import { slotsForTemplate } from "@/lib/content/deal";
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
  lobby: { name: "Lobby", instruction: "Waiting for the host to start" },
  prompt_reveal: { name: "Prompt", instruction: "Read the shared prompt" },
  selecting: { name: "Selecting", instruction: "Choose one option" },
  assembling: { name: "Assembling", instruction: "The piece is coming together" },
  reveal: { name: "Reveal", instruction: "Watch the shared stage" },
  voting: { name: "Voting", instruction: "Pick a Crowd Favorite" },
  standings: { name: "Standings", instruction: "See which team is ahead" },
  ended: { name: "Ended", instruction: "The game has ended" },
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
  const hideWords =
    !round ||
    round.phase === "lobby" ||
    round.phase === "prompt_reveal" ||
    round.phase === "selecting" ||
    round.phase === "assembling";
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
  const copy = PHASE_COPY[roomPhase(room)];
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
      round.phase !== "lobby" &&
      round.phase !== "ended" &&
      player.joinedRound > round.number &&
      !assignment,
  );
  const mateViews = teammates(room, player);
  const view: PlayerView = {
    phase: roomPhase(room),
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

  if (view.phase === "lobby") {
    view.lobby = {
      players: room.players.map((entry) => ({
        displayName: entry.displayName,
        isHost: entry.isHost,
        teamName: teamById(room, entry.teamId)?.name ?? null,
        isReady: entry.isReady,
      })),
    };
  }

  if (prompt && view.phase !== "lobby") {
    view.prompt = {
      text: prompt.text,
      tease: prompt.tease,
      formatHint: prompt.formatHint,
    };
  }

  if (assignment) {
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

  if (round && (view.phase === "reveal" || view.phase === "assembling")) {
    const compositions = round.compositions;
    const current = compositions[round.reveal.teamIndex] ?? compositions[0];
    const teamName =
      room.teams.find((entry) => entry.id === current?.teamId)?.name ?? "";
    const visible = current?.segments.slice(0, round.reveal.segmentIndex + 1) ?? [];
    const last = visible.at(-1);
    view.reveal = {
      teamName,
      composition: current?.segments ?? [],
      visibleSegments: visible,
      attribution:
        last?.type === "contribution" ? `Selected by ${last.displayName}` : undefined,
      bursts: round.reactions.map((reaction) => ({ emoji: reaction.emoji })),
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
      roomPhase(room) === "lobby" || roomPhase(room) === "standings"
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

export function roomPhase(room: RoomState): PlayerView["phase"] {
  if (room.status === "ended") return "ended";
  if (room.status === "lobby") return "lobby";
  return currentRound(room)?.phase ?? "lobby";
}
