# Shatterhymn: art review (before the art pass)

Reviewer: art director · 2026-10-27 · Captures: 780×1688 portrait (`shots/art-before/01–04`)
Trigger: a player asked "why does the board have so many colours?" They're right.

**Rule from here on:** only crystals and the colour buttons may carry gameplay colour. The board (rose window, lancets, shafts, floor rings, beams) stays low-saturation, value-controlled, cool glass and lead. It may take a crystal's hue only briefly, on shatter or fever.

---

## Scores (before)

| Capture | Beauty | Readability | One-line verdict |
|---|---|---|---|
| Play start (`01-play-pad`) | **5/10** | **4/10** | Pretty rainbow target, but it's a second set of gameplay colours sitting under the real ones. |
| Mid-combo (`02-mid-combo`) | **6/10** | **3/10** | The shatter feels great, but the whole board turns yellow, the same hue as the yellow crystals and button. |

Empty-penalty (`03`) and lockout (`04`) are not scored separately. The greyscale pad is the best piece of colour design in the build. The rest of each frame has the same board problem.

---

## 1. Palette count (measured)

Sampled the rose annulus (radius 110–380 px around (390, 850), 4 px grid, pixels with max channel > 25):

| Frame | Hue families > 2 % of annulus (30° bins) | Sat p50 / p90 |
|---|---|---|
| 01 play start | 0°, 30°, 150°, 180°, 210°, 240°, 330° (**7**) | 0.33 / 0.64 |
| 02 mid-combo | 0°, **30° ×2.4**, 150°, 210°, 240°, 330° (6) | 0.36 / 0.70 |
| 03 empty | 0°, 30°, 150°, 210°, 240°, 330° (6) | 0.30 / 0.70 |
| 04 lockout | 0°, 30°, 150°, 210°, 240°, 330° (6) | 0.29 / 0.69 |

- At L0 the player has **K = 3** colours (red, yellow, green), but the rose paints all **5** `NOTE_COLORS`, blue `#4fa8ff` and violet `#c77dff` included. Two of the board hues belong to notes the player cannot play yet. That alone answers the player's question.
- The UI totals about 11 saturated hues: 5 rose petal hues, an orange floor reflection ring, a magenta hub, a cyan bell HUD, the gold progress bar, a lavender BEST label, and the 3 buttons. The target is **3 gameplay hues + 1 neutral accent**.
- Source: `background.ts` bake `noteCol(mod(seg+ring*2,5))` for the petals, `noteCol(...)` for the lancets, and `noteCol(fi)` for the shafts at `shaftAlpha .03`. In `floor.ts`, `reflection` and the fever lines use `vec3(1,.637,.195)` (amber).

## 2. Value hierarchy (luma Y, Rec.709, 0–255)

| Element | Px | Hex | Y | Sat |
|---|---|---|---|---|
| BG void top | (390,300) | #05040c | 5 | — |
| Rose outer ring (amber) | (40,850) | #503917 | 59 | .55 |
| Rose top (amber) | (390,500) | #695b30 | **91** | .37 |
| Rose inner (violet) | (300,840) | #321954 | 35 | .54 |
| Hub (magenta) | (390,840) | #894c67 | **91** | .29 |
| Red crystal | (90,940) | #e3546d | **116** | .72 |
| Yellow crystal | (150,640) | #c3ab64 | 171 | .44 |
| Green crystal | (630,1040) | #afdcc7 | 209 | .39 |
| Red button | (60,1600) | #ff4f6e | 119 | 1.00 |

Findings:
- **The red crystal is only 1.27× brighter than the amber rose and the hub** (116 vs 91). At the far rim (rho ≈ 7) the red triangle at (90, 940) sits right on the amber outer ring and reads as part of the window. That's a value collision. Crystals must be the brightest non-UI element by at least 2×.
- The hub at Y = 91 and magenta is the single brightest board element. It pulls the eye to the centre where nothing happens. (The bell should read as a quiet anchor, not a target.)
- Mid-combo `bg_low` (390, 1400) is #8c652e, Y = 105. The yellow shaft spill below the rose is brighter than the red crystal, and it runs into the button row.
- Crystal faces carry heavy white specular planes (hex (600, 1000), diamond (180, 620)). Up to ~40 % of a small crystal's area is white, which washes out hue identity. Yellow and green both read "pale" at rho ≈ 7.

## 3. Readability in motion (02 mid-combo)

- A yellow strike adds `lit += .9·(1−age/.9)²` to every petal where `ni == strikeNote`, about 1/5 of the window, at roughly 10× the idle `.055`. For ~0.6 s the board is **yellow-dominant (30° bin ×2.4)**. A player scanning for remaining yellow crystals gets a false positive across the whole window. This is the worst readability bug in the build.
- The yellow shaft (`uShafts`, strength up to 1.6) sweeps from the bell to the pad at (390, 1300–1500) and makes the yellow button region look "hot". It reads like a button hint, which Opus explicitly ruled out (`engagement.md`, "against lighting buttons").
- The amber arc ring (centred around (560, 640), r ≈ 230) plus the "+40 / 2 at once!" floater cover the upper-right quadrant where new crystals enter.
- Fever uses amber (`vec3(1,.637,.195)` floor lines and `mix(uBeam, glass, .7*uHeat)` beams), so the fever state looks the same as the yellow note.
- Shard debris: red shards up to (0–260, 380–600) and green shards at (0–240, 1280–1530). The green shards overlap the red button's top edge (y ≈ 1530). These are crystal-hued particles over the input row.

## 4. HUD clutter

- Top-left stack: 3 cyan bells + "Next: Rose Gold bell" + gold bar + "420 / 500". That's 4 rows, 24–238 px wide by 40–160 px tall, during play. This is meta-progress and doesn't belong in the run HUD. The bells are life pips, but in cyan they look like a 4th gameplay colour (cyan sits next to green at 150–180°).
- "BEST 18,420" (Y 163, lavender, letter-spaced ~30 px cap) is nearly as loud as the score. Drop it to ≤ 60 % of the score's luminance.
- Pause button (668–755, 18–102): fine.
- `03` penalty label "No Yellow crystals · combo lost" at y ≈ 830 runs straight across the hub and rings (#a59fc9 text over Y 22–91 noise, no backing). "crystals" is cut through by the hub ring at x 290–450 and is partly illegible. `04` moves it to y ≈ 755, which is better but still has no plate. Both captures name the colour in words only. Good for colour-blind players, but put the **diamond glyph** in the line too.

## 5. Colour-blind check (simulated by eye from hex)

- **Deuteranopia/protanopia:** red `#ff4f6e` vs yellow `#ffc23f` stays separable by value (Y 119 vs 198). Green `#3fe0a0` vs yellow becomes about 13 Y apart (185 vs 198). **Yellow/green collapse.** Button glyphs (▲ ◆ ⬢) save the pad. On the field, though, the crystal shapes are triangle, diamond prism, and hex prism, and at rho > 6 with the specular wash the diamond prism and hex prism are close in silhouette (see (150, 640) vs (630, 1040) in `01`).
- The rainbow board makes this worse: amber and teal petals behind crystals add more confusable hue pairs.
- **Tritanopia:** blue and violet petals merge with the green ring. That's harmless only once the board is neutral.
- Fix: board neutral, crystal silhouettes stay distinct (already true at near rho), and crystal value tiers spaced ≥ 25 Y apart. Don't change crystal hues in this pass.

## 6. What's good, so keep it

- The greyscale pad lockout (`03`): buttons #303030 to #4f4f53, sat 0. Clear, honest, information rather than decoration.
- Pad buttons: big, glyph-bearing, unambiguous.
- Void background #05040c to #06061a: correct cool-dark base.
- The shatter silhouette and shard arcs in `02` feel great. Keep the juice and move the colour off the board.
- Plain-English penalty copy.

## 7. Top 5 fixes (ranked)

1. **Desaturate the rose window, lancets, and idle shafts** to cool lead/glass (sat ≤ 0.12, Y ≤ 40), with value-only petal variation. Remove the 5-hue cycle. (spec §1)
2. **Shatter tint at ≤ 1/3 the current strength and 300 ms**, applied to the whole window in the note colour. No per-note petal mapping, so the board never "lists" a colour as present. Kill the shaft spill below y = 72 % of the screen. (spec §2)
3. **Move fever off amber** to a neutral warm-white luminance lift. Fever must not look like yellow. (spec §2)
4. **Value ladder:** crystals ≥ 2× board luminance, specular ≤ 20 % of face area, hub dimmed to Y ≤ 45. (spec §1, §3)
5. **Declutter the HUD:** hide the meta progress row in play, make bells neutral white, demote BEST, and put the penalty label on a plate with a glyph above the rose. (spec §5)
