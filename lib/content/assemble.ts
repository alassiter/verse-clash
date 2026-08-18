import type {
  AssembleResult,
  AssembledSegment,
  CompositionFill,
  ContentPack,
  Slot,
} from "@/lib/content/types";

function containsBlockedTerm(text: string, blockedTerms: string[]): boolean {
  const haystack = text.toLowerCase();
  return blockedTerms.some((term) => haystack.includes(term.toLowerCase()));
}

function pairBanned(
  left: string,
  right: string,
  pairs: [string, string][],
): boolean {
  return pairs.some(
    ([a, b]) =>
      (a === left && b === right) || (a === right && b === left),
  );
}

function houseFill(slot: Slot): CompositionFill {
  return {
    slotId: slot.id,
    text: slot.defaultFiller,
    playerId: "house",
    displayName: "House",
    semanticCategory: slot.semanticCategory,
  };
}

function isUnsafeAgainst(
  fill: CompositionFill,
  accepted: CompositionFill[],
  pack: ContentPack,
): boolean {
  if (containsBlockedTerm(fill.text, pack.safety.blockedTerms)) {
    return true;
  }
  return accepted.some((other) => {
    if (
      pairBanned(
        fill.semanticCategory,
        other.semanticCategory,
        pack.safety.bannedCategoryPairs,
      )
    ) {
      return true;
    }
    const fillBans = fill.bannedPairCategories ?? [];
    const otherBans = other.bannedPairCategories ?? [];
    return (
      fillBans.includes(other.semanticCategory) ||
      otherBans.includes(fill.semanticCategory)
    );
  });
}

export function assembleComposition(
  pack: ContentPack,
  input: { templateId: string; fills: CompositionFill[] },
): AssembleResult {
  const template = pack.templates.find((entry) => entry.id === input.templateId);
  if (!template) {
    throw new Error(`Unknown template ${input.templateId}`);
  }

  const fillsBySlot = new Map<string, CompositionFill[]>();
  for (const fill of input.fills) {
    const list = fillsBySlot.get(fill.slotId) ?? [];
    list.push(fill);
    fillsBySlot.set(fill.slotId, list);
  }

  const accepted: CompositionFill[] = [];
  const segments: AssembledSegment[] = [];

  for (const segment of template.segments) {
    if (segment.type === "static") {
      segments.push({ type: "static", text: segment.text });
      continue;
    }
    const slot = pack.slots.find((entry) => entry.id === segment.slotId);
    if (!slot) {
      throw new Error(`Missing slot ${segment.slotId}`);
    }
    const rawFills = fillsBySlot.get(slot.id);
    const candidates = rawFills && rawFills.length > 0 ? rawFills : [houseFill(slot)];
    for (const candidate of candidates) {
      const safe = isUnsafeAgainst(candidate, accepted, pack)
        ? houseFill(slot)
        : candidate;
      const finalFill = isUnsafeAgainst(safe, accepted, pack)
        ? houseFill(slot)
        : safe;
      accepted.push(finalFill);
      segments.push({
        type: "contribution",
        text: finalFill.text,
        playerId: finalFill.playerId,
        displayName: finalFill.displayName,
        slotId: slot.id,
      });
    }
  }

  return { segments };
}
