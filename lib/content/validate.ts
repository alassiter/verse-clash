import { bucketWords } from "@/lib/content/chaos";
import { DealError, slotsForTemplate, wordsForSlot } from "@/lib/content/deal";
import { contentPackSchema } from "@/lib/content/schema";
import type {
  ContentPack,
  Prompt,
  Slot,
  ValidationIssue,
  ValidationResult,
} from "@/lib/content/types";

function promptTexts(prompt: Prompt): Array<{ text: string; path: string }> {
  const texts: Array<{ text: string; path: string }> = [
    { text: prompt.text, path: `prompts.${prompt.id}.text` },
  ];
  if (prompt.tease) {
    texts.push({ text: prompt.tease, path: `prompts.${prompt.id}.tease` });
  }
  return texts;
}

function collectTexts(pack: {
  templates: ContentPack["templates"];
  slots: ContentPack["slots"];
  words: ContentPack["words"];
}): Array<{ text: string; path: string }> {
  const texts: Array<{ text: string; path: string }> = [];
  for (const template of pack.templates) {
    for (const [index, segment] of template.segments.entries()) {
      if (segment.type === "static") {
        texts.push({
          text: segment.text,
          path: `templates.${template.id}.segments.${index}`,
        });
      }
    }
  }
  for (const slot of pack.slots) {
    texts.push({
      text: slot.defaultFiller,
      path: `slots.${slot.id}.defaultFiller`,
    });
    texts.push({
      text: slot.playerLabel,
      path: `slots.${slot.id}.playerLabel`,
    });
  }
  for (const word of pack.words) {
    texts.push({ text: word.text, path: `words.${word.id}.text` });
  }
  return texts;
}

function assignmentCounts(slots: Slot[], maxTeamSize: number): Map<string, number> {
  const counts = new Map<string, number>();
  for (let i = 0; i < maxTeamSize; i += 1) {
    const slot = slots[i % slots.length];
    counts.set(slot.id, (counts.get(slot.id) ?? 0) + 1);
  }
  return counts;
}

function canDealTemplate(
  pack: ContentPack,
  templateId: string,
  promptId: string,
  maxTeamSize: number,
): ValidationIssue | null {
  let slots: Slot[];
  try {
    slots = slotsForTemplate(pack, templateId);
  } catch (error) {
    if (error instanceof DealError) {
      return { code: "missing_slot", message: error.message, path: templateId };
    }
    throw error;
  }
  const counts = assignmentCounts(slots, maxTeamSize);
  const usedByRole = new Map<string, { sensible: number; strange: number; chaos: number }>();

  for (const slot of slots) {
    const assignments = counts.get(slot.id) ?? 0;
    const needed = usedByRole.get(slot.grammaticalRole) ?? {
      sensible: 0,
      strange: 0,
      chaos: 0,
    };
    needed.sensible += assignments * 2;
    needed.strange += assignments * 2;
    needed.chaos += assignments * 1;
    usedByRole.set(slot.grammaticalRole, needed);
  }

  for (const [role, needed] of usedByRole) {
    const sampleSlot = slots.find((slot) => slot.grammaticalRole === role);
    if (!sampleSlot) continue;
    const pool = wordsForSlot(pack, sampleSlot, promptId);
    const buckets = bucketWords(pool);
    if (
      buckets.sensible.length < needed.sensible ||
      buckets.strange.length < needed.strange ||
      buckets.chaos.length < needed.chaos
    ) {
      return {
        code: "impossible_deal_mix",
        message: `Not enough ${role} words to deal a 2/2/1 mix for ${maxTeamSize} players.`,
        path: `${templateId}.${role}`,
      };
    }
  }
  return null;
}

/**
 * Validates a single prompt against a pack without requiring it to already be
 * registered in pack.prompts — used both for full-pack validation and for
 * gating incrementally generated prompts before they're added to the runtime
 * pool (see lib/ai/promptGenerator.ts).
 */
export function validatePromptCandidate(
  pack: ContentPack,
  candidate: Prompt,
  options: { maxTeamSize?: number } = {},
): ValidationIssue[] {
  const maxTeamSize = options.maxTeamSize ?? 4;
  const issues: ValidationIssue[] = [];
  const templateById = new Map(pack.templates.map((template) => [template.id, template]));

  if (candidate.compatibleTemplateIds.some((id) => !templateById.has(id))) {
    issues.push({
      code: "missing_template",
      message: `Prompt ${candidate.id} references an unknown template.`,
      path: `prompts.${candidate.id}`,
    });
  }

  for (const { text, path } of promptTexts(candidate)) {
    for (const term of pack.safety.blockedTerms) {
      if (text.toLowerCase().includes(term.toLowerCase())) {
        issues.push({
          code: "blocked_term",
          message: `Blocked term "${term}" found in authored text.`,
          path,
        });
      }
    }
  }

  for (const templateId of candidate.compatibleTemplateIds) {
    if (!templateById.has(templateId)) continue;
    const dealIssue = canDealTemplate(pack, templateId, candidate.id, maxTeamSize);
    if (dealIssue) {
      issues.push(dealIssue);
    }
  }

  return issues;
}

export function validateContentPack(
  input: unknown,
  options: { maxTeamSize?: number } = {},
): ValidationResult {
  const maxTeamSize = options.maxTeamSize ?? 4;
  const parsed = contentPackSchema.safeParse(input);
  if (!parsed.success) {
    const issues: ValidationIssue[] = parsed.error.issues.map((issue) => {
      const path = issue.path.join(".");
      if (path.includes("contentMode") || issue.message.includes("work_safe")) {
        return {
          code: "content_mode",
          message: "Work Safe is the only supported content mode.",
          path,
        };
      }
      return {
        code: "invalid_schema",
        message: issue.message,
        path,
      };
    });
    return { ok: false, issues };
  }

  const data = parsed.data;
  const issues: ValidationIssue[] = [];
  const pack: ContentPack = {
    ...data,
    contentMode: data.safety.contentMode,
  };

  const slotById = new Map(pack.slots.map((slot) => [slot.id, slot]));

  for (const prompt of pack.prompts) {
    issues.push(...validatePromptCandidate(pack, prompt, { maxTeamSize }));
  }

  for (const template of pack.templates) {
    for (const segment of template.segments) {
      if (segment.type === "slot" && !slotById.has(segment.slotId)) {
        issues.push({
          code: "missing_slot",
          message: `Template ${template.id} references missing slot ${segment.slotId}.`,
          path: `templates.${template.id}.${segment.slotId}`,
        });
      }
    }
  }

  for (const { text, path } of collectTexts(pack)) {
    for (const term of pack.safety.blockedTerms) {
      if (text.toLowerCase().includes(term.toLowerCase())) {
        issues.push({
          code: "blocked_term",
          message: `Blocked term "${term}" found in authored text.`,
          path,
        });
      }
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return { ok: true, pack };
}
