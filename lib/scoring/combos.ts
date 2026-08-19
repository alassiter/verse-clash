import type { CompositionFill, ContentPack, Word } from "@/lib/content";
import type { JudgeScore } from "@/lib/game/types";

export type WordScoreBreakdown = { wordId: string; playerId: string; points: number };

export type ComboBonusType =
  | "alliteration"
  | "rhyme"
  | "theme_cluster"
  | "wildcard_used"
  | "pos_variety";

export type ComboBonus = { type: ComboBonusType; points: number; detail?: string };

export type SabotageInfo = {
  direction: "sent" | "received";
  otherTeamId: string;
  playerId: string;
  playerDisplayName: string;
  text: string;
};

export type TeamRoundScore = {
  teamId: string;
  wordPoints: number;
  wordBreakdown: WordScoreBreakdown[];
  comboBonuses: ComboBonus[];
  comboPoints: number;
  promptBonus: number;
  cohesionBonus: number;
  placementPoints: number;
  crowdFavoriteBonus: number;
  totalRoundScore: number;
  sabotage?: SabotageInfo;
};

const RARITY_POINTS: Record<Word["rarity"], number> = {
  common: 1,
  interesting: 2,
  rare: 3,
  wildcard: 5,
};

const PLACEMENT_POINTS = [10, 7, 4, 2];
const ALLITERATION_BONUS = 3;
const RHYME_BONUS = 3;
const THEME_CLUSTER_BONUS = 4;
const WILDCARD_BONUS = 5;
const POS_VARIETY_BONUS = 5;
const THEME_CLUSTER_MIN = 3;
const RHYME_SUFFIX_LENGTH = 2;

function wordFor(pack: ContentPack, fill: CompositionFill): Word | undefined {
  return fill.wordId ? pack.words.find((entry) => entry.id === fill.wordId) : undefined;
}

function firstLetter(text: string): string | null {
  const match = text.trim().match(/[a-z]/i);
  return match ? match[0].toLowerCase() : null;
}

function suffix(text: string, length: number): string | null {
  const cleaned = text.trim().toLowerCase().replace(/[^a-z]/g, "");
  return cleaned.length >= length ? cleaned.slice(-length) : null;
}

export function computeWordPoints(
  pack: ContentPack,
  fills: CompositionFill[],
): { wordPoints: number; wordBreakdown: WordScoreBreakdown[] } {
  const wordBreakdown: WordScoreBreakdown[] = [];
  for (const fill of fills) {
    const word = wordFor(pack, fill);
    if (!word) continue; // house/unresolved fills earn nothing
    wordBreakdown.push({
      wordId: word.id,
      playerId: fill.playerId,
      points: RARITY_POINTS[word.rarity],
    });
  }
  const wordPoints = wordBreakdown.reduce((sum, entry) => sum + entry.points, 0);
  return { wordPoints, wordBreakdown };
}

/** Two or more submitted words sharing a starting letter. */
export function detectAlliteration(fills: CompositionFill[]): ComboBonus | null {
  const counts = new Map<string, number>();
  for (const fill of fills) {
    const letter = firstLetter(fill.text);
    if (!letter) continue;
    counts.set(letter, (counts.get(letter) ?? 0) + 1);
  }
  for (const [letter, count] of counts) {
    if (count >= 2) {
      return {
        type: "alliteration",
        points: ALLITERATION_BONUS,
        detail: `${count} words starting with "${letter}"`,
      };
    }
  }
  return null;
}

/** Two or more submitted words sharing a suffix — a cheap rhyme heuristic, no phoneme dictionary. */
export function detectRhyme(fills: CompositionFill[]): ComboBonus | null {
  const bySuffix = new Map<string, number>();
  for (const fill of fills) {
    const tail = suffix(fill.text, RHYME_SUFFIX_LENGTH);
    if (!tail) continue;
    bySuffix.set(tail, (bySuffix.get(tail) ?? 0) + 1);
  }
  for (const [tail, count] of bySuffix) {
    if (count >= 2) {
      return { type: "rhyme", points: RHYME_BONUS, detail: `${count} words ending in "-${tail}"` };
    }
  }
  return null;
}

/** Three or more submitted words sharing a semantic category. */
export function detectThemeCluster(fills: CompositionFill[]): ComboBonus | null {
  const counts = new Map<string, number>();
  for (const fill of fills) {
    counts.set(fill.semanticCategory, (counts.get(fill.semanticCategory) ?? 0) + 1);
  }
  for (const [category, count] of counts) {
    if (count >= THEME_CLUSTER_MIN) {
      return {
        type: "theme_cluster",
        points: THEME_CLUSTER_BONUS,
        detail: `${count} words in "${category}"`,
      };
    }
  }
  return null;
}

export function detectWildcardUsed(pack: ContentPack, fills: CompositionFill[]): ComboBonus | null {
  const wildcard = fills
    .map((fill) => wordFor(pack, fill))
    .find((word) => word?.rarity === "wildcard");
  return wildcard
    ? { type: "wildcard_used", points: WILDCARD_BONUS, detail: `"${wildcard.text}"` }
    : null;
}

/** Every player on the team chose a different grammatical role. */
export function detectPosVariety(pack: ContentPack, fills: CompositionFill[]): ComboBonus | null {
  if (fills.length < 2) return null;
  const roles = fills
    .map((fill) => wordFor(pack, fill)?.grammaticalRole)
    .filter((role): role is NonNullable<typeof role> => Boolean(role));
  if (roles.length !== fills.length) return null;
  const unique = new Set(roles);
  return unique.size === fills.length
    ? {
        type: "pos_variety",
        points: POS_VARIETY_BONUS,
        detail: "every player chose a different part of speech",
      }
    : null;
}

export function detectCombos(pack: ContentPack, fills: CompositionFill[]): ComboBonus[] {
  return [
    detectAlliteration(fills),
    detectRhyme(fills),
    detectThemeCluster(fills),
    detectWildcardUsed(pack, fills),
    detectPosVariety(pack, fills),
  ].filter((bonus): bonus is ComboBonus => bonus !== null);
}

/**
 * Combines deterministic word/combo points with the AI judging call's
 * prompt/cohesion bonuses and ranks teams into placement points. Team order
 * in the returned array matches `teamsFills`, not the placement ranking.
 */
export function scoreRound(
  pack: ContentPack,
  teamsFills: Array<{ teamId: string; fills: CompositionFill[] }>,
  judging: JudgeScore[] | null,
): TeamRoundScore[] {
  const scored: TeamRoundScore[] = teamsFills.map(({ teamId, fills }) => {
    // A sabotaged-in fill isn't the receiving team's own contribution — it
    // earns them no word/combo points, only narrative content in the verse.
    const scorableFills = fills.filter((fill) => !fill.sabotagedFrom);
    const { wordPoints, wordBreakdown } = computeWordPoints(pack, scorableFills);
    const comboBonuses = detectCombos(pack, scorableFills);
    const comboPoints = comboBonuses.reduce((sum, bonus) => sum + bonus.points, 0);
    const judged = judging?.find((entry) => entry.teamId === teamId);
    return {
      teamId,
      wordPoints,
      wordBreakdown,
      comboBonuses,
      comboPoints,
      promptBonus: judged?.promptBonus ?? 0,
      cohesionBonus: judged?.cohesionBonus ?? 0,
      placementPoints: 0,
      crowdFavoriteBonus: 0,
      totalRoundScore: 0,
    };
  });

  for (const { teamId, fills } of teamsFills) {
    const stolen = fills.find((fill) => fill.sabotagedFrom);
    if (!stolen?.sabotagedFrom) continue;
    const target = scored.find((entry) => entry.teamId === teamId);
    const source = scored.find((entry) => entry.teamId === stolen.sabotagedFrom!.teamId);
    const base = {
      playerId: stolen.playerId,
      playerDisplayName: stolen.displayName,
      text: stolen.text,
    };
    if (target) {
      target.sabotage = { ...base, direction: "received", otherTeamId: stolen.sabotagedFrom.teamId };
    }
    if (source) {
      source.sabotage = { ...base, direction: "sent", otherTeamId: teamId };
    }
  }

  const preScore = (entry: TeamRoundScore) =>
    entry.wordPoints + entry.comboPoints + entry.promptBonus + entry.cohesionBonus;
  const ranked = [...scored].sort((a, b) => preScore(b) - preScore(a));
  ranked.forEach((entry, index) => {
    entry.placementPoints = PLACEMENT_POINTS[index] ?? 0;
    entry.totalRoundScore = preScore(entry) + entry.placementPoints;
  });

  return scored;
}
