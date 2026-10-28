import {expect,it} from 'vitest';
import {nearestCrystal} from '../src/modes/tap/tapHit';
it('selects the nearest crystal within 48 CSS pixels and ignores empty taps',()=>{const candidates=[{id:1,note:0,sx:0,sy:0},{id:2,note:1,sx:30,sy:0}];expect(nearestCrystal(candidates,20,0)?.id).toBe(2);expect(nearestCrystal(candidates,78,0)?.id).toBe(2);expect(nearestCrystal(candidates,79,0)).toBeNull();});
