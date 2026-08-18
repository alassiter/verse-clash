# 05 — Reveal compositions with attribution and reactions

**What to build:** After selection completes, the system assembles one readable composition per team with no further player input. Unused slots use that slot’s house filler. Unsafe combinations are replaced with house filler. Everyone leaves the team room for a shared stage. Teams are revealed one at a time, contribution by contribution, with the selector’s display name and emphasis on player words. Host can pace or auto-advance the reveal. All players can send 😂 👏 🤯 ❤️ 😮 as short bursts. There is no global text chat on the stage.

**Blocked by:** 04 — Play hidden selection in a team room

**Status:** ready-for-agent

- [ ] Each team produces one composition of static connective text plus attributed contributions
- [ ] Missing players’ slots use house filler; Work Safe failures also become house filler
- [ ] All players are moved to a shared reveal; team chat is no longer the primary surface
- [ ] Reveal walks one team at a time and one contribution at a time, showing “Selected by {name}”
- [ ] Host can advance the reveal cursor or let a short timer do it
- [ ] Anyone can send one of the five reveal emojis; they appear as bursts and do not bury the text
- [ ] No global text chat is available during reveal
- [ ] After reveal starts, teammate views may show the selected words (hidden-selection rule lifts)
- [ ] Tests assemble and step reveal state through the room command API; safety replacements are asserted with literals
