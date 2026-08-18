# 04 — Play hidden selection in a team room

**What to build:** The host starts a Round 1 from an authored prompt (with preview and skip). Every team sees the same prompt. Each seated player gets a personal five-option set for a hidden slot, unique among teammates, and only sees the category label — not the template. Players submit one choice. Teammates see who has submitted, never the words. Team chat and light team emojis work. A countdown is visible. Host can pause/resume and force-advance; unsubmitted players get a random option from their dealt set. A joiner who arrives after the round started waits for the next round instead of receiving a half-assignment.

**Blocked by:** 01 — Validate and deal from an authored content pack; 03 — Seat teams and ready up

**Status:** ready-for-agent

- [ ] Host can preview the next prompt and its word pools, skip to the next authored prompt, then start Round 1
- [ ] Every team sees the same prompt; each player sees only their label and five options
- [ ] Dealt options follow the 2/2/1 mix and are unique within a team
- [ ] Player can submit exactly one choice and see that it counted; they cannot change teammates’ selections
- [ ] Teammate snapshots show submit ticks and hide options and selected words until reveal
- [ ] Team-only chat and optional team emojis are visible to that team and not to other teams
- [ ] Selection timer is visible; host can pause, resume, and force-advance
- [ ] Force-advance assigns a random remaining option from each unsubmitted player’s dealt set
- [ ] Extra players beyond template slots still get a real assignment; mid-round joiners see a wait-for-next-round state
- [ ] Refresh keeps an already-submitted choice
- [ ] Tests assert hidden-vs-owner views through the room command API, using a fixture pack
