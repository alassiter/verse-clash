import type { RoomState } from "@/lib/game/state";

export type StoredRoom = { state: RoomState; version: number };

export type RoomStore = {
  load(code: string): Promise<StoredRoom | null>;
  insert(state: RoomState): Promise<boolean>;
  save(code: string, state: RoomState, expectedVersion: number): Promise<boolean>;
};

/**
 * Backs rooms with a process-local Map. Used for local dev without a
 * configured Supabase project, and by tests. State does not survive a
 * process restart or multiple instances.
 */
export function createInMemoryRoomStore(): RoomStore {
  const rooms = new Map<string, StoredRoom>();
  return {
    async load(code) {
      const found = rooms.get(code);
      if (!found) return null;
      return { state: structuredClone(found.state), version: found.version };
    },
    async insert(state) {
      if (rooms.has(state.code)) return false;
      rooms.set(state.code, { state: structuredClone(state), version: 0 });
      return true;
    },
    async save(code, state, expectedVersion) {
      const found = rooms.get(code);
      if (!found || found.version !== expectedVersion) return false;
      rooms.set(code, { state: structuredClone(state), version: expectedVersion + 1 });
      return true;
    },
  };
}
