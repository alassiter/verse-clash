import { loadContentPack } from "@/lib/content";
import { createRoomCommands, RoomError, type HostView, type RoomCommands } from "@/lib/game";
import { TEAM_SEEDS, type RoomState } from "@/lib/game/state";

const globalForGame = globalThis as {
  __verseClashRooms?: Map<string, RoomState>;
  __verseClashCommands?: RoomCommands;
};

function commandDeps(rooms: Map<string, RoomState>) {
  const loaded = loadContentPack();
  if (!loaded.ok) {
    throw new Error(loaded.issues.map((issue) => issue.message).join("; "));
  }
  return {
    pack: loaded.pack,
    clock: { now: () => Date.now() },
    random: Math.random,
    roomUrl: (code: string) => `/room/${code}`,
    rooms,
  };
}

function gatheringRoom(view: HostView, hostId: string): RoomState {
  return {
    id: view.roomCode,
    code: view.roomCode,
    hostId,
    status: "lobby",
    paused: false,
    pauseStartedAt: null,
    contentMode: "work_safe",
    promptCursor: 0,
    teams: TEAM_SEEDS.map((seed) => ({ ...seed, wins: 0 })),
    players: view.players.map((player) => ({
      id: player.id,
      displayName: player.displayName,
      teamId: null,
      isHost: player.isHost,
      isReady: false,
      lastSeenAt: player.lastSeenAt,
      joinedRound: 0,
    })),
    rounds: [],
    teamMessages: [],
  };
}

function withRestart(legacy: RoomCommands): RoomCommands {
  if (typeof legacy.restartGame === "function") {
    return legacy;
  }
  return {
    ...legacy,
    restartGame(actor, roomCode) {
      const view = legacy.getHostView(actor, roomCode);
      if (view.phase !== "ended") {
        throw new RoomError("wrong_phase", "End the game before starting over.");
      }
      const rooms = new Map<string, RoomState>();
      rooms.set(view.roomCode, gatheringRoom(view, actor.id));
      globalForGame.__verseClashRooms = rooms;
      globalForGame.__verseClashCommands = undefined;
    },
  };
}

export function getRoomCommands(): RoomCommands {
  if (globalForGame.__verseClashRooms) {
    return createRoomCommands(commandDeps(globalForGame.__verseClashRooms));
  }
  if (globalForGame.__verseClashCommands) {
    return withRestart(globalForGame.__verseClashCommands);
  }
  const rooms = new Map<string, RoomState>();
  globalForGame.__verseClashRooms = rooms;
  return createRoomCommands(commandDeps(rooms));
}
