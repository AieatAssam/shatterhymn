# SHATTERHYMN: SLICE RESCUE (R1 to R3)

Owner play-test on build 3643f43, real phone, owner plus a 9-year-old: "Slicing is boring. Tappin got more interesting now. Slicing loses pointer easily and slices need to be more pronounced."

This file overrides `docs/MODES.md` sections 6, 7, 8 and 19 and `docs/POLISH.md` P4.5 to P4.6 where they differ. The lead adds one line to MODES.md (proposed text at the end of this file) so that AGENTS.md precedence holds.

Three sections. Each ships as its own push and stands alone. Order: R1, then R2, then R3. If a later section ships first, it uses the code as it is at that moment. Each section names the shared points it touches.

**Tap stays as it is.** Shared files touched: `src/input/input.ts` (R1), `src/styles/main.css` (R1, one rule), `src/render/juice.ts` (R2, Slice functions only), `src/haptics/haptics.ts` (R2, Slice ids only), `src/audio/audio.ts` (R2, a new Slice method), `src/ui/popText.ts` (R3, a new Slice method). The Tap tests must pass unchanged in every push.

Units used below: **H** = play-area height (sim unit). **W** = aspect = play-area width in H. **S** = `min(1, W)` = the short side of the play area in H. On a 390 x 844 CSS px phone, H = 844 px, W = 0.462, S = 0.462 (S is 390 px). "px" always means CSS px.

---

## R1. "Loses pointer" (top priority)

### R1.1 Evidence: what the code does today

The design keeps the finger, but it **stops cutting** without saying so and then refuses to cut again for the rest of the stroke. To the player the blade feels "lost". There are four confirmed causes in the blade and sim, two confirmed contributors in the trail and input, two plausible platform causes, and nine rejected candidates.

I measured the real `Blade` class (bundled from `src/sim/blade.ts`, standard profile). The samples were synthetic 120 Hz swipes on a 390 x 844 phone with ease-in-out motion, which is how fingers move:

| Swipe (390 x 844 portrait) | Avg speed | Samples armed today | Arms |
|---|---|---|---|
| Slow drag 300 px, 1 s | 300 px/s | 0% | 0 (correct) |
| Kid horizontal, full width 390 px in 500 ms | 780 px/s | **0%** | 0 |
| Horizontal 390 px in 400 ms | 975 px/s | 56% | 1, ends `cooling` |
| Diagonal 583 px in 500 ms | 1166 px/s | 58% | 1, ends `cooling` |
| V shape, 2 legs of 400 px, 300 ms each | 1333 px/s | 36% | 1 |
| Zigzag, 4 legs of 300 px, 250 ms each | 1200 px/s | **18%** | 1 |
| 1.5 s continuous, 6 legs of 300 px | 1200 px/s | **11%** | 1 |

With the R1 rules below, the same swipes are armed 0%, 78%, 81%, 85%, 93%, 96%, 97%. The slow drag still never arms.

#### Confirmed causes

1. **The cooling trap. Confirmed.** `src/sim/blade.ts:37`: in `cooling`, any sample at or above `disarmHps` sets `slowSince = null`. The blade only returns to `ready` after 100 ms *in a row* below 0.9 H/s (`rearmSlowMs`, `src/sim/sliceConfig.ts:1`). A child who keeps moving, or who turns a zigzag without stopping, never gets 100 ms of slow movement. The 64 ms speed window smooths each turn to about 40 to 70 ms below threshold. So after the first disarm or budget end, the rest of the stroke is dead. The tests lock this in: `tests/blade-regression.test.ts:23` "limits a continuous five-second wiggle to one arm" (expects `cooling`), and `:24` "rearms after a 250 ms slow phase, not after 120 ms". This is the main "loses pointer" cause.
2. **The speed thresholds are measured in screen heights, so portrait sideways swipes must be very fast. Confirmed.** `src/sim/blade.ts:34` computes the speed in H/s (`toWorld` divides by `area.height`, `src/modes/slice/playArea.ts:6`). `armHps 1.4` and `disarmHps 0.9` (`sliceConfig.ts:1`) are 1182 px/s and 760 px/s on an 844 px tall phone. The whole screen width is only 0.46 H, so a full-width sideways swipe has to finish in under about 330 ms just to arm. Normal kid swipes run at 600 to 1200 px/s. Each slows down near the end and at every turn, and drops below 760 px/s, which disarms it (cause 1 then keeps it off).
3. **The 350 ms per-arm budget is too short and counts from before arming. Confirmed.** `blade.ts:35` sets `armStart = w`, the start of the back-filled window, up to 64 ms *before* arming. `blade.ts:41` ends the arm at `armStart + 350`. So a swipe cuts for at most about 286 to 350 ms after it arms, which is about 400 px at arming speed. A normal diagonal swipe over 400 px loses its last part. After that, cause 1 means it never re-arms.
4. **The 6-cuts-per-arm cap fails silently while the trail stays bright. Confirmed.** `src/sim/sliceSim.ts:23`: `if((this.cuts.get(key)??0)>=SLICE_BLADE.maxCutsPerArm)break;`. The blade is still `armed`, so `sliceMode.ts:21` keeps sending `armed=true` to the ribbon. The bright blade passes through crystals and nothing happens.

#### Confirmed contributors (they make causes 1 to 4 feel like "lost")

5. **The inert trail does not say why it stopped, and it detaches. Confirmed.** `src/render/blade.ts:9` draws every non-armed point as 5 px lavender at alpha `.55 × (1 - age/320)²` (`shaders/blade.ts` fragment). `ready`, `cooling` and "spent" all look the same. When the finger holds still, no new points arrive and the trail fades out in 320 ms, so nothing marks the finger. `render/blade.ts:8` keeps only 32 points with no decimation. With coalesced touch at 120 to 240 Hz, that is a 133 to 267 ms trail, so the bright blade is short. `add()` has no stroke id, so a new touch joins the old stroke's tail with a straight streak.
6. **A second finger is ignored for the whole stroke. Confirmed in code, a likely contributor with a child's grip.** `src/input/input.ts:27`: `if(this.pointer!==null)return;`. If a thumb or palm rests on the screen first, or a child swipes with one finger while another still touches, every real swipe is ignored: no trail and no cut.

#### Plausible platform causes (not provable without the device; R1 hardens against them)

7. **OS edge gestures cancel the touch.** On Android with gesture navigation, a sideways swipe that starts within about 24 px of the left or right edge becomes "Back". iOS Safari in a tab does the same at the left edge. The page gets `pointercancel`. The code treats this as a lift (`input.ts:29`, see the rejected item on stuck state), so the cut stops mid-swipe. No web API can stop these gestures. The mitigation is that `pointercancel` keeps the stroke's combo and a new touch works at once.
8. **iOS long-press callout and selection.** `main.css:10` sets only unprefixed `user-select: none`. iOS Safari needs `-webkit-user-select: none` and `-webkit-touch-callout: none`. A child who presses, waits and then swipes can trigger the callout or loupe, which cancels the pointer.

#### Rejected candidates (with evidence)

| Candidate | Verdict | Evidence |
|---|---|---|
| `touch-action` not `none` | Rejected as a cause | `main.css:10` sets `touch-action: none` on `html, body`. The effective touch action is the intersection with all ancestors, so `#app`, `#surface` and `#gl` get `none`. MODES.md 7.2 asks for it on `#surface` too and it is missing, so R1 adds it to harden. |
| `overscroll-behavior` / pull-to-refresh | Rejected | `main.css:10` `overscroll-behavior: none` on `html, body`, `:9` `overflow: hidden`. No scroll container in a run. |
| No `setPointerCapture` | Rejected | `input.ts:27` calls `this.surface.setPointerCapture?.(e.pointerId)`. |
| Stuck state after `pointercancel` | Rejected | `input.ts:29`: `pointerup`, `pointercancel` and `lostpointercapture` all call `endStroke`, which clears `pointer` and calls `blade.end()`. The next `pointerdown` starts at once. R1 adds the missing test. |
| Listeners on the wrong element / overlays swallowing moves | Rejected | Listeners are on `#surface`. `#hud, #screens` have `pointer-events: none` (`main.css:14`). The only `auto` element in a run is `.pause-button` (44 px, top right, `:22`). `flashOverlay` and `choirText` are `pointerEvents: "none"` (`renderer.ts:56-57`). `.demo` is `pointer-events: none`. With capture, moves over the HUD still reach `#surface`. |
| `pointerleave` / `pointerout` ending the stroke | Rejected | Not listened to anywhere in `src/input`. |
| Passive `touchmove` / missing `preventDefault` | Rejected | No touch listeners. Pointer events plus `touch-action: none` is the correct path, and `preventDefault` on `pointermove` would not change scrolling. |
| Coalesced events not used | Rejected | `input.ts:28` loops over `getCoalescedEvents()` and falls back to `[e]`. It has no test, so R1 adds one. |
| Time base (`event.timeStamp` vs `performance.now`) | Rejected | Blade speed uses only event `timeStamp`s (`input.ts:8`), and each coalesced event carries its own. The ribbon compares those stamps with `performance.now()/slowmo` (`renderer.ts:136`, `controller.ts:40`). Both share `timeOrigin`. Equal stamps add path but not time (`blade.ts:28`), and `minSpanMs 32` stops spikes. 120 Hz and batched input give *more* samples, not lower speeds. |
| DPR / CSS px vs canvas px | Rejected | Input uses `clientX/Y` (CSS px). `playArea` uses `innerWidth/innerHeight` (CSS px). The ribbon converts px with the same CSS height (`renderer.ts:136`). No `devicePixelRatio` in the path. |
| Hitstop freezing the blade | Rejected | `loop.ts:32-35` stops sim ticks only. Pointer events still reach the blade, segments queue, and the ribbon uses real time. |

### R1.2 The fix in one paragraph

Speed thresholds move from screen heights to **short sides per second**. The blade re-arms **the moment the finger is fast again**, with no slow-down wait. The per-arm time and path budgets are removed. The anti-wiggle guarantee moves into the sim as a **per-stroke cut budget**: 6 cuts, refilled slowly with time and fully on lift. On top of that the existing hard cap of 6 cuts per armed burst stays. When the budget or the burst cap runs out, the blade shows a distinct **"lift to slice again"** look instead of failing silently. The trail always stays attached to the finger and has three looks: cutting, too slow, and lift to slice again. The newest finger wins.

### R1.3 Config (`src/sim/sliceConfig.ts`)

```ts
export const SLICE_BLADE = {
  windowMs: 64, minSpanMs: 32,          // unchanged
  armSps: 1.5,                          // short sides per second to start cutting (390 px phone: 585 px/s)
  disarmSps: 0.8,                       // below this, cutting stops ("too slow") (390 px phone: 312 px/s)
  maxCutsPerArm: 6,                     // unchanged hard cap per armed burst, enforced by the sim
  budget: { cap: 6, refillMs: 800 },    // per-stroke cut budget, enforced by the sim
  radius: { touch: 0.020, pen: 0.020, mouse: 0.012 }, tapMaxPathH: 0.03,
  trailPoints: 64,
} as const;
export const BEGINNER_BLADE = { armSps: 1.3, disarmSps: 0.7 } as const;
```

Removed: `armHps`, `disarmHps`, `maxArmMs`, `maxArmPathH`, `rearmSlowMs`, `BEGINNER_BLADE.rearmSlowMs`.

Thresholds in H/s are `armSps × S` and `disarmSps × S`, with `S = min(1, aspect)`:

| Screen | S | Arm | Too slow below |
|---|---|---|---|
| 390 x 844 portrait | 0.462 | 0.693 H/s = 585 px/s | 0.370 H/s = 312 px/s |
| 844 x 390 landscape | 1 | 1.5 H/s = 585 px/s | 0.8 H/s = 312 px/s |
| Test board, aspect 1 | 1 | 1.5 H/s | 0.8 H/s |

A slow drag at 0.5 H/s cuts nothing on the aspect 1 test board (needs 1.5) and nothing in portrait (needs 0.693). Tap-mode drags never reach Slice.

### R1.4 Blade (`src/sim/blade.ts`, still pure)

`new Blade(profile: 'beginner' | 'standard' = 'standard', aspect = 1)`. Store `armH = armSps × S` and `disarmH = disarmSps × S`. `SliceMode.start` (`src/modes/slice/sliceMode.ts:18`) passes `this.sim.state.aspect`.

States: `up`, `ready`, `armed`, `slow` (renamed from `cooling`), `spent`.

| From | Condition, checked after each sample | To | Action |
|---|---|---|---|
| `up` | `begin()` | `ready` | new stroke id |
| `ready` | `speed >= armH` | `armed` | new arm id; back-fill from window start `w` (as now) |
| `armed` | `speed < disarmH` | `slow` | none |
| `armed` | otherwise | `armed` | emit segment prev to current (no time or path clip) |
| `slow` | `speed >= armH` | `armed` | **instant re-arm**, new arm id, back-fill from `w` |
| any but `up` | `spend(arm)` from the sim (R1.5) for the current arm | `spent` | none |
| `spent` | `budgetReady === true` and `speed < disarmH` | `slow` | none (the next fast flick re-arms) |
| `armed` | dark hit for this arm (`stopArm`) | `slow` | as now |
| any | `end()` | `up` | report `strokeEnded` |

- `spend(arm: number): void` sets `spent` if `arm === this.arm` and the state is not `up`.
- `setBudgetReady(ready: boolean): void` is set by `SliceMode` after every sim tick from `sim.state.budget >= 1`.
- `emit()` loses its time and path clip and keeps the radius and speed fields.
- `trail` records `mode: 0 | 1 | 2 | 3` per sample instead of `cutting` (0 = ready, 1 = armed, 2 = slow, 3 = spent).
- `speedSps` getter = `speedHps / S`, for the renderer and QA.

Why a continuous wiggle still cannot clear the screen: each armed burst has at most 6 cuts (sim), and every cut in the stroke uses one budget token. A stroke can never cut more than `6 + floor(strokeMs / 800)`, and lifting is the only full refill. A fast circle that never slows is one arm, so 6 cuts.

### R1.5 Sim budget (`src/sim/sliceSim.ts`, `src/sim/sliceTypes.ts`)

- `SliceState` gains `budget: number`, starting at `SLICE_BLADE.budget.cap`.
- Each `step()`: `budget = min(cap, budget + SIM_DT_MS / refillMs)` (so no refill during hitstop, when no tick runs).
- New stroke id seen in a segment, or `strokeEnded !== null`: `budget = cap`.
- In the hit loop, before each cut: if the arm already has `maxCutsPerArm` cuts **or** `budget < 1`, push `{ type: 'spent', stroke, arm, reason: 'arm' | 'budget' }` once per arm, then `break`. Otherwise `budget -= 1` and cut as now.
- `SliceEvent` gains `| { type: 'spent'; stroke: number; arm: number; reason: 'arm' | 'budget' }`.
- `SliceMode.tick()` (`sliceMode.ts:23`): on `spent` with `e.stroke === blade.stroke` call `blade.spend(e.arm)`. After the event loop call `blade.setBudgetReady(sim.state.budget >= 1)`.
- Dark hits keep the existing block: the arm is blocked and `stopArm` is called.

Deterministic: the budget only depends on ticks and inputs.

### R1.6 Input (`src/input/input.ts`, shared with Tap; Tap behaviour unchanged)

1. **Newest finger wins.** In `pointerdown`, when `strokeHandlers` is set and `this.pointer !== null` with a different `pointerId`: call `releasePointerCapture?.(old)` inside try/catch, call `endStroke(e.timeStamp / divisor)` (a normal lift, so the combo is kept), then start the new stroke with this pointer. Tap (`onTap` path) is untouched.
2. **Capture errors.** Wrap `setPointerCapture` in try/catch. On failure, keep the stroke: with `touch-action: none`, moves still reach `#surface`.
3. **Cancel.** `pointercancel` keeps ending the stroke like `pointerup`. No other change. A test proves a new touch works at once (R1.9).
4. No change to coalesced handling, apart from the new test.

### R1.7 CSS (`src/styles/main.css`)

Add exactly one rule:

```css
#surface, #gl { touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
```

and extend line 10 to `html, body { touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; overscroll-behavior: none; }`.

### R1.8 The trail always stays on the finger (`src/render/blade.ts`, `shaders/blade.ts`, `renderer.ts`)

Renderer API changes:
- `bladePoint(x, y, time, speedSps, mode)`, where `mode` is the blade trail mode 0 to 3. `sliceMode.ts:20-21` passes `blade.speedSps` and the mode.
- `bladeBegin()` clears the ribbon points, so a new stroke never joins the old tail. Called from `SliceMode.begin`.
- `bladeEnd()` hides the head ring. Called from `SliceMode.end`.

Ribbon storage:
- 64 points, so 128 vertices and 378 indices, still one draw call.
- A new sample becomes a new point only if it is at least 3 px from the last point or at least 12 ms after it. Otherwise it **overwrites** the last point's position, time, speed and mode, so the head is always exactly at the finger.
- New per-vertex attributes `aMode` (float) and `aAlong` (float, px distance from the head, for dashes).

**Head ring (keeps the blade visibly attached even when the finger is still):** while a stroke is down, every frame draw `glow.ring` at the last finger position (existing `GlowQuads`, no new draw call). Its look depends on the current mode:

| Mode | Meaning | Trail width | Trail colour, alpha | Life | Pattern | Head ring |
|---|---|---|---|---|---|---|
| 0 `ready` | finger down, not cutting yet | 6 px | `#CFC8FF`, .45 | 200 ms | solid | radius 12 px, 2 px line, `#CFC8FF` .6 |
| 1 `armed` | cutting | R2 look (today: as now) | | 220 ms (R2: 260) | solid | radius 14 px, 3 px line, `#FFFFFF` .9 |
| 2 `slow` | "too slow" | 6 px | `#B9B3E6`, .55, HDR 0.9 (no bloom) | 260 ms | solid | radius 12 px, 2 px line, `#B9B3E6` .7 |
| 3 `spent` | "lift to slice again" | 5 px | `#7C7799`, .50 | 260 ms | **dashed**, 10 px on, 8 px off (from `aAlong`) | radius 16 px, 2 px line, `#7C7799`, alpha pulsing .35 to .8 at 3 Hz (steady .6 with reduced motion) |

The colours are style-guide neutrals (`#A59FC9` family). Inert modes never bloom, so cutting always stands out.

**Tip:** the first time a stroke goes `spent`, enqueue a new tip `lift: "Lift your finger to slice again!"` in `src/ui/banners.ts` `TIPS`. It is shown through the existing Slice banner path (`controller.ts:90`), once ever, at the existing banner position. Add the string to the copy test table.

### R1.9 Tests

`tests/blade.test.ts` (new file; the old cases move here from `blade-regression.test.ts`). Helpers: samples every 8 ms. `tickDrive(blade, sim, samples)` drains the blade and steps the sim once per 16.667 ms of sample time, so the budget refill is real. Portrait cases use `new Blade('standard', 390/844)`.

| Test name | Setup | Expect |
|---|---|---|
| `slow drag cuts 0 (aspect 1)` | 0.5 H/s across 3 crystals, test board aspect 1 | 0 cuts, never `armed`, no segments |
| `slow drag cuts 0 (portrait)` | 0.6 H/s across 3 crystals, aspect 390/844 | 0 cuts, never `armed` |
| `kid sideways swipe arms in portrait` | 390 px in 500 ms, ease-in-out, aspect 390/844 | armed within the first 120 ms, `armed` in at least 70% of samples, 3 of 3 crystals in its path cut |
| `instant re-arm on a fast flick` | 3 S/s for 200 ms, 40 ms at 0.2 S/s, 3 S/s over a fresh crystal | fresh crystal cut, `arm === 2`, never lifted |
| `wiggle bound: triangle` | 5 s triangle wiggle at 3 H/s, amplitude 0.8 H, 24-crystal grid, aspect 1, `tickDrive` | no arm has more than 6 cuts; total at most 12 |
| `wiggle bound: sine` | 5 s sine, amplitude 0.4 H, 2 Hz | total at most 12 |
| `wiggle bound: stop at every turn` | triangle wiggle with a 100 ms stop at each end | total at most 12; blade reaches `spent` at least once |
| `synthetic long fast swipe` | 1.5 s continuous zigzag (6 legs of 300 px, 390 x 844, aspect .462), 6 crystals on the path, 2 in each third | `armed` in at least 90% of samples; all 6 cut, including both in the last third; ribbon head equals the last sample after every sample |
| `budget refills over time and on lift` | spend 6, tick 800 ms, swipe | 1 more cut, then `spent`; lift and a new stroke: 6 available |
| `burst cap reports spent` | 10 crystals packed on a 0.6 H path at 3 H/s | exactly 6 cut; one `spent` event with reason `arm`; `blade.state === 'spent'` |
| `dark hit stops the arm` | as old case 14 | as now, state `slow` |
| `units use the short side` | the same px swipe on 390 x 844 and 844 x 390 | the same arm decision |
| `config values` | `SLICE_BLADE` equals R1.3; `disarmSps < armSps` | |

`tests/input.test.ts` additions (fake `EventTarget` surface, as now):

| Test name | Expect |
|---|---|
| `pointer capture on stroke start` | `pointerdown` calls `setPointerCapture(pointerId)` once |
| `capture failure keeps the stroke` | `setPointerCapture` throws; following moves still reach `move` |
| `pointercancel recovery` | down, 3 moves, `pointercancel`: `end` called once; an immediate `pointerdown` with a new id calls `begin` (no stuck state); `lostpointercapture` after cancel does not call `end` twice |
| `coalesced samples` | one `pointermove` whose `getCoalescedEvents()` returns 4 events with stamps 1, 2, 3, 4 gives 4 `move` calls in order with those stamps; an empty list falls back to the event itself |
| `newest finger wins` | down id 1, down id 2: `end` for stroke 1, `begin` for stroke 2; moves of id 1 are ignored afterwards |
| `tap path unchanged` | with no stroke handlers, `pointerdown` calls `onTap` only |

Remove or rewrite: `blade-regression.test.ts:19-26` and `:55`, `slice-core.test.ts:8` (constants) and `:10` (beginner case becomes "1.4 S/s arms in beginner runs only"), `slice-aim.test.ts:7` (constants) and `:32-33` (keep the 6-cap case; the wiggle case uses `tickDrive` and a total of at most 12). `tests/copy.test.ts` gains the `lift` tip.

QA: `.blade()` returns `{ state, speedHps, speedSps, strokeCuts, budget }`. `state` can now be `slow` and `spent`. MODES.md 19.4 step 5 becomes "at most 12 cut in 5 s, at most 6 per arm".

### R1.10 Acceptance (lead and owner)

1. `timeout 300 npm run check` passes. Tap tests are unchanged.
2. Lead, Playwright touch through CDP on 390 x 844: MODES.md 19.4 steps 1 to 4 give the same results, and step 5 gives at most 12 cuts.
3. Owner and child on the phone, `?qa=1&mode=slice&waves=0`, `sliceTestBoard()`: ten relaxed sideways swipes cut the row at least 8 times out of 10. A slow drag across the row cuts nothing. A long zigzag keeps a bright blade on every leg.
4. Holding the finger still shows the head ring under the finger. A frantic scribble turns the trail dashed grey with the "Lift your finger to slice again!" tip once.

---

## R2. More pronounced slices

Goal: every cut reads clearly at real speed in a plain 30 fps or 60 fps screen recording, with no slow motion. Keep the P1 glowing cut face exactly. No new draw calls (the budget stays at 20 or fewer). Every number lives in `SLICE_FX` in `src/render/fxConfig.ts`, under a new key `rescue`.

Speeds below are `speedSps` (short sides per second, R1). If R1 has not shipped, use `speedHps / min(1, aspect)` computed in the renderer.

### R2.1 Blade ribbon, armed look (`src/render/blade.ts`, `shaders/blade.ts`)

- **Width at the head** (px, the same at any screen width; numbers given for 390 px wide): `w = clamp(16 + 8 × (speedSps - 1.5), 16, 30)`. So 16 px at arming speed (585 px/s on a 390 px phone), 24 px at 2.5 S/s, 30 px at 3.25 S/s and above. Reduced motion: capped at 22 px.
- **Taper:** `w × (1 - age / 260)^0.6`. Armed life **260 ms** (was 220). At 1000 px/s that gives a trail about 260 px long, two thirds of the screen width.
- **Geometry half-width = 0.9 × w** (the extra margin is the soft glow).
- **Fragment**, with `d = |vEdge|` from 0 at the centre to 1 at the outer edge:
  - `core = 1 - smoothstep(0.0, 0.22, d)` gives the hot white core, `#FFFFFF` at HDR 3.0.
  - `body = exp(-6 d²)` in `uEdgeColor × 1.6`.
  - `colour = mix(uEdgeColor × 1.6, vec3(3.0), core)`, `alpha = vAlpha × max(core, body)`.
- **Edge colour:** default warm gold `#FFC56B` (was `#FFE2A8`, too pale on the violet stage). While `chainStep >= 2` it takes `NOTE_COLORS[note]`, as now.
- Alpha along the trail `(1 - age / life)^1.5` (was squared: the tail stays visible longer).
- When R1 is present, its inert modes keep their R1.8 looks. Without R1, non-armed points keep today's look.

### R2.2 Slash line across each cut crystal (replaces `sliceFlashes` in `renderer.ts:96, :136`)

On every `cut`, push a slash record. Draw it each frame with `glow.streak` (the existing quad batch, no new draw call). Each slash is two streaks:
- **Glow streak:** `NOTE_COLORS[note]`, width 22 px.
- **Core streak:** `#FFFFFF` at HDR 2.5, width 6 px.
- **Line:** through the crystal centre along `(dirX, dirY)`. Length `L = min(0.42, 0.30 + 0.03 × (k - 1))` H (253 px at k = 1 on an 844 px tall phone, 354 px at k = 5). In portrait that is wider than the crystal (127 px) by a clear margin.
- **Timeline (real time):**
  - 0 to 40 ms: draws on from the entry side to full length (head moves along `d`).
  - 40 to 120 ms: holds at full alpha.
  - 120 to 320 ms: alpha `(1 - u)²`, and width shrinks to 40%.
  - Total life **320 ms**.
- **Pool:** 12 slashes. When full, recycle the oldest.

### R2.3 Hitstop (`src/render/juice.ts`)

`sliceHitstopMs(k, chainStep) = clamp(40 + 6 × (k - 1) + 4 × (max(1, chainStep) - 1), 40, 70)`. So k = 1 gives 40 ms, k = 3 gives 52 ms, and k = 5 with chain 5 gives 70 ms. Keep the stacked cap of 160 ms per 500 ms and the reduced-motion cap of 40 ms per freeze. Dark hit 100 ms and Choir 120 ms stay unchanged. Update `slice-fx.test.ts:10` to `[1,2,4,8].map(k => sliceHitstopMs(k, 1))` = `[40, 46, 58, 70]` and `sliceHitstopMs(5, 5)` = 70.

### R2.4 Screen flash and punch

- **Flash:** reuse `flashOverlay` (`renderer.ts:56`, a DOM element, no draw call) with a radial gradient at the cut point in the note colour. Peak opacity `min(0.22, 0.10 + 0.03 × (k - 1))`, instant attack, quadratic decay over 140 ms.
  - Photosensitivity: at most 3 flash peaks per second, so peaks at least 333 ms apart. Cuts in between rely on the slash line.
  - Reduced motion: peak × 0.5, same rate limit.
- **Punch (directional kick, not random shake):** a camera offset along the cut direction `(dirX, dirY)`. Amplitude `min(8, 4 + 1 × (k - 1))` px converted to world units (`px / H × 10`). Out in 30 ms, back with a critically damped spring of about 120 ms. It is multiplied by the Screen shake setting (`juice.shakeMultiplier`). Reduced motion: 0.
- **Trauma:** `sliceCut` uses `trauma += 0.10 + 0.03 × k` (was `.08 + .025 k`), keeping the existing cap of 0.8.
- Implement in `Juice` as `sliceCut(k, chainStep, dirX, dirY)`. `kickX` and `kickY` are added to the existing `offsetX/offsetY` getters, and only Slice calls them.

### R2.5 Split halves fly apart (`src/render/crystals.ts:79-85`)

- Impulse along the cut normal: `side × n × 9.0` u/s, which is **0.9 H/s** (was 4.5 u/s).
- Push along the swipe: `d × 5.0 × min(speedSps, 3) / 3` u/s, so up to 0.5 H/s (was 3.0 u/s).
- Spin: `side × (6 + (id % 5))` rad/s, so 6 to 10 rad/s (was 4 to 8).
- Scale: start at 1.10 × crystal radius × 10 and ease to 1.0 by 120 ms (a "pop"), then the existing `halfScale` decay to 0.85 at 900 ms. Change `halfScale(age)` accordingly and update its test.
- Life stays 900 ms, with full alpha until 650 ms, so each half is clearly visible for at least 400 ms. The P1 tumble and cap glow are unchanged.
- Gravity stays at 1.2 g.

### R2.6 Juice splash in the crystal's colour (`src/render/shards.ts`)

- New method `splash(x, y, note, count, nx, ny)` on the existing `Shards` pool (same mesh, no draw call). Count by tier: high 18, medium 12, low 8; reduced motion takes half (ceil).
- Directions: 70% within ±35° of the cut normal (both sides, split evenly) and 30% within ±25° of the swipe direction.
- Speed 0.6 to 1.4 H/s, size 6 to 12 px, life 450 ms, gravity 1.0 g.
- Colour: `NOTE_COLORS[note]` body with the note's core colour on the first 120 ms.
- Splash shards never harvest into the bell.
- Plus a splat: `glow.disc` at the cut point, radius from 0.6× to 1.6× the crystal radius over 220 ms, note colour, alpha 0.7 to 0.
- Keep the existing P1 spill (14/10/6). Replace the existing `shards.burst(..., 12/8/5 ...)` in `renderer.ts:96` with `splash`. Worst case per cut on high tier: 18 + 14 = 32 shards. That is 6 cuts × 32 = 192 shards per burst, well inside the pool of 1600.

### R2.7 Punchy cut sound (`src/audio/audio.ts`)

- New `playSliceHit(k, chainStep)`, synthesised with Web Audio, no new assets. It is called from the existing `bus.on('cut')`. Keep the existing rising bell tone (`sliceDegree(k)`) and `glass-light`.
- Add two layers, both into `this.sfx`, starting at `currentTime + 0.005`:
  1. **Snap:** 30 ms white noise, highpass 1800 Hz, Q 0.7, gain 0.35 with an exponential decay to 0.001 at 30 ms.
  2. **Thwack:** sine, frequency `520 × min(1.6, 1 + 0.06 × (k - 1))` Hz dropping to 0.35 × that over 60 ms, gain 0.30, decay to 0 at 80 ms.
- Rising pitch on chains: when `chainStep >= 2`, multiply the thwack start frequency by `2^((chainStep - 1) / 12)` (one semitone per chain step, capped at 9 steps).
- Voice limit: at most 6 live slice-hit voices; drop the oldest.
- Reuse one preallocated 30 ms noise buffer (create it in `unlock`), so nothing is allocated per cut. The existing `playWhoosh` should use a preallocated buffer too.

### R2.8 Heavier haptics (`src/haptics/haptics.ts`, Slice ids only)

- `slice1` `[18]`, `slice2` `[22]`, `slice3` `[26]`, `slice4` `[28]`. The chain bonus `extraMs` is +4 (was +2) and the 30 ms cap stays.
- `combo` becomes `[20, 40, 26]`.
- Priorities unchanged. The existing `enabled` setting (Settings, Vibration) and the 50 ms same-id throttle are respected.
- iOS: `navigator.vibrate` does not exist, and the iOS switch trick only fires on a click, which a swipe never produces. Slice has no haptics on iOS. This is a platform limit, not a bug; say so in the final message.
- Update `slice-fx.test.ts:11`.

### R2.9 Budget and tiers

| Item | Change | Draw calls |
|---|---|---|
| Ribbon | 64 points (R1) or 32, wider quads | 1 (same) |
| Slashes, splat, head ring | `GlowQuads` | 0 new |
| Splash shards | existing `Shards` pool | 0 new |
| Halves | existing instanced crystal meshes | 0 new |
| Flash | DOM overlay | 0 |

Low tier: splash 8, slash glow streak width × 0.8, everything else the same. `render-tier.test.ts` keeps the count of 20 or fewer.

### R2.10 Tests (`tests/slice-fx.test.ts`, pure, no WebGL)

- `armed ribbon width is 16 px at 1.5 S/s, 24 at 2.5, 30 at 4, reduced motion caps at 22` (export `ribbonWidthPx(speedSps, reduced)`).
- `slash length is 0.30 H at k 1, 0.42 H cap; life 320 ms; alpha 1 at 100 ms, 0 at 320 ms` (export `slashAt(ageMs, k)`).
- `slice hitstop is 40 at k 1, 70 cap, scales with chain`.
- `flash peaks are at least 333 ms apart for 10 cuts in 300 ms` (export a pure `FlashLimiter`).
- `kick is 0 with reduced motion and scales with the shake setting`.
- `halves get 0.9 H/s along the normal and 6 to 10 rad/s spin` (inspect `HalfPool` after `cut`).
- `halfScale pops to 1.10 and is 1.0 at 120 ms, 0.85 of radius at 900 ms`.
- `splash count per tier is 18 / 12 / 8 and halves with reduced motion`.
- `splash shards never harvest and die within 0.5 s`.
- `haptic slice ids are 18 / 22 / 26 / 28 ms, chain +4, capped at 30`.
- `playSliceHit thwack frequency rises one semitone per chain step` (export `thwackHz(k, chainStep)`).

### R2.11 Acceptance (lead)

Record `?qa=1&mode=slice` at 390 x 844, 30 fps, real speed, no `slowmo`, with Playwright `swipe()` across the opening waves. In every frame from 0 to 100 ms after a cut, the slash line and both halves are visible. Halves are still on screen 400 ms after the cut. Stills of a 3-cut swipe show a white-cored trail at least 16 px wide. Owner check on the phone: "you can see each cut".

---

## R3. "Boring"

### R3.1 Diagnosis (code against the Fruit Ninja loop)

| What keeps Fruit Ninja busy | Shatterhymn Slice today | Evidence |
|---|---|---|
| Varied tosses: fans, crossings, lobs, single high throws | Every wave is the same fountain from below. Apex 0.55 to 0.88 H, sideways speed at most 0.30 H/s. Only the Chord toss (waves 3 and 7, then every 5th) differs. | `sliceConfig.ts:3` `SLICE_TOSS`, `sliceSim.ts:15-16` `launch`, `schedule` |
| Big on-screen rewards: "+points", combo callouts, criticals | **None in Slice.** No points pop and no "{n} in one swipe!" pop (MODES.md 6.5 asks for it, but nothing renders it). Rewards are a sound, a haptic and a small `×N` HUD chip. | `grep "in one swipe"` in `src` finds only missions and share; `SliceMode` has no `PopText`; `controller.ts:52` |
| Chains a child understands | The chain needs the **same colour** in a row, which is abstract for a 9-year-old. A Choir is mostly only possible in waves 3 and 7. | `sliceSim.ts:23` |
| Frenzy and bonus moments | None. | |
| Risk and reward (bombs) | Dark crystals only from 12 s (25 s beginner), 15% to 45% chance, one per wave, small hit radius 0.040 H, so easy to ignore. | `sliceWaves.ts:17`, `sliceConfig.ts:3` |
| Escalating pace | The wave gap falls 0.15 s per 20 s level: 2.0 s at the start, still 1.7 s at 40 s. Counts are 2 to 3 per wave in the first minute. | `sliceWaves.ts:11, :21` |
| Stakes early | A fall cannot crack for the first 6 s (beginner 30 s in code). | `sliceConfig.ts:5` |

For a child in the first 10 seconds: about 20 crystals, all thrown the same way, and no words or numbers on screen. For the first minute: nothing new happens. Tap now has the Crown, pops and fever; Slice has none of these.

### R3.2 Candidates and the pick

Judged by a casual 9-year-old in the first 10 s (A, B) and the first minute (C, D):

| Candidate | Kid value | Cost | Pick |
|---|---|---|---|
| Varied toss patterns (fan, cross, lob, rain) | High: visible variety from second 1 | Sim only, low | **A** |
| Big callouts (points, "Great! 4 in one swipe") | High: instant reward, readable | DOM pops, low | **B** |
| Crystal Rush (frenzy) | Very high: a "wow" moment by 30 s | Sim plus a callout, medium | **C** |
| Big crystal that needs 3 hits | High: tactile, a goal mid-air | Sim plus render scale, medium | **D** |
| "Perfect line" bonus | Folded into B (word tiers by cuts per swipe) | | in B |
| Dark crystals as bombs | Already exist as risk; not more fun first | | not picked (R3.7 note) |

### R3.3 A. Toss patterns (`src/sim/sliceWaves.ts`, `sliceSim.ts`, `sliceConfig.ts`)

`Wave` gains `pattern: 'fountain' | 'fan' | 'cross' | 'lob' | 'rain' | 'line'` (`line` = today's Chord toss). `schedule()` builds the launches per pattern. All apexes keep the existing on-screen margins and bell clearance rules (`slice-core.test.ts:17, :20, :22` must still pass). Portrait W = 0.462 is the hard case; every rule below is in fractions of W.

| Pattern | Count | Launch | Apex | Stagger |
|---|---|---|---|---|
| `fountain` | as now | as now | as now | as now |
| `fan` | 3 to 5 | all from `x0 = 0.5 W`, `spawnY` | x evenly from 0.22 W to 0.78 W, y 0.72 H (beginner 0.68) | 70 ms, centre first |
| `cross` | 2 or 4 (pairs) | pair i: one from 0.15 W aimed at apex 0.70 W, one from 0.85 W aimed at 0.30 W; pair 2 adds 0.08 H to the apex | y 0.66 H | 0 within a pair, 300 ms between pairs |
| `lob` | 1, plus a 2-crystal fountain 400 ms later | from 0.12 W or 0.88 W (seeded side) | x at the far 0.70 W / 0.30 W, y 0.90 H (highest) | |
| `rain` (from level 1) | 4 to 6 | from the top: `y = 1.06`, x evenly from 0.18 W to 0.82 W, `vx = 0`, `vy = -0.15 H/s` | none (falling) | 140 ms, left to right |
| `line` | 5 | as today's Chord toss | | |

`cross` needs a sideways speed of up to `0.40 W / tApex`, which is about 0.23 H/s in portrait, inside `maxVx` 0.30. In landscape the target x is clamped so that `|vx| <= maxVx`.

Rain crystals fall through the bell zone. Fall rules apply unchanged (at most 1 crack per wave).

**Opening table (replaces `SLICE_WAVES`), both profiles, plain to read in the first 10 s:**

| Wave | At (ms) | Standard | Beginner |
|---|---|---|---|
| 1 | 600 | `fan` 3, 1 colour | `fountain` 1 |
| 2 | 2200 | `cross` 2, 1 colour | `fan` 3, 1 colour |
| 3 | 3800 | `line` 5 (Choir chance at about 4 s) | `cross` 2, 1 colour |
| 4 | 5600 | `fountain` 4, 2 colours | `line` 5 |
| 5 | 7200 | `lob` (1 + 2) | `fountain` 3, 2 colours |
| 6 | 8600 | `cross` 4, 2 colours | `lob` (1 + 2) |
| 7 | 10000 | `fan` 5, 1 colour | `fan` 4, 2 colours |

**Ramp after the opening:** the pattern comes from a seeded bag that refills when empty: `fountain` × 3, `fan` × 2, `cross` × 2, `lob` × 1, and `rain` × 1 from level 1. The existing "every 5th wave is `line`" rule stays. Counts use the existing rule, clamped per pattern. The gap becomes `max(0.75, 1.8 - 0.20 L)` s for standard (was `max(.85, 2 - .15 L)`). Beginner is unchanged.

Tests (`tests/slice-waves.test.ts`, new):
- `opening table matches for both profiles` (time to ±1 tick, pattern, count).
- `every pattern stays fully on screen at aspect 0.462 and 2` (200 seeds, apex x within the existing margins, rain x inside [r, W - r]).
- `cross pairs launch from opposite sides and cross before the apex`.
- `fan launches share x0 and apexes are evenly spaced`.
- `the ramp bag gives every pattern within 9 waves after level 1`.
- `same seed gives the same patterns` (determinism).
- `no rain before level 1`.
- `first waves never cover the bell face` (existing test, all patterns).

### R3.4 B. Callouts: points and "in one swipe" (`src/ui/popText.ts`, `controller.ts`, `sliceSim.ts`)

- `strokeEnd` gains `x, y` (the last cut position, H units) and `best: boolean` (the highest strokeCuts this run).
- `PopText` gains `slice(e: SliceEvent, toScreen)`. The controller forwards Slice events to it from the existing `forward` callback in `startRun` (`controller.ts:80`). Labels use the existing `.pop-text` pool (16 labels), which layout-check already skips.
- **Per cut:** `+{points}` at the crystal, 18 px Inter 800 (22 px when `chainStep >= 3`), white with a `--note` glow. Rises 30 px over 500 ms, fades over the last 200.
- **Swipe end with 3 or more cuts:** two lines.

| Cuts | Main line | Size |
|---|---|---|
| 3 | `Nice!` | 34 px |
| 4 | `Great!` | 40 px |
| 5 | `Amazing!` | 46 px |
| 6 or more | `Incredible!` | 52 px |

  - Sub line: `{n} in one swipe! +{bonus}` (16 px, the existing `.sub` plate).
  - Pop: scale 1.4 to 1.0 with a spring over 180 ms, hold 600 ms, fade 250 ms. Total life 1030 ms.
  - Reduced motion: no scale or rise, fade only.
- **Position (must not overlap the HUD or the bell):**
  - x = the cut point, clamped so the label stays within 12 px of each side.
  - y = the cut point, clamped to `[topBand + 40 px, innerHeight × (1 - (SLICE_FX.bellY + 0.10))]`, where `topBand = max(64 px, 9dvh) + safe-top` (MODES.md 13). That is 168 px to 649 px on 390 x 844.
  - At most 2 swipe callouts on screen; a new one pushes the oldest to fade.
- `.combo` HUD chip unchanged.

Tests (`tests/slice-pop.test.ts`, pure model functions exported from `popText.ts`):
- `swipe callout words for 2, 3, 4, 5, 6, 9 cuts` gives none, `Nice!`, `Great!`, `Amazing!`, `Incredible!`, `Incredible!`.
- `sub line reads "4 in one swipe! +80"`.
- `callout y is clamped below the top band and above the bell zone at 390 x 844 and 844 x 390`.
- `per-cut pop shows +30 for chain 3`.
- `copy test includes the four words and both sub-line templates`.

### R3.5 C. Crystal Rush (frenzy) (`sliceSim.ts`, `sliceConfig.ts`, renderer `choirText`)

```ts
export const SLICE_RUSH = { firstMs: { standard: 30000, beginner: 40000 }, everyMs: 60000, durationMs: 4000,
  warnMs: 900, spawnEveryMs: 200, pointsMult: 2 } as const;
```

- **Timeline:**
  - At `firstMs`, then every `everyMs`, the sim emits `{ type: 'rushStart' }`. It is skipped (pushed back 1 s) while a `line` wave is still pending.
  - For `warnMs` no new waves launch.
  - Then for `durationMs` a crystal launches every 200 ms: 20 crystals, alternating sides, from x0 0.15 W and 0.85 W towards apex x 0.35 W to 0.65 W (seeded), apex y 0.62 to 0.85 H. Colours come from the bag, with p = 0.7 of the main colour so chains happen. There are no dark crystals.
  - Then `{ type: 'rushEnd', cuts, points }`, and waves resume 800 ms later.
- **Rules during the rush (from `rushStart` to 2 s after `rushEnd`, so late fallers are covered):** falls never crack, points per cut × 2, and the stroke combo bonus × 2. `maxAlive` stays at 14 (a launch waits if it is full). The budget (R1) still applies; lifting refills it, so a kid who keeps swiping gets plenty.
- **Callouts:**
  - `rushStart`: `CRYSTAL RUSH!` in the existing `choirText` element at 30% height (`renderer.setSlice` sets 30%, below the top band), Cinzel 700 56 px, `#FFD27A`. Fade in over 120 ms, hold 600, fade out over 180.
  - During the rush: the per-cut pops show `+20 ×2` style text, for example `+40`.
  - `rushEnd`: `You got {n}!` in the same element for 900 ms.
- **Look:** a gold rim on the stage by tinting the background with the existing `setBoardTint`, `#FFD27A`, strength 0.18, 200 ms in and 300 ms out. Music: `this.music.setLevel(level + 1)` for the duration (existing API).
- Haptic `fever` pattern on `rushStart` (existing id). Sound: `playChoir(main note)` at gain × 0.6 on `rushStart`.

Tests (`tests/slice-rush.test.ts`):
- `rush starts at 30000 ms standard and 40000 beginner and repeats every 60000`.
- `rush launches 20 crystals in 4000 ms, no dark`.
- `no fall cracks during the rush and for 2 s after`.
- `points double during the rush`.
- `rushEnd reports cuts and points`.
- `rush callout strings "CRYSTAL RUSH!" and "You got {n}!" are in the copy table`.
- `determinism with a rush`.

### R3.6 D. Big crystal: 3 hits to break (`sliceSim.ts`, `sliceTypes.ts`, `crystals.ts`)

- `SliceCrystal.kind` gains `'big'`, and the crystal gains `hp: number`.

```ts
export const SLICE_BIG = { radius: .11, hitRadius: .115, hp: 3, fromMs: { standard: 15000, beginner: 25000 },
  everyMs: 25000, hitKick: .35, hitPoints: 10, breakPoints: 50 } as const;
```

- **Spawn:** one Big crystal as an extra launch in the first wave after `fromMs`, then every `everyMs`. Never during a rush or a `line` wave. Apex y is pinned at 0.82 H and x at 0.5 W (central and high, so it is reachable for a long time). Its note comes from the bag.
- **Hits:**
  - One hit per arm (an arm cannot hit the same Big twice). Each hit costs 1 budget token and counts as a cut (`k++`, and the chain by note as usual).
  - Each hit sets `hp -= 1`, `vy = max(vy, 0) + hitKick` (it pops up), `vx += 0.15 × dirX`, then clamps `|vx| <= maxVx`.
  - It emits `{ type: 'bigHit', id, x, y, hpLeft, note, dirX, dirY, points: 10 }` with no halves and an R2 splash at × 0.6.
  - At `hp = 0` it emits a normal `cut` (halves, slash, full splash) plus `{ type: 'bigBreak', id, x, y, note, points: 50 }`, with shards + 10.
- **Falls:** a Big that falls uncut never cracks (it is a bonus, not a risk).
- **Look:** the crystal mesh at `r × 10` (1.47× a normal crystal, no new draw call), plus a ring of `hpLeft` gold pips (`glow.disc`, radius 6 px, `#FFD27A`) orbiting at 1.2× the radius. On each hit the mesh flashes (`aFlash` 1 for 60 ms), and its glyph cracks show through `aCrack = (3 - hp) / 3`.
- **Callouts:** after a hit, `{hpLeft} more!` at the crystal (24 px pop, the B rules). On break, `BIG BREAK!` main line plus sub `+50`, at 46 px (the B swipe-callout rules).
- **Scoring:** 3 × 10 + 50 = 80 per Big at chain 1 (rush × 2). Hits give normal chain points.

Tests (`tests/slice-big.test.ts`):
- `a big crystal needs exactly 3 hits from 3 arms`.
- `one arm hits a big crystal only once`.
- `each hit kicks it upward by 0.35 H/s`.
- `break gives 50 plus hit points, shards +10, and a cut event with halves`.
- `an uncut big crystal falling does not crack`.
- `first big at 15000 ms standard, every 25000 ms, never in a rush or line wave`.
- `big crystal apex stays on screen at aspect 0.462`.
- `copy table has "{n} more!" and "BIG BREAK!"`.

### R3.7 Not picked, and why

- **Dark crystals as harder bombs** (earlier, more often): they add stakes, but a child's first reaction to "you lost a bell" is frustration, not fun. Keep them as they are. R3.3 rain and fans make avoiding them more interesting by themselves.
- **"Perfect line" bonus:** folded into B's word tiers (`Amazing!` at 5, `Incredible!` at 6).

### R3.8 What the child sees

- **First 10 seconds (standard):**
  - 0.6 s: a fan of 3 fills the screen.
  - 2.2 s: two crystals cross in an X.
  - About 4 s: a line of 5 gives `Amazing!` and `CHOIR!`.
  - 7.2 s: a big lob across the top.
  - Every cut shows `+10` or more, and every swipe of 3 or more cuts shows a word.
- **First minute:** a Big crystal at 15 s ("2 more!"), a CRYSTAL RUSH at 30 s, and rain from 20 s.

### R3.9 Layout and QA

- No new HUD elements. Callouts use `.pop-text` (skipped by layout-check) or the existing `choirText`, at the positions given above. All layout-check selectors stay unchanged.
- QA: `sliceTestBoard(list)` accepts `kind: 'big'`. New URL flag with `qa=1`: `rush=now` starts a rush at 1000 ms, for capture. Add both to MODES.md 19 through the proposed change below.

### R3.10 Acceptance

`timeout 300 npm run check` passes and layout-check is clean at 576 layouts. Lead capture at 390 x 844 of the first 12 s shows four different patterns and at least one word callout. `?qa=1&mode=slice&rush=now` shows `CRYSTAL RUSH!` below the HUD band and `You got {n}!`. Owner and child: "more fun than before" within one minute.

---

## Proposed MODES.md amendment (lead adds it; the implementer must not edit docs)

Append to MODES.md after §23:

> ## §24. Slice rescue
> `docs/SLICE-RESCUE.md` R1 to R3 are approved and override this file and POLISH.md where they differ (blade thresholds in short sides per second, per-stroke cut budget, trail modes, pronounced cuts, toss patterns, callouts, Crystal Rush, Big crystal, QA flag `rush=now`).


## Lead amendment to R1 (2026-10-29, before implementation)

The speed thresholds stay in **screen heights per second** and keep their current values: standard arm 1.4 / disarm 0.9 H/s, beginner (Slice runs 0 to 2) arm 1.2 / disarm 0.8 H/s, windowMs 64, minSpanMs 32. The owner set the minimum speed at 1.2 to 1.5 screen-heights per second, and the slow-drag acceptance (0.5 and 1.0 H/s drags cut nothing) must keep passing; 585 px/s would let a 1.0 H/s drag cut. So ignore R1's switch to short sides per second (`armSps`, `disarmSps`, the `S` unit and the `units use the short side` test); everything else in R1 stands: instant re-arm on a fast flick, no 100 ms slow-down wait, the per-arm time and path caps removed, the per-stroke cut budget in the sim (6 per armed burst, 6 per stroke refilling 1 per 800 ms and fully on lift), the trail modes and finger ring, the one-time tip, newest finger wins, the CSS hardening and all R1 tests. Where R2 uses `speedSps`, use `speedHps` with the same breakpoints scaled by 0.462 (so arming speed is 1.4 H/s -> 16 px width, and 30 px at 3.0 H/s and above).
