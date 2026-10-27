export interface TutorialStep {
  text: string; spawns: readonly { note: number; theta: number }[]; stopRho: 5;
  expect: 'press' | 'release' | { strikeNote: number } | 'button' | 'auto';
  durationMs?: number; button?: string;
}
export type TutorialScript = readonly TutorialStep[];
export const TUTORIAL_SCRIPT: TutorialScript = [
  { text: 'Hold your finger anywhere on the screen.', spawns: [], stopRho: 5, expect: 'press' },
  { text: 'Keep holding. The bell climbs through its notes: red, yellow, green.', spawns: [], stopRho: 5, expect: 'release' },
  { text: 'Two red triangles. Hold, then let go while the dial is on red.', spawns: [{ note: 0, theta: -0.21 }, { note: 0, theta: 0.21 }], stopRho: 5, expect: { strikeNote: 0 } },
  { text: 'Both broke at once. One note breaks every crystal of its colour.', spawns: [], stopRho: 5, expect: 'auto', durationMs: 1600 },
  { text: 'Now break the yellow diamond. Hold until the dial reaches yellow, then let go.', spawns: [{ note: 1, theta: -0.21 }, { note: 2, theta: 0.21 }], stopRho: 5, expect: { strikeNote: 1 } },
  { text: 'If a crystal touches the bell, the bell cracks. Three cracks and the run ends.', spawns: [], stopRho: 5, expect: 'button', button: 'Got it' },
  { text: 'More of one colour at once = far more points. 1 crystal: 10 · 3 at once: 90 · 5 at once: 250.', spawns: [], stopRho: 5, expect: 'button', button: 'Start' },
];
export const TUTORIAL_RETRY = 'That was {Yellow}. Let go while the dial is on red.';
