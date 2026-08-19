import { describe, expect, it } from "vitest";
import { createAnthropicComposer } from "@/lib/ai/composer";
import { samplePack } from "../game/harness";
import type { CompositionFill } from "@/lib/content";

describe("createAnthropicComposer without an API key", () => {
  it("falls back to deterministic composition for every team and skips judging", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const pack = samplePack();
    const composer = createAnthropicComposer(pack);

    const fills: CompositionFill[] = [
      {
        slotId: "principle-adj",
        text: "soggy",
        playerId: "p1",
        displayName: "Priya",
        semanticCategory: "adjective",
      },
    ];

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
    expect(
      result.compositions[0].segments.some(
        (segment) => segment.type === "contribution" && segment.displayName === "Priya",
      ),
    ).toBe(true);
  });
});
