# 01 — Validate and deal from an authored content pack

**What to build:** A content author can write a pack and learn immediately whether it is valid, workplace-safe, and dealable — without standing up a game room. A tiny sample pack exists so a 2–4 player table can be dealt later. The validator reports missing structure, a bad 2/2/1 chaos mix, blocked terms, and unsafe combinations. Deal produces five options per player that are unique within a team and reusable across teams.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A documented pack shape exists for prompts, templates, slots, words, and safety lists, including unused hidden-effect fields that may be present and ignored
- [ ] A sample pack valid for a 2–4 player table loads successfully
- [ ] Missing slots, an impossible deal mix, blocked terms, and banned category pairs fail or replace conservatively with a clear reason
- [ ] Deal for a team yields five options per assignment (2 sensible, 2 strange, 1 chaos) with no duplicate option text inside that team
- [ ] The same word may be dealt to the same slot role on a different team
- [ ] Work Safe is the only content mode
- [ ] Tests run through the content-pack validator seam only — no room, UI, or database required
