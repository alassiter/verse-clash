# 01 — Mode on create

**What to build:** The Host picks Classic, Mad Libs, or Grand when they create a Room. Everyone in the Room can see that Mode. It cannot change on that Room, including after the Host starts a new game. Creating without a pick is Classic, so today’s game still works.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] Host create UI offers Classic, Mad Libs, and Grand
- [ ] The new Room’s player and host snapshots expose the chosen Mode
- [ ] A joiner sees the same Mode as the Host
- [ ] `restartGame` keeps the Mode and does not offer a new pick
- [ ] Omitting Mode creates a Classic Room
- [ ] A Classic Room still starts with Prompt and plays the current loop
- [ ] Tests drive this through the room command API and player/host snapshots — not React or SQL internals
