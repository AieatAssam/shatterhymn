import type { RunResult } from '../src/meta/runEnd';
export function result(overrides: Partial<RunResult['stats']> = {}, mode: RunResult['mode'] = 'tap'): RunResult {return {mode,daily:false,seed:1,hymn:[],slowDial:false,stats:{score:0,timeMs:0,biggest:0,longestChain:0,crystals:0,choirs:0,shards:0,maxMult:1,darkHits:0,...overrides}};}
