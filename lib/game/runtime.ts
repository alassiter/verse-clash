import { loadContentPack } from "@/lib/content";
import { createRoomCommands, type RoomCommands } from "@/lib/game";
import { createInMemoryRoomStore, type RoomStore } from "@/lib/game/room-store";
import { createSupabaseRoomStore } from "@/lib/game/supabase-room-store";

const globalForGame = globalThis as {
  __verseClashCommands?: RoomCommands;
  __verseClashStore?: RoomStore;
};

function hasSupabaseConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Rooms live in Supabase Postgres whenever it's configured, so state
// survives across serverless instances and restarts. Without it (local dev
// with no Supabase project set up), fall back to a process-local store —
// convenient for a single `next dev` process, but it won't survive a
// restart or multiple instances.
function getStore(): RoomStore {
  if (hasSupabaseConfig()) {
    return createSupabaseRoomStore();
  }
  if (!globalForGame.__verseClashStore) {
    globalForGame.__verseClashStore = createInMemoryRoomStore();
  }
  return globalForGame.__verseClashStore;
}

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
      store: getStore(),
    });
  }
  return globalForGame.__verseClashCommands;
}
