import { SLICE_BLADE as C } from './sliceConfig';
import type { BladeSegment } from './sliceTypes';
type Point = {x:number;y:number;t:number};
export function capsuleProjection(s:BladeSegment,x:number,y:number,r:number):number|null {
 const dx=s.x1-s.x0,dy=s.y1-s.y0, d=dx*dx+dy*dy;
 const p=d ? Math.max(0,Math.min(1,((x-s.x0)*dx+(y-s.y0)*dy)/d)) : 0;
 return Math.hypot(x-(s.x0+p*dx),y-(s.y0+p*dy)) <= s.r+r ? p : null;
}
export class Blade {
 state:'up'|'ready'|'armed'|'cooling'='up'; speedHps=0; stroke=0; arm=0;
 private points:Point[]=[]; private segments:BladeSegment[]=[]; private ended:number|null=null; private radius:number=C.radius.touch;
 private armStart=0; private armPath=0; private slowSince:number|null=null; private path=0;
 begin(x:number,y:number,t:number,pointer:'touch'|'pen'|'mouse'='touch'):void {if(this.state!=='up')return;this.stroke++;this.state='ready';this.points=[{x,y,t}];this.radius=C.radius[pointer];this.speedHps=0;this.path=0;}
 move(x:number,y:number,t:number):void {
  if(this.state==='up')return; const prev=this.points[this.points.length-1]!;if(t<prev.t)return;
  const cur={x,y,t}; this.path+=Math.hypot(x-prev.x,y-prev.y);this.points.push(cur);
  const w=Math.max(t-C.windowMs,this.points[0]!.t);let first=0;while(first+1<this.points.length&&this.points[first+1]!.t<w)first++;
  const a=this.points[first]!, b=this.points[first+1]; const f=b&&b.t>a.t?Math.max(0,Math.min(1,(w-a.t)/(b.t-a.t))):0;
  const start={x:a.x+(b?b.x-a.x:0)*f,y:a.y+(b?b.y-a.y:0)*f,t:w}; const windowPoints=[start,...this.points.slice(first+1)];
  let length=0;for(let i=1;i<windowPoints.length;i++)length+=Math.hypot(windowPoints[i]!.x-windowPoints[i-1]!.x,windowPoints[i]!.y-windowPoints[i-1]!.y);
  this.speedHps=length/Math.max(t-w,C.minSpanMs)*1000;
  if(this.state==='ready'&&this.speedHps>=C.armHps){this.state='armed';this.arm++;this.armStart=w;this.armPath=0;for(let i=1;i<windowPoints.length&&this.state==='armed';i++)this.emit(windowPoints[i-1]!,windowPoints[i]!);}
  else if(this.state==='armed'){if(this.speedHps<C.disarmHps){this.state='cooling';this.slowSince=t;}else this.emit(prev,cur);}
  else if(this.state==='cooling'){if(this.speedHps<C.disarmHps){if(this.slowSince===null)this.slowSince=t;if(t-this.slowSince>=C.rearmSlowMs)this.state='ready';}else this.slowSince=null;}
  if(first>0)this.points.splice(0,first);
 }
 private emit(a:Point,b:Point):void {const len=Math.hypot(b.x-a.x,b.y-a.y);const timeLimit=b.t===a.t?1:Math.max(0,Math.min(1,(this.armStart+C.maxArmMs-a.t)/(b.t-a.t)));const pathLimit=len?Math.max(0,Math.min(1,(C.maxArmPathH-this.armPath)/len)):1;const f=Math.min(timeLimit,pathLimit);if(f>0&&len>0)this.segments.push({x0:a.x,y0:a.y,x1:a.x+(b.x-a.x)*f,y1:a.y+(b.y-a.y)*f,r:this.radius,stroke:this.stroke,arm:this.arm,speed:this.speedHps});this.armPath+=len*f;if(f<1||b.t-this.armStart>=C.maxArmMs||this.armPath>=C.maxArmPathH){this.state='cooling';this.slowSince=null;}}
 stopArm(arm:number):void {if(this.arm===arm&&this.state==='armed'){this.state='cooling';this.slowSince=null;}}
 end():void {if(this.state==='up')return;this.ended=this.stroke;this.state='up';}
 drain(out:BladeSegment[]):number|null {out.push(...this.segments);this.segments.length=0;const ended=this.ended;this.ended=null;return ended;}
 get totalPath():number{return this.path;}
}
