import { Rng } from '../core/rng';
import { SLICE_RULES, SLICE_TOSS, SLICE_WAVES } from './sliceConfig';
export interface Wave { number:number; notes:number[]; dark:number; chord:boolean; }
export class SliceWaves {
 private next=600; private number=0; private bag:number[]=[];
 constructor(private readonly rng:Rng,private readonly profile:'beginner'|'standard'){}
 private tone(k:number):number {if(!this.bag.length)this.bag=this.rng.shuffle(Array.from({length:k},(_,i)=>i));return this.bag.pop()!;}
 update(elapsed:number,alive:number):Wave|null {
  if(elapsed+1e-7<this.next)return null;const level=Math.floor(elapsed/SLICE_RULES.levelMs), k=level<2?3:level<4?4:5;
  const opening=SLICE_WAVES[this.number];
  const count=opening?.count??Math.min(this.profile==='beginner'?4:6,2+this.rng.int(Math.min(5,1+level)));
  const nextNumber=this.number+1;const chord=opening?nextNumber===3||nextNumber===7:level>=1&&(this.profile==='standard'?nextNumber%5===0:nextNumber>=12&&nextNumber%6===0);
  const n=chord?5:count;
  if(alive+n>SLICE_TOSS.maxAlive){this.next+=250;return null;}
  this.number++;const main=this.profile==='beginner'&&this.number<=3?this.number-1:this.tone(k);let second=main;if(opening?.colours===2){while(second===main)second=this.tone(k);}
  const notes=Array.from({length:n},(_,i)=>opening?(opening.colours===2&&i%2?second:main):chord||this.rng.chance(.7)?main:this.tone(k));
  const dark=chord||elapsed<SLICE_RULES.darkFromMs[this.profile]?0:this.rng.chance(Math.min(this.profile==='beginner'?.30:.45,(this.profile==='beginner'?.10:.15)+.05*level))?(this.profile==='standard'&&level>=6&&n>=4?2:1):0;
  if(alive+n+dark>SLICE_TOSS.maxAlive){this.number--;this.next+=250;return null;}
  /* next wave time */
  if(opening&&this.number<7)this.next=SLICE_WAVES[this.number]!.at;
  else this.next=elapsed+1000*(this.profile==='beginner'?Math.max(1.2,2.2-.12*level):Math.max(.85,2-.15*level));
  return {number:this.number,notes,dark,chord};
 }
}
