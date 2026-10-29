import { CRYSTAL_EDGE } from "./fxConfig";
import { crystalVisualScale, CRYSTAL_GLOW, PALETTE, TITLE_FX } from './fxConfig';
import { Color, DoubleSide, DynamicDrawUsage, ExtrudeGeometry, InstancedBufferAttribute, InstancedMesh, Object3D, Quaternion, Scene, ShaderMaterial, Vector3 } from "three";
import { easeOutBack } from "../core/ease";
import { MAX_CRYSTALS } from "../sim/config";
import type { Crystal, SimEvent, SimState } from "../sim/types";
import { glyphShape } from "./glyphs";
import { NOTE_COLORS } from "./fxConfig";
import { GlowQuads } from './glowQuads';
import type { SliceCrystal, SliceEvent } from '../sim/sliceTypes';
import { buildChordTable, chordFor, CutCaps, halfScale, tumbleAngle, CAP_COOL } from './sliceCap';
import type { Tier } from './quality';
import { SLICE_TOSS } from '../sim/sliceConfig';
import * as shader from "./shaders/crystal";

const CAP = MAX_CRYSTALS * 2 + 48;
export const HALF_CAP = 48;
type Half = {x:number;y:number;vx:number;vy:number;angle:number;spin:number;note:number;nx:number;ny:number;ax:number;ay:number;mid:number;half:number;age:number};
export class HalfPool {
 readonly slots: Half[] = Array.from({length:HALF_CAP},()=>({x:0,y:0,vx:0,vy:0,angle:0,spin:0,note:0,nx:0,ny:0,ax:0,ay:0,mid:0,half:0,age:900}));
 private next=0;
 add():Half { const half=this.slots[this.next]!;this.next=(this.next+1)%HALF_CAP;return half; }
 reset():void {this.next=0;for(const half of this.slots)half.age=900;}
}
const cores = [0xffb3c0,0xffe8a8,0xb8ffe2,0xc2e2ff,0xebd3ff].map(c => new Color(c));
const darks = [0x7a1230,0x7a4a06,0x0b5a3e,0x103c7a,0x46177a].map(c => new Color(c));
const colors = NOTE_COLORS.map(c => new Color(c));
const kinds = { normal: 0, geode: 1, prism: 2, splitter: 3, rusher: 4, mend: 5, golden: 6, dark: 1 } as const;
type Visual = { id: number; crystal: Crystal; flash: number; pending: number; duration: number; choir: boolean; shellFlash: number; note: number; previousNote: number; blend: number; trailX: Float32Array; trailY: Float32Array };
export class Crystals {
  private readonly meshes: InstancedMesh[] = []; private readonly attrs: Record<string, InstancedBufferAttribute>[] = []; private readonly visual: Visual[] = Array.from({length: MAX_CRYSTALS}, () => ({id: 0, crystal: {id:0,alive:false,kind:'normal',note:0,rho:0,theta:0,r:0,speed:0,swirl:0,shell:false,prismMs:0,pushMs:0,ageMs:0,x:0,y:0}, flash: 0, pending: 0, duration: 0, choir: false, shellFlash: 0, note: 0, previousNote: 0, blend: 1, trailX: new Float32Array(6), trailY: new Float32Array(6)}));
  private readonly object = new Object3D(); private readonly color = new Color(); private readonly core = new Color(); private readonly dark = new Color(); private readonly counts = new Int32Array(6); private readonly gold = new Color(0xffd27a); private readonly shadow = new Color(PALETTE.void0); private readonly halo = new Color(CRYSTAL_EDGE.haloColor);
  private readonly radii:number[]=[]; private readonly tables:Float32Array[]=[]; private readonly caps:CutCaps; private readonly spinQ=new Quaternion(); private readonly tumbleQ=new Quaternion(); private readonly axis=new Vector3(); private readonly capNormal=new Vector3(); private readonly capDir=new Vector3(); private readonly zAxis=new Vector3(0,0,1);
  constructor(private readonly scene: Scene, private readonly shared: Record<string, { value: unknown }>, private readonly glow: GlowQuads) {
    for (let i=0;i<6;i++) {
      const shape = glyphShape(i); const geometry = new ExtrudeGeometry(shape, { depth: 0.42, bevelEnabled: true, bevelThickness: 0.18, bevelSize: 0.12, bevelSegments: 2 }).toNonIndexed(); geometry.computeVertexNormals(); geometry.translate(0,0,-0.21); geometry.computeBoundingSphere(); const radius=geometry.boundingSphere!.radius; this.radii.push(radius); if(i<5)this.tables.push(buildChordTable(shape,radius)); geometry.scale(1 / radius, 1 / radius, 1 / radius);
      const attrs: Record<string, InstancedBufferAttribute> = {};
      for (const name of ["aColor","aCore","aDark","aFlash","aCrack","aFade","aKind","aCut"]) { const attr = new InstancedBufferAttribute(new Float32Array(CAP * (name === "aCut" ? 4 : name === "aColor" || name === "aCore" || name === "aDark" ? 3 : 1)), name === "aCut" ? 4 : name === "aColor" || name === "aCore" || name === "aDark" ? 3 : 1); attr.setUsage(DynamicDrawUsage); geometry.setAttribute(name,attr); attrs[name]=attr; }
      const mesh = new InstancedMesh(geometry, new ShaderMaterial({uniforms: {...shared, uOutline: { value: new Color(CRYSTAL_EDGE.outline) }}, vertexShader: shader.vertex, fragmentShader: shader.fragment, transparent: true, depthWrite: false, side: DoubleSide}), CAP); mesh.instanceMatrix.setUsage(DynamicDrawUsage); mesh.frustumCulled=false; mesh.count=0; mesh.renderOrder=10; this.meshes.push(mesh); this.attrs.push(attrs); scene.add(mesh);
    }
    this.caps=new CutCaps(scene,this.radii);
  }
  private readonly ghosts: Visual[] = Array.from({length: MAX_CRYSTALS}, () => ({id:0, crystal: {id:0,alive:false,kind:"normal",note:0,rho:0,theta:0,r:0,speed:0,swirl:0,shell:false,prismMs:0,pushMs:0,ageMs:0,x:0,y:0}, flash:0,pending:0,duration:0,choir:false,shellFlash:0,note:0,previousNote:0,blend:1,trailX:new Float32Array(6),trailY:new Float32Array(6)}));
  onBurst: (x:number,y:number,note:number,choir:boolean) => void = () => {};
  event(event: SimEvent): void {
    // SG§5 f0 and f10–f24: keep removed targets visible until their scheduled burst.
    if (event.type === "strike" || event.type === "choir") {
      const items = event.type === "strike" ? event.shattered : event.swept;
      const delay = event.type === "choir" ? 160 : event.n >= 7 ? 160 + (event.closeCount ? 20 : 0) : Math.min(180,30+14*event.n+(event.closeCount?20:0));
      for (const item of items) {
        let ghost = this.ghosts.find(g => g.id === 0);
        if (!ghost) ghost = this.ghosts[0]!;
        const source = this.visual.find(v => v.id === item.id);
        if (!source) continue;
        Object.assign(ghost.crystal,source.crystal); ghost.id=item.id; ghost.note=item.note; ghost.previousNote=item.note; ghost.blend=1;
        ghost.choir=event.type === "choir" || event.n>=7; ghost.duration=delay+(event.type === "choir" ? item.dist/5*220 : 0); ghost.pending=ghost.duration; ghost.flash=50;
      }
    }
    if (event.type === "shellBreak") for (const v of this.visual) if (v.id === event.id) v.shellFlash=120;
  }
  reset(): void { this.caps.reset(); this.halves.reset(); for (const v of this.visual) { v.id=0; v.flash=0; v.shellFlash=0; } for (const v of this.ghosts) v.id=0; }
  update(state: SimState, dt: number, time: number, realDt: number, reducedMotion: boolean): void {
    this.caps.reset(); this.counts.fill(0);
    for (let slot=0;slot<state.crystals.length+this.ghosts.length;slot++) {
      const ghost=slot>=state.crystals.length; const v=ghost ? this.ghosts[slot-state.crystals.length]! : this.visual[slot]!; const c=ghost ? v.crystal : state.crystals[slot]!;
      if (ghost) { if (!v.id) continue; v.pending-=realDt; if(v.pending<=0){this.onBurst(c.x,c.y,c.note,v.choir);v.id=0;continue;} c.alive=false; }
      if (c.alive && c.id !== v.id) { v.id=c.id; Object.assign(v.crystal,c); v.note=c.note; v.previousNote=c.note; v.blend=1; v.flash=0; v.shellFlash=0; v.trailX.fill(c.x); v.trailY.fill(c.y); }
      if (c.alive) { if (c.note !== v.note) { v.previousNote=v.note; v.note=c.note; v.blend=0; } v.blend=Math.min(1,v.blend+dt/150); Object.assign(v.crystal,c); if (c.kind === "rusher") { for (let j=5;j>0;j--) { v.trailX[j]=v.trailX[j-1]!; v.trailY[j]=v.trailY[j-1]!; } v.trailX[0]=c.x; v.trailY[0]=c.y; } }
      const draw=c.alive ? c : ghost ? v.crystal : null; if (!draw) continue;
      const note=draw.kind === "dark" ? 5 : draw.note; const mesh=this.meshes[note]!; const attr=this.attrs[note]!; const spin=(0.6+(draw.id%61)/100)*(draw.id%2 ? 1 : -1); const age=draw.ageMs/1000; const scale=draw.r*crystalVisualScale(draw.rho)*(draw.kind === 'golden' ? TITLE_FX.goldenScale : 1)*easeOutBack(Math.min(1,draw.ageMs/280),1.7); const fade=Math.min(1,draw.ageMs/280);
      this.color.copy(note===5?this.shadow:colors[draw.kind === "prism" ? v.previousNote : note]!).lerp(note===5?this.shadow:colors[note]!,draw.kind === "prism" ? v.blend : 1); this.core.copy(note===5?this.gold:cores[note]!).multiplyScalar(note === 0 || note === 3 || note === 4 ? 1.8 : 1.7); this.dark.copy(note===5?this.shadow:darks[note]!); if(draw.rho<4.5) this.core.multiplyScalar(1+0.35*Math.sin(time*6*Math.PI));
      const index=this.counts[note]!; this.counts[note]=index+1; this.object.position.set(draw.x,draw.y,0.6+0.08*Math.sin(age*2*Math.PI*0.7+draw.id)); this.object.rotation.set(0.384*Math.sin(age*2*Math.PI*0.7*(reducedMotion?.25:1)+draw.id),0.384*Math.cos(age*2*Math.PI*0.7*(reducedMotion?.25:1)+draw.id),age*spin); this.object.scale.setScalar(scale*(ghost ? 1.15 : v.shellFlash>60 ? .85 : 1)); this.object.updateMatrix(); mesh.setMatrixAt(index,this.object.matrix); attr.aColor!.setXYZ(index,this.color.r,this.color.g,this.color.b); attr.aCore!.setXYZ(index,this.core.r,this.core.g,this.core.b); attr.aDark!.setXYZ(index,this.dark.r,this.dark.g,this.dark.b); attr.aFlash!.setX(index,ghost ? (v.duration>=160 ? 1-.4*(1-v.pending/v.duration) : v.pending>v.duration-50 ? 1 : 0) : Math.min(1,v.shellFlash/50)); attr.aCrack!.setX(index,ghost ? 1-v.pending/v.duration : 0); attr.aFade!.setX(index,fade); attr.aCut!.setXYZW(index,0,0,0,0); attr.aKind!.setX(index,draw.kind === "geode" && !draw.shell ? 0 : kinds[draw.kind]);
      if(c.alive){const golden=draw.kind === 'golden'; const pool=golden?this.gold:this.color; this.glow.shadow(draw.x,draw.y,.01,CRYSTAL_EDGE.haloScale*scale,this.halo,CRYSTAL_EDGE.haloAlpha);if(this.glow.tier!=="low" || draw.rho<=CRYSTAL_GLOW.lowMaxRho){this.glow.disc(draw.x,draw.y,.02,CRYSTAL_GLOW.poolRadius*scale,pool,(golden?TITLE_FX.poolAlpha:CRYSTAL_EDGE.poolAlpha)*(draw.rho<4.5?1+.35*Math.sin(time*6*Math.PI):1));}if((this.shared.uHeat!.value as number)>=.5 && (this.glow.tier!=="low" || draw.rho<=CRYSTAL_GLOW.lowMaxRho))this.glow.ring(draw.x,draw.y,.4,1.05*scale,this.core,.15*(this.shared.uHeat!.value as number));if(golden){this.glow.arc(draw.x,draw.y,.4,TITLE_FX.orbitRadius*scale,time*2,this.gold,.7);for(let k=0;k<TITLE_FX.sparkles;k++){const a=time*2+k*Math.PI*2/TITLE_FX.sparkles;this.glow.disc(draw.x+Math.cos(a)*TITLE_FX.orbitRadius*scale,draw.y+Math.sin(a)*TITLE_FX.orbitRadius*scale,.5,.18*scale,this.gold,.9);}}if(draw.kind==='mend')this.glow.ring(draw.x,draw.y,.4,1.25*scale,this.gold,.7*(1+.08*Math.sin(time*3*Math.PI)));const length=1.2*scale*draw.speed*(draw.kind==='rusher'?2.5:1);this.glow.streak(draw.x,draw.y,draw.x+Math.cos(draw.theta)*length,draw.y+Math.sin(draw.theta)*length,.1,.7*scale,this.color,draw.kind==='rusher'?.6:.35);}
      v.flash=Math.max(0,v.flash-realDt); v.shellFlash=Math.max(0,v.shellFlash-realDt);
    }
    for(let i=0;i<6;i++){const mesh=this.meshes[i]!; mesh.count=this.counts[i]!; mesh.visible=mesh.count>0; mesh.instanceMatrix.needsUpdate=true; const a=this.attrs[i]!; a.aColor!.needsUpdate=true; a.aCore!.needsUpdate=true; a.aDark!.needsUpdate=true; a.aFlash!.needsUpdate=true; a.aCrack!.needsUpdate=true; a.aFade!.needsUpdate=true; a.aKind!.needsUpdate=true; a.aCut!.needsUpdate=true;}
  }
  private halves = new HalfPool();
  cut(e: Extract<SliceEvent,{type:'cut'}>, aspect:number):{x0:number;y0:number;x1:number;y1:number} {
    const nx=-e.dirY, ny=e.dirX, co=Math.cos(e.angle), si=Math.sin(e.angle);
    const localX=nx*co+ny*si, localY=-nx*si+ny*co;
    const impulse=3*Math.min(e.speed,3)/3;
    const chord=chordFor(this.tables[e.note]!, -localY,localX);
    for(const side of [-1,1]) Object.assign(this.halves.add(),{x:(e.x-aspect/2)*10,y:(e.y-.5)*10,vx:e.vx*10+side*nx*4.5+e.dirX*impulse,vy:e.vy*10+side*ny*4.5+e.dirY*impulse,angle:e.angle,spin:side*(4+(e.id%5)),note:e.note,nx:localX*side,ny:localY*side,ax:-localY*side,ay:localX*side,mid:-side*chord.mid,half:chord.half,age:0});
    const x=(e.x-aspect/2)*10,y=(e.y-.5)*10, scale=SLICE_TOSS.radius*10; return {x0:x+e.dirX*(chord.mid-chord.half)*scale,y0:y+e.dirY*(chord.mid-chord.half)*scale,x1:x+e.dirX*(chord.mid+chord.half)*scale,y1:y+e.dirY*(chord.mid+chord.half)*scale};
  }
  updateSlice(crystals:readonly SliceCrystal[], aspect:number, dt:number, gravity:number, reduced:boolean):void {
    this.counts.fill(0); this.caps.begin();
    const draw=(note:number,x:number,y:number,angle:number,scale:number,fade:number,nx:number,ny:number,cut:boolean, h?:Half):void=>{
      const index=this.counts[note]!;this.counts[note]=index+1; const mesh=this.meshes[note]!, a=this.attrs[note]!; const c=note===5?this.shadow:colors[note]!, core=note===5?this.gold:cores[note]!;
      this.object.position.set(x,y,0);this.spinQ.setFromAxisAngle(this.zAxis,angle); if(h){this.axis.set(h.ax,h.ay,0);this.tumbleQ.setFromAxisAngle(this.axis,tumbleAngle(h.age,reduced));this.object.quaternion.copy(this.spinQ).multiply(this.tumbleQ);}else this.object.quaternion.copy(this.spinQ);this.object.scale.setScalar(scale);this.object.updateMatrix();mesh.setMatrixAt(index,this.object.matrix);
      a.aColor!.setXYZ(index,c.r,c.g,c.b);a.aCore!.setXYZ(index,core.r,core.g,core.b);const dark=note===5?this.shadow:CAP_COOL[note]!;a.aDark!.setXYZ(index,dark.r,dark.g,dark.b);a.aFlash!.setX(index,0);a.aCrack!.setX(index,0);a.aFade!.setX(index,fade);a.aKind!.setX(index,note===5?1:0);a.aCut!.setXYZW(index,nx,ny,0,cut?1:0);if(h){this.capNormal.set(-nx,-ny,0);this.capDir.set(ny,-nx,0);this.caps.push(this.object.matrix,this.capNormal,this.capDir,h.mid,h.half,note,h.age,fade);}
    };
    for(const c of crystals)if(c.alive)draw(c.kind==='dark'?5:c.note,(c.x-aspect/2)*10,(c.y-.5)*10,c.angle,c.r*10,1,0,0,false);
    for(const h of this.halves.slots){if(h.age>=900)continue;h.age+=dt;if(h.age>=900)continue;const seconds=dt/1000;h.x+=h.vx*seconds;h.y+=h.vy*seconds;h.vy-=1.2*gravity*10*seconds;h.angle+=h.spin*seconds;draw(h.note,h.x,h.y,h.angle,halfScale(h.age),Math.min(1,(900-h.age)/250),h.nx,h.ny,true,h);}
    this.caps.end(); for(let i=0;i<6;i++){const mesh=this.meshes[i]!,a=this.attrs[i]!;mesh.count=this.counts[i]!;mesh.visible=mesh.count>0;mesh.instanceMatrix.needsUpdate=true;for(const attr of Object.values(a))attr.needsUpdate=true;}
  }
  setTier(t:Tier):void {this.caps.setTier(t);}
  dispose(): void { this.caps.dispose(); for(const mesh of this.meshes){this.scene.remove(mesh);mesh.geometry.dispose();(mesh.material as ShaderMaterial).dispose();} }
}
