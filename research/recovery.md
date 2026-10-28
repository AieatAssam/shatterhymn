# Ways back

Companion to `research/postmortem.md`. 2026-10-28.

Three options, from cheapest to most radical, then a recommendation. Effort is in lead-plus-agents days (one lead directing Codex runs, including spec writing and review). The estimates are rough: this team has not built any of these yet, and the overnight log shows capacity failures and hotfixes eat time.

**One rule for all three options.** `AGENTS.md` tells the implementer to follow the docs literally, and the docs are normative. So every option starts with the lead rewriting the relevant parts of `docs/design.md`, `docs/TAP-DESIGN.md` and `docs/ART-HAPTICS-SPEC.md`. Changing code first and the docs later would leave Codex re-implementing the old design.

## The test protocol (used by every option)

Each option ends with a 60-second test with the owner's daughter, and ideally one casual adult who has not seen the game. The protocol is the same each time so results can be compared.

- Use **her own phone**, or the phone she would normally play on, in portrait.
- Hand it over with the game already loaded and say only "want to try this?". No explanation, no help, no "tap the red one". If she asks, answer "what do you think?".
- Record the screen (with audio) at 60 fps, plus one person taking notes. Record her face only if the parent wants to; the notes can capture reactions.
- Note the time of: first touch, first shatter, first smile or sound, first visible confusion, first "wrong" feedback, the moment she puts it down or asks for something else.
- Do not ask "did you like it?" (children say yes to be kind). Watch what she does.

**Pass bar** (the same for every option, so they can be compared):

| Signal | Pass |
|---|---|
| First touch | Within 3 s of seeing the screen, without being told |
| First reaction | Smiles, laughs or makes a sound ("whoa", "ooh") in the first 10 s |
| Understanding | Plays a second run without asking how |
| Staying | Plays 3 runs, or about 2 minutes, without being prompted |
| Wanting | Asks to play again later, unprompted, or shows someone |

An option **passes** if it gets at least 4 of 5, including "Wanting" or "Staying". This is one child, so a pass means "worth building further", not "proven". A fail on "First touch" or "First reaction" is the most important one to take seriously, because those are the first-10-seconds failures from the postmortem.

---

## Option 1: RESCUE

Keep the game, its rules and its systems. Change the first impression and the verb.

### What changes

| Change | Files and systems | Detail |
|---|---|---|
| **Tap the crystal, not a button** | `src/input/input.ts`, `src/render/camera.ts`, `src/ui/colorPad.ts`, `src/game/controller.ts` | Hit-test `pointerdown` on the canvas against alive crystal screen positions (project each crystal's `x, y` through the camera; generous radius, at least 48 px). Tapping any crystal sends the existing `{ strike: note }` for its colour, so every crystal of that colour shatters. The sim API does not change. The pad becomes optional (keep it for keyboard and accessibility, hidden by default on touch). This removes the scan, look down, find button chore (postmortem 2.5) and makes an empty strike almost impossible, because you can only tap a colour that is on screen. |
| **Variant to test: swipe through** | `src/input/input.ts` | A swipe strikes every colour it crosses, one strike per colour, in order. Closer to Fruit Ninja's slice ([YouTube](https://www.youtube.com/watch?v=St5v2uI-Nis)). Test against tap-the-crystal; do not build both into the shipped game. |
| **The bell gets a face** | `src/render/bell.ts`, `src/render/shaders/bell.ts`, `src/render/juice.ts` | Two eyes and a mouth on the bell, drawn in the bell shader or as a small sprite layer. Render-only, driven by existing sim events, so the sim stays pure. Idle: blinks, eyes follow the nearest crystal. A crystal inside `CLOSE_GAP`: worried eyes. `strike`: happy squash, mouth opens, bigger for bigger N. `choir`: delighted face, eyes closed. `crack`: wince. `mend`: relief. `gameOver`: a sad face before it shatters. Title: asleep, wakes on first touch. |
| **A living background** | `src/render/shaders/background.ts`, `src/render/background.ts`, `src/render/fxConfig.ts` (`BOARD`, `PALETTE`, `SHATTER`), `src/render/floor.ts`, `src/render/sparks.ts` | See "Why value and motion, not saturation everywhere" below. |
| **A guaranteed big shatter in the first 5 s** | `src/sim/spawner.ts` (the `opening` formation), `src/sim/config.ts` (`OPENING_SPAWN_MS`) | Replace the opening mixed ring of 6 with 8 crystals of one colour that appear at about 0.3 s, already close (around rho 7), moving slowly. The first tap on any of them is N = 8, which is a Choir (`CHOIR_N = 7`): the signature moment, flash, shake, chord and a delighted bell face, before second 5. Follow it with a second same-colour cluster a few seconds later. Still fully seeded, so the ethics rules in design.md §17 hold. |
| **No penalty in the first runs** | `src/sim/sim.ts`, `src/sim/strike.ts`, `src/meta/save.ts` (`progress.runs`), `src/ui/popText.ts`, `src/haptics/haptics.ts` | For the first 3 runs, an empty strike costs nothing: no lockout, no grey pad, no "combo lost", no dull buzz. A soft neutral blip at most. With tap-the-crystal this mostly stops happening anyway. If the pad is kept, allow buttons for on-screen colours to glow during those runs (reverses the `TAP-DESIGN.md` §3 ruling for beginners only). |
| **Boot straight into play** | `src/ui/screens/title.ts`, `src/game/controller.ts` (`showTitle`, `startRun`, `startTutorial`), `src/sim/tutorial.ts`, `src/ui/tutorialOverlay.ts` | First launch skips the title and the six-step text tutorial and goes straight into a run whose opening cluster is the tutorial. One animated hand points at a crystal, which is what Fruit Ninja added when testers did the wrong gesture ([YouTube](https://www.youtube.com/watch?v=St5v2uI-Nis)). No text cards. Teach cracks the first time a crystal gets close, with the bell's worried face, not a card. Hide Daily, Missions and Collection until after run 3. Replace the tagline with a plain instruction. |
| **Reward fast tapping early** | `src/sim/spawner.ts` (L0 formation weights), `docs/design.md` §6 | Keep `10 × N² × mult`, but make the L0 spawn table mostly same-colour Pairs and Arcs, so a child who taps as soon as something appears still gets 3 to 5 at once. Waiting for bigger clusters stays as the skill layer for later levels. |

### Why value and motion, not saturation everywhere

The art review's problem was real: the rose window painted all five note hues, so the board said "yellow is here" when no yellow crystal was (`docs/ART-REVIEW.md` §1 and §3). But what fixed readability was mostly the **value ladder** (crystals at least 2x as bright as the board behind them, specular capped, hub dimmed), not the grey. The eye separates a figure from its background mainly by brightness, edges and motion. Hue on its own is a weak separator, which is why the colourful board clashed: it put note hues at similar brightness right next to the crystals.

So the board can be alive again if it follows these rules:

1. **Keep the value ladder.** Board stays dark (keep the Y ≤ 40 target near crystals); crystals stay the brightest, sharpest things on screen.
2. **Colour the board in one narrow, deep hue family** that is not a note colour at full strength, for example a deep indigo-to-teal night glow, instead of grey. Raise `uBoardSat` and `BOARD.satMax` from today's 0.25 / 0.12, starting around 0.5 and tuning by eye on video. Never per-petal note colours, never a list of notes.
3. **Move it.** Slow, large-scale motion that no crystal has: light sweeping across the rose window, the window brightening on the music beat (the `uBeat` uniform already exists), drifting dust in the light shafts, a slight parallax on the pillars. Crystals move inward and spin; the board breathes. Different motion is what keeps them apart.
4. **Make the hits bigger, not smaller.** On a shatter, flood the whole window with that note's colour for 300 to 500 ms, well above today's capped `flashOpacity [.08,.12,.16,.22]` and `uTintAmt` peaks, then let it fall back. That is the spectacle the art pass removed. It is safe because it is short, whole-board (it does not point at one crystal) and caused by the player.

This is a hypothesis. Test two or three board versions side by side on a real phone, in motion, before choosing.

### Why it should fix appeal

- Direct touch on the thing that breaks: Fruit Ninja, Piano Tiles, Stack, Helix Jump ([YouTube](https://www.youtube.com/watch?v=St5v2uI-Nis), [Chopra](https://www.gamedeveloper.com/design/admiring-the-game-design-in-hyper-casual-games)). Fixes postmortem 2.5.
- A face gives a child something to care about and reads emotion faster than any text ([Frontiers in Psychology](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2014.00411/full), [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12716381/), and the paddle face in [Juice It or Lose It](https://gdad.wiki/wiki/sources/source-juice-it-or-lose-it)). Fixes 2.3.
- A designed early peak: the Most Memorable Moment and the peak-end rule ([Aghekyan](https://www.gamedeveloper.com/design/the-mighty-mmm-concept-in-hyper-casual-game-design)), and the hook at the start of Schell's interest curve. Fixes 2.7.
- No penalty first, generous early play: Royal Match ([LinkedIn, Tom Storr](https://www.linkedin.com/posts/tomstorr_if-you-want-to-improve-the-monetisation-activity-7193134939322671104-yaet), [Funovus](https://www.funovus.com/blogs/royal-match-dominates-match-3-what-can-all-designers-learn/)); children need immediate positive feedback ([NN/g](https://www.nngroup.com/articles/kids-cognition/)). Fixes 2.6.
- Boot into play, learn by doing, few buttons up front ([Chopra](https://www.gamedeveloper.com/design/admiring-the-game-design-in-hyper-casual-games), [Supersonic FTUE](https://supersonic.com/learn/blog/optimizing-ftue/)). Fixes 2.7 and 2.11.
- Aghekyan's Roller Splat example (D1 35 to 55 percent from making the ball more reactive, no new levels) is the closest published case to this option: same game, better feel ([Game Developer](https://www.gamedeveloper.com/design/the-mighty-mmm-concept-in-hyper-casual-game-design)).

### Effort

About **2 days** for a test spike (tap-the-crystal, simple face with 4 expressions, opening Choir cluster, no lockout, boot into play, one living-board variant). About **5 to 7 days** to finish properly: full face states, board tuning, docs rewritten, tests updated (`direct-strike`, `tutorial`, `tutorial-attract`, `spawner`, `copy`, `w1-visual` tests all assume the current design).

### Risk

- **Medium-high.** The core is still "match colours". Tapping a crystal is much better than tapping a button, but it may still feel like a sorting task once the opening Choir is over, especially from level 2 when there are 4 and then 5 colours.
- The top-down tunnel keeps crystals small at the centre, where taps matter most. Hit-testing small, moving targets may frustrate small fingers.
- The face can look cheap if it is not well drawn. It needs the same care as the shatter.
- Risk of repeating the old mistake: polishing for a week without testing. The spike must be tested before anything else is built.

### Cheap validation

A 60-second build behind a URL flag (for example `?proto=rescue`): boot straight into a run, opening cluster of 8 red crystals, animated hand pointing at one, tap any crystal to break its colour, bell with a face, the living board, no penalty. Run the test protocol.

**Watch for:** does she touch a crystal (not the old button area) within 3 s? Does the first Choir get a sound or a smile? After the opening, does she keep tapping happily, or start to slow down and look for what to do? Does she react to the face (talk to it, laugh when it winces)?

**Pass bar:** the standard 4 of 5. Additionally, if she stops tapping within 20 s after the opening cluster, treat that as a sign the colour-matching core is the problem and move to Option 2.

---

## Option 2: PIVOT

Keep the engine and everything that already feels good. Replace the core game with a shape that is proven to work in the first seconds.

### What we keep

- Renderer and pipeline: `src/render/renderer.ts`, `quality.ts`, bloom and vignette settings, the WebGL setup.
- Crystal meshes and shaders: `src/render/crystals.ts`, `shaders/crystal.ts`, `glyphs.ts`.
- The shatter, which is the best part of the game: `shards.ts`, `sparks.ts`, `rings.ts`, `glowQuads.ts`, `shaders/shard.ts`, `shaders/spark.ts`, `shaders/ring.ts`.
- Juice and timing: `src/render/juice.ts` (hitstop, shake, caps).
- Haptics map: `src/haptics/haptics.ts`.
- Audio: `src/audio/bellSynth.ts`, `scales.ts`, `music.ts`, `samples.ts`. Every crystal is already a pitched note.
- The pure, seeded sim structure (`src/core/rng.ts`, `loop.ts`), so the Daily seed and share line can survive.
- The bell face from Option 1.

### Shape A (recommended): Crystal Slice

Crystals are thrown up from the bottom of the screen in arcs and fall back. Swipe through them to shatter them. Each crystal you slice plays the next note of a melody in the current scale, so a good swipe sounds like a run on a harp (the Piano Tiles idea: every correct touch plays the song, [Chopra](https://www.gamedeveloper.com/design/admiring-the-game-design-in-hyper-casual-games)). Slicing several in one swipe is a combo; slicing all the crystals of one colour in one swipe is a Choir. Dark cracked crystals are the bombs: slice one and the bell cracks. Three cracks end the run. The bell with a face sits at the bottom, singing along and flinching when a dark crystal flies past.

Why this shape: the verb is the one Halfbrick chose after comparing all four touch verbs ([YouTube](https://www.youtube.com/watch?v=St5v2uI-Nis)), the four-word rule ("slice crystals, avoid dark ones") needs no reading, the first swipe can never fail, and our shatter VFX was built for exactly this kind of messy, satisfying output ([Juice It or Lose It](https://gdad.wiki/wiki/sources/source-juice-it-or-lose-it)). Colour matters for points but is never required to act, so a child who just swipes wildly still gets a show.

New code: a ballistic spawner (replaces `src/sim/spawner.ts`), swipe input with segment-against-circle hits (`src/input/input.ts`), new scoring and events (`src/sim/strike.ts`, `types.ts`), a side-on camera instead of the top-down tunnel (`src/render/camera.ts`), a background re-laid for that view, and a hand-gesture tutorial.

### Shape B (alternative): Bell Drop

A one-touch smash in the Helix Jump and Stack family ([Chopra](https://www.gamedeveloper.com/design/admiring-the-game-design-in-hyper-casual-games)). The bell (with its face) falls down a tall tower of stained-glass floors. Hold to slam down and shatter the glass under you; each floor is a note, so a fast drop plays a scale. Dark lead floors cannot be broken: let go before you hit them, or the bell cracks. The cathedral gets lighter and more colourful the deeper you go.

Why: one input, an instant physical result, endless restart, and a natural place for a growing, colourful reward (the tower behind you). Less clear than Shape A for a first-time child because "let go before the dark floor" is a timing skill, and less of the current code fits (a vertical camera and tower generation are new).

### Why it should fix appeal

It fixes the verb (postmortem 2.5), the penalty-first feel (2.6), the late payoff (2.7) and the waiting-based scoring (2.9) at the root rather than working around them, while keeping the shatter, sound and haptics that already score well. The Most Memorable Moment examples (Aquapark.io's jump, Crazy Kick D1 25 to 36 percent after adding the kick, [Aghekyan](https://www.gamedeveloper.com/design/the-mighty-mmm-concept-in-hyper-casual-game-design)) all show that the core action is what moves first-session results, and Supersonic says gameplay is the most influential factor in CPI ([Supersonic](https://supersonic.com/learn/blog/the-supersonic-guide-to-marketability-testing/)).

### Effort

About **2 days** for a test spike of Shape A (spawner, swipe, existing shatter, face, one scale). About **8 to 12 days** to a finished game with the meta reconnected (Daily seed, share line, unlocks), docs rewritten and tests replaced. Most of the 125 existing tests cover rules that would change.

### Risk

- **Medium.** The shape is well proven, which also means it is crowded and can feel derivative. Our original part has to be the music (every slice is a note) and the singing bell, and the art and rules must be our own.
- A side-on camera is new work on a renderer that runs at 28 fps on Low tier (`FINAL.md`). Particle-heavy swipes could push it lower.
- The current "Shatterhymn" design docs and meta systems would need a large rewrite; some of that work is lost.

### Cheap validation

A 60-second `?proto=slice` build: crystals thrown up in arcs, swipe to shatter with the existing shard VFX, each slice plays a rising note, the bell with a face at the bottom, no bombs in the first 20 s, then a few dark crystals. Run the test protocol.

**Watch for:** does she swipe or tap? (Fruit Ninja testers tapped; if she taps, show the hand or make taps work too.) Does a multi-crystal swipe get a sound from her? Does she notice the melody? Does she avoid the dark crystals on purpose by the second run?

**Pass bar:** the standard 4 of 5.

---

## Option 3: RESTART

Keep only the tech stack (TypeScript, Vite, three.js, the shatter VFX, audio and haptics code) and the process lessons. Pick a new concept by letting the daughter choose between three tiny prototypes.

### What changes

Build three throwaway prototypes, about one day each, 60 seconds of play each. Each one reuses the existing shatter, sound and haptics so that no prototype loses just because it has no juice.

| Prototype | Verb | Idea | Why it is in the set |
|---|---|---|---|
| **P1 Slice** | Swipe | Option 2 Shape A in its smallest form | The proven benchmark. If a new idea cannot beat this, build this. |
| **P2 Paint the Cathedral** | Drag | Drag a trail of light across a grey cathedral. Close a loop around crystals and they shatter, and the area inside floods with colour and stays coloured. Dark crystals cut your trail. The goal is to bring the whole window back to life. | A tactile verb with a visible, growing result, like Paper.io. It turns our "dull and dead" board into the point of the game: the player makes it alive. |
| **P3 Bouncy Bell** | One tap | A small glass creature with a big face bounces up a tower of crystals. Tap to jump; landing on a crystal shatters it and plays a note. Miss and you fall a floor. | A character first, like Subway Surfers ([Unity](https://blog.unity.com/games/behind-the-scenes-of-subway-surfers-a-qa-with-sybo)), with a Helix/Stack one-touch verb ([Chopra](https://www.gamedeveloper.com/design/admiring-the-game-design-in-hyper-casual-games)). Tests whether she plays for the character. |

Show all three in one session, in random order, with the test protocol for each. Then ask one question at the end: "which one do you want to play again?" and hand her the phone with all three available. What she opens first is the answer.

Then build the winner properly, with a new design doc written after the test, not before.

### Why it should fix appeal

It fixes the biggest process mistake directly (postmortem 2.1): it chooses the game by watching a real player instead of by scoring a design. It tests three different reasons to play (mess, growth, character) in a few days instead of committing a week to one guess. Voodoo and Supersonic build their businesses on cheap prototypes judged by real players before investing ([PocketGamer.biz](https://www.pocketgamer.biz/voodoo-offering-1-million-for-new-hypercasual-hits/), [Supersonic](https://supersonic.com/learn/blog/the-3-most-important-kpis-for-testing-your-hyper-casual-prototype/)).

### Effort

About **3 to 4 days** for the three prototypes and the test, then about **10 to 20 days** to build the winner to the current level of polish (meta, settings, PWA, accessibility, tests).

### Risk

- **Highest cost and schedule risk.** Most of the current design and its tuning is thrown away.
- **Small-sample risk.** One child choosing between three prototypes is a strong hint, not a market test. Add at least one casual adult and, if possible, one more child.
- **Process conflict.** `AGENTS.md` forbids flat placeholder art and says the design is finished. Prototypes need an explicit exception: they live in a separate `proto/` folder, never ship, and must reuse the real shatter shaders (which keeps them out of "flat placeholder" territory).
- It is possible none of the three passes. That is still a cheap, useful answer.

### Cheap validation

The prototypes are the validation. **Pass bar:** a prototype is a winner if it passes the standard 4 of 5 and she picks it at the end. If two pass, prefer the one with the earlier first smile.

---

## Recommendation

**Run Option 1 and Option 2 Shape A as two spikes, side by side, and test them with the daughter on day 3. Commit only to the winner. If neither passes, go to Option 3 using the other two prototypes (Paint, Bouncy Bell).**

Why a sequence and not one pick:

- Option 1 is the cheapest and keeps the most work. But the postmortem suggests the colour-matching core itself may be the problem (2.5, 2.9), and Option 1 only softens it. Testing Option 1 alone risks spending a week polishing a verb that cannot win.
- Option 2 Shape A fixes the core, and it reuses the parts of Shatterhymn that work (shatter, audio, haptics, the bell). It is also P1 of Option 3, so no work is wasted if we end up restarting.
- Two spikes tested against each other tell us far more than one spike tested alone: we see which one she picks, not just whether she is polite about one.
- Both spikes together cost about 4 days of lead-plus-agents time, less than the overnight WOW pass that got us here.

### First 3 concrete steps

1. **Close the overlap bug for good.** (Done in commit 6d94893: 432/432 layouts clean locally and in CI.) Land the in-progress pad fix (`padVisible` in `src/ui/colorPad.ts`, `tests/padVisibility.test.ts`) and run `scripts/layout-check.mjs` in the GitHub Actions workflow (`.github/workflows/deploy.yml`) on every push, across its 6 phones, portrait and landscape, notch insets and 130 percent text. Note: the script uses Playwright, which `AGENTS.md` forbids agents to run locally, so it belongs in CI and the lead's checklist, not in `npm run check`.
2. **Write two one-page spike specs** (`?proto=rescue` and `?proto=slice`), with the exact player-facing strings, as proposed changes to `docs/design.md` and `docs/TAP-DESIGN.md`. Include the `AGENTS.md` exception for throwaway prototypes. Lead approves, then Codex builds both, each in about 2 days.
3. **Test on day 3** with the daughter and one casual adult, using the protocol and pass bar above, on her own phone, screen recorded at 60 fps. Write the result into `research/playtest-01.md` with timings and quotes. Decide that day.

### Process change (from now on)

| Old | New |
|---|---|
| AI scores still screenshots against an 8/8 rubric; the score is the ship gate | Every iteration ends with a playtest: a real child or casual player, on a real phone, with the protocol above. The AI reviewer may comment on video, but its score is never the gate. |
| Stills and a 4 fps GIF captured with forced QA states (`?qa=1&fever=1`) | 60 fps screen video with sound, starting from a cold launch, no forced states. Hero media is re-captured from the shipped build. |
| One emulated phone (Pixel 7) | `scripts/layout-check.mjs` in CI on every push, plus a spot check on at least one real iPhone and one real small Android before each test. |
| One player comment becomes a normative rule | A comment becomes a hypothesis. It becomes a rule only after the change has been tested with at least one other person. |
| Meta and polish before the core is fun | The first 10 seconds must pass the playtest before any new meta, menu or unlock work starts. |
| "The design is finished" (`AGENTS.md`) | The design is finished only for the parts that have passed a playtest. |
