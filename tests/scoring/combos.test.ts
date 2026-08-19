import { describe, expect, it } from "vitest";
import {
  computeWordPoints,
  detectAlliteration,
  detectPosVariety,
  detectRhyme,
  detectThemeCluster,
  detectWildcardUsed,
  scoreRound,
} from "@/lib/scoring/combos";
import { samplePack } from "../game/harness";
import type { CompositionFill, ContentPack } from "@/lib/content";

const pack = samplePack();

function fillFor(
  wordId: string,
  playerId: string,
  displayName: string,
  slotId: string,
): CompositionFill {
  const word = pack.words.find((entry) => entry.id === wordId);
  if (!word) throw new Error(`missing fixture word ${wordId}`);
  return {
    slotId,
    text: word.text,
    playerId,
    displayName,
    semanticCategory: word.semanticCategory,
    bannedPairCategories: word.bannedPairCategories,
    wordId: word.id,
  };
}

function houseFill(slotId: string): CompositionFill {
  return {
    slotId,
    text: "proceed",
    playerId: "house",
    displayName: "House",
    semanticCategory: "action",
  };
}

describe("computeWordPoints", () => {
  it("sums rarity points and skips fills with no backing word", () => {
    const fills = [
      fillFor("adj-collaborative", "p1", "Priya", "principle-adj"), // common: 1
      fillFor("noun-goblin", "p2", "Sam", "principle-noun"), // wildcard: 5
      houseFill("principle-phrase"), // no wordId: 0
    ];
    const { wordPoints, wordBreakdown } = computeWordPoints(pack, fills);
    expect(wordPoints).toBe(6);
    expect(wordBreakdown).toEqual([
      { wordId: "adj-collaborative", playerId: "p1", points: 1 },
      { wordId: "noun-goblin", playerId: "p2", points: 5 },
    ]);
  });
});

describe("detectAlliteration", () => {
  it("finds two words sharing a starting letter", () => {
    const fills = [
      fillFor("adj-collaborative", "p1", "Priya", "principle-adj"), // "collaborative"
      fillFor("noun-calendar", "p2", "Sam", "principle-noun"), // "calendar"
    ];
    const bonus = detectAlliteration(fills);
    expect(bonus).toMatchObject({ type: "alliteration", points: 3 });
  });

  it("returns null when no letters repeat", () => {
    const fills = [
      fillFor("adj-collaborative", "p1", "Priya", "principle-adj"),
      fillFor("noun-printer", "p2", "Sam", "principle-noun"),
    ];
    expect(detectAlliteration(fills)).toBeNull();
  });
});

describe("detectRhyme", () => {
  it("finds two words sharing a suffix", () => {
    const fills = [
      fillFor("noun-penguin", "p1", "Priya", "principle-noun"), // "penguin"
      fillFor("noun-goblin", "p2", "Sam", "principle-noun"), // "goblin"
    ];
    const bonus = detectRhyme(fills);
    expect(bonus).toMatchObject({ type: "rhyme", points: 3 });
  });

  it("returns null when no suffixes repeat", () => {
    const fills = [
      fillFor("noun-penguin", "p1", "Priya", "principle-noun"),
      fillFor("noun-printer", "p2", "Sam", "principle-noun"),
    ];
    expect(detectRhyme(fills)).toBeNull();
  });
});

describe("detectThemeCluster", () => {
  it("finds three or more words sharing a semantic category", () => {
    const fills = [
      fillFor("adj-haunted", "p1", "Priya", "principle-adj"), // fantasy
      fillFor("noun-goblin", "p2", "Sam", "principle-noun"), // fantasy
      fillFor("verb-summon", "p3", "Lee", "principle-verb"), // fantasy
    ];
    const bonus = detectThemeCluster(fills);
    expect(bonus).toMatchObject({ type: "theme_cluster", points: 4 });
  });

  it("returns null with only two matching categories", () => {
    const fills = [
      fillFor("adj-haunted", "p1", "Priya", "principle-adj"),
      fillFor("noun-goblin", "p2", "Sam", "principle-noun"),
    ];
    expect(detectThemeCluster(fills)).toBeNull();
  });
});

describe("detectWildcardUsed", () => {
  it("finds a wildcard-rarity word", () => {
    const fills = [
      fillFor("adj-collaborative", "p1", "Priya", "principle-adj"),
      fillFor("noun-goblin", "p2", "Sam", "principle-noun"),
    ];
    expect(detectWildcardUsed(pack, fills)).toMatchObject({ type: "wildcard_used", points: 5 });
  });

  it("returns null with no wildcard words", () => {
    const fills = [fillFor("adj-collaborative", "p1", "Priya", "principle-adj")];
    expect(detectWildcardUsed(pack, fills)).toBeNull();
  });
});

describe("detectPosVariety", () => {
  it("awards a bonus when every fill has a distinct grammatical role", () => {
    const fills = [
      fillFor("adj-collaborative", "p1", "Priya", "principle-adj"),
      fillFor("noun-printer", "p2", "Sam", "principle-noun"),
      fillFor("np-quarterly-plan", "p3", "Lee", "principle-phrase"),
      fillFor("verb-celebrate", "p4", "Jo", "principle-verb"),
    ];
    expect(detectPosVariety(pack, fills)).toMatchObject({ type: "pos_variety", points: 5 });
  });

  it("returns null when two fills share a role", () => {
    const fills = [
      fillFor("adj-collaborative", "p1", "Priya", "principle-adj"),
      fillFor("adj-haunted", "p2", "Sam", "principle-adj"),
    ];
    expect(detectPosVariety(pack, fills)).toBeNull();
  });

  it("returns null for a single-fill team", () => {
    expect(detectPosVariety(pack, [fillFor("adj-collaborative", "p1", "Priya", "principle-adj")])).toBeNull();
  });
});

describe("scoreRound", () => {
  it("ranks teams by pre-placement score and assigns placement points", () => {
    const strongTeam = [
      fillFor("adj-haunted", "p1", "Priya", "principle-adj"), // wildcard: 5
      fillFor("noun-goblin", "p2", "Sam", "principle-noun"), // wildcard: 5
    ];
    const weakTeam = [fillFor("adj-collaborative", "p3", "Lee", "principle-adj")]; // common: 1

    const scoring = scoreRound(
      pack,
      [
        { teamId: "weak", fills: weakTeam },
        { teamId: "strong", fills: strongTeam },
      ],
      null,
    );

    const strong = scoring.find((entry) => entry.teamId === "strong")!;
    const weak = scoring.find((entry) => entry.teamId === "weak")!;
    expect(strong.wordPoints).toBe(10);
    expect(strong.placementPoints).toBe(10);
    expect(weak.placementPoints).toBe(7);
    expect(strong.totalRoundScore).toBeGreaterThan(weak.totalRoundScore);
    // Order of the returned array matches input order, not rank order.
    expect(scoring.map((entry) => entry.teamId)).toEqual(["weak", "strong"]);
  });

  it("folds judging scores into the pre-placement total", () => {
    const fills = [fillFor("adj-collaborative", "p1", "Priya", "principle-adj")];
    const scoring = scoreRound(
      pack,
      [
        { teamId: "a", fills },
        { teamId: "b", fills },
      ],
      [
        { teamId: "a", promptBonus: 10, cohesionBonus: 10 },
        { teamId: "b", promptBonus: 0, cohesionBonus: 0 },
      ],
    );
    const a = scoring.find((entry) => entry.teamId === "a")!;
    const b = scoring.find((entry) => entry.teamId === "b")!;
    expect(a.promptBonus).toBe(10);
    expect(a.placementPoints).toBe(10);
    expect(b.placementPoints).toBe(7);
  });
});

describe("scoreRound with a sabotaged fill", () => {
  it("excludes the stolen fill from the receiving team's points and discloses both sides", () => {
    const victimFill = fillFor("noun-goblin", "p1", "Priya", "principle-noun"); // wildcard: 5
    const stolenFill = { ...victimFill, sabotagedFrom: { playerId: "p1", teamId: "goblin" } };
    const scoring = scoreRound(
      pack,
      [
        { teamId: "goblin", fills: [victimFill] },
        { teamId: "waffle", fills: [fillFor("adj-collaborative", "p2", "Sam", "principle-adj"), stolenFill] },
      ],
      null,
    );
    const waffle = scoring.find((entry) => entry.teamId === "waffle")!;
    const goblin = scoring.find((entry) => entry.teamId === "goblin")!;
    // Only the collaborative common word (1pt) counts — the stolen wildcard (5pt) does not.
    expect(waffle.wordPoints).toBe(1);
    expect(waffle.sabotage).toMatchObject({ direction: "received", otherTeamId: "goblin", text: "goblin" });
    expect(goblin.sabotage).toMatchObject({ direction: "sent", otherTeamId: "waffle", text: "goblin" });
  });
});

describe("scoreRound with an empty pack edge case", () => {
  it("returns an empty array for no teams", () => {
    const empty: ContentPack = pack;
    expect(scoreRound(empty, [], null)).toEqual([]);
  });
});
