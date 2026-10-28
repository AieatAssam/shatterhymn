# Why Shatterhymn fails the first-10-seconds test

Postmortem, 2026-10-28. Based on the repo at `8358b2f`, the screenshots in `/workspace/wow-game/shots/`, and one real play session reported by the owner.

## Summary for a parent

1. Your daughter was right. The first thing she saw was a dark grey tunnel and a row of bright buttons that did nothing when she pressed them.
2. The game asks you to look up, find a colour, look down, find the same colour on a button, and press it. That is a sorting chore, not a fun touch.
3. The first thing it teaches is how to get told off. Press the wrong colour and the buttons go grey and the game says "combo lost".
4. There is no character to care about and no big, loud, colourful moment in the first few seconds. The big moments only come if you wait, and children do not wait.
5. We judged the game by having an AI score still pictures on one emulated phone. Nobody watched a real person play it, so nobody saw any of this.

## How sure we are

We have one session, reported second-hand by the owner. That is not data, and one child is not a market. But every problem she hit can be traced to a specific line of code or a specific design decision in this repo, and each one matches what published casual-game and child-usability work says goes wrong. So we treat her reaction as a strong signal and the causes below as likely, not proven. The only way to prove them is to test fixes with her and with other casual players (see `research/recovery.md`).

---

## 1. The first 30 seconds, second by second

This is reconstructed from the code paths a first-time player hits (`tutorialDone` is false) and the screenshots. It describes the shipped build at `8358b2f`, before the separate overlap fix. We do not have a recording of her session, so the "what she tries" lines are the most likely actions, not observed ones.

| Time | On screen | What she understands | What she tries | What happens |
|---|---|---|---|---|
| 0-1 s | Black screen while WebGL starts. Then the title: "SHATTERHYMN" in a thin serif font, a grey tagline "Sing one note. Break everything tuned to it.", a gold **Play** button. Behind it, a grey tunnel with faint crystals drifting in (`shots/best/title.png` is the old colourful board; the current board is the grey one in `shots/art2/00-title.png`). No sound at all: attract mode is silent until the first input (design.md §14). | "Some kind of game." The tagline means nothing: there is no singing and no notes to see. | Nothing yet. | |
| 1-3 s | A row of 5 large, fully saturated colour buttons sits at the bottom, on top of the Daily, Missions, Collection and Settings chips (`shots/overlap-before/title--iphone14-portrait.png`). They are the brightest, biggest, most touchable things on the screen. | "Those coloured buttons are the game." | Taps a coloured button. | **Nothing.** On the title, input is switched off (`showTitle()` calls `input.setEnabled(false)` in `src/game/controller.ts`). The chip underneath does not open either, because the pad takes the tap. First lesson: the buttons don't work. |
| 3-5 s | She finds Play and taps it. First sound. The HUD disappears and the tutorial starts: "Two red triangles are coming. Tap the red ▲ button to shatter both." The text size is `clamp(.9rem, 4vw, 1.375rem)`, so about 15-16 px on a 390 px wide phone, under the game's own 16 px minimum (design.md §17). | If she reads it: "press red". If she doesn't (children usually skip text, [NN/g](https://www.nngroup.com/articles/kids-cognition/)): nothing. | Taps a button, probably whichever is nearest her thumb. | Two red triangles fade in at the rim. They can already be hit, but they drift slowly (0.9 units/s) and take about 6 s to reach their stopping point. |
| 5-8 s | Two of the three buttons are wrong. | | Taps yellow or green. | Flat thunk, a dull 28 ms buzz, the whole pad turns grey for 0.4 s, and the text changes to "That was Green. Tap red ▲ to break the red triangles." The game's first reaction to her is "wrong". |
| 8-12 s | She taps red. Both triangles shatter with shards, a flash and a bell tone. | "Red breaks red." | | This is the first payoff. It is two small crystals, the smallest event the game has. Then "Both broke. One tap breaks every crystal of that colour at once." for 1.6 s, then a yellow and a green crystal drift in with "Now tap yellow ◆ to break the yellow diamond." Another wait. |
| 12-25 s | Three text cards in a row, each with a button: (1) "Careful: tapping a colour with no crystals on screen loses your combo and freezes the buttons for a moment." (2) "Stop crystals touching the bell. Each touch cracks it. Three cracks and the run ends." (3) "Break more of one colour at once for far more points. 1 crystal: 10 · 3 at once: 90 · 5 at once: 250." (`src/sim/tutorial.ts`) | Probably nothing. "Combo", "freezes the buttons" and a points table are adult concepts. | Taps "Got it", "Got it", "Start" without reading. | Two of the three cards are about how to lose, and the third tells her to wait. |
| ~25 s | The real run starts. The board is near-black grey (board luminance capped at Y ≤ 40 and saturation at 0.12, `BOARD` in `src/render/fxConfig.ts`, see `shots/art2/01-play-pad.png`). At the centre is a grey sphere with an "I" mark: the bell. The art rescore itself called it "a placeholder" (`docs/ART-RESCORE.md` §3.5). After 1 s, six crystals appear in a ring, mixed colours, about two of each (`opening` ring in `src/sim/spawner.ts`). They move at 0.72 units/s, so nothing can touch the bell for about 12 s. | "Shapes are coming towards the ball." | Taps quickly, the way she would tap anything. | Each correct tap breaks about two crystals for 40 points. Tapping a colour that she has just cleared gives a dud: grey pad, "No Red crystals · combo lost". |
| 25-30 s | A small score, a grey board, a grey bell, a hint line at the bottom: "Tap a colour to shatter every crystal of that colour." | The rule: look up, find a colour, look down, find its button, don't get it wrong. | Looks at the screen, taps less. Puts the phone down. | Nothing in the game reacts to her as a person. Nothing has made her laugh or say "whoa". |

The best possible version of these 30 seconds, for a player who reads every word and waits patiently, contains one two-crystal shatter, one one-crystal shatter, three reading cards, and a slow grey field. The worst likely version, for a child who taps first, adds at least one "wrong" signal before the first shatter.

[Chopra](https://www.gamedeveloper.com/design/admiring-the-game-design-in-hyper-casual-games) puts the decision point at about 7 seconds. At 7 seconds Shatterhymn has, at best, just explained the first instruction.

---

## 2. Process mistakes

### 2.1 We optimised for an AI screenshot score and abstract principles, not a real person playing

**Evidence.** `FINAL.md` records seven overnight rounds (W0 to W1i) scored by an AI reviewer from still screenshots against an 8 Beauty / 8 Wow per-screen bar. Every round's work was aimed at moving that score (6.8 / 7.0 at the end, NOT SHIP). The art pass was then rescored the same way (`docs/ART-RESCORE.md`, 5.7 / 5.7). The design docs are built from frameworks (Malone-Lepper's seven principles in design.md §15, the Hooked model in §16, Disney's 12 principles in `research/animation-haptics.md`). Not one document in the repo describes watching a person play. The two big rule changes that did come from players (`docs/TAP-DESIGN.md`: "live player feedback", and `docs/ART-REVIEW.md`: "a player asked why the board has so many colours") were each one comment from one person, turned into a global rule without testing the result on anyone.

`AGENTS.md` opens with "The design is finished. Your job is to implement it exactly." The design was frozen before anyone had found out whether it was fun.

**Why it matters.** A rubric rewards what it can see. It cannot see a child's face. The hyper-casual industry treats the first real-player numbers as the gate, not internal opinion: Voodoo tests prototypes on CPI and D1 retention ([PocketGamer.biz](https://www.pocketgamer.biz/voodoo-offering-1-million-for-new-hypercasual-hits/), [PocketGamer.biz](https://www.pocketgamer.biz/voodoo-opens-android-testing-to-all-partner-studios/)) and later moved to flexible KPIs including playtime and game length ([Game Developer](https://www.gamedeveloper.com/production/shaking-up-measurability-with-flexible-kpis)). Supersonic tests marketability on real ad clicks first ([Supersonic](https://supersonic.com/learn/blog/the-supersonic-guide-to-marketability-testing/)). We had no equivalent of either, not even one person on a sofa.

### 2.2 We judged "wow" on stills, not motion and feel

**Evidence.** Every score in `FINAL.md`, `ART-REVIEW.md` and `ART-RESCORE.md` is from PNGs. `ART-RESCORE.md` says outright: "Haptics can't be judged from stills, so they are not scored here." The only motion artefact, `shots/best/gameplay.mp4`, is 13.5 s at **4 frames per second**, which cannot show timing, easing or hitstop. It was also captured with the QA fever flag (`forceFeverCapture` in `controller.ts` forces streak ≥ 5), so it opens at ×3, a state a first-time player never sees. The README hero GIF and stills (`docs/media/`) were captured before the art pass and show the colourful board, which the shipped game no longer has.

Still capture also missed states: `ART-RESCORE.md` notes that `art2/03-empty-penalty.png` "shows no penalty state", so the penalty readability fix was never checked.

**Why it matters.** Game feel is about real-time control and response ([Steve Swink, *Game Feel*, 2009](http://mycours.es/gamedesign2014/files/2014/10/Game-Feel-Steve-Swink-chapter-1.pdf)). Juice is "maximum output for minimum input", which only exists in motion and sound ([Jonasson and Purho](https://www.youtube.com/watch?v=Fy0aCDmgnxg)). Screenshake, hitstop and kickback are entirely temporal ([Nijman, The Art of Screenshake](https://www.youtube.com/watch?v=AJdEqssNZ-U)). Supersonic says an ad video must hook in the first couple of seconds ([Supersonic](https://supersonic.com/learn/blog/the-supersonic-guide-to-marketability-testing/)): the unit of judgement is a few seconds of video, not a frame.

### 2.3 The theme is abstract, with no character and no face

**Evidence.** design.md §1: "You are a glass bell hanging in the centre of a dark, endless cathedral." The bell is a grey sphere (`shots/art2/01-play-pad.png`) that the rescore called a placeholder. Nothing on screen has eyes or reacts emotionally. The tagline "Sing one note. Break everything tuned to it." needs music theory to parse and describes something the player never does (they tap a button).

**Why it matters.** Juice It or Lose It added a face with eyes and a smile to the Breakout paddle because it made the game feel alive ([gdad.wiki summary](https://gdad.wiki/wiki/sources/source-juice-it-or-lose-it), [talk](https://www.youtube.com/watch?v=Fy0aCDmgnxg)). Young children look longer at faces with baby-schema features, including animal faces ([Frontiers in Psychology, 2014](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2014.00411/full)) and prefer novel objects that have faces ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12716381/)). Subway Surfers starts you as Jake, a character, in a bright world ([Unity](https://blog.unity.com/games/behind-the-scenes-of-subway-surfers-a-qa-with-sybo), [Common Sense Media](https://www.commonsensemedia.org/app-reviews/subway-surfers)). A child cannot root for a sphere.

### 2.4 The art pass desaturated the board and killed the spectacle

**Evidence.** `docs/ART-REVIEW.md` found a real problem: the rose window painted all five note hues, so board colour competed with crystal colour. The fix (`docs/ART-HAPTICS-SPEC.md` §1) went to the opposite extreme: board saturation ≤ 0.12 (`BOARD.satMax`), a shader clamp `col=mix(vec3(y),col,uBoardSat)` with `uBoardSat = .25` (`src/render/shaders/background.ts`), board luminance ≤ 40 everywhere, the hub dimmed from Y 91 to ≤ 45, flash opacity cut from `[.3,.45,.6,.75]` to `[.08,.12,.16,.22]`, shaft life cut from 1.2 s to 0.45 s. Compare `shots/art-before/01-play-pad.png` (glowing rose window) with `shots/art2/01-play-pad.png` (grey tunnel). Roughly two thirds of the play screen is now near-black grey. The owner's words: "dull and dead".

The reviewer did score this as a readability win (+3), and it was one. But the cure removed colour instead of separating it. Readability between hues can also be won with value (brightness) contrast, size, edges and motion, so the board can stay alive as long as it is darker, softer and moving differently from the crystals. We chose "no colour" because it was the easiest thing to measure in a still.

**Why it matters.** Jonasson and Purho start their juice talk with colour, because it is hard to tell good from bad when everything is brown ([gdad.wiki](https://gdad.wiki/wiki/sources/source-juice-it-or-lose-it)). Block Blast's appeal is described as colourful clears and ASMR-like satisfaction ([Global Games Forum](https://www.globalgamesforum.com/topic-theme/how-block-blast-shattered-records-with-ai-a-b-testing-and-a-bold-bet-on-long-term-players)). Subway Surfers is a "bright colourful positive world" ([Common Sense Media](https://www.commonsensemedia.org/app-reviews/subway-surfers)). Supersonic says art and colour have limited impact on CPI compared with gameplay ([Supersonic](https://supersonic.com/learn/blog/the-supersonic-guide-to-marketability-testing/)), which cuts both ways: colour alone will not save us, but a dead-looking board does not help a weak verb either.

### 2.5 Tap-colour turned into a matching chore

**Evidence.** `docs/TAP-DESIGN.md` §1 moved input off the field onto a separate button row ("The canvas no longer takes strike input"). To act, the player must (1) scan the field, (2) pick a colour, (3) look down to the pad, (4) find that colour, (5) tap. §3 even names the problem: "A hint on the pad pulls the player's eyes down to the buttons." The pad itself already does that, on every tap. The thing being touched (a flat button) is not the thing that breaks (a crystal far up the screen).

**Why it matters.** The verbs that work on phones put the finger on the thing. Fruit Ninja's designer listed the touch verbs (tap, hold, drag, swipe) and picked slice because it is the most direct and messy ([YouTube](https://www.youtube.com/watch?v=St5v2uI-Nis)). Piano Tiles: you tap the tile itself and it plays the note. Stack and Helix Jump: one tap, instant physical result ([Chopra](https://www.gamedeveloper.com/design/admiring-the-game-design-in-hyper-casual-games)). Paper.io: your drag paints the territory under your finger and you watch it grow. Narek Aghekyan's examples show how much the core action's satisfaction matters: Voodoo reported Aquapark.io CPI improving about 44 then 59 percent after adding and polishing the jump, and Roller Splat D1 rising from 35 to 55 percent purely by making the ball more reactive ([Game Developer](https://www.gamedeveloper.com/design/the-mighty-mmm-concept-in-hyper-casual-game-design)). Our core action is a lookup.

### 2.6 It feels like punishment first

**Evidence.** The empty-strike penalty (`EMPTY_LOCK_MS = 400`, `src/sim/config.ts`) greys the whole pad, plays a flat thunk, buzzes, resets the combo and prints "No {Colour} crystals · combo lost". It is active from the first tutorial step. Tutorial card 4 explains it before the player has had any fun. `TAP-DESIGN.md` §3 refused on-screen hints specifically so that "the penalty the player asked for" would stay easy to trigger, and set the review threshold at "dud rates above 15% of strikes". The art review praised the grey pad as "the best piece of colour design in the build". It is well designed, and it is the wrong thing to show first.

**Why it matters.** Children abandon confusing experiences and need immediate positive feedback ([NN/g, kids' cognition](https://www.nngroup.com/articles/kids-cognition/), [NN/g, children's websites](https://www.nngroup.com/articles/childrens-websites-usability-issues/)). Royal Match gives generous move limits early, about 12 spare, and its designers polish early moments so players cannot get stuck ([LinkedIn, Tom Storr](https://www.linkedin.com/posts/tomstorr_if-you-want-to-improve-the-monetisation-activity-7193134939322671104-yaet), [Funovus](https://www.funovus.com/blogs/royal-match-dominates-match-3-what-can-all-designers-learn/)). Fruit Ninja's bombs exist, but the first action of the game, slicing a watermelon to start, cannot fail ([MCV/DEVELOP](https://mcvuk.com/business-news/halfbrick-was-teetering-on-the-edge-before-fruit-ninja/)).

### 2.7 No guaranteed big payoff early, and no clear goal or onboarding

**Evidence.** The first payoff is two crystals in the tutorial. The first real-run formation is a mixed ring of six (about two per colour at K = 3), so the best first tap is again about two crystals, 40 points. A Choir (7 at once) cannot happen at L0 unless the player waits for a cluster, and the first chord wave is a level 2 event (`CHORD_FROM_LEVEL = 2`, 40 s in). The goal is described in three text cards and a points table. The title shows five buttons before play (Play, Daily Hymn, Missions, Collection, Settings).

**Why it matters.** Aghekyan's Most Memorable Moment idea, based on the peak-end rule, says a session is remembered by its peak and its end, so the peak has to come early and be designed ([Game Developer](https://www.gamedeveloper.com/design/the-mighty-mmm-concept-in-hyper-casual-game-design)). Jesse Schell's interest curve (*The Art of Game Design*) opens with a hook before settling into rising action; ours opens with a lecture. Supersonic's FTUE advice is a clear goal, mechanics rolled out gradually, and not overwhelming players with buttons up front; they cite Trash Tycoon losing 60 percent of players in its tutorial ([Supersonic](https://supersonic.com/learn/blog/optimizing-ftue/)). Stack and Ball Blast boot straight into the game with a one-line instruction and let you learn by doing ([Chopra](https://www.gamedeveloper.com/design/admiring-the-game-design-in-hyper-casual-games)). Fruit Ninja's whole manual is four words: "slice fruit, avoid bombs" ([YouTube](https://www.youtube.com/watch?v=St5v2uI-Nis)).

### 2.8 We tested on one emulated phone, so the overlap bug shipped

**Evidence.** Earlier QA scripts used one viewport (Pixel 7, 390x844). The colour pad is fixed above every screen and was never hidden, so on the title it covered the Daily, Missions, Collection and Settings chips and took their taps, and it sat over pause, settings and results. The lead's automated check failed **289 of 432** screen-and-viewport combinations (see `shots/overlap-before/`: the pad over the title chips in iPhone 14 portrait and small landscape, over "Quit to menu" on iPhone 14 landscape, over "Back" in Settings on a Galaxy S8). The overnight art rescore looked at `shots/art2/00-title.png`, where the pad already sits where the menu should be and there is no logo or menu visible at all, and wrote only "no real title card". The reviewer saw the bug and named it as a missing feature.

**Why it matters.** The owner's first complaint after "dull" was "on the phone the menus and start all overlap one another". A family phone is not a Pixel 7 emulator. The fix itself is in progress separately (`padVisible` in `src/ui/colorPad.ts`, `scripts/layout-check.mjs`); the lesson is that a single-device, still-image process cannot catch layout bugs on the devices real people own.

### 2.9 N-squared scoring rewards waiting, which is the opposite of what a child does

**Evidence.** Score is `10 × N² × mult` (design.md §6). One crystal is 10, five at once is 250. design.md §2 calls the core tension "strike now and stay safe, or wait for more crystals of one colour to gather". Tutorial card 6 tells the player to wait. `TAP-DESIGN.md` §4 keeps the penalty specifically "to keep players from mashing".

**Why it matters.** A first-time child taps fast and often. Our scoring pays that behaviour the least and the penalty punishes it. The game is tuned for a patient expert optimising greed, which is a fine late-game layer and a poor first impression. Helix Jump, Stack and Piano Tiles all reward each correct tap immediately ([Chopra](https://www.gamedeveloper.com/design/admiring-the-game-design-in-hyper-casual-games)).

### 2.10 Meta before fun

**Evidence.** The repo contains a Daily Hymn with seeded runs, 12 daily missions, 7 bell skins, 5 musical scales, 6 titles, a share card generator, emoji hymn lines, friend seeds and a PWA with offline precache (design.md §10, §12). All of it was built and tested (125 tests in `FINAL.md`) before the core 10 seconds had been shown to anyone.

**Why it matters.** Royal Match puts retention before monetisation and the early levels before everything ([LinkedIn, Tom Storr](https://www.linkedin.com/posts/tomstorr_if-you-want-to-improve-the-monetisation-activity-7193134939322671104-yaet)). SayGames argues for retention and growth over early CPI for hybrid games ([SayGames](https://blog.say.games/posts/why-saygames-believes-hybrid-games-need-a-different-publishing-model)), and Homa tracks D1, D7, D28 and playtime ([Homa](https://www.homagames.com/homa-lab/data-analytics)). Retention systems retain players who already enjoy the core. They cannot create enjoyment. The industry's top-2-percent hyper-casual games reach 38-45 percent D1 against an average of about 23-24 percent ([Tenjin and GameAnalytics Q4 2023](https://gameindustrylibrary.com/documents/tenjin-and-gameanalytics-release-q4-hyper-casual-games-benchmark-report-game-world-observer)); that gap is decided in the first session, not by missions.

### 2.11 The title screen puts the most inviting things out of reach

**Evidence.** On the title, the only bright, saturated, finger-sized objects were the five colour buttons, and they did nothing (input disabled). The attract pilot only strikes every 2.5 s, and only when at least 5 crystals of one colour are within rho 6 (`src/sim/attract.ts`), so the demo often shows nothing breaking. And it is silent until first input. So the title shows a game that is not happening, with buttons that do not work.

**Why it matters.** Fruit Ninja's start menu is itself a fruit you slice: the first input is the core verb ([MCV/DEVELOP](https://mcvuk.com/business-news/halfbrick-was-teetering-on-the-edge-before-fruit-ninja/)). Stack and Ball Blast boot straight into play ([Chopra](https://www.gamedeveloper.com/design/admiring-the-game-design-in-hyper-casual-games)).

---

## 3. Honest comparison

Cells for other games describe their well-known first-session experience. Where a claim comes from a source, the source is linked in section 2 or below the table. We do not have timing measurements for these games, so "time to first payoff" is described, not measured.

| Game | Core verb | Time to first payoff | Character or face | Colour and contrast | Failure feel | Onboarding |
|---|---|---|---|---|---|---|
| **Fruit Ninja** | Swipe to slice, finger on the object | Immediate: the start button is a watermelon you slice | No face, but juicy fruit with "G-rated gore" | Bright fruit, splatter, wood background | Bomb explodes; the juice of a slice is never withheld | Four words: "slice fruit, avoid bombs". A swipe hand was added because testers tapped |
| **Piano Tiles** | Tap the tile itself | First tap plays the first note of the song | None | Pure black on white, maximum value contrast | Wrong tile ends the run at once; restart is instant | None needed |
| **Helix Jump** | One tap or drag, instant physical result | First touch: the ball bounces and drops | A ball, no face | Bright saturated tower, high contrast | Hit the wrong colour and you stop; instant restart | Learn by doing |
| **Stack** | One tap to drop a block | First tap places a block with a satisfying click | None | Soft gradient that shifts colour as you climb | Overhang is sliced off; the tower ends; instant restart | One line, learn by doing |
| **Subway Surfers** | Swipe to dodge and jump | Running starts at once; the first swipe moves Jake | **Yes: Jake**, plus the inspector and dog | Bright, colourful, positive world | Crash, comic chase, quick retry | Short swipe prompts while running |
| **Paper.io** | Drag to paint territory | First loop closes and your colour fills the ground | Simple avatars | Flat bright colour on white | Someone cuts your trail; instant retry | Learn by doing |
| **Block Blast** | Drag a piece onto the grid | First line clear in under a minute, colourful burst | None | Colourful blocks, colourful clears | Board fills, no pieces fit; calm | Learn by doing |
| **Royal Match** | Swipe to match | First match is instant; first level about 47 s | **Yes: King Robert** | Bright, saturated, high-polish | Generous move limits early (about 12 spare), so players rarely fail | First ten levels complete one decoration scene |
| **Shatterhymn (now)** | Look at field, find colour, look down, tap matching button | About 8-12 s to a two-crystal shatter in the tutorial, about 25 s to the first real run | **None.** Grey sphere | Near-black grey board (sat ≤ 0.12, Y ≤ 40); colour only on crystals and buttons | Pad greys out, flat thunk, "combo lost", from the very first step | Six steps, three of them read-only text cards, text about 15-16 px; five menu buttons before play |

Sources for the table: Fruit Ninja ([YouTube](https://www.youtube.com/watch?v=St5v2uI-Nis), [MCV/DEVELOP](https://mcvuk.com/business-news/halfbrick-was-teetering-on-the-edge-before-fruit-ninja/)); Piano Tiles, Helix Jump and Stack ([Chopra](https://www.gamedeveloper.com/design/admiring-the-game-design-in-hyper-casual-games)); Subway Surfers ([Unity](https://blog.unity.com/games/behind-the-scenes-of-subway-surfers-a-qa-with-sybo), [Common Sense Media](https://www.commonsensemedia.org/app-reviews/subway-surfers)); Block Blast ([Global Games Forum](https://www.globalgamesforum.com/topic-theme/how-block-blast-shattered-records-with-ai-a-b-testing-and-a-bold-bet-on-long-term-players)); Royal Match ([LinkedIn, Tom Storr](https://www.linkedin.com/posts/tomstorr_if-you-want-to-improve-the-monetisation-activity-7193134939322671104-yaet), [Funovus](https://www.funovus.com/blogs/royal-match-dominates-match-3-what-can-all-designers-learn/)); Paper.io from general knowledge. Character names (Jake, King Robert) and visual descriptions are general knowledge.

### Shatterhymn scored on the same columns

| Column | Score | Why |
|---|---|---|
| Verb | Weak | Indirect. The finger never touches what breaks. |
| Time to first payoff | Weak | Small payoff, late, behind reading. |
| Character or face | Missing | Nothing to care about. |
| Colour and contrast | Weak | Crystals read clearly, but the frame around them looks dead. |
| Failure feel | Weak | Fair and readable, but it arrives before any joy. |
| Onboarding | Weak | Text-led, front-loaded with rules about losing. |
| Shatter VFX, audio, haptics | **Good** | The one column where we match the field. The art review says "the shatter silhouette and shard arcs feel great", and `FINAL.md` shows Shatter Wow at 8, the only 8 of the night. Keep this. |

---

## 4. Top 5 where we went wrong

1. **We never watched a real person play.** We had an AI score screenshots on one emulated phone for a whole night, and it never once saw a child's face or a real phone.
2. **The thing you touch is not the thing that breaks.** You tap a button at the bottom to break a crystal at the top, which turns a smashing game into a colour-matching chore.
3. **The game says "wrong" before it says "wow".** The first big feedback a quick-tapping child gets is a grey, locked pad and "combo lost", and the big shatters only come if you wait.
4. **We made it grey to fix a colour clash and left it with nothing to love.** The board went dark grey and the bell is a blank sphere, so nothing is alive, and nothing on screen has a face.
5. **We built the extras before the fun.** Daily runs, missions, skins, scales and share cards were finished and tested while the first ten seconds were still a lecture.
