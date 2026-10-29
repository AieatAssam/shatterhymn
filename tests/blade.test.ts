import { expect, it } from 'vitest';
import { Blade } from '../src/sim/blade';
import { SliceSim } from '../src/sim/sliceSim';
import type { BladeSegment } from '../src/sim/sliceTypes';
const board=()=>new SliceSim({seed:1,daily:false,profile:'standard',aspect:1,slow:false,test:{waves:false,gravity:false,cracks:false}});
it('rearms instantly after slowing and has no path limit',()=>{const b=new Blade();b.begin(0,.5,0);for(let t=8;t<=200;t+=8)b.move(t*.003,.5,t);for(let t=208;t<=320;t+=8)b.move(.6+(t-200)*.0002,.5,t);for(let t=328;t<=800;t+=8)b.move(.624+(t-320)*.003,.5,t);expect(b.arm).toBe(2);expect(b.state).toBe('armed');});
it('reports the burst cap once and refills budget on lift',()=>{const s=board();s.placeTestCrystals(Array.from({length:10},(_,i)=>({x:.1+i*.05,y:.5,note:i%2})));const seg:BladeSegment={x0:0,y0:.5,x1:.8,y1:.5,r:.02,stroke:1,arm:1,speed:3};const events=s.step({segments:[seg,seg],strokeEnded:null});expect(events.filter(e=>e.type==='cut')).toHaveLength(6);expect(events.filter(e=>e.type==='spent')).toEqual([{type:'spent',stroke:1,arm:1,reason:'arm'}]);expect(s.state.budget).toBe(0);for(let i=0;i<48;i++)s.step({segments:[],strokeEnded:null});expect(s.state.budget).toBeCloseTo(1);s.step({segments:[],strokeEnded:1});expect(s.state.budget).toBe(6);});
it('spent requires a slow sample before a new flick',()=>{const b=new Blade();b.begin(0,0,0);for(let t=8;t<=80;t+=8)b.move(t*.003,0,t);b.spend(1);b.setBudgetReady(true);for(let t=88;t<=200;t+=8)b.move(.24,0,t);expect(b.state).toBe('slow');for(let t=208;t<=280;t+=8)b.move((t-200)*.003+.24,0,t);expect(b.arm).toBe(2);});
it.each(['triangle','sine','stops'] as const)('bounds a five-second %s wiggle with real sim ticks',shape=>{const s=board(),b=new Blade();s.placeTestCrystals(Array.from({length:24},(_,i)=>({x:.1+(i%6)*.14,y:.44+Math.floor(i/6)*.04,note:i%9})));b.begin(.1,.5,0);let nextTick=1000/60,spent=false;for(let t=8;t<=5000;t+=8){const phase=(t*3/1000)%1.6;let x=shape==='sine'?.5+.4*Math.sin(t/1000*4*Math.PI):phase<.8?phase:1.6-phase;if(shape==='stops'){const p=t%650;x=p<267?p*3/1000:p<367?.8:Math.max(0,.8-(p-367)*3/1000);}b.move(x,.5,t);if(t>=nextTick){const segments:BladeSegment[]=[];const strokeEnded=b.drain(segments);for(const e of s.step({segments,strokeEnded})){if(e.type==='spent'){spent=true;b.spend(e.arm);}if(e.type==='darkHit')b.stopArm(e.arm);}b.setBudgetReady(s.state.budget>=1);nextTick+=1000/60;}}expect(s.state.stats.crystalsSliced).toBeLessThanOrEqual(12);if(shape==='stops')expect(spent).toBe(true);});

it.each([.5,1])('a %s H/s drag never arms or cuts on a portrait board',speed=>{const s=board(),b=new Blade('standard',390/844);s.placeTestCrystals([.1,.2,.3].map(x=>({x,y:.5,note:0})));b.begin(0,.5,0);for(let t=8;t<=400/speed;t+=8){b.move(speed*t/1000,.5,t);expect(b.state).toBe('ready');}const segments:BladeSegment[]=[];b.drain(segments);expect(segments).toHaveLength(0);expect(s.step({segments,strokeEnded:null}).filter(e=>e.type==='cut')).toHaveLength(0);});

it('spends a refilled token on a new arm and fully refills on lift',()=>{const s=board();s.placeTestCrystals(Array.from({length:10},(_,i)=>({x:.1+i*.05,y:.5,note:i%2})));const seg:BladeSegment={x0:0,y0:.5,x1:.8,y1:.5,r:.02,stroke:1,arm:1,speed:3};expect(s.step({segments:[seg],strokeEnded:null}).filter(e=>e.type==='cut')).toHaveLength(6);for(let i=0;i<48;i++)s.step({segments:[],strokeEnded:null});const events=s.step({segments:[{...seg,arm:2}],strokeEnded:null});expect(events.filter(e=>e.type==='cut')).toHaveLength(1);expect(events).toContainEqual({type:'spent',stroke:1,arm:2,reason:'budget'});s.step({segments:[],strokeEnded:1});expect(s.state.budget).toBe(6);});

it('reports the burst cap to the blade',()=>{const s=board(),b=new Blade();s.placeTestCrystals(Array.from({length:10},(_,i)=>({x:.1+i*.05,y:.5,note:i%2})));b.begin(0,.5,0);for(let t=8;t<=240;t+=8)b.move(3*t/1000,.5,t);const segments:BladeSegment[]=[];b.drain(segments);const events=s.step({segments,strokeEnded:null});for(const e of events)if(e.type==='spent')b.spend(e.arm);expect(events.filter(e=>e.type==='cut')).toHaveLength(6);expect(events.filter(e=>e.type==='spent')).toEqual([{type:'spent',stroke:1,arm:1,reason:'arm'}]);expect(b.state).toBe('spent');});

it('a dark hit stops the active blade arm',()=>{const s=board(),b=new Blade();s.placeTestCrystals([{x:.2,y:.5,note:0,kind:'dark'}]);b.begin(0,.5,0);for(let t=8;t<=120;t+=8)b.move(3*t/1000,.5,t);const segments:BladeSegment[]=[];b.drain(segments);for(const e of s.step({segments,strokeEnded:null}))if(e.type==='darkHit')b.stopArm(e.arm);expect(b.state).toBe('slow');});

it('charges Choir sweeps to the stroke and arm budgets on mixed-colour boards',()=>{const s=board();s.placeTestCrystals(Array.from({length:24},(_,i)=>({x:.1+(i%6)*.14,y:.44+Math.floor(i/6)*.04,note:i%6<5?0:1})));const segment:BladeSegment={x0:0,y0:.5,x1:1,y1:.5,r:.02,stroke:1,arm:1,speed:3};const events=s.step({segments:[segment],strokeEnded:null});expect(events.some(e=>e.type==='choir')).toBe(true);expect(s.state.stats.crystalsSliced).toBeLessThanOrEqual(6);expect(s.state.budget).toBe(0);});

it('keeps a long portrait zigzag armed and cuts crystals throughout the stroke',()=>{
 const s=board(),b=new Blade('standard',390/844),width=300/844;
 s.placeTestCrystals(Array.from({length:6},(_,i)=>({x:.04+width/2,y:.1+(i+.5)*.14,note:i%2})));
 b.begin(.04,.1,0);let nextTick=1000/60,armed=0,samples=0;const cutThirds=new Set<number>();
 for(let t=8;t<=1504;t+=8){const time=Math.min(t,1500),leg=Math.min(5,Math.floor(time/250)),p=(time-leg*250)/250,x=.04+width*(leg%2?1-p:p),y=.1+.14*(leg+p);b.move(x,y,t);samples++;if(b.state==='armed')armed++;if(t>=nextTick){const segments:BladeSegment[]=[];const strokeEnded=b.drain(segments);for(const e of s.step({segments,strokeEnded})){if(e.type==='cut')cutThirds.add(Math.min(2,Math.floor(e.y/.3)));if(e.type==='spent')b.spend(e.arm);if(e.type==='darkHit')b.stopArm(e.arm);}b.setBudgetReady(s.state.budget>=1);nextTick+=1000/60;}}
 expect(armed/samples).toBeGreaterThanOrEqual(.9);expect(s.state.stats.crystalsSliced).toBe(6);expect(cutThirds).toEqual(new Set([0,1,2]));
});

it('preserves the first combo when a new finger starts before the next tick',()=>{
 const s=board(),b=new Blade();
 s.placeTestCrystals([{x:.1,y:.3,note:0},{x:.2,y:.3,note:1},{x:.3,y:.3,note:2},{x:.2,y:.7,note:0}]);
 b.begin(0,.3,0);for(let t=8;t<=160;t+=8)b.move(3*t/1000,.3,t);b.end();
 b.begin(0,.7,161);for(let t=8;t<=160;t+=8)b.move(3*t/1000,.7,161+t);
 const segments:BladeSegment[]=[],endings:{stroke:number;index:number}[]=[];
 const strokeEnded=b.drain(segments,endings);const events=s.step({segments,strokeEnded,endings});
 expect(events.filter(e=>e.type==='strokeEnd')).toEqual([{type:'strokeEnd',cuts:3,bonus:60}]);
 expect(s.state.strokeCuts).toBe(1);
});
