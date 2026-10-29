# SHATTERHYMN: TWO MODES (recovery spec)

Version 2.0 · 2026-10-28 · Design lead. **Normative.** The implementer follows it literally.

**Precedence.** This document supersedes `docs/design.md`, `docs/TAP-DESIGN.md`, `docs/ART-HAPTICS-SPEC.md` and `docs/art/style-guide.md` wherever they conflict. Anything those documents say that this one does not change still holds (audio graph, shard look, PWA, ethics rules in design.md §17, accessibility rules). Background: `research/postmortem.md` and `research/recovery.md`.

Units used below: **H** = one viewport height of the play area in CSS px. **H/s** = viewport heights per second. **u** = Tap-mode world units (design.md §5). **ms** = milliseconds. Y = Rec.709 luma on 0..255 sRGB output, measured at 780 x 1688 as before.

---

## 0. The game in one paragraph

One game, two modes, chosen from the title by two big illustrated cards. **Tap**: crystals drift toward a glass bell with a face; tap a crystal and it shatters with every crystal of its colour. **Slice**: crystals are tossed up from the bottom of the screen; swipe fast through them to slice them in half; slice the same colour in one swipe for a chain; avoid dark crystals; do not let crystals fall. Both modes share the bell (with its face), the living cathedral, the shatter, shards, unlocks and settings. Each mode has its own best score, stats and Daily.

First launch never shows a menu first. It drops into a 5 second playable intro (section 2.1) and then shows the two cards.

---

## 1. Glossary (player-facing names)

| Thing | Name on screen | Notes |
|---|---|---|
| Tap mode | `Tap` | internal id `tap` |
| Slice mode | `Slice` | internal id `slice` |
| The daily seeded game | `Daily #12` | one per mode per day; replaces "Daily Hymn" everywhere |
| 7 or more at once (Tap), a chain of 5 (Slice) | `CHOIR!` | the signature moment |
| Bad crystal in Slice | dark crystal | tips say "dark ones" |
| Lives | the three small bells top-left | no word on screen |

---

## 2. First launch and the first 10 seconds

### 2.1 The 5 second first-launch intro

**When:** on boot when `save.progress.introDone === false` (a fresh save). Never again after it completes once. QA can force or skip it (section 19).

**Mode: Tap.** Reasons:
1. The first touch cannot fail. A tap is the most basic touch a child makes; Fruit Ninja testers tapped instead of swiping (`research/recovery.md`). A swipe intro can be done wrong, a tap intro cannot.
2. The Tap intro can guarantee a Choir (the biggest event in the game) on the very first touch, with the full flash, chord, shake and a delighted face.
3. Everything on screen during the intro is already on screen on the title (bell, board, attract crystals), so the hand-over is seamless.

**How the big shatter is guaranteed:** the intro runs a Tap sim in mode `intro`:
- No spawner, no contacts (nothing can crack), no score shown, no HUD.
- At 300 ms the **Crown** appears: 8 red crystals (note 0) evenly around the bell at rho 7.0 (section 4.4 numbers).
- **Any** pointerdown anywhere on the play surface strikes note 0 (no hit test in the intro). N = 8 ≥ `CHOIR_N`, so the first touch is always a Choir.
- A tap before 300 ms is queued and fires the moment the Crown exists.
- **Auto-tap:** if no touch has happened by 3500 ms, the ghost hand "presses" the lowest crystal and the sim strikes note 0 itself. The Choir plays visually (audio stays silent because the browser has had no gesture; that is fine).

**Timeline (t = 0 is the first rendered frame after WebGL is ready):**

| t (ms) | On screen | Child does | Result |
|---|---|---|---|
| 0 | Living cathedral (section 9), bell with a **sleepy** face in the centre, eyes closed, slow breathing. No text, no buttons. | Looks. | |
| 300 | Bell wakes (blink, small "o" mouth, 400 ms). 8 red triangles scale in around it in a ring (280 ms `easeOutBack`). | | |
| 600 | **Ghost hand** (section 14) appears over the lowest crystal on screen and does its tap loop. One line at 22% height: `Tap a crystal!` | Taps (anywhere). | Choir: all 8 shatter, flash, chord, `CHOIR!` text, delighted face, shards spiral into the bell. Hand and line vanish at once. |
| 3500 | If still no touch: the hand taps on its own. | | Same Choir, silent. |
| Choir + 1300, but not before 2500 | Title cards slide up from the bottom (320 ms, `easeOutBack(1.2)`), header fades in (200 ms). The board is **not** reset: shards keep spiralling. The intro sim is replaced by the attract sim on the next frame; the attract spawner starts 600 ms later. | | `introDone = true` is saved the moment the title mounts. |

Worst case (no touch): title at 3500 + 1300 = 4800 ms. Earliest: 2500 ms.

The intro does not count as a run (`progress.runs` unchanged, no stats, no shards).

### 2.2 First 10 seconds: Tap, first run (`modes.tap.runs === 0`)

| t (s) | On screen | Child does | What happens |
|---|---|---|---|
| 0.0 | Child pressed the Tap card. Cards slide away (200 ms). HUD fades in: 3 small bells top-left, `0` top centre, pause top-right. Nothing at the bottom. Bell face idle, looking at the player. | | Run starts (beginner profile, section 4.5). |
| 0.3 | The Crown: 8 crystals of one colour scale in around the bell at rho 7. | | |
| 0.6 | Ghost hand over the lowest Crown crystal, tap loop. Line: `Tap a crystal!` | Taps on or near any crystal (48 px minimum touch radius). | Choir of 8: (8 x 10 + 500) x 1 = **580** points, delighted face, `CHOIR!` / `8 at once`. Hand and line gone forever for Tap. |
| (any) | | Taps empty space. | Nothing at all. No sound, no text, no penalty. |
| 3.0 | Follow-up: an arc of 5 crystals of a second colour enters at the rim. | | Bell pupils follow them. |
| 4-6 | | Taps one of them. | 5 shatter, happy face, +50 x mult. |
| 5.0 | The normal beginner spawner starts (pairs and arcs of one colour, slower). | Taps whatever arrives. | Every crystal tap breaks its colour group. Streak climbs; ×2 shows on the 3rd strike. |
| 10.0 | | | Nothing can reach the bell before about 11 s after it spawns, so **no crack is possible in the first 10 s**. |

### 2.3 First 10 seconds: Slice, first run (`modes.slice.runs === 0`)

| t (s) | On screen | Child does | What happens |
|---|---|---|---|
| 0.0 | Slice card pressed. HUD fades in (bells, score, pause). The bell sits at the bottom centre, face looking up. | | Beginner profile (section 6.4). |
| 0.6 | Wave 1: one red crystal tossed up from below the bottom edge; apex about 0.70 H at about 1.7 s. | | |
| 0.8 | Ghost hand swipes diagonally across the crystal's path with a real blade ribbon (300 ms stroke, repeats every 1400 ms until the first cut). Line: `Swipe fast to slice!` | Fast swipe through it. | Crystal splits in two along the swipe line, halves spin away, shards, a bright note, a crisp buzz, happy face, `+10`. Hand and line gone forever for Slice. |
| | | Taps the crystal instead. | The crystal wobbles (no cut). Hand demo replays at once; line changes to `Swipe across it!` |
| | | Drags slowly through it. | A faint thin trail, no cut. After the second slow stroke that crosses a crystal without cutting, the line becomes `Swipe faster!` |
| ~3.4 | If not sliced, the crystal falls out of the bottom. | | No crack (miss grace, 15 s for beginners). Bell makes an "oops" face (worried, 400 ms). |
| 2.8 | Wave 2: two yellow crystals side by side. | One swipe through both. | Chain ×2: two rising notes, `+10` then `+20`. |
| 5.0 | Wave 3: three green in a volley. | One swipe through all three. | Chain ×3: `+10 +20 +30`, then `3 in one swipe!` and +60 bonus. Happy face. |
| 7.2 | Wave 4: two crystals of two colours. | | |
| 9.2 | Wave 5: four of one colour. | | Chance of chain ×4. |
| 10.0 | | | No crack possible yet; no dark crystal before 25 s in beginner runs. |

---

## 3. Title / mode select

### 3.1 Layout

Portrait (reference 390 x 844):

| Band | Content |
|---|---|
| top 0-14% (+ safe-top) | Logo `SHATTERHYMN` (Cinzel 700, `clamp(22px, min(8vw, 6dvh), 48px)`), line under it: `Pick a game!` (Inter 600, 18 px, `#F4F1FF`). Settings gear icon button top-right (44 x 44, `aria-label="Settings"`). Friend pill and update banner as before, under the line. |
| 14-44% | The live board: bell with face (sleepy until the first gesture, then idle) and the attract crystals. No UI. |
| 44-90% | Two mode cards stacked, 12 px gap, each full width (max 440 px, centred), min height 132 px. |
| 90-100% (+ safe-bottom) | Chip row: `Missions`, `Collection`. Only when shown (3.3). |

Landscape (height < 500 px): header row (logo left, gear right, `Pick a game!` hidden when height < 420), the two cards side by side (each max 46% width), chip row under them. The title screen keeps `overflow: auto`, so on the smallest layouts the chip row may scroll; it must never overlap.

### 3.2 Mode cards (exact)

Each card is an `<article class="mode-card" data-mode="tap|slice">` with one big `<button class="mode-play">` that fills the card and starts a normal run of that mode, plus a Daily chip inside the card (3.3).

| | Tap card | Slice card |
|---|---|---|
| Button classes | `mode-play play-hero` (keeps the old `.play-hero` selector for layout-check) | `mode-play` |
| Illustration | Inline SVG (`.mode-art`, viewBox 120 x 72, height 72 px): three red triangles from `glyphShape(0)` in a small arc, the middle one with 6 short white burst lines, and the hand icon (14.3) touching it. `feGaussianBlur` stdDeviation 2 glow under the glyphs. | Inline SVG: a white tapered swoosh (filled path, 2 px at the tail to 7 px at the head) crossing a green hexagon (`glyphShape(2)`) drawn as two halves offset ±5 px along the swoosh normal, and a whole yellow diamond (`glyphShape(1)`) to the right. Same glow. |
| Name (`.mode-name`) | `Tap` | `Slice` |
| How-to (`.mode-how`) | `Tap crystals to smash them` | `Swipe fast to slice crystals` |
| Best (`.mode-best`) | `Best 18,420` or `Not played yet` | same format |
| aria-label | `Play Tap. Tap crystals to smash them. Best 18,420` | `Play Slice. Swipe fast to slice crystals. Best 3,100` |
| Card background | `linear-gradient(160deg, #3A1D5C, #1D1440)`, border 2 px `rgba(255,210,122,.5)`, radius 22 px | `linear-gradient(160deg, #0F3B4A, #13244A)`, border 2 px `rgba(159,227,255,.5)` |

Type: name Cinzel 700 `clamp(26px, 7vw, 36px)`; how-to Inter 600 `clamp(16px, 4.4vw, 18px)`; best Inter 800 16 px `#FFD27A`. Press feedback: scale .97 for 80 ms. Illustration idles with a 3 s gentle float (±3 px), none under Reduce motion.

If the URL has `?mode=slice` (or `tap`) without `qa=1`, that card gets a pulsing gold border (1.2 s period) and receives focus. It does not auto-start.

### 3.3 Daily, Missions, Collection, Settings

Visibility rule: `const meta = save.progress.runs >= 3` (total runs, both modes).

| Element | Where | Shown | Strings |
|---|---|---|---|
| Tap Daily | `<button class="chip daily" data-mode="tap">` inside the Tap card, under the how-to line | `meta` | label `Daily #12`; badge = today's Tap daily best (`8,420`) with class `badge done`, or a `dot` if not played. aria-label `Tap Daily #12. Today's best: 8,420` / `Tap Daily #12. Not played yet` |
| Slice Daily | `<button class="chip daily" data-mode="slice">` inside the Slice card | `meta` | same with `Slice` |
| Missions | chip row, class `chip missions-chip` | `meta` | `Missions`, badge `1 / 3` |
| Collection | chip row, `aria-label="Collection"` | `meta` | `Collection` |
| Settings | gear button top-right of the title, `aria-label="Settings"`, class `chip settings-chip` | always | icon only, label in aria |
| Credits | inside Settings (unchanged) | always | |

Pressing a Daily chip starts that mode's Daily run. The tagline `Sing one note. Break everything tuned to it.` is removed from the title, `index.html` (title becomes `Shatterhymn: tap or slice the crystals`, description `Tap or slice glowing crystals and keep the singing bell safe.`) and the manifest `description` (same text).

### 3.4 Attract board behind the title

Unchanged Tap attract sim, with these changes: the pilot strikes every 2500 ms the note with the most crystals within rho 8 if that count is ≥ 3 (was rho 6, ≥ 5), so something breaks often. Sound stays muted until the first gesture. Pilot strikes make the face happy (section 5). In landscape the board is visible beside the cards.

---

## 4. Tap mode

### 4.1 Input and hit testing (`src/modes/tap/tapHit.ts`, pure)

The colour pad is **removed**. The canvas surface (`#surface`) takes taps.

- Every `pointerdown` on `#surface` with `button === 0` (mouse) or any touch/pen pointer is a tap. Multi-touch is allowed: each new pointer is a tap.
- The controller projects every alive crystal with `rho <= TARGETABLE_R` to CSS px (`renderer.project`) and computes its on-screen visual radius `visPx` (projected `c.r * crystalVisualScale(c.rho)`; Golden ×1.25).
- Hit radius: `hitPx = max(TAP_HIT.minPx, TAP_HIT.scale * visPx)` with `TAP_HIT = { minPx: 48, scale: 1.25, tieEps: 0.02, bellScale: 1.3 }`.
- Candidates: crystals with `dist <= hitPx`, where `dist` is the distance from the tap to the projected centre. Score `d = dist / hitPx`. **Smallest `d` wins.**
- **Ties** (`|d1 - d2| <= tieEps`): prefer the crystal whose colour has more targetable crystals; then the smaller `rho` (closer to the bell); then the lower `id`.
- Winner → `SimInput.strike = winner.note` on the next tick. Recovery (150 ms) and the one-slot queue stay as now.
- **Bell tap:** no crystal hit and the tap is within `bellScale * bellRadiusPx` of the bell centre → the bell giggles (face `boop`, 500 ms, a soft high bell tone at gain .3). No gameplay effect.
- **Empty tap:** see 4.2.
- Keyboard `Digit1..DigitK` / `Numpad1..K` still strike notes (accessibility). A key for a colour with no targetable crystal does nothing.

`pickCrystal(cands: {id, note, sx, sy, visPx, rho}[], tapX, tapY, groupCount: (note) => number): number | null` is the pure function under test.

### 4.2 Empty taps and gentle misses

- An empty tap is **never** a strike. There is no lockout, no grey state, no "combo lost", no dud event, no dud sound, no dud haptic in Tap mode. `EMPTY_LOCK_MS`, `state.lockMs` and the `dud` event are deleted.
- **Gentle miss** unlocks when `modes.tap.runs >= 5` (from the 6th Tap run; Daily included). Then an empty tap whose world point (unproject onto z = 0) has `rho <= ARENA_R` and is not a bell tap sends `SimInput.miss = {x, y}`:
  - If `streak >= 2`: `streak = 0`, `mult = 1`, emit `{ type: 'miss', x, y }`, `stats.misses++`.
  - If `streak < 2`: nothing.
  - Feedback for `miss`: a small `ink-muted` ring at the point (R 0 → 1.2 u over 260 ms), `ui-back` sample at gain .3, face `worried` 400 ms. **No text, no haptic, no lockout, no freeze.**
- Before run 6 the `miss` input is never sent.

### 4.3 Scoring (replaces design.md §6 step 7)

The N-squared chord bonus is removed so that tapping fast is never worse:

```
points = (SCORE.perCrystal * N + SCORE.shell * shellBreaks) * mult
Choir (N >= CHOIR_N): + (SCORE.choirFlat + SCORE.choirEach * swept) * mult   (unchanged)
Golden: + GOLDEN_POINTS * mult                                                (unchanged)
mult = min(8, 1 + floor((streak - 1) / 2))                                    (unchanged)
SCORE = { perCrystal: 10, shell: 5, choirEach: 50, choirFlat: 500, multCap: 8 }
```

- Close calls no longer score. `SCORE.close`, the `Close!` pop and the close haptic bump are removed. `ShatterInfo.close` and `stats.closeCalls` stay (used by the face only).
- Why this is never worse for a fast tapper: each crystal is worth `10 × mult`, and `mult` only grows with the number of successful strikes. Waiting gives fewer strikes, so a lower or equal `mult`. The only group bonus is the Choir, and Choirs come from the Crown and Chord waves, which arrive as one group, so the first tap gets them.
- Worked examples (mult ×1): 1 crystal 10, 2 → 20, 5 → 50, Crown of 8 → 80 + 500 = 580.
- Streak resets on a crack and on a gentle miss (4.2). `stats.duds` is renamed `stats.misses`.

### 4.4 The Crown: guaranteed big shatter in every Tap run

```ts
export const TAP_OPENING = { crownAtMs: 300, crownCount: 8, crownRho: 7.0, crownSpeed: 0.35, crownSwirl: 0.10,
  followAtMs: 3000, followCount: 5, followArc: 1.0, followSpeedFactor: 0.85, followCapSlack: 5, spawnerStartMs: 5000 } as const;
```

- Every Tap run (normal, Daily, intro) starts with the Crown: `crownCount` crystals of one note, evenly spaced around the full circle starting at a seeded `theta0`, at `rho = crownRho`, `speed = crownSpeed`, `swirl = +crownSwirl`, kind `normal`, spawned at `crownAtMs`. Note: `rng.int(3)` (seeded, so the Daily Crown is the same for everyone); intro always note 0.
- Time to reach the halo: (7.0 - 1.6 - 0.55) / 0.35 ≈ 13.9 s.
- The first tap on any Crown crystal is N = 8 → Choir before second 5 for any child who touches the screen.
- **Follow-up** at `followAtMs`: an Arc of `followCount` crystals of a different note (next from the tone bag, redraw if equal), arc `followArc` rad, at `SPAWN_R`, speed `levelRow(0).speed * followSpeedFactor`. It may exceed `fieldCap` by up to `followCapSlack` once.
- The normal spawner (`Spawner.update`) starts at `spawnerStartMs`. `OPENING_SPAWN_MS` and the opening Ring are removed.
- The Crown is skipped by the fairness rule (design.md §7.5) and does not roll special kinds.

### 4.5 Spawner pacing: beginner profile for Tap runs 1-3

`profile = !daily && modes.tap.runs < 3 ? 'beginner' : 'standard'`. Passed into `new Sim({ profile })`. This is a fixed, documented ramp by run count, never by performance (design.md §17 holds).

| | Beginner | Standard |
|---|---|---|
| Crystal speed | `levelRow(L).speed × 0.85` (× `SLOW_SPEED_FACTOR` too if Slower crystals is on) | `levelRow(L).speed` |
| L0-L1 formation weights | single 1, pair 4, arc 4 (arc unlocked from L0, count 3 at L0) | design.md §7.3 |
| First variety event | Chord wave at 15000 ms (7 of one note, `CHORD_SPEED`), then the standard event timer | Golden at 20-26 s (unchanged) |
| Specials, K, level table | unchanged | unchanged |

Daily always uses `standard`.

### 4.6 Cracks and game over

Unchanged from design.md §5 and §9: halo contact cracks, flare `FLARE_R`, grace `CRACK_GRACE_MS`, `MAX_CRACKS = 3`, game-over sequence (250 ms freeze, slow-mo, results at 1.4 s). Face: `wince` on crack, `dizzy` on game over (section 5). The bell still shatters at game over; the face fades out over the first 120 ms of the shatter.

No-input fairness test (replaces the 12-40 s bound): with no input, a standard Tap run lasts between **14 s and 70 s** for 20 seeds.

### 4.7 Tips (Tap, contextual banners, once each, ever)

| id | Text (exact) |
|---|---|
| `crack` | `Ouch! Keep crystals away from the bell.` |
| `chord` | `Seven of one colour! Tap one to smash them all.` |
| `golden` | `Gold crystal! Smash it for lots of points.` |
| `geode` | `Rock crystal! Tap it twice to crack it open.` |
| `prism` | `Rainbow crystal! Smash it to break everything near it.` |
| `splitter` | `Splitter! It breaks into two small crystals.` |
| `rusher` | `Fast one! Tap it quick.` |
| `mend` | `Glowing white crystal! Smash it to fix the bell.` |
| `blue` | `New colour: blue star!` |
| `purple` | `New colour: purple circle!` |

The `dud` tip is deleted. Banners never show during the first 10 s of a run, and never while the demo line (section 14) is visible.

### 4.8 Removed from Tap

`src/ui/colorPad.ts`, every `.color-pad*` / `.color-button` / `.lockout` / `.tutorial-pad` CSS rule, `padVisible`, `PadState` (replace with the controller `Screen` type), `tests/padVisibility.test.ts`, the pad-zone masks (`uPadTop`, `uPadTopPx`: delete the uniforms and the masks that use them), the "Tap a colour to shatter every crystal of that colour." hint, `EMPTY_LOCK_MS`, `lockMs`, the `dud` event and its sound/haptic/pop/tip, `TUTORIAL_SCRIPT`, `TUTORIAL_RETRY`, `src/sim/tutorial.ts`, the `tutorial` sim mode, the close-call pop and points, `forceFeverCapture` and `?fever=1`. Copy test (section 21) forbids the words "colour button", "combo lost" and "button" in tips.

### 4.9 Tap tests (`tests/tap.test.ts`, `tests/tapHit.test.ts`)

1. `pickCrystal`: a tap 30 px from a crystal with `visPx` 20 hits it (minPx 48); 60 px misses; two candidates at d .40 and .70 → the .40 one; a tie within .02 → the colour with more crystals; then lower rho; then lower id.
2. Crown: a standard run has exactly 8 alive crystals of one note at t = 300 ms ± 1 tick, all at rho 7.0; striking that note at 400 ms gives a `strike` with n = 8 and a `choir` event.
3. Crown note is the same for two sims with the same seed; intro mode uses note 0.
4. Scoring: two strikes of N = 2 then N = 2 score 20 + 20; one strike of N = 4 scores 40; with streak 4 (mult 2) a strike of N = 3 scores 60. No `close` points.
5. Empty strike: `step({strike: 2, miss: null})` with no note-2 crystals → no event, `streak` and `mult` unchanged, `recoveryMs` unchanged, `stats.strikes` unchanged.
6. Gentle miss: with `gentleMiss: true`, streak 3 → `miss` input resets streak to 0, mult 1, emits `miss`; with streak 1 → nothing; with `gentleMiss: false` → nothing; a miss point with rho > `ARENA_R` → nothing.
7. Beginner profile: L0 crystal speed = 0.90 × 0.85; first variety event is a chord wave at 15000 ms ± 1 tick; Daily ignores the profile.
8. No-input run length 14-70 s for 20 seeds (standard).
9. Intro mode: no `crack` in 60 s of idle; a strike at tick 1 is queued and fires at 300 ms with n = 8; auto-strike is the controller's job (not tested in sim).

---

## 5. The bell face

### 5.1 How it is drawn

- A camera-facing quad (`src/render/face.ts`, shader `src/render/shaders/face.ts`), one draw call, `renderOrder` 6 (above the bell, below crystals at 10), depthTest off, transparent. All features are signed-distance shapes in the fragment shader driven by uniforms, so they are crisp at any DPR. No textures.
- Size: Tap: quad diameter 3.4 u centred on the bell (about 60 px on a 390 px wide phone). Slice: 1.3 world units (about 110 px on an 844 px tall phone).
- Face plate: soft frosted disc behind the features, `#E8F1FF` at alpha .22, radius .92 of the quad, edge feather .08. It takes the skin's rim colour at 30% mix.
- Features (quad UV in [-1, 1]):

| Feature | Shape | Default |
|---|---|---|
| Eyes | sclera ellipses at (±.36, .12), rx .20, ry .24 × `eyeOpen`, white `#FFFFFF` | `eyeOpen` 1 |
| Pupils | discs r .11, `#2A1B3D`, offset up to .07 toward `uLook` | look at target |
| Eye shine | disc r .035 at pupil + (.04, .05), white | |
| Happy eyes | arcs "^" (stroke .06), blended by `eyeHappy` 0..1 | 0 |
| Squeeze eyes | chevrons ">" "<" (stroke .06), blended by `eyeSqueeze` | 0 |
| Dizzy eyes | spirals (polar SDF, 2 turns), `eyeDizzy` | 0 |
| Brows | short strokes above the eyes at y .42, tilt `browTilt` (+1 worried) | hidden at 0 |
| Mouth | at (0, -.32): blend of smile arc (`mouthCurve` +1), frown (-1), open ellipse (`mouthOpen` 0..1, inside `#2A1B3D`, lip line white), zig-zag (`mouthZig` 0..1), small "o" (`mouthO`) | small smile `mouthCurve` .4 |
| Blush | discs r .13 at (±.55, -.15), `#FF8FB1` alpha .35 × `blush` | 0 |
| Plasters | one small cross-strip plaster per crack, at fixed spots (-.5, .5), (.55, -.45), (-.1, -.62), `#FFE2C4` | per `cracks` |

Lines are white `#F4F1FF` at HDR 1.2 so they read on the dark board and bloom slightly.

### 5.2 States, triggers and priority

Higher priority wins while active. Times are real time (not slowed by hitstop).

| Priority | State | Tap trigger | Slice trigger | Hold | Look |
|---|---|---|---|---|---|
| 1 (top) | `dizzy` | `gameOver` | `gameOver` | until results | eyes spiral |
| 2 | `wince` | `crack` | `crack` (dark hit or fall) | 600 ms | eyes squeeze, mouth zig-zag, brows up |
| 3 | `delighted` | `choir` | `choir` | 1400 ms | happy eyes, mouth open 1, blush 1 |
| 4 | `happy` | `strike` N 4-6 | stroke reaches 3 cuts | 700 ms | happy eyes, mouth open .6, blush .6 |
| 5 | `relieved` | `mend` | | 600 ms | happy eyes, smile |
| 6 | `boop` | bell tapped | | 500 ms | happy eyes, mouth open .4, blush .8, wobble |
| 7 | `worried` | any alive crystal with `rho - HALO_R - r <= 2.0`; also `miss` (400 ms) | a normal crystal falling (`vy < 0`) with `y < 0.28` unsliced; also a fall without crack (400 ms) | while true, then 300 ms after it becomes false (exit when the gap > 2.4 in Tap) | brows up, mouth "o", pupils on that crystal |
| 8 | `smile` | `strike` N 1-3 | each cut | 400 ms (Slice 300 ms) | mouth curve 1, eyes normal |
| 9 | `idle` | default | default | | blink, pupils follow the nearest crystal (Tap: smallest rho; Slice: the lowest falling one), small smile |
| 10 | `sleepy` | title before the first gesture, first 300 ms of the intro | | | eyes closed (happy arcs flipped), breathing scale 1 ± .02 at .25 Hz; on first gesture: wake = blink + "o" mouth 400 ms |

Blink (idle, smile, worried): every `2500-5500 ms` (render `Math.random`), 140 ms (close 50, hold 40, open 50), 15% chance of a double blink 180 ms later.

Config: `FACE` in `src/render/fxConfig.ts` with every number above (`worriedGapU: 2.0, worriedExitGapU: 2.4, worriedExitMs: 300, sliceWorriedY: .28, blinkMinMs: 2500, blinkMaxMs: 5500, blinkMs: 140, doubleBlink: .15, ...`). Expression uniforms move with `Spring1D(f = 4, zeta = .6)`.

### 5.3 Reduced motion

Blinks stay. Pupils move with a 200 ms linear ease (no spring overshoot). Expression changes crossfade linearly over 120 ms. No boop wobble, no breathing scale. Colours and shapes are unchanged.

---

## 6. Slice mode rules

### 6.1 World and units (`src/sim/slice*.ts`, pure)

- Sim coordinates are in **H**: `y = 0` bottom of the play area, `y = 1` top, `x` from 0 to `W` where `W = aspect = width / height` of the play area, fixed at run start and clamped to [0.45, 2.4].
- If the window resizes during a run, the renderer and input fit the original `W x 1` rectangle inside the new viewport (contain, centred, letterbox in `void-0`). Sim numbers never change mid-run.
- Gravity, launch speeds and the blade all use H, so a phone and a tablet play the same.
- The bell sits at `(W/2, 0.09)` with visual radius 0.075 H. It is not a target and not an obstacle.

### 6.2 Toss physics

```ts
export const SLICE_TOSS = {
  spawnY: -0.08,                 // launch from below the bottom edge
  x0Frac: [0.12, 0.88],          // launch x as a fraction of W
  apexXFrac: [0.15, 0.85],       // apex x as a fraction of W
  maxVx: 0.30,                   // H/s
  gravity: { standard: 1.6, beginner: 1.35 },          // H/s^2
  apexY: { standard: [0.55, 0.88], beginner: [0.60, 0.80] },
  spin: [1.2, 3.5],              // rad/s, random sign
  radius: 0.058, hitRadius: 0.062,          // normal crystal, H
  darkRadius: 0.055, darkHitRadius: 0.040,  // dark crystal, H (harder to hit by accident)
  staggerMs: 110,                // stagger inside a wave with > 3 crystals
  fallY: -0.10,                  // a falling crystal below this is gone
  maxAlive: 14,
} as const;
```

Launch: pick `apexY` in the band, `x0` and `xApex` from their ranges (seeded). `vy0 = sqrt(2 g (apexY - spawnY))`, `tApex = vy0 / g`, `vx = clamp((xApex - x0) / tApex, -maxVx, maxVx)`. Each tick: `vy -= g dt; x += vx dt; y += vy dt; angle += spin dt`. Standard air time from launch to `fallY` is about 1.8-2.2 s; beginner about 2.1-2.5 s.

**Slower crystals** setting in Slice: the crystal motion and the wave timer advance by `dt × SLOW_SPEED_FACTOR (0.8)`. The blade is unchanged.

### 6.3 Crystal kinds in Slice

| Kind | Look | Slice it | Let it fall |
|---|---|---|---|
| Normal | Existing crystal meshes, 5 note colours and shapes. Faces toward camera, spinning around the view axis plus ±12° wobble. | Cut (6.5). | Miss (6.6). |
| Dark | New spiky "burr" silhouette `glyphShape(5)`: 8-point star, inner radius .55. Body `#1A1226`, glowing crack network `#FF3B5C` at HDR ×2 pulsing at 2 Hz, 3 dark smoke sparks trailing. Darker and spikier than every normal crystal, so it reads by value and shape (colour-blind safe). | **Dark hit**: 1 crack (unless in grace), the current chain resets, the blade stops cutting for this arm (state `cooling`, section 7). Dark shards, red ring, wince. Never an instant game over. | Nothing. It drops away. |

No other Slice kinds in this recovery (no golden, geode, prism, splitter, rusher, mend).

### 6.4 Waves

`profile = !daily && modes.slice.runs < 3 ? 'beginner' : 'standard'`. Level `L = floor(elapsedMs / 20000)`. Colour count `K`: 3 for L0-1, 4 for L2-3, 5 from L4. A seeded tone bag as in Tap.

**Beginner opening table** (then the ramp):

| Wave | Launch time | Count | Colours | Dark |
|---|---|---|---|---|
| 1 | 600 ms | 1 | 1 | 0 |
| 2 | +2200 | 2 | same | 0 |
| 3 | +2200 | 3 | same (volley) | 0 |
| 4 | +2200 | 2 | 2 colours | 0 |
| 5 | +2000 | 4 | same (staggered) | 0 |
| 6 | +2000 | 3 | 2 colours | 0 |
| 7 | +2000 | 5 | same: **Chord toss** | 0 |

**Standard opening:** waves 1-3 of the table above (1, 2 same, 3 same) at 600 ms, +1800, +1800, then the ramp.

**Ramp** (both profiles after their opening):

| Rule | Standard | Beginner |
|---|---|---|
| Gap to next wave | `max(0.85, 2.0 - 0.15 L)` s | `max(1.2, 2.2 - 0.12 L)` s |
| Count | `2 + rng.int(min(5, 1 + L))` (L0: 2, L4+: 2-6) | same, max 4 |
| Colours | one main colour from the bag; each crystal is the main colour with p = 0.7, otherwise the next bag tone | same |
| Chord toss | every 5th wave from L1: 5 of one colour, staggered left to right 90 ms apart, apexes on a gentle arch (centre highest by 0.06 H) so one sideways swipe catches all | from wave 12 on, every 6th wave |
| Dark crystals | from `elapsedMs >= 12000`; per wave chance `min(.45, .15 + .05 L)`; 1 per wave, 2 if L ≥ 6 and count ≥ 4; never in a Chord toss | from `elapsedMs >= 25000`; chance `min(.30, .10 + .05 L)`; max 1 |
| Cap | if alive + count > `maxAlive`, retry in 250 ms | same |

Volley (all at once) when count ≤ 3; otherwise staggered `staggerMs`.

### 6.5 Cutting, chains, combos, scoring

The sim receives cutting segments from the blade (section 7) every tick.

- A segment cuts a crystal when the distance from the crystal centre (this tick) to the segment is `<= hitRadius + bladeRadius` (a swept capsule). Segments in a tick are tested in order; within one segment, crystals are cut in order of their projection along the segment (first touched first).
- A crystal can be cut once. At most `SLICE_BLADE.maxCutsPerArm` (6) cuts per arm; later intersections in that arm are ignored.
- **Stroke** = pointerdown to pointerup. `strokeCuts` counts cuts in the stroke (across re-arms).
- **Chain**: if the cut crystal has the same note as the previous cut in this stroke, `chainStep += 1`, else `chainStep = 1`. A dark hit sets `chainStep = 0`.
- **Points per cut:** `SLICE_SCORE.perCut * min(chainStep, 10)` → same colour 10, 20, 30...; mixed colours 10 each.
- **Choir:** when `chainStep` reaches 5 (once per stroke): `+500`, and every other airborne normal crystal of that note shatters too (each `+10`, counted in `crystalsSliced`, shards but no halves, they burst whole). Emits `choir`. Signature moment (section 8.6).
- **Stroke combo:** when the stroke ends (lift or cancel) with `strokeCuts >= 3`: `+ SLICE_SCORE.comboEach * strokeCuts` (20 each), pop `{n} in one swipe!`.
- Shards earned: 1 per cut crystal, +1 per Choir-swept crystal, +10 per Choir.

```ts
export const SLICE_SCORE = { perCut: 10, chainCap: 10, choirChain: 5, choirFlat: 500, choirEach: 10, comboMin: 3, comboEach: 20 } as const;
```

Worked examples: 3 red in one swipe: 10 + 20 + 30 + combo 60 = 120. Red, yellow, red: 10 + 10 + 10 + 60 = 90. Chord toss of 5: 10+20+30+40+50 + 500 + combo 100 = 750.

### 6.6 Misses, cracks, game over

- A normal crystal that is falling (`vy < 0`) with `y < fallY` is a **fall**. It is removed and emits `fall`.
- A fall cracks the bell (1 crack) unless one of these holds:
  1. `elapsedMs < missGraceMs` (standard 6000, beginner 15000),
  2. `graceMs > 0` (1500 ms after any crack),
  3. this wave already caused a fall crack (at most 1 fall crack per wave).
- A dark hit cracks the bell unless `graceMs > 0`.
- `MAX_CRACKS = 3` → game over, same sequence as Tap (250 ms freeze, slow-mo, results at 1.4 s). The bell's face goes `dizzy`.
- No flare in Slice. No mend.

```ts
export const SLICE_RULES = { maxCracks: 3, crackGraceMs: 1500, missGraceMs: { standard: 6000, beginner: 15000 },
  darkFromMs: { standard: 12000, beginner: 25000 }, levelMs: 20000 } as const;
```

### 6.7 Slice sim API and types (`src/sim/sliceTypes.ts`)

```ts
export interface SliceCrystal { id: number; alive: boolean; kind: 'normal' | 'dark'; note: number;
  x: number; y: number; vx: number; vy: number; r: number; hitR: number; spin: number; angle: number; ageMs: number; wave: number }
export interface SliceStats { score: number; timeMs: number; biggestSwipe: number; longestChain: number; crystalsSliced: number;
  choirs: number; darkHits: number; falls: number; strokes: number; shards: number }
export interface BladeSegment { x0: number; y0: number; x1: number; y1: number; r: number; stroke: number; arm: number; speed: number }
export interface SliceInput { segments: readonly BladeSegment[]; strokeEnded: number | null /* stroke id */ }
export type SliceEvent =
  | { type: 'toss'; id: number; note: number; kind: 'normal' | 'dark' }
  | { type: 'cut'; id: number; x: number; y: number; vx: number; vy: number; angle: number; note: number;
      k: number /* cut index in stroke */; chainStep: number; points: number; dirX: number; dirY: number; speed: number }
  | { type: 'darkHit'; id: number; x: number; y: number; cracked: boolean }
  | { type: 'choir'; note: number; n: number; swept: { id: number; x: number; y: number; note: number }[]; points: number }
  | { type: 'strokeEnd'; cuts: number; bonus: number }
  | { type: 'fall'; id: number; x: number; note: number; cracked: boolean }
  | { type: 'crack'; cracks: number; cause: 'dark' | 'fall' }
  | { type: 'levelUp'; level: number; K: number }
  | { type: 'gameOver'; stats: SliceStats; hymn: number[] };
export class SliceSim { constructor(opts: { seed: number; daily: boolean; profile: 'beginner' | 'standard'; aspect: number; slow: boolean;
  test?: { waves: boolean; gravity: boolean; cracks: boolean } });
  readonly state: SliceState; step(input: SliceInput): readonly SliceEvent[]; forceGameOver(): void;
  placeTestCrystals(list: { x: number; y: number; note: number; kind?: 'normal' | 'dark' }[]): void }
```

Hymn line in Slice: each cut appends its note, a Choir appends 10, a crack appends 20 (existing emoji map).

---

## 7. Swipe input: the blade

### 7.1 Config (`src/sim/sliceConfig.ts`, exported as `SLICE_BLADE`)

```ts
export const SLICE_BLADE = {
  windowMs: 64,          // rolling window for speed
  minSpanMs: 32,         // speed denominator floor, stops spikes on the first samples
  armHps: 1.4,           // windowed speed to start cutting (H/s)
  disarmHps: 0.9,        // windowed speed below which cutting stops (hysteresis)
  maxArmMs: 350,         // cutting time per arm
  maxArmPathH: 1.5,      // cut path length per arm (H)
  maxCutsPerArm: 6,      // enforced by the sim
  rearmSlowMs: 100,      // must stay below disarmHps this long before it can arm again
  radius: { touch: 0.020, pen: 0.020, mouse: 0.012 },  // blade capsule radius (H)
  tapMaxPathH: 0.03,     // a stroke shorter than this is a tap (Slice: wobble + hint, never a cut)
  trailPoints: 32,       // render history
} as const;
```

### 7.2 Units and sampling

- Input converts every pointer sample to sim H units: `x = (clientX - areaLeft) / areaH`, `y = (areaBottom - clientY) / areaH`, where `area*` is the letterboxed play rectangle in CSS px (normally the full viewport, so `areaH = innerHeight`). Time `t = event.timeStamp` (ms).
- `pointerdown` on `#surface` (mouse: `button === 0`; touch and pen: any) **when no stroke is active** starts a stroke and calls `setPointerCapture`. While a stroke is active, other pointers are ignored (one blade).
- `pointermove` of the stroke's pointer: for each event in `e.getCoalescedEvents()` (if the method is missing or returns an empty list, use `[e]`), in order, call `blade.move(x, y, t)`. Samples with `t` lower than the previous sample are dropped. Samples with equal `t` are kept (they add path, not time).
- Mouse moves with no button pressed are ignored (no hover blade).
- `pointerup`, `pointercancel`, `lostpointercapture` end the stroke. `visibilitychange` hidden ends the stroke.
- `touch-action: none` on `#surface`.

### 7.3 Speed

At each sample time `t`, with window start `w = max(t - windowMs, strokeStartT)`:
`L` = length of the sample polyline from `w` (interpolated point on the segment that crosses `w`) to `t`;
`speed = L / max(t - w, minSpanMs) × 1000` in H/s. With one sample, speed is 0.

### 7.4 States and rules (`src/sim/blade.ts`, pure class `Blade`)

States: `up` (no stroke), `ready`, `armed`, `cooling`.

| From | Condition (checked after each sample) | To | Action |
|---|---|---|---|
| `up` | `begin()` | `ready` | new stroke id |
| `ready` | `speed >= armHps` | `armed` | new arm id; **back-fill**: the cut path starts at the window start `w` (so a fast swipe that starts on a crystal still cuts it); `armStart = w`; emit segments for the back-filled samples |
| `armed` | `speed < disarmHps` | `cooling` | `slowSince = t` |
| `armed` | `t - armStart >= maxArmMs` or `armPath >= maxArmPathH` | `cooling` | clip the last segment at the exact budget point; `slowSince = null` (**spent**: must slow down first) |
| `armed` | otherwise | `armed` | emit segment prev → current; `armPath += length` |
| `cooling` | `speed < disarmHps` | `cooling` | if `slowSince === null` then `slowSince = t`; if `t - slowSince >= rearmSlowMs` → `ready` |
| `cooling` | `speed >= disarmHps` | `cooling` | `slowSince = null` |
| any | `end()` | `up` | stroke ends, report `strokeEnded` |
| `armed` | sim reports a dark hit for this arm | `cooling` | `slowSince = null` |

**Re-arm rule (exact):** after any disarm the blade cuts again only if **(a)** the windowed speed stays below 0.9 H/s for at least 100 ms in a row and then rises to 1.4 H/s or more, or **(b)** the finger lifts and a new stroke starts. Re-arming always starts a fresh budget of 350 ms / 1.5 H / 6 cuts. A continuous fast wiggle never slows for 100 ms, so it gets exactly one budget.

Every sample is also recorded for rendering with a flag `cutting` (true while `armed`), so the renderer can draw the bright blade and the faint inert trail from the same history.

Tick hand-off: each sim tick the controller calls `blade.drain(segments)` and passes `{ segments, strokeEnded }` to `SliceSim.step`. During hitstop no tick runs; segments queue and resolve on the next tick.

A stroke whose total path is `< tapMaxPathH` and that ends within 250 ms is a **tap**: if it is within `hitRadius × 1.5` of a normal crystal, emit a render-only `poke` (crystal wobble ±10°, 200 ms; demo hint per section 14). It never cuts.

### 7.5 Blade tests (`tests/blade.test.ts`, `tests/slice.test.ts`)

Helpers generate samples every 8 ms (125 Hz, like coalesced touch) along a path at a set speed. "Test board": `SliceSim` with `test: { waves: false, gravity: false, cracks: false }` and `placeTestCrystals`.

| # | Case | Expect |
|---|---|---|
| 1 | Slow drag at 0.5 H/s, straight across a row of 3 crystals at y .5 | 0 cuts, blade never `armed`, no segments emitted |
| 2 | Fast swipe at 3 H/s across the same row | 3 cuts, chain steps 1, 2, 3 (same note), points 10 + 20 + 30 |
| 3 | Back-fill: swipe at 3 H/s that **starts** on top of a crystal | that crystal is cut |
| 4 | Speed exactly between (1.1 H/s, never reaching 1.4) | 0 cuts |
| 5 | Hysteresis: arm at 3 H/s, slow to 1.0 H/s (above 0.9) | still `armed`, keeps cutting until the budget |
| 6 | Time budget: one straight 3 H/s swipe for 600 ms over crystals placed every 0.15 H along the path | crystals with path distance ≤ 1.05 H (350 ms × 3 H/s) from the start are cut, none beyond 1.06 H |
| 7 | Path budget: straight 6 H/s swipe | cut stops at 1.5 H path; a crystal at 1.4 H cut, at 1.6 H not |
| 8 | Cut cap: 10 crystals packed along a 0.6 H path, 3 H/s | exactly 6 cut |
| 9 | **Continuous wiggle**: 5 s triangle-wave wiggle at constant 3 H/s, amplitude 0.8 H, over a 6 x 4 grid of 24 crystals filling the screen | **at most 6 cuts** in total; blade `cooling` from about 350 ms to the end |
| 10 | Sine wiggle: 5 s, amplitude 0.4 H, 2 Hz (mean speed 3.2 H/s), same grid | at most 6 cuts |
| 11 | **Re-acceleration**: 3 H/s for 200 ms (cuts), slow to 0.3 H/s for 250 ms, then 3 H/s over a fresh crystal | the fresh crystal is cut (second arm) |
| 12 | Too-short slow-down: same as 11 but slow phase 120 ms | the fresh crystal is not cut |
| 13 | **Lift and new stroke** after a spent budget (case 9 for 1 s, lift, new 3 H/s swipe over a crystal) | cut; `chainStep` restarts at 1; stroke combo of the first stroke reported on lift |
| 14 | Dark hit: fast swipe through dark then normal crystal | `darkHit` + `crack`, blade `cooling`, the normal crystal after it is not cut in that arm |
| 15 | Coalesced ordering: samples with a decreasing timestamp are dropped; equal timestamps add path but not time | speed matches the expected value within 1% |
| 16 | Tap: 10 ms stroke with 0.01 H path on a crystal | 0 cuts, a `poke` is reported |
| 17 | Units: the same physical swipe (in px) on 844 px and 667 px tall areas | speeds in H/s differ by the ratio of heights; thresholds compare H/s |
| 18 | Config: `SLICE_BLADE` values equal this table; `disarmHps < armHps` | |

Slice rules tests (`tests/slice.test.ts`): toss apex for 200 launches stays inside the profile band ±0.01 H and x stays in [0, W]; beginner waves 1-7 match the table (time ±1 tick, count, colours); no dark crystal before 25000 ms (beginner) / 12000 ms (standard) for 20 seeds; a fall during miss grace does not crack; 4 falls in one wave make at most 1 crack; a fall within 1500 ms of a crack does not crack; 3 cracks → `gameOver` once; chain of 5 → `choir` with +500 and sweeps same-note airborne crystals; stroke of 3 cuts → `strokeEnd` bonus 60; same seed + same input → same events (determinism); `src/sim` never references `window`, `document`, `Date`, `performance`, `Math.random` (existing source test extended to the new files).

---

## 8. Slice visuals and feel

All numbers live in `SLICE_FX` in `src/render/fxConfig.ts`.

### 8.1 Camera and world

`fitSliceCamera(camera, aspect)`: tilt 0, FOV 30, looking down -z at the plane z = 0, distance `5 / tan(15°)` = 18.66 so the plane shows exactly 10 world units of height. World = sim × 10 centred: `wx = (x - W/2) × 10`, `wy = (y - .5) × 10`. Crystals are drawn at z = 0 with instance scale `r × 10`. The floor rings and the halo are hidden in Slice. The background (section 9) stays; its rose centre `uBell` = (.5, .58), rose radius .30 of height, rose light × .8.

### 8.2 Blade ribbon (`src/render/blade.ts`, shader `shaders/blade.ts`)

- One `Mesh` with a `BufferGeometry` of `trailPoints × 2 = 64` vertices (triangle strip as indexed triangles, 186 indices), `DynamicDrawUsage`, updated in place each frame. One draw call, additive, depthTest off, `renderOrder` 20.
- Points: the last 32 blade samples younger than their life. Cutting samples live **120 ms**; inert samples live **200 ms**.
- Width (CSS px, then converted to world): cutting `w = clamp(6 + 6 × (speed - 1.4), 6, 22)` px at the head; along the trail `w × (1 - age / life)^1.5`, so it tapers to 0 at the tail. Inert: 2 px constant, fading.
- Colour: cutting core `#FFFFFF` at HDR 2.5 (bloom picks it up), edge `#FFE2A8` (warm), cross-section falloff `exp(-4 d²)`. While `chainStep >= 2`, the edge takes that note's colour. Inert: `#A59FC9` at alpha .35, HDR 0.8 (no bloom).
- Alpha `(1 - age / life)²`.
- Reduced motion: unchanged (it is direct feedback), width capped at 14 px.

### 8.3 Split halves

Halves reuse the 5 crystal `InstancedMesh`es (no new draw calls). New per-instance attribute `aCut` (vec4: cut-plane normal xyz in the crystal's local space, `side` ±1; `side = 0` means a whole crystal). Crystal fragment shader: `if (aCut.w != 0. && dot(vLocalPos, aCut.xyz) * aCut.w < 0.) discard;`. Back faces (the inside, visible through the cut) are shaded with `aCore × 1.6`, so the cut face glows.

On `cut`:
1. Cut line direction `d = (dirX, dirY)` from the event; world plane normal `n = (-d.y, d.x, 0)`. Convert `n` into the crystal's local space using the inverse of its rotation at that moment and store it in `aCut` for both halves (`side` +1 and -1).
2. Each half starts at the crystal's position with the crystal's velocity ×10 (world), plus an impulse `side × n × 4.5 u/s`, plus `d × 3.0 × min(speed, 3) / 3` u/s.
3. Spin: half +1 at `+(4..8)` rad/s, half -1 at `-(4..8)` rad/s around the view axis, plus the existing wobble.
4. Gravity: `1.2 × g × 10` u/s² (halves fall a little faster than whole crystals).
5. Life 900 ms; alpha fades over the last 250 ms; scale 1 → .85.
6. Pool: **48 halves** (24 cut crystals). When full, recycle the oldest pair.

### 8.4 Shards, glow

- `shards.burst(x, y, note, count)` with count per cut **12 / 8 / 5** (High / Medium / Low), directions biased along `d` (±50°) instead of away from the bell; speed and size as `SHATTER`. Choir-swept crystals burst whole with the normal Tap count.
- In Slice, shards still harvest into the bell (at the bottom) after `SHARD_HARVEST_DELAY`.
- Glow flash at the cut point: `glow.disc` radius `1.4 × crystal radius`, note colour, alpha .8 → 0 over 160 ms.
- Dark hit: 10 rock-style shards (`#1A1226`) + 12 sparks in `#FF3B5C`, crack ring (existing `rings.launch("crack")` centred on the hit), screen shake trauma .5.

### 8.5 Hitstop

`sliceHitstopMs(k) = min(120, 18 + 14 × (k - 1))` where `k` is the cut index in the stroke (1 → 18, 2 → 32, 4 → 60, 8 → 116, 9+ → 120). Stacked Slice freezes are capped at **160 ms per 500 ms window**. Reduced motion caps each at 40 ms. Dark hit: 100 ms. The blade ribbon keeps drawing during freezes (it uses real time).

### 8.6 Choir in Slice

The existing Choir signature (flash, three rings, `CHOIR!`, bloom, shake) at the cut point, freeze **120 ms** (not 160), then `slowmo(.35, 300, 200)` (off in reduced motion). Face `delighted`.

### 8.7 Haptics (`src/haptics/haptics.ts` additions)

| Id | Pattern (ms) | Prio | When |
|---|---|---|---|
| `slice1` | `[8]` | 4 | cut with k = 1 |
| `slice2` | `[10]` | 4 | k = 2 |
| `slice3` | `[12]` | 4 | k = 3 |
| `slice4` | `[14]` | 4 | k ≥ 4 |
| `combo` | `[10, 40, 14]` | 6 | stroke end with ≥ 3 cuts |
| `crack` | `[26]` | 7 | dark hit, fall crack (existing) |
| `choir` | `[22, 60, 18]` | 8 | existing |

When the cut extends a same-colour chain (`chainStep >= 2`), add +2 ms to the pulse (generalise `play(id, close)` to `play(id, extraMs = 0)`; Tap's former close bump is removed). Rules from ART-HAPTICS-SPEC §4 stay (no pulse over 30 ms, 50 ms same-id throttle, priority gate, iOS no-op).

### 8.8 Audio (`src/audio/audio.ts` additions)

| Event | Sound |
|---|---|
| Arm (blade starts cutting) | white-noise "whoosh": bandpass 2.5 kHz Q 1.2, 90 ms, gain `.05 + .02 × min(speed, 4)` |
| `cut` | bell tone at scale degree `min(9, k - 1)` of the current scale (degree 5 = degree 0 + 12 semitones), gain .5, decayMul .7; plus `glass-light` at gain .8, rate `1 + .03 × (k - 1)`. If `chainStep >= 2`: an extra tone one octave up on the same degree, gain .25. So every swipe is a rising run. |
| `strokeEnd` (≥ 3) | `ui-glass` sample |
| `choir` | existing `playChoir(note)` + duck |
| `darkHit` | `bell-heavy` rate .5 gain 1, `glass-heavy` rate .7, plus degree 0 at octave -2, gain .6, decayMul .6 ("bonk") |
| `fall` (no crack) | `ui-back` at gain .3 |
| `crack` | existing `playCrack` |
| Inert trail | silent |

---

## 9. The living background

Changes to `src/render/fxConfig.ts` (`BOARD` is replaced), `src/render/shaders/background.ts`, `src/render/background.ts`, plus a new `src/render/motes.ts`.

### 9.1 Palette and numbers

```ts
export const BOARD = {
  skyTop: 0x1e1446, skyBottom: 0x0b2a38,          // deep indigo-violet to deep teal (vertical gradient)
  glassDark: 0x1c2250, glassLight: 0x2c3a78,      // rose petals: one indigo family, value steps only
  lead: 0x0a0716,
  ringL: [.36, .33, .30, .26], petalJitter: .035,
  shaftWarm: 0xffc89a, shaftCool: 0x9fe3ff,       // light shafts lerp warm <-> cool over 30 s
  shaftCount: 4, shaftGain: .10, shaftSweepDeg: 6, shaftPeriodS: 18, shaftBreath: [.6, 1.0], shaftBreathPeriodS: 11,
  boardSat: .60, satMax: .55,                     // was .25 / .12
  breathPeriodS: 7, breathAmt: .08,               // value breathing
  hueDriftDeg: 12, hueDriftPeriodS: 24,           // hue rotation of the whole board (YIQ rotation)
  yMaxArena: 48, yMaxShaft: 72, hubYMax: 50, crystalYMin: 120, crystalOverBoard: 2.5,
  moteColor: 0xffe6c4, moteCount: { high: 48, medium: 32, low: 16 }, moteSizePx: [2, 5], moteAlpha: .35,
  moteRiseHps: [.008, .025], moteSwayPx: 6, moteSwayPeriodS: 5, moteFadeS: 2.5,
  bakeScale: .5, leadSoftness: 3,
} as const;
```

### 9.2 What changes

1. **Colour back, in one family.** The bake gradient uses `skyTop → skyBottom`; the rose petals use `glassDark → glassLight` by ring value (`ringL`) only, never per-note hues. `uBoardSat` = `boardSat` (.60). The idle-board saturation limit becomes `satMax` .55.
2. **Light shafts animated.** 4 warm shafts from the top-left at -12°, each sweeping ±6° with an 18 s period (phase offset per shaft `i × 4.5 s`), intensity breathing between .6 and 1.0 of `shaftGain` (11 s period), colour lerping `shaftWarm ↔ shaftCool` over 30 s. Shafts are masked out of the rose annulus (they pass behind it).
3. **Drifting motes** (`motes.ts`): one `Points` draw call, additive, sizes 2-5 px (DPR-scaled), warm white `moteColor`, alpha ≤ .35 with a gaussian soft edge, rising at .008-.025 H/s with a 6 px sway (5 s period), fading in and out over 2.5 s, respawning at the bottom. Never note-coloured. Count by tier.
4. **Colour breathing.** Whole-board value × `1 ± .08` (7 s period, already `rosePeriod`), and a hue rotation of ±12° (24 s period) applied before the saturation step.
5. **Blur.** The board bake renders at `bakeScale` .5 and is upsampled bilinearly (a soft, out-of-focus look). Rose lead lines use 3× the current `fwidth` smoothing. Motes have soft edges. Result: nothing on the board has a hard edge. Crystals keep hard faceted edges and rims, so they are the only crisp objects.
6. **Bigger hits again.** Board tint peaks on strike / cut: N 1 → .18, 2-3 → .26, 4-6 → .34, Choir → .45; decays 260 / 300 / 360 / 500 ms. `SHATTER.flashOpacity` → `[.12, .18, .24, .32]`, `flashLife` .28. Flash interval stays ≤ 3 per second. Slice cuts use the N 1 row per cut, the N 4-6 row for a stroke combo.

### 9.3 Why this does not bring back the colour clash

| Separator | Board | Crystals |
|---|---|---|
| Value | Y ≤ 48 anywhere inside the arena (Tap rho ≤ 10, Slice whole play area except shafts); shafts ≤ 72; motes ≤ 90 but each ≤ 5 px | core Y ≥ 120 and ≥ 2.5 × local board Y |
| Hue | one deep indigo-teal family, sat ≤ .55, never a set of note hues; tint only for 0.2-0.5 s after an event and for the whole annulus at once | five fully saturated note hues |
| Sharpness | half-resolution, soft lead lines, soft motes | hard facets, white rim, bloom |
| Motion | slow and large: ≤ .025 H/s drift, ±6° sweeps over 18 s, 7-24 s breathing; motes rise and sway, never spin | Tap: inward drift with spin 0.6-1.2 rad/s and bob; Slice: arcs with spin 1.2-3.5 rad/s |
| Size | motes ≤ 1/8 of a crystal's diameter | |

Acceptance (lead, stills and video at 780 x 1688): no 30° hue bin holds more than 5% of arena pixels with S > .55 at idle; arena board Y ≤ 48; each crystal core ≥ 2.5 × the board Y around it; 300 ms after a yellow strike the yellow bin is back under 5%.

---

## 10. Save schema v2 (`src/meta/save.ts`)

```ts
export type ModeId = 'tap' | 'slice';
export interface ModeBests { score: number; biggest: number; longestChain: number; longestTimeMs: number }
export interface ModeSave {
  runs: number; demoDone: boolean; bests: ModeBests;
  daily: Record<string, { best: number; plays: number }>;   // newest 60 dates kept
  crystals: number; choirs: number;
}
export interface SaveV2 {
  v: 2;
  settings: { sfx: number; music: number; vibration: boolean; reduceMotion: boolean | null; slowDial: boolean; shake: number; tips: boolean };
  progress: { lifetimeShards: number; lifetimeChoirs: number; lifetimeCrystals: number; runs: number; daysPlayed: number;
              lastPlayedDate: string | null; introDone: boolean; lastMode: ModeId; seenTips: string[]; seenKinds: string[] };
  modes: Record<ModeId, ModeSave>;
  missions: { date: string | null; ids: string[]; progress: Record<string, number>; done: string[]; bonusGiven: boolean; modesToday: ModeId[] };
  unlocks: { skins: string[]; scales: ScaleId[]; titles: string[] };
  equipped: { skin: string; scale: ScaleId; title: string };
}
```

Meaning of `ModeBests`: Tap `biggest` = most at once (biggestN), `longestChain` = longest streak. Slice `biggest` = most in one swipe, `longestChain` = longest same-colour chain.

Defaults: as v1, plus `introDone: false`, `lastMode: 'tap'`, both modes `{ runs: 0, demoDone: false, bests: all 0, daily: {}, crystals: 0, choirs: 0 }`, `missions.modesToday: []`.

**Migration** (`migrate(value)`):
- `value.v === 2` → validate field by field with defaults (same repair style as today).
- Anything else that parses as an object is treated as **v1**:
  - `settings`, `unlocks`, `equipped`, lifetime counters, `daysPlayed`, `lastPlayedDate`, `seenTips`, `seenKinds` copy over.
  - `progress.runs` = v1 `runs`. `progress.introDone` = `v1.runs > 0 || v1.tutorialDone`. `lastMode = 'tap'`.
  - `modes.tap.bests = { score: v1.bests.score, biggest: v1.bests.biggestN, longestChain: v1.bests.longestStreak, longestTimeMs: v1.bests.longestTimeMs }`; `modes.tap.daily = v1.daily`; `modes.tap.runs = v1.progress.runs`; `modes.tap.demoDone = v1.tutorialDone`; `modes.tap.crystals = v1.lifetimeCrystals`; `modes.tap.choirs = v1.lifetimeChoirs`.
  - `modes.slice` = defaults.
  - `missions` = defaults (`date: null`), because the mission deck changed (section 11). Nothing earned is lost: shards, unlocks and bests stay.
- Before the first v2 write over a v1 save, copy the raw v1 text to `shatterhymn:save:v1` once (never overwritten).
- Corrupt JSON: unchanged (copy to `:corrupt`, defaults).
- Same key `shatterhymn:save`.

`runEnd.applyRunResult(save, r, todayISO)` takes `RunResult { mode: ModeId; daily: boolean; seed: number; stats: MetaStats; hymn: number[]; slowDial: boolean }` with

```ts
export interface MetaStats { score: number; timeMs: number; biggest: number; longestChain: number; crystals: number;
  choirs: number; shards: number; maxMult: number; darkHits: number }
```

Each mode maps its own stats into `MetaStats` (`tapMetaStats(RunStats)`, `sliceMetaStats(SliceStats)`; Slice `maxMult` = 1). It updates `modes[mode].bests` / `runs` / `daily` (if daily) / `crystals` / `choirs`, `progress.runs++`, `progress.lastMode = mode`, shared lifetime counters, missions (`modesToday` gains the mode), unlocks. `RunOutcome.prevBest` and `newBest` are per mode. `RunOutcome` gains `mode: ModeId`.

Daily seeds: Tap `hash32('shatterhymn-daily-' + iso)` (unchanged, so v1 daily bests still match), Slice `hash32('shatterhymn-slice-daily-' + iso)`. `dailyNumber` unchanged.

**Tests** (`tests/save.test.ts`, `tests/runEnd.test.ts`):
1. Empty storage → v2 defaults, `introDone` false.
2. A full v1 save (the layout-check fixture) → `v: 2`, `modes.tap.bests.score` 18420, `biggest` 9, `longestChain` 14, `modes.tap.runs` 12, `demoDone` true, `introDone` true, `modes.slice` all zero, shards 420 and unlocks kept, `missions.date` null.
3. v1 with `runs: 0, tutorialDone: false` → `introDone` false.
4. v1 daily map moves to `modes.tap.daily`; `modes.slice.daily` is `{}`.
5. `shatterhymn:save:v1` is written once with the raw v1 text and not overwritten by a later load.
6. A v2 round trip is identical; a v2 with a wrong-typed `modes.slice.bests.score` is repaired to 0 without touching Tap.
7. Each mode's `daily` is trimmed to the newest 60 dates on write.
8. `applyRunResult` for a Slice run raises only `modes.slice.bests`; `newBest` compares against the Slice best; a Tap Daily updates only `modes.tap.daily[iso]`.
9. Shards from both modes add to the same `lifetimeShards`.

---

## 11. Missions (shared, one list per day)

Missions are shared by both modes. Three per day, chosen by `Rng(hash32('shatterhymn-missions-' + iso))`: shuffle the deck, take the first `any` mission, then the next two of any type. Rewards unchanged (40 each, +100 for all three).

| id | Text (exact) | Mode | Type | Target |
|---|---|---|---|---|
| m_any_150 | `Break 150 crystals today` | any | crystals (sum) | 150 |
| m_any_s3k | `Score 3,000 in one game` | any | score (best) | 3000 |
| m_any_t60 | `Keep the bell safe for 1 minute` | any | timeMs (best) | 60000 |
| m_any_both | `Play both Tap and Slice today` | any | modesToday count | 2 |
| m_any_daily | `Play a Daily game` | any | daily count | 1 |
| m_tap_n6 | `In Tap, smash 6 crystals at once` | tap | biggest (best) | 6 |
| m_tap_choir | `In Tap, get a Choir: 7 at once` | tap | choirs (sum) | 1 |
| m_tap_x4 | `In Tap, reach a ×4 bonus` | tap | maxMult (best) | 4 |
| m_tap_s10k | `In Tap, score 10,000 in one game` | tap | score (best) | 10000 |
| m_slice_4 | `In Slice, cut 4 crystals in one swipe` | slice | biggest (best) | 4 |
| m_slice_ch3 | `In Slice, cut 3 of one colour in one swipe` | slice | longestChain (best) | 3 |
| m_slice_100 | `In Slice, slice 100 crystals today` | slice | crystals (sum) | 100 |

A mission with a mode only counts runs of that mode. Tests: stable pick per date, 3 distinct, at least one `any`; a Slice run never advances a `tap` mission; `m_any_both` completes after one run of each mode on the same date.

---

## 12. Results screen per mode

`resultsModel(outcome, stats: MetaStats, mode: ModeId, daily: boolean, dailyNo: number)` returns exact strings:

| Field | Tap | Slice |
|---|---|---|
| `modeLabel` (chip above the title, class `result-mode`) | `Tap` or `Tap · Daily #12` | `Slice` or `Slice · Daily #12` |
| `title` | `Oops! The bell broke.` | same |
| `score` | `18,420` (count-up as now) | same |
| `best` | `New best!` (gold) or `Your Tap best: 12,400` | `New best!` or `Your Slice best: 3,100` |
| `pbGap` | `1,200 points from your best.` (unchanged rule) | same |
| `stats` | `Time 2:14`, `Most at once 9`, `Longest streak 14`, `Crystals smashed 182`, `Choirs 2` | `Time 1:02`, `Most in one swipe 6`, `Longest colour chain 4`, `Crystals sliced 120`, `Choirs 1` |
| `shards`, `next` | unchanged | unchanged |
| Primary | `Play again` (same mode; a Daily replays that mode's Daily), class `primary`, focused, Space/Enter | same |
| Secondary row | `Try Slice` (normal Slice run), `Share`, `Menu` | `Try Tap`, `Share`, `Menu` |

The results panel gets `data-mode="tap|slice"`. Order and layout as design.md §18.5; the footer holds Play again plus a secondary row of three buttons.

**Share text** (replaces design.md §12 template; no em dash):

```
Shatterhymn Tap: 18,420                 (daily: "Shatterhymn Tap · Daily #12: 18,420")
🟥🟥🟨🟦✨🟩🟪
Most at once: 9 · Streak: 14 · 2:14     (Slice: "Most in one swipe: 6 · Chain: 4 · 1:02")
Slower crystals · Play: {url}           ("Slower crystals · " only when on)
```

URL: Tap normal `?seed=XXXXXXXX&mode=tap`, Slice normal `?seed=XXXXXXXX&mode=slice`, daily `?daily=1&mode=tap|slice`. Opening such a link highlights that card (3.2); `?seed=` applies to the next run of the highlighted mode. Share card: add the mode name under the score (Inter 800, 44 px, `#F4F1FF`).

---

## 13. HUD per mode and layout constraints

| | Tap (`#hud[data-mode="tap"]`) | Slice (`#hud[data-mode="slice"]`) |
|---|---|---|
| Top-left | `.hearts`: 3 small bells, 28 px | same |
| Top centre | `.score`, `.best` (60% size), `.mult` chip `×3` + `.pips` | `.score`, `.best`, `.combo` chip (replaces `.mult`, see below) |
| Top-right | `.pause-button` 44 x 44 min, `aria-label="Pause"` | same |
| `.banner` (tips) and `.demo-line` | at 22% of height, max width 90%, Inter 800 `clamp(18px, 5vw, 26px)`, plate `rgba(5,4,12,.72)` radius 12 px | same, at 20% |
| Everything else | nothing; no pad, no hint line | nothing |

Slice `.combo`: shows `×{chainStep}` with a dot in the chain's note colour while the current stroke has `chainStep >= 2`, and for 600 ms after; `aria-hidden="true"`; scale pop 1.25 → 1 spring on each step.

Constraints (checked by layout-check): all HUD elements sit inside a top band of height `max(64px, 9dvh) + safe-top` (portrait) or `56px + safe-top` (landscape); nothing overlaps; nothing leaves the viewport; the bottom 35% of the screen (Tap) and the whole play area below the top band (Slice) contain no UI elements. Pop texts (`+20`, `3 in one swipe!`, `CHOIR!`) are skipped by the audit as now and must stay below the top band.

---

## 14. Tutorial: show, don't tell

The six-step text tutorial and its cards are deleted. Teaching is a ghost hand plus at most one line of 6 words or fewer.

### 14.1 Rules

- One line at a time, ≤ 6 words, 16 px minimum (`clamp(18px, 5vw, 26px)`), class `.demo-line`, `aria-live="polite"`.
- The hand is decorative (`.demo-hand`, `aria-hidden`, `pointer-events: none`), 64 px, white at 85% opacity with a soft shadow.
- Shown in a run when `modes[mode].demoDone === false`, or when started from Settings `How to play Tap` / `How to play Slice`. `demoDone = true` is saved after the first successful strike (Tap) or cut (Slice).
- Reduced motion: the hand appears and fades (no travel), the tap ripple is a static ring, the swipe shows the ribbon without hand travel.

### 14.2 Hand icon (`src/ui/icons.ts`, `handIcon`)

SVG 24 x 24, stroke white 1.8, round caps and joins, fill `rgba(255,255,255,.18)`:
`M9 11V4.5a1.5 1.5 0 0 1 3 0V10m0-1.5a1.5 1.5 0 0 1 3 0V11m0-1a1.5 1.5 0 0 1 3 0v4.5c0 3.6-2.7 6.5-6.2 6.5h-.6c-2 0-3.5-.9-4.6-2.4L4.4 15a1.6 1.6 0 0 1 2.4-2l2.2 2`

### 14.3 Script

| Mode | Trigger | Hand | Line (exact) | Ends when |
|---|---|---|---|---|
| Intro | 600 ms | taps the lowest Crown crystal: press scale 1 → .85 → 1 over 500 ms, a white ripple ring (0 → 40 px, 400 ms), loop every 1100 ms | `Tap a crystal!` | first touch or auto-tap |
| Tap | 600 ms into a demo run | same, on the lowest Crown crystal | `Tap a crystal!` | first `strike` |
| Slice | 800 ms into a demo run | swipes from 0.15 H below-left to 0.15 H above-right of the first crystal's predicted position 600 ms ahead, 300 ms per stroke, drawing a real blade ribbon (cosmetic, never cuts), repeat every 1400 ms | `Swipe fast to slice!` | first `cut` |
| Slice | a tap (`poke`) on a crystal before the first cut | replay the swipe at once | `Swipe across it!` | first cut |
| Slice | 2 slow strokes crossing a crystal without arming, before the first cut | replay the swipe | `Swipe faster!` | first cut |
| Slice | first dark crystal ever tossed (`seenTips` id `dark`) | none; the bell looks worried at it | `Don't hit dark ones!` (2500 ms) | timer |
| Slice | first fall that cracks (`seenTips` id `fall`) | none | `Catch them before they fall!` (2500 ms) | timer |

The two Slice one-time lines respect the Show tips setting. Cracks in Tap are taught by the face (worried, then wince) and the `crack` tip.

---

## 15. Settings changes (exact labels)

- `How to play` is replaced by two buttons: `How to play Tap` and `How to play Slice`. Each starts a normal run of that mode with the demo forced on. (layout-check clicks the first button containing `How to play`.)
- `Slower crystals` stays (key `slowDial`); its hint becomes `Crystals move 20% slower in both games. Shown on your share card.`
- Everything else unchanged.

---

## 16. Credits

Add to `CREDITS.md`, directly after the `## Game` section (so the in-game Credits panel, which renders `CREDITS.md`, shows it near the top):

```
## Slice mode inspiration
Slice mode is inspired by Fruit Ninja by Halfbrick Studios.
Shatterhymn is a separate fan-made game. It is not made by, endorsed by, sponsored by or affiliated with Halfbrick Studios.
It uses no Fruit Ninja code, art, sound or names in play. Fruit Ninja and Halfbrick are trademarks of their owner.
```

In `## Inspirations` add: `- *Fruit Ninja* (Halfbrick Studios): the swipe-to-slice verb of Slice mode. No affiliation.` and `- *Juice It or Lose It* (Jonasson and Purho): a face on the thing you care about.`

The README gets the same no-affiliation sentence (section R4 in milestones).

---

## 17. Performance budget

| Item | Budget |
|---|---|
| Frame rate | 60 fps target on a mid phone (Pixel 7 class); auto-tier unchanged (style guide §4.3) |
| Draw calls | ≤ 20 in either mode (old budget 16 + face 1 + motes 1 + blade 1; halves add none) |
| Triangles | ≤ 120k |
| Slice crystals alive | ≤ 14 (+ the test board's 24 in QA only) |
| Halves alive | ≤ 48 (pooled) |
| Shards per Slice cut | 12 / 8 / 5 by tier; shard pools unchanged (1600 / 1000 / 600) |
| Blade | 64 vertices, updated in place |
| Motes | 48 / 32 / 16 |
| Allocation | none per frame in sim, blade, render hot paths (preallocated arrays, scratch vectors) |
| Bundle (gzip) | main JS ≤ 225 KB (today 203 KB), CSS ≤ 10 KB |
| Bundle (raw) | main JS ≤ 860 KB (today 776 KB) |
| Dependencies | no new runtime dependencies |

A `scripts/bundle-check.mjs` (Node only, no browser) reads `dist/assets/*.js` and `*.css`, gzips them with `node:zlib`, prints sizes and exits 1 over budget. It runs at the end of `npm run check` (milestone R4).

---

## 18. Architecture notes for this spec

See `docs/architecture.md` §20 "Two modes" for modules, files and the controller split.

---

## 19. QA hooks

Everything here exists only when the URL has `qa=1`. No visible UI. Used by the lead's Playwright runs and `scripts/layout-check.mjs`.

### 19.1 URL flags (with `qa=1`)

| Flag | Effect |
|---|---|
| `mode=tap` / `mode=slice` | skip intro and title; start a normal run of that mode at once |
| `mode=...&daily=1` | start that mode's Daily |
| `intro=0` | skip the intro even on a fresh save (default when `mode` is set) |
| `intro=hold` | play the intro but freeze it at 1200 ms (hand and line visible), for capture |
| `demo=1` | force the demo hand in the started run |
| `waves=0` | Slice: no waves (empty board) |

### 19.2 `window.__shatterhymnQA`

It stays callable (`__shatterhymnQA()` returns the state object, as today) and gains methods:

| Method | Returns / does |
|---|---|
| `__shatterhymnQA()` / `.state()` | `{ screen, mode, daily, score, cracks, over, mult, streak, chainStep, strokeCuts, stats, crystals: QACrystal[], blade: { state, speedHps, armed } }` |
| `.crystals()` | `QACrystal[] = { id, note, kind, sx, sy, rPx, hitRPx }` in CSS px client coordinates (Tap via `renderer.project`, Slice via the play-area mapping) |
| `.start(mode, { daily?, demo? })` | starts a run of that mode from any screen |
| `.skipIntro()` | jumps from the intro to the title |
| `.forceGameOver()` | calls `sim.forceGameOver()`; the normal game-over path runs (results mount 1.4 s later) |
| `.tapCrystal(id)` | runs the real Tap handler at that crystal's `sx, sy` |
| `.swipe(points: {x, y}[], durationMs)` | injects a stroke through `Input.injectStroke` with samples spread evenly over `durationMs`, starting at `performance.now()`; resolves 2 ticks after the end with `{ cuts, armed, maxSpeedHps }` |
| `.sliceTestBoard(list?)` | Slice only: clears the board, stops waves and gravity, disables cracks, places crystals (default: three note-0 crystals at (0.3 W, .5), (0.5 W, .5), (0.7 W, .5)); returns their `QACrystal[]` |
| `.blade()` | `{ state, speedHps, strokeCuts }` |
| `.screen()` | current screen id |

### 19.3 DOM hooks

`body[data-screen]` = `intro | title | run | pause | results | settings | missions | collection | credits`; `body[data-mode]` = `tap | slice` during runs and results; `.mode-card[data-mode]`, `.mode-play[data-mode]`, `.chip.daily[data-mode]`, `#hud[data-mode]`, `.results[data-mode]`. `.demo-hand` and `.blade` are decorative and skipped by the audit.

### 19.4 Lead's end-to-end check for "slow drag cuts nothing"

1. Open `?qa=1&mode=slice&waves=0`; call `sliceTestBoard()`.
2. With `page.mouse`, press at the left of the row and move across it at 0.5 H/s (steps every 16 ms), release. Expect `state().stats.crystalsSliced === 0` and 3 crystals alive.
3. Repeat at 3 H/s. Expect 3 cut.
4. Repeat 2 and 3 with touch through CDP `Input.dispatchTouchEvent`, and once with `swipe()`. Same results.
5. Start a 5 s continuous wiggle across `sliceTestBoard` with 24 crystals: at most 6 cut.

### 19.5 layout-check extensions

New screens (each × the existing 48 layouts):

| Screen id | How it opens |
|---|---|
| `title` | as now; now the mode-select title |
| `slice` | `?qa=1&mode=slice` with the fixture save, wait 2500 ms |
| `sliceresults` | `?qa=1&mode=slice`, `forceGameOver()`, wait for `Play again` + 3000 ms |
| `intro` | fresh save (no `shatterhymn:save` key), `?qa=1&intro=hold`, wait 1500 ms |
| `results` | Tap card `.play-hero`, then `forceGameOver()` after 1000 ms (faster than waiting) |

Totals: 12 screens × 48 = **576** layouts must be clean (the original 432 plus 144). Add `.demo-hand, .demo-hand *, .blade, .combo` to `SKIP` only if they are decorative (`.combo` is aria-hidden and decorative); keep `.demo-line` audited.

---

## 20. Removed or deferred

**Removed:** colour pad and all its CSS and tests; empty-strike penalty (dud, lockout, grey pad, "combo lost", dud tip, dud haptic); the text tutorial and `tutorial` sim mode; the title tagline; the single Play button; the N-squared chord score; close-call points and the `Close!` pop; `?fever=1`; the first-run pad hint; the old mission deck; the word "Hymn" in "Daily Hymn".

**Kept but never on the first screen** (hidden until 3 total runs): Daily chips, Missions, Collection. Skins, scales, titles, share card and PWA are unchanged.

**Deferred (not in R1-R4):** special kinds in Slice (golden, prism...), a Slice-specific music layer, per-mode skins, multi-finger blades, any online feature. Do not build them.

---

## 21. Player-facing strings (copy test table)

`tests/copy.test.ts` imports these tables and checks: no `TODO`, `TBD`, `lorem`, double spaces, the em dash character U+2014 in the strings of this table; each ≤ 80 characters; demo lines ≤ 6 words; the words `hold`, `let go`, `dial`, `colour button`, `combo lost` appear nowhere under `src/` or in `README.md` (allowlist identifier `slowDial`).

| Where | Strings |
|---|---|
| Intro / demo | `Tap a crystal!`, `Swipe fast to slice!`, `Swipe across it!`, `Swipe faster!`, `Don't hit dark ones!`, `Catch them before they fall!` |
| Title | `SHATTERHYMN`, `Pick a game!`, `Tap`, `Slice`, `Tap crystals to smash them`, `Swipe fast to slice crystals`, `Best {n}`, `Not played yet`, `Daily #{n}`, `Missions`, `Collection`, `Settings` |
| Pops | `+{n}`, `×{k}`, `{n} in one swipe!`, `CHOIR!`, `{n} at once` |
| Results | `Tap`, `Slice`, `{Mode} · Daily #{n}`, `Oops! The bell broke.`, `New best!`, `Your Tap best: {n}`, `Your Slice best: {n}`, `{n} points from your best.`, `Most at once {n}`, `Longest streak {n}`, `Crystals smashed {n}`, `Choirs {n}`, `Most in one swipe {n}`, `Longest colour chain {n}`, `Crystals sliced {n}`, `Time {m:ss}`, `Play again`, `Try Slice`, `Try Tap`, `Share`, `Menu` |
| Settings | `How to play Tap`, `How to play Slice`, `Crystals move 20% slower in both games. Shown on your share card.` |
| Tips | section 4.7 |
| Missions | section 11 |

---

## 22. Amendments from the first-10-seconds review (research/review-10s.md), approved by the lead

These override the numbers earlier in this file.

1. Blade (section 7): beginner runs (Slice runs 0-2) use `armHps` 1.2, `disarmHps` 0.8, `rearmSlowMs` 80; later runs keep 1.4 / 0.9 / 100. Per-arm limits unchanged (350 ms, 1.5 H, 6 cuts). Re-arm on direction reversal is REJECTED: it would let a continuous wiggle re-arm forever, which the owner forbade. The 1.2 floor stays inside the owner's 1.2-1.5 H/s range. Tests: slow drag at 0.5 and 1.0 H/s still cut 0 in beginner runs; 1.3 H/s cuts in beginner runs but not in later runs; 5 s wiggle still cuts at most 6.
2. Slice backdrop: Slice hides the rose ring and centre disc and draws an open sky (#2A1D6E top, #203C7E middle, #1B5A6E bottom 25%), shaft gain .14, 64 motes, warm glow behind the bell (radius .28 H, #FFC89A, alpha .18); mid-screen board luminance at most 54/255.
3. Slice opening waves: 600 ms three same-colour crystals in a level row (apex .62 H, .14 H apart); 2400 ms two same-colour; 4200 ms a 5-crystal chord toss; no gap over 1600 ms in the first 10 s.
4. Slice sizes: radius .075 H, hitRadius .085 H, darkRadius .070 H.
5. Blade visuals: cutting trail life 220 ms, inert trail 320 ms; head width clamp(12 + 8 x (speed - 1.4), 12, 28) px, taper exponent 0.8; inert trail 5 px #CFC8FF alpha .55; a 250 ms glowing slash line through each cut crystal; demo hand follows the crystal's predicted path.
6. Tap board: PLAY_START.rose .20; rim ring and title blurred ring recoloured #3B4A9A and crossed by warm shafts.
7. Face: quad 5.0 u; eyes .24 x .28; pupils .14; backing disc alpha .45; line brightness 1.6.
8. Choir banner at 17% H (Tap, intro) and 30% H (Slice); points popup at 68% H; no "N at once!" line in the popup while the banner shows; banner hold 1.2 s.
9. Title card art: selector `.play-hero svg:not(.mode-art)`; art 144 x 86 px on both cards.
10. Slice beginner: missGraceMs.beginner 30000; falls crack at most once every 3 waves in beginner runs; first fall after grace shows "Catch them before they fall!" before any fall crack.
11. Tap opening: TAP_OPENING.followAtMs 2200, follow-up arc at rho 8.5; spawnerStartMs 4000.
