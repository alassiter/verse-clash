# Fill floor and verse compose

Classic Teams always submit enough Fills for a readable Verse (11, or one per player if the Team is larger; Double Trouble doubles that floor to 22), then Claude co-writes the Verse. We verify Fills, not length: every Fill appears once with no swaps; ~60% player-word ratio, ~25–40 words, and two-to-four sentences are prompt aims only. A failed compose that still contains every Fill is kept; only a missing Fill, bad parse, timeout, or no API falls back to one of ten generic cycling-blank flavors that wrap Fills through the four Slot roles. Extra Fills round-robin people and Slots (uneven extras are fine), as a personal queue, inside the existing 90-second Selecting clock. Unsubmitted options stay locked; on submit, only the chosen word is burned and the other four recycle into the next hand.

## Considered options

- **Hard 20-word verify** — rejected: a miss retries then hits the four-Slot template dump, which is shorter and more list-like than a slightly-too-short AI Verse.
- **Player-word ratio as a reject line (50%/45%)** — rejected: with ≥11 Fills, 60% is a livable *aim*; rejecting on ratio replaces a co-write with a list.
- **Pad extras so everyone takes the same number of turns** — rejected: stop at the floor; one player picking more than others is fine.
- **Double Trouble pads to 11 then stops** — rejected: Double Trouble doubles the floor (11 → 22).
- **Ten pre-written Verses, or ten fixed 11-blank Mad Libs sheets** — rejected: Fills are unknown until Selecting ends, and Fill count/mix varies by Team size. Cycling the four roles through generic connective tissue flexes; fixed sheets do not.
- **Burn all five dealt options for uniqueness** — rejected: that makes 11 Fills consume 55 unique texts. Only chosen words (and words on live unsubmitted hands) stay out of the pool.

## Consequences

- Solo Teams pick 11 times (22 on Double Trouble); house auto-fill of leftover Slots is obsolete once the rotation covers every role.
- Selecting still ends on the 90-second clock; unsubmitted Fills still random-fill.
- The four-Slot `assembleComposition` dump is not the compose fallback.
