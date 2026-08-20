# Verse Clash

A party game where teams sift a shared pile of word tiles onto a team board, magnet-poetry style, then face off head-to-head with the room voting a winner — bracket-style across the whole session.

Full design reasoning, open questions, and what's confirmed vs. still undecided live in [`docs/redesign-concept.md`](docs/redesign-concept.md). This file is just the vocabulary — use these words consistently in code, UI copy, and conversation.

Status note: this glossary describes the **redesign direction**. The running code today still speaks the older dealt-5-options/template vocabulary (see `lib/game/types.ts`'s `Phase` enum). Update this file's phase list once the new loop is actually implemented instead of guessing ahead of the code.

## Language

**Room**:
A single game session people join by a short code.
_Avoid_: match (see Match below — different thing), lobby (the place is Lobby)

**Lobby**:
The main room everyone is in before the game starts, and where eliminated/off-team players wait between their turns.
_Avoid_: gathering, waiting area

**Host**:
The player who sets up the room, starts the game, and controls pacing. May play on a Team or stay off-team to facilitate. An off-team Host is also an eligible voter — see Voting.
_Avoid_: operator, moderator, "never on a team" (they can be)

**Presentation Screen**:
What the Host's screen becomes once the game starts — the shared big-screen view everyone watches together (cast it, project it, share it on a call), carrying round intros, prompt reveals, timers, and match outcomes.
_Avoid_: host screen (only true pre-game), big screen (fine informally, not the canonical term)

**Team**:
A named crew — Red, Green, Blue, or Yellow — that keeps the same people for the whole Room. Players are auto-assigned to a Team the moment they join.
_Avoid_: side, group

**Pile**:
The shared pool of word Tiles a Team sifts through together during a Match. Tiles are removed from the Pile as they're placed on the Board.
_Avoid_: deck, hand, options (that was the old per-player dealt-choice model)

**Tile**:
One word (or connector/filler word) available in a Pile. Every Tile carries a grammatical role used by the Sentence Structure check.
_Avoid_: word (too generic once Tile is the concrete game object), option

**Board**:
The shared, real-time canvas a Team builds their verse on. Any teammate can drag a Tile from the Pile onto the Board; the whole Team sees the same Board at once.
_Avoid_: template, slots (superseded by the freeform Board — see the open board-grammar question in the redesign doc)

**Lock In**:
The action that commits a Team's current Board as their finished verse for the Match. Any one teammate can Lock In for the whole Team — no unanimity required, since the Board is already fully shared.
_Avoid_: submit, ready-up

**Match**:
One head-to-head build-and-vote contest between two Teams on a shared Prompt. The basic unit of play — what used to be called a "round."
_Avoid_: round (ambiguous — a "round" of the old game meant something different; prefer Match)

**Series**:
The 2-team format: Red vs. Blue playing repeated Matches back to back, ended by the Host hitting End Game(s) rather than by a fixed bracket.

**Bracket**:
The 3- or 4-team format: Matches feed into a final the same way a tournament bracket does. A 3-team Bracket includes a bye.

**Chaos Round**:
A randomly-triggered Match where both competing Teams' Piles skew hard toward rare/wildcard Tiles. Decided by the system at random, not chosen by a Team or the Host, and always applied symmetrically to both sides of the Match.
_Avoid_: chaos card (the old per-team-dealt version this replaced)

**Sentence Structure Score**:
A deterministic, rule-based check of how well a Team's Board matches known-good sentence shapes, computed from Tiles' grammatical roles — no AI involved. Powers two things: earning Sabotage, and deciding a Match when there's no vote to count.

**Sabotage**:
A single-use, non-accumulating charge a Team earns the moment their live Sentence Structure Score first crosses the "clean sentence" threshold during a Match. Spent immediately, once, against the Team they're currently facing — it snipes one Tile out of the rival's Pile before they can grab it.
_Avoid_: sabotage points, sabotage currency (it doesn't bank or stack)

**Voting**:
After a Match's Reveal, the room votes for a winner. Players on the two competing Teams may vote, but not for their own Team. In a Series (2 teams only), the Host and any off-team players vote instead, since neither competing Team has a neutral member. If there's no eligible voter or the vote ties, the Match falls back to comparing each Team's Sentence Structure Score.
_Avoid_: Crowd Favorite (the old single-award model this replaced — Voting now decides every Match, not one per-round bonus vote)

**Eliminated**:
What happens to the losing Team of a Match in Bracket mode — they don't leave the Room, they become vote-only for the rest of the game.

**End Game(s)**:
The Host action that closes a Series or finishes a Bracket, tallies total games/Matches won per Team, declares the majority winner, and rolls credits.
