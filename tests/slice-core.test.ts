import { BEGINNER_BLADE } from '../src/sim/sliceConfig';
import { describe, expect, it } from 'vitest';
import { Blade } from '../src/sim/blade';
import { SLICE_BLADE } from '../src/sim/sliceConfig';
import { SliceSim } from '../src/sim/sliceSim';
import type { BladeSegment } from '../src/sim/sliceTypes';
function run(speed:number,profile:'beginner'|'standard'='beginner') {const b=new Blade(profile),sim=new SliceSim({seed:1,daily:false,profile:'beginner',aspect:1,slow:false,test:{waves:false,gravity:false,cracks:false}});sim.placeTestCrystals([{x:.2,y:.5,note:0},{x:.4,y:.5,note:0},{x:.6,y:.5,note:0}]);b.begin(.05,.5,0);for(let t=8;t<=600/speed;t+=8)b.move(.05+speed*t/1000,.5,t);b.end();const segments:BladeSegment[]=[];const ended=b.drain(segments);const events=sim.step({segments,strokeEnded:ended});return {b,sim,events};}
describe('Slice core',()=>{
 it('uses the specified blade constants',()=>{expect(SLICE_BLADE).toEqual({windowMs:64,minSpanMs:32,armSps:2.4,disarmSps:1.543,maxCutsPerArm:6,budget:{cap:6},radius:{touch:.02,pen:.02,mouse:.012},tapMaxPathH:.03,trailPoints:64});});
 it.each([.5,1])('does not cut on a %s H/s beginner drag',speed=>{expect(run(speed).sim.state.stats.crystalsSliced).toBe(0);});
 it('beginner arms at the standard speed and only disarms later',()=>{expect(BEGINNER_BLADE.armSps).toBe(SLICE_BLADE.armSps);expect(BEGINNER_BLADE.disarmSps).toBeLessThan(SLICE_BLADE.disarmSps);});
 it('cuts and scores a same-colour stroke',()=>{const r=run(3);expect(r.sim.state.stats.crystalsSliced).toBe(3);expect(r.sim.state.stats.score).toBe(120);expect(r.events.filter(e=>e.type==='cut').map(e=>e.points)).toEqual([10,20,30]);});
 it('finishes a forced game exactly once',()=>{const s=new SliceSim({seed:1,daily:false,profile:'standard',aspect:1,slow:false});s.forceGameOver();expect(s.step({segments:[],strokeEnded:null}).filter(e=>e.type==='gameOver')).toHaveLength(1);expect(s.step({segments:[],strokeEnded:null})).toHaveLength(0);});
});

describe('Slice toss physics',()=>{
 it.each(['standard','beginner'] as const)('launches 200 crystals into the %s apex band',profile=>{let checked=0;for(let seed=0;seed<200;seed++){const sim=new SliceSim({seed,daily:false,profile,aspect:.6,slow:false,test:{waves:true,gravity:true,cracks:false}});for(let tick=0;tick<36;tick++)sim.step({segments:[],strokeEnded:null});const c=sim.state.crystals[0]!;const g=profile==='standard'?1.6:1.35;const apex=c.y+c.vy*c.vy/(2*g);const band=profile==='standard'?[.55,.88]:[.60,.80];expect(apex).toBeGreaterThanOrEqual(band[0]!-.01);expect(apex).toBeLessThanOrEqual(band[1]!+.01);const xAtApex=c.x+c.vx*c.vy/g;expect(xAtApex).toBeGreaterThanOrEqual(0);expect(xAtApex).toBeLessThanOrEqual(.6);checked++;}expect(checked).toBe(200);});
 it('keeps the opening waves outside the bell clearance band',()=>{const sim=new SliceSim({seed:3,daily:false,profile:'beginner',aspect:1,slow:false,test:{waves:true,gravity:true,cracks:false}});for(let i=0;i<280;i++)sim.step({segments:[],strokeEnded:null});for(const c of sim.state.crystals.filter(c=>c.wave<=3))expect(Math.abs(c.x-.5)).toBeGreaterThanOrEqual(.1+c.r+.04-1e-6);});
});

it('every toss stays fully on screen',()=>{for(const aspect of [.462,2]){const sim=new SliceSim({seed:7,daily:false,profile:'beginner',aspect,slow:false,test:{waves:false,gravity:true,cracks:false}});const launch=(sim as unknown as {launch:(note:number,kind:'normal'|'dark',wave:number)=>void}).launch.bind(sim);for(let i=0;i<500;i++){const kind=i%2?'dark':'normal';launch(0,kind,i);const c=sim.state.crystals[0]!,m=c.r+.02;while(c.alive){expect(c.x).toBeGreaterThanOrEqual(m-1e-6);expect(c.x).toBeLessThanOrEqual(aspect-m+1e-6);sim.step({segments:[],strokeEnded:null});}}}});

it('first waves never cover the bell face',()=>{for(const profile of ['beginner','standard'] as const)for(let seed=0;seed<20;seed++){const aspect=390/844,sim=new SliceSim({seed,daily:false,profile,aspect,slow:false,test:{waves:true,gravity:true,cracks:false}});for(let tick=0;tick<360;tick++){sim.step({segments:[],strokeEnded:null});for(const c of sim.state.crystals.filter(c=>c.wave<=3))expect(Math.hypot(c.x-aspect/2,c.y-.13)).toBeGreaterThanOrEqual(.1+c.r-1e-7);}}});

it('opening launches stay inside screen width for their entire flight',()=>{for(const profile of ['beginner','standard'] as const)for(const aspect of [390/844,320/568,844/390])for(let seed=0;seed<20;seed++){const sim=new SliceSim({seed,daily:false,profile,aspect,slow:false,test:{waves:true,gravity:true,cracks:false}}),ids=new Set<number>();for(let tick=0;tick<650;tick++){const events=sim.step({segments:[],strokeEnded:null});if(sim.state.elapsedMs<4200)for(const e of events)if(e.type==='toss')ids.add(e.id);for(const c of sim.state.crystals)if(ids.has(c.id)){expect(c.x-c.r).toBeGreaterThanOrEqual(-1e-8);expect(c.x+c.r).toBeLessThanOrEqual(aspect+1e-8);}}expect(ids.size).toBeGreaterThan(0);}});
