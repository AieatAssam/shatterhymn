export type Kind = 'normal' | 'geode' | 'prism' | 'splitter' | 'rusher' | 'mend' | 'golden';
export type RunMode = 'run' | 'daily' | 'tutorial' | 'attract';
export interface Crystal {
  id: number; alive: boolean; kind: Kind; note: number;
  rho: number; theta: number; r: number; speed: number; swirl: number;
  shell: boolean; prismMs: number; pushMs: number; ageMs: number; x: number; y: number;
}
export interface ShatterInfo { id: number; x: number; y: number; note: number; kind: Kind; close: boolean; dist: number }
export interface RunStats {
  score: number; timeMs: number; biggestN: number; longestStreak: number; crystalsBroken: number;
  choirs: number; closeCalls: number; prismsBroken: number; duds: number; strikes: number; maxMult: number; shards: number; goldens: number;
}
export interface DialState { holding: boolean; note: number; stepElapsedMs: number; holdMs: number; waitingRecovery: boolean }
export interface SimState {
  mode: RunMode; seed: number; tick: number; elapsedMs: number; level: number; K: number;
  crystals: Crystal[]; dial: DialState; recoveryMs: number; jarMs: number; graceMs: number;
  cracks: number; streak: number; mult: number; over: boolean; stats: RunStats; hymn: number[]; slowDial: boolean;
}
export type SimEvent =
  | { type: 'eventWarn'; kind: 'golden' | 'chord'; note: number; theta: number }
  | { type: 'chordWave'; note: number; theta: number; ids: number[] }
  | { type: 'golden'; id: number; x: number; y: number; note: number; points: number }
  | { type: 'holdStart' }
  | { type: 'dialStep'; note: number; holdMs: number }
  | { type: 'strike'; note: number; n: number; shellBreaks: number; points: number; mult: number; streak: number; shattered: ShatterInfo[]; closeCount: number }
  | { type: 'shellBreak'; id: number; x: number; y: number; note: number }
  | { type: 'prismBlast'; x: number; y: number; radius: number }
  | { type: 'choir'; note: number; n: number; swept: ShatterInfo[]; points: number }
  | { type: 'dud'; note: number }
  | { type: 'crack'; cracks: number; x: number; y: number; flared: ShatterInfo[] }
  | { type: 'graceHit'; x: number; y: number; id: number }
  | { type: 'mend'; cracks: number }
  | { type: 'spawn'; id: number; kind: Kind; note: number }
  | { type: 'levelUp'; level: number; K: number; newNote: number | null }
  | { type: 'gameOver'; stats: RunStats; hymn: number[] };
export interface SimInput { press: boolean; release: boolean; cancel: boolean }
