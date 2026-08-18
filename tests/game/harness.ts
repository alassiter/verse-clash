import { loadContentPack, type ContentPack } from "@/lib/content";
import { createRoomCommands, type RoomCommands } from "@/lib/game";

export function samplePack(): ContentPack {
  const result = loadContentPack();
  if (!result.ok) {
    throw new Error(result.issues.map((issue) => issue.message).join("; "));
  }
  return result.pack;
}

export function createGame(options?: {
  pack?: ContentPack;
  now?: number;
  random?: () => number;
}): {
  commands: RoomCommands;
  advanceTime: (ms: number) => void;
  setNow: (ms: number) => void;
} {
  let now = options?.now ?? 1_700_000_000_000;
  const pack = options?.pack ?? samplePack();
  const commands = createRoomCommands({
    pack,
    clock: { now: () => now },
    random: options?.random ?? (() => 0.1),
    roomUrl: (code) => `/room/${code}`,
  });
  return {
    commands,
    advanceTime: (ms: number) => {
      now += ms;
    },
    setNow: (ms: number) => {
      now = ms;
    },
  };
}

export const host = { id: "host-1" };
export const priya = { id: "player-priya" };
export const sam = { id: "player-sam" };
export const lee = { id: "player-lee" };
export const jo = { id: "player-jo" };

export function openLobby(commands: RoomCommands): string {
  const created = commands.createRoom(host, { displayName: "Alex" });
  commands.joinRoom(priya, {
    code: created.roomCode,
    displayName: "Priya",
  });
  commands.joinRoom(sam, { code: created.roomCode, displayName: "Sam" });
  commands.joinRoom(lee, { code: created.roomCode, displayName: "Lee" });
  return created.roomCode;
}

export function enterSelecting(
  commands: RoomCommands,
  advanceTime: (ms: number) => void,
  roomCode: string,
) {
  commands.startRound(host, roomCode);
  advanceTime(12_001);
  commands.heartbeat(host, roomCode);
}

export function playThroughSelection(
  commands: RoomCommands,
  advanceTime: (ms: number) => void,
) {
  const roomCode = openLobby(commands);
  const goblin = commands
    .getHostView(host, roomCode)
    .teams.find((team) => team.id === "goblin");
  if (!goblin) throw new Error("missing Goblin");
  commands.movePlayer(host, roomCode, priya.id, goblin.id);
  commands.movePlayer(host, roomCode, sam.id, goblin.id);
  enterSelecting(commands, advanceTime, roomCode);
  for (const actor of [priya, sam, lee]) {
    const optionId = commands.getPlayerView(actor, roomCode).selection!.options[0].id;
    commands.submitChoice(actor, roomCode, optionId);
  }
  return roomCode;
}

export function reachVoting(
  commands: RoomCommands,
  advanceTime: (ms: number) => void,
) {
  const roomCode = playThroughSelection(commands, advanceTime);
  for (let i = 0; i < 80; i += 1) {
    if (commands.getPlayerView(priya, roomCode).phase === "voting") {
      return roomCode;
    }
    advanceTime(4_001);
    commands.heartbeat(host, roomCode);
  }
  throw new Error("did not reach voting");
}

