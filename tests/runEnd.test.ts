import {expect,it} from 'vitest';
import {resetSave} from '../src/meta/save';
import {applyRunResult} from '../src/meta/runEnd';
import {result} from './metaHelpers';
it('updates per-mode bests and daily independently and shares shards',()=>{const s=resetSave();const tap=result({score:50,shards:12});tap.daily=true;applyRunResult(s,tap,'2026-01-01');expect(s.modes.tap.daily['2026-01-01']).toEqual({best:50,plays:1});expect(s.modes.slice.daily).toEqual({});const slice=result({score:70,shards:8},'slice');expect(applyRunResult(s,slice,'2026-01-01')).toMatchObject({mode:'slice',prevBest:0,newBest:true});expect(s.modes.tap.bests.score).toBe(50);expect(s.modes.slice.bests.score).toBe(70);expect(s.progress.lifetimeShards).toBe(20);});
