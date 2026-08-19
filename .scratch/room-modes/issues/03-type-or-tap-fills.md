# 03 — Type-or-tap fills

**What to build:** In Mad Libs Selecting, each seated player fills blanks one at a time: an authored cue, five dealt suggestions, or a typed phrase (max 40 characters). Unsafe type-ins are rejected. Extra blanks go round-robin. Teammates still see ticks and Team chat, never the words. Force-advance picks a random dealt suggestion. This fill behavior is what Grand will reuse.

**Blocked by:** 02 — Mad Libs stories and a Prompt-free start

**Status:** ready-for-agent

- [ ] Selecting happens in a Breakout; Team chat and submit ticks still work; words stay hidden until Reveal
- [ ] The phone shows only the current cue — no example word, no later cues, no story
- [ ] Player can submit by tapping one of five 2/2/1 suggestions or by confirming a typed fill of 1–40 characters
- [ ] A blocked or empty type-in is rejected; the player retries or taps a suggestion
- [ ] After submit, the next blank for that player appears if they were dealt more than one; they cannot edit a submitted blank
- [ ] Blanks are dealt round-robin across the Team so a short Team still completes the story
- [ ] Force-advance (or the Selecting timer) fills each open blank from its dealt five
- [ ] A mid-round joiner waits for the next story
- [ ] Tests assert owner vs teammate views, reject-and-retry, and sequential blanks through the room command API
