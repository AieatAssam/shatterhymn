# ART + HAPTICS SPEC: board desaturation, juice caps, haptic map (for Codex)

Normative. MUST / MUST NOT are binding. Priorities: P0 ships first. Background: `wow/ART-REVIEW.md`, `repo/research/animation-haptics.md`.
**Colour law:** only crystals (+ their shards/threads) and the colour buttons carry gameplay hue. The board is cool lead and glass. It takes a note hue only inside the shatter/fever windows in §2.

## 0. Do NOT change
- Tap input: instant strike on pointerdown, 0–1 frame. No anticipation delay. No change to `input.ts` hit logic.
- Scoring (N², mult, streak, Choir, golden), `TARGETABLE_R`, `CLOSE_GAP`, the spawn director, and the L0–L2 retune.
- Empty-strike rules: dud = combo lost, no crack, **400 ms** pad lockout, greyscale pad, copy "No {Colour} crystals · combo lost".
- `NOTE_COLORS` hex values, pad button colours, glyphs (▲ ◆ ⬢), crystal shapes/silhouettes, collision radii.
- No lighting buttons to hint at on-screen colours (Opus ruling).
- Settings keys and labels (`vibration`, `reduceMotion`, `shake`). Save schema v1.

## 1. P0: board desaturation and value structure
Add to `fxConfig.ts`:
```
BOARD = { lead:0x07080c, glassDark:0x161b26, glassLight:0x252c3a, tint:0x9fb0cc,
          tintMix:.10, satMax:.12, petalJitter:.035, ringL:[.30,.27,.24,.20],
          hubYMax:45, lancetGain:.10, idleShaftGain:.015, beam:0xc2cad8 }
PALETTE.floorLine = 0x262b38   // was 0x3b3480 (indigo)
```
**Rose (bake, `background.ts`)**
1. Replace every `noteCol(ni)` / `noteCol(mod(...))` in the bake with `neutralGlass(seg,ring)`:
   `L = BOARD.ringL[ring] + petalJitter*(hash(vec2(seg,ring))*2-1)` (OKLab L, outer ring brightest, inner darkest);
   `col = mix(glassDark, glassLight, L/.30) * mix(vec3(1), tint, tintMix)`. Lead lines stay `BOARD.lead`.
2. Remove the 5-hue cycle completely. Petals differ **by value only**. `alpha=ni/4` (petal index for runtime) stays, but it is used only for the warn mask (below).
3. Lancets: same neutral glass, gain `.22 → BOARD.lancetGain`.

**Rose (runtime fragment)**
4. Idle `lit` term: keep `PLAY_START.rose` breathing. Multiply by `vec3(1)`, not `vec3(.85,.82,.9)`.
5. **Safety clamp**, last line before `gl_FragColor`, applied only to board pixels (outside the strike/fever windows of §2):
   `float y=dot(col,vec3(.2126,.7152,.0722)); col=mix(vec3(y),col,uBoardSat);` with uniform `uBoardSat = .25` idle. It is applied *before* the §2 tint add, so the tint itself is never clamped. Result: HSL sat of any idle board pixel MUST be ≤ `BOARD.satMax` (.12).
6. Idle shafts (`p.y>.70` loop): `noteCol(fi)` → `BOARD.beam`, gain `PLAY_START.shaftAlpha .03 → BOARD.idleShaftGain`.
7. Beams (`p.y<=.84`): delete `mix(uBeam,glass,.7*uHeat)` and use `BOARD.beam` always. `uBeam` becomes `0xc2cad8`.
8. Chord warn (`uWarnNote`): MUST NOT colour petals by note. Replace with a **neutral** luminance pulse on petals within ±25° of `warnAngle`: `lit *= 1.+.6*(.5+.5*sin(uRealTime*25.13))`. Event semantics are unchanged.
9. Global heat line `col=mix(col,col*(.6+1.2*uNoteColor)+...,.5*uHeat)` → `col *= 1.+.20*uHeat` (neutral lift only).

**Floor (`floor.ts`)**
10. `reflection` and fever `lines` amber `vec3(1,.637,.195)` → `BOARD.beam`. In fever, lines get luminance ×1.4, not a hue. `uNoteColor*(glow+sweep)` is allowed only for the level-up sweep (it's an event).

**Bell/hub**
11. Idle bell inner glow uses `PALETTE.glass`. `uNoteColor` contribution is 0 outside the §2 strike window. Hub centre pixel (390, 840 @780×1688) MUST measure Y ≤ `hubYMax` (45) idle. It's 91 today.

**Value ladder (acceptance, measured at 780×1688, Rec.709 Y):** board ≤ 40 everywhere idle; HUD secondary ≤ 110; crystals ≥ 2× the local board Y behind them (red at rho 7 ≥ 100 over ≤ 45); buttons are unchanged.

## 2. P0: momentary board tint (shatter / fever only)
New uniforms: `uTintColor` (vec3), `uTintAmt` (float). The CPU writes these. The shader does `col += uTintColor * edgeMask * uTintAmt * (0.35 + y)` over the whole rose annulus, uniformly. **Never per-petal or per-note**: the board must never "list" which colours exist.

| Event | Peak `uTintAmt` | Attack | Decay to 0 | Notes |
|---|---|---|---|---|
| Strike N=1 | .10 | 0 ms | 220 ms, ease-out quad | |
| Strike N 2–3 | .16 | 0 | 260 ms | |
| Strike N 4–6 | .22 | 0 | 300 ms | Replaces `uRose` hue boost |
| Choir N≥7 | .30 | 0 | 450 ms | |
| Fever enter | .18 in **current note hue** | 60 ms | 400 ms | Once per entry, never looping |
| Fever sustain | 0 hue | — | — | Neutral lift only (§1.9) |

- Delete the per-petal `if(abs(ni-uStrikeNote)<.5) lit+=.9*…` term.
- Strike shafts (`uShafts`): life 1.2 s → **0.45 s** (choir 0.6 s), strength ladder capped at **.6**, and mask `*smoothstep(.30,.42,p.y)` so no shaft light reaches the bottom 30 % of the screen (pad zone).
- `flashOverlay`: `SHATTER.flashOpacity [.3,.45,.6,.75]` → **[.08,.12,.16,.22]**, `flashLife .35 → .20`. `flashInterval 1/3` stays (≤ 3 flashes/s, WCAG 2.3.1).
- Crystal fever rim: `vec3(1.,.82,.48)*fres*2.4*uHeat` → `vec3(1.)*fres*.6*uHeat`. **Amber MUST NOT mean fever**, because yellow is a note.
- Overlap: a new event replaces the tint (it doesn't add). `uTintAmt = max(current decayed, new peak)` with the new colour.

## 3. P1: juice timing caps
| Item | Rule |
|---|---|
| Hitstop (strike) | Keep `min(160, 30+14n) + 20 if close`, **hard cap 180 ms**. Stacked freezes MUST NOT exceed **220 ms** wall per 500 ms window. |
| Hitstop (other) | dud: **0 ms** freeze (visual only ≤ 80 ms). crack 120. mend 60. gameOver 250 (exempt). |
| Choir slow-mo | `slowmo(.25,350,250)` keeps total stall ≤ 600 ms. Disabled in reduced motion. |
| Squash/stretch | Bell `bellX .94 / bellY 1.12` → **`.96 / 1.06`** (≤ 8 %, volume ≈ 1). Crystals: impact squash ≤ 8 %, visual only, never touches radius. |
| Shake | `offset = .35·trauma²·noise`, roll ≤ 2.5°. Trauma per strike `min(.45,.10+.04n)` (keep). Decay `1.6/s → 2.2/s`. Max trauma .8 except gameOver. Never continuous. Dud trauma .08 → **.04**. |
| Specular | Crystal `glint*2.5 → 1.6`. Rim `fres*1.6 → 1.0`. White highlight ≤ 20 % of projected face area at rho 7. |
| Particles | Shards/sparks alpha ×0 when screen-y is within 48 px of pad top (`uPadTop`). |
| Pops | "+N / 2 at once!" floaters: spawn ≥ 60 px inward from the strike centroid and never above y = 240 px (HUD). |

**Reduced motion** (`settings.reduceMotion ?? prefers-reduced-motion`): shake 0, slow-mo off, FOV punch off, CA off, bell squash off, pad unlock scale-in off, freezes capped at **60 ms**, shaft life ≤ .3 s, `uTintAmt` peaks ×0.6, flash ×0.5. KEEP: colour, sound, haptics, greyscale lockout, pops (static fade).

## 4. P1: haptics map (`haptics/haptics.ts`)
Principles (Apple HIG, Android haptics): short discrete pulses, consistent meaning, strength tracks importance, no buzzy trains, optional. **Max 2 pulses per pattern except gameOver. No pulse > 30 ms.**

| Id | Pattern (ms) | Prio | Meaning |
|---|---|---|---|
| shatter1 (N=1) | `[10]` | 5 | crisp click |
| shatter2 (N 2–3) | `[14]` | 5 | firmer click |
| shatter4 (N 4–6) | `[18]` | 5 | strong click |
| choir (N≥7) | `[22, 60, 18]` | 8 | one accent + echo |
| dud (empty) | `[28]` | 3 | **dull** single. Longer and flatter than any hit. Never followed by a hit pattern. |
| close | fold into the strike: +4 ms on the strike pulse. Delete the delayed `setTimeout(...,60)` second call. | — | |
| crack | `[26]` | 7 | stronger single, not a train |
| fever (enter) | `[12, 40, 16]` | 5 | once per entry, never loops |
| mend | `[10, 40, 14]` | 6 | |
| shell | `[8]` | 5 | |
| ui / tick | `[6]` / `[8]` | 1 / 2 | optional soft tick |
| newBest | `[12, 50, 18]` | 7 | |
| gameOver | `[20, 40, 20, 80, 24]` | 9 | only exception to the 2-pulse rule |

- Keep the 50 ms per-id debounce and the priority/busy gate.
- **Toggle:** `vibration=false` → `play()` returns before any call, everywhere (already true). Don't add other vibrate call sites.
- **iOS Safari/PWA:** no `navigator.vibrate`. `play()` is a strict no-op, with no polyfill, audio click substitute, or error. Keep the label "Vibration (tap feedback on iPhone)" as is.
- The fever haptic MUST fire on the actual fever-entry event (`juice.feverEntered`), not on `streak === 6`, so haptic and visual can't drift apart.

## 5. P1: HUD declutter (`ui/hud.ts`, styles)
1. In-run: hide "Next: … bell", the progress bar, and "420 / 500". Show them on pause/results only.
2. Life bells: neutral `#e8ecf4` at 80 % opacity, no cyan glow. 28 px, top-left as now.
3. "BEST 18,420": 60 % size, `#8a8fa3` (Y ≈ 140 → ≤ 110). Hidden once score > best (score itself shows NEW BEST).
4. Penalty label: move to y = 22 % of viewport height (above the rose, clear of the hub). Backing plate `rgba(5,4,12,.72)`, radius 12 px, padding 8×14. Prefix the note **glyph** in the note colour (◆ for yellow). Copy unchanged.
5. Pops keep the note colour (they are crystal output), but their plate is `rgba(5,4,12,.6)` and never sits on the HUD.

## 6. P2: polish
- Vignette darkness .68 → .60 once the board is neutral, so crystals at the rim aren't crushed.
- Bloom threshold .62 → .70 so the neutral board never blooms. Crystals and the shatter tint still do.

## 7. Acceptance (re-shoot `art-before` set as `art-after/`, 780×1688)
- [ ] Idle rose annulus: no 30° hue bin > 2 % at S > .35. Sat p90 ≤ .15.
- [ ] Mid-combo 300 ms after a yellow strike: 30° bin back under 5 %. No yellow below y = 1180 except crystals/shards/button.
- [ ] Fever: no amber on board, floor, or crystal rims.
- [ ] Hub Y ≤ 45. Red crystal at rho 7 ≥ 2× local board Y.
- [ ] Penalty label fully legible, not over the hub.
- [ ] Hitstop ≤ 180 ms per strike, dud freeze 0. Reduced-motion run shows no shake or slow-mo.
- [ ] Haptic patterns match §4 exactly (unit test on `PATTERNS`). The iOS path makes zero vibrate calls.
- [ ] Existing tests for tap, scoring, and empty-penalty pass unchanged.
