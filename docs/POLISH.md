# SHATTERHYMN: POLISH PASS (P1 to P5)

Version 1.0, 2026-10-29, design lead. Build reviewed: `1036105`.

**Status and precedence.** This is an amendment to `docs/MODES.md`. AGENTS.md says MODES.md wins over every other doc, so before P1 ships the lead adds one line to MODES.md: "§23. Polish amendments: `docs/POLISH.md` P1 to P5 are approved and override this file where they differ." Each section below is shipped as its own push and stands alone: it lists every file, number, test and check it needs and does not depend on another P section being merged first.

**Judge.** A casual 9-year-old who has quit this game once. Every choice below is made for her first 10 seconds.

**Units.** As MODES.md: H = play-area height in CSS px, H/s, u = Tap world units, Slice world = sim × 10 (10 world units = 1 H). Y = Rec.709 luma on 0-255, measured on 780 x 1688 screenshots (390 x 844 at DPR 2). Hex colours are sRGB; pass them to three.js as `new Color(hex)` like the rest of the code.

**Evidence used.** Every image in `shots/polish/before/` (intro 0600-6500, tap-0/1/2, slice-split, slice-fastswipe, slice-slowdrag, aim-slice-end, aim-tap-end), `before/aim.json`, `before/qa.json`, every image in `shots/modes/final/` (including `tap-first10s.png`, `slice-first10s.png`, `slice-play-*.png`, `velocity-*.png`), `final/qa.json`, `final/velocity.json`, `/workspace/wow-game/qa-aim.mjs`, and the code under `src/`.

**Hard rules that apply to every section.** `src/sim` stays pure. No new runtime dependencies. No per-frame allocation in sim, blade or render hot paths. Draw calls in either mode stay ≤ 20 (MODES §17; check with `?debug=1`, which prints `Draw calls`). `timeout 300 npm run check` passes. `scripts/layout-check.mjs` selectors are untouched (no section here adds or renames a screen or selector).

---

## P1. Slice cut face

### P1.1 What is wrong (evidence and cause)

- In `slice-play-2.png` the cut red half is a thin flat pink sliver. No cut face is visible in any Slice frame.
- Cause 1: the cut plane can never face the camera. `Crystals.cut()` (`src/render/crystals.ts`) stores a cut-plane normal `n = (-dirY, dirX, 0)`, which lies in the screen plane, and `Crystals.updateSlice()` rotates halves only around the view axis (`this.object.rotation.set(0,0,angle)`). So the cut plane is always edge-on: it projects to a line. The back-face fill in `shaders/crystal.ts` (`if(vCut.w != 0. && !gl_FrontFacing) color=vCore*1.6;`) has nothing to show.
- Cause 2 (bug): halves are drawn at a hard-coded scale `.58*(1-.15*h.age/900)`. That was `radius .058 × 10` before MODES §22.4 raised `SLICE_TOSS.radius` to `.075`. Whole crystals draw at `.75`, so each half shrinks to 77% the instant it is cut. The cut looks like it makes the crystal smaller.

### P1.2 The look, in one sentence

Each half tips open like a book so its flat inside turns toward the player; the inside is a glowing, almost white slab of the crystal's colour with a bright rim, it cools to the crystal's body colour in about half a second, and a spray of small glittering shards spills out of the cut edge.

### P1.3 Half motion: tumble so the cap faces the camera

File `src/render/crystals.ts`.

1. Extend `Half` with `ax, ay` (tumble axis in local space, unit, z = 0), `mid, half` (cap chord centre offset and half length, local units) and keep `age`.
2. In `cut(e, aspect)`: compute the local cut normal as today (`localX, localY`). For each `side` in `[-1, 1]`:
   - kept region: `dot(local, side·n_local) >= 0` (unchanged shader rule).
   - cap outward normal `c = -side·(localX, localY, 0)` (points from the kept body into the removed side).
   - tumble axis `a = normalize(cross(c, (0,0,1)))` = `normalize((c.y, -c.x, 0))`. Rotating `c` about `a` by +φ turns it toward +z, which faces the camera.
   - chord: look up `chordFor(note, dirLocal)` (P1.4) with `dirLocal = (-localY, localX)`; store `mid`, `half`.
3. In `updateSlice()`: build each half's quaternion as `qSpin(z, h.angle) · qTumble(a, φ(h.age))` (use two preallocated `Quaternion`s and `Object3D.quaternion`, not `rotation.set`).
   - `φ(t) = 0.96 × easeOutCubic(min(1, t / 220)) + (reduced ? 0 : 0.45 × max(0, t - 220) / 1000)` rad. So 55° at 220 ms, about 73° at 900 ms. The cap is never edge-on after 60 ms and never turns away.
   - Reduced motion: the same 220 ms ease to 55° (it carries the information), no drift after it.
4. Half scale: `SLICE_TOSS.radius × 10 × (1 - .15 × age / 900)` (0.75 → 0.64). Delete the `.58` literal. Import `SLICE_TOSS` from `src/sim/sliceConfig.ts`.
5. Everything else in MODES §8.3 stays: impulse `side × n × 4.5 u/s` plus `d × 3.0 × min(speed,3)/3`, spin `±(4..8)` rad/s, gravity `1.2 × g × 10`, life 900 ms, fade over the last 250 ms, pool `HALF_CAP = 48`.
6. Back faces of cut halves (`shaders/crystal.ts`, the `!gl_FrontFacing` line): use the cool cap colour (P1.5) instead of `vCore*1.6`, so any back face that peeks out at the cap edges matches the cap once it has cooled.

### P1.4 Cap geometry (cheap, exact for these glyphs)

Every crystal mesh is an extruded 2D glyph (`ExtrudeGeometry(glyphShape(i), {depth .42, bevelThickness .18, bevelSize .12})`, translated `z -0.21`, then scaled by `1/R` with `R` = bounding-sphere radius). The cut plane always contains the extrusion axis (its normal has z = 0), so **the cross-section is a rectangle**: length = the glyph's chord through the local origin along `dirLocal`, height = the extrusion thickness, with bevelled corners. All five glyphs are star-shaped around their origin, so a ray from the origin leaves the outline exactly once and the chord is one segment.

New file `src/render/sliceCap.ts`:

```ts
export const CAP = { dirs: 64, bevelX: .12, bevelZ: .18, halfDepth: .39, hotHoldMs: 60, coolMs: 480,
  hdrHot: 2.2, rimWidth: .16, rimMin: .35, rimGain: 1.65, lift: .25, zOffset: .002 } as const;
export function buildChordTable(shape: Shape, R: number, dirs = CAP.dirs): Float32Array; // [tPlus, tMinus] × dirs over [0, π)
export function chordFor(table: Float32Array, dx: number, dy: number): { mid: number; half: number };
export function capHeat(ageMs: number): number;            // 1 until 60 ms, then 1 - smoothstep(0, 1, (age-60)/480), 0 from 540 ms
export function tumbleAngle(ageMs: number, reduced: boolean): number;  // φ from P1.3
export class CutCaps { constructor(scene: Scene); setTier(t: Tier): void; begin(): void;
  push(halfMatrix: Matrix4, c: Vector3, dirLocal: Vector3, mid: number, half: number, note: number, ageMs: number, fade: number): void; end(): void; reset(): void; dispose(): void }
```

- `buildChordTable`: take `shape.extractPoints(12).shape`, push each outline point outward by `CAP.bevelX` along its direction from the origin (the bevel grows the outline), divide by `R`. For each of 64 directions `θ_k = kπ/64`, intersect the ray `+u` and the ray `-u` with the outline polygon (first hit from the origin) to get `tPlus`, `tMinus`. Build once per note in the `Crystals` constructor (5 tables × 128 floats). Glyph 5 (dark) never halves, skip it.
- `chordFor`: angle of `(dx, dy)` folded into `[0, π)` (swap `tPlus`/`tMinus` when folded), linear interpolation between neighbouring entries. `mid = (tPlus - tMinus) / 2`, `half = (tPlus + tMinus) / 2`.
- Cap quad: one `PlaneGeometry(2, 2)` in a single `InstancedMesh` with capacity `HALF_CAP` (48). Instance matrix = `halfMatrix × capLocal`, where `capLocal` maps quad X → `dirLocal × half`, quad Y → local z × `CAP.halfDepth / R`, quad normal → `c`, origin → `dirLocal × mid + c × CAP.zOffset` (the offset avoids z-fighting with the back faces). It rotates with the half automatically because it is composed with the half's matrix.
- Material: `ShaderMaterial`, `transparent: true`, `depthWrite: false`, `side: FrontSide`, `renderOrder 11` (crystals are 10, blade 20), normal blending. Per-instance attributes: `aHot` (vec3), `aCool` (vec3), `aHeat`, `aFade`, `aCorner` (vec2, corner radii in quad UV: x = `(CAP.bevelX / R) / half`, y = `CAP.bevelZ / CAP.halfDepth` = .46).
- Fragment (quad UV in [-1, 1]): rounded-rectangle SDF with `aCorner`, anti-aliased with `fwidth`. Colour `= mix(aCool, aHot × CAP.hdrHot, heat) + aHot × CAP.lift × (1 - uv.x²) × heat`. Rim: `rim = 1 - smoothstep(0., CAP.rimWidth, -sdf)`, `colour += vec3(1.) × rim × (CAP.rimMin + CAP.rimGain × heat)` (HDR, so bloom gives the additive glow). Alpha = `aFade × edgeAA`. On the Low tier the rim term uses a constant `rimMin` only (no per-frame heat in the rim).

### P1.5 Cap colours

Hot = the existing `cores[note]` in `crystals.ts` (the crystal colour lifted toward white) at HDR `CAP.hdrHot` 2.2. Cool = the body tint `mix(NOTE_COLORS[note], darks[note], .35)`:

| Note | Hot (`cores`) | Cool (body tint) |
|---|---|---|
| 0 red | `#FFB3C0` | `#D03A58` |
| 1 yellow | `#FFE8A8` | `#D0982B` |
| 2 green | `#B8FFE2` | `#2DB17E` |
| 3 blue | `#C2E2FF` | `#3982D0` |
| 4 purple | `#EBD3FF` | `#9A59D0` |

Timeline per half: 0-60 ms full hot, cools over 480 ms (smoothstep ease in and out, so it stays bright long enough to see) to the body tint at 540 ms, then holds the body tint until the half fades (650-900 ms). Reduced motion: unchanged (colour, not motion).

### P1.6 Shards spilling from the cut edge

The existing cut burst stays (MODES §8.4: 12 / 8 / 5 shards along `d`, harvest into the bell). Add a short-lived spill.

`src/render/shards.ts`:
- Add per-shard fields `life`, `gravity`, `harvest` (defaults: `SHATTER.life`, 0, true) and use `s.life` where `update()` uses `SHATTER.life`. No other change to existing bursts.
- New `spill(x0, y0, x1, y1, nx, ny, vx, vy, note, count)`: for `i < count`, spawn at a uniform random point on the segment `(x0,y0)-(x1,y1)` (the cut chord in world space at the moment of the cut). Side `s = i % 2 ? 1 : -1` (half from each half). Velocity = `(vx, vy)` (the parent crystal's world velocity) + `s × n` rotated by a random angle in ±35° × speed `2.0 + 2.5 × rand` u/s, plus `(0, 0.5 + 1.0 × rand)` u/s up. `vz` 0.5-2.0. `gravity = 1.2 × g × 10` (like halves), drag 1.5/s, `life = .45 + .30 × rand` s, `size = .10 + .12 × rand` u (about 8-19 CSS px on an 844 px phone), `harvest = false`. Colour: `cores[note] × 1.6` for the first 50% of life, then lerp to `NOTE_COLORS[note]`; alpha fades over the last 40%.
- Counts per cut: High 14, Medium 10, Low 6 (`SLICE_FX.spill` in `fxConfig.ts`); reduced motion × .5 (ceil).

`src/render/renderer.ts` `sliceEvent` on `cut`: after `this.crystals.cut(e, aspect)`, call `this.shards.spill(...)` with the chord endpoints that `Crystals.cut` now returns (or exposes through an `onSpill` callback, matching the existing `onBurst` pattern).

### P1.7 Performance budget

| Item | Budget |
|---|---|
| Live halves | ≤ 48 (unchanged pool, recycles the oldest pair) |
| Cap instances | ≤ 48, one `InstancedMesh` |
| New draw calls | exactly +1 (caps). Total in Slice stays ≤ 20; if the `?debug=1` count during a Choir would exceed 20, report it, do not drop the caps |
| Cap vertices | 4 per half, 192 max |
| Spill shards | 14 / 10 / 6 per cut from the existing pool (1600 / 1000 / 600 by tier, `TIERS` in `src/render/quality.ts`, unchanged) |
| Allocation | none per frame: preallocated `Matrix4`, `Quaternion`, `Vector3` scratch in `CutCaps` and `Crystals` |
| Chord tables | built once at startup, 5 × 128 floats |

Tiers: High and Medium identical except spill count; Low uses the constant rim and spill 6. Tap mode never creates halves or caps (`CutCaps.mesh.visible = false` when `count === 0`).

### P1.8 Tests (`tests/slice-fx.test.ts`, pure, no WebGL)

1. `chord table: triangle glyph chord through the origin matches a brute-force polygon intersection within 0.01 for all 64 directions`.
2. `chord table: every glyph 0-4 has tPlus > 0 and tMinus > 0 in every direction` (the origin is inside every glyph).
3. `chordFor folds angles: (dx,dy) and (-dx,-dy) give the same half and opposite mid`.
4. `capHeat is 1 at 0 and 60 ms, between 0.4 and 0.6 at 300 ms, 0 at 540 ms and 900 ms`.
5. `tumbleAngle: 0 at 0 ms, 0.96 ± 0.01 at 220 ms, ≤ 1.30 at 900 ms; reduced motion stays 0.96 after 220 ms`.
6. `tumble turns the cap toward the camera: for 12 cut directions and both sides, the rotated cap normal has z ≥ 0.80 at 220 ms`.
7. `half scale starts at SLICE_TOSS.radius × 10 and ends at 0.85 of it`.
8. `spill counts per tier are 14 / 10 / 6 and halve (ceil) with reduced motion`.
9. `spill shards never harvest and die within 0.75 s`.

### P1.9 Acceptance (lead)

- Screenshot 80 ms after a cut (`?qa=1&mode=slice`, `sliceTestBoard()`, `swipe()` at 3 H/s): each half shows a flat, near-white, glowing face of the crystal's colour along the cut, wider than 40% of the half's width, with a bright rim.
- Screenshot 600 ms after the cut: the same faces are the crystal's body colour (no longer near white), still clearly flat.
- Halves are the same size as the crystal at the moment of the cut (no "shrink pop").
- Video at 30 fps: small glittering shards spray out of the cut line on both sides and are gone within 0.75 s; the bigger shards still fly to the bell.
- `?debug=1` during a 5-chain Choir: draw calls ≤ 20, FPS on the reference phone ≥ 55.
- Reduced motion on: faces still turn toward the camera and glow, halves do not keep tumbling.
- Tests 1-9 pass; total test count reported.

---

## P2. Tap board: bright, warm and alive

### P2.1 What is wrong (evidence and cause)

- `tap-0-start.png`, `intro-0600.png`, `tap-first10s.png`: the stage is a dark navy disc inside a thick black "tyre", the top 25-40% of the screen is black, and the bottom quarter is grey-teal fog. `tap-2-mid.png` and `aim-tap-end.png`: after a flash the stage turns a dull lavender-grey stone. The title (`intro-6500.png`) shows the same dark tunnel plus a dark disc under the face ("snowman").
- Yellow crystals look like brown cardboard boxes (`tap-2-mid.png`, `aim-tap-end.png`, `aim-slice-end.png`) and green crystals look pale and plastic (`slice-play-2.png`).

Causes in code:
1. `src/render/shaders/background.ts` (Tap path): petals are baked from `neutralGlass` (deep indigo) and then multiplied by `lit` ≈ `PLAY_START.rose` .20 and by `mix(.7, 1., uTitle)` = .7 in play, so the rose is shown at about 14% brightness. The bake fades the outer 15% of the rose to black (`smoothstep(1.,.85,r)`) and draws lead lines in near-black `vec3(.039,.027,.086)`: that is the black tyre. The bake also vignettes to `uVoid0` (`#05040C`) with `smoothstep(.30,.78,length(p-.5))`. In play `col=mix(col,uVoid0,(1.-uTitle)*.35*smoothstep(.72,.84,p.y))` darkens the top and on the title `if(p.y>.78 ...) col=mix(col,uVoid0,uTitle)` blacks out the top band. `uBoardSat` .60 then pulls everything toward grey.
2. `src/styles/main.css:153` `#hud::before` is a gradient from `#05040C` to 94% black at 55% of `min(340px, 40dvh)`; `.hud-backing` (`main.css:152`, created in `controller.ts`) adds another 88% black gradient over 28 dvh; `.title-screen::before` (`main.css:127`) adds a 70% black gradient over 300 px. Together they paint the top third black.
3. `src/render/shaders/floor.ts` adds grey lines (`PALETTE.floorLine` `#262B38`) and a cold blue reflection `vec3(.231,.290,.604)`.
4. The post `VignetteEffect(VIGNETTE)` with darkness .60 darkens every corner.
5. The title "snowman": `uBell` (the stage centre in screen space) is not at the bell's projected position on the title, so the dark hub sits under the bell instead of around it.
6. `shaders/crystal.ts`: `body*=min(1.,.55/max(lum,.0001))` clamps body **luminance** to .55, which turns yellow `#FFC23F` (Y 198) into mustard-brown; `color+=vec3(.62,.85,1.)*fres*1.0` washes every grazing bevel face pale blue-white.

### P2.2 Colour plan and how contrast is kept

For the first 40 s of every Tap run only red, yellow and green exist (`K = 3` at L0-L1; the intro Crown is red). Their hues are 349°, 41° and 156°. The only wide hue gap left is blue-violet. So the stage is a **sunlit violet stained-glass window with gold leading**: bright, saturated violet glass (hue 250-256°) carries the colour, and warmth comes from gold lead lines, a gold frame ring, warm light shafts, a moving warm light sweep and a rose-magenta lower sky.

Contrast between board and crystals is kept by four separators, so it no longer depends on a dark board:

| Separator | Board | Crystals |
|---|---|---|
| Edge | soft, half-resolution glass, no hard dark edges | a crisp dark outline `#1A0F2E` (Y 20) on the whole bevel ring, about 4 px on a 390 px phone, plus a thin white rim |
| Hue | violet 250-256° (sky top 250°, sky bottom 316°), gold lines 38-40° only 2-3 px wide | red, yellow, green are 95-157° away from the glass. Blue (210°) and purple (274°) arrive at 40 s and 80 s and rely on the outline and core |
| Value | glass Y 85-139, hub Y 77-95, sky Y 55-108 | yellow Y 198, green 185, blue 155, purple 150 brighter than the glass; red Y 119 is close in value, so red relies on hue (93° away) and the outline; every crystal core is HDR and blooms |
| Motion | slow: 12 s light sweep, 4 s twinkle, 3 s glint, 24 s hue drift | crystals drift, spin and bob as now |

### P2.3 New config (`src/render/fxConfig.ts`)

```ts
export const TAP_STAGE = {
  skyTop: 0x3d2c8f, skyMid: 0x6c46c0, skyBottom: 0xb8509e, skyMidY: .55,
  vignette: 0x2a1f6e, vignetteAmt: .45,
  hubCentre: 0x5a3fb0, hubEdge: 0x6e4fd8,
  petalLight: [0x8b6bf0, 0x9c7bf5, 0x8b6bf0, 0x7656d6],
  petalDark:  [0x7a5ae0, 0x8868e8, 0x7a5ae0, 0x6446c2],
  lead: 0xffd27a, leadAlpha: .85, leadPx: 2,
  frame: 0xffc86b, frameGlow: 0xff9e6b, frameR: [.95, 1.02], frameCorePx: 3, frameGlowPx: 10, frameGlowAlpha: .35,
  shaft: 0xffe0b0, shaftGain: .16,
  twinkleAmt: .06, twinklePeriodS: 4.0,
  sweepColor: 0xffd9a0, sweepGain: .10, sweepWidthRad: .55, sweepPeriodS: 12,
  glintGain: .5, glintPeriodS: 3.0,
  frameBreath: .08, framePeriodS: 2.5,
  breathAmt: .05, hueDriftDeg: 6, hueDriftPeriodS: 24,
  gain: 1.0,
} as const;
export const CRYSTAL_EDGE = { outline: 0x1a0f2e, faceNz: [.93, .97], rim: [.94, 1.0], rimGain: .8, bodyMaxChannel: .92,
  poolAlpha: .20, shadowAlpha: .35 } as const;
```

Ring index as today (`ring = floor(r × 4)` for `r` in [.18, 1)): ring 0 (.18-.25, 5 petals), ring 1 (.25-.50, 10), ring 2 (.50-.75, 10), ring 3 (.75-.95, 20). Alternate `petalLight[ring]` and `petalDark[ring]` by petal parity (`mod(seg, 2.)`), plus the existing `petalJitter` .035 value jitter.

Reference values (sRGB, before tone mapping): petals Y 85-139, hub 77-95, sky top 55, sky mid 87, sky bottom 108, lead 213, frame 205. All glass saturation ≤ .64. Because `ToneMappingEffect(ACES_FILMIC)` runs after the board, the implementer tunes the single multiplier `TAP_STAGE.gain` (start 1.0, allowed .85-1.4) until the measured screenshot values in P2.8 land; do not tune per colour.

### P2.4 Shader changes (`src/render/shaders/background.ts`, Tap path only, `uSlice < .5`)

Bake (`bakeFragment`):
1. Sky: replace `mix(vec3(.043,.165,.220),vec3(.118,.078,.275),p.y)` with the three-stop gradient `skyBottom` (p.y 0) → `skyMid` (p.y `skyMidY`) → `skyTop` (p.y 1). Keep the fog noise but tint it `#8A5CD8` at .08.
2. Vignette: replace the mix to `uVoid0` with a mix to `TAP_STAGE.vignette` by `vignetteAmt × smoothstep(.45, .85, length(p - .5))`.
3. Petals: replace `neutralGlass` with `stageGlass(seg, ring)` from P2.3. Lead lines: replace the near-black `vec3(.039,.027,.086)` with `lead` at `leadAlpha`, width `leadPx` CSS px (keep the 3× `fwidth` softening). Delete the outer fade `smoothstep(1.,.85,r)` (the black tyre).
4. Hub (`r < .18`, under the bell): radial gradient `hubCentre` → `hubEdge`.
5. Frame ring: at `frameR` .95-1.02, a `frame` core `frameCorePx` wide with a `frameGlow` halo `frameGlowPx` wide at `frameGlowAlpha`. Then the sky.

Fragment:
6. Delete `if(p.y>.78 && !(r<1.&&r>.18)) col=mix(col,uVoid0,uTitle);` and `col=mix(col,uVoid0,(1.-uTitle)*.35*smoothstep(.72,.84,p.y));`.
7. Rose brightness: replace `lit = mix(PLAY_START.rose × breath, .21, uTitle) + heat + uRose` and the `*mix(.7,1.,uTitle)` factor with `lit = TAP_STAGE.gain × (1. + uHeat × (.30 + .35 × uBeat) + uRose)`. The strike, Choir and warning flashes keep working on top. Remove `PLAY_START.rose`, `rosePeriod`, `roseBreath` (now unused) and update `tests/board.test.ts`.
8. `uBoardSat`: set to 1.0 for the Tap path (the palette is authored saturated). The Slice path returns earlier and is unaffected.
9. Idle lancet shafts (`p.y > .70`): `uBeam` cool → `TAP_STAGE.shaft`; the 4 sweeping shafts use `shaftGain` .16 and only the warm colour (no lerp to cyan).
10. Hue drift ±12° → `hueDriftDeg` ±6°; value breathing ±.08 → `breathAmt` ±.05.
11. New uniforms `uStageR` (stage radius as a fraction of height) and `uStageMotion` (1 normal, 0 reduced motion). `uBell` and `uStageR` come from projecting the world bell centre `(0,0,0)` and the arena rim `(10, 0, 0)` with the current camera on **every** Tap-family screen (intro, title, run, pause, results), so the hub sits exactly under the bell (fixes the title "snowman").

Animation (all multiplied by `uStageMotion`):

| Effect | Formula | Period | Amplitude |
|---|---|---|---|
| Petal twinkle | petal value × (1 + `twinkleAmt` × sin(2π t / 4.0 + 2π hash(seg, ring))) | 4.0 s | ±6% |
| Light sweep | add `sweepColor × sweepGain × exp(-(Δθ / .55)²)` on `r` .25-.95, where `Δθ` is the angle to `2π t / 12` | 12 s per turn | +.10 |
| Gold glint | lead colour × (1 + `glintGain` × pow(max(0, sin(2π t / 3.0 - 6 r)), 4)) | 3.0 s, travels outward | up to +50% on 2 px lines |
| Frame breath | frame × (1 + .08 sin(2π t / 2.5)) + .15 × `uBeat` | 2.5 s | ±8% |
| Hue drift, value breath | as step 10 | 24 s, 7 s | ±6°, ±5% |

Reduced motion (`uStageMotion = 0`): all five are off; the stage is static at its mean values. Flashes on strikes stay (they are feedback, already capped by `flashInterval`).

Pure helper for testing: `stageUniforms(timeS: number, reduced: boolean): { uStageMotion: number; sweepAngle: number }` in `src/render/background.ts`, used by the renderer to set the uniforms.

### P2.5 Floor, vignette, HUD backing (`floor.ts`, `renderer.ts`, `main.css`, `controller.ts`)

- `src/render/floor.ts`: `uFloorLine` `PALETTE.floorLine` `#262B38` → `#FFE3B0`, and multiply `lines` by .35 in `shaders/floor.ts` (faint warm guide rings, additive). Replace the blue `vec3(.231,.290,.604)` (reflection, centre glow, attract ticks) with `#FFC86B` × .6.
- `src/render/fxConfig.ts` `VIGNETTE.darkness` .60 → .30 (global; corners stay coloured in both modes).
- `src/styles/main.css`:
  - `#hud::before`: `background: linear-gradient(rgba(29,18,74,.55), rgba(29,18,74,0)); height: min(150px, 18dvh);` (deep violet `#1D124A`, not black).
  - `.title-screen::before`: `background: linear-gradient(rgba(29,18,74,.6), transparent); height: 220px;`.
  - `.hud-backing`: delete the rule, and delete the code in `controller.ts` that creates the `.hud-backing` element.
  - `.best` colour `#8a8fa3` (grey) → `#D9D2FF`.
- `rings.ts`, `bell.ts` and `shaders/halo.ts`: checked, no change. Strike and Choir rings are additive white and note-coloured and read on violet; the glass bell and white face read on the darker hub.

### P2.6 Crystal contrast (`src/render/shaders/crystal.ts`, `src/render/crystals.ts`; shared by both modes)

1. Outline: add `varying vec3 vLocalN` (`= normal` in the vertex shader). In the fragment: `float face = smoothstep(.93, .97, abs(vLocalN.z)); color = mix(uOutline, color, face);` with uniform `uOutline = new Color(CRYSTAL_EDGE.outline)`. The front and back faces keep their colour; the whole bevel ring and the side walls become the dark outline (about 11% of the crystal radius, about 4 px for a 35 px Tap crystal). Apply after lighting and before `vFlash`, so the white strike flash still covers the whole crystal. Rock (geode) and dark crystals keep their own look on the face; the outline applies to them too.
2. Body colour: replace `body*=min(1.,.55/max(lum,.0001))` with `body *= min(1., CRYSTAL_EDGE.bodyMaxChannel / max(max(body.r, body.g), body.b))`. This keeps hue and saturation, so yellow stays yellow. Set `FINISH.gemBodyMax` to .92 and read it in the shader instead of the literal.
3. Rim: replace `color+=vec3(.62,.85,1.)*fres*1.0` with `color += vec3(1.) * smoothstep(.94, 1., silhouette) * .8` (a thin white rim, no pale wash over the bevels). Keep the glint.
4. `crystals.ts`: crystal colour pool alpha `.36` → `CRYSTAL_EDGE.poolAlpha` .20; shadow alpha `CRYSTAL_GLOW.shadowAlpha` .5 → `CRYSTAL_EDGE.shadowAlpha` .35. Golden keeps `TITLE_FX.poolAlpha`.

### P2.7 Tests

- `tests/board.test.ts › Tap stage palette equals POLISH P2` (every `TAP_STAGE` value).
- `tests/board.test.ts › every TAP_STAGE petal and hub colour has HSV saturation ≤ .65 and Y between 50 and 145` (sky, vignette, lead and frame excluded).
- `tests/board.test.ts › notes 0-2 differ in hue by ≥ 90° from every petal colour` (computed in the test from `NOTE_COLORS` and `TAP_STAGE`).
- `tests/board.test.ts › stageUniforms with reduced motion gives uStageMotion 0 at any time; normal gives 1 and a sweep angle of 2π t / 12`.
- `tests/board.test.ts › crystal edge config` (`CRYSTAL_EDGE` values, `FINISH.gemBodyMax === .92`).
- Update the existing `board.test.ts` assertions that read `PLAY_START.rose` and `BOARD.boardSat`.

### P2.8 Acceptance (lead, 780 x 1688 stills at `tap-0-start`, `tap-2-mid`, `intro-0600`, `intro-6500` moments, plus `tap.mp4`)

- No 40 x 40 px block anywhere on screen has mean Y < 30 (no black), except inside the pause button. No block outside the bell and face has HSV saturation < .20 (no grey). The top band behind the HUD is visibly violet, the bottom quarter visibly rose-violet.
- Petal glass Y 85-150, hub Y 70-105, gold frame ring visible as a continuous warm line at the arena rim, no dark ring anywhere around the stage.
- Every crystal shows a continuous dark outline (Y ≤ 45) around at least 85% of its outline. Yellow crystal faces measure hue 36-50°, saturation ≥ .60, Y ≥ 150 (no brown). Green faces saturation ≥ .55 (no pastel).
- On the title, the hub is centred on the bell (no dark disc under the face).
- Video: a warm light visibly sweeps round the stage about every 12 s, petals twinkle, a gold shimmer runs outward along the lead lines. With Reduce motion on, the stage is still.
- `CHOIR!`, `+580`, score and the bells stay readable (white or gold text on violet).
- Slice: crystals show the same outline and correct yellow; the Slice sky is otherwise unchanged except the lighter top band (HUD backing).

---

## P3. Intro: hand over by 4.8 s, skip on any input

### P3.1 What happens today

- Timeline (`src/game/intro.ts` `IntroTimeline`, driven from `controller.ts` `frame`): t = 0 is the first `advance()` after the loop starts (first rendered frame), not page load. Hand at 600 ms, auto-tap at 3500 ms, title at `max(2500, strike + 1300)` = 4800 ms after the first frame. Boot (scripts, fonts, WebGL) comes on top: in `before/qa.json` the intro is still up at 4300 ms and the title is up at 5200 ms; in `final/qa.json` the intro is still up at 5200 ms.
- Skip: **it does not exist.** A pointerdown calls `intro.touch()`, which strikes the Crown and then still waits 1300 ms for the title (and at least until 2500 ms). Keys do nothing: `Input.keyDown` only handles `Digit`/`Numpad` and `Escape`/`KeyP`, and a digit key calls `input.tap(note)` without telling the timeline. The only immediate skip is the QA hook `__shatterhymnQA.skipIntro()`.

### P3.2 New timeline

`src/game/intro.ts`:

```ts
export const INTRO = { handMs: 450, autoMs: 2400, autoMinMs: 1200, autoAbsMaxMs: 3300,
  titleAfterStrikeMs: 1100, titleMinMs: 1800, titleAbsMaxMs: 4400, minShowMs: 1000 } as const;
export class IntroTimeline {
  constructor(readonly hold = false, readonly startAbsMs = 0) {}   // startAbsMs = performance.now() when the intro is created
  elapsed: number; struckAt: number | null; skipped: boolean;
  touch(): boolean;   // first input: strikes (struckAt = max(300, elapsed)) and sets skipped = true; returns true if this call struck
  advance(dt: number): { auto: boolean; title: boolean };
}
```

Rules (`abs = startAbsMs + elapsed`):
- Crown: unchanged, at 300 ms (`TAP_OPENING.crownAtMs`, the sim is not touched).
- Hand and `Tap a crystal!`: at `handMs` 450 ms (controller `frame`: `elapsed >= INTRO.handMs` instead of 600).
- Auto-tap: when nothing was struck and `elapsed >= max(autoMinMs, min(autoMs, autoAbsMaxMs - startAbsMs))`. Normal boot (start ≈ 600 ms): 2400 ms. Slow boot: earlier, never before 1200 ms.
- Title (`title: true`), the first of:
  1. `skipped` (any input): on the same frame;
  2. struck and `elapsed >= max(titleMinMs, struckAt + titleAfterStrikeMs)`;
  3. `abs >= max(titleAbsMaxMs, startAbsMs + minShowMs)` (hard cap, the intro always shows for at least 1 s). If nothing was struck yet, the same `advance()` also returns `auto: true`, so the Choir always plays (behind the title if needed).
- Hold mode (`?qa=1&intro=hold`): unchanged, freezes at 1200 ms; `touch()` returns false and never skips (keeps layout-check's `intro` screen stable).

Resulting times from page load with a typical 0.6 s boot: no input: auto-tap 3.0 s, title 4.1 s (target 4.0-4.5 s). Boot 1.5 s: auto 3.3 s, title 4.4 s. Worst case is the 4.4 s cap, which leaves 0.4 s margin for the 320 ms card slide inside the 4.8 s limit. If boot alone exceeds 3.4 s the 1 s minimum wins and 4.8 s cannot be met on that device; the lead's check runs on the reference setup.

### P3.3 Skip on any tap, click or key (`src/game/controller.ts`, `src/input/input.ts`)

- Pointer (touch, pen, mouse button 0) on `#surface` during the intro: `if (this.intro.touch()) { this.input.tap(0); this.clearDemo(); }` then `finishIntro()` on this frame. The Crown still shatters (the child's first touch still gets the Choir: flash, rings, shards, delighted face), but it plays **behind** the title, which mounts at once.
- Keys: in `showIntro` add a `keydown` listener on `window` (removed in `finishIntro`). Any key except lone modifiers (`Shift`, `Control`, `Alt`, `Meta`) skips the same way. Do not change `Input.keyDown`.
- When the title mounts from a skip or within 1200 ms of a Choir, fade the `CHOIR!` text out over 150 ms (new `GameRenderer.hideChoirText(fadeMs)`), so it never sits on the logo.
- The same finger must not press a card: `.title-screen.intro-arrival .mode-card { pointer-events: none; }` for 350 ms (remove the class after 350 ms with a `setTimeout` owned by the title screen and cleared on unmount).
- `finishIntro` is unchanged otherwise: `introDone = true` is saved when the title mounts; the board is not reset; the attract spawner starts 600 ms later.
- Test signal: `body[data-screen]` changes from `intro` to `title` in the same frame as `finishIntro`. With `?qa=1` only, also set `document.body.dataset.introEndMs = String(Math.round(performance.now()))`.

### P3.4 Tests (`tests/intro.test.ts`, rewrite the first two cases)

1. `no input, start 600 ms: auto-tap at 2400 ms elapsed, title at 3500 ms elapsed (4100 ms absolute)`; the intro sim gets a `choir` with n = 8.
2. `no input, start 1500 ms: auto-tap at 1800 ms, title at 2900 ms elapsed (4400 absolute)`.
3. `slow boot, start 3200 ms: auto-tap at 1200 ms, title at 1200 ms elapsed by the cap (4400 absolute)`.
4. `very slow boot, start 4000 ms: auto and title together at 1000 ms elapsed (minimum show)`.
5. `touch at 1000 ms: touch() returns true, next advance gives title: true; a second touch() returns false`.
6. `touch at 100 ms (before the Crown): struckAt is 300 and title is true at once`.
7. `hold mode: touch() returns false, no title, elapsed stays 1200` (keep the existing hold test).
8. `INTRO config equals POLISH P3`.

### P3.5 Acceptance (lead, Playwright, fresh context, no `shatterhymn:save` key)

- `?qa=1`, no input: `body[data-screen]` becomes `title` at `introEndMs` between 4000 and 4800 ms in 5 of 5 runs. The Choir happens before it.
- `?qa=1`, a touch at 1000 ms: `data-screen` is `title` within 50 ms; a still 300 ms later shows the red Choir shards behind the title cards and no `CHOIR!` text over the logo.
- Same with a mouse click, and with pressing Space; Shift alone does not skip.
- After a skip by touch, `data-screen` is still `title` 1 s later (the release did not start a run).
- `?qa=1&intro=hold` still freezes at 1200 ms and layout-check's `intro` screen is clean.

---

## P4. Hitting moving crystals

### P4.1 What the evidence says

`before/aim.json` (from `qa-aim.mjs`, 18 scripted attempts per mode on 390 x 844 touch):

- **Tap 12/18, but the crystals barely move** (median 36 px/s, `rPx` 35, `hitRPx` 48). Five of the six misses were the *first* try at a crystal that the *next* try hit (ids 14, 20, 26, 35, 38). Cause: `TapMode.tapAt` and `resolveStrike` only accept crystals with `rho <= TARGETABLE_R` (10.2), but crystals spawn at `SPAWN_R` 10.6 and are drawn from 280 ms after spawn. At beginner speed (0.90 × 0.85 = 0.765 u/s) a new crystal is on screen but cannot be hit for about 0.5 s. To a child that is "I tapped it and nothing happened".
- **Slice 12/18** with crystals moving 400-1300 px/s. Today hit testing already uses the continuous segment between consecutive blade samples (`capsuleProjection` in `src/sim/blade.ts`, called in `SliceSim.step`), so a fast swipe cannot skip a crystal that is standing still. What it does not handle: the crystal moves while the finger travels. A child aims where she *saw* the crystal (one frame plus 50-100 ms of reaction and touch latency ago); a rising crystal at 1.2 H/s has moved about 0.10 H (85 px) by then, about the whole reach of `hitRadius .085 + blade .020`. One miss (id 20, 2 px/s at the apex) cannot be geometric; it is most likely a stroke that never armed under CDP pacing, which P4 must not and does not change.

### P4.2 HARD CONSTRAINT (unchanged, tested)

`SLICE_BLADE.windowMs 64`, `minSpanMs 32`, `armHps 1.4`, `disarmHps 0.9`, `maxArmMs 350`, `maxArmPathH 1.5`, `maxCutsPerArm 6`, `rearmSlowMs 100`, and `BEGINNER_BLADE` `armHps 1.2`, `disarmHps 0.8`, `rearmSlowMs 80` stay exactly as they are. `src/sim/blade.ts` arming, budget clipping and `emit()` are not changed. Everything below only widens what an **already emitted (armed) segment** can touch. Nothing is ever tested against unarmed movement.

### P4.3 Tap: hit radius, targetable rim, overlap pick

`src/sim/config.ts`:

```ts
export const TARGETABLE_R = 10.65;   // was 10.2; ≥ SPAWN_R 10.6, so every drawn crystal can be tapped and struck
export const TAP_HIT = { minPx: { touch: 52, pen: 48, mouse: 40 }, shortFrac: { touch: .135, pen: .12, mouse: .09 },
  maxPx: { touch: 72, pen: 64, mouse: 52 }, scale: { touch: 1.45, pen: 1.35, mouse: 1.2 }, tieEps: 0.02, bellScale: 1.3 } as const;
```

`src/modes/tap/tapHit.ts` (pure):

```ts
export type PointerKind = 'touch' | 'pen' | 'mouse';
export function tapHitPx(visPx: number, pointer: PointerKind, shortSidePx: number): number;
// = max( clamp(shortFrac[p] × shortSide, minPx[p], maxPx[p]), scale[p] × visPx )
export function tapCandidates(crystals: readonly Crystal[], project: (x:number,y:number)=>{sx:number;sy:number}, visualScale: (rho:number)=>number): TapCandidate[];
// alive && rho <= TARGETABLE_R; visPx as today (golden × 1.25)
export function pickCrystal(cands: readonly TapCandidate[], x: number, y: number, groupCount: (note:number)=>number,
  pointer: PointerKind = 'touch', shortSidePx = 390): number | null;
```

Numbers: on a 390 px wide phone a touch tap reaches `max(52.7, 1.45 × visPx)` px from the crystal centre (was 48); a 360 px phone 52 px; a tablet is capped at 72 px unless the crystal is drawn larger; mouse 40-52 px.

Overlap rule in `pickCrystal` (when several crystals are inside their hit radius):
1. **On the crystal first:** candidates with `dist <= visPx` (the finger is on the drawn crystal) beat all others. Among them, smallest `dist / visPx` wins.
2. Otherwise smallest `dist / hitPx` wins (nearest, relative to reach).
3. Ties within `tieEps` .02: more targetable crystals of that colour, then smaller `rho`, then lower `id` (unchanged).

`src/input/input.ts`: `onTap(x, y, pointerType)` passes `'touch' | 'pen' | 'mouse'`. `TapMode.tapAt(x, y, pointer)` uses `tapCandidates` and `pickCrystal` with `Math.min(innerWidth, innerHeight)`. `TapMode.crystals()` reports `hitRPx = tapHitPx(rPx, 'touch', shortSide)`. Keyboard strikes are unchanged.

Tap crystal motion between frames is not compensated: Tap crystals move ≤ 45 px/s, so 100 ms of latency is under 5 px, well inside the radius.

### P4.4 Tap: slower early crystals

`src/sim/config.ts` and `src/sim/spawner.ts`:

```ts
export const TAP_EARLY = { beginner: { factor: .80, holdMs: 20000, rampMs: 10000 }, standard: { factor: .90, holdMs: 10000, rampMs: 10000 } } as const;
export function tapEarlySpeed(profile: 'beginner'|'standard', daily: boolean, elapsedMs: number): number;
// daily → 1; t < holdMs → factor; then linear to 1 over rampMs
```

Multiply the speed given to every crystal the **spawner** creates (`Spawner.update`, formations and events) by `tapEarlySpeed(...)` at spawn time. Not applied to the Crown (already 0.35) or the follow-up arc. Beginner L0 crystals in the first 20 s: 0.90 × 0.85 × 0.80 = 0.61 u/s (was 0.765). Standard first 10 s: 0.81 u/s. Daily unchanged (everyone plays the same Daily).

### P4.5 Slice: touch blade radius

`src/sim/sliceConfig.ts` (new, separate from `SLICE_BLADE`):

```ts
export const SLICE_AIM = { lagMs: 80, bladeMinPx: { touch: 22, pen: 18, mouse: 0 }, bladeShortFrac: { touch: .055, pen: .045, mouse: 0 }, bladeMaxH: .035 } as const;
export const SLICE_EARLY = { beginner: { factor: .75, holdMs: 15000, rampMs: 10000 }, standard: { factor: .85, holdMs: 8000, rampMs: 7000 } } as const;
```

`src/sim/blade.ts`: new pure `bladeRadiusH(pointer, areaWpx, areaHpx) = min(bladeMaxH, max(SLICE_BLADE.radius[pointer], max(bladeMinPx[p], bladeShortFrac[p] × min(areaW, areaH)) / areaH))`. `Blade.begin(x, y, t, pointer, radiusH?)` uses `radiusH` when given (otherwise `SLICE_BLADE.radius[pointer]`, so existing tests are unchanged). `SliceMode.begin` passes `bladeRadiusH(p.pointerType, area.width, area.height)`. On 390 x 844 touch: 22 px = 0.026 H (was 0.020 H, 17 px). Mouse stays 0.012 H. Total touch reach from a crystal centre: `.085 + .026 = .111 H` (94 px).

### P4.6 Slice: the crystal's motion (lag sweep)

`src/sim/sliceSim.ts`, in the segment loop of `step()`:

- Replace `capsuleProjection(seg, c.x, c.y, c.hitR)` with `sweptProjection(seg, c, lag, g)` (new pure function in `src/sim/blade.ts`), which tests the blade segment against the crystal's path over the last `lag` seconds instead of its current point:
  - `lag = min(SLICE_AIM.lagMs, c.ageMs) / 1000 × motionScale` (`motionScale` from P4.7, × 0.8 when Slower crystals is on), so the sweep matches what was drawn.
  - past point: `xp = c.x - c.vx × lag`, `yp = c.y - c.vy × lag - ½ × g × lag²` (exact ballistic rewind; `g = 0` when `test.gravity` is false).
  - hit when the segment-to-segment distance between `(seg.x0,seg.y0)-(seg.x1,seg.y1)` and `(xp,yp)-(c.x,c.y)` is `<= c.hitR + seg.r`; return the parameter `p` on the blade segment of the closest approach (used for the existing first-touched-first sort).
- Backward only: no forward lead, so a swipe in front of a crystal does not "magnet" it.
- Order, `maxCutsPerArm`, `blocked` arms, dark-hit rules, chains and scoring are unchanged. Because only armed segments reach the sim, the sweep cannot add a cut along an unarmed stretch, and a wiggle still gets one budget of at most 6 cuts.
- Add `stroke` and `arm` to the `darkHit` event (`sliceTypes.ts`) and use them in `SliceMode.tick` for `blade.stopArm` instead of re-testing geometry with `capsuleProjection(s, e.x, e.y, .04)`.
- Keep `capsuleProjection` for `pokeTarget`, the slow-cross demo hint and tests.
- `placeTestCrystals` accepts optional `vx, vy` (H/s). With `test.gravity === false`, crystals now integrate position with g = 0 (they stay put when v = 0, so existing tests are unchanged).

### P4.7 Slice: slower early crystals

`SliceSim.step`: `motionDt = dt × sliceEarly(profile, daily, elapsedMs)` where `sliceEarly` follows `SLICE_EARLY` (daily → 1; `t < holdMs` → factor; then linear to 1 over `rampMs`). Use `motionDt` for velocity, position and spin integration only. The wave timer (`waveTime`), `elapsedMs`, grace timers and the blade keep real `dt`, so MODES §22.3 wave times and every miss rule are unchanged.

Effect: beginner crystals move at 75% speed for the first 15 s (same arcs and apex heights, air time about 2.8-3.3 s instead of 2.1-2.5 s), back to 100% by 25 s. Standard: 85% for 8 s, 100% by 15 s. Daily: unchanged. `cut` events report `vx, vy` multiplied by the current scale, so halves leave at the speed the player saw.

### P4.8 Tests

`tests/blade-regression.test.ts` (or a new `tests/slice-aim.test.ts`), sample helpers as MODES §7.5 but with a settable interval:

1. `config: SLICE_BLADE and BEGINNER_BLADE equal the locked values` (every key listed in P4.2).
2. `a 3 H/s swipe sampled every 40 ms cuts a crystal lying between two samples` (crystal placed at the midpoint of samples 3 and 4, 0.05 H off the line).
3. `a 6 H/s swipe sampled every 50 ms (0.3 H between samples) cuts all 3 crystals 0.1 H apart on its path`.
4. `a slow drag at 0.5 H/s and at 1.0 H/s, sampled every 8 ms and every 40 ms, cuts 0 crystals in beginner and standard runs, with the crystals still and moving at 1.2 H/s`.
5. `a 1.1 H/s drag (standard) passing 0.15 H behind a crystal rising at 1.2 H/s cuts 0` (unarmed segments never use the sweep).
6. `lag sweep: a 2 H/s swipe passing 0.15 H below the centre of a crystal rising at 1.2 H/s cuts it; 0.25 H below does not`.
7. `no forward lead: a 2 H/s swipe passing 0.15 H above that rising crystal does not cut it`.
8. `the 5 s continuous wiggle (MODES §7.5 cases 9 and 10) still cuts at most 6, with the touch radius 0.026 H and with every crystal moving at 0.3 H/s`.
9. `cut cap: 10 crystals inside the swept reach of one 3 H/s stroke → exactly 6 cut`.
10. `bladeRadiusH: touch on 390 x 844 = 22/844; mouse = 0.012; never above 0.035`.
11. `sliceEarly: beginner 0.75 at 10 s, 0.875 at 20 s, 1 at 25 s; daily 1 always`; `wave launch times for beginner waves 1-7 are unchanged`.
12. `tests/slice-aim.test.ts › scripted child aim cuts at least 14 of 18 moving crystals`: beginner `SliceSim`, seed 7, aspect 390/844, waves and gravity on, cracks off. The "child" sees crystal positions from 6 ticks (100 ms) ago and aims straight at that seen point, no prediction. Per try: pick the oldest uncut normal crystal whose seen `y` is in [.30, .80]; swipe a straight 0.36 H line centred on the seen point, 25° from horizontal (alternating up and down), at 1.6 H/s, one sample every 16 ms, touch radius `bladeRadiusH('touch', 390, 844)`. A try is a hit if that crystal gets a `cut` during the stroke. Stop at 18 tries. Expect ≥ 14. Also log (not assert) the score with `lagMs 0` and the old radius, and report both in the final message.

`tests/tap-hit.test.ts` and `tests/tap.test.ts`:

13. `pickCrystal (touch, 390 short side): 50 px from a crystal with visPx 20 hits; 56 px misses; mouse 45 px misses`.
14. `on-the-crystal wins: a tap inside crystal A's drawn radius but nearer B's centre picks A`.
15. `two candidates outside both drawn radii: smaller dist / hitPx wins; ties use group count, rho, id` (keep the existing tie cases).
16. `tapHitPx: 390 → 52.7, 360 → 52, 820 → 72 (touch); scale term wins for visPx 60`.
17. `TARGETABLE_R >= SPAWN_R`, and `a crystal at rho 10.5 is struck by its colour` (update `tests/strike.test.ts` "does not target crystals outside the targetable radius" to use `TARGETABLE_R + 0.1` = 10.75, which still holds).
18. `tests/tap-aim.test.ts › scripted taps hit at least 17 of 18 including just-spawned crystals`: beginner `Sim`, seed 3, every 500 ms tap the newest alive crystal (fake projection `sx = 195 + 18x`, `sy = 422 - 18y`, `visPx = 18 × r × visualScale`), with a seeded aim error up to 14 px; a hit is when the picked crystal is that one or its colour. Expect ≥ 17.
19. `tapEarlySpeed: beginner 0.80 until 20 s, 0.90 at 25 s, 1 at 30 s; standard 0.90 until 10 s; daily 1`. Update MODES §4.9 test 7: a beginner L0 crystal spawned at 6 s has speed 0.90 × 0.85 × 0.80.
20. No-input standard run length: the bound becomes **14-75 s** for 20 seeds (early slowing lengthens idle runs slightly). If a seed still falls outside, report it; do not change other numbers.

### P4.9 Acceptance (lead)

- `node qa-aim.mjs dist out both` on the reference setup: Tap ≥ 14/18 hits (expected 17-18 now that new crystals are tappable), Slice ≥ 14/18. If Slice is below 14, add `blade().maxSpeedHps` per try to the harness: tries whose stroke never armed are a harness pacing issue (CDP touch timing), not a hit-test failure; the binding gate is unit test 12.
- MODES §19.4 end-to-end check unchanged: slow drag at 0.5 H/s cuts 0 (mouse, CDP touch, `swipe()`), 3 H/s cuts 3, 5 s wiggle over 24 crystals cuts at most 6.
- Video of a beginner Slice run: in the first 15 s crystals visibly hang longer; swipes that pass just behind a rising crystal cut it.
- Tests 1-20 pass; test count reported.
- Spec-note for the lead (not part of P4): `before/qa.json` shows `touch@0.5` cutting 1 crystal at a measured 0.09 H/s. This is most likely bunched CDP timestamps (several samples a few ms apart after a stall give a windowed speed spike above the arm threshold). P4 does not change arming. Recheck it with `swipe()` and with a real phone before blaming the blade.

---

## P5. Five more first-10-seconds rough spots

Each is one small push or can ride with any other; each stands alone.

### P5.1 `CHOIR!` is hidden under the HUD in Tap runs

- Evidence: `tap-1-shatter.png` (first Tap run, the Crown Choir): `+580` is bright but `CHOIR!` and `8 at once` are almost invisible dark olive text. In the intro, where the HUD is hidden, the same text is bright gold (`intro-4300.png`).
- Cause: `renderer.ts` creates `choirText` with `zIndex: "6"` at `top: 17%`; `#hud` is `z-index: 7` and its `::before` gradient covers the top of the screen, so the text is drawn under it.
- Fix: `choirText` `zIndex` "6" → "8" (above `#hud` and `#screens`, `pointer-events: none` already). On pause, call `hideChoirText(0)` (from P3, or add it here: sets opacity 0 and stops the hold) so it never sits over the pause panel.
- Acceptance: in the `tap-1-shatter` moment the `CHOIR!` fill measures `#FFD27A` ±12 per channel (Y ≥ 180) with its glow; it does not overlap the score; it is gone when the pause panel opens.

### P5.2 Slice: the bell's face is cut off by the bottom edge

- Evidence: `slice-split.png`, `slice-fastswipe.png`, `slice-play-2.png`, `aim-slice-end.png`: the face plate's lower third is off screen; the mouth sits on the edge.
- Fix: Slice bell and face centre from sim y .09 to **.13 H** (`renderer.ts`, the Slice face position `y -4.1` → `-3.7` world, and the bell mesh with it). Move the warm glow in `shaders/background.ts` from `vec2(.5,.09)` to `vec2(.5,.13)`. Keep the face size. `FACE.sliceWorriedY` .28 unchanged. Add `SLICE_FX.bellY = .13` and use it in all three places.
- Test: `tests/slice-fx.test.ts › the slice face is fully on screen: bellY - faceRadiusH >= 8 / 844`.
- Acceptance: on 390 x 844 and 844 x 390 the whole face plate (both eyes, mouth, plate edge) is visible with at least 8 px to the bottom edge.

### P5.3 Slice: crystals fly partly off the left and right edges

- Evidence: `aim-slice-end.png`: a yellow diamond and a red triangle are half off the left edge. On a 390 px phone `W = .462 H`, `apexXFrac .15` puts the apex at 0.069 H while the crystal radius is 0.075 H; the landing side `2 × xApex - x0` can go further out.
- Fix in `SliceSim.launch` (pure, seeded): margin `m = r + .02` (normal .095 H, dark .090 H). Pick `xApex` in `[max(m, apexXFrac[0] × W), min(W - m, apexXFrac[1] × W)]`; pick spread `s = rng.range(-1, 1) × min(maxVx × tApex, xApex - m, W - m - xApex)`; `x0 = xApex - s`, `vx = s / tApex`. Launch, apex and landing x are then all inside `[m, W - m]` and `|vx| <= maxVx`. Chord toss x: `m + (W - 2m) × fraction` instead of `W × (.15 + .7 × fraction)`. Wave 1's fixed row is already central.
- Test: `tests/slice-core.test.ts › every toss stays fully on screen`: 500 launches each at aspect .462 and 2.0, stepping every tick until the crystal falls, `m - 1e-6 <= x <= W - m` throughout. Determinism and the wave-table tests still pass.
- Acceptance: in a 60 s beginner Slice video at 390 x 844, no crystal is ever clipped by a side edge.

### P5.4 Tap: a grey "loading spinner" at the arena rim

- Evidence: `tap-2-mid.png` and `aim-tap-end.png` show a pale grey half-ring near the bottom of the arena. It is the event warning (`renderer.ts`, `this.glow.arc(x, y, .5, 1, this.warnAngle, this.goldColor.setHex(0xc2cad8), .7)`), shown 1 s before a Golden or Chord wave. A child reads it as "loading", and it is the only grey thing on the board.
- Fix: colour from the warning event: Golden → `#FFD27A`, Chord → `NOTE_COLORS[this.warnNote]`. Radius 1 → 1.4. Alpha `.55 + .35 × sin(2π × 3 t)` (3 Hz pulse); reduced motion: steady .8. Pure helper `warnColor(kind, note): number` in `fxConfig.ts`; store `kind` next to `warnNote` when the `eventWarn` event arrives.
- Test: `tests/w1-visual.test.ts › warnColor is gold for golden and the note colour for chord`.
- Acceptance: the stills before the beginner Chord wave (about 14 s) show a pulsing arc in that chord's colour, no grey arc anywhere.

### P5.5 `BEST 0` on a first run

- Evidence: every first-run still in both modes shows grey `BEST 0` under the score. It means nothing to a child on her first go and is the only grey text in the HUD.
- Fix: pure `bestLabel(best: number): string | null` in `src/ui/hudModel.ts` returns `null` for 0, else `BEST 12,400` (today's format). `hud.ts` sets `this.best.hidden = label === null`. The live "new best" path only runs when a best exists, so it is unaffected.
- Test: `tests/hud-model.test.ts › bestLabel hides 0 and formats 12400 as "BEST 12,400"`.
- Acceptance: first Tap and first Slice runs show no `BEST` line; after one run it appears with the previous score.

---

## Proposed MODES.md changes (for the lead to paste as §23 when approving)

- P1: §8.3 halves tumble to face the camera (55° in 220 ms), flat glowing cap per half, cools in 540 ms, spill shards 14 / 10 / 6, half scale from `SLICE_TOSS.radius`. §17: caps add 1 draw call (still ≤ 20).
- P2: §9.1-9.3 Tap path: `TAP_STAGE` palette replaces the Tap use of `BOARD.glass*`, `PLAY_START.rose` and the Y ≤ 48 / 2.5× rule; contrast is kept by `CRYSTAL_EDGE` outline, hue and value as in P2.2. §22.6 is superseded. HUD backing becomes violet and short; `.hud-backing` is removed. `VIGNETTE.darkness` .30.
- P3: §2.1 timeline: hand 450 ms, auto-tap 2400 ms (earlier on slow boot), title strike + 1100 ms, hard cap 4400 ms from page load; any tap, click or key skips to the title at once while the Choir plays behind it. §14.3 Intro row: hand at 450 ms.
- P4: §4.1 `TAP_HIT` by pointer type, overlap rule "on the crystal first", `TARGETABLE_R` 10.65. §4.5 and §6.2 early speed factors. §6.5 cut test against the crystal's last 80 ms of motion. §7.1 unchanged; new `SLICE_AIM`. §4.6 idle bound 14-75 s.
- P5: §6.1 Slice bell at `(W/2, .13)`; §6.2 toss x margins; §13 no `BEST` line while the best is 0.


## Lead amendment (P4, 2026-10-29)

`SLICE_AIM.lagMs` is 120, not 80. With 80 ms the scripted child aim (aims where the crystal was 120 ms ago, jitter 0 to 30 px) averaged 13.75/18 over four runs; with 120 ms it scored 16, 16 and 14 of 18. 120 ms matches a child's reaction lag. Blade arming and stroke-cap values are unchanged, and the velocity e2e is identical (0.5 and 1.0 H/s cut 0, 3 H/s cut 3/3, 5 s wiggle cuts 2/24).


## P6 art fixes

Tap crystals have a #241445 contact halo at 1.30 times draw radius and .55 alpha. The stage lead and frame are #b8843a (lead amendment: Codex's #6c482e read as muddy brown; under every crystal the halo darkens the lead, so the contrast test checks the halo-darkened lead, and gems brighter than the raw lead must clear it by 40 luma); the frame glow remains amber. Light crystal edges use Rec.709 luma with smoothstep .45–.75, adding .15 edge gain and lowering the edge threshold by .06.

The first four Slice waves launch vertically outside the bell face's .10 H radius plus crystal radius and .04 W clearance. The fourth also clears the face during the first six seconds. On narrow screens this requires partial side clipping: the clearance band and the P5.3 side margin cannot both fit.

With `?qa=1`, `tapTestBoard()` freezes the Tap simulation and displays the five note colours, golden, mend and dark, evenly spaced at radius 7.
