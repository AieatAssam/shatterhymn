# Animation & haptics rules for Shatterhymn

Research notes (2026-10-27) applied to the tap-to-strike build. Sources cited inline.

## Disney’s 12 principles (games lens)

Canonical source: Thomas & Johnston, *The Illusion of Life* (1981). Games reframing: [Game Anim — The 12 Principles Of Animation (In Video Games)](https://www.gameanim.com/2019/05/15/the-12-principles-of-animation-in-video-games/); [Gamedeveloper — 12 principles for game animation](https://www.gamedeveloper.com/game-platforms/12-principles-for-game-animation); anticipation weight: [Adding Weight… Anticipation](https://www.gamedeveloper.com/design/adding-weight-to-your-game-design-part-2-anticipation).

| Principle | Rule for Shatterhymn |
|---|---|
| **Squash & stretch** | Crystals may squash ≤8% on impact and stretch briefly in shatter burst; preserve volume; never deform collision radius. |
| **Staging** | Gameplay colour lives only on crystals + colour pad. Board is low-sat value structure so the eye stages the field, not the wallpaper. |
| **Anticipation** | Player taps must stay instant (0–1 frame). Enemy/field threat uses telegraph: warn glow / Close! / approaching rho — never pre-delay the player’s strike. |
| **Follow-through / overlapping** | After shatter: shards continue with drag, bell dim recovers, heat falls with easing — not a hard cut. |
| **Slow in / slow out (easing)** | Pad press 80ms ease; unlock scale-in 250ms; pops ease out; score spring already eases. Prefer ease-out for impacts. |
| **Timing** | Hitstop/freeze scales with N (bigger chord = longer freeze, capped). Empty dud: short (≤80ms visual) + 400ms input lock, not a long freeze. |
| **Exaggeration** | Fever/Choir exaggerate bloom, shake, heat — not the board palette. |
| **Secondary action** | Floor flash, shafts, haptic pulse are secondary to the shatter silhouette. |
| **Appeal / arcs** | Shard arcs and caret-free pad; no competing rainbow board. |

## Game feel / juice

- Steve Swink, *Game Feel* (2009): feel = real-time control + simulated space + polish. Tap control is already real-time; polish must emphasise the strike without adding lag. ([PDF ch.1](http://mycours.es/gamedesign2014/files/2014/10/Game-Feel-Steve-Swink-chapter-1.pdf))
- Jonasson & Purho, **“Juice it or lose it”** (GDC Europe): maximum output for minimum input; tweening, particles, sound. ([YouTube](https://www.youtube.com/watch?v=Fy0aCDmgnxg); [Gamedeveloper write-up](https://www.gamedeveloper.com/design/video-is-your-game-juicy-enough-))
- Jan Willem Nijman (Vlambeer), **“The art of screenshake”**: shake sells impact; keep it short and decaying. ([YouTube](https://www.youtube.com/watch?v=AJdEqssNZ-U); formula notes [ladybenko](https://www.ladybenko.net/notes/screenshake/))

### Applied juice rules
1. Every strike → freeze (hitstop) + particles + sound + optional shake; scale with N.
2. Shake magnitude decays each frame; never continuous rumble.
3. Empty dud → different channel (flat sound, dull haptic, greyscale pad) — not a fake shatter.
4. Reduced motion: disable shake, long freeze, unlock scale-in; keep colour + sound + pad lockout.

## Hitstop / telegraphing
- Hit-pause makes impact readable; longer for bigger events, short for light taps (game-feel literature above).
- Shatterhymn: keep existing N-scaled freeze; cap so big Choir doesn’t stall the run > ~180–220ms wall.
- Telegraph danger with crystal approach + Close!, not by delaying the player’s tap.

## Haptics

### Apple HIG — Playing haptics
https://developer.apple.com/design/human-interface-guidelines/playing-haptics (also summarised at [developerguidelines.com](https://developerguidelines.com/human-interface-guidelines/version/25/playing-haptics/))

- Use for clear cause→effect; consistent meaning; complement audio/visual; **avoid overuse**; prefer **short discrete** events; **make optional**; don’t surprise.
- Transient = tap/impulse; continuous sparingly.
- **iOS Safari / installed PWA:** no `navigator.vibrate` — keep the Vibration setting honest (already “tap feedback on iPhone” / no-op).

### Android — Haptics design principles
https://developer.android.com/develop/ui/views/haptics/haptics-principles  
Constants: https://developer.android.com/reference/android/view/HapticFeedbackConstants

- Prefer **clear** crisp effects over long **buzzy** oneshots; correlate strength with importance/frequency; be consistent; respect user/system toggles.
- Short custom impulse ≤ ~20ms recommended; longer single shots feel buzzy.
- Use REJECT-like feel for empty dud; tick-like for light UI; stronger click for big shatter.

### Shatterhymn haptic map (target)
| Event | Feel | Notes |
|---|---|---|
| Colour tap (hit) | Short crisp click, strength ↑ with N | One pulse, not a train |
| Empty dud | Single dull ~28ms | Distinct from hit |
| Crack | Stronger single | Not continuous |
| Fever peak | One accent, not looping | |
| UI | Soft tick | Optional |
| Toggle | Off = silence everywhere | Already in settings |

## Reduced motion
When `reduceMotion`: no screenshake, no pad unlock scale-in, shorten freeze; keep pops readable and lockout greyscale (information, not decoration).
