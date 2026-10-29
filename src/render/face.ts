import { Color, Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from 'three';
import { Spring1D } from '../core/spring';
import * as shader from './shaders/face';
import { FACE } from './fxConfig';
export type FaceState = 'dizzy'|'wince'|'delighted'|'happy'|'relieved'|'boop'|'worried'|'smile'|'idle'|'sleepy';
export const FACE_HOLD: Record<FaceState,number> = {dizzy:Infinity,wince:600,delighted:1400,happy:700,relieved:600,boop:500,worried:400,smile:400,idle:0,sleepy:0};
const priority:FaceState[]=['dizzy','wince','delighted','happy','relieved','boop','worried','smile','idle','sleepy'];
export function faceState(active:Partial<Record<FaceState,number>>, sleepy=false):FaceState { return priority.find(s=>(active[s]??0)>0) ?? (sleepy?'sleepy':'idle'); }
const shapes:Record<FaceState,number[]>={idle:[0,0,0,0,.4,0,0,0,0],sleepy:[0,0,0,0,.4,0,0,0,0],smile:[0,0,0,0,1,0,0,0,0],worried:[0,0,0,1,0,0,0,1,0],boop:[1,0,0,0,1,.4,0,0,.8],relieved:[1,0,0,0,1,0,0,0,0],happy:[1,0,0,0,1,.6,0,0,.6],delighted:[1,0,0,0,1,1,0,0,1],wince:[0,1,0,1,0,0,1,0,0],dizzy:[0,0,1,0,0,0,0,1,0]};
export class Face {
 readonly mesh:Mesh; private active:Partial<Record<FaceState,number>>={}; private blinkAt=FACE.blinkMinMs+Math.random()*(FACE.blinkMaxMs-FACE.blinkMinMs); private blink=0; private elapsed=0; private doubleAt=0; private readonly values=Array.from({length:9},(_,i)=>new Spring1D(shapes.idle[i],4,.6)); private readonly lookX=new Spring1D(0,4,.6); private readonly lookY=new Spring1D(0,4,.6); private worry=false; private wasSleepy=false; private wakeMs=0; private fade=0;
 constructor(){this.mesh=new Mesh(new PlaneGeometry(3.4,3.4),new ShaderMaterial({vertexShader:shader.vertex,fragmentShader:shader.fragment,transparent:true,depthTest:false,depthWrite:false,uniforms:{uShape:{value:new Float32Array(9)},uBlink:{value:0},uSleepy:{value:0},uCracks:{value:0},uAlpha:{value:1},uLook:{value:new Vector2()},uRim:{value:new Color(0x9fd8ff)}}}));this.mesh.renderOrder=6;this.mesh.position.z=2;}
 setRim(color:number):void {(this.mesh.material as ShaderMaterial).uniforms.uRim!.value.setHex(color);}
 wake():void {this.wakeMs=FACE.wakeMs;this.blink=FACE.blinkMs;}
 trigger(state:FaceState):void {this.active[state]=FACE_HOLD[state];}
 update(dt:number,cracks:number,sleepy:boolean,look:{x:number;y:number;rho:number;r:number}|null,over:boolean,reduced:boolean):void {
  for(const k of priority){const n=this.active[k];if(n!==undefined&&n!==Infinity)this.active[k]=Math.max(0,n-dt);}
  if(look && look.rho-look.r-1.6<=FACE.worriedGapU)this.worry=true;else if(!look || look.rho-look.r-1.6>FACE.worriedExitGapU){if(this.worry)this.active.worried=Math.max(this.active.worried??0,FACE.worriedExitMs);this.worry=false;}if(this.worry)this.active.worried=FACE.worriedExitMs;
  if(this.wasSleepy&&!sleepy)this.wake();this.wasSleepy=sleepy;this.wakeMs=Math.max(0,this.wakeMs-dt);
  this.elapsed+=dt;if(this.doubleAt && this.elapsed>=this.doubleAt){this.blink=FACE.blinkMs;this.doubleAt=0;}if(this.elapsed>=this.blinkAt){this.blink=FACE.blinkMs;this.blinkAt=this.elapsed+FACE.blinkMinMs+Math.random()*(FACE.blinkMaxMs-FACE.blinkMinMs);if(Math.random()<FACE.doubleBlink)this.doubleAt=this.elapsed+FACE.blinkMs+FACE.doubleDelayMs;}this.blink=Math.max(0,this.blink-dt);
  const state=faceState(this.active,sleepy),u=(this.mesh.material as ShaderMaterial).uniforms;u.uSleepy!.value=state==='sleepy'?1:0;u.uBlink!.value=state==='sleepy'?1:this.blink>0?Math.min(1,(140-this.blink)/50,this.blink/50):0;
  const target=shapes[state];for(let i=0;i<this.values.length;i++){const spring=this.values[i]!;spring.target=(i===7&&this.wakeMs>0&&state==='idle')?1:target[i]!;if(reduced)spring.x+=Math.max(-dt/FACE.reducedExpressionMs,Math.min(dt/FACE.reducedExpressionMs,spring.target-spring.x));else for(let j=0,n=Math.max(1,Math.ceil(dt/8));j<n;j++)spring.step(dt/1000/n);u.uShape!.value[i]=Math.max(0,Math.min(1,spring.x));}
  u.uCracks!.value=cracks;this.fade=over?Math.min(120,this.fade+dt):0;u.uAlpha!.value=1-this.fade/120;
  if(look){const d=Math.hypot(look.x,look.y)||1;this.lookX.target=look.x/d;this.lookY.target=look.y/d;}else {this.lookX.target=0;this.lookY.target=0;}
  for(const spring of [this.lookX,this.lookY]){if(reduced)spring.x+=Math.max(-dt/FACE.reducedLookMs,Math.min(dt/FACE.reducedLookMs,spring.target-spring.x));else for(let i=0,n=Math.max(1,Math.ceil(dt/8));i<n;i++)spring.step(dt/1000/n);}(u.uLook!.value as Vector2).set(this.lookX.x,this.lookY.x);
  const breath=state==='sleepy'&&!reduced?1+.02*Math.sin(this.elapsed*Math.PI/2000):1;const wobble=state==='boop'&&!reduced?1+.04*Math.sin(this.elapsed*.04):1;this.mesh.scale.set(breath*wobble,breath/wobble,1);
 }
 reset():void {this.active={};this.fade=0;this.wasSleepy=false;this.wakeMs=0;}
}
