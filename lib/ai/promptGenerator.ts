import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient } from "@/lib/ai/client";
import type { Prompt } from "@/lib/content";

const PROMPT_MODEL = process.env.AI_PROMPT_MODEL ?? "claude-sonnet-5";
const CALL_TIMEOUT_MS = 20_000;

export const PROMPT_CATEGORIES = [
  "poem",
  "speech",
  "warning_or_report",
  "story_opening",
  "message",
  "ad_or_prophecy",
] as const;

export type PromptCategory = (typeof PROMPT_CATEGORIES)[number];

const CATEGORY_BRIEF: Record<PromptCategory, string> = {
  poem: "a short poem about something ordinary treated with way too much emotion",
  speech: "a dramatic, heroic, or inspirational speech given by someone wildly unqualified or in a ridiculous situation (villains, pirates, royalty, and the incompetent all welcome)",
  warning_or_report: "an official-sounding warning, report, or note left behind describing something strange",
  story_opening: "the opening moment of a story that starts small and spirals into something absurd",
  message: "a message — a breakup, a confession, a farewell — between two parties who really shouldn't be writing one to each other",
  ad_or_prophecy: "an advertisement or prophecy that sounds important but is fundamentally ridiculous",
};

const GeneratedPromptSchema = z.object({
  prompts: z.array(
    z.object({
      text: z.string().min(1),
      tease: z.string().optional(),
      formatHint: z.string().min(1),
    }),
  ),
});

const SYSTEM_PROMPT = [
  "You write short, punchy writing prompts for a work-safe party word game. Each prompt sets up a dramatic or heartfelt scene — a love poem, a villain's monologue, a pirate captain's pep talk, a prophecy, a robot's confession — and players submit words that get woven into a verse answering it.",
  "",
  "Rules:",
  "- Work-safe only: no violence, no explicit sexual/romantic content (crushes and confessions are fine, nothing graphic), no profanity, nothing that couldn't be read aloud at a party with mixed company.",
  "- Each prompt is one sentence, an imperative instruction like \"Write a...\", \"Give a...\", \"Create a...\", or \"Describe a...\".",
  "- Lean into exaggerated genres and roles: villains, pirates, robots, royalty, detectives, monsters, doomed vacations, terrible first days, prophecies, ridiculous romances. Avoid corporate/office settings — that's not this game's theme.",
  "- The comedy should come from the contrast between a serious, dramatic, or heartfelt format and a silly or mundane subject — not from the prompt itself explaining the joke, and not from the specific words (those come from the players).",
  "- `tease` is an optional short, punchy aside (under 10 words) that hints at the comedic angle without giving away specific words.",
  "- `formatHint` is a 2-4 word label for the format, like \"villain monologue\" or \"love poem\".",
].join("\n");

function buildUserPrompt(input: {
  count: number;
  category: PromptCategory;
  recentThemes: string[];
}): string {
  const lines = [
    `Generate ${input.count} new prompts in the category: ${CATEGORY_BRIEF[input.category]}.`,
  ];
  if (input.recentThemes.length > 0) {
    lines.push(
      "Avoid repeating these recently-used prompts or close variations of them:",
      ...input.recentThemes.map((theme) => `- ${theme}`),
    );
  }
  return lines.join("\n");
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `gen-${Date.now()}-${counter}`;
}

/**
 * Generates a batch of candidate prompts via a structured Claude call. Callers
 * are responsible for running each candidate through
 * `validatePromptCandidate` before adding it to a live pool — this function
 * only handles generation, not moderation/feasibility gating.
 */
export async function generatePromptBatch(input: {
  count: number;
  category: PromptCategory;
  recentThemes: string[];
  templateId: string;
}): Promise<Prompt[]> {
  const client = getAnthropicClient();
  if (!client) return [];
  try {
    const response = await client.messages.parse(
      {
        model: PROMPT_MODEL,
        max_tokens: 1024,
        output_config: { effort: "low", format: zodOutputFormat(GeneratedPromptSchema) },
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(input) }],
      },
      { timeout: CALL_TIMEOUT_MS, maxRetries: 0 },
    );
    const parsed = response.parsed_output;
    if (!parsed) return [];
    return parsed.prompts.slice(0, input.count).map(
      (candidate): Prompt => ({
        id: nextId(),
        text: candidate.text,
        tease: candidate.tease,
        formatHint: candidate.formatHint,
        compatibleTemplateIds: [input.templateId],
        workplaceSafe: true,
      }),
    );
  } catch (err) {
    console.warn(
      `[prompt-generator] batch generation failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return [];
  }
}
