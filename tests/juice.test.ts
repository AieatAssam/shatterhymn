import { describe, expect, it, vi } from 'vitest';
import { Juice, decayTrauma, effectiveShake, freezeMsForStrike, shake, traumaForStrike } from '../src/render/juice';
import type { Loop } from '../src/core/loop';
describe('juice timing and shake',()=>{
 it('uses the hitstop ladder and cap',()=>{expect(freezeMsForStrike(1,false)).toBe(44);expect(freezeMsForStrike(6,false)).toBe(114);expect(freezeMsForStrike(7,false)).toBe(128);expect(freezeMsForStrike(3,true)).toBe(92);expect(freezeMsForStrike(9,true)).toBe(176);});
 it('caps trauma, squares shake and decays linearly',()=>{expect(traumaForStrike(3)).toBeCloseTo(.22);expect(traumaForStrike(20)).toBe(.45);expect(shake(.5)).toBe(.25);expect(decayTrauma(1,1/2.2)).toBe(0);expect(effectiveShake(1,true)).toBe(0);});
 it('caps reduced-motion freezes and disables slow motion and squash',()=>{const freeze=vi.fn(),slowmo=vi.fn();const juice=new Juice({freeze,slowmo} as unknown as Loop);juice.reducedMotion=true;juice.event({type:'strike',note:0,n:7,shellBreaks:0,points:0,mult:1,streak:3,shattered:[],closeCount:1});juice.event({type:'crack',cracks:1,x:1,y:0,flared:[]});expect(freeze.mock.calls.every(call=>call[0]<=60)).toBe(true);expect(slowmo).not.toHaveBeenCalled();expect(juice.bellX.x).toBe(1);expect(juice.bellY.x).toBe(1);expect(juice.offsetX).toBe(0);expect(juice.roll).toBe(0);});
 it('does not freeze on a dud and caps stacked freezes',()=>{const freeze=vi.fn(),slowmo=vi.fn();const juice=new Juice({freeze,slowmo} as unknown as Loop);juice.event({type:'crack',cracks:1,x:1,y:0,flared:[]});juice.update(100);juice.event({type:'crack',cracks:2,x:1,y:0,flared:[]});juice.update(100);juice.event({type:'crack',cracks:3,x:1,y:0,flared:[]});expect(freeze.mock.calls.map(call=>call[0])).toEqual([120,120,20]);});
});
