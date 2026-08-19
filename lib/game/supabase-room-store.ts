import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { RoomState } from "@/lib/game/state";
import type { RoomStore } from "@/lib/game/room-store";

const UNIQUE_VIOLATION = "23505";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} environment variable.`);
  }
  return value;
}

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } },
    );
  }
  return client;
}

/**
 * Backs rooms with a `rooms` table in Postgres (one JSONB blob per room),
 * so game state survives across serverless instances and process restarts.
 * Concurrent writes to the same room use optimistic concurrency: `save`
 * only succeeds if `version` still matches what was loaded, and callers
 * (see `withRoom` in commands.ts) reload and retry on conflict.
 */
export function createSupabaseRoomStore(): RoomStore {
  return {
    async load(code) {
      const { data, error } = await getClient()
        .from("rooms")
        .select("state, version")
        .eq("code", code)
        .maybeSingle();
      if (error) {
        throw new Error(`Failed to load room ${code}: ${error.message}`);
      }
      if (!data) return null;
      return { state: data.state as RoomState, version: data.version as number };
    },

    async insert(state) {
      const { error } = await getClient()
        .from("rooms")
        .insert({ code: state.code, state, version: 0 });
      if (!error) return true;
      if (error.code === UNIQUE_VIOLATION) return false;
      throw new Error(`Failed to create room ${state.code}: ${error.message}`);
    },

    async save(code, state, expectedVersion) {
      const { data, error } = await getClient()
        .from("rooms")
        .update({
          state,
          version: expectedVersion + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("code", code)
        .eq("version", expectedVersion)
        .select("version");
      if (error) {
        throw new Error(`Failed to save room ${code}: ${error.message}`);
      }
      return (data?.length ?? 0) > 0;
    },
  };
}
