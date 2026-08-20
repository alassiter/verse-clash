import type { CompositionFill } from "@/lib/content";

export type WordUsage = {
  slotId: string;
  playerId: string;
  originalText: string;
  renderedText: string;
};

export type VerifyResult = { ok: true } | { ok: false; reason: string };

const MIN_SHARED_STEM_LENGTH = 3;

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
 * player-submitted word must appear, unaltered in stem, exactly once.
 */
export function verifyComposition(
  fills: CompositionFill[],
  wordUsage: WordUsage[],
  verseText: string,
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

  return { ok: true };
}
