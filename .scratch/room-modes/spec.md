# Room Modes: Classic, Mad Libs, Grand, and Migrate

Status: ready-for-agent

## Problem Statement

I can only run today’s Team composition game. I want a Host to pick Classic, Mad Libs, or Grand when they create a Room, and to move the whole group to a new Mode later without everyone retyping a code. Mad Libs should feel like paper Mad Libs (hidden story, typed or tapped fills) while still competing as Teams. Grand should let the whole Room fill one long story, Host still out.

## Solution

A Room is created in one Mode and never changes Mode. Classic stays the current game. Mad Libs uses a separate story pack: no Prompt, authored cues, type-or-tap fills, sentence crawl, then Crowd Favorite. Grand uses a longer story pool, no Teams, no vote, whole story at once. The Host Migrates from Gathering, Standings, Ended, or the Grand linger screen: new Room, old Room Ends and forwards anyone who comes back.

## User Stories

1. As a host, I want to choose Classic, Mad Libs, or Grand when I create a Room, so that the group knows which game they joined.
2. As a host, I want Mode locked for the life of that Room, including after I start a new game, so that nobody mid-session swaps the rules.
3. As a player joining by code, I want to see which Mode the Room is in, so that I am not surprised when play starts.
4. As a host who picked the wrong Mode, I want to create a different Room rather than change this one, so that Mode stays a contract.
5. As a player in Classic, I want the current game unchanged (Prompt, five options, contribution crawl, word emojis, Crowd Favorite), so that existing rooms keep working.
6. As a host in Mad Libs, I want to see the next story on the dashboard (title and full text), so that I can skip a dud before I start.
7. As a host in Mad Libs, I want to skip to the next authored story from Gathering or Standings, so that I am not stuck on a story that does not fit.
8. As a player in Mad Libs, I must not see a Prompt or the story before Reveal, so that my fills stay blind.
9. As a player in Mad Libs, I want to be seated on a Team like Classic, so that we still compete.
10. As a host in Mad Libs, I want to stay off every Team, so that I can facilitate.
11. As a player in Mad Libs, I want Selecting to happen in a Breakout with Team chat and submit ticks, so that we can nudge each other without seeing words.
12. As a player in Mad Libs, I want the phone to ask an authored cue (for example “plural noun”), so that I know what kind of fill to give.
13. As a player in Mad Libs, I do not want an example word on screen, so that I do not type the example.
14. As a player in Mad Libs, I want five dealt suggestions (2 sensible / 2 strange / 1 chaos) plus a type-in, so that I can play without a keyboard or invent a word.
15. As a player in Mad Libs, I want to type a short phrase up to 40 characters, so that cues like “something in a fridge” are honest.
16. As a player in Mad Libs, I want a blocked or unsafe type-in rejected on submit, so that I can try again or tap a suggestion instead of being silently rewritten.
17. As a player in Mad Libs, I want to submit by tapping a suggestion or by confirming my typed fill, so that either path completes that blank.
18. As a player in Mad Libs, I want only my current blank shown, so that I cannot compose a private joke across upcoming cues.
19. As a player who has more than one blank, I want the next cue after I submit, so that round-robin extras still get filled.
20. As a player in Mad Libs, I must not flip back and edit a submitted blank, so that fills stay one-and-done.
21. As a teammate in Mad Libs, I want to see who has finished their current blank, never the text, so that we can hurry stragglers.
22. As a player on a small Team, I want leftover blanks dealt round-robin so some of us fill two or more, so that the story always completes without house-filler as the happy path.
23. As a player on a large Team, I want overflow people to still receive blanks (sharing the story’s slots round-robin), so that nobody sits out a Team story.
24. As a player who never submits, I want force-advance to pick a random dealt suggestion for each open blank, so that the story still reads and stays Work Safe.
25. As a workplace participant, I want typed fills checked against the same Work Safe blocked terms as the pack, so that a type-in cannot sneak past the bank.
26. As a player in Mad Libs, I want everyone pulled to a shared Reveal after fills, so that the laugh is communal.
27. As a player in Mad Libs, I want a short title card with the Team name before that Team’s story, so that I know whose reading I am hearing.
28. As a player in Mad Libs, I want the story to appear sentence by sentence at 3 seconds per authored sentence, so that it plays as a reading.
29. As a player in Mad Libs, I want filled words underlined with the player’s name in small type under the line, so that I can point at someone without a narrator interruption.
30. As a player in Mad Libs, I do not want per-word emoji voting, so that the screen is a reading plus a later Crowd Favorite, not two vote surfaces.
31. As a player in Mad Libs, I want the next Team’s title card only after this crawl finishes, so that four stories do not smear together.
32. As a host in Mad Libs, I want pause/resume to freeze the 3-second crawl, so that I can wait for the room.
33. As a player in Mad Libs, I want to tap a Team after every crawl to re-read that finished story, so that I can vote without relying on memory.
34. As a player in Mad Libs, I want to cast one Crowd Favorite for a Team, so that we still pick a winner.
35. As a player in Mad Libs, I want voting to close when everyone eligible has voted, so that we do not need a second “done” button.
36. As a host in Mad Libs, I want to force-advance voting, so that one missing tap cannot stall the Room.
37. As a player in Mad Libs, I want Standings after the vote, so that Team wins still accumulate.
38. As a host in Mad Libs, I want to start the next story, end the game, or Migrate from Standings, so that the session can continue or change Mode.
39. As a host in Grand, I want no Teams and no Crowd Favorite, so that the Room writes one story together.
40. As a host in Grand, I still want to sit out filling, so that I can skip, pause, and force-advance.
41. As a host in Grand, I want a separate pool of longer stories, so that dozens of people can each get a blank.
42. As a host in Grand, I want start blocked with a clear reason when the current story has fewer blanks than non-Host players, so that Grand never benches people.
43. As a host in Grand, I want to skip until a story can seat the Room, so that I am not stuck on a short one.
44. As a player in Grand, I want the same fill rules as Team Mad Libs (cue, five suggestions, type-in, one blank at a time, 40-character cap, reject-and-retry, random dealt fill on force-advance), so that I do not learn a second input game.
45. As a player in Grand, I want to fill from the Lobby with submit ticks only, so that a 44-person chat does not bury the cue.
46. As a player in Grand, I must not see the story before Reveal, so that fills stay blind.
47. As a host in Grand, I want the dashboard to show the next story so I can skip, so that I can still facilitate.
48. As a player in Grand, I want the finished story to appear all at once and stay scrollable, so that we can read it aloud at our own pace.
49. As a player in Grand, I want the same underline-and-name attribution on filled words, so that we can still point at people.
50. As a player in Grand, I do not want a Voting or Standings phase, so that the beat after the story is “read it again,” not a fake contest.
51. As a host in Grand, I want the linger screen to let me start the next story, end the game, or Migrate, so that I am not forced to End the Room just to change Mode.
52. As a host, I want to Migrate only from Gathering, Standings, Ended, or the Grand linger screen, so that we never yank people mid-blank or mid-crawl.
53. As a host, I want to pick the new Mode when I Migrate, so that the new Room is a real create, not a toggle.
54. As a player who is present when the Host Migrates, I want to already be in the new Room with the same display name, so that 44 people do not have to tap a toast to move.
55. As a player after Migrate, I want a confirmation that shows the new code and Mode, with a tap only if something failed, so that I know where I am.
56. As a player in the old Room after Migrate, I want that Room to be Ended, so that the party cannot split across two live games.
57. As a player migrating between Classic and Mad Libs, I want my Team and seating to come with me, so that we do not re-seat 44 people to play the same group.
58. As a player migrating to or from Grand, I want seating wiped (Host still out), so that Grand is not lying about Teams.
59. As a player who locked their phone during Migrate, I want opening the old Room code to forward me into the new Room, so that I am not stranded on Ended.
60. As a late heartbeat or refresh on the old code, I want the same forward, so that `localStorage` of the old code is not a dead end.
61. As a host after Migrate, I want to still be the Host of the new Room, so that facilitation does not change hands.
62. As a player after Migrate, I want Crowd Favorite wins and chat from the old Room gone, so that the new Room is a new game.
63. As a content author, I want Classic to keep using the current prompt/template/slot/word pack, so that I do not rewrite Round 1 content.
64. As a content author, I want a separate Mad Libs pack whose blanks are labeled with cues and whose templates mark sentence breaks, so that the crawl never guesses at periods.
65. As a content author, I want a separate Grand story pool authored long, so that a large Room can start.
66. As a content author, I want the validator to reject a Mad Libs or Grand story that has no sentence breaks (Mad Libs) or no cue on a blank, so that I find pack mistakes without playing.
67. As a content author, I want a small sample Mad Libs story and a small sample Grand story in-repo, so that engineering is not blocked on the 44-blank bank.
68. As a developer, I want existing Classic tests to keep passing when create defaults to Classic, so that Mode is an addition, not a rewrite of Round 1.
69. As a player who joins after a Mad Libs or Grand round has started, I want to wait for the next story rather than receive a half-assignment, so that mid-round joins do not corrupt the fill.
70. As a host, I want pause, resume, force-advance, and end-round to keep working in every Mode, so that I can still run a live room.
71. As a player, I want the UI to stay large-type and screen-share friendly, so that a facilitator can project Reveal.
72. As a workplace participant, I want Work Safe to remain the only content mode in every Mode, so that nobody flips the Room into an edgier register.

## Implementation Decisions

- Keep the two existing seams. No third seam. UI, toasts, and persistence are adapters.
- Mode is a property on the Room: `classic` | `madlibs` | `grand`. Chosen on `createRoom`. Default `classic` so current callers and tests stay valid. `restartGame` does not take a Mode and does not change it.
- `createRoom` input becomes `{ displayName, mode?: Mode }`. Player and host snapshots expose `mode` and player-facing names Classic / Mad Libs / Grand.
- The running game still never calls an LLM. Classic uses the current pack. Mad Libs and Grand load separate authored packs (or one pack module filtered by Mode). Cross-Mode reuse of a story is not required and should not be the default.
- Mad Libs and Grand skip Prompt. `startRound` from Gathering goes to Selecting after dealing. Host dashboard in Gathering and Standings (and Grand linger) shows the next story title and full text so the Host can skip. Player snapshots must not include prompt text or the template in those Modes before Reveal.
- Add `skipStory` (Host, Gathering / Standings / Grand linger). Advances the Mode’s story cursor. Does not exist as a player-visible Prompt.
- Selecting fill rules for Mad Libs and Grand: each open blank is a dealt assignment (five options, same 2/2/1 chaos mix). Player snapshot `selection` shows only the next unsubmitted assignment: `playerLabel` is the authored cue, `options`, plus a typed path. After submit, the next unsubmitted assignment for that player appears, or submitted-complete if none remain.
- Extend the command surface with a typed submit: `submitFill(actor, roomCode, { optionId } | { text })`. Tapping a suggestion uses `optionId` (existing `submitChoice` may remain as the optionId path). Typed `text` is trimmed, must be 1–40 characters, and is rejected (`RoomError`) if it matches Work Safe blocked terms. Successful typed submit stores the custom text as that blank’s fill. Submitted blanks cannot be edited.
- Round-robin: deal the story’s blanks across seated non-Host players (per Team in Mad Libs; across the Room in Grand). A player may hold multiple assignments. Cross-player suggestion reuse is allowed in Grand. Within a Team in Mad Libs, keep today’s uniqueness among dealt option sets where the bank allows.
- Force-advance and timer expiry still fill each unsubmitted assignment from its dealt five, never from a typed string and never with a visible “[blank]”.
- Assemble still walks the template. A typed fill is a contribution segment with the typed text and the player’s display name. Work Safe runs again at assemble; a failure at assemble still replaces with that slot’s house filler (defense in depth). Reject-on-submit is the player-facing path.
- Mad Libs Reveal cursor is Team index plus authored sentence index, not contribution-segment index. Duration is 3 seconds per sentence (and a short title-card beat before each Team). Pause freezes the clock. Visible snapshot: title card or sentences up through the cursor; contribution words carry `displayName` for underline-and-name rendering. `sendRevealReaction` is rejected or ignored in Mad Libs and Grand.
- After the last Team’s last sentence, phase becomes Voting. Voting snapshots include every Team’s finished composition so a player can select a Team and re-read. `vote` is unchanged (one Crowd Favorite per player). No extra done-voting command. Voting ends when every eligible non-Host player who is in the round has voted, or the Host force-advances / the voting timer fires.
- Grand creates no Teams and does not seat anyone. Host remains unseated. `shuffleTeams` / `movePlayer` are Host errors or no-ops that do not invent Teams. Snapshot `team` is null. No team chat.
- Grand `startRound` fails with a clear Host-facing error when the current story’s blank count is less than the number of non-Host players in the Room. Skip until a story fits. If none in the pool fit, start stays blocked.
- Grand Reveal shows the full composition immediately (`phaseEndsAt` null). No Voting, no Standings, no Crowd Favorite tally. Host actions on that linger screen: `startNextRound`, `endGame`, `migrate`.
- `migrate(actor, roomCode, { mode })` is Host-only. Legal from Gathering, Standings, Ended, and Grand linger. Illegal during Prompt, Selecting, a Mad Libs/Classic crawl, and Classic/Mad Libs Voting. Creates a new Room (new code) with that Mode, same Host, same player ids and display names. Present players are already members of the new Room. Old Room is Ended and stores the successor code. Returns `{ roomCode, url }` of the new Room.
- Team carry: if both old and new Modes have Teams (`classic` ↔ `madlibs`), copy Teams (names, colors, membership). Wins start at 0. Chat and rounds do not copy. If either Mode is Grand, the new Room has no Team memberships.
- Snapshots on the old code after Migrate: phase Ended, plus a forward payload `{ roomCode, mode }` so a toast/adapter can send the player on. `joinRoom` or `getPlayerView` / `heartbeat` with the old code for a known player follows into the new Room (they become readable there). A stranger with only the old code is forwarded the same way rather than joining a live Ended husk.
- Classic phase machine, deal, Prompt, per-word reactions, and contribution-timed reveal stay as they are when `mode === "classic"`.
- Persistence (when wired) stores Mode on the Room and successor code on an Ended Room. Realtime still fans out snapshots; it is not a test seam.

Decision-rich shapes:

```ts
type Mode = "classic" | "madlibs" | "grand";

createRoom(actor, { displayName, mode?: Mode })
submitFill(actor, roomCode, { optionId: string } | { text: string })
skipStory(actor, roomCode)
migrate(actor, roomCode, { mode: Mode }) => { roomCode, url }

// PlayerView additions (adapters render these)
mode: Mode
forward?: { roomCode: string; mode: Mode }
selection?: {
  playerLabel: string; // authored cue in madlibs/grand
  options: { id: string; text: string }[];
  submitted: boolean;
  remainingBlanks?: number;
}
reveal?: {
  teamName: string;
  kind: "title" | "sentences" | "full";
  sentences: Array<{
    textParts: Array<
      | { type: "static"; text: string }
      | { type: "contribution"; text: string; displayName: string }
    >;
  }>;
}

// Mad Libs / Grand template: authored sentences, not period-splitting
Template {
  id, title, mode: "madlibs" | "grand",
  sentences: Array<{
    segments: Array<{ type: "static"; text: string } | { type: "slot"; slotId: string }>
  }>
}
Slot { ..., cue: string } // player-facing; Classic keeps playerLabel
```

## Testing Decisions

Good tests assert what a caller can observe through a public seam. They do not mock internals, inspect SQL, or lock to React. Expected values are independent literals.

Seam 1 — room command API. Drive multiple actors through commands and read `getPlayerView` / `getHostView`. Prior art: `tests/game` (create-and-join, teams-and-ready, hidden-selection, reveal, vote-and-next) and the shared harness that creates a Room, joins actors, and advances time.

Cover at this seam:

- `createRoom` records Mode; omit Mode → Classic; `restartGame` keeps Mode.
- Classic still reaches Prompt, then Selecting, and existing vote/reveal behaviors still hold.
- Mad Libs `startRound` never exposes `prompt` to players; Host preview includes the story text; `skipStory` changes the next story.
- Mad Libs selection shows a cue and five options; `submitFill` with `text` stores that text; overlong or blocked text throws; option tap still works; a second assignment appears only after the first submit.
- Teammates see submit ticks, not fills, until Reveal.
- Force-advance fills from the dealt five.
- Reveal walks title then sentences on a 3-second clock; no word-reaction state; after the last Team, Voting lists compositions for reread; one Crowd Favorite; Standings increment.
- Grand refuses `startRound` when blanks < non-Host players; skip can unblock; no Teams in snapshots; Lobby fill (no team chat); full story on Reveal; `vote` / Standings do not appear; Host can `startNextRound` or `migrate` from linger.
- `migrate` from an illegal phase throws; from a legal phase Ends the old Room, returns a new code, present players already exist on the new Room, Teams carry only Classic↔Mad Libs, Grand wipes seating, old-code snapshot/join/heartbeat forwards.

Seam 2 — content-pack validator. Load packs without a Room. Prior art: `tests/content`. Cover: Classic sample pack still validates; a Mad Libs story without sentence breaks or without cues fails; a Grand sample with fewer blanks than a documented minimum may still validate as a pack (seating is a Room rule), but a Grand story with zero blanks or missing cues fails; blocked terms still fail or replace conservatively; deal mix 2/2/1 still holds for Mad Libs/Grand slots.

Persistence and UI are not test seams. Do not add a toast-component test as the source of truth for Migrate.

## Out of Scope

- Runtime LLM generation of stories, cues, or fills
- Changing Mode on an existing Room (including `restartGame`)
- Host filling blanks in any Mode
- Per-word emoji voting in Mad Libs or Grand
- A “done voting” control
- Room-wide chat
- Optional toast-to-move (present players are already moved)
- Mid-phase Migrate (Prompt, Selecting, crawl, Classic/Mad Libs Voting)
- Dual-use templates that serve Classic and Mad Libs from one story
- Content modes other than Work Safe
- Round types 2–5 hidden-effect behavior
- Voice or video
- Individual scoreboards
- Auto-starting the next Grand story after Reveal
- Hard requirement that automated tests seat a literal 44 clients

## Further Notes

`docs/agents/issue-tracker.md` was not present when this spec was written. This file is the local-markdown publish target under `.scratch/room-modes/`, matching the Round 1 spec convention.

`CONTEXT.md` is the glossary: Mode, Classic, Mad Libs, Grand, Migrate, Room, Host, Team, Crowd Favorite, Lobby, Breakout, Phase. Do not reintroduce “variant” or “round type” for Mode.

Author real Mad Libs and Grand banks against the content contract while the loop is built. A tiny in-repo Mad Libs story (enough blanks for a 2–3 player Team) and a tiny Grand story (enough blanks for the harness’s non-Host players) are enough to implement. The 44-blank Grand pool can land in the same files later.

Classic tests should remain green. Treat a regression in Prompt, word reactions, or contribution-paced Reveal as a failed change, not an acceptable rewrite.
