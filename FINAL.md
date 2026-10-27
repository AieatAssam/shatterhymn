# Shatterhymn overnight WOW pass — FINAL

**Date:** 2026-10-27 (Europe/London)  
**Repo tip:** `3121970` (W1i) on `master`  
**Bar:** 8 Beauty and 8 Wow on every screen on Low tier — **not met**. Real scores below; bar was not lowered.  
**Preview:** `http://127.0.0.1:4173/` (vite preview, HTTP 200)  
**Checks:** `npm run check` green (125 tests, typecheck, lint, build)

---

## Ship verdict

**NOT SHIP.** Final scored average after W1i: **Beauty 6.8 / Wow 7.0** (SCORECARD-W7). No screen is at 8/8. Only Shatter Wow reaches 8. Tells capture still fails. Best overnight peak was W1e/f **7.2 / 6.9** (Beauty) and W1h **7.1 / 6.8**.

---

## Score history (Beauty / Wow)

| Screen | W0 | W1c | W1d | W1e/f | W1g | W1h | **W1i** |
|---|---|---|---|---|---|---|---|
| Title | 5 / 3 | 6.5 / 4 | 7 / 6.5 | 7.5 / 7 | 7.5 / 7 | 7 / 7 | **7 / 7** |
| Play (start) | 4 / 2 | 6 / 3 | 6.5 / 5 | 7 / 6 | 6.5 / 5.5 | 7 / 6 | **7 / 6.5** |
| Mid-combo | 4 / 2 | 6 / 3.5 | 6.5 / 7 | 7 / 7 | 7 / 7.5 | 7 / 6.5 | **6 / 7.5** |
| Shatter | 4 / 2 | 6.5 / 5 | 6 / 8 | 7.5 / 8.5 | 7 / 8 | 7.5 / 8.5 | **7 / 8** |
| Results | 4 / 2 | 6 / 3.5 | 7 / 6 | 7 / 6 | 6 / 6 | 7 / 6 | **7 / 6** |
| **Average** | 4.2 / 2.2 | 6.2 / 3.8 | 6.6 / 6.5 | 7.2 / 6.9 | 6.8 / 6.8 | 7.1 / 6.8 | **6.8 / 7.0** |
| Tells | — | — | fail | fail | fail | fail | **fail** |

Sources: `wow/SCORECARD.md` … `SCORECARD-W7.md`. Shots: `shots/wow2`…`wow7`; final gallery `shots/best/`.

---

## Model attribution (who implemented each round)

| Round | Implementer | Scorer | Notes |
|---|---|---|---|
| W1c | Codex **gpt-6.1-terra** | Opus 5.5 | First spectacle pass |
| W1d / W1d2 | Codex **gpt-6.1-terra** | Opus 5.5 | Bake BG, Low floor, crystal scale |
| W1e / W1e+ | Codex **gpt-6.1-terra** + lead | Opus 5.5 | Floaters, monotonic score, fever hook |
| W1f | Codex **gpt-6.1-terra** | Opus 5.5 | Floater measure, HUD backing |
| W1g | **Lead** (Codex terra **at capacity** for gpt-6.1-terra) | Opus 5.5 | Results next/pbGap attempt; tip `6f414d9` |
| W1h | Codex **gpt-6.1-terra** (retry **succeeded**) + lead GLSL hotfix `4bfd816` | Opus 5.5 | Play-start breathe, fieldCap 8, results clip fix, fever mult agree |
| W1i | **Lead** (no Codex; terra not needed) | Opus 5.5 | Opening ring of 6, fill to 8, tame rose, selectedScale 1.28 |

### Capacity / model switch

- After W1g, Codex `gpt-6.1-terra` failed once with **"Selected model is at capacity"**.
- Per night orders: **retried terra-6.1 once** for W1h → **accepted** (no luna switch required).
- **gpt-6-luna was not used.** Logged in `LOG.md` at W1h launch (~06:08 Europe/London).

---

## HUD red bells = lost lives (confirmed)

Code (`src/ui/hud.ts`):

```text
hearts[i].broken  iff  i >= 3 - state.cracks
```

| cracks | Red bells | Game state |
|---|---|---|
| 0 | 0 | Playing |
| 1 | 1 | Playing |
| 2 | 2 | Playing |
| 3 | 3 | `over = true` same tick; results mount (`MAX_CRACKS = 3`) |

Opus W7 pixel check across wow7 shots: **max red while still playing = 2**. Three red only appears with game-over / results. Earlier “three red while continued” was a **misread**; run-over logic is correct (`sim.ts` sets `over` on third crack; controller handles `gameOver` → results).

---

## What landed tonight (high signal)

- Results: `Next: … shards` and `N points from your best.` **visible** (align-content:start fix).
- Play-start: **8 crystals**, **0 cracks**, calmer rose; FPS Low **28** (was 23 after W1h shader bug).
- Pop ×M matches HUD ×M; third-crack same-tick test.
- Shatter Wow still the high point (~8–8.5 across late rounds).

## What still blocks 8/8

- Opening ring clips viewport edges; rose stair-steps on Low.
- Mid-combo HUD string collision (`Unlocked:` vs BEST) capped Beauty at 6 in W1i.
- Tells capture still misses the tell frame.
- Results has no reward beat; `(a Choir)` line break; mid-count-up capture.

---

## Deliverables

| Artifact | Path |
|---|---|
| Best shots (no debug) | `shots/best/title.png`, `play.png`, `mid-combo.png`, `shatter.png`, `shatter-800.png`, `results.png` |
| Gameplay GIF (~13.5 s, ×3 combo + fever) | `shots/best/gameplay.gif` |
| Audio sample | `shots/best/audio-sample.mp3` |
| QA dump | `shots/best/qa.json` (from wow7) |
| Scorecards | `wow/SCORECARD-W1.md` … `SCORECARD-W7.md` |
| This report | `FINAL.md` |

`qa.json` (wow7): errors `[]`, `maxAliveAtPlayStart: 8`, `cracksAtPlayStart: 0`, `midComboOk: true`, `maxMultReached: 3`, `resultsHasNext/PbGap: true`, FPS **28**, tier `low-`.

---

## Commits (tip chain)

```
3121970 W1i: play-start density + tame rose (lead)
4bfd816 fix: GLSL float divide for rose breathe (W1h hotfix)
0203531 W1h: play-start beauty + clarity (terra)
6f414d9 W1g: results next/pbGap contrast… (lead after terra capacity)
… earlier W1c–W1f terra rounds …
```

No GitHub push (per brief).
