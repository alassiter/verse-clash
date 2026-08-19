# 05 — Grand

**What to build:** A Grand Room has no Teams and no Crowd Favorite. A separate pool of longer stories seats every non-Host player. Fill uses the same type-or-tap rules from the Lobby (ticks only, no chat). Reveal dumps the whole story at once with the same underline-and-name attribution. That screen stays up so the Host can start the next story or end.

**Blocked by:** 03 — Type-or-tap fills

**Status:** ready-for-agent

- [ ] A sample Grand pack validates; stories are a separate pool from Team Mad Libs
- [ ] `startRound` fails with a clear reason when the current story has fewer blanks than non-Host players; skip can unblock
- [ ] Snapshots have no Teams; Host stays out; `movePlayer` / shuffle do not invent Teams
- [ ] Players fill from the Lobby with submit ticks and no room chat, using the same cue / five suggestions / type-in / one-blank-at-a-time rules
- [ ] Reveal shows the full story immediately (no sentence crawl, no Voting, no Standings)
- [ ] Attribution on filled words matches Mad Libs (underline + name)
- [ ] From the linger screen the Host can start the next Grand story or end the game
- [ ] Tests cover the seating check, Lobby fill, and full-story Reveal through the room command API
