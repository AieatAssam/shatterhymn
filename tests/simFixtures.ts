import type { Crystal, SimState } from '../src/sim/types';
export function state(crystals: Crystal[] = []): SimState {
  return { mode: 'run', seed: 1, tick: 0, elapsedMs: 0, level: 0, K: 3, crystals,
    recoveryMs: 0, lockMs: 0, queuedNote: null, graceMs: 0, cracks: 0, streak: 0, mult: 1, over: false,
    stats: { score: 0, timeMs: 0, biggestN: 0, longestStreak: 0, crystalsBroken: 0, choirs: 0, closeCalls: 0, prismsBroken: 0, duds: 0, strikes: 0, maxMult: 1, shards: 0, goldens: 0 }, hymn: [], slowDial: false };
}
export function crystal(id: number, note = 0, x = 6, y = 0): Crystal {
  return { id, alive: true, kind: 'normal', note, rho: Math.hypot(x, y), theta: Math.atan2(y, x), r: 0.55, speed: 1, swirl: 0, shell: false, prismMs: 1000, pushMs: 0, ageMs: 0, x, y };
}
