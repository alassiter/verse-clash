import { after } from "next/server";
import { loadContentPack, validatePromptCandidate, type ContentPack } from "@/lib/content";
import { createAnthropicComposer } from "@/lib/ai/composer";
import { generatePromptBatch, PROMPT_CATEGORIES } from "@/lib/ai/promptGenerator";
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

function getStore(): RoomStore {
  if (hasSupabaseConfig()) return createSupabaseRoomStore();
  if (!globalForGame.__verseClashStore) {
    globalForGame.__verseClashStore = createInMemoryRoomStore();
  }
  return globalForGame.__verseClashStore;
}

const PROMPT_REFRESH_INTERVAL_MS = 90_000;
const PROMPT_BATCH_SIZE = 4;
const RECENT_THEMES_LIMIT = 20;

function createPromptPoolRefresher(pack: ContentPack): () => void {
  const templateId = pack.templates[0]?.id;
  const state = {
    refreshing: false,
    lastRefreshAt: 0,
    categoryIndex: 0,
    recentThemes: [] as string[],
  };

  return function maybeRefreshPrompts() {
    if (!templateId || state.refreshing) return;
    if (Date.now() - state.lastRefreshAt < PROMPT_REFRESH_INTERVAL_MS) return;
    state.refreshing = true;
    state.lastRefreshAt = Date.now();
    const category = PROMPT_CATEGORIES[state.categoryIndex % PROMPT_CATEGORIES.length];
    state.categoryIndex += 1;

    void generatePromptBatch({
      count: PROMPT_BATCH_SIZE,
      category,
      recentThemes: state.recentThemes,
      templateId,
    })
      .then((candidates) => {
        for (const candidate of candidates) {
          const issues = validatePromptCandidate(pack, candidate, { maxTeamSize: 4 });
          if (issues.length === 0) {
            pack.prompts.push(candidate);
            state.recentThemes.push(candidate.text);
          }
        }
        if (state.recentThemes.length > RECENT_THEMES_LIMIT) {
          state.recentThemes = state.recentThemes.slice(-RECENT_THEMES_LIMIT);
        }
      })
      .catch((err) => {
        console.warn(
          `[prompt-pool] refresh failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      })
      .finally(() => {
        state.refreshing = false;
      });
  };
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
      ai: createAnthropicComposer(loaded.pack),
      onHeartbeat: createPromptPoolRefresher(loaded.pack),
      runInBackground: (work) => {
        after(async () => {
          await work;
        });
      },
    });
  }
  return globalForGame.__verseClashCommands;
}
