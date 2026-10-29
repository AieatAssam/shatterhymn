import { expect, it } from 'vitest';
import { pickCrystal, tapHitPx } from '../src/modes/tap/tapHit';
import { SPAWN_R, TARGETABLE_R, tapEarlySpeed } from '../src/sim/config';
const c=(id:number,note:number,sx:number,rho=7,visPx=20)=>({id,note,sx,sy:0,visPx,rho});
it('uses pointer radii and picks drawn crystals first',()=>{
 expect(pickCrystal([c(1,0,0)],50,0,()=>1)).toBe(1);
 expect(pickCrystal([c(1,0,0)],56,0,()=>1)).toBeNull();
 expect(pickCrystal([c(1,0,0)],45,0,()=>1,'mouse')).toBeNull();
 expect(pickCrystal([c(1,0,19,7,20),c(2,1,10,7,5)],0,0,()=>1)).toBe(1);
 expect(pickCrystal([c(1,0,30),c(2,1,40)],0,0,()=>1)).toBe(1);
 expect(pickCrystal([c(1,0,30),c(2,1,30.5)],0,0,n=>n===1?2:1)).toBe(2);
 expect(pickCrystal([c(3,0,30,7),c(2,0,30,6),c(1,0,30,6)],0,0,()=>1)).toBe(1);
});
it('scales touch reach with screen size and visual size',()=>{expect(tapHitPx(20,'touch',390)).toBeCloseTo(52.65);expect(tapHitPx(20,'touch',360)).toBe(52);expect(tapHitPx(20,'touch',820)).toBe(72);expect(tapHitPx(60,'touch',390)).toBe(87);});
it('targets the spawn rim and ramps early tap speeds',()=>{expect(TARGETABLE_R).toBeGreaterThanOrEqual(SPAWN_R);expect(tapEarlySpeed('beginner',false,19999)).toBe(.8);expect(tapEarlySpeed('beginner',false,25000)).toBeCloseTo(.9);expect(tapEarlySpeed('beginner',false,30000)).toBe(1);expect(tapEarlySpeed('standard',false,10000)).toBe(.9);expect(tapEarlySpeed('beginner',true,0)).toBe(1);});
