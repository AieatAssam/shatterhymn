import { Rng } from '../core/rng';
import { SLICE_RULES, SLICE_TOSS, SLICE_WAVES } from './sliceConfig';
export type WavePattern = 'fountain'|'fan'|'cross'|'lob'|'rain'|'line';
export interface Wave { number:number; notes:number[]; dark:number; chord:boolean; pattern:WavePattern }
export class SliceWaves {
 private next=600; private number=0; private bag:number[]=[]; private patterns:WavePattern[]=[]; private patternLevel=0;
 constructor(private readonly rng:Rng,private readonly profile:'beginner'|'standard'){}
 tone(k:number):number {if(!this.bag.length)this.bag=this.rng.shuffle(Array.from({length:k},(_,i)=>i));return this.bag.pop()!;}
 update(elapsed:number,alive:number):Wave|null {
  if(elapsed+1e-7<this.next)return null;
  const level=Math.floor(elapsed/SLICE_RULES.levelMs), k=level<2?3:level<4?4:5;
  const opening=SLICE_WAVES[this.profile][this.number];
  const nextNumber=this.number+1;
  const chord=opening?opening.pattern==='line':level>=1&&(this.profile==='standard'?nextNumber%5===0:nextNumber>=12&&nextNumber%6===0);
  if(level>=1&&this.patternLevel===0){this.patterns=[];this.patternLevel=1;}
  if(!opening&&!chord&&!this.patterns.length)this.patterns=this.rng.shuffle<WavePattern>(['fountain','fountain','fountain','fan','fan','cross','cross','lob',...(level>=1?['rain' as const]:[])]);
  const pattern:WavePattern=opening?.pattern??(chord?'line':this.patterns[this.patterns.length-1]!);
  const count=opening?.count??Math.min(this.profile==='beginner'?4:6,2+this.rng.int(Math.min(5,1+level)));
  const n=pattern==='line'?5:pattern==='lob'?3:pattern==='fan'?Math.max(3,Math.min(5,count)):pattern==='cross'?(count>=4?4:2):pattern==='rain'?Math.max(4,Math.min(6,count)):count;
  if(alive+n>SLICE_TOSS.maxAlive){this.next+=250;return null;}
  this.number++;if(!opening&&!chord)this.patterns.pop();
  const main=this.profile==='beginner'&&this.number<=3?this.number-1:this.tone(k);let second=main;
  if(opening?.colours===2){while(second===main)second=this.tone(k);}
  const notes=Array.from({length:n},(_,i)=>opening?(opening.colours===2&&i%2?second:main):chord||this.rng.chance(.7)?main:this.tone(k));
  const dark=chord||elapsed<SLICE_RULES.darkFromMs[this.profile]?0:this.rng.chance(Math.min(this.profile==='beginner'?.30:.45,(this.profile==='beginner'?.10:.15)+.05*level))?(this.profile==='standard'&&level>=6&&n>=4?2:1):0;
  if(alive+n+dark>SLICE_TOSS.maxAlive){this.number--;if(!opening&&!chord)this.patterns.push(pattern);this.next+=250;return null;}
  if(opening&&this.number<7)this.next=SLICE_WAVES[this.profile][this.number]!.at;
  else this.next=elapsed+1000*(this.profile==='beginner'?Math.max(1.2,2.2-.12*level):Math.max(.75,1.8-.20*level));
  return {number:this.number,notes,dark,chord,pattern};
 }
}
