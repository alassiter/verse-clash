import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient } from "@/lib/ai/client";
import { verifyComposition } from "@/lib/ai/verify";
import { assembleComposition } from "@/lib/content";
import type { AssembledSegment, CompositionFill, ContentPack } from "@/lib/content";
import type {
  AiComposer,
  ComposeJudgeInput,
  ComposeJudgeResult,
  JudgeScore,
} from "@/lib/game/types";

const COMPOSER_MODEL = process.env.AI_COMPOSER_MODEL ?? "claude-opus-5";
const JUDGE_MODEL = process.env.AI_JUDGE_MODEL ?? "claude-opus-5";
const CALL_TIMEOUT_MS = 8_000;
const MAX_COMPOSE_RETRIES = 1;
// The doc's stated 60-70% floor counts against the illustrative example's own
// natural-language padding ("have", "done", "band", "even"...) that isn't
// pure grammatical glue but also isn't player content — a strict 0.6 gate
// rejected real, well-formed model output in testing. 0.45 still catches
// verses that are mostly invented content with player words sprinkled in.
const RATIO_FLOOR = 0.45;

const WordUsageSchema = z.object({
  slotId: z.string(),
  playerId: z.string(),
  originalText: z.string(),
  renderedText: z.string(),
});

const ComposeResponseSchema = z.object({
  verseLines: z.array(z.string()).min(1),
  wordUsage: z.array(WordUsageSchema),
});

const JudgeResponseSchema = z.object({
  scores: z.array(
    z.object({
      teamId: z.string(),
      promptBonus: z.number().min(0).max(10),
      cohesionBonus: z.number().min(0).max(10),
      rationale: z.string().optional(),
    }),
  ),
});

const COMPOSER_SYSTEM_PROMPT = [
  "You are the assembly engine for a party word game. Every player on a team submits exactly one word; your only job is to arrange those submitted words into a short, readable verse answering the prompt. You are not the author — the players are.",
  "",
  "Rules, none negotiable:",
  "- Every submitted word must appear in your output exactly once, in a form derivable from the original word (you may conjugate, pluralize, or adjust tense/case, but never substitute a synonym or unrelated word).",
  "- Never drop a submitted word, even if it seems off-topic or awkward for the prompt — make it work.",
  "- You may add ordinary connective/glue words (articles, prepositions, conjunctions, simple verbs) and punctuation sparingly, but at least 60% of the meaningful words in your output must be the players' own submitted words.",
  "- Do not invent unrelated new content, characters, or plot beyond arranging the given words.",
  "- For every submitted word, report exactly how you rendered it in `wordUsage`, echoing back the same slotId and playerId you were given, plus the original text and the exact substring you used in the verse.",
].join("\n");

function segmentsToText(segments: AssembledSegment[]): string {
  return segments.map((segment) => segment.text).join(" ");
}

function buildComposePrompt(
  pack: ContentPack,
  input: ComposeJudgeInput,
  team: { teamId: string; fills: CompositionFill[] },
): string {
  const prompt = pack.prompts.find((entry) => entry.id === input.promptId);
  const wordList = team.fills
    .map((fill) => `- slotId="${fill.slotId}" playerId="${fill.playerId}" (${fill.displayName}): "${fill.text}"`)
    .join("\n");
  const playerCount = team.fills.length;
  const lengthHint =
    playerCount <= 5
      ? "one sentence"
      : playerCount <= 10
        ? "two sentences"
        : playerCount <= 16
          ? "three sentences or lines"
          : "four to five short lines";
  return [
    `Prompt: ${prompt?.text ?? input.promptId}`,
    prompt?.formatHint ? `Format: ${prompt.formatHint}` : null,
    `Team size: ${playerCount} player(s). Target length: ${lengthHint}.`,
    `Submitted words (every one must appear, exactly once each):`,
    wordList,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

function toSegments(
  parsed: z.infer<typeof ComposeResponseSchema>,
  fills: CompositionFill[],
): AssembledSegment[] {
  const text = parsed.verseLines.join(" ");
  const haystack = text.toLowerCase();
  const fillByKey = new Map(fills.map((fill) => [`${fill.slotId}:${fill.playerId}`, fill]));

  const ordered = parsed.wordUsage
    .map((usage) => ({
      usage,
      index: haystack.indexOf(usage.renderedText.toLowerCase()),
    }))
    .filter((entry) => entry.index >= 0)
    .sort((a, b) => a.index - b.index);

  const segments: AssembledSegment[] = [];
  let cursor = 0;
  for (const { usage, index } of ordered) {
    if (index < cursor) continue;
    const fill = fillByKey.get(`${usage.slotId}:${usage.playerId}`);
    if (!fill) continue;
    if (index > cursor) {
      segments.push({ type: "static", text: text.slice(cursor, index) });
    }
    const end = index + usage.renderedText.length;
    segments.push({
      type: "contribution",
      text: text.slice(index, end),
      playerId: fill.playerId,
      displayName: fill.displayName,
      slotId: fill.slotId,
    });
    cursor = end;
  }
  if (cursor < text.length) {
    segments.push({ type: "static", text: text.slice(cursor) });
  }
  return segments;
}

function deterministicFallback(
  pack: ContentPack,
  templateId: string,
  team: { teamId: string; fills: CompositionFill[] },
): { teamId: string; segments: AssembledSegment[]; source: "deterministic_fallback" } {
  return {
    teamId: team.teamId,
    segments: assembleComposition(pack, { templateId, fills: team.fills }).segments,
    source: "deterministic_fallback",
  };
}

async function composeTeam(
  client: NonNullable<ReturnType<typeof getAnthropicClient>>,
  pack: ContentPack,
  input: ComposeJudgeInput,
  team: { teamId: string; fills: CompositionFill[] },
): Promise<{
  teamId: string;
  segments: AssembledSegment[];
  source: "ai" | "deterministic_fallback";
}> {
  const attempt = async (correction?: string) => {
    const userContent = correction
      ? `${buildComposePrompt(pack, input, team)}\n\nYour previous attempt was rejected: ${correction}`
      : buildComposePrompt(pack, input, team);
    const response = await client.messages.parse(
      {
        model: COMPOSER_MODEL,
        max_tokens: 1024,
        output_config: { effort: "low", format: zodOutputFormat(ComposeResponseSchema) },
        system: COMPOSER_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      },
      { timeout: CALL_TIMEOUT_MS },
    );
    return response.parsed_output;
  };

  let parsed: z.infer<typeof ComposeResponseSchema> | null = null;
  let lastReason = "no response";
  for (let i = 0; i <= MAX_COMPOSE_RETRIES; i += 1) {
    let candidate: z.infer<typeof ComposeResponseSchema> | null;
    try {
      candidate = await attempt(i === 0 ? undefined : lastReason);
    } catch (err) {
      lastReason = err instanceof Error ? err.message : "request failed";
      continue;
    }
    if (!candidate) continue;
    const verseText = candidate.verseLines.join(" ");
    const result = verifyComposition(team.fills, candidate.wordUsage, verseText, RATIO_FLOOR);
    if (result.ok) {
      parsed = candidate;
      break;
    }
    lastReason = result.reason;
  }

  if (parsed) {
    return { teamId: team.teamId, segments: toSegments(parsed, team.fills), source: "ai" };
  }
  console.warn(`[ai-composer] team ${team.teamId} fell back to deterministic: ${lastReason}`);
  return deterministicFallback(pack, input.templateId, team);
}

async function judgeVerses(
  client: NonNullable<ReturnType<typeof getAnthropicClient>>,
  pack: ContentPack,
  input: ComposeJudgeInput,
  compositions: ComposeJudgeResult["compositions"],
): Promise<JudgeScore[] | undefined> {
  const prompt = pack.prompts.find((entry) => entry.id === input.promptId);
  const verses = compositions
    .map((entry) => `Team ${entry.teamId}:\n${segmentsToText(entry.segments)}`)
    .join("\n\n");
  const userContent = [
    `Prompt: ${prompt?.text ?? input.promptId}`,
    "Score each team's verse on two 0-10 scales:",
    "- promptBonus: how well the verse satisfies/answers the prompt",
    "- cohesionBonus: how well the team's disparate submitted words were woven into something coherent",
    "",
    verses,
  ].join("\n");

  try {
    const response = await client.messages.parse(
      {
        model: JUDGE_MODEL,
        max_tokens: 1024,
        output_config: { effort: "low", format: zodOutputFormat(JudgeResponseSchema) },
        messages: [{ role: "user", content: userContent }],
      },
      { timeout: CALL_TIMEOUT_MS },
    );
    return response.parsed_output?.scores ?? undefined;
  } catch (err) {
    console.warn(
      `[ai-composer] judging call failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return undefined;
  }
}

export function createAnthropicComposer(pack: ContentPack): AiComposer {
  return {
    async composeAndJudge(input: ComposeJudgeInput): Promise<ComposeJudgeResult> {
      const client = getAnthropicClient();
      const compositions = client
        ? await Promise.all(input.teams.map((team) => composeTeam(client, pack, input, team)))
        : input.teams.map((team) => deterministicFallback(pack, input.templateId, team));
      const judging = client
        ? await judgeVerses(client, pack, input, compositions)
        : undefined;
      return { requestId: input.requestId, compositions, judging };
    },
  };
}
