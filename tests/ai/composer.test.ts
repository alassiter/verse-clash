import { describe, expect, it } from "vitest";
import {
  buildComposePrompt,
  COMPOSER_SYSTEM_PROMPT,
  createAnthropicComposer,
} from "@/lib/ai/composer";
import { assembleComposition } from "@/lib/content";
import { samplePack } from "../game/harness";
import type { CompositionFill } from "@/lib/content";

function fillsFor(pack: ReturnType<typeof samplePack>): CompositionFill[] {
  const slots = pack.slots;
  return [
    {
      slotId: slots[0].id,
      text: "soggy",
      playerId: "p1",
      displayName: "Priya",
      semanticCategory: "adjective",
    },
    {
      slotId: slots[1].id,
      text: "seagull",
      playerId: "p2",
      displayName: "Sam",
      semanticCategory: "object",
    },
    {
      slotId: slots[2].id,
      text: "the quarterly plan",
      playerId: "p3",
      displayName: "Lee",
      semanticCategory: "abstract",
    },
    {
      slotId: slots[3].id,
      text: "celebrate",
      playerId: "p4",
      displayName: "Jo",
      semanticCategory: "action",
    },
    {
      slotId: slots[0].id,
      text: "sticky",
      playerId: "p5",
      displayName: "Kim",
      semanticCategory: "adjective",
    },
  ];
}

describe("composer prompt", () => {
  it("asks Claude to co-author with every Fill once and aims, not caps", () => {
    expect(COMPOSER_SYSTEM_PROMPT).toMatch(/co-author/i);
    expect(COMPOSER_SYSTEM_PROMPT).toMatch(/exactly once/);
    expect(COMPOSER_SYSTEM_PROMPT).toMatch(/60%/);
    expect(COMPOSER_SYSTEM_PROMPT).toMatch(/aim/i);
    expect(COMPOSER_SYSTEM_PROMPT).toMatch(/two to four sentences/i);
    expect(COMPOSER_SYSTEM_PROMPT).toMatch(/25–40 words|25-40 words/);
    expect(COMPOSER_SYSTEM_PROMPT).toMatch(/comma-separated list/);
    expect(COMPOSER_SYSTEM_PROMPT.toLowerCase()).not.toMatch(/\bshort\b/);
    expect(COMPOSER_SYSTEM_PROMPT.toLowerCase()).not.toMatch(/sparingly/);
  });

  it("does not hint length from team size", () => {
    const pack = samplePack();
    const prompt = buildComposePrompt(
      pack,
      {
        roomId: "ROOM1",
        roundId: "round-1",
        requestId: "req-1",
        templateId: "three-principles",
        promptId: "vision",
        teams: [],
      },
      { teamId: "goblin", fills: fillsFor(pack) },
    );
    expect(prompt).not.toMatch(/Target length/);
    expect(prompt).not.toMatch(/one sentence|two sentences|three sentences or lines/);
    expect(prompt).toMatch(/Submitted words/);
  });
});

describe("createAnthropicComposer without an API key", () => {
  it("falls back to a cycling-blank flavor for every team and skips judging", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const pack = samplePack();
    const composer = createAnthropicComposer(pack, () => 0.1);
    const fills = fillsFor(pack);

    const result = await composer.composeAndJudge({
      roomId: "ROOM1",
      roundId: "round-1",
      requestId: "req-1",
      templateId: "three-principles",
      promptId: "vision",
      teams: [{ teamId: "goblin", fills }],
    });

    expect(result.requestId).toBe("req-1");
    expect(result.judging).toBeUndefined();
    expect(result.compositions).toHaveLength(1);
    expect(result.compositions[0].teamId).toBe("goblin");
    expect(result.compositions[0].source).toBe("deterministic_fallback");

    const segments = result.compositions[0].segments;
    for (const fill of fills) {
      expect(
        segments.some(
          (segment) =>
            segment.type === "contribution" &&
            segment.displayName === fill.displayName &&
            segment.text === fill.text,
        ),
      ).toBe(true);
    }
    expect(
      segments.some((segment) => segment.type === "static" && segment.text.includes(" — to ")),
    ).toBe(false);

    const dump = assembleComposition(pack, { templateId: "three-principles", fills }).segments;
    expect(segments).not.toEqual(dump);

    const contributionOrder = segments
      .filter((segment) => segment.type === "contribution")
      .map((segment) => segment.text);
    expect(contributionOrder).toEqual(fills.map((fill) => fill.text));
  });
});
