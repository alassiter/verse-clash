import prompts from "@/content/prompts.json";
import promptsFallback from "@/content/prompts.fallback.json";
import safety from "@/content/safety.json";
import slots from "@/content/slots.json";
import templates from "@/content/templates.json";
import words from "@/content/words.json";
import { validateContentPack } from "@/lib/content/validate";
import type { ValidationResult } from "@/lib/content/types";

export function loadContentPack(): ValidationResult {
  return validateContentPack({
    prompts: [...prompts, ...promptsFallback],
    templates,
    slots,
    words,
    safety,
  });
}
