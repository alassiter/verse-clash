import { bucketWords, wordFitsPrompt } from "@/lib/content/chaos";
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

export function dealForTeam(
  pack: ContentPack,
  input: {
    promptId: string;
    templateId: string;
    playerIds: string[];
    random: () => number;
  },
): DealtAssignment[] {
  const slots = slotsForTemplate(pack, input.templateId);
  if (slots.length === 0) {
    throw new DealError("Template has no slots to deal.");
  }
  const usedTexts = new Set<string>();
  return input.playerIds.map((playerId, index) => {
    const slot = slots[index % slots.length];
    const pool = wordsForSlot(pack, slot, input.promptId);
    const buckets = bucketWords(pool);
    const chosen = [
      ...pickFrom(buckets.sensible, 2, usedTexts, input.random),
      ...pickFrom(buckets.strange, 2, usedTexts, input.random),
      ...pickFrom(buckets.chaos, 1, usedTexts, input.random),
    ];
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
