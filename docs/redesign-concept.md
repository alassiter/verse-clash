# Verse Clash — Redesign Concept

Status: pre-spec thinking doc. Not a spec. Captures the pivot away from the current AI-assisted, template-slot prototype toward a magnet-poetry, bracket-tournament game. Written to be argued with before it becomes a real spec.

## 1. The core idea, restated

Verse Clash is **magnet poetry, but as a team sport with a bracket.**

Each team gets a pile of word tiles (like refrigerator magnets) that they sift through and stick onto a shared team board, arranging them into a verse. Teams don't fill in blanks in a pre-written template anymore — they compose freely from the pile. Two teams' verses then go head-to-head, the room votes, one advances, until a single verse wins the game.

This is a **bigger pivot than it sounds**: the current prototype's whole content engine (`Prompt → Template → Slot → dealt 5-word choice → server assembles`) assumes fixed grammatical slots and static connective text owned by the template. Magnet poetry assumes the opposite — players themselves place the "the," "a," "but," and punctuation-adjacent words, because those are just tiles in the pile too. Templates/slots as currently modeled don't survive this pivot; they get replaced by **word pools + a freeform board**. Flagging this now because it's the thing most worth confirming before anyone writes a spec.

## 2. Session flow, end to end

```
Home ("Join a Game" / "Host a Game")
      │
      ├─ Join → enter name → auto-assigned to a team → lobby
      │
      └─ Host → Setup screen:
             - roster / pause / resume
             - move players between teams (auto-assign is default; host can override)
             - select which prompts will be used for the next several rounds
             │
             ▼
      Host clicks Start
             │
             ▼
      Host's screen flips from "control panel" to "presentation screen"
      (Jackbox-style: this is now the shared screen everyone watches —
       cast it, project it, whatever)
             │
             ▼
      Round intro: animation + music + voiceover, builds hype
             │
             ▼
      Prompt is revealed, timer starts
             │
             ▼
      Players (on their own devices) sift the word pile → build on their
      team board → team locks in → wait for other team / timer
             │
             ▼
      Two verses face off, room votes (own team excluded), winner
      revealed with animation, loser becomes vote-only for rest of game
             │
             ▼
      Repeat until one verse wins the game
      (4-team bracket resolves itself at the round-3 final; a 2-team
       series ends when the host hits "End Game(s)" — tallies total
       games won per team, declares the majority winner, rolls credits)
```

## 3. Roles and screens

**Home screen** — unchanged from today: two boxes, "Join a Game" / "Host a Game."

**Host, pre-game** — a control surface:
- Auto-assigns joining players to a team on arrival (host can still drag/reassign manually or shuffle)
- Pause / resume the lobby
- Starts the game when ready (doesn't need to wait for everyone ready, same as today)
- **Prompt selection is fully automatic — confirmed.** The host has zero manual influence over which prompt loads. "Next Game" always auto-picks a prompt from the authored pack; there's no browsing/curation UI to build.

**Host, in-game** — becomes the **presentation screen**. This is the thing the whole room watches together (a projector, a shared Zoom screen, a TV). It carries the show: round-intro animation, music, voiceover, the big visible timer, the prompt reveal, and later the head-to-head reveal/voting/winner animation. This is the Jackbox-style "big screen" role — worth deciding explicitly whether the host keeps any lightweight controls (pause, force-advance) visible on this screen during play, or whether host input moves entirely to their own device once presentation mode kicks in. *(Open question — see §8.)*

**Player device** — a private controller, like a Jackbox controller. On phones, the board-building screen switches to landscape, since a word board needs width. Shows: the pile, the shared team board, teammates' live cursors/placements, and a Lock In control.

## 4. Team assignment

- Up to **4 teams**: Red, Green, Blue, Yellow.
- Up to **10 players per team** (so up to 40 players total — down from the old 44/11 default, worth confirming that's intentional).
- Joining auto-assigns a player to a team immediately (no ready-up-then-assign step). Host can rebalance before start.
- Support for fewer than 4 teams should exist, since "up to four" implies 2 or 3 are valid too. That affects bracket shape — see §5.

## 5. Round structure — single-elimination bracket

Reconstructing this from what you described, because the two mentions of "round one" initially read like they could mean different things. The version that's internally consistent:

- **A "round" = one head-to-head match**, not one simultaneous build across all teams.
- **Round 1**: Red vs. Blue. Both teams build independently and simultaneously (each on their own board, from their own pile, against the same prompt), then lock in. Room votes. Winner announced with an animated reveal.
- **Round 2**: Yellow vs. Green. Same shape as round 1, independent match.
- **Round 3 (Final)**: Round 1 winner vs. Round 2 winner. Same shape. Produces the game-winning verse.
- Losing teams don't leave the game — they drop to **vote-only** for every remaining round.
- **Voting rule**: everyone in the room votes each round *except* members of the two teams currently competing get to vote too, just not for their own team. So during Red vs. Blue, Red can vote (only for Blue), Blue can vote (only for Red), and Yellow/Green (not yet playing) can vote for either. This keeps players who've already been eliminated, or haven't gone yet, actively engaged the whole game instead of sitting out.

Team count decides the format:
- **2 teams** → no bracket at all — it's just Red vs. Blue playing a **series of multiple games** back to back, not a single deciding match. Host has a "Next Game" action to move to the next one, and an **"End Game(s)" button** that closes the series whenever the host chooses. Ending tallies total games won by each team across the series, declares whichever team has the majority the overall winner, and rolls a credits sequence. No fixed best-of-N or first-to-X — the host just decides when to stop.
- **3 or 4 teams** → the **bracket system** (§5's Red v Blue / Yellow v Green / final structure) applies. With 4 teams that's two round-1 matches feeding a final, as described above. With 3 teams, that shape needs a bye: one team sits out round 1 while the other two face off, then the round-1 winner meets the bye team in the final. (Which team gets the bye — random draw, host choice — is still open, but the bracket-with-a-bye shape itself is now the confirmed approach over a 3-way vote.)

**Confirmed: the host-flow pattern is shared across both formats.** Bracket mode (3 or 4 teams) uses the same "Next Game" host action to move through the fixed sequence of matches (round-1 match(es), then the final) that the 2-team series uses to move between games. And bracket mode ends the same way too — once the matches are done, the host totals everything up, declares the final winner, and rolls credits. So there's one unified ending beat ("Next Game" ... "End Game" → tally → winner → credits) rather than a bespoke one for brackets vs. series.

**Pile size grows each round.** Later rounds (and presumably surviving teams) get access to a bigger word pool than round 1 — more options, more room for a sharper verse, as the stakes go up.

**Fallback decider when there's no vote to count.** If a round ends with zero votes cast, or a tie, the match winner is decided by comparing each team's final **Sentence Structure Score** — the same deterministic pattern-matching check from §7 that grants Sabotage, just applied to each team's whole locked-in board rather than live during building. Higher score wins the round. No AI judgment, no host tiebreaker call — same transparent rule set both teams can see for themselves.

This turns out to matter more than a rare edge case. Under the voting rule above (§5, "can't vote for your own team"), a **2-team series has no possible neutral voter, ever** — every single player in the room is on Red or Blue, so there's nobody left who isn't on one of the two competing teams.

**Confirmed: in 2-team games, the host and any off-team spectators vote instead of teammates.** Anyone not seated on Red or Blue — the host, or a player who joined without being assigned to either side — casts that round's vote, so 2-team games keep a "room votes" element the same way 3/4-team games do. This means the host (or anyone facilitating) may deliberately stay off both teams specifically to serve as a neutral voter, the same "host can play or just facilitate" option already assumed in §3/§4. If a given 2-team room genuinely has nobody off-team at all — small session, host also playing — voting still has zero eligible voters, and the Sentence Structure Score fallback above is what actually decides the round in that case.

## 6. The pile and the board (the magnet-poetry mechanic)

- Each team gets its own **pile** of word tiles, drawn from the word sets appropriate to that round's prompt and pile-size tier.
- The **board** is shared and collaborative in real time — all teammates see the same board and can drag tiles onto it simultaneously (not turn-based). This is a live shared canvas, not a queue.
- Once the team is happy with the arrangement, **the team locks it in — confirmed: any teammate can hit "Lock In" and it commits the whole team immediately.** No unanimity/ready-check required, since the board is already fully visible and collaborative in real time — there's no hidden information to protect by waiting on the rest of the team.
- If time runs out before the team locks in, **whatever is currently on the board locks in as-is.**
- Tiles taken from the pile onto the board are no longer available to other teammates (shared pool depletes as it's used) — matches the "sift through a pile together" mental model.

## 7. Chaos Round and Sabotage

**Chaos Round — promoted from a card to a random event.** In the old Chaos Cards model, `chaos_round` was something a team could be dealt. In the redesign it's no longer team-triggered — it's a random event the system rolls for at the start of a round, revealed dramatically as part of the round-intro animation ("...and it's a CHAOS ROUND!"). When it hits, it applies equally to **both** teams competing that round — their piles skew hard toward rare/wildcard tiles, with far fewer common/filler tiles available. It has to hit both sides symmetrically, or the round stops being a fair contest. Trigger rate is a pure tuning knob (something like 1-in-5-or-6 rounds is a reasonable placeholder) — not a design decision, safe to leave loose until the game is actually playable.

**Sabotage — earned by how well-structured your sentence is, not dealt or bought.** You asked how to judge "does this sentence make sense" without an English degree and without AI. Here's a way that's fully deterministic and explainable:

Every tile already carries a `grammaticalRole` — adjective, noun, verb, noun_phrase, verb_phrase, or connector. Connectors were further split (during this session's content pass) into determiner (a/the/my/...), demonstrative (this/that/...), conjunction (and/but/...), preposition (of/to/in/...), and auxiliary (is/was/are/...) — so the system has enough signal to distinguish "the" from "and" from "into" without ever having to understand meaning, only shape.

That means a team's board can be reduced to a short string of role tokens (say, D for determiner, A for adjective, N for noun/noun_phrase, V for verb/verb_phrase, P for preposition, X for auxiliary/conjunction) and checked against a small, fixed library of known-good sentence shapes, e.g.:

- `D A* N V D A* N` — subject-verb-object ("the clever fox chased the lazy hound")
- `D A* N V` — subject-verb ("the clever fox ran")
- `D A* N X A` — subject + is + adjective ("the fox is clever")
- `D A* N V P D A* N` — with a prepositional phrase ("the fox ran into the forest")

This is pattern matching over six token types, not a grammar engine and not machine learning — a handful of regex-shaped rules anyone can read, tune, or add to by hand. The score is just: what fraction of the tiles on the board fall inside a matched pattern? It can run live as the team places tiles, so they can watch a structure meter fill up while building, not just find out at lock-in.

**Earning and spending — confirmed as a single live charge, not a currency.** No accumulation, no stockpiling across matches:
- The moment a team's live score first crosses a "clean sentence" threshold (something like 70%+ of tiles in a matched pattern) *during that round's build phase*, they earn exactly **one** Sabotage charge for that round.
- They can spend it immediately, once, against the team they're currently facing — nothing carries forward to a future round.
- Spending it **snipes a tile from the rival team's pile** — pulls one specific tile (most interestingly a rare/wildcard one) out before the rival can grab it. This plugs straight into the pile-scarcity economy already in the design (§9's rarity-weighted piles): sabotage denies a scarce resource rather than dumping junk on their board, which also reads cleanly on the presentation screen ("Red just sniped WILDCARD 'kazoo' from Blue's pile!").

Net effect: building a clean sentence quickly isn't just about winning the vote later, it's also a race to earn the right to disrupt your opponent mid-round. Teams have to decide whether to keep polishing their own board or cash in the moment they're eligible.

Two small sub-decisions still open, both low-stakes tuning rather than shape-of-the-game questions:
1. Does crossing the threshold only ever fire once per round (first crossing only), or does it re-fire if their score dips and climbs back over? Recommend first-crossing-only, otherwise a team could hover at the edge and farm charges.
2. Does a sniped tile just vanish from the rival's pile (denial only), or does the sniping team also gain it for themselves (denial + steal)? Denial-only keeps it about scarcity; denial-plus-steal is more aggressive and doubles as self-benefit. Leaning denial-only, but flagging it since it changes how punishing the mechanic feels.

## 8. Open questions to settle before writing the spec

1. **Board grammar** — is the board totally freeform (any tile anywhere, any order), or does it keep any structural scaffolding (e.g., a suggested sentence skeleton the team can deviate from)? Full magnet-poetry freedom is more true to the pitch; some scaffolding reduces the odds of an unreadable board under time pressure.
2. **Host's role once presentation mode starts** — does the host retain any controls (pause, force-lock) on the shared screen, or does control move fully to a separate host device once the big screen takes over?
3. **3-team bye assignment** — bracket-with-a-bye is confirmed over a 3-way vote (see §5); still need to decide how the bye team is chosen (random draw vs. host pick).
4. **Team size default** — confirm up to 10/team (40 total) is the intended new ceiling, replacing the old 11/team (44 total) default.
5. **Pile growth curve** — by how much does the pile grow each round (fixed step, percentage, unlocking a new rarity tier)?
6. **Where the scoring flourish surfaces** — now that combo/rarity points are decorative rather than decisive (§9), where does that show up in the presentation screen, and does it appear every match or only sometimes?
7. **No Nouns / Double Trouble redesign** — these two remaining Chaos Cards still need rework against the freeform pile/board model (Sabotage and Chaos Round are now resolved — see §7). Worth scoping once the core pile mechanic exists, not blocking now.
8. **Sabotage first-crossing vs. re-fire, and denial-only vs. denial-plus-steal** — see §7's two sub-questions.

**Resolved this round:** team lock-in (any teammate commits the team — §6), prompt selection (fully automatic, no host input), scoring system (keep deterministic bonuses as a flourish, drop AI-judged parts), Chaos Cards (keep the concept, rework for piles), Chaos Round (random per-round event, symmetric to both teams — §7), Sabotage (earned live via a deterministic sentence-structure check, single-charge, spent as a pile-tile snipe — §7), no-vote/tie fallback (Sentence Structure Score decides — §5), 2-team voting (host/off-team spectators vote instead of teammates — §5).

## 9. Content changes required

**Progress so far (this session):** the connector role, the 49 connector words (39 plain fillers + 10 fancier ones), the connector sub-tagging (determiner/demonstrative/conjunction/preposition/auxiliary) that the Sabotage sentence-structure check in §7 depends on, the 117 new general-vocabulary words, and the 45-prompt pack (25 new + 17 folded in from the old AI-fallback file) are already implemented in `content/` and passing tests. Every prompt is also now explicitly scoped to **one verse** rather than a full speech/letter/document ("write a verse of..."). A verse is freestyle — up to about three sentences if the team wants, not a hard one-line cap — but it's still one short piece, not a multi-paragraph speech, ad, manual, or letter, matching what the pile-and-board mechanic can actually produce from a limited pool of tiles. Everything else below is still to build.

**Remove entirely:**
- `lib/ai/` (`client.ts`, `composer.ts`, `promptGenerator.ts`, `verify.ts`) — no runtime LLM calls of any kind, for prompts, words, or composition.
- AI-composition types and code paths in `lib/game/types.ts` / `lib/game/runtime.ts` (`AiComposer`, `ComposeJudgeInput`, `ComposeJudgeResult`, `judging`, the `ai?:` dep) and the AI branch in `lib/content/validate.ts`.
- `lib/game/runtime.ts` specifically wires up `createAnthropicComposer` and a `createPromptPoolRefresher` that calls `generatePromptBatch` on a timer (piggybacked on client heartbeat) to keep auto-generating new prompts. Both go away — prompts come only from authored packs now, and with prompt selection confirmed fully automatic with no LLM involved (§3), there's no runtime prompt-generation loop left to run at all.
- The template-fills-in-blanks composition model (`lib/content/assemble.ts`'s slot-interpolation approach) — superseded by "the board the team actually built."

**Resolved — scoring and Chaos Cards:**
- `lib/scoring/combos.ts` stays, but strip the AI-judged parts: remove `promptBonus`/`cohesionBonus` and the `JudgeScore` import/dependency entirely. Keep the deterministic bonuses — word rarity points, alliteration/rhyme/theme-cluster/wildcard/part-of-speech combos, placement points. These no longer decide who wins a match (the room vote does that); they display as a secondary flourish alongside the vote result, e.g. "Blue's verse also scored higher on wordplay" flavor text. Worth a follow-up decision later on exactly where/how that flourish surfaces in the presentation screen.
- `lib/content/chaosCards.ts` — keep the concept, rework against the pile instead of the old dealt-5-options model: `fancy_pants` becomes "this pile skews toward rare/wildcard tiles," `tiny_words` becomes "this pile skews toward short tiles" — both are just pile-generation filters now, which fits naturally. `chaos_round` and `sabotage` are now fully redesigned — see §7 (random per-round event; earned live via the sentence-structure check, spent as a pile-tile snipe). `no_nouns` and `double_trouble` still need a look once the pile mechanic exists to redesign against.

**Add:**
- **Filler/connector word tiles** — "a," "the," "and," "but," "of," "to," "in," etc. — as first-class pile entries, not template-owned static text. These need a way to spawn with **many duplicate copies** in the pile (a team can't build sentences if there's only one "the").
- **Rarity-weighted pile composition**: the existing `rarity` field on words (`common` / `interesting` / `rare` / `wildcard`) already models roughly the right idea — reuse it, but define explicitly how many physical copies of each rarity tier land in a pile (e.g., common words appear many times, wildcard/extravagant words appear once or not at all per pile). This is the mechanism that makes "the" abundant and "ceremonial" scarce.
- **Word sets** organized by round/pile-tier so the host's prompt selection can pull the right-sized, right-flavored pile per round.

**Keep, likely with rework:**
- `content/words.json` as the underlying word bank (rarity field is reusable).
- `content/prompts.json` (prompt authoring, host-selectable).
- Safety/work-safe filtering (`content/safety.json`, `lib/content/validate.ts` minus the AI hook) — still fully relevant, magnet poetry doesn't relax the safety bar.

**Likely retired or replaced:**
- `content/templates.json`, `content/slots.json` — the fixed-slot/static-segment model, if the board goes fully freeform per §8's board-grammar question.

## 11. Presentation screen: beats, timing, and sound

**Revised: the Presentation Screen runs on a real browser game engine, not plain CSS/DOM.** The original plan here was to stretch the existing lightweight tools (`lib/sfx.ts`'s WebAudio tones, CSS `@keyframes` like `AnimatedLogo.tsx`'s wobble/nudge). That's fine for a handful of fixed cues, but it breaks down against what this needs to actually be: a *ton* of choreographed animation (§7 alone has Chaos Round alarms, live Sabotage snipe flashes, per-tile reveal pops, team-color winner celebrations), plus **randomized variant pools** for VO lines, stings, music, and animation so the show doesn't feel identical every single Match. Managing "pick one of N interchangeable variants, don't repeat the last one, layer it under a music bed, sync it to an animation timeline" by hand in DOM/CSS gets unmanageable fast — it's exactly what a game engine's scene/sound system is built for.

**Recommendation: [Phaser](https://phaser.io)** for the Presentation Screen specifically — MIT-licensed, mature, runs on a `<canvas>` mounted as a client-only component inside the Next.js host route (dynamic import, no SSR). Its Scene system maps directly onto the beat sheet below (one Scene per beat, or one Scene with a timeline of beats), and its Sound Manager natively supports multiple keyed audio instances, which is exactly what variant pools need. (A lighter alternative would be PixiJS for rendering plus Howler.js for audio, composed by hand — more control, more assembly required. Phaser bundles both concerns into one system, which fits a project this size better.)

**This only replaces the shared big-screen view.** Player devices — the pile, the board, the Lock In button — stay plain React/DOM; there's no reason to run a game engine on every phone just to drag word tiles. `lib/sfx.ts` and the CSS-keyframe pattern aren't wasted work either — they're still the right tool for small per-player-device feedback (a tile pickup click, a lock-in confirmation on your own screen), just not for the choreographed shared show.

**Variant pools, not fixed cues.** Every beat in the sheet below should really be read as *a pool of interchangeable variants*, not a single clip: several VO takes of "Blue wins the round!", several fanfare stings, a rotation of winner-celebration animations. The engine picks randomly each time a beat fires, excluding whatever played last time so the same line never repeats back-to-back. Because VO is still pre-recorded per the fixed-vocabulary constraint below, "randomized VO" means recording **multiple takes of each fixed line** (e.g., 2–3 versions of every team-color line) rather than just one — same bounded vocabulary, multiplied by however many variants feel worth the recording time. That variant count is a pure production-budget knob, not a design decision — start with 2–3 per line and expand later.

**Voiceover — confirmed as pre-recorded clips, authored offline, same as the music track.** That has one real consequence worth flagging: VO only scales for a **fixed, finite vocabulary** — round/match announcements, timer warnings, lock-ins, sabotage callouts, winner/elimination lines — because those only ever vary by team color (a 4-way enum: Red/Green/Blue/Yellow), so a manageable, one-time recording session covers all of them (e.g., "Red locks it in!" × 4 teams, "Blue wins the round!" × 4, plus one generic "Chaos Round!" alarm line and one "here's your challenge" prompt-reveal line).

**Recommended: don't record VO that reads the actual prompt text aloud.** Prompts aren't a fixed vocabulary — there are 45 now and we're actively still growing that bank. Recording (or re-recording) a voice line for every prompt would tie content authoring to audio production forever, and it wasn't part of what you asked for this pass — every new prompt would need a matching recording before it could ship. The prompt reveal beat instead gets a generic VO sting ("Here's your challenge...") plus the prompt shown large on screen — the excitement comes from the reveal animation and timing, not narration reading it verbatim. Flagging this as a deliberate call, not an oversight — revisit if you'd rather commit to recording per-prompt VO going forward.

### Beat sheet

| Beat | Trigger | Visual | Sound | Rough timing |
|---|---|---|---|---|
| Lobby build-up | players joining, pre-start | team-color roster fills in as people join | `theme.mp3` bed, low | open-ended |
| Round/match announcement | host hits Start / Next Game | big text bump-in: "ROUND 1" or "RED vs BLUE" in team colors, comic-panel style | new fanfare stinger (short chord stab, extend `lib/sfx.ts`) + generic VO line | ~2–3s |
| Chaos Round reveal (conditional) | random roll at round start | bigger flash/shake, distinct color treatment so it reads as special | alarm-style sting, louder/harsher than the normal fanfare + "Chaos Round!" VO line | ~2s |
| Prompt reveal | after round announcement | prompt text slides/types in | short "ding" + generic "here's your challenge" VO line (not the prompt text itself — see above) | ~1s in, then read time |
| Build phase | timer starts | visible countdown, pile/board live | `theme.mp3` bed ducked lower; `playTick` in the last ~10s; `playTimesUp` at zero (both already exist) | round's full timer budget |
| Sabotage snipe (conditional, live) | a team crosses the clean-sentence threshold and spends it | flash/shake on the sniped team's pile tile | new sharp "swipe/steal" sting, distinct from lock-in | instant |
| Lock-in confirmation | a team locks in | team icon lights up on the shared screen | new "thunk"/stamp sting per team | instant |
| Reveal | both teams locked in (or time's up) | both verses shown, word-by-word or team-by-team pacing, contributions pop larger than connective tiles (carried over from the original spec's reveal idea) | soft "place" tick per word revealed | a few seconds per verse |
| Voting | reveal complete | vote buttons pulse for eligible voters (§5) | tension bed, no VO needed | host-paced or short timer |
| Winner reveal | votes in, or Sentence Structure Score fallback resolves it | confetti/color-flash in the winning team's color, loser dims to grayscale, "eliminated" banner if applicable | biggest fanfare cue + team-color VO line ("Blue wins the round!") | ~3–4s |
| Next Game / End Game | host action | brief transition | short transitional sting | instant |
| Final winner + credits | host ends the game | scrolling credits, team stats, winning verse showcased | longest, most produced fanfare cue, `theme.mp3` swells | ~10–15s |

### What this means technically, at a glance

- Presentation Screen becomes a Phaser canvas, client-only, mounted inside the existing host route — it's a pure rendering/playback layer subscribing to the same server-authoritative Realtime state the rest of the app already uses. Phaser doesn't own game logic or state, just what the room sees and hears.
- Every beat's fanfare, VO line, and animation is a **named pool of variants** (asset manifest keyed by beat + team color, e.g. `winner-red: [clip1, clip2, clip3]`), not a single file — Phaser's Sound Manager and Scene/Tween system are built to pick, layer, and sequence exactly this kind of thing.
- VO clips ship as static files the same way `theme.mp3` does today — a small, fixed manifest (per team color × per beat type × a handful of variants each), not a dynamic per-prompt pipeline.
- `theme.mp3`/`BackgroundMusic.tsx` and `lib/sfx.ts` stay in place for their current job — background music and lightweight per-player-device feedback on the plain-React player screens — while the Presentation Screen's music/SFX/VO move into Phaser's audio system so they can duck, layer, and randomize.
- Team-color CSS tokens (`--comic-red` etc.) carry over as the color source of truth so the Phaser canvas and the surrounding React chrome stay visually consistent.

## 12. What this doc is not

It doesn't lock voting UI, exact timer lengths, tile drag mechanics (physics vs. snap-to-board), or the visual/audio direction of the presentation screen. Those are spec- or design-level decisions once the shape above is confirmed.
