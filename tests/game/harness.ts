import { loadContentPack, type ContentPack } from "@/lib/content";
import { createRoomCommands, type RoomCommands } from "@/lib/game";
import { createInMemoryRoomStore, type RoomStore } from "@/lib/game/room-store";
import type { AiComposer } from "@/lib/game/types";

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
  store?: RoomStore;
  ai?: AiComposer;
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
    store: options?.store ?? createInMemoryRoomStore(),
  ai: options?.ai,
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

export async function openLobby(commands: RoomCommands): Promise<string> {
  const created = await commands.createRoom(host, { displayName: "Alex" });
  await commands.joinRoom(priya, {
    code: created.roomCode,
    displayName: "Priya",
  });
  await commands.joinRoom(sam, { code: created.roomCode, displayName: "Sam" });
  await commands.joinRoom(lee, { code: created.roomCode, displayName: "Lee" });
  return created.roomCode;
}

export async function enterSelecting(
  commands: RoomCommands,
  advanceTime: (ms: number) => void,
  roomCode: string,
) {
  await commands.startRound(host, roomCode);
  advanceTime(12_001);
  await commands.heartbeat(host, roomCode);
}

/**
 * The default AI composer resolves off the game's fake clock — it settles via
 * real microtask/macrotask ticks. Await this after any action that may cross
 * the selecting → composing → reveal boundary before asserting on phase.
 */
export function flushAsync(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export async function playThroughSelection(
  commands: RoomCommands,
  advanceTime: (ms: number) => void,
) {
  const roomCode = await openLobby(commands);
  const goblin = (await commands.getHostView(host, roomCode)).teams.find(
    (team) => team.id === "goblin",
  );
  if (!goblin) throw new Error("missing Goblin");
  await commands.movePlayer(host, roomCode, priya.id, goblin.id);
  await commands.movePlayer(host, roomCode, sam.id, goblin.id);
  await enterSelecting(commands, advanceTime, roomCode);
  for (const actor of [priya, sam, lee]) {
    const optionId = (await commands.getPlayerView(actor, roomCode)).selection!.options[0].id;
    await commands.submitChoice(actor, roomCode, optionId);
  }
  await flushAsync();
  return roomCode;
}

export async function reachVoting(
  commands: RoomCommands,
  advanceTime: (ms: number) => void,
) {
  const roomCode = await playThroughSelection(commands, advanceTime);
  for (let i = 0; i < 80; i += 1) {
    if ((await commands.getPlayerView(priya, roomCode)).phase === "voting") {
      return roomCode;
    }
    advanceTime(4_001);
    await commands.heartbeat(host, roomCode);
  }
  throw new Error("did not reach voting");
}
