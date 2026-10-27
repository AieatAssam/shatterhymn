# Shatterhymn: Art Rescore (after art/haptics pass)

Scored by looking at the screenshots: `shots/art-before/01–03` vs `shots/art2/00–03`.
Haptics can't be judged from stills, so they are **not scored** here.

## 1. Scores (1–10)

| Screen | Before Beauty | Before Read | After Beauty | After Read | Δ Read |
|---|---|---|---|---|---|
| Title (`00`) | n/a | n/a | **5** | **3** | n/a |
| Play start (`01`) | 5 | 4 | **6** | **7** | +3 |
| Mid-combo (`02`) | 6 | 3 | **6** | **6** | +3 |
| Empty penalty (`03`) | 5 | 4 | **5** | **4*** | 0 |
| **Average (all 4 after)** | | | **5.5** | **5.0** | |
| Average (3 comparable) | 5.3 | 3.7 | 5.7 | 5.7 | +2.0 |

\* The `art2/03-empty-penalty.png` frame shows **no penalty state**. There is no "No Yellow" message and the pads aren't greyed. Instead it shows a ×2 multiplier and a `+20×2` popup. I scored the frame as captured, but the penalty readability fix is **unverified**.

**Notes per screen**
- **Title:** this isn't a title screen. It's the play frame dimmed down, with ghosted crystals. There's no game name, no tap-to-start, and nothing tells the player what to do. The moody grey tunnel with translucent gems looks nice, but as a first impression it reads as "loading".
- **Play start:** this is the biggest win. With the rainbow board gone, crystals and pads are the only saturated things on screen, so shape plus colour reads instantly. The new emissive halos on the crystals help. The tunnel is now flatter and grey, so depth is weaker, but that's an acceptable trade.
- **Mid-combo:** the green burst ring and shard spray read clearly as "green hit". The board stays neutral, so the burst owns the frame. Points lost because the dark popup panels sit right on the ring.
- **Penalty frame (as captured):** a red board wash plus a white hit flare. The flare blows out about a third of the ring and the hex at top-left loses contrast against it.

## 2. Colour law: **holds, with two nits**

- **Board low-sat:** ✅ in all four after-shots. The before board's saturated R/Y/G/B segments are gone, which fixes the worst violation from ART-REVIEW.
- **Hues only on crystals and pads:** ✅ Crystals, their halos, shards and pads carry all the hue. The bells are now neutral grey.
- **Momentary tint:** ✅ The green burst ring (`02`) and the red board wash (`03`) are both transient.
- **Nit 1:** the `03` hit flare has a **rainbow/chromatic fringe**, which is off-law hue on the board layer.
- **Nit 2:** the gold **×2 multiplier** and gold centre ring stay on screen for the whole combo. That makes them a persistent hue outside crystals and pads. It's fine if gold is the official "combo" UI colour, but write it into the law explicitly.

## 3. Remaining misses (≤5)

1. **No real title screen** (`00`): no logo, no call to action, ghost crystals sitting in gameplay positions. Make an actual title card.
2. **Penalty state not captured** (`03`): reshoot the empty-pad penalty. The before version's lavender text was cut through by the hub ring, and we can't tell if that was fixed.
3. **Popups cover the playfield** (`02`, `03`): the opaque dark `+40 / 2 at once!` and `+10` panels sit on top of the ring and cover a red crystal. Move them outward or drop the backing panels.
4. **Crystals still overlap** (`01`): the top hex sits over the diamond and the two left triangles stack. Same-ring spacing or z-sort is still missing, and it's the main thing holding play-start readability below 8.
5. **HUD and hub regressions:** the "Next: Rose Gold bell 436/500" progress bar from before is gone. The grey hub sphere with its "I" glyph looks like a placeholder. The hit flare in `03` is oversized.

## 4. Ship verdict

**Ship the palette and board change, since it clearly fixes the colour law and readability. Hold the art pass open until a real title screen exists and the penalty frame is reshot.**
