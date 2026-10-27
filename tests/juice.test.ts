import { describe, expect, it } from 'vitest';
import { decayTrauma, effectiveShake, freezeMsForStrike, shake, traumaForStrike } from '../src/render/juice';
describe('juice timing and shake',()=>{
 it('uses the hitstop ladder and cap',()=>{expect(freezeMsForStrike(1,false)).toBe(44);expect(freezeMsForStrike(6,false)).toBe(114);expect(freezeMsForStrike(7,false)).toBe(160);expect(freezeMsForStrike(3,true)).toBe(92);expect(freezeMsForStrike(9,true)).toBe(180);});
 it('caps trauma, squares shake and decays linearly',()=>{expect(traumaForStrike(3)).toBeCloseTo(.22);expect(traumaForStrike(20)).toBe(.45);expect(shake(.5)).toBe(.25);expect(decayTrauma(1,1/1.6)).toBe(0);expect(effectiveShake(1,true)).toBe(0);});
});
