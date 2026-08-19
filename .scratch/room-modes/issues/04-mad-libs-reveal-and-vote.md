# 04 — Mad Libs Reveal and Crowd Favorite

**What to build:** After Mad Libs fills, the Room sees each Team as a reading: a title card, then authored sentences at 3 seconds each, filled words underlined with a small name under the line. No per-word emojis. Then players tap a Team to re-read and cast one Crowd Favorite. Standings follow; the Host can start the next story or end.

**Blocked by:** 03 — Type-or-tap fills

**Status:** ready-for-agent

- [ ] Reveal shows a Team title card, then that Team’s sentences on a 3-second clock; the next Team starts only after this crawl finishes
- [ ] Filled words are attributed (underline + name); there is no word-emoji voting
- [ ] Host pause freezes the crawl; resume continues it
- [ ] After the last Team, Voting lets a player re-read any finished story by choosing that Team, then cast one Crowd Favorite
- [ ] Voting closes when every eligible player has voted, or when the Host force-advances / the timer fires — no extra done-voting control
- [ ] Standings increment the winning Team; Host can start the next story or end the game
- [ ] Classic Reveal (contribution pace + word emojis) is unchanged
- [ ] Tests walk the crawl and vote through the room command API by advancing time
