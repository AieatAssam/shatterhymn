import { describe, expect, it } from 'vitest';
import { Blade } from '../src/sim/blade';
import { SLICE_BLADE } from '../src/sim/sliceConfig';
import { SliceSim } from '../src/sim/sliceSim';
import type { BladeSegment } from '../src/sim/sliceTypes';
function run(speed:number) {const b=new Blade(),sim=new SliceSim({seed:1,daily:false,profile:'beginner',aspect:1,slow:false,test:{waves:false,gravity:false,cracks:false}});sim.placeTestCrystals([{x:.2,y:.5,note:0},{x:.4,y:.5,note:0},{x:.6,y:.5,note:0}]);b.begin(.05,.5,0);for(let t=8;t<=600/speed;t+=8)b.move(.05+speed*t/1000,.5,t);b.end();const segments:BladeSegment[]=[];const ended=b.drain(segments);const events=sim.step({segments,strokeEnded:ended});return {b,sim,events};}
describe('Slice core',()=>{
 it('uses the specified blade constants',()=>{expect(SLICE_BLADE).toEqual({windowMs:64,minSpanMs:32,armHps:1.4,disarmHps:.9,maxArmMs:350,maxArmPathH:1.5,maxCutsPerArm:6,rearmSlowMs:100,radius:{touch:.02,pen:.02,mouse:.012},tapMaxPathH:.03,trailPoints:32});});
 it('does not cut on a slow drag',()=>{expect(run(.5).sim.state.stats.crystalsSliced).toBe(0);});
 it('cuts and scores a same-colour stroke',()=>{const r=run(3);expect(r.sim.state.stats.crystalsSliced).toBe(3);expect(r.sim.state.stats.score).toBe(120);expect(r.events.filter(e=>e.type==='cut').map(e=>e.points)).toEqual([10,20,30]);});
 it('finishes a forced game exactly once',()=>{const s=new SliceSim({seed:1,daily:false,profile:'standard',aspect:1,slow:false});s.forceGameOver();expect(s.step({segments:[],strokeEnded:null}).filter(e=>e.type==='gameOver')).toHaveLength(1);expect(s.step({segments:[],strokeEnded:null})).toHaveLength(0);});
});
