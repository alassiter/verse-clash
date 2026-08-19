import { current, enter, leave, tick, type PhaseContext } from "@/lib/game/phase";
import {
  currentRound,
  REVEAL_EMOJIS,
  TEAM_SEEDS,
  type PlayerState,
  type RoomState,
} from "@/lib/game/state";
import type { Actor, RoomCommandDeps, RoomCommands } from "@/lib/game/types";
import { hostView, playerView } from "@/lib/game/views";

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

export function createRoomCommands(deps: RoomCommandDeps): RoomCommands {
  const rooms = deps.rooms ?? new Map<string, RoomState>();
  const pack = deps.pack;
  const now = () => deps.clock.now();
  let codeSerial = 0;

  const ctxFor = (at: number): PhaseContext => ({
    pack,
    random: deps.random,
    now: at,
  });

  const roomAfterTick = (roomCode: string): RoomState => {
    const room = requireRoom(rooms, roomCode);
    tick(room, ctxFor(now()));
    return room;
  };

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
      const room = roomAfterTick(input.code);
      const existing = room.players.find((player) => player.id === actor.id);
      if (existing) {
        touch(existing, now());
        return;
      }
      const round = currentRound(room);
      const joinedRound =
        round && current(room) !== "gathering" && current(room) !== "ended"
          ? round.number + 1
          : 0;
      room.players.push({
        id: actor.id,
        displayName: input.displayName,
        teamId: null,
        isHost: false,
        isReady: false,
        lastSeenAt: now(),
        joinedRound,
      });
    },

    getPlayerView(actor, roomCode) {
      const room = requireRoom(rooms, roomCode);
      return playerView(room, requirePlayer(room, actor), pack);
    },

    getHostView(actor, roomCode) {
      const room = requireRoom(rooms, roomCode);
      return hostView(room, requireHost(room, actor), pack, now());
    },

    heartbeat(actor, roomCode) {
      const room = roomAfterTick(roomCode);
      touch(requirePlayer(room, actor), now());
    },

    setReady(actor, roomCode, ready) {
      const room = roomAfterTick(roomCode);
      const player = requirePlayer(room, actor);
      player.isReady = ready;
      touch(player, now());
    },

    shuffleTeams(actor, roomCode) {
      const room = roomAfterTick(roomCode);
      requireHost(room, actor);
      const seated = room.players.filter((player) => player.teamId && !player.isHost);
      for (let i = seated.length - 1; i > 0; i -= 1) {
        const j = Math.floor(deps.random() * (i + 1));
        [seated[i], seated[j]] = [seated[j], seated[i]];
      }
      seated.forEach((player, index) => {
        player.teamId = room.teams[index % room.teams.length].id;
      });
    },

    movePlayer(actor, roomCode, playerId, teamId) {
      const room = roomAfterTick(roomCode);
      requireHost(room, actor);
      const player = room.players.find((entry) => entry.id === playerId);
      if (!player) {
        throw new RoomError("not_in_room", "That player is not in this room.");
      }
      if (player.isHost && teamId) {
        throw new RoomError("host_cannot_play", "The host cannot join a team.");
      }
      if (teamId && !room.teams.some((team) => team.id === teamId)) {
        throw new RoomError("bad_team", "Unknown team.");
      }
      player.teamId = teamId;
    },

    startRound(actor, roomCode) {
      const room = roomAfterTick(roomCode);
      requireHost(room, actor);
      if (current(room) !== "gathering") {
        throw new RoomError("wrong_phase", "Start the next round from standings.");
      }
      leave(room, ctxFor(now()));
    },

    submitChoice(actor, roomCode, optionId) {
      const room = roomAfterTick(roomCode);
      const player = requirePlayer(room, actor);
      const round = currentRound(room);
      if (!round || current(room) !== "selecting") {
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
      if (
        round.assignments.length > 0 &&
        round.assignments.every((entry) => entry.submittedAt)
      ) {
        leave(room, ctxFor(now()));
      }
    },

    sendTeamMessage(actor, roomCode, body) {
      const room = roomAfterTick(roomCode);
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
      const room = roomAfterTick(roomCode);
      requireHost(room, actor);
      if (room.paused) return;
      room.paused = true;
      room.pauseStartedAt = now();
    },

    resume(actor, roomCode) {
      const room = roomAfterTick(roomCode);
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

    endRound(actor, roomCode) {
      const room = roomAfterTick(roomCode);
      requireHost(room, actor);
      const phase = current(room);
      if (phase === "gathering" || phase === "standings" || phase === "ended") {
        throw new RoomError("wrong_phase", "There is no round to end.");
      }
      enter(room, ctxFor(now()), "standings");
    },

    sendRevealReaction(actor, roomCode, emoji, segmentIndex) {
      const room = roomAfterTick(roomCode);
      const player = requirePlayer(room, actor);
      if (current(room) !== "reveal") {
        throw new RoomError("wrong_phase", "Reactions are for the reveal.");
      }
      const round = currentRound(room);
      if (!round) {
        throw new RoomError("wrong_phase", "Reactions are for the reveal.");
      }
      if (!REVEAL_EMOJIS.includes(emoji as (typeof REVEAL_EMOJIS)[number])) {
        throw new RoomError("bad_emoji", "Use one of 😂 👏 🤯 ❤️ 😮");
      }
      const shown = round.compositions[round.reveal.teamIndex];
      const segment = shown?.segments[segmentIndex];
      if (
        !segment ||
        segment.type !== "contribution" ||
        segmentIndex > round.reveal.segmentIndex
      ) {
        throw new RoomError("bad_segment", "That word is not on stage yet.");
      }
      round.reactions = round.reactions.filter(
        (entry) =>
          !(
            entry.playerId === player.id &&
            entry.teamIndex === round.reveal.teamIndex &&
            entry.segmentIndex === segmentIndex
          ),
      );
      round.reactions.push({
        playerId: player.id,
        emoji,
        teamIndex: round.reveal.teamIndex,
        segmentIndex,
      });
    },

    vote(actor, roomCode, teamId) {
      const room = roomAfterTick(roomCode);
      const player = requirePlayer(room, actor);
      const round = currentRound(room);
      if (!round || current(room) !== "voting") {
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

    startNextRound(actor, roomCode) {
      const room = roomAfterTick(roomCode);
      requireHost(room, actor);
      if (current(room) !== "standings") {
        throw new RoomError("wrong_phase", "Finish the current round first.");
      }
      leave(room, ctxFor(now()));
    },

    endGame(actor, roomCode) {
      const room = roomAfterTick(roomCode);
      requireHost(room, actor);
      enter(room, ctxFor(now()), "ended");
    },

    restartGame(actor, roomCode) {
      const room = roomAfterTick(roomCode);
      requireHost(room, actor);
      if (current(room) !== "ended") {
        throw new RoomError("wrong_phase", "End the game before starting over.");
      }
      room.status = "lobby";
      room.paused = false;
      room.pauseStartedAt = null;
      room.promptCursor = 0;
      room.rounds = [];
      room.teamMessages = [];
      room.teams = TEAM_SEEDS.map((seed) => ({ ...seed, wins: 0 }));
      for (const player of room.players) {
        player.teamId = null;
        player.isReady = false;
        player.joinedRound = 0;
      }
    },
  };

  return commands;
}
