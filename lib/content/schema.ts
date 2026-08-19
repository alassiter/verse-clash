import { z } from "zod";
import {
  GRAMMATICAL_ROLES,
  SEMANTIC_CATEGORIES,
  TONES,
  WORD_RARITIES,
} from "@/lib/content/types";

const grammaticalRole = z.enum(GRAMMATICAL_ROLES);
const semanticCategory = z.enum(SEMANTIC_CATEGORIES);
const tone = z.enum(TONES);
const intensity = z.union([z.literal(1), z.literal(2), z.literal(3)]);
const wordRarity = z.enum(WORD_RARITIES);

export const promptSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  tease: z.string().optional(),
  formatHint: z.string().min(1),
  compatibleTemplateIds: z.array(z.string().min(1)).min(1),
  workplaceSafe: z.literal(true),
});

export const templateSegmentSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("static"), text: z.string() }),
  z.object({ type: z.literal("slot"), slotId: z.string().min(1) }),
]);

export const templateSchema = z.object({
  id: z.string().min(1),
  promptIds: z.array(z.string().min(1)).min(1),
  title: z.string().min(1),
  segments: z.array(templateSegmentSchema).min(1),
});

export const slotSchema = z.object({
  id: z.string().min(1),
  templateId: z.string().min(1),
  playerLabel: z.string().min(1),
  grammaticalRole,
  semanticCategory,
  tone,
  intensity,
  positionPreference: z.enum(["any", "end_of_sentence", "callback_later"]),
  repetitionPotential: z.number(),
  chaosValue: z.number(),
  safetyConstraints: z.array(z.string()),
  defaultFiller: z.string().min(1),
  echo: z.boolean().optional(),
  dramaticPlacement: z.boolean().optional(),
  callback: z.boolean().optional(),
  intensifier: z.boolean().optional(),
});

export const wordSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  grammaticalRole,
  semanticCategory: z.string().min(1),
  tone: z.string().min(1),
  intensity,
  chaos: z.number(),
  rarity: wordRarity,
  workplaceSafe: z.literal(true),
  bannedPairCategories: z.array(z.string()).optional(),
  compatiblePromptIds: z.array(z.string()).optional(),
});

export const safetySchema = z.object({
  blockedTerms: z.array(z.string()),
  bannedCategoryPairs: z.array(z.tuple([z.string(), z.string()])),
  contentMode: z.literal("work_safe"),
});

export const contentPackSchema = z.object({
  prompts: z.array(promptSchema).min(1),
  templates: z.array(templateSchema).min(1),
  slots: z.array(slotSchema).min(1),
  words: z.array(wordSchema).min(1),
  safety: safetySchema,
});
