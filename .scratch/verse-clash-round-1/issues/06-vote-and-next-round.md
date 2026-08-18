# 06 — Vote Crowd Favorite and run another round

**What to build:** After every team has been revealed, players cast one Crowd Favorite vote for a team. The host closes voting and shows a simple team win tally. The host can start another Round 1 with the next authored prompt, or end the game. Competition stays a light coda — no individual scores or accolades.

**Blocked by:** 05 — Reveal compositions with attribution and reactions

**Status:** ready-for-agent

- [ ] Each player can cast exactly one Crowd Favorite vote for a team
- [ ] Host can close voting and show standings as a team win tally
- [ ] The winning team’s win count increments by one
- [ ] Host can start the next Round 1 using the next authored prompt, returning everyone to prompt reveal / selection
- [ ] Host can end the game with a clear finished state
- [ ] No individual leaderboard or accolade system is introduced
- [ ] Tests cover one-vote-per-player, standings increment, next-round phase reset, and end through the room command API
