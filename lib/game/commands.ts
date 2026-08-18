import {
  assembleComposition,
  dealForTeam,
  type ContentPack,
  type CompositionFill,
} from "@/lib/content";
import {
  currentRound,
  PROMPT_REVEAL_MS,
  REVEAL_EMOJIS,
  REVEAL_SEGMENT_MS,
  SELECTING_MS,
  TEAM_SEEDS,
  type AssignmentState,
  type PlayerState,
  type RoomState,
  type RoundState,
} from "@/lib/game/state";
import type { Actor, RoomCommandDeps, RoomCommands } from "@/lib/game/types";
import { hostView, playerView, roomPhase } from "@/lib/game/views";

export class RoomError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "RoomError";
  }
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode(random: () => number): string {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length) % CODE_ALPHABET.length];
  }
  return code;
}

function requireRoom(rooms: Map<string, RoomState>, roomCode: string): RoomState {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room) {
    throw new RoomError("not_found", "No room uses that code.");
  }
  return room;
}

function requirePlayer(room: RoomState, actor: Actor): PlayerState {
  const player = room.players.find((entry) => entry.id === actor.id);
  if (!player) {
    throw new RoomError("not_in_room", "You are not in this room.");
  }
  return player;
}

function requireHost(room: RoomState, actor: Actor): PlayerState {
  const player = requirePlayer(room, actor);
  if (!player.isHost) {
    throw new RoomError("host_only", "Only the host can do that.");
  }
  return player;
}

function touch(player: PlayerState, now: number) {
  player.lastSeenAt = now;
}

function smallestTeamId(room: RoomState): string {
  let best = room.teams[0];
  let bestCount = Number.POSITIVE_INFINITY;
  for (const team of room.teams) {
    const count = room.players.filter((player) => player.teamId === team.id).length;
    if (count < bestCount) {
      best = team;
      bestCount = count;
    }
  }
  return best.id;
}

function upcomingPrompt(pack: ContentPack, room: RoomState) {
  return pack.prompts[room.promptCursor % pack.prompts.length];
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

function allSubmitted(round: RoundState): boolean {
  return (
    round.assignments.length > 0 &&
    round.assignments.every((assignment) => assignment.submittedAt)
  );
}

function assembleRound(
  room: RoomState,
  pack: ContentPack,
  round: RoundState,
  at: number,
) {
  round.phase = "assembling";
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
        const word = pack.words.find((entry) => entry.id === option.id);
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
      segments: assembleComposition(pack, {
        templateId: round.templateId,
        fills,
      }).segments,
    };
  });
  round.reveal = { teamIndex: 0, segmentIndex: 0 };
  round.phaseEndsAt = at;
}

function openReveal(round: RoundState, at: number) {
  round.phase = "reveal";
  round.phaseEndsAt = at + REVEAL_SEGMENT_MS;
}

function stepReveal(round: RoundState, at: number) {
  const current = round.compositions[round.reveal.teamIndex];
  if (!current) {
    round.phase = "voting";
    round.phaseEndsAt = null;
    return;
  }
  if (round.reveal.segmentIndex + 1 < current.segments.length) {
    round.reveal.segmentIndex += 1;
    round.phaseEndsAt = at + REVEAL_SEGMENT_MS;
    return;
  }
  if (round.reveal.teamIndex + 1 < round.compositions.length) {
    round.reveal.teamIndex += 1;
    round.reveal.segmentIndex = 0;
    round.phaseEndsAt = at + REVEAL_SEGMENT_MS;
    return;
  }
  round.phase = "voting";
  round.phaseEndsAt = null;
}

function beginRound(room: RoomState, pack: ContentPack, deps: RoomCommandDeps) {
  const prompt = upcomingPrompt(pack, room);
  const templateId = prompt.compatibleTemplateIds[0];
  const number = (currentRound(room)?.number ?? 0) + 1;
  const seated = room.players.filter((player) => player.teamId);
  const assignments: AssignmentState[] = [];
  for (const team of room.teams) {
    const members = seated.filter(
      (player) => player.teamId === team.id && player.joinedRound <= number,
    );
    if (members.length === 0) continue;
    const dealt = dealForTeam(pack, {
      promptId: prompt.id,
      templateId,
      playerIds: members.map((member) => member.id),
      random: deps.random,
    });
    for (const assignment of dealt) {
      assignments.push({
        ...assignment,
        selectedOptionId: null,
        submittedAt: null,
      });
    }
  }
  const round: RoundState = {
    id: `round-${number}`,
    number,
    type: "straight",
    promptId: prompt.id,
    templateId,
    phase: "prompt_reveal",
    phaseEndsAt: deps.clock.now() + PROMPT_REVEAL_MS,
    assignments,
    compositions: [],
    reveal: { teamIndex: 0, segmentIndex: 0 },
    votes: [],
    reactions: [],
  };
  room.rounds.push(round);
  room.status = "in_progress";
  room.paused = false;
  room.pauseStartedAt = null;
}

function enterSelecting(room: RoomState, at: number) {
  const round = currentRound(room);
  if (!round) return;
  round.phase = "selecting";
  round.phaseEndsAt = at + SELECTING_MS;
}

function maybeTick(
  room: RoomState,
  pack: ContentPack,
  random: () => number,
  at: number,
) {
  if (room.paused) return;
  const round = currentRound(room);
  if (!round) return;
  if (round.phase === "assembling") {
    openReveal(round, at);
    return;
  }
  if (round.phaseEndsAt === null || at < round.phaseEndsAt) return;
  if (round.phase === "prompt_reveal") {
    enterSelecting(room, at);
    return;
  }
  if (round.phase === "selecting") {
    fillUnsubmitted(round, random, at);
    assembleRound(room, pack, round, at);
    openReveal(round, at);
    return;
  }
  if (round.phase === "reveal") {
    stepReveal(round, at);
  }
}

export function createRoomCommands(deps: RoomCommandDeps): RoomCommands {
  const rooms = new Map<string, RoomState>();
  const pack = deps.pack;
  const now = () => deps.clock.now();
  let codeSerial = 0;

  const commands: RoomCommands = {
    createRoom(actor, input) {
      codeSerial += 1;
      let code = makeCode(() => (deps.random() + codeSerial * 0.17) % 1).toUpperCase();
      while (rooms.has(code)) {
        codeSerial += 1;
        code = makeCode(() => (deps.random() + codeSerial * 0.17) % 1).toUpperCase();
      }
      const createdAt = now();
      const room: RoomState = {
        id: code,
        code,
        hostId: actor.id,
        status: "lobby",
        paused: false,
        pauseStartedAt: null,
        contentMode: "work_safe",
        promptCursor: 0,
        teams: TEAM_SEEDS.map((seed) => ({ ...seed, wins: 0 })),
        players: [
          {
            id: actor.id,
            displayName: input.displayName,
            teamId: null,
            isHost: true,
            isReady: false,
            lastSeenAt: createdAt,
            joinedRound: 0,
          },
        ],
        rounds: [],
        teamMessages: [],
      };
      rooms.set(code, room);
      return { roomCode: code, url: deps.roomUrl(code) };
    },

    joinRoom(actor, input) {
      const room = requireRoom(rooms, input.code);
      const existing = room.players.find((player) => player.id === actor.id);
      if (existing) {
        touch(existing, now());
        return;
      }
      const round = currentRound(room);
      const joinedRound =
        round && room.status === "in_progress" ? round.number + 1 : 0;
      room.players.push({
        id: actor.id,
        displayName: input.displayName,
        teamId: smallestTeamId(room),
        isHost: false,
        isReady: false,
        lastSeenAt: now(),
        joinedRound,
      });
    },

    getPlayerView(actor, roomCode) {
      const room = requireRoom(rooms, roomCode);
      maybeTick(room, pack, deps.random, now());
      return playerView(room, requirePlayer(room, actor), pack);
    },

    getHostView(actor, roomCode) {
      const room = requireRoom(rooms, roomCode);
      maybeTick(room, pack, deps.random, now());
      return hostView(room, requireHost(room, actor), pack, now());
    },

    heartbeat(actor, roomCode) {
      const room = requireRoom(rooms, roomCode);
      maybeTick(room, pack, deps.random, now());
      touch(requirePlayer(room, actor), now());
    },

    setReady(actor, roomCode, ready) {
      const room = requireRoom(rooms, roomCode);
      const player = requirePlayer(room, actor);
      player.isReady = ready;
      touch(player, now());
    },

    shuffleTeams(actor, roomCode) {
      const room = requireRoom(rooms, roomCode);
      requireHost(room, actor);
      const seated = room.players.filter((player) => player.teamId);
      for (let i = seated.length - 1; i > 0; i -= 1) {
        const j = Math.floor(deps.random() * (i + 1));
        [seated[i], seated[j]] = [seated[j], seated[i]];
      }
      seated.forEach((player, index) => {
        player.teamId = room.teams[index % room.teams.length].id;
      });
    },

    movePlayer(actor, roomCode, playerId, teamId) {
      const room = requireRoom(rooms, roomCode);
      requireHost(room, actor);
      const player = room.players.find((entry) => entry.id === playerId);
      if (!player) {
        throw new RoomError("not_in_room", "That player is not in this room.");
      }
      if (teamId && !room.teams.some((team) => team.id === teamId)) {
        throw new RoomError("bad_team", "Unknown team.");
      }
      player.teamId = teamId;
    },

    skipPrompt(actor, roomCode) {
      const room = requireRoom(rooms, roomCode);
      requireHost(room, actor);
      room.promptCursor = (room.promptCursor + 1) % pack.prompts.length;
    },

    startRound(actor, roomCode) {
      const room = requireRoom(rooms, roomCode);
      requireHost(room, actor);
      if (room.status !== "lobby") {
        throw new RoomError("wrong_phase", "Start the next round from standings.");
      }
      beginRound(room, pack, deps);
    },

    submitChoice(actor, roomCode, optionId) {
      const room = requireRoom(rooms, roomCode);
      const player = requirePlayer(room, actor);
      const round = currentRound(room);
      if (!round || round.phase !== "selecting") {
        throw new RoomError("wrong_phase", "Selection is not open.");
      }
      const assignment = round.assignments.find(
        (entry) => entry.playerId === player.id,
      );
      if (!assignment) {
        throw new RoomError("no_assignment", "Wait for the next round.");
      }
      if (assignment.submittedAt) {
        return;
      }
      if (!assignment.options.some((option) => option.id === optionId)) {
        throw new RoomError("bad_option", "That option was not dealt to you.");
      }
      assignment.selectedOptionId = optionId;
      assignment.submittedAt = now();
      touch(player, now());
      if (allSubmitted(round)) {
        assembleRound(room, pack, round, now());
      }
    },

    sendTeamMessage(actor, roomCode, body) {
      const room = requireRoom(rooms, roomCode);
      const player = requirePlayer(room, actor);
      if (!player.teamId) {
        throw new RoomError("no_team", "Join a team to chat.");
      }
      room.teamMessages.push({
        teamId: player.teamId,
        playerId: player.id,
        body,
      });
    },

    sendTeamEmoji(actor, roomCode, emoji) {
      commands.sendTeamMessage(actor, roomCode, emoji);
    },

    pause(actor, roomCode) {
      const room = requireRoom(rooms, roomCode);
      requireHost(room, actor);
      if (room.paused) return;
      room.paused = true;
      room.pauseStartedAt = now();
    },

    resume(actor, roomCode) {
      const room = requireRoom(rooms, roomCode);
      requireHost(room, actor);
      if (!room.paused) return;
      const round = currentRound(room);
      const pausedFor = now() - (room.pauseStartedAt ?? now());
      if (round?.phaseEndsAt) {
        round.phaseEndsAt += pausedFor;
      }
      room.paused = false;
      room.pauseStartedAt = null;
    },

    forceAdvance(actor, roomCode) {
      const room = requireRoom(rooms, roomCode);
      requireHost(room, actor);
      const round = currentRound(room);
      const phase = roomPhase(room);
      if (phase === "prompt_reveal") {
        enterSelecting(room, now());
        return;
      }
      if (phase === "selecting" && round) {
        fillUnsubmitted(round, deps.random, now());
        assembleRound(room, pack, round, now());
        return;
      }
      if (phase === "assembling" && round) {
        openReveal(round, now());
        return;
      }
      if (phase === "reveal" && round) {
        stepReveal(round, now());
      }
    },

    advanceReveal(actor, roomCode) {
      const room = requireRoom(rooms, roomCode);
      requireHost(room, actor);
      const round = currentRound(room);
      if (!round || round.phase !== "reveal") {
        throw new RoomError("wrong_phase", "Reveal is not active.");
      }
      stepReveal(round, now());
    },

    sendRevealReaction(actor, roomCode, emoji) {
      const room = requireRoom(rooms, roomCode);
      const player = requirePlayer(room, actor);
      const round = currentRound(room);
      if (!round || round.phase !== "reveal") {
        throw new RoomError("wrong_phase", "Reactions are for the reveal.");
      }
      if (!REVEAL_EMOJIS.includes(emoji as (typeof REVEAL_EMOJIS)[number])) {
        throw new RoomError("bad_emoji", "Use one of 😂 👏 🤯 ❤️ 😮");
      }
      round.reactions.push({ playerId: player.id, emoji });
    },

    vote(actor, roomCode, teamId) {
      const room = requireRoom(rooms, roomCode);
      const player = requirePlayer(room, actor);
      const round = currentRound(room);
      if (!round || round.phase !== "voting") {
        throw new RoomError("wrong_phase", "Voting is not open.");
      }
      if (!room.teams.some((team) => team.id === teamId)) {
        throw new RoomError("bad_team", "Unknown team.");
      }
      if (round.votes.some((entry) => entry.playerId === player.id)) {
        return;
      }
      round.votes.push({ playerId: player.id, teamId });
    },

    closeVoting(actor, roomCode) {
      const room = requireRoom(rooms, roomCode);
      requireHost(room, actor);
      const round = currentRound(room);
      if (!round || round.phase !== "voting") {
        throw new RoomError("wrong_phase", "Voting is not open.");
      }
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
      round.phase = "standings";
      room.promptCursor = (room.promptCursor + 1) % pack.prompts.length;
    },

    startNextRound(actor, roomCode) {
      const room = requireRoom(rooms, roomCode);
      requireHost(room, actor);
      if (roomPhase(room) !== "standings") {
        throw new RoomError("wrong_phase", "Finish the current round first.");
      }
      beginRound(room, pack, deps);
    },

    endGame(actor, roomCode) {
      const room = requireRoom(rooms, roomCode);
      requireHost(room, actor);
      room.status = "ended";
      const round = currentRound(room);
      if (round) {
        round.phase = "ended";
      }
    },
  };

  return commands;
}
