import type { RunStats } from '../sim/types';
export type ModeId = 'tap' | 'slice';
export interface MetaStats { score: number; timeMs: number; biggest: number; longestChain: number; crystals: number; choirs: number; shards: number; maxMult: number; darkHits: number }
export function tapMetaStats(s: RunStats): MetaStats {return {score:s.score,timeMs:s.timeMs,biggest:s.biggestN,longestChain:s.longestStreak,crystals:s.crystalsBroken,choirs:s.choirs,shards:s.shards,maxMult:s.maxMult,darkHits:0};}
export interface ModeStart { seed: number; daily: boolean; profile: 'beginner' | 'standard'; slow: boolean; demo: boolean; gentleMiss: boolean }
export interface GameMode { readonly id: ModeId; start(opts: ModeStart): void; tick(): void; frame(realDtMs: number, simDtMs: number): void; setInputEnabled(on: boolean): void; readonly over: boolean; result(): {stats: MetaStats; hymn: number[]; seed: number} | null; qa(): unknown; forceGameOver(): void; dispose(): void }
