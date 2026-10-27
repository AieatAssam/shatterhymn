export interface TutorialStep {
  text: string; spawns: readonly { note: number; theta: number }[]; stopRho: 5;
  expect: { strikeNote: number } | 'button' | 'auto';
  durationMs?: number; button?: string;
}
export type TutorialScript = readonly TutorialStep[];
export const TUTORIAL_SCRIPT: TutorialScript = [
  { text: 'Two red triangles are coming. Tap the red ▲ button to shatter both.', spawns: [{ note: 0, theta: -0.21 }, { note: 0, theta: 0.21 }], stopRho: 5, expect: { strikeNote: 0 } },
  { text: 'Both broke. One tap breaks every crystal of that colour at once.', spawns: [], stopRho: 5, expect: 'auto', durationMs: 1600 },
  { text: 'Now tap yellow ◆ to break the yellow diamond.', spawns: [{ note: 1, theta: -0.21 }, { note: 2, theta: 0.21 }], stopRho: 5, expect: { strikeNote: 1 } },
  { text: 'Careful: tapping a colour with no crystals on screen loses your combo and freezes the buttons for a moment.', spawns: [], stopRho: 5, expect: 'button', button: 'Got it' },
  { text: 'Stop crystals touching the bell. Each touch cracks it. Three cracks and the run ends.', spawns: [], stopRho: 5, expect: 'button', button: 'Got it' },
  { text: 'Break more of one colour at once for far more points. 1 crystal: 10 · 3 at once: 90 · 5 at once: 250.', spawns: [], stopRho: 5, expect: 'button', button: 'Start' },
];
export const TUTORIAL_RETRY = 'That was {Yellow}. Tap red ▲ to break the red triangles.';
