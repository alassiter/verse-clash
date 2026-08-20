import { describe, expect, it } from "vitest";
import { verifyComposition, type WordUsage } from "@/lib/ai/verify";
import type { CompositionFill } from "@/lib/content";

function fill(overrides: Partial<CompositionFill> = {}): CompositionFill {
  return {
    slotId: "principle-adj",
    text: "soggy",
    playerId: "p1",
    displayName: "Priya",
    semanticCategory: "adjective",
    ...overrides,
  };
}

function usage(overrides: Partial<WordUsage> = {}): WordUsage {
  return {
    slotId: "principle-adj",
    playerId: "p1",
    originalText: "soggy",
    renderedText: "soggy",
    ...overrides,
  };
}

describe("verifyComposition", () => {
  const twoFills = [fill(), fill({ slotId: "principle-noun", playerId: "p2", text: "seagull" })];
  const twoUsages = [usage(), usage({ slotId: "principle-noun", playerId: "p2", originalText: "seagull", renderedText: "seagull" })];

  it("accepts an exact, present render", () => {
    const result = verifyComposition(twoFills, twoUsages, "Soggy seagull arrived.");
    expect(result).toEqual({ ok: true });
  });

  it("accepts a conjugated/pluralized variant sharing a stem", () => {
    const result = verifyComposition(
      [fill({ text: "devour" })],
      [usage({ originalText: "devour", renderedText: "devoured" })],
      "Devoured.",
    );
    expect(result.ok).toBe(true);
  });

  it("rejects a dropped word (missing usage entry)", () => {
    const result = verifyComposition(
      [fill(), fill({ slotId: "principle-noun", playerId: "p2", text: "seagull" })],
      [usage()],
      "The soggy day.",
    );
    expect(result).toEqual({
      ok: false,
      reason: expect.stringContaining("expected 2 word usage entries, got 1"),
    });
  });

  it("rejects a synonym swap (no shared stem)", () => {
    const result = verifyComposition(
      [fill({ text: "soggy" })],
      [usage({ originalText: "soggy", renderedText: "damp" })],
      "The damp captain arrived.",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("altered");
  });

  it("rejects a rendered word that never appears in the verse text", () => {
    const result = verifyComposition([fill()], [usage()], "The captain arrived.");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("does not appear");
  });

  it("rejects a duplicate usage entry for the same fill", () => {
    const result = verifyComposition(
      [fill()],
      [usage(), usage()],
      "The soggy soggy captain.",
    );
    expect(result.ok).toBe(false);
  });

  it("does not reject when the player-word ratio is below a 60% aim", () => {
    const longFiller =
      "a great many additional connective words padding out this verse well beyond a reasonable glue-word share";
    const result = verifyComposition(
      [fill()],
      [usage()],
      `${longFiller} soggy ${longFiller}`,
    );
    expect(result).toEqual({ ok: true });
  });

  it("does not reject a long verse on word count", () => {
    const padding = Array.from({ length: 80 }, () => "extra").join(" ");
    const result = verifyComposition([fill()], [usage()], `${padding} soggy`);
    expect(result).toEqual({ ok: true });
  });
});
