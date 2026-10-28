import { expect, it } from 'vitest';
import { pickCrystal } from '../src/modes/tap/tapHit';
it('uses minimum radius, normalised distance and tie breakers', () => {
 const c=(id:number,note:number,sx:number,rho=7)=>({id,note,sx,sy:0,visPx:20,rho});
 expect(pickCrystal([c(1,0,0)],30,0,()=>1)).toBe(1);
 expect(pickCrystal([c(1,0,0)],60,0,()=>1)).toBeNull();
 expect(pickCrystal([c(1,0,19.2),c(2,1,33.6)],0,0,()=>1)).toBe(1);
 expect(pickCrystal([c(1,0,20),c(2,1,20.5)],0,0,n=>n===1?2:1)).toBe(2);
 expect(pickCrystal([c(3,0,20,7),c(2,0,20,6),c(1,0,20,6)],0,0,()=>1)).toBe(1);
});
