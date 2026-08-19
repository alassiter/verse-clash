import type { Word } from "@/lib/content/types";

export const CHAOS_CARD_IDS = [
  "double_trouble",
  "no_nouns",
  "fancy_pants",
  "tiny_words",
  "chaos_round",
  "sabotage",
] as const;

export type ChaosCardId = (typeof CHAOS_CARD_IDS)[number];

export const CHAOS_CARD_COPY: Record<ChaosCardId, { name: string; description: string }> = {
  double_trouble: {
    name: "Double Trouble",
    description: "Everyone gets two words to place this round.",
  },
  no_nouns: {
    name: "No Nouns",
    description: "Nobody gets dealt a noun this round — the house fills those slots.",
  },
  fancy_pants: {
    name: "Fancy Pants",
    description: "Only the fanciest, most intense words are on offer.",
  },
  tiny_words: {
    name: "Tiny Words",
    description: "Every option dealt this round is short and snappy.",
  },
  chaos_round: {
    name: "Chaos Round",
    description: "No sensible/strange/chaos mix — every option is pure chance.",
  },
  sabotage: {
    name: "Sabotage",
    description: "One team's word gets smuggled into a rival team's verse.",
  },
};

const FANCY_PANTS_INTENSITY = 3;
const TINY_WORD_MAX_LENGTH = 4;

/** Pool-level filters for cards that narrow which words can be dealt. no_nouns and
 * chaos_round are handled elsewhere (slot selection and bucket strategy respectively)
 * since they don't reduce to a per-word predicate against an already role-locked pool. */
export function applyChaosCardFilter(pool: Word[], card: ChaosCardId | null | undefined): Word[] {
  if (card === "fancy_pants") {
    return pool.filter((word) => word.intensity === FANCY_PANTS_INTENSITY);
  }
  if (card === "tiny_words") {
    return pool.filter((word) => word.text.length <= TINY_WORD_MAX_LENGTH);
  }
  return pool;
}
