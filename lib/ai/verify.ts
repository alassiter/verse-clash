import type { CompositionFill } from "@/lib/content";

export type WordUsage = {
  slotId: string;
  playerId: string;
  originalText: string;
  renderedText: string;
};

export type VerifyResult = { ok: true } | { ok: false; reason: string };

const MIN_SHARED_STEM_LENGTH = 3;

// Mirrors the mechanics doc's "Free Words" category (Section 3) — connective
// tissue that doesn't count toward the player-word ratio floor, since almost
// any grammatical sentence needs a few of these regardless of team size.
const FREE_WORDS = new Set([
  "a", "an", "the", "and", "but", "or", "nor", "is", "was", "are", "were",
  "be", "been", "being", "to", "of", "with", "your", "my", "our", "their",
  "his", "her", "its", "for", "on", "in", "at", "it", "we", "us", "you",
  "i", "that", "this", "these", "those", "which", "who", "whom", "will",
  "shall", "would", "could", "should", "as", "so", "than", "then", "into",
  "onto", "by", "from", "together", "not", "no",
]);

function countMeaningfulWords(text: string): number {
  return text
    .split(/\s+/)
    .map((token) => token.toLowerCase().replace(/[.,!?;:'"()]/g, ""))
    .filter((token) => token.length > 0 && !FREE_WORDS.has(token)).length;
}

function isLemmaCompatible(rendered: string, original: string): boolean {
  const a = rendered.toLowerCase().trim();
  const b = original.toLowerCase().trim();
  if (a === b) return true;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  return shorter.length >= MIN_SHARED_STEM_LENGTH && longer.startsWith(shorter);
}

/**
 * Enforces the "AI may arrange, never drop or swap" contract: every
 * player-submitted word must appear, unaltered in stem, exactly once, and
 * player words must make up a floor share of the verse's meaningful content.
 */
export function verifyComposition(
  fills: CompositionFill[],
  wordUsage: WordUsage[],
  verseText: string,
  ratioFloor = 0.6,
): VerifyResult {
  if (wordUsage.length !== fills.length) {
    return {
      ok: false,
      reason: `expected ${fills.length} word usage entries, got ${wordUsage.length}`,
    };
  }

  const haystack = verseText.toLowerCase();
  for (const fill of fills) {
    const matches = wordUsage.filter(
      (usage) => usage.slotId === fill.slotId && usage.playerId === fill.playerId,
    );
    if (matches.length !== 1) {
      return {
        ok: false,
        reason: `expected exactly one usage entry for ${fill.displayName}'s word "${fill.text}", found ${matches.length}`,
      };
    }
    const usage = matches[0];
    if (!isLemmaCompatible(usage.renderedText, fill.text)) {
      return {
        ok: false,
        reason: `"${fill.text}" was altered into "${usage.renderedText}" — swaps are not allowed, only conjugation/pluralization`,
      };
    }
    if (!haystack.includes(usage.renderedText.toLowerCase())) {
      return {
        ok: false,
        reason: `"${usage.renderedText}" does not appear in the verse text`,
      };
    }
  }

  const meaningfulWords = countMeaningfulWords(verseText);
  const playerMeaningfulWords = fills.reduce(
    (sum, fill) => sum + Math.max(1, countMeaningfulWords(fill.text)),
    0,
  );
  const ratio = meaningfulWords > 0 ? playerMeaningfulWords / meaningfulWords : 1;
  if (meaningfulWords > 0 && ratio < ratioFloor) {
    return {
      ok: false,
      reason: `player-word ratio ${ratio.toFixed(2)} is below the ${ratioFloor} floor`,
    };
  }

  return { ok: true };
}
