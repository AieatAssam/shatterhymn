import { describe, expect, it } from 'vitest';
import { sliceHitstopMs } from '../src/render/juice';
import { hapticForSlice, PATTERNS } from '../src/haptics/haptics';
import { sliceDegree } from '../src/audio/audio';
import { degreeToSemis } from '../src/audio/scales';
import { HalfPool, HALF_CAP } from '../src/render/crystals';
import { titleModel } from '../src/ui/screens/title';
import { resetSave } from '../src/meta/save';
describe('Slice presentation rules',()=>{
 it('caps hitstop at 120 ms',()=>expect([1,2,4,8,9,20].map(sliceHitstopMs)).toEqual([18,32,60,116,120,120]));
 it('selects crisp cut haptics',()=>{expect([1,2,3,4,8].map(hapticForSlice)).toEqual(['slice1','slice2','slice3','slice4','slice4']);expect(PATTERNS.combo.pattern).toEqual([10,40,14]);});
 it('ascends through the scale and caps at degree nine',()=>{expect([1,2,5,6,10,12].map(sliceDegree)).toEqual([0,1,4,5,9,9]);expect(degreeToSemis('bright',5)-degreeToSemis('bright',0)).toBe(12);});
 it('recycles the oldest pair at the 48 half cap',()=>{const pool=new HalfPool();for(let i=0;i<25;i++){pool.add().x=i;pool.add().x=i;}expect(pool.slots).toHaveLength(HALF_CAP);expect(pool.slots[0]!.x).toBe(24);expect(pool.slots[2]!.x).toBe(1);});
 it('enables Slice and uses its own best and daily',()=>{const save=resetSave();save.modes.slice.runs=1;save.modes.slice.bests.score=3100;save.modes.slice.daily['2026-01-01']={best:80,plays:1};const model=titleModel({save,friend:null},'2026-01-01');expect(model.slice).toMatchObject({enabled:true,best:'Best 3,100',daily:{badge:'80',played:true}});});
});
