# First-10-seconds review: intro, Tap, Slice

Reviewer pass, 2026-10-29, build `bf2673f` (R3 part B). Judged against `research/postmortem.md` (what a 7-12 year old or a casual adult sees, understands, does and feels) and `docs/MODES.md`. This is not a beauty score.

Evidence used: every still and contact sheet in `shots/modes/review/` and `shots/modes/r3b/`, plus extra frames I pulled from `intro.mp4`, `tap.mp4` and `slice.mp4` (3-4 fps), `review/qa.json`, `r3b/velocity.json`, pixel luminance samples from the stills, and the code in `src/`.

Limits: the input was automated, so these runs show what the game does, not what a child does. The videos run at 30 fps, but I sampled them at 1.2-4 fps, so effects that last under about 150 ms can fall between frames. The small and black tiles in the contact sheets (for example intro tiles 1 and 3, tap tiles 5-6, the grey slice tile 1) look like recorder resize or load artefacts. I treat them as unverified, not as game bugs.

---

## 1. Second by second

### 1.1 First-launch intro (fresh save, no input)

| t | On screen | What a child gets |
|---|---|---|
| 0-0.5 s | Black while WebGL starts, then the board. Indigo sky at the top, teal at the bottom, a near-black disc with a blurred grey rim in the middle, a pale bell with a sleeping face. | "A ball with a face, sleeping." The face is about 60 px across. Its eyes are about 12 px and the closed-eye arcs are thin, so from arm's length it reads as "a moon", not yet "a character". |
| 0.6 s | 8 red triangles in a ring around the bell. The face wakes with a small "o" mouth (`intro-0600.png`). | Bright, saturated, finger-sized things. "Something is happening." |
| 1.5 s | Ghost hand on the lowest triangle with a tap loop, `Tap a crystal!` at about 23% height (`intro-1500.png`). | Clear: five words and a hand. A child taps here. |
| 1.5-3.7 s | Nobody touches. The hand keeps looping (`intro-3000`, `intro-3700`). | A real child would have tapped by now. |
| ~4.0 s | Auto-tap. All 8 shatter, rings, flash, `CHOIR!` / `8 at once` (`intro-4300.png`). | The biggest moment in the game, about 4 s in. But the gold serif `CHOIR!` sits right on top of the bell, so the "delighted" face, which is the character's reward, is hidden behind the word. |
| 5.2 s | Red shards fly out over the whole screen, the board empties, `CHOIR!` still holds (`intro-5200.png`). | Messy and lively. The best frame of the intro. |
| 6.5 s | Title: `SHATTERHYMN`, `Pick a game!`, two cards (`intro-6500.png`). The board behind is dominated by a big blurred white-grey ring like a tyre. The bell's face sits above a separate dark disc (the bell body), so it looks like a snowman. Stray half crystals poke in at the right edge. | "Pick a game" is clear. The **Slice** card has a big clear picture. The **Tap** card picture is a smudge about 22 px wide (CSS bug, see M9), so the first card looks emptier than the second. |
| 6.5-10 s | Title waits. | Chooses a card. Most children will pick the one with the bigger picture. |

### 1.2 Tap, first run (automated taps on crystals)

| t (approx.) | On screen | What a child gets |
|---|---|---|
| 0-0.6 s | Cards slide away. HUD (3 bells, `0`, pause) appears. Black arena (sampled Y 4-9, neutral grey RGB 5,5,6), blurred grey rim (Y about 56, RGB 54,56,62), bell with face in the middle. | "A black hole with a moon in it." |
| 1.0 s | The Crown: 8 yellow diamonds in a ring (`tap-0-start.png`). | Bright, big targets. |
| 1.3 s | Hand on the lowest diamond, `Tap a crystal!`. | Clear. |
| 2.3 s | First tap. Gold flash fills the arena, score counts up. | **Whoa.** First payoff about 1 s after the first touch. |
| 2.7-4.3 s | `CHOIR!` / `8 at once` across the bell, **and** a `+580` / `8 at once!` plate drawn on top of it (`tap-1-shatter.png`). Gold shards rain down over the bottom half. | The two texts overlap and say the same thing twice. The face is hidden. The shard rain is great. |
| 4.3-4.7 s | `CHOIR!` fades. The arena is empty and black. | A lull. Nothing to touch for about a second. |
| 4.7-5.3 s | An arc of 5 red triangles comes in from the left rim. Tap: `+50`, `5 at once!`, `2 more for a Choir`. | Second payoff. The pop is readable. |
| 5.7-6.3 s | Empty arena again, red shards drift. | Second lull. |
| 6.7-8.0 s | Green arc at the top right, yellow pair at the bottom right. Tap: `+60 ×2`, `3 at once!`, `×2` chip in the HUD. | Steady small rewards. The rose window finally lights up (indigo stone ring) during the flash and stays faintly visible. |
| 8-10 s | Red and green pairs at the right rim. No penalty for any tap. | "I tap, things break." Good. |

Score 3,230 and 0 cracks over the 18 s clip (`qa.json`). The bell face is idle or happy throughout, but at about 60 px and mostly behind banners it does not register as a reacting character.

### 1.3 Slice, first run (automated fast swipes)

| t (approx.) | On screen | What a child gets |
|---|---|---|
| 0-1.0 s | HUD. A huge dark stone "maze" disc fills the middle of the screen (about 130% of the width, 24-76% of the height, Y about 32, slate blue). In its centre is a pale blue-grey disc (Y about 114) that looks like a button or a hole. The bell sits at the very bottom, cut off by the screen edge, eyes closed. | "A dark maze with a hole in the middle." No idea what to do yet. The pale centre disc invites a tap. |
| 1.25 s | One small red triangle (about 50 px) rises from the bottom. Hand appears. | |
| 1.5-2.25 s | `Swipe fast to slice!`. The hand jumps around: top right, then over the hub, not on the crystal's path. The triangle flies to the top edge. No blade ribbon is visible in any sampled frame. | The words are clear. The hand does not show *where* to swipe. |
| 2.5 s | Score `10`. Small red pieces near the top left. | First payoff: one small crystal, 10 points, at the top of the screen, far from the thumb. |
| 3.0-3.25 s | One red half falls through the hub. Empty board. | Lull. |
| 3.5-4.75 s | Two yellow diamonds rise. One is cut (`20`) with a small gold burst at the right edge. | Second small payoff. No chain. |
| 5.0-5.75 s | Empty board for about 0.75 s. | Lull. |
| 5.75-8.75 s | Three green hexagons rise, drift up the left side and fall. None are cut (`slice-play-2`, `slice-play-3`). Then a red and a green rise. | Swiping "fast" did nothing visible. |
| 10 s | Score `20`: 2 cuts in 10 s. | "I swiped lots and it barely works." |
| ~10.7 s | First `×2` chain (`50`). | |
| ~19 s | `Catch them before they fall!`. Plasters appear on the face. | |
| ~24 s | Third crack, game over. 22 swipes, 9 cuts, score 100 (`qa.json`). | A beginner run ending at 24 s with a score of 100 is a loss in the first half minute. |

Velocity data (`r3b/velocity.json`, touch and mouse identical): slow drags at 0.5 and 1.0 H/s (about 420 and 840 px/s on an 844 px phone) through 3 crystals cut **0**. A 3 H/s swipe cuts 3. A 5 s wiggle over 24 crystals cuts **2**. In `velocity-touch-0.5.png` the slow drag leaves no visible trail. In `velocity-wiggle-after.png`, 22 untouched crystals fill the screen after 5 s of scribbling.

---

## 2. Pass / partial / fail per postmortem failure

| Postmortem failure | Intro | Tap | Slice |
|---|---|---|---|
| **Character / face** | **Partial.** A face exists and reacts (sleepy, wake "o", happy). But it is about 60 px across with 12 px eyes and 6 px pupils on a pale plate, and `CHOIR!` covers it at the delighted moment (`intro-4300`, `intro-5200`). | **Partial.** Same size. The face is under `CHOIR!` and `+580` at the peak, and the arena is black around it. | **Partial.** Larger (about 110 px) and more readable, but at the screen's bottom edge, partly cut off, ghostly pale on pale teal, with the bell's loop drawn over its forehead. It is far from where the action is (top half). |
| **Tactile verb** | **Pass.** Tap anywhere; the touch cannot fail. | **Pass.** Tap the crystal itself. 48 px touch radius. | **Fail.** The verb is right (swipe on the thing), but the gate rejects normal child swipes: 0.5 and 1.0 H/s cut 0. A scribble cuts 2 of 24. No blade seen in any frame. Automation at "fast" speed got 9 cuts from 22 swipes. |
| **Guaranteed early payoff** | **Pass.** Choir of 8 at about 4 s with no input. A child who taps gets it at 0.6-1.5 s. | **Pass.** Choir of 8 (+580) about 1 s after the first touch. | **Fail.** First payoff is one crystal for `+10` at about 2.5 s. 20 points by 10 s. The first Chord toss is wave 7 at 13.2 s, and nothing guarantees a big moment. |
| **No early penalty** | **Pass.** | **Pass.** Empty taps do nothing; no crack possible in 10 s. | **Partial.** No crack in 10 s, but a silent "nothing happened" on most swipes feels like being told "wrong". Three cracks and game over by about 24 s in a beginner run. |
| **Colour and life of the board** | **Partial.** Indigo-teal sky and shafts are nice. The arena centre is a near-black disc with a neutral grey rim. Red crystals and shards carry all the colour. | **Fail** in the first 8 s. Arena Y 4-9 with no saturation (spec allows Y ≤ 48, sat ≤ .55). The rose only shows after flashes. `PLAY_START.rose` is .055 vs .21 on the title. | **Fail.** The Tap/title rose disc (Slice runs the attract sim, so `uTitle` = 1) sits as a dark slate maze across half the screen. The pale hub at the centre competes with crystals. The board is empty for whole seconds. |
| **Clarity of goal** | **Pass.** `Tap a crystal!` + hand. | **Pass** for the verb. Protecting the bell is not shown, which is fine for 10 s. | **Partial.** `Swipe fast to slice!` is clear, but the hand jumps and does not trace the crystal's path, and "fast" turns out to mean faster than most children swipe. |
| **Readable onboarding** | **Pass.** One line, about 22-26 px, one hand. The line has no backing plate, but it reads on the dark sky. | **Partial.** The line and hand are good. The `CHOIR!` banner and the `+580` plate overlap and repeat `8 at once`. | **Partial.** `Swipe faster!` only comes after 2 slow strokes, and there is no visible trail to show the stroke was seen. |

---

## 3. MUST-FIX (prioritised, max 12)

1. **Slice: let child-speed swipes cut (biggest single problem).** Evidence: `velocity.json`, 0 cuts at 0.5 and 1.0 H/s, 2 of 24 in a wiggle; 9 cuts from 22 automated swipes. In `src/sim/sliceConfig.ts` add a beginner blade (Slice runs 0-2 and the first 30 s of every run): `armHps 0.8`, `disarmHps 0.5`, `rearmSlowMs 60`. Also re-arm on a direction reversal (angle between the last two 48 ms windows > 110°) inside a stroke, keeping `maxCutsPerArm 6` and `maxArmMs 350` per arm, so a scribble gets several budgets. Standard keeps today's values. Needs a MODES.md §7.1/§7.4 change and new rows for blade tests 1, 4, 9 and 10 (beginner: 1.0 H/s cuts 3; wiggle cuts ≥ 12 of 24).
2. **Slice: its own open, brighter backdrop instead of the Tap rose disc.** Confirmed: `SliceMode` renders the background from an attract `Sim` (`src/modes/slice/sliceMode.ts`), so `uTitle` = 1 and the rose is lit at .21. The result is a slate maze (Y about 32) across 24-76% of the screen, with a pale hub (Y about 114) dead centre. In Slice set the rose annulus and hub to 0 (`src/render/shaders/background.ts`, new `uSlice` uniform). Draw an open sky: gradient `#2A1D6E` (top) → `#203C7E` (middle) → `#1B5A6E` (bottom 25%). Shaft gain .14, motes `high: 64`, and a soft warm glow behind the bell (radius .28 H, `#FFC89A`, alpha .18). Keep mid-screen Y ≤ 54 so the red crystal core (Y about 135) stays ≥ 2.5 × board. Spec change to MODES.md §8.1 and §9.3.
3. **Slice: a guaranteed big moment in the first 5 s.** Change `SLICE_WAVES` (`src/sim/sliceConfig.ts`) to: wave 1 at 600 ms, 3 crystals of one colour as a level row (apex .62 H, x spacing .14 H, launched together) so one swipe gives `3 in one swipe!` (+120) and a happy face. Wave 2 at 2400 ms: 2 of one colour. Wave 3 at 4200 ms: a 5-crystal Chord toss (Choir, +750). Then the existing waves 4-7, shifted. No wave gap over 1600 ms in the first 10 s, so the screen is never empty (today it is empty at about 3.2 s and 5.0-5.7 s).
4. **Slice: bigger crystals.** Sampled crystals are about 50-82 px across on a 390 x 844 phone and look small and few. In `SLICE_TOSS` set `radius` .058 → .075 H and `hitRadius` .062 → .085 H (about 125 px across, 1/3 of the width), `darkRadius` .055 → .070. Check `maxAlive` 14 still fits without overlap at that size.
5. **Slice: make the blade impossible to miss.** No ribbon is visible in any of about 70 sampled frames or in the velocity stills. In `src/render/blade.ts` set cutting life 120 → 220 ms and inert life 200 → 320 ms. Set head width to `clamp(12 + 8 × (speed - 1.4), 12, 28)` px and the taper exponent to 0.8 (from 1.5). Make the inert trail 5 px, `#CFC8FF`, alpha .55 (was 2 px at .35, invisible), so a slow drag at least shows it was seen. Add a "slash scar" on every cut: a 6 px glowing line through the crystal, 1.6 × crystal diameter long, note-coloured edge, fading over 250 ms (`glowQuads`, no new draw call). Also anchor the demo hand to the crystal's predicted path; today it jumps to the top right while the crystal is at the centre.
6. **Tap: light the board from second 0.** Arena sampled Y 4-9, RGB 5,5,6, while the spec allows Y ≤ 48 at saturation ≤ .55. `PLAY_START.rose` is .055 in play vs .21 on the title (`src/render/fxConfig.ts`, used in `shaders/background.ts`). Set `PLAY_START.rose` .055 → .20 so the indigo rose (`glassDark` `#1C2250` → `glassLight` `#2C3A78`) shows at Y 28-45 from the first frame. Recolour the neutral grey rim ring (Y about 56) to `#3B4A9A`, and let the warm shafts (`#FFC89A`) cross it. Same for the title's blurred white-grey "tyre" ring: take it to `#3B4A9A` at 60% of its current brightness.
7. **Bigger, higher-contrast bell face in Tap and the intro.** Confirmed too small: quad 3.4 u ≈ 60 px, eyes about 12 px, pupils about 6 px. In `src/render/face.ts` set the quad 3.4 → 5.0 u (about 88 px, roughly 22% of the width). In `shaders/face.ts`: eyes rx .20 → .24, ry .24 → .28; pupils r .11 → .14; face plate alpha .22 → .45; line HDR 1.2 → 1.6. The face may extend past the glass bell; it is a sticker on it. MODES.md §5.1 size change.
8. **Do not cover the face or say it twice at the Choir.** `CHOIR!` / `8 at once` sits on the bell (`intro-4300`, `intro-5200`, `tap-1-shatter`, `tap-2-mid`), and the `+580` / `8 at once!` pop plate is drawn on top of it. Move the `CHOIR!` banner to 17% of height (between the HUD band and the arena's top edge at about 24%) in Tap and the intro, and to 30% in Slice. Put the points pop at 68% height, under the bell. When a Choir banner is showing, drop the `8 at once!` sub-line from the pop (`src/ui/popText.ts`). Shorten the `CHOIR!` hold from about 2.0 s to 1.2 s so the delighted face (1400 ms) is the last thing seen.
9. **Tap card illustration renders at 22 px.** Cause: `src/styles/main.css:58` `.play-hero svg { width:22px; height:22px; fill:#1a1030; }` beats `.mode-art` (line 184) because the Tap button also has `.play-hero`. Scope it to `.play-hero svg:not(.mode-art)`, and give `.mode-play .mode-art` `width:144px; height:86px` on both cards (`72px` wide stays for landscape under 500 px height). Today the Slice card looks like the "real" game and Tap like an empty box (`intro-6500.png`).
10. **Slice: no game over in the first 30 s of a beginner run.** The automated beginner run took 3 cracks and ended at about 24 s with a score of 100. Set `SLICE_RULES.missGraceMs.beginner` 15000 → 30000. In beginner runs, a fall cracks at most once per 3 waves (today once per wave). Show `Catch them before they fall!` on the first fall after the grace, before the first fall crack, not with it.
11. **Tap: close the two lulls in seconds 3-6.** The arena is empty and black at about 4.3-4.7 s and 5.7-6.3 s. In `TAP_OPENING` (`src/sim/config.ts`) set `followAtMs` 3000 → 2200 and spawn the follow-up arc at rho 8.5 instead of `SPAWN_R`, so it is already on screen when `CHOIR!` fades. Set `spawnerStartMs` 5000 → 4000. No crack is still possible in 10 s (speed unchanged).

---

## 4. SHOULD-FIX (max 8)

1. **Slice bell on screen and readable.** The bell body is cut off by the bottom edge, and the bell's loop outline is drawn across the face's forehead (`slice-play-*`). Move the bell from y .09 → .12 H and draw the loop behind the face plate. Raise the face plate alpha to .5 with a 2 px `#9FD8FF` rim. At run start use `idle` looking up, not `sleepy` (the frame at 1.0 s shows closed eyes).
2. **Title board.** The face plate floats above the dark bell body (a "snowman"); centre it on the bell. Start the attract spawner with a ring of crystals already on screen (today the title shows only stray halves at the right edge), and make sure the attract pilot breaks something within the first 2.5 s.
3. **Demo line plate.** MODES.md §13 says `.demo-line` sits on a plate `rgba(5,4,12,.72)`, radius 12 px. It has only a text shadow. Add the plate; on the brighter Slice sky (M2) it will be needed.
4. **Cut pops in Slice.** I could not see a `+10` pop near any cut in the sampled frames. Check that it spawns at the cut point, is at least 22 px, and holds about 500 ms.
5. **Lives readability.** In the Slice tail frames the three top-left bells look the same before and after cracks at contact-sheet scale, while the face plasters do show. Confirm that the broken state (red stroke, crack) is obvious at 28 px.
6. **Slice "Swipe faster!" sooner.** Show it after the first slow stroke that crosses a crystal, not the second (MODES.md §14.3 change).
7. **Intro auto-tap timing.** The auto-tap fired at about 4.0 s on screen, not 3.5 s, probably because t = 0 is counted before the first visible frame. Count from the first rendered board frame so the worst case is 3.5 s.
8. **Recorder artefacts.** Black or grey tiles at about 0.5-1.0 s in the intro, Tap and Slice contact sheets, and shrunken frames mid-clip. They are probably capture resizes, but confirm there is no real black flash between the intro board and the Crown.

---

## 5. Verdict: would the daughter likely keep playing past 30 s?

- **Intro: yes, it does its job.** She gets a big red explosion within a second of touching, or within about 4 s if she does not. The only wasted beat is that the bell's happy face is hidden under the word `CHOIR!`.
- **Tap: probably yes, at least to the end of the first run.** The first touch gives a huge gold explosion and +580, every tap after that breaks something, and nothing tells her off. What will hold her back: the board is a black hole, the face is too small to care about, and there are two empty seconds after the big moment. With M6, M7, M8 and M11 this mode is close.
- **Slice: probably not.** She will pick it first because its card has the only clear picture. She will then see a dark maze, one small crystal at a time, and swipes that mostly do nothing with no trail to show they were seen. Her first payoff is one `+10` near the top of the screen, and the run ends with three cracks at about 24 s. That repeats the postmortem's "it doesn't work" lesson. Slice needs M1 to M5 and M10 before it is shown to a child.
