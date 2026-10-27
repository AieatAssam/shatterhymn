# TAP-DESIGN — direct colour taps + empty-strike penalty

Status: **normative**. Codex implements exactly this. Supersedes docs/design.md §Controls (hold/sweep dial).
Source: live player feedback (sweeping colours is too slow; wants a penalty for tapping a colour that isn't on screen). We told the player we'd ship both.

## 1. Input model
- **One tap on a colour button strikes that note right away.** No hold, no sweep, no release. The strike resolves on the next sim tick after `pointerdown`, not on `click`.
- **Keyboard:** `Digit1`…`DigitK` and `Numpad1`…`NumpadK` strike notes 0…K−1. Remove Space and letter keys as strike keys. Keep Esc/P for pause. Ignore key repeat.
- **SimInput** becomes `{ strike: number | null }`. Drop `press`, `release`, `cancel`. `Input.consume()` returns the latest tap from this frame.
- **Recovery:** keep `RECOVERY_MS = 150` after any strike. A tap that lands during recovery goes into a one-slot buffer `state.queuedNote` (a newer tap replaces it) and fires when recovery ends. A lockout (§2) clears the buffer.
- **Buttons (`src/ui/colorPad.ts`, replaces `dialBar.ts`):** one row of `<button>` fixed to the bottom, inside the thumb zone.
  - Each button is at least 56px tall and 48px wide, with an 8px gap. The row fills the width (max 480px, centred). `padding-bottom: max(12px, env(safe-area-inset-bottom))`.
  - Each button has the note colour as its fill plus that note's `glyph(i)` (triangle, diamond, hexagon, star, orb) at 60% of button height. Small key number in the corner on pointer:fine devices only.
  - `aria-label="Red triangle, key 1"` and so on.
  - **Only notes `< state.K` are shown.** Locked notes are hidden, not greyed out. When K grows, the new button scales in from 0 to 1 over 250ms (no motion under Reduce motion) and the existing banner fires.
  - Press feedback: scale 0.92 for 80ms. No other idle animation.
- **Delete:** `src/sim/dial.ts`, `DialState`, `state.dial`, the `holdStart`/`dialStep` events, the `dialStep→tick` haptic, juice `holding/holdTime` and the bell hold-wobble, the caret, the "Locked for now" slot, `Input.cancelHold` semantics (keep a `reset()` that clears the buffer), and the anywhere-on-screen press surface. The canvas no longer takes strike input.

## 2. Empty-strike penalty
**Trigger:** a strike where `n === 0 && shellBreaks === 0`, meaning no alive crystal of that note with `rho <= TARGETABLE_R`. This is the existing dud branch in `resolveStrike`. "On screen" means targetable. Prisms count as whatever colour they are in that tick. Breaking a geode shell counts as a hit.

**Reuse, don't fork:** keep the `dud` event `{ type: 'dud', note }` and the existing branch. Change only what it does:
| Effect | Spec |
|---|---|
| Combo | `streak = 0`, `mult = 1` (already done). Fever heat drops to 0 (juice already does this on `dud`). |
| Lockout | Rename `state.jarMs` → **`state.lockMs`**. Replace `JAR_MS = 600` with **`EMPTY_LOCK_MS = 400`**. While `lockMs > 0`, every strike is ignored: no event, no buffer, no stats. |
| Bell | **No crack.** `cracks`, `graceMs` and `hymn` stay the same. The existing bell wobble (`juice.dudTime`) stays as feedback. |
| Sound | `playDud` plays only the `dud` sample at 0.6 volume. Remove the pitched `tone(note…)` call so it sounds flat. |
| Haptic | `dud` pattern becomes `[28]` (one short dull pulse), priority 3. |
| Label | popText at the bell: **"No {Red} crystals · combo lost"** (colour name from §Notes), colour `#A59FC9`, size 20, 900ms. Replaces "Missed". |
| Buttons | Add class `.lockout` to the whole pad while `lockMs > 0`: `filter: grayscale(1); opacity: .4`. Remove it the moment `lockMs` reaches 0. |
| Stats | `stats.duds++`, `stats.strikes++` (already done). |

## 3. On-screen colour hint — **NO**
Don't brighten buttons for colours that are on screen. The whole game happens on the field. The skill is reading which colour is massing near the bell and waiting to hit it for N². A hint on the pad pulls the player's eyes down to the buttons and turns play into "tap whatever is lit". It would also make the penalty the player asked for nearly impossible to trigger, so it stops meaning anything. Colour-blind support already comes from shape and pitch on every crystal, and from the glyph on every button. Players who need more time get **Slower crystals** (§6). We'll revisit only if playtests show dud rates above 15% of strikes on L0–L1.

## 4. Difficulty retune
Strikes now cost about 0ms of dial travel instead of roughly 400–800ms. The field would empty faster and big chords would get rarer, so L0–L2 run denser and slightly faster. Remove `stepMs` from `LevelRow`, `LEVELS` and `levelRow()` because nothing uses it any more.

| L | K | spawnInterval (now → new) | speed | fieldCap |
|---|---|---|---|---|
| 0 | 3 | 1.5 → **1.3** | 0.85 → **0.90** | 8 → **9** |
| 1 | 3 | 1.35 → **1.2** | 0.95 → **1.00** | 8 → **10** |
| 2 | 4 | 1.25 → **1.1** | 1.05 → **1.10** | 10 → **11** |
| 3–7, endless | — | unchanged | unchanged | unchanged |

- **Scoring stays the same.** The main payout is still `base·n²`, plus Choir (`CHOIR_N = 7`, `choirFlat 500`, `choirEach 50`). Leave the mult formula `1 + floor((streak−1)/2)`, `multCap 8`, close/shell/golden values, `RECOVERY_MS` and `CRACK_GRACE_MS` as they are. The empty-strike penalty is what keeps players from mashing every colour to farm streak.
- **Attract pilot** (`attract.ts`): every 2500ms, if `lockMs === 0` and `recoveryMs === 0`, pick the note with the most alive crystals at `rho <= ATTRACT_HOLD_RHO` (rename it to `ATTRACT_RHO`), with at least 5, and return `{ strike: note }`. It must never tap an empty colour. The colour pad flashes the pressed state for the pilot's tap so the attract screen shows how to play.

## 5. Tutorial (`TUTORIAL_SCRIPT`)
`expect` becomes `{ strikeNote } | 'button' | 'auto'`. Remove `'press'` and `'release'`. In `sim.ts` and `controller.ts`, allow strikes only when the current step's `expect` is a `strikeNote` object. Remove the hard-coded step indices 2 and 4 and the `before===1` logic.
1. *Two red triangles.* "Two red triangles are coming. Tap the red ▲ button to shatter both." → `{strikeNote:0}`
2. "Both broke. One tap breaks every crystal of that colour at once." → `auto`, 1600ms
3. *Yellow + green.* "Now tap yellow ◆ to break the yellow diamond." → `{strikeNote:1}`
4. "Careful: tapping a colour with no crystals on screen loses your combo and freezes the buttons for a moment." → button "Got it"
5. "Stop crystals touching the bell. Each touch cracks it. Three cracks and the run ends." → button "Got it"
6. "Break more of one colour at once for far more points. 1 crystal: 10 · 3 at once: 90 · 5 at once: 250." → button "Start"

`TUTORIAL_RETRY` = "That was {Yellow}. Tap red ▲ to break the red triangles."

## 6. Copy audit (must change)
| File | Now | New |
|---|---|---|
| `src/ui/dialBar.ts` hint | "Hold to pick a colour. Let go…" | Delete the file. The colorPad hint for runs ≤3 says "Tap a colour to shatter every crystal of that colour." |
| `src/ui/banners.ts` `dud` | "…makes the bell wobble…" | "You tapped a colour with no crystals on screen. That resets your combo and pauses the buttons for a moment." |
| `src/ui/banners.ts` `blue` / `purple` | "The dial now has 4/5 colours." | "New colour: Blue star. You now have 4 colour buttons." / "…Purple circle. You now have 5 colour buttons." |
| `src/ui/banners.ts` `chord` | "with one note" | "with one tap" |
| `src/ui/popText.ts` | "Missed" | see §2 label |
| `src/sim/tutorial.ts` | all steps + retry | §5 |
| `src/ui/screens/settings.ts` | "Slow dial" + "Gives you more time to pick a note." | **"Slower crystals"** + "Crystals move 20% slower. Shown on your share card." |
| `src/meta/share.ts`, `shareCard.ts` | "Slow dial" | "Slower crystals" |
| `README.md` | lines 5, 10, 38–39, 49, 55, 82, 86 | Tap a colour, no hold/let-go; controls table: "Tap colour / 1–5: strike that colour"; "Slower crystals" |
| `docs/design.md` | §Controls, §143, §145, dialStep row, JAR_MS row | Point to this doc. Remove the dial rows. |

**Slow dial decision:** the dial no longer exists, so the setting becomes **Slower crystals**, which multiplies crystal `speed` by `SLOW_SPEED_FACTOR = 0.8` (replaces `SLOW_DIAL_FACTOR`). Keep the save key `settings.slowDial` and `RunResult.slowDial` so there's no save migration. Only the label and the effect change. Applies to run and daily, not attract.

## 7. Tests Codex must add (and delete `tests/dial.test.ts`)
1. **Direct strike:** two note-1 crystals inside `TARGETABLE_R`, `step({strike:1})` → one `strike` event with `n=2` in the same tick, and no `dialStep`/`holdStart` events anywhere.
2. **Empty strike resets combo and locks:** with `streak=5, mult=3` and no note-2 crystals, `step({strike:2})` → `dud` event, `streak=0`, `mult=1`, `lockMs=400` (±1 tick), `stats.duds=1`.
3. **Lockout blocks strikes:** right after (2), strike a note that does have crystals → no `strike` event, crystals still alive, `stats.strikes` unchanged, `queuedNote` null. After 400ms the same strike works.
4. **No crack on empty:** after (2), `cracks`, `graceMs` and `hymn` are unchanged and there's no `crack` event.
5. **Recovery buffer:** strike, then tap another note 50ms later → it fires when recovery ends (150ms) and a newer tap replaces it.
6. **Only unlocked:** `strike >= K` is ignored. Keys outside 1…K are ignored. The pad renders exactly K buttons.
7. **Attract:** across 60s of attract sim, the pilot produces ≥1 strike and 0 `dud` events.
8. **Tutorial:** steps 1 and 3 complete on their `strikeNote` taps. Strikes on `button`/`auto` steps are ignored.
9. **Copy:** no source string under `src/` or in `README.md` matches `/\bhold\b|let go|\bdial\b/i` (allowlist the `slowDial` identifier).
10. **Config:** update `config.test.ts` for the L0–L2 values and the removal of `stepMs`.
