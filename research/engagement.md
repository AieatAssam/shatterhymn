# Engagement & gameplay principles — tap mechanic review

Updated 2026-10-27 after replacing the hold-to-sweep dial with direct colour taps + empty-strike penalty (see `docs/TAP-DESIGN.md`).

## Malone–Lepper (unchanged table, new mapping)

| Principle | Tap-era mapping |
|---|---|
| Challenge | Reading the field under time pressure; empty taps punish greed/mash. Difficulty retune densified L0–L2 so chords still form. |
| Fantasy | Unchanged: singing bell, cathedral, choir. |
| Curiosity | Unlocks, kinds, daily seed unchanged. |
| Control | **Higher.** Instant note choice; skill is *which* and *when*, not dial travel. |
| Cooperation / Competition / Recognition | Daily Hymn, share, titles unchanged. |

## Hooked (still ethical)
Trigger → Action (now one tap) → Variable reward (N² / Choir / golden) → Investment (shards/skins). Empty-strike penalty is a fair cost of mashing, not a dark-pattern near-miss: geometry is fully visible.

## Fairness of empty-strike penalty
- Targetable definition (`rho ≤ TARGETABLE_R`) matches what the player can hit.
- No bell crack on dud — lives only lost to physics.
- 400ms lockout is readable (pad greyscale) and short enough not to feel soft-locked.
- Label is plain English: “No {Colour} crystals · combo lost”.
- Opus ruled **against** lighting buttons for on-screen colours so the penalty remains meaningful.

## Flow / difficulty curve
- Dial travel (~400–800ms) removed → retune L0–L2 spawn/speed/fieldCap upward slightly (TAP-DESIGN §4).
- Mass shatter (N²) remains the main payout; mashing every colour cannot farm streak.
- Session length: short runs, instant restart — unchanged ethics §17.

## Clarity
- Pad shows only unlocked K colours with shape glyphs (colour-blind channel).
- Board must not compete with crystal hues (art pass).
- HUD copy audited to remove hold/dial language.

## Near-miss
- “Close!” remains geometry-true (`CLOSE_GAP`); spawn director does not read player state except Mend cracks.
