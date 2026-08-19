import { describe, expect, it } from "vitest";
import {
  assembleComposition,
  dealForTeam,
  loadContentPack,
  validateContentPack,
  validatePromptCandidate,
} from "@/lib/content";
import type { ContentPack, Prompt, Word } from "@/lib/content";

function loadSample(): ContentPack {
  const result = loadContentPack();
  if (!result.ok) {
    throw new Error(result.issues.map((issue) => issue.message).join("; "));
  }
  return result.pack;
}

function wordById(pack: ContentPack, id: string): Word {
  const word = pack.words.find((entry) => entry.id === id);
  if (!word) {
    throw new Error(`Missing word ${id}`);
  }
  return word;
}

describe("content-pack validator", () => {
  it("loads the sample pack for a 2-4 player table", () => {
    const result = loadContentPack();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack.contentMode).toBe("work_safe");
    // 3 authored prompts + the curated fallback pool concatenated at load time.
    expect(result.pack.prompts.length).toBeGreaterThanOrEqual(20);
    expect(result.pack.slots).toHaveLength(4);
  });

  it("allows unused hidden-effect fields on slots and ignores them", () => {
    const pack = loadSample();
    const slot = pack.slots[0];
    expect(slot.echo).toBe(false);
    expect(slot.dramaticPlacement).toBe(false);
    expect(slot.callback).toBe(false);
    expect(slot.intensifier).toBe(false);
  });

  it("rejects a pack that is missing a template slot", () => {
    const pack = structuredClone(loadSample());
    pack.slots = pack.slots.filter((slot) => slot.id !== "principle-adj");
    const result = validateContentPack(pack);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((issue) => issue.code === "missing_slot")).toBe(
      true,
    );
  });

  it("rejects a pack that cannot deal a 2/2/1 mix", () => {
    const pack = structuredClone(loadSample());
    pack.words = pack.words.filter((word) => word.chaos <= 0.7);
    const result = validateContentPack(pack, { maxTeamSize: 4 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(
      result.issues.some((issue) => issue.code === "impossible_deal_mix"),
    ).toBe(true);
  });

  it("rejects blocked terms in authored text", () => {
    const pack = structuredClone(loadSample());
    pack.words[0].text = "sexy stapler";
    const result = validateContentPack(pack);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((issue) => issue.code === "blocked_term")).toBe(
      true,
    );
  });

  it("rejects a content mode other than work_safe", () => {
    const pack = structuredClone(loadSample());
    const result = validateContentPack({
      ...pack,
      safety: { ...pack.safety, contentMode: "after_hours" },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((issue) => issue.code === "content_mode")).toBe(
      true,
    );
  });

  it("validatePromptCandidate accepts a well-formed generated prompt without registering it", () => {
    const pack = loadSample();
    const candidate: Prompt = {
      id: "gen-test-1",
      text: "Announce the office's new mascot.",
      tease: "It's a stapler with googly eyes.",
      formatHint: "mascot reveal",
      compatibleTemplateIds: ["three-principles"],
      workplaceSafe: true,
    };
    expect(validatePromptCandidate(pack, candidate)).toEqual([]);
    expect(pack.prompts.some((prompt) => prompt.id === "gen-test-1")).toBe(false);
  });

  it("validatePromptCandidate rejects an unknown template and blocked terms", () => {
    const pack = loadSample();
    const badTemplate = validatePromptCandidate(pack, {
      id: "gen-test-2",
      text: "Announce something.",
      formatHint: "announcement",
      compatibleTemplateIds: ["no-such-template"],
      workplaceSafe: true,
    });
    expect(badTemplate.some((issue) => issue.code === "missing_template")).toBe(true);

    const blocked = validatePromptCandidate(pack, {
      id: "gen-test-3",
      text: "Give a toast to the office's blood drive.",
      formatHint: "toast",
      compatibleTemplateIds: ["three-principles"],
      workplaceSafe: true,
    });
    expect(blocked.some((issue) => issue.code === "blocked_term")).toBe(true);
  });

  it("deals five unique options per player with a 2/2/1 chaos mix", () => {
    const pack = loadSample();
    const teamA = dealForTeam(pack, {
      promptId: "vision",
      templateId: "three-principles",
      playerIds: ["p1", "p2", "p3", "p4"],
      random: () => 0.1,
    });

    expect(teamA).toHaveLength(4);
    const texts = teamA.flatMap((assignment) =>
      assignment.options.map((option) => option.text),
    );
    expect(new Set(texts).size).toBe(texts.length);

    for (const assignment of teamA) {
      expect(assignment.options).toHaveLength(5);
      const chaos = assignment.options.map(
        (option) => wordById(pack, option.id).chaos,
      );
      expect(chaos.filter((value) => value <= 0.3)).toHaveLength(2);
      expect(
        chaos.filter((value) => value >= 0.31 && value <= 0.7),
      ).toHaveLength(2);
      expect(chaos.filter((value) => value > 0.7)).toHaveLength(1);
    }
  });

  it("may reuse the same word on a different team", () => {
    const pack = loadSample();
    const random = () => 0.1;
    const teamA = dealForTeam(pack, {
      promptId: "vision",
      templateId: "three-principles",
      playerIds: ["a1", "a2"],
      random,
    });
    const teamB = dealForTeam(pack, {
      promptId: "vision",
      templateId: "three-principles",
      playerIds: ["b1", "b2"],
      random,
    });
    const aIds = teamA.flatMap((assignment) =>
      assignment.options.map((option) => option.id),
    );
    const bIds = teamB.flatMap((assignment) =>
      assignment.options.map((option) => option.id),
    );
    expect(aIds).toEqual(bIds);
  });

  it("replaces an unsafe category pair with the slot house filler", () => {
    const pack = loadSample();
    const result = assembleComposition(pack, {
      templateId: "three-principles",
      fills: [
        {
          slotId: "principle-adj",
          text: "collaborative",
          playerId: "p1",
          displayName: "Priya",
          semanticCategory: "adjective",
        },
        {
          slotId: "principle-noun",
          text: "waffle",
          playerId: "p2",
          displayName: "Sam",
          semanticCategory: "food",
        },
        {
          slotId: "principle-phrase",
          text: "the quarterly plan",
          playerId: "p3",
          displayName: "Lee",
          semanticCategory: "abstract",
        },
        {
          slotId: "principle-verb",
          text: "celebrate",
          playerId: "p4",
          displayName: "Jo",
          semanticCategory: "profession",
        },
      ],
    });

    expect(result.segments).toEqual([
      {
        type: "contribution",
        text: "collaborative",
        playerId: "p1",
        displayName: "Priya",
        slotId: "principle-adj",
      },
      { type: "static", text: ", " },
      {
        type: "contribution",
        text: "waffle",
        playerId: "p2",
        displayName: "Sam",
        slotId: "principle-noun",
      },
      { type: "static", text: ", and " },
      {
        type: "contribution",
        text: "the quarterly plan",
        playerId: "p3",
        displayName: "Lee",
        slotId: "principle-phrase",
      },
      { type: "static", text: " — to " },
      {
        type: "contribution",
        text: "continue",
        playerId: "house",
        displayName: "House",
        slotId: "principle-verb",
      },
      { type: "static", text: "." },
    ]);
  });
});
