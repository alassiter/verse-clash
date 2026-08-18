# Verse Clash Round 1 Prototype

Status: ready-for-agent

## Problem Statement

I need a playable remote party game for about 44 people on a work social. Everyone should make a simple word choice at the same time, those choices should assemble into a surprising but workplace-safe composition, and the funny moment should be the shared reveal — not anyone having to write a joke. I do not have a game yet. The repo is empty except for this plan. I will write the prompts, templates, and word banks myself; I need the game loop and a clear content contract so I can author in parallel.

## Solution

A remote multiplayer prototype of Verse Clash: host creates a room, players join with a code and display name, everyone is placed on a team, and a host-driven Round 1 runs for all teams at once. Each player gets a hidden five-option choice for one slot. After submissions, the system assembles one composition per team from an authored template, then brings everyone to a shared reveal with attribution, emoji reactions, a single Crowd Favorite vote, and a light team standings board. I can start another Round 1 with the next authored prompt. Content is loaded from packs I write; the live game never calls an LLM.

## User Stories

1. As a host, I want to create a room and receive a short room code, so that I can invite a large remote group without accounts.
2. As a host, I want a shareable room URL as well as the code, so that players can join from chat or calendar invites.
3. As a player, I want to join with a room code and a display name, so that I can participate without signing up.
4. As a player, I want to see that other people are joining, so that the lobby feels alive before we start.
5. As a player, I want to see my team name and teammates, so that I know who I am collaborating with.
6. As a host, I want players auto-balanced across four teams, so that I do not have to seat 44 people by hand.
7. As a host, I want to shuffle teams, so that I can quickly rebalance before kickoff.
8. As a host, I want to move a player to a specific team, so that I can keep friends together or split a dominant clique.
9. As a host, I want default playful team names (Goblin, Waffle, Penguin, Stapler), so that the room has personality immediately.
10. As a player, I want to mark myself ready, so that the host can see when the group is set.
11. As a host, I want to see every connected player, their team, and their ready state, so that I know when to start.
12. As a host, I want to start the game even if someone is unready, so that one late person cannot block the room.
13. As a host, I want to play on a team or stay off-team as a facilitator, so that I can run the event either way.
14. As a player, I want the interface to tell me the current phase and what I should do, so that I never need a long rules explanation.
15. As a host, I want to start a Round 1 from an authored prompt, so that every team gets the same creative challenge at the same time.
16. As a player, I want to see the prompt before I choose, so that my pick feels related to the challenge even if I cannot see the final template.
17. As a host, I want to preview the next prompt and its word pools before launching the round, so that I can skip anything that does not fit the group.
18. As a host, I want to skip a prompt and load the next authored one, so that I can avoid a prompt I do not want.
19. As a player, I want a personal five-option choice set for my slot, so that I can contribute without writing original text.
20. As a player, I want those five options to mix sensible, mildly strange, and high-chaos picks, so that humor comes from combination rather than one obvious joke button.
21. As a player, I want to know only my category label (for example “Choose a description”), so that the final sentence stays a surprise.
22. As a player, I want my exact options to be unique among my teammates, so that the team composition is not a pile of the same word.
23. As a player on another team, I am fine sharing option text with someone in the same slot role on a different team, so that one authored bank can serve all four teams.
24. As a player, I want to submit exactly one choice, so that nobody dominates the team’s writing.
25. As a player, I want a large, obvious submit control, so that I can play on a laptop during a screen share.
26. As a player, I want to see that my choice is submitted, so that I am not unsure whether it counted.
27. As a teammate, I want to see who has submitted and who is still choosing, so that we can nudge stragglers without seeing their words.
28. As a teammate, I must not see another player’s options or selection before reveal, so that simultaneous hidden choice stays funny.
29. As a teammate, I want a team-only text chat, so that we can coordinate tone (“someone pick something normal”) without spoiling picks.
30. As a teammate, I want optional quick emoji reactions in the team room, so that I can respond without typing.
31. As a player, I want a visible countdown during selection, so that I know how much time remains.
32. As a host, I want to pause the game, so that I can wait for a dropped call or a side conversation.
33. As a host, I want to resume after pause, so that the room can continue from the same phase.
34. As a host, I want to force-advance selection when time is up, so that one unsubmitted player cannot stall 43 others.
35. As a player who did not submit before force-advance, I want the system to pick a random option from my dealt set, so that the composition still completes.
36. As a team with fewer players than template slots, I want unused slots filled with that slot’s house filler, so that the piece still reads as a whole.
37. As a team with more players than template slots, I want extra players to still receive a real slot assignment, so that nobody sits idle.
38. As the system, I want to assemble one composition per team from the template plus submitted words, so that players supply meaning and the template supplies grammar.
39. As a player, I want the assembled piece to be basically readable, so that the laugh is the combination, not broken English.
40. As a content author, I want static template text to own articles, pronouns, prepositions, and punctuation, so that I control grammar when I write packs.
41. As a workplace participant, I want every prompt, word, and assembled line checked against Work Safe rules, so that a company event cannot accidentally produce an HR problem.
42. As a workplace participant, I want unsafe combinations replaced with the slot’s house filler, so that uncertainty is resolved conservatively.
43. As a host, I want assembling to happen with no player input, so that the transition to reveal feels automatic.
44. As a player, I want everyone pulled from the team room onto a shared reveal stage, so that the emotional centerpiece is communal.
45. As a player, I want teams revealed one at a time, so that attention stays on a single piece.
46. As a player, I want the composition to appear contribution by contribution, not all at once, so that there is time to laugh.
47. As a player, I want my selected word shown with my display name, so that I get a visible moment of ownership.
48. As a player, I want contributed words to appear larger than connective text, so that player choices read as the punchlines.
49. As a host, I want to pace the reveal (or let it auto-advance on a short timer), so that I can wait for the room to land a joke.
50. As a player, I want to send one of a small emoji set during reveal (😂 👏 🤯 ❤️ 😮), so that 44 people can react without a noisy global chat.
51. As a player, I want those reactions to appear as short bursts, so that the composition stays readable.
52. As a player, I do not want open global chat during reveal, so that the stage is not drowned out.
53. As a host, I want to move to voting after all teams are revealed, so that competition stays a light coda.
54. As a player, I want to cast one Crowd Favorite vote for a team, so that we pick a winner without complicated scoring.
55. As a player, I want voting to be simple enough that it does not feel like a contest, so that humor stays primary.
56. As a host, I want to close voting and show standings, so that the room can cheer a team and move on.
57. As a player, I want a lightweight team win tally, so that we have bragging rights across rounds.
58. As a host, I want to start the next Round 1 with the next authored prompt, so that a session can run several compositions.
59. As a host, I want to end the game, so that the event has a clear close.
60. As a player who refreshed the page, I want to rejoin the same identity and current phase, so that a reload does not drop me from a 44-person room.
61. As a player who briefly disconnected, I want my submission to still count if I already sent it, so that flaky wifi does not erase my contribution.
62. As a host, I want to see who looks disconnected, so that I can pause or force-advance with context.
63. As a late joiner in lobby, I want to be seated and able to ready up, so that the host can still include me.
64. As a late joiner after the round has started, I want a clear “wait for next round” state rather than a broken half-assignment, so that mid-round joins do not corrupt compositions.
65. As a content author, I want a documented pack shape for prompts, templates, slots, words, and safety lists, so that I can write data before the UI exists.
66. As a content author, I want a validator that tells me what is missing or unsafe, so that I can fix packs without playing a full room.
67. As a developer, I want a tiny sample pack that can run a 2–4 player table, so that engineering is not blocked on the 44-player bank.
68. As a content author, I want unused metadata fields for later hidden effects (echo, dramatic placement, callback, intensifier), so that Round 2 does not require rewriting packs.
69. As a player, I want Work Safe to be the only content mode, so that nobody can flip the room into an edgier register by accident.
70. As a host, I want architecture that allows team size and player count to change later, so that this is not hard-coded to 44 / 4 / 11.
71. As a player, I want the UI to work on a shared screen, so that a facilitator can project the reveal.
72. As a player who is not naturally funny, I want fun to come from the system combining ordinary choices, so that I never have to perform.
73. As a teammate, I want chat to allow strategy talk without revealing exact words, so that collaboration and surprise can coexist.

## Implementation Decisions

- Stack is Next.js App Router with TypeScript and Tailwind, plus Supabase for Postgres, Realtime, and anonymous Auth.
- There are no user-facing accounts. Creating or joining a room silently establishes an anonymous Auth session. The room creator is the host. Display names are profile fields, not login identities.
- All mutations go through server-owned room commands (create room, join, ready, team assignment, start/advance/pause/skip, submit, vote, team chat, react). Clients subscribe to Realtime for live updates.
- Reconnect uses a persisted room code plus the anonymous session. Refresh hydrates the current phase. A heartbeat updates last-seen so the host can spot drops.
- First playable slice is Round 1 only: straight hidden choices, assemble, reveal, Crowd Favorite, standings, next Round 1. Round types 2–5 are representable in data and ignored by the engine.
- Content is authored offline and stored as packs. The running game never calls an LLM. A sample pack ships so a small table can play; the full 44-player banks are authored separately against the same contract.
- Default structure is 4 teams and about 11 players each, but assignment and templates must tolerate other sizes. Unused slots use that slot’s house filler. Overflow players still get a slot assignment rather than sitting out.
- Team assignment is auto-balance on join, plus host shuffle and manual move. Default team names are Goblin, Waffle, Penguin, Stapler.
- Host may be on a team or off-team. Host controls always exist for the room creator.
- Game phases are: lobby → prompt reveal → selecting → assembling → reveal → voting → standings → next prompt reveal or ended. Host can pause. Timer is visible; host can force-advance. All submitted (or force-advance) moves selecting to assembling. Assembling is automatic.
- On force-advance, unsubmitted players receive a random option from their already-dealt set.
- Each Round 1 deals one assignment per seated player: a slot, a player-facing label, and five options (2 sensible chaos ≤ 0.3, 2 strange 0.31–0.7, 1 chaos > 0.7). Options are unique within a team; reuse across teams is allowed.
- Players see prompt + label + options. They never see the template or other slots before reveal.
- Teammates can see submit indicators, not options or selections, until the round reaches reveal.
- Team chat is team-scoped only. Reveal has no global text chat. Reveal reactions are the fixed set 😂 👏 🤯 ❤️ 😮 and render as short bursts.
- Composition is template walk + selected text (or house filler / random deal). Output is an ordered list of static segments and attributed contribution segments. Work Safe validation runs at pack load and again at assemble; failures replace the offending contribution with the slot house filler.
- Reveal is a shared stage. One team at a time. Host-paced or short auto-advance through segments. Contributions are visually emphasized and show the selector’s display name.
- Voting is one Crowd Favorite vote per player for a team. The winning team increments a simple win tally. No individual leaderboard or accolades in this slice.
- Content mode is `work_safe` only. Additional modes may be modeled later and must not be implemented.
- Persistence tables: rooms, players, teams, rounds, round assignments, compositions, reveal state, votes, reactions, team messages. Room status, current round, pause, and Work Safe mode live on the room. Hidden assignment fields stay owner-only until reveal.
- Realtime publishes phase changes, lobby presence, teammate submit indicators, team chat, reveal cursor, and reaction bursts.
- Two test seams only: the room command API (player/host snapshots), and the content-pack validator (load, deal mix, combinational safety) so packs can be tested without a room.

Decision-rich shapes from planning (not a running prototype):

Content records:

```ts
Prompt { id, text, tease?, formatHint, compatibleTemplateIds, workplaceSafe: true }
Template { id, promptIds, title, segments: Static | SlotRef }
Slot {
  id, templateId, playerLabel,
  grammaticalRole, semanticCategory, tone, intensity,
  positionPreference, repetitionPotential, chaosValue,
  safetyConstraints, defaultFiller
}
Word {
  id, text, grammaticalRole, semanticCategory, tone, intensity, chaos,
  workplaceSafe: true, bannedPairCategories?, compatiblePromptIds?
}
Safety { blockedTerms, bannedCategoryPairs, contentMode: "work_safe" }
```

Assembled segment:

```ts
{ type: "static"; text: string }
| { type: "contribution"; text: string; playerId: string; displayName: string; slotId: string }
```

## Testing Decisions

Good tests assert what a caller can observe through a public seam. They do not mock internal collaborators, inspect SQL, or lock to React structure. Expected values are independent literals, not recomputed the same way as the implementation.

Seam 1 — room command API. Drive multiple actors through commands and read `getPlayerView` / `getHostView`. Cover: create/join, team balance and host moves, ready and start, deal uniqueness within a team, hidden selections (teammate view has submit flags and no words), team chat isolation, force-advance fills from the dealt set, assemble produces attributed segments, reveal cursor exposes words and names, reactions do not require chat, one vote per player, standings increment, reconnect returns the same player to the same phase, late join after start waits for the next round.

Seam 2 — content-pack validator. Load packs without a room. Cover: valid sample pack passes; missing slots, bad deal mix, blocked terms, and banned category pairs fail or replace conservatively; house filler is used when a combination is unsafe; unused hidden-effect fields may be present and ignored.

There is no prior art in this repo. Persistence and UI are adapters; they are not the test seam.

## Out of Scope

- Runtime LLM generation of prompts, words, or compositions
- Round types 2–5 (hidden effects, team crossover, misdirection, maximum chaos) as implemented behavior
- Voice or video
- Individual scoreboards and accolades
- Any content mode other than Work Safe
- Global chat during reveal
- Visual polish beyond a clear, playful, screen-share-friendly UI
- Hard requirement that the first engineering slice seat a literal 44 clients in one automated test

## Further Notes

`docs/agents/issue-tracker.md` was not present when this spec was written. This file is the local-markdown publish target. Run `/setup-matt-pocock-skills` if GitHub issues should become the source of truth.

Author the real 44-player banks against the content contract while the loop is built. A 2–4 player sample pack is enough to implement and test. Prefer absurd workplace-safe combinations (“ceremonial waffle”, “forbidden stapler”) over edge. Combinational safety matters more than single-word safety.

The best session moment is 44 people laughing when reasonable individual choices produce something like: “Our new strategic vision is built on three principles: courage, collaboration, and the ceremonial waffle.”
