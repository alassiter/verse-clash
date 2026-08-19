# 02 — Mad Libs stories and a Prompt-free start

**What to build:** Mad Libs has its own authored stories (cues on blanks, sentence breaks written by the author). The Host can read the next story on the dashboard and skip it. Starting a round goes straight to Selecting. Players never see the story or a Prompt.

**Blocked by:** 01 — Mode on create

**Status:** ready-for-agent

- [ ] A sample Mad Libs pack validates; a story missing cues or sentence breaks fails validation
- [ ] In a Mad Libs Room, the Host preview in Gathering shows the next story’s title and full text
- [ ] Host can skip to the next authored story from Gathering
- [ ] `startRound` in Mad Libs never enters Prompt; players’ snapshots have no prompt text
- [ ] Players still sit on Teams; the Host stays off every Team
- [ ] A Classic Room is unaffected (Prompt and the current pack still run)
- [ ] Tests cover pack validation without a Room, and start/skip through the room command API
