import Anthropic from "@anthropic-ai/sdk";

let cached: Anthropic | null | undefined;

export function getAnthropicClient(): Anthropic | null {
  if (cached === undefined) {
    cached = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
  }
  return cached;
}
