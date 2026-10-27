# SHATTERHYMN — Milestones (M0 … M14)

Each milestone should fit in one implementer session (≤ 45 min). Do them in order. Each one ends with `timeout 300 npm run check` passing (lint + typecheck + tests + build). Section references: **D** = `docs/design.md`, **SG** = `docs/art/style-guide.md`, **A** = `docs/architecture.md`.

General rules for every milestone:
- Follow the cited sections literally. If something conflicts, D wins for rules, SG wins for look/feel numbers, A wins for code structure. Note any conflict in your final message under "spec-notes".
- Never ship flat placeholder art (SG §11). If a later milestone owns a feature, leave it absent rather than faking it.
- Tests use Vitest in Node (A §15). No browser, no Playwright, no jsdom.
- Do not touch `public/audio/` files (they are final and credited).

---

## M0 — Scaffold, tooling, core utilities

**Files:** `package.json`, `package-lock.json` (from `npm install`), `tsconfig.json`, `vite.config.ts` (with the Vitest `test` block; leave the `swPrecache` plugin for M13), `eslint.config.js`, `index.html`, `src/main.ts`, `src/styles/main.css`, `src/core/{rng,events,loop,spring,ease,noise,date,pool}.ts`, `public/.nojekyll`, `README.md`, `CREDITS.md` (already exists: keep it and extend it if needed), `LICENSE` (MIT, holder "Aieat Assam"), `.gitignore` (`node_modules`, `dist`), `tests/rng.test.ts`, `tests/loop.test.ts`, `tests/daily.test.ts` (date part).

**Steps:**
1. `timeout 540 npm install three postprocessing @fontsource/cinzel @fontsource/inter` and `timeout 540 npm install -D vite vitest typescript@^5.9 eslint @eslint/js typescript-eslint globals @types/three`.
2. Scripts exactly as A §1.1. The ESLint flat config uses `@eslint/js` recommended + `typescript-eslint` recommended, browser + node globals, and ignores `dist/`, `node_modules/` and `public/`.
3. `index.html`: head per A §13.2 (the manifest link can point at a file created in M13; create an empty-but-valid manifest now with name/short_name/start_url/display/colours), body = `<div id="app"><canvas id="gl"></canvas><div id="surface"></div><div id="hud"></div><div id="screens"></div></div>`. CSS: full-viewport, `void-0` background, `touch-action: none`, `user-select: none`, `overscroll-behavior: none`, safe-area padding variables.
4. Core modules per A §4 (full implementations, not stubs).
5. `main.ts` for now: imports fonts and CSS, and draws nothing else. It must build.

**Done when:**
- [ ] `npm run check` passes.
- [ ] `dist/` builds with relative asset URLs (`./assets/...` in `dist/index.html`).

**Tests:**
- `rng.test.ts`: `new Rng(1)` gives the same first 5 values on two instances; `hash32('abc')` is stable (assert the value your implementation returns, and that `hash32('abc') !== hash32('abd')`); `int(5)` stays in 0..4 over 10k draws, and each value appears ≥ 1800 times; `shuffle` is a permutation; `seedToHex(0x3f9a12c0) === '3F9A12C0'`; `hexToSeed('zz')` is `null`.
- `loop.test.ts` (fake `now`, call `pumpFrame` directly): 1000 ms at 60 fps → 60 ticks (±1); `freeze(100)` then `freeze(50)` → freeze ends at +100, not +150; during a freeze ticks = 0 and `frame` still gets called; `slowmo(0.25, 600, 250)` → about 15 ticks in the first 1000/4 ms; `paused` → no ticks; a 500 ms frame gap produces at most 5 ticks.
- `daily.test.ts`: `dailyNumber('2026-10-27') === 1`, `dailyNumber('2026-11-27') === 32`, `dailyNumber('2027-03-30') === 155` (a DST-crossing span); `localDateISO(new Date(2026, 0, 5))` is `'2026-01-05'`; `msToClock(134000) === '2:14'`.

---

## M1 — Sim part 1: config, types, dial, strike

**Files:** `src/sim/{config,types,dial,strike}.ts`, `tests/{config,dial,strike}.test.ts`.

**Implement:** A §5.1, §5.2, §5.4 (dial and strike), D §3–§6 exactly. `strike.ts` takes a `spawnChild` callback for splitter children so it can be tested without the spawner.

**Done when:**
- [ ] Every constant in D §5 and the level table D §7.2 exists in `config.ts` with the same value.
- [ ] `npm run check` passes.

**Tests:**
- `config.test.ts`: `levelRow(0)` = `{K:3, spawnInterval:1.5, speed:0.85, fieldCap:6, stepMs:420}`; `levelRow(4).K === 5`; `levelRow(8)` = `{spawnInterval:0.69, speed:1.61, fieldCap:21, stepMs:272}` (to 2 decimals); `levelRow(100)` is clamped to `0.45 / 2.40 / 28 / 220`.
- `dial.test.ts`: press → note 0 + `holdStart` + `dialStep(0)`; after 420 ms of ticks → note 1; with K = 3, after 3 steps → back to note 0; `slowDial` → the first step at 567 ms (±1 tick); a press during `jarMs > 0` is ignored; a press during recovery starts the dial only after recovery ends; cancel drops the hold without a strike.
- `strike.test.ts` (hand-built states):
  - 3 red crystals + 1 yellow, strike red → n = 3, points = 90 × mult 1, the yellow is still alive.
  - Strike with no matching crystal → `dud`, streak 0, `jarMs === 600`.
  - Streak/mult ladder: 15 successful strikes → mults `1,1,2,2,3,3,4,4,5,5,6,6,7,7,8`, and the 16th is still 8.
  - Geode shelled: first strike → `shellBreak`, n = 0, not a dud, points = 5; second strike → shatters.
  - Prism at (5,0) with current note 2, plus 2 green and 1 red within 3.5 of it, plus 1 red far away → strike green: n = 4 (prism + 2 green + red-in-blast), the far red is alive.
  - Close call: a crystal at `rho = HALO_R + r + 1.0` → `close`, +20 × mult.
  - Choir: 7 matching + 2 others within `CHOIR_R` + 1 other at rho 8 → `choir` event, swept = 2, points include `10·49 + 500 + 2·50`, the far crystal is alive.
  - Splitter of note 1 with K = 4 → `spawnChild` called twice with note 2; with note 3 and K = 4 → children note 0.
  - Mend with cracks = 2 → cracks 1 + `mend`; with cracks = 0 → no `mend` event, but it still counts in n.
  - Crystals with `rho > TARGETABLE_R` are not hit.

---

## M2 — Sim part 2: spawner, sim loop, determinism

**Files:** `src/sim/{spawner,sim,tutorial,attract}.ts`, `tests/{spawner,sim,determinism}.test.ts`.

**Implement:** A §5.3–§5.5, D §5 contact/crack/flare/grace/game over, D §7.3–§7.5. `tutorial.ts` contains the script data for D §11 steps 1–7 (no UI yet). `attract.ts` contains the pilot.

**Done when:**
- [ ] Balance sanity test with an **urgent bot** (whenever it is free, it presses; it releases as soon as the dial is on the note of the crystal closest to the bell): over 20 seeds, the median survival is ≥ 60 s and every run ends in game over within 15 minutes of sim time. If this fails, do **not** change any D numbers: report the measured median in spec-notes and set the threshold to the measured median minus 10 s, with a comment.
- [ ] `npm run check` passes.

**Tests:**
- `spawner.test.ts`: the first formation is a Pair at 1.0 s; the field never exceeds `fieldCap + 2` over 5 sim-minutes for 20 seeds (with the bot); no formation unlocked above the current level is ever chosen; Spiral/Ring crystals never roll specials; at most one Prism alive; Mend never spawns when cracks = 0; the tone bag gives each active note exactly once per K draws; no special kind appears before its level.
- `sim.test.ts`: a crystal reaching the halo → `crack`, cracks 1, streak 0, every crystal with `rho ≤ 3.6` removed; within 1000 ms a second contact → `graceHit`, not a crack; the third crack → `gameOver` exactly once, and then `step` returns no events; level-ups at 20 s (`newNote: null`), 40 s (K becomes 4, `newNote: 3`), 80 s (K becomes 5, `newNote: 4`); an idle run (no input) ends between 12 s and 40 s for 20 seeds.
- `determinism.test.ts`: the same seed + the same recorded input timeline (tick-stamped presses/releases) → an identical `stats` and `hymn` and an identical crystal state hash at tick 3600; different seeds → different hashes; the daily seed for `'2026-10-27'` is stable.

---

## M3 — Renderer foundation (the cathedral)

**Files:** `src/render/{renderer,fxConfig,quality,camera,background,floor,bell,glyphs}.ts`, `src/render/shaders/{background,floor,bell,halo}.ts`, update `src/main.ts`.

**Implement:** SG §3.2 (bell, halo, halo dial, crack decals: draw all 3 crack textures now, revealed by a uniform), §3.3 (background + floor, level-up sweep uniform), §4.2 (renderer, composer, all post effects, camera fit), §4.3 (tiers + auto-tier). `fxConfig.ts` holds every visual constant from SG as named exports. `main.ts` creates the renderer and the loop and renders the empty arena with the bell idling (inner glow breathing between notes 0..2 at 0.5 Hz, just for this milestone; remove the breathing in M4 when the dial drives it).

**Done when:**
- [ ] Code review against SG §3.2/§3.3/§4.2: all listed uniforms and constants present; HDR half-float composer; bloom + vignette + tone mapping in one pass, CA + noise in a second (disabled on Low).
- [ ] The camera fit function is pure (`fitCameraDistance(fovDeg, aspect, boxW, boxH, radius)` exported from `camera.ts`) and unit-tested.
- [ ] `npm run check` passes (the build includes three/postprocessing).

**Tests:** `tests/camera.test.ts`: for aspect 390/844 the width limits the fit (the distance grows as the aspect narrows); for aspect 16/9 the height limits the fit; the result is monotonic in radius.

---

## M4 — Crystals, input, controller: first playable

**Files:** `src/render/crystals.ts`, `src/render/shaders/crystal.ts`, `src/input/input.ts`, `src/game/controller.ts` (run mode only for now: auto-starts a normal run on load, restarts 1 s after game over), update `main.ts`.

**Implement:** SG §3.1 in full (all 6 kinds, danger pulse, spawn easing, motion), A §8 (input) and A §11 (run part). Bell tint/glow follows `state.dial` (spring, SG §6.3). Halo dial arcs light up for active/current notes. Crystals that the sim removed by shattering get a white 50 ms flash and disappear (shards come in M5).

**Done when:**
- [ ] Holding anywhere climbs the dial (visible in the halo dial + bell tint); releasing strikes; crystals of that note disappear; contact cracks the bell (crack decals revealed); the 3rd crack ends the run and a new run starts after 1 s.
- [ ] Keyboard (Space) works the same as touch.
- [ ] No allocations in `crystals.ts` `update()` (review: no `new`, no array literals, no closures inside the loop).
- [ ] `npm run check` passes.

**Tests:** `tests/input.test.ts` with a minimal fake `EventTarget`-based surface (no DOM library: build a tiny object with `addEventListener`/`dispatch` and `setPointerCapture` no-ops): press+release between two `consume()` calls yields `{press:true, release:true}`; a second pointer is ignored; `pointercancel` yields a release; `cancelHold()` yields `{cancel:true}`.

---

## M5 — Juice: shards, rings, threads, hitstop, shake, the Choir

**Files:** `src/render/{shards,sparks,rings,threads,juice}.ts`, `src/render/shaders/{shard,ring,thread,spark}.ts`; update `crystals.ts` (ghosts + pending bursts + fracture-line progress), `renderer.ts`, `controller.ts` (pass `loop` to juice).

**Implement:** SG §3.4–§3.6, §5 (Choir frame by frame, every row), §6.1 (hitstop ladder, `max` rule, cap 180 ms), §6.2 (trauma + value noise, Settings multiplier), §6.4 (all squash/stretch/anticipation/tremble/wobble/recoil), plus game over: 250 ms freeze → the bell bursts into shards (bell-glass coloured) → 0.3× for 900 ms. The reduced-motion variants from SG §10 are wired to a `reducedMotion` flag (the settings UI comes in M10; read it from `save` defaults or `matchMedia` for now).

**Done when:**
- [ ] Every row of the SG §5 table has corresponding code (comment each block with `// SG§5 f0`, `// SG§5 f1–f9`, …).
- [ ] A shatter of N crystals freezes for `min(160, 30 + 14N)` ms (+20 with a close call), via `loop.freeze`.
- [ ] Shards spiral into the bell after 0.45 s and brighten it; the pool caps by tier and recycles the oldest.
- [ ] Reduced motion: no shake, no slow-mo, no harvest spiral, flash ≤ 0.12, as SG §10.
- [ ] `npm run check` passes.

**Tests:** `tests/juice.test.ts` (pure helpers exported from `juice.ts`): `freezeMsForStrike(1,false) === 44`, `(6,false) === 114`, `(7,false) === 160`, `(3,true) === 92`, `(9,true) === 180` (cap); `traumaForStrike(3) === 0.22`, `traumaForStrike(20) === 0.45`; `shake(trauma)` = trauma²; trauma decays to 0 after 1 / 1.6 s from 1.0; `reducedMotion` → `effectiveShake = 0`.

---

## M6 — HUD, bottom dial, pop text, banners, pause

**Files:** `src/ui/{dom,icons,hud,dialBar,popText,banners}.ts`, `src/ui/screens/pause.ts`, CSS in `src/styles/main.css`; update `controller.ts` (pause/resume + 3-2-1 countdown, auto-pause on `visibilitychange`), `renderer.ts` (export `project(x,y)`).

**Implement:** SG §9.1–§9.3 and §9.5 (icons), §6.5 (pop text), D §9 (pause), D §11 contextual tips (the banner system + text ids; first-seen detection via `spawn` events and `levelUp.newNote`), D §8 HUD feedback. Hearts are bell glyph SVGs. The multiplier chip is hidden at ×1. The hint text `Hold anywhere · let go to sing` shows during the first 3 runs while not holding.

**Done when:**
- [ ] The portrait layout matches the SG §9.2 diagram (top HUD band, bottom dial, safe areas); landscape/desktop rule applied.
- [ ] Every text string shown is exactly as written in D (search the D strings in the source).
- [ ] The pause button (44×44) works; Escape/P pauses; Resume runs the countdown; the game auto-pauses when hidden.
- [ ] All HUD animation uses `transform`/`opacity` only.
- [ ] `npm run check` passes.

**Tests:** `tests/banners.test.ts`: the queue shows one at a time, each for 3 s; an already-seen tip id is never queued again; tips off → nothing queued. (Test the queue logic as a pure class that takes a `now()` and a `seen` set.)

---

## M7 — Audio

**Files:** `src/audio/{audio,bellSynth,samples,music,scales}.ts`, `tests/scales.test.ts`; update `main.ts` (unlock on the first gesture, suspend/resume on visibility).

**Implement:** A §6 in full and SG §8 (exact gains, rates, sample tiers, strum offsets, Choir chord, ducking, limiter, generative music with 4 layers by level, game-over slowdown). Sample files: `public/audio/` (names in `CREDITS.md`). Load them with `fetch(import.meta.env.BASE_URL + 'audio/' + name)`.

**Done when:**
- [ ] Every event in A §6.6 produces its sound.
- [ ] No audio call throws before unlock (guard tested via a `null` context path).
- [ ] The voice cap (120 oscillators) is enforced.
- [ ] Scale changes affect dial, strike, chord, music and previews.
- [ ] `npm run check` passes.

**Tests:** `scales.test.ts`: `noteHz` for bright degree 0 = 523.25 (±0.01), degree 3 = 783.99 (±0.01); `degreeToSemis('bright', 5) === 12`, `(…, 7) === 16`; every scale has 5 strictly increasing semitone values in 0..11; `chordDegrees(n, N)` (export it from `audio.ts` or `scales.ts`) for N = 3 from note 0 gives degrees `[0, 2, 4]`, and the length is capped at 7.

---

## M8 — Haptics (Android pattern library + iOS switch)

**Files:** `src/haptics/haptics.ts`, `tests/haptics.test.ts`; update `input.ts` (iOS label/switch per SG §7.3) and `main.ts` (wiring per A §7).

**Done when:**
- [ ] `PATTERNS` equals the SG §7.1 table exactly.
- [ ] Settings → Vibration off silences everything (the toggle UI comes in M10; respect `save.settings.vibration`).
- [ ] On iOS without `vibrate`, the label+switch exists and the `for` attribute follows the setting; on other platforms they are not rendered.
- [ ] `npm run check` passes.

**Tests:** fake `vibrate` + fake clock: `play('tick')` calls `vibrate([8])`; while `crack` runs (busy 125 ms) a `shatter1` is dropped; a `choir` during `crack` plays (higher priority); the same id twice within 50 ms → one call; `tick` is suppressed during a priority ≥ 5 pattern; `enabled = false` → no calls; no `vibrate` → `supported === false` and nothing throws; `hapticForStrike(1|2|3|4|9)` → `shatter1, shatter2, shatter2, shatter4, shatter4`.

---

## M9 — Meta: save, missions, unlocks, daily, run end

**Files:** `src/meta/{save,daily,missions,unlocks,runEnd}.ts`, `tests/{save,missions,unlocks,runEnd}.test.ts`; update `controller.ts` (load save at boot, apply on game over, live `newBestLive`, daily mode with `dailySeed`, `?seed=` / `?daily=1` handling).

**Implement:** A §12.1–§12.3 (except share), D §10 exactly (thresholds, texts, rewards, title rules).

**Done when:**
- [ ] Progress persists across reloads (localStorage), and corrupt JSON doesn't crash (backup + defaults).
- [ ] `npm run check` passes.

**Tests:**
- `save.test.ts`: an empty storage → defaults; a partial object (missing `settings.shake`, wrong type for `bests.score`) → repaired with defaults; invalid JSON → defaults + the `:corrupt` key written; the `daily` map is trimmed to the newest 60 dates on write; `writeSave` swallows a throwing storage.
- `missions.test.ts`: `pickMissions('2026-10-27')` is stable, 3 distinct ids; 30 consecutive days give at least 10 different ids overall; best-in-run types take the max over runs, count types sum; completing one adds 40 shards once; all three adds +100 once (`bonusGiven`); a new date resets progress but keeps lifetime shards.
- `unlocks.test.ts`: 149 shards → only `clear`; 150 → `quartz` unlocked; 5000 → all shard skins; `crown` needs 10 lifetime Choirs; titles `chorister` (first Choir), `cantor` (10,000 in a run), `bellwright` (3:00), `choirmaster` (10 Choirs), `cathedral` (50,000); `nextLockedByShards` returns the cheapest locked shard item (skin or scale) with have/need.
- `runEnd.test.ts`: the first run → `newBest` true with prevBest 0 (the results screen shows `New best!`); a daily run updates `daily[iso].best` only if higher and always increments plays; `daysPlayed` increments once per date; outcome `shardsEarned` = `stats.shards`.

---

## M10 — Screens: title (attract), results, collection, missions, settings, credits; skins

**Files:** `src/ui/screens/{title,results,collection,missions,settings,credits}.ts`; update `controller.ts` (full state machine A §11), `renderer.ts` (`setSkin` for all 7 skins per SG §2.4, including Aurora's animated hue and Rose Window's segmented panels and the Crown's orbiting gems), `audio.ts` (previews).

**Implement:** D §9 (results copy exactly), D §13 (settings, exact labels, immediate save, Reset progress double confirm), D §14 (all screens, attract mode on title), SG §9.3 (panels, buttons). Unlock toasts with `Use it`. The Collection Sounds tab plays a 5-note preview on tap. The Credits panel lists every entry in `CREDITS.md`.

**Done when:**
- [ ] Every D §14 screen is reachable by touch and by keyboard (Tab/Enter), and **Play again** restarts in < 1 s (no awaits on the path except a single animation frame).
- [ ] Changing a setting affects the game immediately (volume, vibration, reduce motion, slow dial, shake, tips).
- [ ] Equipping a skin or scale persists and shows in the next run.
- [ ] `npm run check` passes.

**Tests:** `tests/results.test.ts` for a pure `resultsModel(outcome, stats, save)` (export it from `results.ts`): it returns the exact strings `The bell broke.`, `New best!` / `Best: 12,400`, `Time 2:14`, `+184 shards`, and `Next: Rose Gold bell — 412 / 500 shards`. Use `toLocaleString('en-US')` for thousands separators.

---

## M11 — Tutorial and first-run flow

**Files:** `src/ui/tutorialOverlay.ts`; update `controller.ts` (tutorial mode, using `sim/tutorial.ts`), `sim/tutorial.ts` if needed.

**Implement:** D §11 table steps 1–7 exactly (texts, setups, advancement rules, the 3-fail branch with the actual note name), `Skip` only after first completion, `tutorialDone` saved, "How to play" replays it. The hint text and the locked-note "Unlocks soon" labels during the first run (SG §9.2).

**Done when:**
- [ ] A fresh save goes title → **Play** → tutorial → first real run; a second Play skips the tutorial.
- [ ] Releasing on the wrong note in step 3 shows `That was Yellow. Let go while the dial is on red.` (with the right name).
- [ ] `npm run check` passes.

**Tests:** `tests/tutorial.test.ts`: drive a `Sim` in tutorial mode with the script: step 3 spawns 2 red crystals that stop at rho 5 and never crack the bell after 60 s idle; a red strike shatters both; a wrong-note strike keeps both alive and reports the note; step 5 needs a yellow strike.

---

## M12 — Share text and share card

**Files:** `src/meta/{share,shareCard}.ts`, `tests/share.test.ts`; update `results.ts` (Share button flow per D §12: Web Share with files → text-only → clipboard + `Copied! Paste it anywhere.` + `Save image`).

**Implement:** D §12 exactly; SG §9.4 card layout (fonts awaited, glyph shapes from `render/glyphs.ts`, skin frame colour, title, `Slow dial` tag).

**Done when:**
- [ ] The share text matches the template exactly for daily and normal runs.
- [ ] The card renders at 1080×1350 without layout overflow for a 7-digit score (shrink the score font to fit 900 px width).
- [ ] `npm run check` passes.

**Tests:** `share.test.ts`: `hymnLine([0,0,1,3,10,2,4])` → `🟥🟥🟨🟦✨🟩🟪`; a crack marker → `💔`; 40 symbols → the first 12 + `…` + the last 17; `shareText` for daily #12 / 18420 / N 9 / streak 14 / 134000 ms → exactly:
```
Shatterhymn Daily #12 — 18,420
🟥🟥🟨🟦✨🟩🟪
Most at once: 9 · Streak: 14 · 2:14
Play: https://example.com/?daily=1
```
and a normal run uses `Run` and `?seed=3F9A12C0`; `slowDial` adds `Slow dial · ` before `Play:`.

---

## M13 — PWA, icons, deploy

**Files:** `scripts/make-icons.mjs`, `public/icons/*.png` (generated by running `timeout 120 node scripts/make-icons.mjs`), `public/manifest.webmanifest` (final, A §13.2), `vite.config.ts` (`swPrecache` plugin, A §13.1), SW registration + the update banner in `main.ts`/`title.ts`, `.github/workflows/deploy.yml` (A §13.4), `tests/sw.test.ts`.

**Done when:**
- [ ] `npm run build` emits `dist/sw.js` containing a `CACHE` name and every file in `dist/` (except `sw.js` itself) in `ASSETS`.
- [ ] The icons exist at 192/512/maskable-512/180, are valid PNGs (correct signature + IHDR size), and look like the SG §9.6 description (glass bell + glowing glyphs on `void-1`; no plain squares).
- [ ] The update banner appears only on the title screen.
- [ ] `npm run check` passes.

**Tests:** `sw.test.ts`: import the pure `buildServiceWorkerSource(files, version)` from a helper module (`scripts/sw-template.mjs` or `src/pwa/swTemplate.ts`, your choice) and assert that it includes every file, that the cache name prefix is `shatterhymn-`, and that it has `activate` cleanup and a navigation fallback. Also read the generated PNG headers: signature bytes and IHDR width/height.

---

## M14 — Polish, accessibility, performance, docs

**Files:** any, plus final `README.md` and `CREDITS.md`.

**Do:**
1. **Juice audit** against SG §5–§6: every listed timing exists as a constant and is used; audio, visual and haptic fire on the same frame for strike/shatter/crack/choir.
2. **Reduced-motion audit**: walk SG §10 row by row; each row is a code path guarded by the flag.
3. **Performance audit** against A §14 and SG §4.3: no per-frame allocations in hot loops (search for `new `, `[]`, `{}` and `.map(` in `update`/`frame` functions); the draw-call count is ≤ 16 (add `renderer.info.render.calls` to a `?debug=1` overlay that also shows FPS, tier and alive crystals).
4. **Accessibility**: contrast ≥ 4.5:1 for all text (check the listed colours), `aria-live` banners, buttons with labels, focus rings, every note has shape + colour + pitch, Slow dial works, min 16 px body text.
5. **Copy audit**: every player-facing string is plain, concrete English and matches D. No jargon, no unexplained terms.
6. **Ethics audit** against D §17: no network calls besides the static files, no analytics, nothing expires, no fake numbers.
7. **README.md**: what the game is, how to play (3 lines), `npm install`, `npm run dev`, `npm run check`, deploy notes (Pages), a credits pointer, the inspirations list (Rez/Mizuguchi, Peggle, Wordle, Celeste/Hollow Knight timings), MIT licence for code.
8. **CREDITS.md**: confirm that the audio, fonts (Cinzel — Natanael Gama, OFL 1.1; Inter — Rasmus Andersson, OFL 1.1), libraries (three.js MIT, postprocessing Zlib, Vite MIT) and inspirations are all listed; the in-game Credits panel mirrors it.

**Done when:**
- [ ] All items above are checked and noted in the final message.
- [ ] `?debug=1` overlay works.
- [ ] `npm run check` passes.

**Tests:** `tests/copy.test.ts`: import the string tables (missions, tips, tutorial steps, results model, settings labels) and assert that none contains `TODO`, `TBD`, `lorem` or a double space, and that each is ≤ 120 characters.
