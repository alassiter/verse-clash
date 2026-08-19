import flavors from "@/content/verse-flavors.json";
import type {
  AssembledSegment,
  CompositionFill,
  ContentPack,
  GrammaticalRole,
} from "@/lib/content/types";

export type VerseFlavor = {
  id: string;
  open: string;
  after: Partial<Record<GrammaticalRole, string>>;
};

const CYCLING_FLAVORS = flavors as VerseFlavor[];

export function cyclingFlavors(): VerseFlavor[] {
  return CYCLING_FLAVORS;
}

export function pickCyclingFlavor(random: () => number): VerseFlavor {
  const index = Math.min(
    CYCLING_FLAVORS.length - 1,
    Math.floor(random() * CYCLING_FLAVORS.length),
  );
  return CYCLING_FLAVORS[index];
}

function roleForFill(pack: ContentPack, fill: CompositionFill): GrammaticalRole {
  return pack.slots.find((slot) => slot.id === fill.slotId)?.grammaticalRole ?? "noun";
}

/** Wraps Fills through adj → noun → noun_phrase → verb using a flavor's connective tissue. */
export function assembleCyclingVerse(
  pack: ContentPack,
  fills: CompositionFill[],
  flavor: VerseFlavor,
): AssembledSegment[] {
  const segments: AssembledSegment[] = [];
  if (flavor.open) {
    segments.push({ type: "static", text: flavor.open });
  }
  for (const fill of fills) {
    segments.push({
      type: "contribution",
      text: fill.text,
      playerId: fill.playerId,
      displayName: fill.displayName,
      slotId: fill.slotId,
    });
    const after = flavor.after[roleForFill(pack, fill)] ?? " ";
    if (after) {
      segments.push({ type: "static", text: after });
    }
  }
  return segments;
}

export function cyclingFallbackVerse(
  pack: ContentPack,
  fills: CompositionFill[],
  random: () => number,
): { flavorId: string; segments: AssembledSegment[] } {
  const flavor = pickCyclingFlavor(random);
  return { flavorId: flavor.id, segments: assembleCyclingVerse(pack, fills, flavor) };
}

export function cyclingFallback(
  pack: ContentPack,
  fills: CompositionFill[],
  random: () => number,
): AssembledSegment[] {
  return cyclingFallbackVerse(pack, fills, random).segments;
}
