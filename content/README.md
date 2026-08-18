# Content packs

Author prompts, templates, slots, words, and safety lists as JSON in this folder. The running game never calls an LLM. Packs are validated at load and again when a composition is assembled.

Work Safe is the only supported `contentMode`. Extra content modes must not be added here.

## Files

| File | Purpose |
| --- | --- |
| `prompts.json` | Shared round prompts. Need at least 3 so host skip is useful. |
| `templates.json` | Static connective language plus ordered slot references. |
| `slots.json` | One record per contribution slot (player-facing label + house filler). |
| `words.json` | Shared bank. The server deals 5 options per player. |
| `safety.json` | Blocked terms, banned category pairs, and `work_safe` mode. |

## Record shapes

### Prompt

```ts
{
  id: string
  text: string
  tease?: string
  formatHint: string
  compatibleTemplateIds: string[]
  workplaceSafe: true
}
```

### Template

```ts
{
  id: string
  promptIds: string[]
  title: string
  segments: Array<
    | { type: "static"; text: string }
    | { type: "slot"; slotId: string }
  >
}
```

Static segments own articles, pronouns, prepositions, and punctuation. Players only supply the interesting words.

### Slot

```ts
{
  id: string
  templateId: string
  playerLabel: string
  grammaticalRole: "adjective" | "noun" | "verb" | "noun_phrase" | "verb_phrase"
  semanticCategory: "object" | "animal" | "food" | "weather" | "office" | "fantasy" | "place" | "action" | "emotion" | "adjective" | "profession" | "abstract"
  tone: "neutral" | "sincere" | "dramatic" | "absurd"
  intensity: 1 | 2 | 3
  positionPreference: "any" | "end_of_sentence" | "callback_later"
  repetitionPotential: number
  chaosValue: number
  safetyConstraints: string[]
  defaultFiller: string
  echo?: boolean
  dramaticPlacement?: boolean
  callback?: boolean
  intensifier?: boolean
}
```

`echo`, `dramaticPlacement`, `callback`, and `intensifier` are reserved for later round types. Round 1 ignores them. Keep the fields so packs do not need a rewrite.

`positionPreference`, `repetitionPotential`, and `chaosValue` are also unused in Round 1 but must be present.

Players see `playerLabel` plus five options. They do not see the template or neighboring slots.

### Word

```ts
{
  id: string
  text: string
  grammaticalRole: "adjective" | "noun" | "verb" | "noun_phrase" | "verb_phrase"
  semanticCategory: string
  tone: string
  intensity: 1 | 2 | 3
  chaos: number
  workplaceSafe: true
  bannedPairCategories?: string[]
  compatiblePromptIds?: string[]
}
```

`compatiblePromptIds` empty or omitted means the word can be dealt for every prompt.

### Safety

```ts
{
  blockedTerms: string[]
  bannedCategoryPairs: Array<[string, string]>
  contentMode: "work_safe"
}
```

## Deal mix

At round start the server deals **5 options per seated player**:

- 2 sensible (`chaos <= 0.3`)
- 2 strange (`chaos` 0.31–0.7)
- 1 chaos (`chaos > 0.7`)

Option text is unique within a team. The same word may be reused on another team.

Overflow players (more people than template slots) still receive a real slot assignment; slots wrap in order. Unused slots use that slot’s `defaultFiller`.

## Safety behavior

Validation runs when a pack loads:

- Structure must match the shapes above
- Every template slot reference must exist
- Every prompt must have at least one compatible template
- Word banks must support the 2/2/1 mix for the configured team size (sample pack: 4)
- `workplaceSafe` must be true; `contentMode` must be `work_safe`
- Blocked terms may not appear in prompts, templates, fillers, or word text

Validation runs again when a composition is assembled. An unsafe contribution (blocked term, or a banned semantic-category pair with another contribution in the same piece) is replaced with that slot’s `defaultFiller`. If unsure, replace.

## Sample pack

This folder ships a 4-slot pack that can deal a 2–4 player table across the four default teams. Author a larger 11-slot / 44-player bank against the same contract; extra files are not required — grow these JSON arrays.

Keep vocabulary workplace-safe. No sexual, romantic-physical, body-part, substance, violent, political, or religious-mockery words — including combinations.
