import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { SliceWaves } from '../src/sim/sliceWaves';
import type { Wave } from '../src/sim/sliceWaves';
import { SliceSim } from '../src/sim/sliceSim';
import { SLICE_TOSS } from '../src/sim/sliceConfig';

type Pending = { note:number; kind:'normal'|'dark'; wave:number; apex?:{x:number;y:number}; x0?:number; rain?:boolean; at:number };
function scheduled(seed:number,aspect:number,pattern:Wave['pattern'],count:number,dark=0):{sim:SliceSim;pending:Pending[]} {
 const sim=new SliceSim({seed,daily:true,profile:'standard',aspect,slow:false,test:{waves:false,gravity:true,cracks:false}});
 const internals=sim as unknown as {waveTime:number;schedule:(wave:Wave)=>void;pending:Pending[]};
 internals.waveTime=10000;internals.schedule({number:8,pattern,chord:pattern==='line',notes:Array(count).fill(0) as number[],dark});
 return {sim,pending:internals.pending};
}

function collect(seed:number,profile:'standard'|'beginner',until:number):{time:number;wave:Wave}[] {
 const director=new SliceWaves(new Rng(seed),profile), result:{time:number;wave:Wave}[]=[];
 for(let tick=0;tick<=until*60/1000;tick++){const time=tick*1000/60;const wave=director.update(time,0);if(wave)result.push({time,wave});}
 return result;
}
describe('Slice wave patterns',()=>{
 it.each(['standard','beginner'] as const)('matches the %s opening table',profile=>{
  const expected=profile==='standard'?[['fan',3],['cross',2],['line',5],['fountain',4],['lob',3],['cross',4],['fan',5]]:[['fountain',1],['fan',3],['cross',2],['line',5],['fountain',3],['lob',3],['fan',4]];
  const waves=collect(8,profile,10000);expect(waves).toHaveLength(7);
  for(const [i,{time,wave}] of waves.entries()){expect(time).toBeCloseTo([600,2200,3800,5600,7200,8600,10000][i]!,4);expect([wave.pattern,wave.notes.length]).toEqual(expected[i]);}
 });
 it('produces deterministic patterns and never schedules rain before level one',()=>{
  for(let seed=0;seed<20;seed++){const a=collect(seed,'standard',50000);expect(a).toEqual(collect(seed,'standard',50000));expect(a.filter(x=>x.time<20000).every(x=>x.wave.pattern!=='rain')).toBe(true);}
 });
 it('draws each ramp pattern from the level-one bag',()=>{
  for(let seed=0;seed<20;seed++){const waves=collect(seed,'standard',50000).filter(x=>x.time>=20000&&x.wave.pattern!=='line').slice(0,9);expect(new Set(waves.map(x=>x.wave.pattern))).toEqual(new Set(['fountain','fan','cross','lob','rain']));}
 });
 it('keeps pattern apexes and rain inside the screen across seeds and aspects',()=>{
  for(const aspect of [.462,2])for(let seed=0;seed<200;seed++)for(const pattern of ['fountain','fan','cross','lob','rain','line'] as const){
   const {sim,pending}=scheduled(seed,aspect,pattern,pattern==='cross'?4:5,1);
   const launch=(sim as unknown as {launch:(note:number,kind:'normal'|'dark',wave:number,apex?:{x:number;y:number},x0?:number,rain?:boolean)=>void}).launch.bind(sim);
   for(const p of pending){launch(p.note,p.kind,p.wave,p.apex,p.x0,p.rain);const c=sim.state.crystals.at(-1)!;
    if(p.rain){expect(c.x).toBeGreaterThanOrEqual(c.r);expect(c.x).toBeLessThanOrEqual(aspect-c.r);}
    else {const x=c.x+c.vx*c.vy/SLICE_TOSS.gravity.standard;expect(x).toBeGreaterThanOrEqual(c.r+.02-1e-8);expect(x).toBeLessThanOrEqual(aspect-c.r-.02+1e-8);}
   }
  }
 });
 it('launches cross pairs from opposite sides and they cross before their apex',()=>{
  for(const aspect of [.462]){const {sim,pending}=scheduled(1,aspect,'cross',4);const launch=(sim as unknown as {launch:(note:number,kind:'normal'|'dark',wave:number,apex?:{x:number;y:number},x0?:number)=>void}).launch.bind(sim);
   for(let i=0;i<4;i+=2){const a=pending[i]!,b=pending[i+1]!;expect(a.at).toBe(b.at);expect(a.x0).toBeCloseTo(.15*aspect);expect(b.x0).toBeCloseTo(.85*aspect);launch(a.note,a.kind,a.wave,a.apex,a.x0);launch(b.note,b.kind,b.wave,b.apex,b.x0);const [left,right]=sim.state.crystals.slice(-2);const crossing=(right!.x-left!.x)/(left!.vx-right!.vx);expect(crossing).toBeGreaterThan(0);expect(crossing).toBeLessThan(left!.vy/SLICE_TOSS.gravity.standard);}
  }
 });
 it('launches a fan from its centre towards evenly spaced apexes',()=>{const {pending}=scheduled(1,.462,'fan',5);const sorted=[...pending].sort((a,b)=>a.apex!.x-b.apex!.x);for(let i=0;i<5;i++){expect(sorted[i]!.x0).toBeCloseTo(.231);expect(sorted[i]!.apex!.x).toBeCloseTo((.22+.56*i/4)*.462);}expect(pending[0]!.apex!.x).toBeCloseTo(.231);});
});
