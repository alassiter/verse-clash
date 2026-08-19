import { describe, expect, it } from "vitest";
import { dealForTeam, loadContentPack } from "@/lib/content";
import { applyChaosCardFilter } from "@/lib/content/chaosCards";
import type { ContentPack } from "@/lib/content";

function loadSample(): ContentPack {
  const result = loadContentPack();
  if (!result.ok) {
    throw new Error(result.issues.map((issue) => issue.message).join("; "));
  }
  return result.pack;
}

describe("applyChaosCardFilter", () => {
  const pack = loadSample();

  it("keeps only intensity-3 words for fancy_pants", () => {
    const filtered = applyChaosCardFilter(pack.words, "fancy_pants");
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((word) => word.intensity === 3)).toBe(true);
  });

  it("keeps only words of 4 characters or fewer for tiny_words", () => {
    const filtered = applyChaosCardFilter(pack.words, "tiny_words");
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((word) => word.text.length <= 4)).toBe(true);
  });

  it("passes the pool through unchanged for cards with no pool-level effect", () => {
    expect(applyChaosCardFilter(pack.words, "no_nouns")).toEqual(pack.words);
    expect(applyChaosCardFilter(pack.words, "chaos_round")).toEqual(pack.words);
    expect(applyChaosCardFilter(pack.words, undefined)).toEqual(pack.words);
  });
});

describe("dealForTeam with a chaos card", () => {
  const pack = loadSample();

  it("no_nouns excludes noun slots from the rotation entirely", () => {
    const dealt = dealForTeam(pack, {
      promptId: "vision",
      templateId: "three-principles",
      playerIds: ["p1", "p2", "p3", "p4"],
      random: () => 0.1,
      chaosCard: "no_nouns",
    });
    expect(dealt.some((assignment) => assignment.slotId === "principle-noun")).toBe(false);
  });

  it("chaos_round deals five options without a bucketed sensible/strange/chaos mix", () => {
    const dealt = dealForTeam(pack, {
      promptId: "vision",
      templateId: "three-principles",
      playerIds: ["p1"],
      random: () => 0.1,
      chaosCard: "chaos_round",
    });
    expect(dealt).toHaveLength(1);
    expect(dealt[0].options).toHaveLength(5);
    const texts = dealt[0].options.map((option) => option.text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("falls back to the unfiltered pool when a filter would leave too little to deal", () => {
    // fancy_pants (intensity === 3 only) is too sparse to fill a 2/2/1 mix for
    // most roles — dealing should still succeed via fallback, not throw.
    expect(() =>
      dealForTeam(pack, {
        promptId: "vision",
        templateId: "three-principles",
        playerIds: ["p1", "p2", "p3", "p4"],
        random: () => 0.1,
        chaosCard: "fancy_pants",
      }),
    ).not.toThrow();
  });
});
