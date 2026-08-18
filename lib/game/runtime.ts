import { loadContentPack } from "@/lib/content";
import { createRoomCommands, type RoomCommands } from "@/lib/game";

const globalForGame = globalThis as { __verseClashCommands?: RoomCommands };

export function getRoomCommands(): RoomCommands {
  if (!globalForGame.__verseClashCommands) {
    const loaded = loadContentPack();
    if (!loaded.ok) {
      throw new Error(loaded.issues.map((issue) => issue.message).join("; "));
    }
    globalForGame.__verseClashCommands = createRoomCommands({
      pack: loaded.pack,
      clock: { now: () => Date.now() },
      random: Math.random,
      roomUrl: (code) => `/room/${code}`,
    });
  }
  return globalForGame.__verseClashCommands;
}
