# 03 — Seat teams and ready up

**What to build:** People in a lobby are seated on four named teams (Goblin, Waffle, Penguin, Stapler), auto-balanced as they join. The host can shuffle or move someone. Players ready up. The host sees every player, team, ready state, and disconnect hint, and can start even if someone is unready. The host may sit on a team or stay off-team as facilitator. A late joiner still in lobby can be seated and ready. Architecture must not assume a fixed 44 / 4 / 11.

**Blocked by:** 02 — Create a room and join by code

**Status:** ready-for-agent

- [ ] New joiners are auto-balanced across the four default team names
- [ ] Host can shuffle teams and move a specific player onto a specific team
- [ ] Host can be assigned to a team or left off-team
- [ ] A player can toggle ready; the host board shows name, team, ready, and last-seen/disconnected
- [ ] Host can start the room toward a round even if some players are unready
- [ ] A late lobby joiner is seated and can ready
- [ ] Players see their team name and teammates
- [ ] Tests use room command snapshots; team changes are visible to every player in the room
