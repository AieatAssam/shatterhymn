import { SLICE_BLADE as C, BEGINNER_BLADE, SLICE_AIM } from './sliceConfig';
import type { BladeSegment } from './sliceTypes';
type Point = {x:number;y:number;t:number};
export type BladeTrailPoint = Point & {mode:0|1|2|3};
export function capsuleProjection(s:BladeSegment,x:number,y:number,r:number):number|null {
 const dx=s.x1-s.x0,dy=s.y1-s.y0, d=dx*dx+dy*dy;
 const p=d ? Math.max(0,Math.min(1,((x-s.x0)*dx+(y-s.y0)*dy)/d)) : 0;
 return Math.hypot(x-(s.x0+p*dx),y-(s.y0+p*dy)) <= s.r+r ? p : null;
}
export function bladeRadiusH(pointer:'touch'|'pen'|'mouse',areaWpx:number,areaHpx:number):number {return Math.min(SLICE_AIM.bladeMaxH,Math.max(C.radius[pointer],Math.max(SLICE_AIM.bladeMinPx[pointer],SLICE_AIM.bladeShortFrac[pointer]*Math.min(areaWpx,areaHpx))/areaHpx));}
export function sweptProjection(s:BladeSegment,c:{x:number;y:number;vx:number;vy:number;hitR:number},lag:number,g:number):number|null {
 const ax=s.x0,ay=s.y0,ux=s.x1-ax,uy=s.y1-ay,bx=c.x-c.vx*lag,by=c.y-c.vy*lag-.5*g*lag*lag,vx=c.x-bx,vy=c.y-by;
 const a=ux*ux+uy*uy,b=ux*vx+uy*vy,d=vx*vx+vy*vy,wx=ax-bx,wy=ay-by,e=ux*wx+uy*wy,f=vx*wx+vy*wy,den=a*d-b*b;
 let p=den>1e-15?Math.max(0,Math.min(1,(b*f-d*e)/den)):0;
 let q=d?Math.max(0,Math.min(1,(b*p+f)/d)):0;
 p=a?Math.max(0,Math.min(1,(b*q-e)/a)):0;
 q=d?Math.max(0,Math.min(1,(b*p+f)/d)):0;
 return Math.hypot(ax+ux*p-bx-vx*q,ay+uy*p-by-vy*q)<=s.r+c.hitR?p:null;
}
export class Blade {
 constructor(private readonly profile:'beginner'|'standard'='standard', private readonly aspect=1) {}
 get speedSps():number{return this.speedHps/Math.min(1,this.aspect);}
 get mode():0|1|2|3{return this.state==='armed'?1:this.state==='slow'?2:this.state==='spent'?3:0;}
 state:'up'|'ready'|'armed'|'slow'|'spent'='up'; speedHps=0; stroke=0; arm=0;
 readonly trail:BladeTrailPoint[]=[];
 private points:Point[]=[]; private segments:BladeSegment[]=[]; private ended:number|null=null; private endings:{stroke:number;index:number}[]=[]; private radius:number=C.radius.touch;
 private budgetReady=true; private path=0;
 begin(x:number,y:number,t:number,pointer:'touch'|'pen'|'mouse'='touch',radiusH?:number):void {if(this.state!=='up')return;this.stroke++;this.state='ready';this.points=[{x,y,t}];this.trail.length=0;this.trail.push({x,y,t,mode:0});this.radius=radiusH??C.radius[pointer];this.speedHps=0;this.path=0;}
 move(x:number,y:number,t:number):void {
  if(this.state==='up')return; const prev=this.points[this.points.length-1]!;if(t<prev.t)return;
  const cur={x,y,t}; this.path+=Math.hypot(x-prev.x,y-prev.y);this.points.push(cur);
  const w=Math.max(t-C.windowMs,this.points[0]!.t);let first=0;while(first+1<this.points.length&&this.points[first+1]!.t<w)first++;
  const a=this.points[first]!, b=this.points[first+1]; const f=b&&b.t>a.t?Math.max(0,Math.min(1,(w-a.t)/(b.t-a.t))):0;
  const start={x:a.x+(b?b.x-a.x:0)*f,y:a.y+(b?b.y-a.y:0)*f,t:w}; const windowPoints=[start,...this.points.slice(first+1)];
  let length=0;for(let i=1;i<windowPoints.length;i++)length+=Math.hypot(windowPoints[i]!.x-windowPoints[i-1]!.x,windowPoints[i]!.y-windowPoints[i-1]!.y);
  this.speedHps=length/Math.max(t-w,C.minSpanMs)*1000;
  const arm=this.profile==='beginner'?BEGINNER_BLADE.armHps:C.armHps, disarm=this.profile==='beginner'?BEGINNER_BLADE.disarmHps:C.disarmHps;
  if((this.state==='ready'||this.state==='slow')&&this.speedHps>=arm){this.state='armed';this.arm++;for(let i=1;i<windowPoints.length;i++)this.emit(windowPoints[i-1]!,windowPoints[i]!);}
  else if(this.state==='armed'){if(this.speedHps<disarm)this.state='slow';else this.emit(prev,cur);}
  else if(this.state==='spent'&&this.budgetReady&&this.speedHps<disarm)this.state='slow';
  this.trail.push({...cur,mode:this.mode});if(this.trail.length>C.trailPoints)this.trail.shift();
  if(first>0)this.points.splice(0,first);
 }
 private emit(a:Point,b:Point):void {if(a.x!==b.x||a.y!==b.y)this.segments.push({x0:a.x,y0:a.y,x1:b.x,y1:b.y,r:this.radius,stroke:this.stroke,arm:this.arm,speed:this.speedHps});}
 stopArm(arm:number):void {if(this.arm===arm&&this.state==='armed')this.state='slow';}
 spend(arm:number):void {if(this.arm===arm&&this.state!=='up')this.state='spent';}
 setBudgetReady(ready:boolean):void {this.budgetReady=ready;}
 end():void {if(this.state==='up')return;this.ended=this.stroke;this.endings.push({stroke:this.stroke,index:this.segments.length});this.state='up';}
 drain(out:BladeSegment[], endings?:{stroke:number;index:number}[]):number|null {out.push(...this.segments);this.segments.length=0;const ended=this.ended;this.ended=null;if(endings)endings.push(...this.endings);this.endings.length=0;return endings?null:ended;}
 get totalPath():number{return this.path;}
}
