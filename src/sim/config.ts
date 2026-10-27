import type { Kind } from './types';

export const ARENA_R = 10.0, SPAWN_R = 10.6, TARGETABLE_R = 10.2, HALO_R = 1.6;
export const CRYSTAL_R = 0.55, RUSHER_R = 0.42, GEODE_R = 0.70, CLOSE_GAP = 1.2;
export const PRISM_BLAST_R = 3.5, CHOIR_N = 7, CHOIR_R = 5.0, FLARE_R = 3.6;
export const MAX_CRACKS = 3, RECOVERY_MS = 150, EMPTY_LOCK_MS = 400, CRACK_GRACE_MS = 1000;
export const LEVEL_MS = 20000, SLOW_SPEED_FACTOR = 0.8, MAX_CRYSTALS = 64;
export const SPAWN_FADE_MS = 350, PRISM_CYCLE_MS = 1000, SPLITTER_PUSH_MS = 400, SPLITTER_PUSH_DISTANCE = 1.2, SPLITTER_CHILD_ANGLE = 0.25;
export const OPENING_SPAWN_MS = 1000, SPAWN_RETRY_MS = 250, SPAWN_COUNT_FACTOR = 0.35;
export const SWIRL_MIN = 0.04, SWIRL_MAX = 0.16, SPIRAL_SWIRL = 0.12, SPIRAL_INTERVAL_MS = 300, SPIRAL_ANGLE = 0.45;
export const FAIRNESS_MS = 2000, FAIRNESS_ANGLE = 0.3, FAIRNESS_R = 8, FAIRNESS_ROTATION = 0.6, FAIRNESS_TRIES = 6;
export const MEND_COOLDOWN_MS = 30000, RUSHER_SPEED_FACTOR = 1.7, RING_SPEED_FACTOR = 0.8;
export interface LevelRow { K: number; spawnInterval: number; speed: number; fieldCap: number }
export const LEVELS: readonly LevelRow[] = [
  { K: 3, spawnInterval: 1.3, speed: 0.90, fieldCap: 9 },
  { K: 3, spawnInterval: 1.2, speed: 1.00, fieldCap: 10 },
  { K: 4, spawnInterval: 1.1, speed: 1.10, fieldCap: 11 },
  { K: 4, spawnInterval: 1.1, speed: 1.15, fieldCap: 12 },
  { K: 5, spawnInterval: 1, speed: 1.25, fieldCap: 14 },
  { K: 5, spawnInterval: 0.9, speed: 1.35, fieldCap: 16 },
  { K: 5, spawnInterval: 0.8, speed: 1.45, fieldCap: 18 },
  { K: 5, spawnInterval: 0.72, speed: 1.55, fieldCap: 20 },
];
export function levelRow(L: number): LevelRow {
  const level = Math.max(0, Math.floor(L));
  if (level < LEVELS.length) return LEVELS[level]!;
  const n = level - 7;
  return { K: 5, spawnInterval: Math.max(0.45, 0.72 - 0.03 * n), speed: Math.min(2.4, 1.55 + 0.06 * n), fieldCap: Math.min(28, 20 + n) };
}
export interface FormationDef { id: 'single' | 'pair' | 'arc' | 'duet' | 'spiral' | 'ring'; fromLevel: number; weight: number }
export const FORMATIONS: readonly FormationDef[] = [
  { id: 'single', fromLevel: 0, weight: 5 }, { id: 'pair', fromLevel: 0, weight: 3 },
  { id: 'arc', fromLevel: 1, weight: 3 }, { id: 'duet', fromLevel: 2, weight: 2 },
  { id: 'spiral', fromLevel: 3, weight: 2 }, { id: 'ring', fromLevel: 4, weight: 1.5 },
];
export interface KindDef { kind: Exclude<Kind, 'normal'>; fromLevel: number; chance: number }
export const KINDS: readonly KindDef[] = [
  { kind: 'mend', fromLevel: 5, chance: 0.025 }, { kind: 'prism', fromLevel: 3, chance: 0.05 },
  { kind: 'geode', fromLevel: 2, chance: 0.08 }, { kind: 'splitter', fromLevel: 4, chance: 0.07 },
  { kind: 'rusher', fromLevel: 5, chance: 0.1 },
];
export const SCORE = { base: 10, shell: 5, close: 20, choirEach: 50, choirFlat: 500, multCap: 8 } as const;

export const EVENT_FIRST_MS = [20000, 26000] as const, EVENT_GAP_MS = [20000, 40000] as const, EVENT_WARN_MS = 1000;
export const ATTRACT_FIRST_EVENT_MS = 4000, ATTRACT_EVENT_GAP_MS = [9000, 14000] as const, ATTRACT_LEVEL = 3, ATTRACT_K = 5, ATTRACT_RHO = 6;
export const GOLDEN_FROM_LEVEL = 1, GOLDEN_SPEED = 0.8, GOLDEN_SWIRL = 0.08, GOLDEN_POINTS = 250, GOLDEN_SHARDS = 5;
export const CHORD_FROM_LEVEL = 2, CHORD_COUNT = 7, CHORD_ARC = 1.5, CHORD_SPEED = 0.75, CHORD_CAP_SLACK = 3;
export const EVENT_RETRY_MS = 250, EVENT_GIVE_UP_MS = 6000, EVENT_WEIGHTS = { golden: 3, chord: 2 } as const, EVENT_SEED_SALT = 0x5eede7e7;
