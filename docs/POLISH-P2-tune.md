# POLISH P2 tune (review of p2-iter1)

Reviewer notes on the P2 Tap board build (`shots/polish/p2-iter1`, 780 x 1688). Measurements come from the PNGs. Predicted values come from three's `ACESFilmicToneMapping` (exposure / 0.6, RRT+ODT fit) applied to the sRGB hex, with bloom and additive layers left out.

## 1. Lead's concerns

| Concern | Verdict | Evidence | Cause in code |
|---|---|---|---|
| Stage centre washed to pale lavender-white, bell face hard to read | **Confirmed** | Bell disc Y 209 and the ring around it Y 211 (`tap-0-start`), so there is no edge between bell and stage. Eyes (189,177,187), sat .08 (in the old build they were clearly dark). In `tap-2-mid` the whole disc is Y 197-221 with median glass sat .18. 116 / 255 / 126 / 136 of the 40 px blocks in the disc have sat < .20 (`tap-0`, `tap-2`, `intro-0600`, `intro-6500`). | (a) The lead lattice covers the whole disc at linear luminance .69, which sits right at `BLOOM.luminanceThreshold` .70 (smoothing .25). With the sweep, the glint and heat it goes over and blooms (intensity 1.45, radius .8) into a haze over everything. (b) Heat multiplies the stage twice: `lit` up to ×1.65 and `col*=1.+.20*uHeat`, so it reaches about ×2 at ×6. (c) The floor adds a warm glow under the bell plus cream rings. (d) The hub (`r < .18`) is smaller than the bell (bell edge ≈ .23 R), so no hub colour is ever visible around the bell. |
| Petals pale lavender, not saturated violet | **Confirmed** | Median glass (159,121,216), sat .43, Y 136 at start, falling to sat .18 / Y 199 in `tap-2-mid`. | `8b6bf0` through ACES already comes out (158,117,222) sat .47. ACES lifts and desaturates the authored colour, and bloom haze then greys it further. |
| Gold lead lines look cream | **Confirmed** | Median lead pixel (226,207,175), sat .23. Frame ring (206,182,197) reads pink-white. | `ffd27a` has R = 1.0 linear, which becomes 1.67 after the /0.6 exposure, and ACES desaturates it to (229,210,154) sat .33 even before bloom. The floor's cream rings at r 2.5/5/7.5/10 sit exactly on the radial leads and the frame. `frameGlow ff9e6b` adds pink. |
| Green crystals pale mint-grey | **Partly confirmed** | The pale hexes in `tap-2-mid` (194,217,208) are chord **ghosts** in their white strike flash (`aFlash` ≥ .6), so they look that way by design. Live green can't be measured from these stills. The shards are (0,127,82), which is fine. The code still fails, though: green face at the current caps comes out (115,209,169) sat .45, which fails P2.8 (≥ .55). | The max-channel cap never reaches green (G .63 < .85). ACES desaturates any colour this bright. |
| Yellow crystals brownish | **Confirmed (cause changed)** | Faces (225,202,130): hue 45, Y 201, **HSV sat .42** (needs ≥ .60). The outline reads brown (128,96,86), Y ≈ 100 (needs ≤ 45). | The faces themselves would be fine without haze (predicted (225,193,85) sat .62). The bloom haze adds about +45 blue to the faces and about +80 to the dark outline, and that muddy outline is what reads as a brown box. |

## 2. P2.8 acceptance on p2-iter1

| Item | Result |
|---|---|
| No 40 px block with Y < 30 | **Pass.** Only the pause button, plus the Tap card on the title. |
| No block outside the bell and face with sat < .20 | **Fail.** 116-255 blocks, all on the stage disc. |
| Top band violet, bottom rose-violet | **Pass.** Top (87,59,179), bottom (191,81,184). |
| Petal glass Y 85-150 | **Fail.** Start p50 136 but p90 170 and the inner rings 189. `tap-2-mid` 197-221. |
| Hub Y 70-105 | **Fail / unmeasurable.** The hub is hidden under the bell; the bell's surroundings measure Y 211. |
| Gold frame ring, continuous and warm | **Half.** It is continuous, but it reads pink-white, not gold. |
| No dark ring | **Pass.** |
| Crystal outline Y ≤ 45 around ≥ 85% | **Pass for red at start** (near black). **Fail for yellow in `tap-2-mid`** (Y ≈ 100). |
| Yellow hue 36-50, sat ≥ .60, Y ≥ 150 | **Fail on sat** (.42). |
| Green sat ≥ .55 | Not measurable (ghosts only). Predicted .45, so **fail**. |
| Title: hub centred on bell, no dark disc | **Pass** (`intro-6500`). The closed-eye face is very faint, for the same haze reason. |
| `CHOIR!`, `+580`, score, bells readable | **Pass.** |
| Video, reduced motion, Slice items | Not checked (no video or Slice stills in this set). |

## 3. Tuning list (12 items)

Predicted results are post-ACES sRGB, before bloom.

| # | Constant / literal | File | Old | New | Why |
|---|---|---|---|---|---|
| 1 | `TAP_STAGE.lead` | `src/render/fxConfig.ts` | `0xffd27a` | `0xe0a040` | Gold that survives ACES: (220,178,82), hue 42, sat .63. Linear luminance .41 instead of .69, so the lattice no longer reaches the bloom threshold. This removes the main haze source over the centre. |
| 2 | `TAP_STAGE.frame`, `TAP_STAGE.frameGlow` | `fxConfig.ts` | `0xffc86b`, `0xff9e6b` | `0xe89a30`, `0xc8642a` | Frame core (225,173,66), sat .71, so it reads as a gold ring. A deeper amber halo replaces the pink one. |
| 3 | `TAP_STAGE.leadAlpha` and the bake literal `leadMask=(…)*.85` | `fxConfig.ts`, `shaders/background.ts` bake | `.85` (the literal ignores the constant) | `1.0`, and replace the literal with `${TAP_STAGE.leadAlpha.toFixed(2)}` | Today 15% violet bleeds into every line and pinks the gold. Wiring the literal to the constant also makes the setting tunable. |
| 4 | `TAP_STAGE.petalLight` | `fxConfig.ts` | `[0x8b6bf0,0x9c7bf5,0x8b6bf0,0x7656d6]` | `[0x7650dc,0x7b5ae8,0x7650dc,0x6e4cd0]` | Saturated violet: (131,78,213) sat .63 Y 99 and (139,93,219) sat .58 Y 112. sRGB sat ≤ .65 and Y 85-104, hue 254-256, so the P2.7 tests still pass. |
| 5 | `TAP_STAGE.petalDark` | `fxConfig.ts` | `[0x7a5ae0,0x8868e8,0x7a5ae0,0x6446c2]` | `[0x6947c8,0x6d4cd6,0x6947c8,0x6446c2]` | Darker panes of each pair: (111,64,202) and (118,72,210), sat .66-.68 Y 84-92. Gives a clear light/dark alternation, and the outer ring stays the darkest so the gold frame pops. |
| 6 | `TAP_STAGE.hubCentre`, `TAP_STAGE.hubEdge` | `fxConfig.ts` | `0x5a3fb0`, `0x6e4fd8` | `0x40307f`, `0x4e3a9c` | Deep violet hub, Y 42-59 after ACES, so the white bell (Y ≈ 200) and its dark eyes stand out. sRGB sat .62/.63 and Y 57/69 pass the P2.7 test. |
| 7 | Hub radius literal `.18` | `shaders/background.ts`: bake `r<.18` and `smoothstep(0.,.18,r)`; fragment `r>=.18` and `edgeMask=smoothstep(.18,.26,r)` | `.18` (edge mask `.18,.26`) | `.26` (edge mask `.26,.32`) | The bell edge sits at ≈ .23 R, so today the hub is entirely hidden. At .26 a ring about 4 CSS px wide of dark hub frames the bell, and the soft lead at r .25 gives it a thin gold edge. Ring 0 lay under the bell anyway. |
| 8 | Heat gain on the stage | `shaders/background.ts` fragment | `lit=…(1.+uHeat*(.30+.35*uBeat)+uRose)` and `col*=1.+.20*uHeat` | `(.12+.18*uBeat)` and `col*=1.+.08*uHeat` | At ×6 heat the stage reaches ×1.98 and the whole disc goes white (`tap-2-mid`). The new cap is ×1.40, so the lead peaks at linear luminance .57 (below the bloom threshold) and still pulses on the beat. |
| 9 | Floor rings and centre glow | `src/render/shaders/floor.ts` | `.35*lines`, `glow=…*(0.16+0.14*uNoteGlow)` | `.15*lines`, `(0.05+0.10*uNoteGlow)` | The additive cream rings sit exactly on the stage leads and the frame, turning them cream and pink. The warm centre pool lifts the area behind the bell. Both are washes. |
| 10 | `TAP_STAGE.sweepColor`, `TAP_STAGE.shaft` | `fxConfig.ts` | `0xffd9a0`, `0xffe0b0` | `0xffb050`, `0xffc070` | The near-white additive sweep and shafts show up as lavender-grey streaks over violet. Warmer amber keeps the sweep reading as light without greying the glass. |
| 11 | New `CRYSTAL_EDGE.bodyMaxLum: .36`, plus one line in the crystal shader after the `gemBodyMax` line: `float bl=dot(body,vec3(.2126,.7152,.0722)); body*=min(1.,${CRYSTAL_EDGE.bodyMaxLum.toFixed(2)}/max(bl,.0001));` | `fxConfig.ts`, `src/render/shaders/crystal.ts` | none | `.36` | ACES desaturates bright faces, and the max-channel cap never reaches green. Predicted faces: yellow (209,171,61) hue 45 sat .71 Y 171; green (84,193,148) sat .56 Y 167; red unchanged (237,83,110) Y 118; blue (97,171,219) sat .56. Yellow and green stay 60-80 Y above the glass. Shared with Slice, where it fixes the same pastel green. |
| 12 | `CRYSTAL_EDGE.shadowAlpha` | `fxConfig.ts` | `.35` | `.50` | Restores the dark contact shadow under each crystal. That is a second dark separator on the brighter stage, with no extra cost. |

Leave these unchanged: `BLOOM` (once items 1, 8 and 9 land, nothing on the stage reaches .70, and raising the threshold would dim the Slice glints and crystal cores), `TAP_STAGE.gain` 1.0, `VIGNETTE`, and tone mapping.

## 4. Spec-notes for the implementer

- Several `TAP_STAGE` numbers are copied into the shaders as literals instead of being read from the constant: `leadAlpha` (.85), `frameGlowAlpha` (.35), `frameGlowPx` (10), `frameR` (.985 centre), `shaftGain` (.16), `twinkleAmt` (.06), `sweepGain` (.10), `sweepWidthRad` (.55), `glintGain` (.5), `frameBreath` (.08), `breathAmt` (.05), `hueDriftDeg` (6.). Changing those constants does nothing today. Item 3 wires one of them; wiring the rest the same way (`${TAP_STAGE.x.toFixed(n)}`) is a recommended follow-up.
- P2.1 cause 6 is partly wrong: at the old .55 luminance cap, yellow (luminance .46) was never actually capped. The brown came from the fresnel wash and the dark bevel shading, which P2.6 already fixed.
- Purple (`0xc77dff`, arrives at 80 s) predicts sat .40 under item 11. That is outside the first-40 s palette and outside this tune; check it in a later pass.

## 5. Proposed P2.8 amendments

- Hub Y 70-105 → **40-80**, measured in the ring 0.23-0.26 R around the bell.
- Petal glass Y 85-150 → **80-150** (the outer ring is deliberately the darkest).
- Add: bell face eyes at least 60 Y darker than the bell body, and the bell edge at least 80 Y brighter than the hub ring next to it.
- Add: median lead-line pixel hue 36-48°, sat ≥ .45 (no cream).
- The `tap-2-mid` acceptance still must hold at ×6 heat, so check sat and Y there, not only at start.
