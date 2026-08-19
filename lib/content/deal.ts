import { bucketWords, wordFitsPrompt } from "@/lib/content/chaos";
import { applyChaosCardFilter, type ChaosCardId } from "@/lib/content/chaosCards";
import type {
  ContentPack,
  DealtAssignment,
  DealtOption,
  Slot,
  Word,
} from "@/lib/content/types";

export class DealError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DealError";
  }
}

function pickFrom(
  pool: Word[],
  count: number,
  usedTexts: Set<string>,
  random: () => number,
): Word[] {
  const available = pool.filter((word) => !usedTexts.has(word.text));
  const picked: Word[] = [];
  for (let i = 0; i < count; i += 1) {
    if (available.length === 0) {
      throw new DealError("Not enough unique words remain for the 2/2/1 mix.");
    }
    const index = Math.min(
      available.length - 1,
      Math.floor(random() * available.length),
    );
    const [word] = available.splice(index, 1);
    usedTexts.add(word.text);
    picked.push(word);
  }
  return picked;
}

export function slotsForTemplate(
  pack: ContentPack,
  templateId: string,
): Slot[] {
  const template = pack.templates.find((entry) => entry.id === templateId);
  if (!template) {
    throw new DealError(`Unknown template ${templateId}`);
  }
  const ids = template.segments
    .filter((segment) => segment.type === "slot")
    .map((segment) => segment.slotId);
  return ids.map((slotId) => {
    const slot = pack.slots.find((entry) => entry.id === slotId);
    if (!slot) {
      throw new DealError(`Missing slot ${slotId}`);
    }
    return slot;
  });
}

export function wordsForSlot(
  pack: ContentPack,
  slot: Slot,
  promptId: string,
): Word[] {
  return pack.words.filter(
    (word) =>
      word.grammaticalRole === slot.grammaticalRole &&
      word.workplaceSafe &&
      wordFitsPrompt(word, promptId),
  );
}

/** Picks one word for a slot nobody is around to fill — used when a team is
 * down to a single active player, so the rest of their verse still comes from
 * real, varied vocabulary instead of the same static house filler every time. */
export function autoFillWord(
  pack: ContentPack,
  slot: Slot,
  promptId: string,
  chaosCard: ChaosCardId | null | undefined,
  random: () => number,
): Word {
  const basePool = wordsForSlot(pack, slot, promptId);
  const filteredPool = applyChaosCardFilter(basePool, chaosCard);
  const pool = filteredPool.length > 0 ? filteredPool : basePool;
  if (pool.length === 0) {
    throw new DealError(`No words available to auto-fill slot ${slot.id}.`);
  }
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
  return pool[index];
}

const CHAOS_ROUND_PICK_COUNT = 5;

function hasMinimumMix(pool: Word[]): boolean {
  const buckets = bucketWords(pool);
  return buckets.sensible.length >= 2 && buckets.strange.length >= 2 && buckets.chaos.length >= 1;
}

export function dealForTeam(
  pack: ContentPack,
  input: {
    promptId: string;
    templateId: string;
    playerIds: string[];
    random: () => number;
    chaosCard?: ChaosCardId;
  },
): DealtAssignment[] {
  let slots = slotsForTemplate(pack, input.templateId);
  if (slots.length === 0) {
    throw new DealError("Template has no slots to deal.");
  }
  // No Nouns excludes noun slots from the rotation entirely (so the template's
  // static assembler falls back to its house filler there) rather than filtering
  // an already role-locked pool down to nothing.
  if (input.chaosCard === "no_nouns") {
    const nonNounSlots = slots.filter((slot) => slot.grammaticalRole !== "noun");
    if (nonNounSlots.length > 0) slots = nonNounSlots;
  }
  const usedTexts = new Set<string>();
  return input.playerIds.map((playerId, index) => {
    const slot = slots[index % slots.length];
    const basePool = wordsForSlot(pack, slot, input.promptId);
    const filteredPool = applyChaosCardFilter(basePool, input.chaosCard);
    // Fall back to the unfiltered pool if the filter leaves too little to deal —
    // graceful degradation over an impossible deal for this slot.
    const pool = hasMinimumMix(filteredPool) ? filteredPool : basePool;
    const chosen =
      input.chaosCard === "chaos_round"
        ? pickFrom(pool, CHAOS_ROUND_PICK_COUNT, usedTexts, input.random)
        : (() => {
            const buckets = bucketWords(pool);
            return [
              ...pickFrom(buckets.sensible, 2, usedTexts, input.random),
              ...pickFrom(buckets.strange, 2, usedTexts, input.random),
              ...pickFrom(buckets.chaos, 1, usedTexts, input.random),
            ];
          })();
    const options: DealtOption[] = chosen.map((word) => ({
      id: word.id,
      text: word.text,
    }));
    return {
      playerId,
      slotId: slot.id,
      playerLabel: slot.playerLabel,
      options,
    };
  });
}
