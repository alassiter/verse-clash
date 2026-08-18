import type { Word } from "@/lib/content/types";

export function isSensible(chaos: number): boolean {
  return chaos <= 0.3;
}

export function isStrange(chaos: number): boolean {
  return chaos >= 0.31 && chaos <= 0.7;
}

export function isChaos(chaos: number): boolean {
  return chaos > 0.7;
}

export function wordFitsPrompt(word: Word, promptId: string): boolean {
  return (
    !word.compatiblePromptIds ||
    word.compatiblePromptIds.length === 0 ||
    word.compatiblePromptIds.includes(promptId)
  );
}

export function bucketWords(words: Word[]): {
  sensible: Word[];
  strange: Word[];
  chaos: Word[];
} {
  return {
    sensible: words.filter((word) => isSensible(word.chaos)),
    strange: words.filter((word) => isStrange(word.chaos)),
    chaos: words.filter((word) => isChaos(word.chaos)),
  };
}
