export const GRAMMATICAL_ROLES = [
  "adjective",
  "noun",
  "verb",
  "noun_phrase",
  "verb_phrase",
] as const;

export const SEMANTIC_CATEGORIES = [
  "object",
  "animal",
  "food",
  "weather",
  "office",
  "fantasy",
  "place",
  "action",
  "emotion",
  "adjective",
  "profession",
  "abstract",
] as const;

export const TONES = ["neutral", "sincere", "dramatic", "absurd"] as const;

export type GrammaticalRole = (typeof GRAMMATICAL_ROLES)[number];
export type SemanticCategory = (typeof SEMANTIC_CATEGORIES)[number];
export type Tone = (typeof TONES)[number];
export type Intensity = 1 | 2 | 3;
export type ContentMode = "work_safe";

export type Prompt = {
  id: string;
  text: string;
  tease?: string;
  formatHint: string;
  compatibleTemplateIds: string[];
  workplaceSafe: true;
};

export type TemplateSegment =
  | { type: "static"; text: string }
  | { type: "slot"; slotId: string };

export type Template = {
  id: string;
  promptIds: string[];
  title: string;
  segments: TemplateSegment[];
};

export type Slot = {
  id: string;
  templateId: string;
  playerLabel: string;
  grammaticalRole: GrammaticalRole;
  semanticCategory: SemanticCategory;
  tone: Tone;
  intensity: Intensity;
  positionPreference: "any" | "end_of_sentence" | "callback_later";
  repetitionPotential: number;
  chaosValue: number;
  safetyConstraints: string[];
  defaultFiller: string;
  echo?: boolean;
  dramaticPlacement?: boolean;
  callback?: boolean;
  intensifier?: boolean;
};

export type Word = {
  id: string;
  text: string;
  grammaticalRole: GrammaticalRole;
  semanticCategory: string;
  tone: string;
  intensity: Intensity;
  chaos: number;
  workplaceSafe: true;
  bannedPairCategories?: string[];
  compatiblePromptIds?: string[];
};

export type Safety = {
  blockedTerms: string[];
  bannedCategoryPairs: [string, string][];
  contentMode: ContentMode;
};

export type ContentPack = {
  prompts: Prompt[];
  templates: Template[];
  slots: Slot[];
  words: Word[];
  safety: Safety;
  contentMode: ContentMode;
};

export type ValidationIssue = {
  code: string;
  message: string;
  path?: string;
};

export type ValidationResult =
  | { ok: true; pack: ContentPack }
  | { ok: false; issues: ValidationIssue[] };

export type DealtOption = {
  id: string;
  text: string;
};

export type DealtAssignment = {
  playerId: string;
  slotId: string;
  playerLabel: string;
  options: DealtOption[];
};

export type CompositionFill = {
  slotId: string;
  text: string;
  playerId: string;
  displayName: string;
  semanticCategory: string;
  bannedPairCategories?: string[];
};

export type AssembledSegment =
  | { type: "static"; text: string }
  | {
      type: "contribution";
      text: string;
      playerId: string;
      displayName: string;
      slotId: string;
    };

export type AssembleResult = {
  segments: AssembledSegment[];
};
