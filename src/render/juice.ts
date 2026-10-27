import { valueNoise1D } from '../core/noise';
import { Spring1D } from '../core/spring';
import type { Loop } from '../core/loop';
import type { SimEvent } from '../sim/types';
export function freezeMsForStrike(n:number,close:boolean):number{return Math.min(180,(n>=7?160:Math.min(160,30+14*n))+(close?20:0));}
export function traumaForStrike(n:number):number{return Math.min(.45,.10+.04*n);}
export function shake(trauma:number):number{return trauma*trauma;}
export function decayTrauma(trauma:number,seconds:number):number{return Math.max(0,trauma-1.6*seconds);}
export function effectiveShake(trauma:number,reducedMotion:boolean,multiplier=1):number{return reducedMotion?0:shake(trauma)*multiplier;}
export class Juice {
 trauma=0; reducedMotion=false; shakeMultiplier=1; time=0; flash=0; bloom=1.15; ca=.0006; choirTime=-1; bellX=new Spring1D(1,3.2,.35);bellY=new Spring1D(1,3.2,.35);fov=new Spring1D(30,2.5,.6); dudTime=1000;crackTime=1000;recoilX=0;recoilY=0;holdTime=0;holding=false;
 constructor(private readonly loop:Loop){}
 event(e:SimEvent):void{
  if(e.type==='holdStart'){this.holding=true;this.holdTime=0;}
  if(e.type==='dialStep'){this.bellX.x+=.03;this.bellY.x+=.03;}
  if(e.type==='strike'){this.holding=false;if(e.n<7){this.bellX.x=.94;this.bellY.x=1.12;}if(e.n>0){const ms=freezeMsForStrike(e.n,e.closeCount>0);this.loop.freeze(ms);this.trauma=Math.min(1,this.trauma+traumaForStrike(e.n)+(e.closeCount>0?.05:0));if(e.n>=7&&!this.reducedMotion)this.loop.slowmo(.25,350,250);}else if(e.shellBreaks>0)this.loop.freeze(30);}
  if(e.type==='dud'){this.holding=false;this.dudTime=0;this.trauma=Math.min(1,this.trauma+.08);}
  if(e.type==='crack'){this.loop.freeze(120);this.trauma=Math.min(1,this.trauma+.6);this.crackTime=0;const d=Math.hypot(e.x,e.y)||1;this.recoilX=-.15*e.x/d;this.recoilY=-.15*e.y/d;}
  if(e.type==='mend')this.loop.freeze(60);
  // SG§5 f0
  if(e.type==='choir'){this.choirTime=0;this.bellX.x=1.08;this.bellY.x=.88;this.flash=this.reducedMotion?.12:.35;this.bloom=2.4;if(!this.reducedMotion){this.ca=.0045;this.fov.target=29.1;}this.trauma=Math.min(1,this.trauma+.55);}
  if(e.type==='gameOver'){this.loop.freeze(250);if(!this.reducedMotion)this.loop.slowmo(.3,900,0);this.trauma=Math.min(1,this.trauma+.9);}
 }
 update(ms:number):void{const dt=ms/1000;this.time+=dt;this.trauma=decayTrauma(this.trauma,dt);this.dudTime+=ms;this.crackTime+=ms;if(this.holding)this.holdTime+=ms;if(this.choirTime>=0)this.choirTime+=ms;
  // SG§5 f1–f9: flash, camera punch, beams and fracture animation use real time.
  if(this.choirTime>=0&&this.choirTime<(this.reducedMotion?120:67))this.flash=(this.reducedMotion?.12:.35)*(1-this.choirTime/(this.reducedMotion?120:67));else this.flash=0;
  // SG§5 f10–f45: post effects decay through the slow-motion interval.
  if(this.choirTime>160){this.bloom=1.15+(this.bloom-1.15)*Math.exp(-3*dt);this.ca=.0006+(this.ca-.0006)*Math.exp(-6*dt);}if(this.choirTime>160)this.fov.target=30;
  const steps=Math.max(1,Math.ceil(dt*120));for(let i=0;i<steps;i++){this.bellX.step(dt/steps);this.bellY.step(dt/steps);this.fov.step(dt/steps);}
 }
 get offsetX():number{return .35*effectiveShake(this.trauma,this.reducedMotion,this.shakeMultiplier)*valueNoise1D(11,this.time*18);}
 get offsetY():number{return .35*effectiveShake(this.trauma,this.reducedMotion,this.shakeMultiplier)*valueNoise1D(23,this.time*18);}
 get roll():number{return 2.5*Math.PI/180*effectiveShake(this.trauma,this.reducedMotion,this.shakeMultiplier)*valueNoise1D(37,this.time*18);}
}
