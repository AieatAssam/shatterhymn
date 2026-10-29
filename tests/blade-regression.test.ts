import { describe, expect, it } from 'vitest';
import { Blade } from '../src/sim/blade';
import { SliceSim } from '../src/sim/sliceSim';
import { SliceWaves } from '../src/sim/sliceWaves';
import { Rng } from '../src/core/rng';
import type { BladeSegment } from '../src/sim/sliceTypes';
import { pokeTarget } from '../src/modes/slice/playArea';

const board = () => new SliceSim({seed:1,daily:false,profile:'standard',aspect:1,slow:false,test:{waves:false,gravity:false,cracks:false}});
function line(b:Blade, start:number, end:number, speed:number, t:number):number {
 const duration=Math.abs(end-start)/speed*1000, direction=Math.sign(end-start);
 for(let dt=8;dt<duration;dt+=8)b.move(start+direction*speed*dt/1000,.5,t+dt);
 b.move(end,.5,t+duration);return t+duration;
}
function drain(b:Blade,s:SliceSim) {const segments:BladeSegment[]=[];const strokeEnded=b.drain(segments);return [...s.step({segments,strokeEnded})];}

describe('Slice blade regressions',()=>{
 it('backfills a crystal at the start',()=>{const b=new Blade(),s=board();s.placeTestCrystals([{x:.1,y:.5,note:0}]);b.begin(.1,.5,0);line(b,.1,.4,3,0);expect(drain(b,s).some(e=>e.type==='cut')).toBe(true);});
 it('does not arm at 1.1 H/s',()=>{const b=new Blade();b.begin(0,.5,0);line(b,0,.5,1.1,0);const seg:BladeSegment[]=[];b.drain(seg);expect(seg).toHaveLength(0);expect(b.state).toBe('ready');});
 it('keeps armed above the disarm threshold',()=>{const b=new Blade();b.begin(0,.5,0);const t=line(b,0,.3,3,0);line(b,.3,.4,1,t);expect(b.state).toBe('armed');});
 it('clips the time and path budgets',()=>{for(const [speed,limit] of [[3,1.05],[6,1.5]]){const b=new Blade();b.begin(0,.5,0);line(b,0,3,speed!,0);const seg:BladeSegment[]=[];b.drain(seg);expect(seg.at(-1)!.x1).toBeCloseTo(limit!,6);expect(b.state).toBe('cooling');}});
 it('caps a dense mixed-colour arm at six',()=>{const b=new Blade(),s=board();s.placeTestCrystals(Array.from({length:10},(_,i)=>({x:.1+i*.05,y:.5,note:i%2})));b.begin(0,.5,0);line(b,0,.7,3,0);drain(b,s);expect(s.state.stats.crystalsSliced).toBe(6);});
 it('limits a continuous five-second wiggle to one arm',()=>{const b=new Blade(),s=board();s.placeTestCrystals(Array.from({length:24},(_,i)=>({x:.1+(i%6)*.14,y:.44+Math.floor(i/6)*.04,note:i%2})));b.begin(0,.5,0);for(let t=8;t<=5000;t+=8){const p=(t*3/1000)%1.6;b.move(p<.8?p:1.6-p,.5,t);}drain(b,s);expect(s.state.stats.crystalsSliced).toBeLessThanOrEqual(6);expect(b.state).toBe('cooling');});
 it.each([[250,true],[120,false]])('rearms after a %i ms slow phase: %s',(slow,expected)=>{const b=new Blade();b.begin(0,.5,0);let t=line(b,0,.6,3,0);t=line(b,.6,.6+.3*slow/1000,.3,t);const before=b.arm;line(b,.6+.3*slow/1000,1.2,3,t);expect(b.arm>before).toBe(expected);});
 it('starts a fresh budget on lift',()=>{const b=new Blade();b.begin(0,.5,0);line(b,0,2,3,0);b.end();b.begin(0,.5,1000);line(b,0,.3,3,1000);expect(b.arm).toBe(2);});
 it('ignores decreasing timestamps and retains equal timestamps',()=>{const b=new Blade();b.begin(0,0,0);b.move(.032,0,32);b.move(.5,0,31);b.move(.064,0,32);expect(b.speedHps).toBeCloseTo(2);});
 it('blocks the rest of an arm after a dark hit',()=>{const s=board();s.placeTestCrystals([{x:.2,y:.5,note:0,kind:'dark'},{x:.5,y:.5,note:0}]);const seg:BladeSegment={x0:0,y0:.5,x1:.7,y1:.5,r:.02,stroke:1,arm:1,speed:3};const events=s.step({segments:[seg],strokeEnded:null});expect(events.some(e=>e.type==='darkHit')).toBe(true);expect(s.state.stats.crystalsSliced).toBe(0);});
 it('does not cut a crystal swept by a choir twice',()=>{const s=board();s.placeTestCrystals(Array.from({length:7},(_,i)=>({x:.1+i*.1,y:.5,note:0})));const seg:BladeSegment={x0:0,y0:.5,x1:.8,y1:.5,r:.02,stroke:1,arm:1,speed:3};const events=s.step({segments:[seg],strokeEnded:1});expect(events.filter(e=>e.type==='cut')).toHaveLength(5);expect(s.state.stats.crystalsSliced).toBe(7);expect(s.state.stats.score).toBe(770);});
});

describe('Slice wave regressions',()=>{
 it('matches the seven beginner opening waves',()=>{const w=new SliceWaves(new Rng(3),'beginner');const expected=[[600,1,1],[2800,2,1],[5000,3,1],[7200,2,2],[9200,4,1],[11200,3,2],[13200,5,1]];for(const [time,count,colours] of expected){const wave=w.update(time!,0)!;expect(wave.notes).toHaveLength(count!);expect(new Set(wave.notes).size).toBe(colours);expect(wave.dark).toBe(0);}});
 it('starts beginner runs with red, yellow, and green waves',()=>{for(let seed=0;seed<20;seed++){const w=new SliceWaves(new Rng(seed),'beginner');for(const [i,time] of [600,2800,5000].entries())expect(w.update(time,0)!.notes.every(note=>note===i)).toBe(true);}});
 it.each(['beginner','standard'] as const)('does not schedule dark crystals early in %s',profile=>{for(let seed=0;seed<20;seed++){const w=new SliceWaves(new Rng(seed),profile);const until=profile==='beginner'?25000:12000;for(let t=0;t<until;t+=1000/60){expect(w.update(t,0)?.dark??0).toBe(0);}}});
});

describe('Slice fall and scoring rules',()=>{
 const falling = () => new SliceSim({seed:2,daily:false,profile:'standard',aspect:1,slow:false,test:{waves:false,gravity:false,cracks:true}});
 const addFalls = (s:SliceSim,wave:number,count:number) => {
  s.state.crystals.push(...Array.from({length:count},(_,i)=>({id:100+wave*10+i,alive:true,kind:'normal' as const,note:0,x:.5,y:-.11,vx:0,vy:-1,r:.058,hitR:.062,spin:0,angle:0,ageMs:0,wave})));
 };
 const step = (s:SliceSim) => [...s.step({segments:[],strokeEnded:null})];
 it('does not crack during miss grace',()=>{const s=falling();addFalls(s,1,1);expect(step(s).find(e=>e.type==='fall')).toMatchObject({cracked:false});expect(s.state.cracks).toBe(0);});
 it('cracks at most once for four falls from a wave',()=>{const s=falling();s.state.elapsedMs=7000;addFalls(s,1,4);expect(step(s).filter(e=>e.type==='crack')).toHaveLength(1);expect(s.state.cracks).toBe(1);});
 it('protects falls during crack grace and ends after three cracks',()=>{const s=falling();s.state.elapsedMs=7000;addFalls(s,1,1);step(s);addFalls(s,2,1);step(s);expect(s.state.cracks).toBe(1);for(let i=0;i<91;i++)step(s);addFalls(s,3,1);step(s);for(let i=0;i<91;i++)step(s);addFalls(s,4,1);expect(step(s).filter(e=>e.type==='gameOver')).toHaveLength(1);expect(step(s)).toHaveLength(0);});
 it('produces identical wave events for the same seed and input',()=>{const make=()=>new SliceSim({seed:2,daily:false,profile:'standard',aspect:1,slow:false});const a=make(),b=make();for(let i=0;i<1200;i++)expect(step(a)).toEqual(step(b));});
});

describe('section 7.5 stroke integration',()=>{
 it('reports a short tap as a poke without cutting',()=>{const b=new Blade(),s=board();s.placeTestCrystals([{x:.5,y:.5,note:0}]);b.begin(.5,.5,0);b.move(.51,.5,10);expect(pokeTarget(s.state.crystals,.5,.5,b.totalPath,10)).toBe(s.state.crystals[0]!.id);b.end();expect(drain(b,s).filter(e=>e.type==='cut')).toHaveLength(0);expect(s.state.crystals[0]!.alive).toBe(true);});
 it.each([[.5,0],[3,3]])('cuts %i H/s across three crystals', (speed,count)=>{const b=new Blade(),s=board();s.placeTestCrystals([.2,.4,.6].map(x=>({x,y:.5,note:0})));b.begin(.05,.5,0);line(b,.05,.75,speed,0);const events=drain(b,s);expect(events.filter(e=>e.type==='cut')).toHaveLength(count);if(count)expect(events.filter(e=>e.type==='cut').map(e=>e.type==='cut'?e.points:0)).toEqual([10,20,30]);});
 it.each([[250,true],[120,false]])('cuts a fresh crystal after %i ms slow phase', (slow,expected)=>{const b=new Blade(),s=board();b.begin(0,.5,0);let t=line(b,0,.6,3,0);drain(b,s);t=line(b,.6,.6+.3*slow/1000,.3,t);drain(b,s);const start=.6+.3*slow/1000;s.placeTestCrystals([{x:start+.2,y:.5,note:1}]);line(b,start,start+.4,3,t);expect(drain(b,s).some(e=>e.type==='cut')).toBe(expected);});
 it('cuts with a new stroke and reports the prior combo',()=>{const b=new Blade(),s=board();s.placeTestCrystals([.1,.2,.3].map(x=>({x,y:.5,note:0})));b.begin(0,.5,0);line(b,0,1.2,3,0);drain(b,s);b.end();expect(drain(b,s).find(e=>e.type==='strokeEnd')).toMatchObject({cuts:3,bonus:60});s.placeTestCrystals([{x:.2,y:.5,note:0}]);b.begin(0,.5,1000);line(b,0,.4,3,1000);expect(drain(b,s).find(e=>e.type==='cut')).toMatchObject({chainStep:1});});
 it('limits a five second sinusoidal wiggle',()=>{const b=new Blade(),s=board();s.placeTestCrystals(Array.from({length:24},(_,i)=>({x:.1+(i%6)*.14,y:.44+Math.floor(i/6)*.04,note:i%2})));b.begin(.5,.5,0);for(let t=8;t<=5000;t+=8)b.move(.5+.4*Math.sin(t/1000*4*Math.PI),.5,t);drain(b,s);expect(s.state.stats.crystalsSliced).toBeLessThanOrEqual(6);});
});

describe('slice segment limits',()=>{
 it.each([[3,1.05],[6,1.5]])('clips a %i H/s arm before crystals beyond its budget',(speed,limit)=>{const b=new Blade(),s=board();s.placeTestCrystals([{x:limit-.1,y:.5,note:0},{x:limit+.1,y:.5,note:1}]);b.begin(0,.5,0);line(b,0,2.5,speed,0);const cuts=drain(b,s).filter(e=>e.type==='cut');expect(cuts).toHaveLength(1);expect(cuts[0]).toMatchObject({note:0});});
 it('cracks on a dark hit and blocks a normal crystal behind it',()=>{const s=new SliceSim({seed:1,daily:false,profile:'standard',aspect:1,slow:false,test:{waves:false,gravity:false,cracks:true}});for(const [i,kind] of (['dark','normal'] as const).entries())s.state.crystals.push({id:i+1,alive:true,kind,note:0,x:.2+i*.3,y:.5,vx:0,vy:0,r:.058,hitR:kind==='dark'?.04:.062,spin:0,angle:0,ageMs:0,wave:1});const events=s.step({segments:[{x0:0,y0:.5,x1:.7,y1:.5,r:.02,stroke:1,arm:1,speed:3}],strokeEnded:null});expect(events.some(e=>e.type==='darkHit')).toBe(true);expect(events.some(e=>e.type==='crack')).toBe(true);expect(events.some(e=>e.type==='cut')).toBe(false);});
});
