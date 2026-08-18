# 02 — Create a room and join by code

**What to build:** A host can create a room and get a short code plus a shareable URL. Players join with that code and a display name — no accounts. Everyone in the room sees who has joined. Refreshing the page restores the same person to the same lobby. The host is the room creator.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Host creates a room and receives a short room code and a URL that opens the same room
- [ ] A player joins with the code and a display name and appears in the lobby for everyone already there
- [ ] No email, password, or sign-up flow is shown
- [ ] Room creator is the host; other joiners are not
- [ ] Refresh or a brief disconnect restores the same display name and host/player role
- [ ] The UI states that this is the lobby and that players are waiting for the host
- [ ] Tests drive this through the room command API and player/host snapshots — not React or SQL internals
