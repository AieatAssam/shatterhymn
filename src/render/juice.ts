import { BLOOM } from './fxConfig';
import { valueNoise1D } from '../core/noise';
import { Spring1D } from '../core/spring';
import type { Loop } from '../core/loop';
import type { SimEvent } from '../sim/types';
export function sliceHitstopMs(k:number):number{return Math.min(120,18+14*(Math.max(1,k)-1));}
export function freezeMsForStrike(n:number,close:boolean):number{return Math.min(180,Math.min(160,30+14*n)+(close?20:0));}
export function traumaForStrike(n:number):number{return Math.min(.45,.10+.04*n);}
export function shake(trauma:number):number{return trauma*trauma;}
export function decayTrauma(trauma:number,seconds:number):number{return Math.max(0,trauma-2.2*seconds);}
export function effectiveShake(trauma:number,reducedMotion:boolean,multiplier=1):number{return reducedMotion?0:shake(trauma)*multiplier;}
export function heatForStreak(streak:number):number{return streak>=10?1:streak>=6?.85:streak>=3?.6:0;}
export function shaftsForStrike(n:number):{count:number;strength:number}{return n>=7?{count:6,strength:.6}:{count:Math.min(6,n+1),strength:Math.min(.6,.35+.12*n)};}
export class Juice {
 heat=new Spring1D(0,1.2,1); feverEntered=false; trauma=0; reducedMotion=false; shakeMultiplier=1; time=0; flash=0; bloom: number=BLOOM.intensity; ca=.0006; choirTime=-1; bellX=new Spring1D(1,3.2,.35);bellY=new Spring1D(1,3.2,.35);fov=new Spring1D(30,2.5,.6); crackTime=1000;recoilX=0;recoilY=0;
 private sliceFreezes: {start:number;end:number}[]=[];
 private freezes: {start:number;end:number}[]=[];
 constructor(private readonly loop:Loop){}
 private freeze(ms:number, exempt=false):void { const now=this.time*1000; if(this.reducedMotion)ms=Math.min(ms,60); if(!exempt){this.freezes=this.freezes.filter(f=>f.end>now-500);const used=this.freezes.reduce((sum,f)=>sum+Math.max(0,Math.min(now,f.end)-Math.max(now-500,f.start)),0);const end=this.freezes.length?Math.max(now,this.freezes[this.freezes.length-1]!.end):now;ms=Math.min(ms,Math.max(0,220-used));if(ms>0){const newEnd=now+ms;if(end>now)this.freezes[this.freezes.length-1]!.end=Math.max(end,newEnd);else this.freezes.push({start:now,end:newEnd});}}if(ms>0)this.loop.freeze(ms); }
 private sliceFreeze(ms:number):void {const now=this.time*1000;this.sliceFreezes=this.sliceFreezes.filter(f=>f.end>now-500);const used=this.sliceFreezes.reduce((sum,f)=>sum+Math.max(0,f.end-Math.max(now-500,f.start)),0);const last=this.sliceFreezes[this.sliceFreezes.length-1];const existing=last&&last.end>now?last.end-now:0;const extra=Math.min(Math.max(0,ms-existing),Math.max(0,160-used));ms=Math.min(ms,this.reducedMotion?40:120,existing+extra);if(ms>existing){if(existing&&last)last.end=now+ms;else this.sliceFreezes.push({start:now,end:now+ms});this.loop.freeze(ms);}}
 sliceCut(k:number):void{this.sliceFreeze(sliceHitstopMs(k));this.trauma=Math.min(.8,this.trauma+.08+.025*k);}
 sliceDark():void{this.sliceFreeze(100);this.trauma=Math.min(.8,this.trauma+.5);}
 sliceChoir():void{this.sliceFreeze(120);this.choirTime=0;this.flash=.35;this.bloom=2.4;this.trauma=Math.min(.8,this.trauma+.55);if(!this.reducedMotion)this.loop.slowmo(.35,300,200);}
 event(e:SimEvent):void{
  if(e.type==='strike'){const previous=this.heat.target;this.heat.target=heatForStreak(e.streak);this.heat.f=1.2;if(previous<.6&&this.heat.target>=.6)this.feverEntered=true;if(e.n>0&&e.n<7){this.bloom+=Math.min(.9,.12*e.n);if(!this.reducedMotion)this.ca+=Math.min(.0028,.0005*e.n);if(e.n>=5)this.flash=.1;if(e.n>=4&&!this.reducedMotion)this.fov.target=29.6;}if(e.n>0&&!this.reducedMotion){this.bellX.x=.96;this.bellY.x=1.06;}if(e.n>0){const ms=freezeMsForStrike(e.n,e.closeCount>0);this.freeze(ms);this.trauma=Math.min(.8,this.trauma+traumaForStrike(e.n)+(e.closeCount>0?.05:0));if(e.n>=7&&!this.reducedMotion)this.loop.slowmo(.25,350,250);}else if(e.shellBreaks>0)this.freeze(30);}
  if(e.type==='crack'){this.heat.target=0;this.heat.f=3;}
  if(e.type==='crack'){this.freeze(120);this.trauma=Math.min(.8,this.trauma+.6);this.crackTime=0;const d=Math.hypot(e.x,e.y)||1;this.recoilX=-.15*e.x/d;this.recoilY=-.15*e.y/d;}
  if(e.type==='mend')this.freeze(60);
  // SG§5 f0
  if(e.type==='choir'){this.choirTime=0;if(!this.reducedMotion){this.bellX.x=.96;this.bellY.x=1.06;}this.flash=this.reducedMotion?.12:.35;this.bloom=2.4;if(!this.reducedMotion){this.ca=.0045;this.fov.target=29.1;}this.trauma=Math.min(.8,this.trauma+.55);}
  if(e.type==='gameOver'){this.freeze(250,true);if(!this.reducedMotion)this.loop.slowmo(.3,900,0);this.trauma=Math.min(1,this.trauma+.9);}
 }
 update(ms:number):void{const dt=ms/1000;this.time+=dt;this.trauma=decayTrauma(this.trauma,dt);this.crackTime+=ms;if(this.choirTime>=0)this.choirTime+=ms;
  // SG§5 f1–f9: flash, camera punch, beams and fracture animation use real time.
  if(this.choirTime>=0&&this.choirTime<(this.reducedMotion?120:67))this.flash=(this.reducedMotion?.12:.35)*(1-this.choirTime/(this.reducedMotion?120:67));else this.flash=Math.max(0,this.flash-ms/500);
  // SG§5 f10–f45: post effects decay through the slow-motion interval.
  if(!(this.choirTime>=0&&this.choirTime<160)){this.bloom=BLOOM.intensity+(this.bloom-BLOOM.intensity)*Math.exp(-4*dt);this.ca=.0006+(this.ca-.0006)*Math.exp(-4*dt);}if(this.choirTime<0||this.choirTime>160)this.fov.target=30;
  const steps=Math.max(1,Math.ceil(dt*120));for(let i=0;i<steps;i++){this.heat.step(dt/steps);this.bellX.step(dt/steps);this.bellY.step(dt/steps);this.fov.step(dt/steps);}
 }
 get offsetX():number{return .35*effectiveShake(this.trauma,this.reducedMotion,this.shakeMultiplier)*valueNoise1D(11,this.time*18);}
 get offsetY():number{return .35*effectiveShake(this.trauma,this.reducedMotion,this.shakeMultiplier)*valueNoise1D(23,this.time*18);}
 get roll():number{return 2.5*Math.PI/180*effectiveShake(this.trauma,this.reducedMotion,this.shakeMultiplier)*valueNoise1D(37,this.time*18);}
}
