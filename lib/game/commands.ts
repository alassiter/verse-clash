import { cyclingFallback } from "@/lib/content";
import {
  current,
  dealNextHandForPlayer,
  enter,
  leave,
  pickNextPrompt,
  tick,
  type AiHooks,
  type PhaseContext,
} from "@/lib/game/phase";
import {
  currentRound,
  REVEAL_EMOJIS,
  TEAM_SEEDS,
  type PlayerState,
  type RoomState,
} from "@/lib/game/state";
import type {
  Actor,
  AiComposer,
  ComposeJudgeInput,
  ComposeJudgeResult,
  RoomCommandDeps,
  RoomCommands,
} from "@/lib/game/types";
import { hostView, playerView } from "@/lib/game/views";

function defaultComposeAndJudge(
  pack: RoomCommandDeps["pack"],
  random: () => number,
): AiComposer["composeAndJudge"] {
  return async (input: ComposeJudgeInput): Promise<ComposeJudgeResult> => ({
    requestId: input.requestId,
    compositions: input.teams.map((team) => ({
      teamId: team.teamId,
      segments: cyclingFallback(pack, team.fills, random),
      source: "deterministic_fallback" as const,
    })),
  });
}

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
const SAVE_RETRY_ATTEMPTS = 5;
const CREATE_ROOM_ATTEMPTS = 50;

function makeCode(random: () => number): string {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length) % CODE_ALPHABET.length];
  }
  return code;
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
  const store = deps.store;
  const pack = deps.pack;
  const now = () => deps.clock.now();
  let codeSerial = 0;
  const rooms = new Map<string, RoomState>();
  const roomVersions = new Map<string, number>();

  const composeAndJudge = deps.ai?.composeAndJudge ?? defaultComposeAndJudge(pack, deps.random);
  const runInBackground = deps.runInBackground ?? ((work) => {
    void work;
  });
  const ai: AiHooks = {
    composeAndJudge,
    getRoom: (roomId: string) => rooms.get(roomId),
    persistRoom: async (roomId: string) => {
      const room = rooms.get(roomId);
      const version = roomVersions.get(roomId);
      if (!room || version === undefined) return;
      if (await store.save(room.code, room, version)) {
        roomVersions.set(roomId, version + 1);
        return;
      }
      const latest = await store.load(room.code);
      if (latest && (await store.save(room.code, room, latest.version))) {
        roomVersions.set(roomId, latest.version + 1);
      }
    },
    now,
    runInBackground,
  };

  const ctxFor = (at: number): PhaseContext => ({
    pack,
    random: deps.random,
    now: at,
    ai,
  });

  // Loads the room, runs `mutate` against the in-memory object, and saves
  // it back with optimistic concurrency: if another request saved a change
  // to this room in between, reload and rerun `mutate` from scratch.
  async function withRoom<T>(roomCode: string, mutate: (room: RoomState) => T): Promise<T> {
    const code = roomCode.toUpperCase();
    for (let attempt = 0; attempt < SAVE_RETRY_ATTEMPTS; attempt += 1) {
      const found = await store.load(code);
      if (!found) {
        throw new RoomError("not_found", "No room uses that code.");
      }
      rooms.set(code, found.state);
      roomVersions.set(code, found.version);
      const result = mutate(found.state);
      if (await store.save(code, found.state, found.version)) {
        roomVersions.set(code, found.version + 1);
        return result;
      }
    }
    throw new RoomError(
      "conflict",
      "That action couldn't be saved because the room changed at the same time. Try again.",
    );
  }

  async function readRoom<T>(roomCode: string, read: (room: RoomState) => T): Promise<T> {
    const found = await store.load(roomCode.toUpperCase());
    if (!found) {
      throw new RoomError("not_found", "No room uses that code.");
    }
    return read(found.state);
  }

  const commands: RoomCommands = {
    async createRoom(actor, input) {
      const createdAt = now();
      for (let attempt = 0; attempt < CREATE_ROOM_ATTEMPTS; attempt += 1) {
        codeSerial += 1;
        const code = makeCode(() => (deps.random() + codeSerial * 0.17) % 1).toUpperCase();
        const room: RoomState = {
          id: code,
          code,
          hostId: actor.id,
          status: "lobby",
          paused: false,
          pauseStartedAt: null,
          contentMode: "work_safe",
          nextPromptId: pickNextPrompt(pack, deps.random, null).id,
          teams: TEAM_SEEDS.map((seed) => ({ ...seed, totalScore: 0, roundsWon: 0 })),
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
        if (await store.insert(room)) {
          rooms.set(code, room);
          roomVersions.set(code, 0);
          return { roomCode: code, url: deps.roomUrl(code) };
        }
      }
      throw new RoomError("code_exhausted", "Could not allocate a room code. Try again.");
    },

    async joinRoom(actor, input) {
      await withRoom(input.code, (room) => {
        tick(room, ctxFor(now()));
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
      });
    },

    async getPlayerView(actor, roomCode) {
      return readRoom(roomCode, (room) => playerView(room, requirePlayer(room, actor), pack));
    },

    async getHostView(actor, roomCode) {
      return readRoom(roomCode, (room) => hostView(room, requireHost(room, actor), pack, now()));
    },

    async heartbeat(actor, roomCode) {
      await withRoom(roomCode, (room) => {
        tick(room, ctxFor(now()));
        touch(requirePlayer(room, actor), now());
      });
    },

    async setReady(actor, roomCode, ready) {
      await withRoom(roomCode, (room) => {
        tick(room, ctxFor(now()));
        const player = requirePlayer(room, actor);
        player.isReady = ready;
        touch(player, now());
      });
    },

    async shuffleTeams(actor, roomCode) {
      await withRoom(roomCode, (room) => {
        tick(room, ctxFor(now()));
        requireHost(room, actor);
        const seated = room.players.filter((player) => player.teamId && !player.isHost);
        for (let i = seated.length - 1; i > 0; i -= 1) {
          const j = Math.floor(deps.random() * (i + 1));
          [seated[i], seated[j]] = [seated[j], seated[i]];
        }
        seated.forEach((player, index) => {
          player.teamId = room.teams[index % room.teams.length].id;
        });
      });
    },

    async movePlayer(actor, roomCode, playerId, teamId) {
      await withRoom(roomCode, (room) => {
        tick(room, ctxFor(now()));
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
      });
    },

    async startRound(actor, roomCode) {
      await withRoom(roomCode, (room) => {
        tick(room, ctxFor(now()));
        requireHost(room, actor);
        if (current(room) !== "gathering") {
          throw new RoomError("wrong_phase", "Start the next round from standings.");
        }
        leave(room, ctxFor(now()));
      });
    },

    async submitChoice(actor, roomCode, optionId) {
      await withRoom(roomCode, (room) => {
        tick(room, ctxFor(now()));
        const player = requirePlayer(room, actor);
        const round = currentRound(room);
        if (!round || current(room) !== "selecting") {
          throw new RoomError("wrong_phase", "Selection is not open.");
        }
        const assignment = round.assignments.find(
          (entry) => entry.playerId === player.id && !entry.submittedAt,
        );
        if (!assignment) {
          if (round.assignments.some((entry) => entry.playerId === player.id)) return;
          throw new RoomError("no_assignment", "Wait for the next round.");
        }
        if (!assignment.options.some((option) => option.id === optionId)) {
          throw new RoomError("bad_option", "That option was not dealt to you.");
        }
        assignment.selectedOptionId = optionId;
        assignment.submittedAt = now();
        touch(player, now());
        dealNextHandForPlayer(pack, room, round, player.id, deps.random);
        if (
          round.assignments.length > 0 &&
          round.assignments.every((entry) => entry.submittedAt)
        ) {
          leave(room, ctxFor(now()));
        }
      });
    },

    async sendTeamMessage(actor, roomCode, body) {
      await withRoom(roomCode, (room) => {
        tick(room, ctxFor(now()));
        const player = requirePlayer(room, actor);
        if (!player.teamId) throw new RoomError("no_team", "Join a team to chat.");
        room.teamMessages.push({ teamId: player.teamId, playerId: player.id, body });
      });
    },

    async sendTeamEmoji(actor, roomCode, emoji) {
      await commands.sendTeamMessage(actor, roomCode, emoji);
    },

        async pause(actor, roomCode) {
      await withRoom(roomCode, (room) => {
        tick(room, ctxFor(now()));
        requireHost(room, actor);
        if (room.paused) return;
        room.paused = true;
        room.pauseStartedAt = now();
      });
    },

    async resume(actor, roomCode) {
      await withRoom(roomCode, (room) => {
        tick(room, ctxFor(now()));
        requireHost(room, actor);
        if (!room.paused) return;
        const round = currentRound(room);
        const pausedFor = now() - (room.pauseStartedAt ?? now());
        if (round?.phaseEndsAt) {
          round.phaseEndsAt += pausedFor;
        }
        room.paused = false;
        room.pauseStartedAt = null;
      });
    },

    async endRound(actor, roomCode) {
      await withRoom(roomCode, (room) => {
        tick(room, ctxFor(now()));
        requireHost(room, actor);
        const phase = current(room);
        if (phase === "gathering" || phase === "standings" || phase === "ended") {
          throw new RoomError("wrong_phase", "There is no round to end.");
        }
        enter(room, ctxFor(now()), "standings");
      });
    },

    async sendRevealReaction(actor, roomCode, emoji, segmentIndex) {
      await withRoom(roomCode, (room) => {
        tick(room, ctxFor(now()));
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
        const targetIndex = segmentIndex ?? round.reveal.segmentIndex;
        const segment = shown?.segments[targetIndex];
        if (
          !segment ||
          segment.type !== "contribution" ||
          targetIndex > round.reveal.segmentIndex
        ) {
          throw new RoomError("bad_segment", "That word is not on stage yet.");
        }
        round.reactions = round.reactions.filter(
          (entry) =>
            !(
              entry.playerId === player.id &&
              entry.teamIndex === round.reveal.teamIndex &&
              entry.segmentIndex === targetIndex
            ),
        );
        round.reactions.push({
          playerId: player.id,
          emoji,
          teamIndex: round.reveal.teamIndex,
          segmentIndex: targetIndex,
        });
      });
    },

    async vote(actor, roomCode, teamId) {
      await withRoom(roomCode, (room) => {
        tick(room, ctxFor(now()));
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
      });
    },

    async startNextRound(actor, roomCode) {
      await withRoom(roomCode, (room) => {
        tick(room, ctxFor(now()));
        requireHost(room, actor);
        if (current(room) !== "standings") {
          throw new RoomError("wrong_phase", "Finish the current round first.");
        }
        leave(room, ctxFor(now()));
      });
    },

    async endGame(actor, roomCode) {
      await withRoom(roomCode, (room) => {
        tick(room, ctxFor(now()));
        requireHost(room, actor);
        enter(room, ctxFor(now()), "ended");
      });
    },

    async restartGame(actor, roomCode) {
      await withRoom(roomCode, (room) => {
        tick(room, ctxFor(now()));
        requireHost(room, actor);
        if (current(room) !== "ended") {
          throw new RoomError("wrong_phase", "End the game before starting over.");
        }
        room.status = "lobby";
        room.paused = false;
        room.pauseStartedAt = null;
        room.rounds = [];
        room.teamMessages = [];
        room.nextPromptId = pickNextPrompt(pack, deps.random, null).id;
        room.teams = TEAM_SEEDS.map((seed) => ({ ...seed, totalScore: 0, roundsWon: 0 }));
        for (const player of room.players) {
          player.teamId = null;
          player.isReady = false;
          player.joinedRound = 0;
        }
      });
    },
  };

  return commands;
}
