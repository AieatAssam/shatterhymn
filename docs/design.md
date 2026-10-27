# SHATTERHYMN — Game Design Document

*"Sing one note. Break everything tuned to it."*

Version 1.0 · 2026-10-27 · Design lead. This document is normative: the implementer follows it literally. All numbers live in `src/sim/config.ts` (see `architecture.md`), and the values there must match this file.

---

## 1. Fantasy

You are a glass bell hanging in the centre of a dark, endless cathedral. Living crystals drift in from the dark, each one tuned to a single note. When they touch you, you crack. Your only power is your voice: hold to climb your scale, let go to ring one note, and every crystal tuned to that note resonates and bursts into light. The fantasy is endogenous: singing *is* the attack, and the music of the run is made of your decisions.

## 2. Core loop

```
 crystals drift inward ──► player HOLDS (dial climbs notes) ──► player RELEASES on a note
        ▲                                                            │
        │                                                            ▼
 more, faster, new kinds ◄── score += 10·N²·mult ◄── every crystal of that note shatters (N)
```

- **Second-to-second:** choose which note to sing and *when*. Strike now and stay safe, or wait for more crystals of one colour to gather and score quadratically more.
- **Run (1–5 min):** survive the rising tide; chase a Choir (7+ at once); keep the streak multiplier alive.
- **Day:** Daily Hymn (shared seed), 3 daily missions.
- **Long term:** lifetime shards unlock bell skins and musical scales; titles; personal best.

## 3. Controls

One thumb. The whole screen is the input surface except the HUD buttons (pause in the top-right corner and the result/menu buttons on their screens).

| Input | Effect |
|---|---|
| Press (pointerdown anywhere in the play area) | Start singing. The dial starts on note 0 (red triangle) and plays its tone. |
| Keep holding | Every `stepMs` the dial moves to the next active note (0 → 1 → 2 … → K−1 → 0 …) and plays that note's tone. |
| Release (pointerup / pointercancel) | **Strike** the note the dial is on. |
| Keyboard (desktop) | Space or any letter key held = press. Release = strike. `P` / `Esc` = pause. |
| Mouse | Left button, same as touch. |

Rules:
- Only the first pointer counts. Extra fingers are ignored until the first is released.
- A press during **strike recovery** (150 ms after any strike) is accepted, but the dial starts only when recovery ends.
- A press during **jar** (600 ms after a dud) is ignored. The bell visibly wobbles during the jar.
- `pointercancel` and window `blur` while holding count as a release (strike). Exception: if the game is pausing because of `visibilitychange`, the hold is cancelled without striking.
- No long-press menus, no text selection, no scroll: `touch-action: none` and `user-select: none` on the play surface, and `contextmenu` is prevented.

## 4. Notes (tones)

There are 5 notes. Each note always has the same colour, shape and pitch, so it reads by colour, by shape or by ear (colour-blind safe).

| Index | Name (UI) | Shape | Colour | Default pitch (Bright scale) |
|---|---|---|---|---|
| 0 | Red | Triangle | `#FF4F6E` | C5 523.25 Hz |
| 1 | Yellow | Diamond | `#FFC23F` | D5 587.33 Hz |
| 2 | Green | Hexagon | `#3FE0A0` | E5 659.25 Hz |
| 3 | Blue | Star (5-point) | `#4FA8FF` | G5 783.99 Hz |
| 4 | Purple | Circle (orb) | `#C77DFF` | A5 880.00 Hz |

Active note count `K` grows with level: 3 at the start, 4 from level 2, 5 from level 4 (§7). The dial only cycles through active notes. Inactive notes are shown dimmed and locked on the dial.

## 5. Rules of the arena

World units. Bell at the origin `(0,0)`. Positions are polar `(rho, theta)`.

| Constant | Value | Meaning |
|---|---|---|
| `ARENA_R` | 10.0 | Visible arena ring radius |
| `SPAWN_R` | 10.6 | Crystals appear here and fade in over 0.35 s |
| `TARGETABLE_R` | 10.2 | A crystal can be struck only once `rho <= 10.2` |
| `HALO_R` | 1.6 | Bell halo radius; contact = crack |
| `CRYSTAL_R` | 0.55 | Normal crystal radius |
| `RUSHER_R` | 0.42 | Rusher / splitter-child radius |
| `GEODE_R` | 0.70 | Geode radius (while shelled) |
| `CLOSE_GAP` | 1.2 | "Close call" if `rho - HALO_R - r <= 1.2` at the moment of shattering |
| `PRISM_BLAST_R` | 3.5 | Prism blast radius (around the prism) |
| `CHOIR_N` | 7 | N needed for a Choir |
| `CHOIR_R` | 5.0 | Choir sweep radius (around the bell) |
| `FLARE_R` | 3.6 | On crack, every crystal with `rho <= 3.6` is destroyed without points |
| `MAX_CRACKS` | 3 | Third crack ends the run |
| `RECOVERY_MS` | 150 | Strike recovery |
| `JAR_MS` | 600 | Dud penalty lockout |
| `CRACK_GRACE_MS` | 1000 | After a crack, crystals touching the halo are destroyed without cracking |

**Movement.** Each crystal: `rho -= speed * dt`, `theta += swirl * dt`. `speed` comes from the level table times a kind/formation factor; `swirl` is set at spawn (§7.3). Crystals rotate visually (render only).

**Contact.** When `rho - r <= HALO_R` the bell **cracks**:
1. The crystal is destroyed (red burst, no points).
2. `cracks += 1`, streak resets to 0.
3. **Flare:** every other crystal with `rho <= FLARE_R` is destroyed without points (so one mistake never chains into instant death).
4. **Grace:** for `CRACK_GRACE_MS` after a crack, any crystal that touches the halo is destroyed without points and without a crack (the bell glows white while graced).
5. If `cracks == MAX_CRACKS`, the run ends (§9).

## 6. Strike resolution and scoring

On release with dial on note `n`, resolve in this exact order (one sim tick):

1. **Collect targets:** alive crystals with `rho <= TARGETABLE_R` whose current note is `n` (for a Prism, its *current* cycling note).
2. **Geodes with a shell** among the targets lose their shell (`shellBreaks += 1`). They stay alive as normal crystals of the same note (radius becomes `CRYSTAL_R`). They are *not* counted in N.
3. **All other targets shatter.** For each:
   - **Splitter:** spawns 2 children of note `(n + 1) % K` at its position, `theta ± 0.25 rad`, radius `RUSHER_R`. Over 0.4 s they are pushed outward by +1.2 units, then move inward at the current level speed. Children are normal crystals.
   - **Mend:** if `cracks > 0`, `cracks -= 1` (emit `mend`).
   - **Prism:** blast. Every alive crystal within `PRISM_BLAST_R` of the prism (any note, geodes included, shell or not) shatters as well and counts in N. A blast does not trigger other prisms' blasts (prisms caught in a blast shatter without blasting).
4. `N` = number of crystals shattered in steps 3 (targets + blast victims).
5. If `N == 0` and `shellBreaks == 0` → **Dud**: streak = 0, bell jars for `JAR_MS`, emit `dud`. Stop.
6. Otherwise `streak += 1`, then `mult = min(8, 1 + floor((streak - 1) / 2))`. (Strikes 1–2 → ×1, 3–4 → ×2, 5–6 → ×3 … 15+ → ×8.)
7. **Points:**
   - Chord: `10 × N² × mult`
   - Each shell break: `5 × mult`
   - Each shattered crystal that was a close call: `+20 × mult` (emit `close`)
8. **Choir:** if `N >= CHOIR_N`, every remaining alive crystal with `rho <= CHOIR_R` shatters (any note, geodes fully). Each scores `50 × mult`. Plus a flat `500 × mult`. Emit `choir`. These do not add to N.
9. Shards earned this strike = N + choir-swept count + (10 if Choir).
10. Record the strike in the run's **hymn line** (§12): note index, plus a Choir flag.

Worked examples (mult ×1): 1 crystal = 10. 2 = 40. 3 = 90. 4 = 160. 5 = 250. 6 = 360. 7 (Choir) = 490 + 500 + sweep.

**Run score** is an integer, never decreases. Stats tracked per run: `score, timeSurvivedMs, biggestN, longestStreak, crystalsBroken, choirs, closeCalls, prismsBroken, duds, strikes`.

## 7. Procedural generation and difficulty

### 7.1 Seed and RNG

Every run has a 32-bit seed. All gameplay randomness comes from one `mulberry32(seed)` stream, used **only by the sim** (render particles use a separate, unseeded RNG). The same seed plus the same input timeline gives the same run, tick for tick.

- Normal run: seed from `crypto.getRandomValues`.
- Daily Hymn: `seed = hash32("shatterhymn-daily-" + localDateISO)` where `localDateISO` is `YYYY-MM-DD` in the player's local time zone.
- Shared seed: URL `?seed=XXXXXXXX` (8 hex digits) starts a normal run with that seed (title shows "Friend's seed XXXXXXXX").

### 7.2 Level table

`level L = floor(elapsedMs / 20000)`. `elapsedMs` counts only unpaused, non-tutorial sim time (it does run during hitstop slow-mo at the scaled rate, and does not run during full freeze).

| L | Time | K (notes) | spawnInterval s | speed u/s | fieldCap | stepMs | New this level |
|---|---|---|---|---|---|---|---|
| 0 | 0:00 | 3 | 1.50 | 0.85 | 6 | 420 | — |
| 1 | 0:20 | 3 | 1.35 | 0.95 | 8 | 400 | Arc formation |
| 2 | 0:40 | 4 | 1.25 | 1.05 | 10 | 380 | Blue note, Duet, Geode |
| 3 | 1:00 | 4 | 1.10 | 1.15 | 12 | 360 | Spiral, Prism |
| 4 | 1:20 | 5 | 1.00 | 1.25 | 14 | 340 | Purple note, Ring, Splitter |
| 5 | 1:40 | 5 | 0.90 | 1.35 | 16 | 320 | Rusher, Mend |
| 6 | 2:00 | 5 | 0.80 | 1.45 | 18 | 300 | — |
| 7 | 2:20 | 5 | 0.72 | 1.55 | 20 | 280 | — |
| ≥8 | 2:40+ | 5 | `max(0.45, 0.72 − 0.03·(L−7))` | `min(2.40, 1.55 + 0.06·(L−7))` | `min(28, 20 + (L−7))` | `max(220, 280 − 8·(L−7))` | — |

When `K` grows mid-hold, the new note joins the dial cycle immediately after the current step. On each level-up, emit `levelUp` (HUD shows "Level 3" for 1.2 s, plus a "New note: Blue star" line when K grows).

Slow dial setting (§13) multiplies `stepMs` by 1.35.

### 7.3 Formations (spawn director)

A spawn timer counts down. When it hits 0, the director picks a formation by weight (from those unlocked at the current level), resolves tones and kinds, and checks the cap:

- If `alive + formation.count > fieldCap`, skip and retry in 0.25 s.
- Otherwise spawn, then set `timer = spawnInterval × (1 + 0.35 × (count − 1))`.

| Formation | From L | Weight | Count | Layout | Tones |
|---|---|---|---|---|---|
| Single | 0 | 5 | 1 | random theta | 1 from bag |
| Pair | 0 | 3 | 2 | theta0 ± 0.21 rad (±12°) | 1 tone for both |
| Arc | 1 | 3 | `min(5, 3 + floor(L/3))` | spread evenly across a 0.7–1.2 rad arc centred on random theta0 | 1 tone for all |
| Duet | 2 | 2 | 4 | arc of 1.0 rad, alternating A B A B | 2 different tones from bag |
| Spiral | 3 | 2 | K | spawned one at a time 0.30 s apart, theta advancing +0.45 rad each, swirl 0.12 | ascending notes starting at a random note: s, s+1, s+2 … (mod K) |
| Ring | 4 | 1.5 | 6 | evenly spaced around the full circle, theta0 random | each from bag, speed ×0.8 |

- **Tone bag:** a shuffled list of the active notes `0..K-1`. Draw from the front; refill and reshuffle when empty. Rebuild when K changes. This prevents droughts of one colour.
- **Swirl:** each formation gets `swirl = rngSign × rngRange(0.04, 0.16)` rad/s shared by all its crystals (Spiral uses +0.12).
- **Opening generosity:** the very first formation of a run is always a Pair, spawning 1.0 s after the run starts.

### 7.4 Special crystal kinds

After a formation's tones are chosen, each crystal in it rolls for a kind in this order (first success wins; otherwise Normal). Spiral and Ring crystals never roll specials.

| Kind | From L | Chance | Extra rule | Behaviour |
|---|---|---|---|---|
| Mend | 5 | 2.5% | only if `cracks > 0`, no Mend alive, and ≥ 30 s since the last Mend spawned | White glow around its note shape. Breaking it repairs one crack. |
| Prism | 3 | 5% | max 1 Prism alive | Its note cycles through active notes every 1.0 s (starts at its rolled tone). Breaking it blasts radius 3.5. |
| Geode | 2 | 8% | — | Dark rock shell over the coloured core. Needs 2 strikes of its note. Radius 0.70 while shelled. |
| Splitter | 4 | 7% | — | Visible seam down the middle. Shatters into 2 children of the next note up. |
| Rusher | 5 | 10% | — | Radius 0.42, speed ×1.7, leaves a short light trail. |

### 7.5 Fairness guarantees (must be unit-tested)

- No crystal spawns within 2 s of the same theta (±0.3 rad) as an existing crystal with `rho > 8`, to prevent overlapping sprites. If blocked, rotate theta0 by +0.6 rad and retry, up to 6 tries; then skip the spawn.
- The field never exceeds `fieldCap` (splitter children may exceed it by at most 2).
- With no input at all, a run lasts between 12 s and 40 s (the first Pair needs ~10 s to arrive; the flare and grace give breathing room). A test asserts it for 20 different seeds.

## 8. Feedback per event (summary — exact specs in `art/style-guide.md`)

| Event | Visual | Audio | Hitstop | Haptic |
|---|---|---|---|---|
| dialStep | Dial pointer slides, note glyph pulses, bell tints to note colour | That note's bell tone, soft | — | `tick` |
| strike (any) | Shockwave ring in note colour from the bell | Note tone, loud | — | — |
| shatter N | Each crystal: white flash, 3D shards, pop text "+points" | Glass transient + chord (N notes stacked) | `min(160, 30 + 14·N)` ms | `shatterN` |
| close | Gold "Close!" text at the crystal | Bright high glint | +20 ms | extra `tick` |
| dud | Bell wobbles, grey ring | Muted thunk (`dud.mp3`) | — | `dud` |
| crack | Bell gets a visible crack line, red flash, flare ring | Heavy bell + low glass | 120 ms | `crack` |
| mend | Crack line seals with gold (kintsugi) | Rising shimmer | 60 ms | `mend` |
| choir | Signature moment (style guide §5) | 5-note chord + shimmer + music duck | 160 ms + slow-mo | `choir` |
| levelUp | Floor rings brighten once outward | Soft swell | — | — |
| gameOver | Bell shatters in slow motion | Low chord falling, music slows to 50% | 250 ms + slow-mo | `gameOver` |
| newBest | Gold confetti of shards on results | Fanfare arpeggio | — | `newBest` |

## 9. Fail and restart

- Third crack → **game over sequence**: 250 ms full freeze → bell shatters, sim time at 0.3× for 900 ms (remaining crystals fade out) → results panel springs in at 1.4 s.
- **Results screen** (exact copy):
  - Title: `The bell broke.`
  - Big number: score. Under it, `New best!` (gold) if it is a PB, otherwise `Best: 12,400`.
  - Stats rows: `Time 2:14` · `Most at once 9` · `Longest streak 14` · `Crystals broken 182` · `Choirs 2`
  - `+184 shards` and a progress bar: `Next: Rose Gold bell — 412 / 500 shards`
  - Mission lines with checkmarks (only today's 3).
  - Buttons: **Play again** (primary, large, bottom thumb zone), **Share**, **Menu**.
  - The hymn line (§12) as a row of coloured glyphs.
- **Play again** starts a new run in under 1 s (no loading, no tutorial). If the finished run was a Daily Hymn, Play again replays the Daily Hymn.
- Pausing: pause button (top-right, 44×44 px minimum) or automatically on `visibilitychange` → hidden. Pause menu: **Resume**, **Restart**, **Settings**, **Quit to menu**. Resuming shows `3 · 2 · 1` (each 400 ms) before the sim runs. No input during the count.

## 10. Progression

### 10.1 Personal bests
Stored: best score (all runs), best score per daily date, biggest N ever, longest streak ever, longest time survived. A PB beaten mid-run triggers a small HUD flourish: the `BEST` label turns gold and reads `NEW BEST` (once per run, no pause).

### 10.2 Shards and unlocks (no spending, no shop)
Every shattered crystal = 1 shard (§6 step 9). Shards are **lifetime totals**; unlocks happen at thresholds. Nothing is ever spent or lost.

**Bell skins** (change bell material, shatter flash tint and the share card frame):

| Skin | Unlock |
|---|---|
| Clear Glass | default |
| Smoked Quartz | 150 shards |
| Rose Gold | 500 shards |
| Obsidian | 1,200 shards |
| Aurora | 2,500 shards |
| Rose Window | 5,000 shards |
| Choirmaster's Crown | 10 Choirs lifetime |

**Scales** (change the five pitches only; gameplay identical). Shown in Collection as "Sound of your bell":

| Scale | Notes (semitones from C5) | Unlock |
|---|---|---|
| Bright | 0, 2, 4, 7, 9 (major pentatonic) | default |
| Dusk | 0, 3, 5, 7, 10 (minor pentatonic) | 300 shards |
| Koto | 0, 2, 3, 7, 8 (hirajoshi) | 800 shards |
| Dream | 0, 2, 4, 6, 8 (whole tone) | 1,800 shards |
| Gamelan | 0, 1, 3, 7, 8 (pelog-style) | 3,500 shards |

The first unlock (150) is set so most first runs plus a second run reach it (endowed progress). The results bar always shows the *next* locked item.

**Titles** (shown on the share card and results; the highest earned is used, and the player can pick any earned one in Collection):

| Title | Earned by |
|---|---|
| Novice Bell | default |
| Chorister | first Choir |
| Cantor | 10,000 in one run |
| Bellwright | survive 3:00 |
| Choirmaster | 10 Choirs lifetime |
| Cathedral | 50,000 in one run |

New unlock → toast on results: `Unlocked: Rose Gold bell` with the item's icon, and a button `Use it` that equips it immediately.

### 10.3 Daily Hymn
- One seeded run per local calendar day, same for everyone (§7.1). **Unlimited attempts**, best kept.
- Daily number: `#1` on 2026-10-27, +1 per day.
- Title-screen card: `Daily Hymn #12 — Today's best: 8,420` (or `Not played yet`).
- No streak penalty, nothing expires except the mission list rolling over. "Days played" is just a count, never reset.

### 10.4 Daily missions
Three missions per local day, chosen from the deck below by `mulberry32(hash32("shatterhymn-missions-" + date))`, no duplicates. Progress counts from any run that day (normal or daily). Completing one grants **40 shards** at once; completing all three grants **+100** more. Rewards are automatic: there's no claim button and nothing to forget.

| id | Text (exact) | Type | Target |
|---|---|---|---|
| m_n4 | Break 4 crystals with one note | best-in-run N | 4 |
| m_n6 | Break 6 crystals with one note | best-in-run N | 6 |
| m_choir | Sing a Choir (7 or more with one note) | count | 1 |
| m_t60 | Survive for 1 minute in one run | best-in-run time | 60 s |
| m_t120 | Survive for 2 minutes in one run | best-in-run time | 120 s |
| m_x4 | Reach a ×4 multiplier | best-in-run mult | 4 |
| m_s3k | Score 3,000 in one run | best-in-run score | 3000 |
| m_s10k | Score 10,000 in one run | best-in-run score | 10000 |
| m_prism | Break 3 Prisms | count (day total) | 3 |
| m_close | Get 10 close calls (break a crystal right next to the bell) | count (day total) | 10 |
| m_150 | Break 150 crystals | count (day total) | 150 |
| m_daily | Play the Daily Hymn once | count | 1 |

## 11. Tutorial (first launch; replayable from "How to play")

Plain, concrete English. One instruction at a time, large text, centred above the bell. The sim runs in **tutorial mode**: scripted spawns, crystals stop at `rho = 4` and never crack the bell, no score, no level timer. A `Skip` button (top-left) appears only if the tutorial was completed before.

| Step | Setup | Text shown | Advances when |
|---|---|---|---|
| 1 | Empty arena, dial visible (3 notes) | **Hold your finger anywhere on the screen.** | pointerdown |
| 2 | While holding: dial climbs | **Keep holding. The bell climbs through its notes: red, yellow, green.** Then after 2 full cycles, or on release: | release |
| 3 | 2 red triangles fly in and stop at rho 5 | **Two red triangles. Hold, then let go while the dial is on red.** | release on red with both alive → both shatter |
| 3-fail | released on another note | **That was {Yellow}. Let go while the dial is on red.** (crystals stay) | retry |
| 4 | Show success | **Both broke at once. One note breaks every crystal of its colour.** (1.6 s) | auto |
| 5 | 1 yellow diamond + 1 green hexagon stop at rho 5 | **Now break the yellow diamond. Hold until the dial reaches yellow, then let go.** | yellow struck |
| 6 | 3 heart-bell icons pulse at the top | **If a crystal touches the bell, the bell cracks. Three cracks and the run ends.** Button: `Got it` | button |
| 7 | Mini table | **More of one colour at once = far more points. 1 crystal: 10 · 3 at once: 90 · 5 at once: 250.** Button: `Start` | button → first real run |

Contextual tips (shown once each, ever, as a 3 s banner under the score, non-blocking):
- First dud: `No crystals of that note were on screen. Wrong notes make the bell wobble for a moment.`
- First crack: `Cracked! Two more and the run ends. Crystals near the bell were pushed away.`
- First time a special kind appears:
  - Geode: `New: Geode. Hit it twice with its note. The first hit breaks the rock shell.`
  - Prism: `New: Prism. It keeps changing colour. Break it and it breaks everything near it.`
  - Splitter: `New: Splitter. It breaks into two small crystals of the next note.`
  - Rusher: `New: Rusher. Small and fast. Deal with it first.`
  - Mend: `New: Mend crystal (white glow). Break it to repair one crack.`
- First time K grows: `New note: Blue star. The dial now has 4 notes.` (and `New note: Purple circle. The dial now has 5 notes.`)

## 12. Share

**Hymn line:** each successful strike appends its note emoji; a Choir appends ✨ after it; a crack appends 💔. Max 30 symbols (if longer, keep the first 12 and the last 17 with `…` between).
Emoji map: 0 🟥 · 1 🟨 · 2 🟩 · 3 🟦 · 4 🟪.

**Share text (exact template):**
```
Shatterhymn {Daily #12 | Run} — {18,420}
{🟥🟥🟨🟦✨🟩🟪…}
Most at once: {9} · Streak: {14} · {2:14}
{Slow dial · }Play: {url}
```
`url` = the page URL; for a normal run add `?seed=XXXXXXXX`; for the daily add `?daily=1`. `Slow dial · ` appears only when that setting was on for the run.

**Share card** (PNG, 1080×1350, generated client-side on a 2D canvas): see style guide §9.4. **Share** button: `navigator.share({ text, files:[png] })` if `navigator.canShare({files})`; else `navigator.share({text})`; else copy text to clipboard and show `Copied! Paste it anywhere.`, plus a `Save image` link (download).

## 13. Settings (exact labels)

| Setting | Control | Default | Notes |
|---|---|---|---|
| Sound effects | slider 0–100 | 80 | effects bus gain |
| Music | slider 0–100 | 60 | music bus gain |
| Vibration | toggle | on | Hidden on browsers without `navigator.vibrate` **and** not iOS. On iOS shows `Vibration (tap feedback on iPhone)` and uses the switch-haptic trick (style guide §7.3). |
| Reduce motion | toggle | on if `prefers-reduced-motion: reduce`, else off | see style guide §10 |
| Slow dial | toggle | off | dial steps 35% slower. Label hint: `Gives you more time to pick a note. Shown on your share card.` |
| Screen shake | slider 0–100 | 100 | multiplies trauma; forced 0 when Reduce motion is on |
| Show tips | toggle | on | contextual banners |
| How to play | button | — | replays the tutorial |
| Credits | button | — | credits panel (audio, fonts, inspirations, libraries) |
| Reset progress | button | — | double confirm: `Delete all progress? This cannot be undone.` → `Delete` / `Keep` |

Settings save immediately. Audio sliders preview with a dial tick.

## 14. Screens

1. **Title:** logo `SHATTERHYMN`, tagline `Sing one note. Break everything tuned to it.` Buttons: **Play** (primary), **Daily Hymn #N** (shows today's best), **Missions 1 / 3**, **Collection**, **Settings**. The live arena idles in the background (slow attract mode: crystals drift and an auto-singer strikes every 2.5 s, no sound until first input).
2. **Play (HUD).**
3. **Pause.**
4. **Results.**
5. **Collection:** tabs `Bells`, `Sounds`, `Titles`. Locked items show the requirement in plain text (`Unlocks at 1,200 shards — you have 412`). Sounds tab plays a 5-note preview when tapped.
6. **Missions:** today's 3 with progress bars, plus `New missions at midnight`.
7. **Settings / Credits.**

## 15. How the 7 Malone–Lepper principles show up

| Principle | Where, concretely |
|---|---|
| **Challenge** | Clear goal (don't let crystals touch the bell; score high). Uncertain outcome from rising speed and greed. Constant feedback: every strike has an immediate, size-scaled result. Self-esteem: PB, titles. The difficulty table rises on two axes: speed/density and variety (new notes, new kinds). |
| **Fantasy** | Endogenous: the bell *sings*, singing *breaks*, and the run sounds like music you made. The cathedral setting, glass materials and choir terminology all serve that single image. |
| **Curiosity** | Sensory: five scales change the sound of the run, and new kinds arrive at set levels. Cognitive: "what if I wait for one more?", "what does a Prism caught next to five greens do?", and the locked items show exactly what's next. |
| **Control** | You decide when, which note and how greedy. There's no randomness in the strike result: it is fully predictable from the screen. Settings let you shape the experience (Slow dial). |
| **Cooperation** | Daily Hymn: everyone plays the same cathedral that day and compares hymn lines. Friend seeds (`?seed=`) let you send a run to a friend: "try my seed". |
| **Competition** | Personal best, daily best, the share text puts a score and a line next to a friend's. Competition is player-to-player through sharing; there is no fake leaderboard. |
| **Recognition** | Share card shows score, title and bell skin; titles name achievements ("Choirmaster"); New best! moments; Choir count on the card. |

## 16. Hooked model

| Stage | Shatterhymn |
|---|---|
| **Trigger** | External: a friend's share text (emoji line + link with a seed), the PWA home-screen icon, "Daily Hymn #N" on the title. Internal: a two-minute gap ("I can beat 12k"). No push notifications. |
| **Action** | Hold, let go. Learnable in one try; restart in under 1 s. |
| **Variable reward** | *Hunt:* chord size depends on how the formations line up (Prism next to a cluster = jackpot you made). *Self:* mastery of greed timing, new PB. *Tribe:* share line, friend seeds. Rewards vary because the field varies, not because of random payouts. |
| **Investment** | Lifetime shards → skins and scales (the bell becomes *yours* and sounds like you), titles, PB history, knowledge of the kinds, today's mission progress. |

## 17. Ethics (hard rules)

- No purchases, ads, loot boxes, gacha, randomised rewards or currencies for money. Ever.
- No timers that take things away. Missions refresh daily, but anything earned stays; days played is never reset; nothing "expires".
- No rigged near-misses. "Close!" fires only when the geometry was really close (§5 `CLOSE_GAP`). The spawn director never reads player state except `cracks` (for Mend) and is otherwise purely seeded. No hidden difficulty adjustment.
- No fake social proof ("you beat 87% of players"). No leaderboards with invented data.
- No notifications, no data collection, no analytics, no network calls except loading the page. Saves are local only.
- Respect the player's time: runs are short, pausing is instant, and the game auto-pauses when hidden.
- Accessibility: colour + shape + pitch for every note, Slow dial, Reduce motion, volume controls, readable text (min 16 px, 4.5:1 contrast).
- Crediting: all inspirations and assets listed in `CREDITS.md` and in-game Credits.
