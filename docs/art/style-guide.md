# SHATTERHYMN — Art Direction & Style Guide

Version 1.0 · 2026-10-27. Normative. Every number here is a starting value that must exist as a named constant (`src/render/fxConfig.ts` or `src/sim/config.ts`). "Wow" is a requirement, not a stretch goal: no flat placeholder art may ship in any milestone. If a milestone needs an object before its final look exists, use the final shader with fewer features, never a flat-colour box.

---

## 1. Direction in one paragraph

**"Light inside a black cathedral."** A near-black indigo void, cut by soft beams from high, unseen windows. On the floor, a circular stave of faintly engraved rings, like the floor of a bell tower. At the centre hangs one clear glass bell that glows the colour of the note it's about to sing. Crystals drift in from the dark: faceted, gem-cut prisms that glow from inside with saturated, almost neon colour, rimmed with white light. When they break, they don't vanish. They burst into hundreds of tumbling 3D glass shards that catch the light and are drawn back into the bell. Everything that matters glows. Everything else is dark. Contrast does the work.

References for mood (do not copy): stained-glass light on stone, Tetris Effect's particle bloom, Rez's synesthesia, Monument Valley's restraint, Hollow Knight's hit flash.

## 2. Palette

### 2.1 Environment
| Token | Hex | Use |
|---|---|---|
| `void-0` | `#05040C` | screen edges, deepest background |
| `void-1` | `#0B0920` | background gradient bottom |
| `void-2` | `#151033` | background gradient top / fog base |
| `fog` | `#2A2163` | nebula fog highlights (max 35% opacity) |
| `beam` | `#B9C6FF` | god-ray light beams (additive, ≤ 9% opacity) |
| `floor-line` | `#3B3480` | engraved stave rings (40–70% opacity) |
| `floor-glow` | current note colour | floor glow under the bell (radius 4, ≤ 30%) |

### 2.2 Notes (identical to design.md §4)
| Note | Base | Hot core (HDR ×) | Dark facet |
|---|---|---|---|
| 0 Red triangle | `#FF4F6E` | `#FFB3C0` ×1.8 | `#7A1230` |
| 1 Yellow diamond | `#FFC23F` | `#FFE8A8` ×1.7 | `#7A4A06` |
| 2 Green hexagon | `#3FE0A0` | `#B8FFE2` ×1.7 | `#0B5A3E` |
| 3 Blue star | `#4FA8FF` | `#C2E2FF` ×1.8 | `#103C7A` |
| 4 Purple circle | `#C77DFF` | `#EBD3FF` ×1.8 | `#46177A` |

The five bases differ in hue *and* luminance (yellow and green brightest, purple and red darkest), and shapes differ too, so the set stays distinguishable under deuteranopia and protanopia.

### 2.3 Bell, specials, UI
| Token | Hex | Use |
|---|---|---|
| `glass` | `#E8F1FF` | bell body tint (alpha 0.18) |
| `glass-rim` | `#9FD8FF` | bell fresnel rim |
| `crack` | `#FF3B5C` | fresh crack lines, damage flash, low-health vignette |
| `mend-gold` | `#FFD27A` | mended cracks (kintsugi), Mend crystal glow ring |
| `geode-rock` | `#2A2438` → `#4A4060` | geode shell gradient |
| `prism` | rainbow cycle through the 5 note bases | prism rim |
| `gold` | `#FFD27A` | multiplier, New best, Choir text, primary buttons |
| `gold-deep` | `#F0A84A` | primary button gradient end |
| `ink` | `#F4F1FF` | primary text |
| `ink-muted` | `#A59FC9` | secondary text (contrast 7.2:1 on `void-1`) |
| `ink-dark` | `#1A1030` | text on gold buttons |
| `panel` | `rgba(18,14,42,0.62)` | glass panels |
| `panel-line` | `rgba(255,255,255,0.12)` | panel borders |

### 2.4 Bell skins (design.md §10.2)
| Skin | Body tint / alpha | Rim | Shatter flash tint | Card frame |
|---|---|---|---|---|
| Clear Glass | `#E8F1FF` / 0.18 | `#9FD8FF` | white | silver `#C9D6F2` |
| Smoked Quartz | `#8B7B6E` / 0.35 | `#E0C9B0` | warm white `#FFF0DD` | `#B49A80` |
| Rose Gold | `#E8A090` / 0.30 | `#FFD0B8` | `#FFE2D6` | `#E8A090` |
| Obsidian | `#151020` / 0.80 | `#8A7CFF` | violet-white `#E6E0FF` | `#5A4FA0` |
| Aurora | animated hue gradient (`#3FE0A0`→`#4FA8FF`→`#C77DFF`, 8 s loop) / 0.30 | `#D8FFF4` | cyan-white | animated gradient |
| Rose Window | stained-glass segments (5 note colours in 10 lead-lined panels) / 0.55 | `#FFD27A` | gold | gold `#FFD27A` |
| Choirmaster's Crown | Clear Glass + gold crown of 5 small floating gems orbiting at 0.4 rad/s | `#FFD27A` | gold | gold + gems |

## 3. Lighting & materials (three.js, custom shaders)

There are no three.js lights. Every material is a small custom `ShaderMaterial` that reads a shared uniform block `uKeyDir = normalize(vec3(-0.35, 0.55, 0.76))`, `uTime`, `uNoteColor` (current dial note), `uNoteGlow` (0..1). Output is linear HDR. Tone mapping happens once in post (ACES Filmic).

### 3.1 Crystal (one `InstancedMesh` per shape = 5 meshes)
- **Geometry:** `THREE.ExtrudeGeometry` of the 2D glyph (triangle, rhombus, hexagon, 5-point star with inner radius 0.45, 24-segment circle), `depth 0.30, bevelEnabled true, bevelThickness 0.14, bevelSize 0.10, bevelSegments 1`, then `toNonIndexed()` + `computeVertexNormals()` for hard faceted normals. Scale so the circumradius = 1 and set the per-instance scale to the crystal radius. Centre the geometry on z.
- **Per-instance attributes:** `aColor` (vec3 base), `aCore` (vec3 hot core), `aFlash` (0..1), `aCrack` (0..1 fracture-line progress), `aFade` (0..1 alpha for spawn fade), `aKind` (0 normal, 1 geode-shelled, 2 prism, 3 splitter, 4 rusher, 5 mend).
- **Fragment recipe:**
  1. `facet = 0.25 + 0.75 * max(dot(N, uKeyDir), 0.0)`, quantised to 4 steps (`floor(facet*4)/4`) for a gem-cut look.
  2. `body = mix(darkFacet, aColor, facet)`.
  3. `fres = pow(1.0 - max(dot(N, V), 0.0), 2.6)`. Rim = `mix(vec3(1.0), aCore, 0.4) * fres * 1.6`.
  4. Iridescence: `irid = 0.5 + 0.5 * cos(6.2831 * (fres * 1.3 + vec3(0.0, 0.33, 0.67)))`, added at `0.12 * fres`.
  5. Inner core glow: `aCore * 1.7 * smoothstep(0.55, 0.0, length(vLocal.xy))` (bright centre that bloom picks up).
  6. Fracture lines: 3-octave Voronoi-edge pattern in local xy; `line = 1 - smoothstep(0.0, 0.04, edgeDist)`, masked by `aCrack`; adds `vec3(4.0) * line`.
  7. Flash: `mix(color, vec3(4.0), aFlash)`.
  8. Geode (`aKind==1`): outer 70% of the radius gets a rough rock (`geode-rock` gradient × value noise, no glow), with the coloured core visible through 3 cracks. On shell break, a 120 ms white flash and 10 grey rock shards (shard pool, rock colour, no emissive).
  9. Prism (`aKind==2`): `aColor` lerps between the note colours each second (renderer sets it from sim's current prism note, with a 150 ms crossfade), plus a rainbow rim `irid * 0.6 * fres`.
  10. Splitter (`aKind==3`): a bright seam line down the local y-axis (`smoothstep(0.03,0.0,abs(vLocal.x))` × 2.5).
  11. Rusher (`aKind==4`): 1.3× core intensity. Trail = 6 ghost copies drawn as the last positions at decreasing alpha (use the same instanced mesh with `aFade`).
  12. Mend (`aKind==5`): a gold ring billboard behind it (`mend-gold`, additive, pulsing 1.5 Hz) and the body desaturated 50% toward white.
- **Motion:** each crystal spins about its own z at 0.6–1.2 rad/s (random sign) and wobbles ±12° about x/y with 0.7 Hz sine. Hovers at z = 0.6 with ±0.08 bob. Spawn: scale 0 → 1 over 280 ms with `easeOutBack(1.7)` while `aFade` 0 → 1.
- **Danger glow:** when `rho < 4.5` the core pulses at 3 Hz (`aCore × (1 + 0.35 sin)`), so the most urgent crystals read first.

### 3.2 Bell
- **Geometry:** `LatheGeometry` with 48 radial segments from this profile (x = radius, y = height, units = world), then rotate so the bell's mouth faces the camera (−z → up): `(0.00,1.30) (0.32,1.28) (0.52,1.15) (0.62,0.90) (0.66,0.55) (0.74,0.20) (0.92,-0.12) (1.08,-0.30) (1.12,-0.38) (1.00,-0.40)`. World scale 1.0. It sits at z = 0.9.
- **Shader:** glass: `alpha = skin.alpha + fres * 0.7`, rim colour `glass-rim × 1.4`, inner glow `uNoteColor × (0.6 + 1.6 * uNoteGlow)` concentrated at the mouth. Additive specular streak: a vertical band in view space that slides ±0.2 over 4 s.
- **Halo:** a flat ring on the floor at `HALO_R = 1.6`, width 0.06, `ink` colour at 35%. It turns `crack` colour and pulses when any crystal is within 1.5 of it.
- **Halo dial:** 5 arc segments around the bell on the floor, radius 2.15, width 0.14, each 64° long with 8° gaps, in note colours. Inactive notes are drawn at 12% opacity, active at 45%, and the current dial note at 100% with HDR ×2.0. This is the in-field mirror of the bottom dial, because eyes stay on the bell.
- **Cracks:** three procedural crack decals (a canvas texture drawn once at boot: a jagged polyline from rim towards the top with 2–3 branches, 3 px wide, seeded), revealed in order on the bell surface as emissive `crack × 2.2`. When mended they switch to `mend-gold × 1.8` and a 600 ms gold shimmer travels along them.
- **Grace:** while `CRACK_GRACE_MS` is active the whole bell rim goes white ×2.

### 3.3 Floor & background
- **Background:** one full-screen triangle drawn first, depth off. Shader: vertical gradient `void-1 → void-2`; 4-octave fBm fog in `fog` at ≤ 35%, drifting 0.01 u/s; 5 god-ray beams = soft vertical bands from the top, angle −12°, width 6–14% of the screen, drifting ±3% over 20 s, `beam` at ≤ 9% additive, brightened ×3 during Choir. A radial falloff toward `void-0` at the edges.
- **Floor:** a plane at z = 0, radius 12, transparent. Engraved stave rings at r = 2.5, 5.0, 7.5 and 10.0 (the outer one at 70% opacity, width 0.05, the others at 40%, width 0.03). 5 faint spokes at the note angles (`floor-line` at 15%). Slow caustic shimmer (two scrolling noise layers, `max()` combined, 6% intensity). `floor-glow` disc under the bell in the current note colour, radius 4, strength `0.12 + 0.25 * uNoteGlow`. On `levelUp`, a bright ring sweeps from r = 0 to 12 over 900 ms.

### 3.4 Shards (the money shot)
- One `InstancedMesh` of `TetrahedronGeometry(1, 0)` with a shard shader: faceted (same 4-step quantised facet), `colour × (0.8 + 1.6 * facet)`, rim ×2, alpha by life. Additive blending is **off** (shards are solid glass); a separate additive spark `Points` layer gives glints.
- Pool size by tier (§4.3): 1200 / 800 / 450. When the pool is full, recycle the oldest.
- **Per crystal shattered:** 18 shards (tier High), 12 (Medium), 7 (Low), Choir victims +6. Size 0.05–0.16 (random, squared distribution so most are small). Initial velocity: radial outward from the crystal's centre (direction away from the bell ± 70°), speed 4–10 u/s, z-velocity 1–5 u/s. Angular velocity 4–14 rad/s about a random axis. Drag: `v *= exp(-2.4 dt)`.
- **Harvest:** after 0.45 s of life, each shard is attracted to the bell: `a = normalize(bell − p) × 18 + tangent × 6` (tangent = the CCW perpendicular, which gives the galaxy spiral), with speed capped at 16 u/s. When within 0.9 of the bell it dies and adds +0.02 to `uNoteGlow` (cap 1, decays 1.5/s) plus a spark. Max life 2.2 s (fade out over the last 0.3 s).
- **Sparks:** `Points`, pool 400, additive, size 6–14 px (DPR-scaled), white → note colour, life 0.25–0.6 s. 6 per shattered crystal, 2 per harvested shard (rate-limited to 60 / frame).

### 3.5 Shockwave rings
Pool of 10 flat ring meshes on the floor. Shader: `alpha = (1 - t)^1.5 * smoothstep(w, 0, abs(r - R(t)))`. Strike ring: note colour, R 0 → 11 over 420 ms (`easeOutCubic`), width 0.35 → 0.08. Dud ring: `ink-muted`, R 0 → 3 over 300 ms. Crack/flare ring: `crack`, R 0 → `FLARE_R` over 220 ms. Choir: 3 rings (note colour, white, gold) staggered 50 ms apart, R 0 → `CHOIR_R` over 220 ms then → 12 by 700 ms.

### 3.6 Resonance threads
When a strike hits N ≥ 2, draw a thin light line (instanced quad, width 0.04, note colour ×2.5 HDR) from the bell to every target for the duration of the hitstop, alpha 1 → 0 over the following 120 ms. This makes "one note → many crystals" readable at a glance.

## 4. Rendering stack (decision)

### 4.1 Choice: **three.js (r186+) + pmndrs `postprocessing` (6.39+)**, Vite, TypeScript.

Why, against PixiJS v8:
- The signature moment needs **real 3D glass shards** tumbling toward and past the camera, catching a key light on faceted normals. That is native in three.js (one `InstancedMesh` = one draw call for 1200 shards), and would be fake sprite rotation in Pixi.
- pmndrs `postprocessing` merges bloom (mipmap blur, HDR), vignette and tone mapping into a single fullscreen pass, which is far cheaper on mobile than chaining separate passes. Pixi filters are separate passes each.
- The scene is tiny: ~15 draw calls total (background 1, floor 1, halo + dial 2, bell 1, crystals 5, shards 1, sparks 1, rings 1–3, threads 1). Mobile GPUs handle this with lots of headroom at DPR 1.5–2 with half-resolution bloom.
- The HUD and menus are DOM (crisp text, accessible, cheap), so we don't need Pixi's 2D text strengths.

### 4.2 Setup (exact)
- `new WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false, depth: true, alpha: false })`, `outputColorSpace = SRGBColorSpace`, `toneMapping = NoToneMapping` (post does it), clear colour `void-0`.
- `EffectComposer(renderer, { frameBufferType: HalfFloatType })`.
- Passes: `RenderPass(scene, camera)` → `EffectPass(camera, bloom, vignette, toneMapping)` → `EffectPass(camera, chromaticAberration, noise)`. (Chromatic aberration is kept in its own pass because the library will not merge it with convolution effects. On tier Low, the second pass is disabled entirely.)
  - `BloomEffect({ mipmapBlur: true, intensity: 1.15, luminanceThreshold: 0.55, luminanceSmoothing: 0.25, radius: 0.7, resolutionScale: 0.5 })`
  - `VignetteEffect({ offset: 0.32, darkness: 0.68 })`
  - `ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC })`
  - `ChromaticAberrationEffect({ offset: new Vector2(0.0006, 0.0006), radialModulation: true, modulationOffset: 0.35 })`
  - `NoiseEffect({ premultiply: true })` with `blendMode.opacity.value = 0.035` (film grain that hides banding in the dark gradient).
- **Camera:** `PerspectiveCamera(fov 30°)`, looking at the origin from a point tilted 10° off the vertical toward −y (so crystals show their bevels). The camera distance is computed every resize so a circle of radius 11.0 fits inside the **arena box**: 94% of the viewport width × 66% of the viewport height, centred at 50% height. World up = +y on screen.
- `renderer.setPixelRatio(tierDPR)`; canvas fills the window; resize on `resize` + `visualViewport.resize`, debounced 100 ms.

### 4.3 Quality tiers & 60 fps budget
| Tier | DPR | Shards | Sparks | Bloom res | CA + grain pass | Default for |
|---|---|---|---|---|---|---|
| High | `min(devicePixelRatio, 2)` | 1200 | 400 | 0.5 | on | `pointer: fine` |
| Medium | `min(devicePixelRatio, 1.5)` | 800 | 300 | 0.5 | on | `pointer: coarse` |
| Low | 1.0 | 450 | 160 | 0.35 | off | fallback |

Auto-tier: keep a rolling mean of frame time over 90 frames (ignore the first 2 s and any frame > 250 ms). If the mean is > 19 ms, step down one tier (at most once every 3 s). If the mean is < 11 ms for 6 s straight and the tier was lowered this session, step up once (once per session). Budget: ≤ 16 draw calls, ≤ 120k triangles, no per-frame allocation in render/sim loops (preallocate typed arrays and `Matrix4`/`Vector3` scratch objects).

## 5. Signature wow moment — the CHOIR (frame-by-frame at 60 fps)

Trigger: a strike with N ≥ 7. "Real ms" = wall clock; the sim is frozen or slowed, the render loop never stops.

| Real time | Frames | What happens |
|---|---|---|
| 0 ms | f0 | Release. Bell squashes to (1.08, 0.88) scale. All N targets set `aFlash = 1` (white HDR ×4). Full-screen white overlay at alpha 0.35. Bloom intensity → 2.4. CA offset → 0.0045. Trauma += 0.55. Music bus ducks −9 dB over 60 ms. Audio: heavy glass transient + heavy bell + the Choir chord (§8). Haptic `choir` starts. **Sim freeze 160 ms begins.** |
| 17–150 ms | f1–f9 | Freeze. Targets' `aCrack` animates 0 → 1 (fracture lines race across each crystal). Resonance threads from bell to each target at full brightness. White overlay fades 0.35 → 0 by f4. Camera fov springs 30° → 29.1° (a 3% punch-in). God-ray beams brighten ×3. Flash on targets decays 1 → 0.6. |
| 160 ms | f10 | **Burst.** Every target explodes into shards (§3.4 counts). Three Choir rings launch (note colour, white, gold, 50 ms apart). `CHOIR!` (Cinzel 700, 72 px, `gold`, HDR-looking text-shadow glow) slams in at the bell's screen position: scale 1.6 → 1.0 on a spring (4 Hz, ζ 0.45), with `"8 at once"` (Inter 600, 20 px) below. Sim resumes at time scale **0.25**. |
| 160–410 ms | f10–f24 | Choir sweep: the gold ring passes outward. Each sweep victim's burst is delayed visually by `dist / CHOIR_R × 220 ms`, so crystals pop in a ripple from the centre out, each with a small sweep tick sound (pitched up by distance). |
| 160–760 ms | f10–f45 | Slow-mo: shards drift and tumble at 0.25× (the render-side shard sim also uses the scaled dt so they hang in the air). Sparks flicker. Over the last 250 ms the time scale ramps linearly 0.25 → 1.0. Bloom decays 2.4 → 1.15 (exponential, rate 3/s). CA decays to base (rate 6/s). |
| 610–1700 ms | f37–f102 | Harvest: shards spiral into the bell like a galaxy. Each arrival brightens the bell; the HUD score rolls up (count-up over 600 ms, `easeOutCubic`) and the shard counter ticks. Music un-ducks over 1000 ms. |
| 1700 ms | f102 | Settled. `CHOIR!` text fades out over 300 ms. |

The same ladder, scaled down, applies to every strike (§6.1), so the Choir feels like the top of a staircase the player has climbed hundreds of times.

## 6. Motion

### 6.1 Hitstop (sim freeze; render continues)
Implement as `freezeUntil = max(freezeUntil, now + ms)`. Never add up freezes. Input events during a freeze are queued and applied when it ends.

| Event | Freeze ms | Ramp | After |
|---|---|---|---|
| Strike shatter N = 1 | 44 (`min(160, 30 + 14·N)`) | instant in, instant out | — |
| N = 2 | 58 | — | — |
| N = 3 | 72 | — | — |
| N = 4 | 86 | — | — |
| N = 5 | 100 | — | — |
| N = 6 | 114 | — | — |
| Choir (N ≥ 7) | 160 | — | 0.25× slow-mo for 600 ms, last 250 ms ramping to 1× |
| Close call (added once per strike) | +20 | — | — |
| Shell break only (no shatter) | 30 | — | — |
| Crack | 120 | — | — |
| Mend | 60 | — | — |
| Game over | 250 | — | 0.3× for 900 ms |
| Dud | 0 | — | — |

Total freeze in one event is capped at 180 ms, except game over (Swink: anything above ~150–200 ms starts to feel like lag).

### 6.2 Trauma screen shake
- `trauma ∈ [0,1]`, `shake = trauma²`. Decay 1.6 / s linear.
- Camera offset `x,y = maxOffset × shake × noise(seed_i, t × 18 Hz)`, with `maxOffset = 0.35` world units. Roll = `2.5° × shake × noise(seed_r, t × 18)`. Use 1D smooth value noise (not per-frame random).
- Add: strike `0.10 + 0.04·N` (cap 0.45); close call +0.05; crack 0.60; Choir 0.55 (plus the strike's own); game over 0.9; dud 0.08.
- Multiplied by Settings → Screen shake (0–1). Forced to 0 under Reduce motion.

### 6.3 Springs
Use frequency/damping springs (semi-implicit Euler, `ω = 2πf`): `v += (-ω²(x − target) − 2ζω v) dt; x += v dt`.

| Spring | f (Hz) | ζ | Use |
|---|---|---|---|
| Bell scale | 3.2 | 0.35 | squash/stretch recovery |
| Bell tint | 6 | 1.0 | colour follows dial note |
| Dial glyph scale | 5 | 0.45 | active note pops to 1.25 |
| Dial caret x | 7 | 0.8 | caret slides to the active note |
| HUD score pop | 4 | 0.45 | score scale punch 1.18 on every strike |
| Multiplier chip | 4.5 | 0.4 | punch on increase, shrink on reset |
| Panel enter | 3.5 | 0.7 | results/pause panels slide up 40 px + fade |
| Camera fov | 2.5 | 0.6 | Choir punch-in |
| Pop text | 4 | 0.5 | scale-in 1.4 → 1.0 |

### 6.4 Squash & stretch, anticipation
- **Press:** bell anticipation squash to (1.06, 0.92) over 90 ms (`easeOutQuad`). While holding, a tremble: rotation ±(0.6° + 0.4° × hold seconds, cap 3°) at 11 Hz, and the inner glow rises.
- **Release (strike):** bell stretch to (0.94, 1.12) instantly, then spring back. Strike ring launches the same frame.
- **Dial step:** bell does a tiny bump (scale +0.03) and the tint springs to the new note.
- **Crystal spawn:** `easeOutBack(1.7)` scale-in, 280 ms.
- **Crystal hit (geode shell break):** squash 0.85 for 60 ms, flash white 50 ms.
- **Shatter:** the crystal flashes white for 3 frames (50 ms) at the start of the freeze, scale-punches to 1.15, then bursts at the end of the freeze.
- **Dud:** bell wobble: rotation `8° × e^{−6t} × sin(2π·7t)` for 600 ms, plus a grey tint.
- **Crack:** bell recoils away from the impact side by 0.15 units (spring back), plus a red flash on the bell for 80 ms.

### 6.5 Pop text
DOM pool of 12 elements, positioned by projecting the world point each frame, using `transform` only. Strike points: `+90` (Inter 800, 22 px + 2 px per N, cap 40 px, note colour with a white inner stroke), rises 40 px over 700 ms and fades over the last 250 ms. N ≥ 2 adds a second line `3 at once!`. Close: `Close!` gold, 16 px. Dud: `Missed` in `ink-muted`.

### 6.6 Easing defaults
UI fades `easeOutCubic` 180 ms; panel slides on springs; count-ups `easeOutCubic` 600 ms; nothing linear except time-scale ramps.

## 7. Haptics

### 7.1 Pattern table (`navigator.vibrate`, Android / Chromium)
Pulses stay ≤ 20 ms (longer single pulses feel buzzy). Strength is expressed by pulse count and spacing. Fire on the same frame as the visual impact (the *start* of the freeze for shatters).

| Event | Pattern (ms on, off, on…) | Priority |
|---|---|---|
| `ui` (button tap) | `[6]` | 1 |
| `tick` (dial step) | `[8]` | 2 |
| `dud` | `[10, 40, 10]` | 3 |
| `close` (extra, after the shatter pattern) | `[6, 30, 6]` | 4 |
| `shatter1` (N = 1) | `[14]` | 5 |
| `shatter2` (N = 2–3) | `[14, 30, 16]` | 5 |
| `shatter4` (N = 4–6) | `[16, 24, 18, 24, 20]` | 5 |
| `shell` | `[10]` | 5 |
| `mend` | `[10, 40, 14, 40, 18]` | 6 |
| `crack` | `[20, 15, 20, 15, 20, 15, 20]` | 7 |
| `newBest` | `[12, 50, 12, 50, 20]` | 7 |
| `choir` (crescendo, gaps shrinking) | `[20, 70, 20, 50, 20, 35, 20, 22, 20, 15, 20]` | 8 |
| `gameOver` (decrescendo, gaps growing) | `[20, 20, 20, 40, 20, 80, 20, 140, 20]` | 9 |

Rules: a pattern of lower priority never interrupts a running pattern of higher priority (track `busyUntil`). The same pattern fires at most once per 50 ms. `tick` is suppressed while any priority ≥ 5 pattern is running. Respect Settings → Vibration. Call nothing if `navigator.vibrate` is missing.

### 7.2 Detect
`supportsVibrate = typeof navigator.vibrate === 'function'`. `isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)`.

### 7.3 iOS fallback (switch haptic)
iOS Safari has no Vibration API, but iOS 18+ plays a system haptic when an `<input type="checkbox" switch>` toggles from a real tap. Implementation:
- The play surface element is a `<label for="hx">` that covers the arena. A visually hidden `<input id="hx" type="checkbox" switch>` lives in the DOM (`position:absolute; opacity:0; pointer-events:none; width:1px; height:1px`).
- A native release on the play surface fires `click` on the label → the switch toggles → iOS plays one light tap. This gives one haptic per **strike** (and per button tap if buttons are also wrapped). Dial ticks, shatters and cracks get no haptic on iOS. That's the honest platform limit.
- When Vibration is off, remove the `for` attribute. On non-iOS, never render the label/input.
- The game logic must not depend on the `click` event; strikes stay on `pointerup`.

## 8. Audio direction (summary; API in architecture.md §6)
- **Bell tones** are synthesised (additive, inharmonic bell partials) so they can follow any scale: partial ratios `[1, 2.0, 2.76, 5.40, 8.93]`, gains `[1, 0.45, 0.30, 0.16, 0.08]`, decays `[1.6, 1.1, 0.8, 0.45, 0.25] s`, attack 3 ms. Fundamental = scale pitch (C5 = 523.25 Hz base), so all energy sits above 400 Hz where phone speakers work.
- **Dial step tone:** the note's bell at 35% gain, decay ×0.5.
- **Strike tone:** the note's bell at 100%, plus `bell-heavy-{0..4}.mp3` at 25% repitched by `playbackRate = noteHz / 523.25` (round-robin).
- **Shatter:** `glass-light` (N = 1), `glass-medium` (N = 2–4), `glass-heavy` (N ≥ 5), round-robin of 5 variants, ±6% random pitch. Plus the **chord**: N bell voices layered from the scale degrees `n, n+2, n+4, n+5, n+7 …` (wrapping into higher octaves, max 7 voices), each at `0.7/√N` gain, staggered 12 ms apart (a strum). The bigger the N, the richer the chord.
- **Choir:** the chord with all 5 scale notes across 2 octaves (10 voices, strummed 18 ms apart), plus a 1.6 s shimmer (filtered noise, bandpass 6 kHz → 9 kHz sweep, gain 0.12). The glass transient comes first; the chord body is delayed 25 ms (transient-then-body reads as "explosive").
- **Close:** a glint: a sine at 2× the note frequency, 80 ms, gain 0.2.
- **Dud:** `dud.mp3`, 60% gain, plus the note bell through a 900 Hz lowpass at 30%.
- **Crack:** `bell-heavy` at 0.6 rate (deep) + `glass-heavy` at 0.8 rate.
- **Mend:** a rising arpeggio of 3 bell tones, 60 ms apart, at 50%.
- **Game over:** the 5 scale notes falling, 120 ms apart, each at 0.5 rate; music `playbackRate`/tempo ramps to 50% and fades over 1.5 s.
- **UI:** `ui-click.mp3` (buttons), `ui-back.mp3` (back/close), `ui-glass-{1..3}` (unlock toast).
- **Music:** a generative pad in the current scale (architecture.md §6.4). Layers grow with level.
- Loudness: master limiter (DynamicsCompressor: threshold −10 dB, knee 6, ratio 12, attack 3 ms, release 120 ms) on the master bus; target around −16 LUFS on peaks.

## 9. Typography & UI

### 9.1 Fonts (self-hosted, OFL, via `@fontsource`)
- **Display: Cinzel** (600, 700). Used for the logo, screen titles, `CHOIR!`, the result headline. Uppercase, letter-spacing 0.08–0.14em.
- **UI: Inter** (400, 600, 800). Everything else. Numbers use `font-variant-numeric: tabular-nums`.
- Minimum body size 16 px; minimum label 13 px (caps, letter-spacing 0.1em, `ink-muted`).

| Element | Font | Size (390 px wide) | Colour |
|---|---|---|---|
| Logo | Cinzel 700 | `clamp(34px, 10vw, 64px)`, ls 0.12em | gradient `#FFFFFF → #BFD9FF`, glow `0 0 24px rgba(159,216,255,0.45)` |
| HUD score | Inter 800 | 44 px | `ink` |
| HUD best | Inter 600 | 13 px caps | `ink-muted` (gold when NEW BEST) |
| Multiplier | Inter 800 | 20 px | `gold` |
| Tutorial text | Inter 600 | 22 px, line-height 1.3, max-width 18em | `ink`, text-shadow `0 2px 12px #05040C` |
| Banners | Inter 600 | 15 px | `ink` on `panel` |
| Buttons | Inter 800 | 18 px | primary `ink-dark` on gold, secondary `ink` |
| CHOIR! | Cinzel 700 | 72 px | `gold` |

### 9.2 Phone portrait layout (primary; reference 390 × 844 CSS px)
```
┌──────────────────────────────┐  ← safe-area-inset-top
│ ♢♢♢          18,420       ⏸ │  hearts (3 bell icons, 24px) · score · pause 44×44
│            BEST 22,100       │
│               ×3             │  multiplier (hidden at ×1)
│   [banner: New: Prism …]     │  top ≈ 18%, auto-hides
│                              │
│         ·  ◇   △             │
│      ○     ╭──╮     ☆        │  ARENA: circle r=11 world fits 94% width,
│            │🔔│  ⬡           │  centred at 50% height
│       △    ╰──╯              │
│              ◇               │
│                              │
│  Hold to pick a colour. Let go when it matches a crystal to shatter it.  ← hint (first 3 runs, hidden while holding)
│   [▲] [◆] [⬢] [★] [●]        │  bottom dial: 5 glyphs 48px, gap 12, caret under active
└──────────────────────────────┘  ← safe-area-inset-bottom + 16px
```
- **Hearts:** 3 small bell glyphs. A crack turns one into an outlined cracked bell with a red flash; Mend restores it with a gold seam.
- **Bottom dial:** glyphs in note colour, each in a 48 px glass circle; active = scale 1.25 (spring), HDR-looking glow `0 0 18px noteColour`, and the caret (a 16 px wide gold bar, 3 px tall, 6 px below) springs under it. Locked notes: 25% opacity with a tiny lock and the text `Unlocks soon` under them during the first run only.
- **Hit areas:** the entire screen except the pause button is the play surface (hearts, score and dial are `pointer-events: none`).
- **Landscape / desktop:** the arena fits 66% of the height. The HUD column is max 520 px wide, centred, and the dial stays bottom-centre. Below 360 px width, scale the HUD to 0.9.

### 9.3 Panels & buttons
- Panels: `background: panel; backdrop-filter: blur(14px) saturate(140%); border: 1px solid panel-line; border-radius: 20px; padding: 20px`. If `backdrop-filter` is unsupported, use `rgba(18,14,42,0.92)`.
- Primary button: height 56 px, radius 16 px, `linear-gradient(180deg, #FFD27A, #F0A84A)`, `ink-dark` text, inner highlight `inset 0 1px 0 rgba(255,255,255,0.6)`, shadow `0 6px 24px rgba(240,168,74,0.35)`. Pressed: `translateY(1px) scale(0.98)`, 80 ms.
- Secondary: height 48 px, glass panel style, `ink` text.
- Focus ring: 3 px `#9FD8FF` outline, offset 2 px (keyboard only, `:focus-visible`).
- Title screen: the live arena in attract mode behind; panel-less buttons stacked in the lower 45%.

### 9.4 Share card (1080 × 1350 PNG, 2D canvas)
- Background: vertical gradient `void-2 → void-0`, 5 god-ray bands, a large faint bell silhouette (stroke `glass-rim` at 15%).
- Top (y 90): `SHATTERHYMN` Cinzel 700, 64 px, ls 0.12em, white→`#BFD9FF` gradient. Under it (y 150): `Daily Hymn #12` or `Run · Seed 3F9A12C0`, Inter 600, 30 px, `ink-muted`.
- Centre (y 420): score, Inter 800, 180 px, `ink`, glow. Under it: `NEW BEST` badge (gold pill) if applicable.
- Hymn line (y 620–760): up to 30 note glyphs drawn as small coloured crystal shapes (same 2D glyphs), 2 rows of 15, 52 px each, gold sparkle ★ marks for Choirs, red crack mark for cracks.
- Stats (y 860–1060): 3 columns: `MOST AT ONCE 9` · `STREAK 14` · `TIME 2:14` (labels Inter 600 24 px muted, values Inter 800 64 px).
- Bottom (y 1180): title + bell skin name (`Choirmaster · Rose Gold bell`), and the frame border in the skin's card-frame colour (8 px, radius 40). `Slow dial` tag if used. URL text in 24 px muted.
- Export via `canvas.toBlob('image/png')`. Fonts must be loaded (`document.fonts.ready`) before drawing.

### 9.5 Icons
Inline SVG, 2 px strokes, round caps: pause, play, share, settings (gear), collection (gem), missions (check list), back (chevron), lock, sound, music, vibration, motion. Note glyphs as filled SVG paths matching the crystal shapes.

### 9.6 App icon & splash
512/192/180 px PNG generated at build time by a Node script from an SVG: `void-1` background, a glowing glass bell in the centre with a red triangle, a blue star and a green hexagon shattering around it. The PWA `theme_color` and `background_color` are `#05040C`.

## 10. Reduced motion
Enabled when Settings → Reduce motion is on (defaults from `prefers-reduced-motion: reduce`).

| Normal | Reduced |
|---|---|
| Trauma shake | off (0) |
| Camera fov punch | off |
| Chromatic aberration spikes | off (base 0.0006 kept, or 0 on Low) |
| White full-screen flash (Choir 0.35) | max alpha 0.12, 120 ms fade |
| Slow-mo (Choir, game over) | replaced by the plain freeze only |
| Shards per crystal | halved; no spiral harvest: shards fade out in place over 600 ms; bell still brightens |
| Bell tremble while holding | off; glow rise kept |
| Bell wobble on dud | replaced by a grey tint pulse |
| `CHOIR!` slam (scale 1.6 → 1) | fade-in 150 ms at scale 1 |
| Pop text rise 40 px | rise 8 px |
| God-ray drift, fog drift, crystal wobble | slowed ×0.25 |
| Floor level-up sweep | single brightness pulse |
| Haptics | unchanged (separate setting) |
| Hitstop freeze | unchanged (it is stillness, not motion) |

## 11. Do / Don't
- **Do** keep 80% of the screen dark; glow only on things that matter (crystals, bell, rings, shards, gold UI).
- **Do** make every crystal readable by shape at 28 px on screen.
- **Do** sync audio, visual and haptic on the same frame.
- **Don't** use flat-coloured meshes, default `MeshStandardMaterial`, or unlit sprites as final art.
- **Don't** add bloom to text or UI panels (DOM; CSS glow only where listed).
- **Don't** let any effect hide crystals near the bell: the flash overlay must never exceed 0.35 alpha or last over 70 ms.


## 12. WOW pass addendum (v1.1 · 2026-10-27)

Normative visual overrides. Full numbers in `/workspace/wow-game/wow/WOW-PLAN.md`. Mirror as named constants in `fxConfig.ts`.

### 12.1 Crystals
Visual scale `crystalVisualScale(rho)` 1.8 (rho ≥ 7) → 1.15 (rho ≤ 3). Extrude depth 0.42, bevel 0.18/0.12, 2 segments. Wobble ±22°. Diamond aspect 0.68. Shader: fake refraction env, internal flare, thin-film iridescence, glints ×6, fever gold rim, golden kind. Rusher = glow-quad tail. Floor light pool per crystal (2.6 × visual r, 30% alpha). Draw crystals in front of the bell.

### 12.2 Background / cathedral
5 lancet windows at top casting tinted beams; rose window behind bell; light shafts from bell toward broken crystals; floor ring flashes; outer ticks; nebula octaves by tier. Heat/fever and beat pulse. "80% dark" still applies at heat 0.

### 12.3 Shatter
Shards 26/18/12 by tier; pools 1600/1000/600; speed 6–15; 15% hero shards 0.45–0.75; harvest delay 0.75 s for N ≥ 4; streaks 0.35 s. Sparks 10/8/6, 8–18 px.

### 12.4 Escalation / heat
Fever at streak ≥ 6 (or mult ≥ 4): world warms, crystal edges gold, music layers, mult chip fever ring. Per-strike ladder scales shafts/bloom/flash/CA with N. Close-call juice amplified.

### 12.5 Draw-call budgets
Low ≤ 18 steady / ≤ 21 peak; Medium ≤ 26; High ≤ 30. Low bloom intensity 1.6, radius 0.75, 3 levels. Never disable the EffectPass that writes to screen.

### 12.6 Title / results / HUD
Title layout and chips per design §18.3. Results footer per §18.5. HUD next-unlock and fever mult chip per §18.4. Pop text: size `min(56, 24+4N)`, life 900 ms, gold gradient at N ≥ 4.

## 13. W1d wow overrides (2026-10-27)

Lead-approved numbers from `/workspace/wow-game/wow/SCORECARD-W2.md` §4. Prefer these over earlier §5 / §12 values where they conflict.

- Crystal visual scale `near 1.9 / far 3.6`. Body luminance ≤ 0.55; bloom threshold Low 0.72. Rose during play lit 0.045 ×0.55 under arena.
- Shatter: see `SHATTER` in fxConfig (shard counts Low 22 / Med 30 / High 40, speed 11+13r, drag 1.5, harvest 1.5 s, life 2.6 s). One shockwave ring per strike to 9 u / 900 ms. Flash DOM opacities 0.30/0.45/0.60/0.75.
- Fever heat at streak 3/6/10 = 0.6 / 0.85 / 1.0. Mult 56 px gold at streak ≥ 3.
- Title: hide lancet glass (beams stay). Pop `+N` is white with void0 outline.
- Results panel `rgba(11,9,32,0.60)` + blur 8px; mission scroll padding above footer.
