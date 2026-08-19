import { describe, expect, it } from "vitest";
import { generatePromptBatch } from "@/lib/ai/promptGenerator";

describe("generatePromptBatch without an API key", () => {
  it("returns an empty batch instead of throwing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = await generatePromptBatch({
      count: 4,
      category: "poem",
      recentThemes: [],
      templateId: "three-principles",
    });
    expect(result).toEqual([]);
  });
});
