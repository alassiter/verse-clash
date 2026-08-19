# 06 — Migrate

**What to build:** From Gathering, Standings, Ended, or the Grand linger screen, the Host opens a new Room in another Mode. Everyone who is present is already in the new Room with the same name. Teams come along only when both Modes have Teams. The old Room Ends and forwards anyone who comes back (refresh, late heartbeat, old code). A confirmation shows the new code and Mode.

**Blocked by:** 04 — Mad Libs Reveal and Crowd Favorite; 05 — Grand

**Status:** ready-for-agent

- [ ] Host can Migrate from Gathering, Standings, Ended, and Grand linger, and cannot from Prompt, Selecting, a crawl, or Classic/Mad Libs Voting
- [ ] Migrate creates a new Room in the chosen Mode; the Host remains Host; present players already exist there with the same display names
- [ ] Old Room is Ended; player snapshots on the old code expose a forward to the new code and Mode
- [ ] `joinRoom` or a heartbeat on the old code for a known player lands them in the new Room
- [ ] Teams and seating copy on Classic ↔ Mad Libs (wins start at 0); to or from Grand, seating is wiped
- [ ] Old chat and Crowd Favorite wins do not copy
- [ ] Players see a confirmation of the new code and Mode; the tap is only a reconnect hatch
- [ ] Tests drive Migrate, carry/wipe, and forward through the room command API
