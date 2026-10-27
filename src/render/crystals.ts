import { crystalVisualScale, CRYSTAL_GLOW, PALETTE } from './fxConfig';
import { Color, DoubleSide, DynamicDrawUsage, ExtrudeGeometry, InstancedBufferAttribute, InstancedMesh, Object3D, Scene, ShaderMaterial } from "three";
import { easeOutBack } from "../core/ease";
import { MAX_CRYSTALS } from "../sim/config";
import type { Crystal, SimEvent, SimState } from "../sim/types";
import { glyphShape } from "./glyphs";
import { NOTE_COLORS } from "./fxConfig";
import { GlowQuads } from './glowQuads';
import * as shader from "./shaders/crystal";

const CAP = MAX_CRYSTALS * 2;
const cores = [0xffb3c0,0xffe8a8,0xb8ffe2,0xc2e2ff,0xebd3ff].map(c => new Color(c));
const darks = [0x7a1230,0x7a4a06,0x0b5a3e,0x103c7a,0x46177a].map(c => new Color(c));
const colors = NOTE_COLORS.map(c => new Color(c));
const kinds = { normal: 0, geode: 1, prism: 2, splitter: 3, rusher: 4, mend: 5, golden: 6 } as const;
type Visual = { id: number; crystal: Crystal; flash: number; pending: number; duration: number; choir: boolean; shellFlash: number; note: number; previousNote: number; blend: number; trailX: Float32Array; trailY: Float32Array };
export class Crystals {
  private readonly meshes: InstancedMesh[] = []; private readonly attrs: Record<string, InstancedBufferAttribute>[] = []; private readonly visual: Visual[] = Array.from({length: MAX_CRYSTALS}, () => ({id: 0, crystal: {id:0,alive:false,kind:'normal',note:0,rho:0,theta:0,r:0,speed:0,swirl:0,shell:false,prismMs:0,pushMs:0,ageMs:0,x:0,y:0}, flash: 0, pending: 0, duration: 0, choir: false, shellFlash: 0, note: 0, previousNote: 0, blend: 1, trailX: new Float32Array(6), trailY: new Float32Array(6)}));
  private readonly object = new Object3D(); private readonly color = new Color(); private readonly core = new Color(); private readonly dark = new Color(); private readonly counts = new Int32Array(5); private readonly gold = new Color(0xffd27a); private readonly shadow = new Color(PALETTE.void0);
  constructor(private readonly scene: Scene, private readonly shared: Record<string, { value: unknown }>, private readonly glow: GlowQuads) {
    for (let i=0;i<5;i++) {
      const geometry = new ExtrudeGeometry(glyphShape(i), { depth: 0.42, bevelEnabled: true, bevelThickness: 0.18, bevelSize: 0.12, bevelSegments: 2 }).toNonIndexed(); geometry.computeVertexNormals(); geometry.translate(0,0,-0.21); geometry.computeBoundingSphere(); geometry.scale(1 / geometry.boundingSphere!.radius, 1 / geometry.boundingSphere!.radius, 1);
      const attrs: Record<string, InstancedBufferAttribute> = {};
      for (const name of ["aColor","aCore","aDark","aFlash","aCrack","aFade","aKind"]) { const attr = new InstancedBufferAttribute(new Float32Array(CAP * (name === "aColor" || name === "aCore" || name === "aDark" ? 3 : 1)), name === "aColor" || name === "aCore" || name === "aDark" ? 3 : 1); attr.setUsage(DynamicDrawUsage); geometry.setAttribute(name,attr); attrs[name]=attr; }
      const mesh = new InstancedMesh(geometry, new ShaderMaterial({uniforms: {...shared}, vertexShader: shader.vertex, fragmentShader: shader.fragment, transparent: true, depthWrite: false, side: DoubleSide}), CAP); mesh.instanceMatrix.setUsage(DynamicDrawUsage); mesh.frustumCulled=false; mesh.count=0; mesh.renderOrder=10; this.meshes.push(mesh); this.attrs.push(attrs); scene.add(mesh);
    }

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
  reset(): void { for (const v of this.visual) { v.id=0; v.flash=0; v.shellFlash=0; } for (const v of this.ghosts) v.id=0; }
  update(state: SimState, dt: number, time: number, realDt: number, reducedMotion: boolean): void {
    this.counts.fill(0);
    for (let slot=0;slot<state.crystals.length+this.ghosts.length;slot++) {
      const ghost=slot>=state.crystals.length; const v=ghost ? this.ghosts[slot-state.crystals.length]! : this.visual[slot]!; const c=ghost ? v.crystal : state.crystals[slot]!;
      if (ghost) { if (!v.id) continue; v.pending-=realDt; if(v.pending<=0){this.onBurst(c.x,c.y,c.note,v.choir);v.id=0;continue;} c.alive=false; }
      if (c.alive && c.id !== v.id) { v.id=c.id; Object.assign(v.crystal,c); v.note=c.note; v.previousNote=c.note; v.blend=1; v.flash=0; v.shellFlash=0; v.trailX.fill(c.x); v.trailY.fill(c.y); }
      if (c.alive) { if (c.note !== v.note) { v.previousNote=v.note; v.note=c.note; v.blend=0; } v.blend=Math.min(1,v.blend+dt/150); Object.assign(v.crystal,c); if (c.kind === "rusher") { for (let j=5;j>0;j--) { v.trailX[j]=v.trailX[j-1]!; v.trailY[j]=v.trailY[j-1]!; } v.trailX[0]=c.x; v.trailY[0]=c.y; } }
      const draw=c.alive ? c : ghost ? v.crystal : null; if (!draw) continue;
      const note=draw.note; const mesh=this.meshes[note]!; const attr=this.attrs[note]!; const spin=(0.6+(draw.id%61)/100)*(draw.id%2 ? 1 : -1); const age=draw.ageMs/1000; const scale=draw.r*crystalVisualScale(draw.rho)*easeOutBack(Math.min(1,draw.ageMs/280),1.7); const fade=Math.min(1,draw.ageMs/280);
      this.color.copy(colors[draw.kind === "prism" ? v.previousNote : note]!).lerp(colors[note]!,draw.kind === "prism" ? v.blend : 1); this.core.copy(cores[note]!).multiplyScalar(note === 0 || note === 3 || note === 4 ? 1.8 : 1.7); this.dark.copy(darks[note]!); if(draw.rho<4.5) this.core.multiplyScalar(1+0.35*Math.sin(time*6*Math.PI));
      const index=this.counts[note]!; this.counts[note]=index+1; this.object.position.set(draw.x,draw.y,0.6+0.08*Math.sin(age*2*Math.PI*0.7+draw.id)); this.object.rotation.set(0.384*Math.sin(age*2*Math.PI*0.7*(reducedMotion?.25:1)+draw.id),0.384*Math.cos(age*2*Math.PI*0.7*(reducedMotion?.25:1)+draw.id),age*spin); this.object.scale.setScalar(scale*(ghost ? 1.15 : v.shellFlash>60 ? .85 : 1)); this.object.updateMatrix(); mesh.setMatrixAt(index,this.object.matrix); attr.aColor!.setXYZ(index,this.color.r,this.color.g,this.color.b); attr.aCore!.setXYZ(index,this.core.r,this.core.g,this.core.b); attr.aDark!.setXYZ(index,this.dark.r,this.dark.g,this.dark.b); attr.aFlash!.setX(index,ghost ? (v.duration>=160 ? 1-.4*(1-v.pending/v.duration) : v.pending>v.duration-50 ? 1 : 0) : Math.min(1,v.shellFlash/50)); attr.aCrack!.setX(index,ghost ? 1-v.pending/v.duration : 0); attr.aFade!.setX(index,fade); attr.aKind!.setX(index,draw.kind === "geode" && !draw.shell ? 0 : kinds[draw.kind]);
      if(c.alive){const golden=draw.kind === 'golden'; const pool=golden?this.gold:this.color; this.glow.shadow(draw.x,draw.y,.01,CRYSTAL_GLOW.shadowRadius*scale,this.shadow,CRYSTAL_GLOW.shadowAlpha);if(this.glow.tier!=="low" || draw.rho<=CRYSTAL_GLOW.lowMaxRho){this.glow.disc(draw.x,draw.y,.02,CRYSTAL_GLOW.poolRadius*scale,pool,(golden?.45:.36)*(draw.rho<4.5?1+.35*Math.sin(time*6*Math.PI):1));}if((this.shared.uHeat!.value as number)>=.5 && (this.glow.tier!=="low" || draw.rho<=CRYSTAL_GLOW.lowMaxRho))this.glow.ring(draw.x,draw.y,.4,1.05*scale,this.gold,.30*(this.shared.uHeat!.value as number));if(draw.kind==='mend')this.glow.ring(draw.x,draw.y,.4,1.25*scale,this.gold,.7*(1+.08*Math.sin(time*3*Math.PI)));const length=1.2*scale*draw.speed*(draw.kind==='rusher'?2.5:1);this.glow.streak(draw.x,draw.y,draw.x+Math.cos(draw.theta)*length,draw.y+Math.sin(draw.theta)*length,.1,.7*scale,this.color,draw.kind==='rusher'?.6:.35);}
      v.flash=Math.max(0,v.flash-realDt); v.shellFlash=Math.max(0,v.shellFlash-realDt);
    }
    for(let i=0;i<5;i++){const mesh=this.meshes[i]!; mesh.count=this.counts[i]!; mesh.visible=mesh.count>0; mesh.instanceMatrix.needsUpdate=true; const a=this.attrs[i]!; a.aColor!.needsUpdate=true; a.aCore!.needsUpdate=true; a.aDark!.needsUpdate=true; a.aFlash!.needsUpdate=true; a.aCrack!.needsUpdate=true; a.aFade!.needsUpdate=true; a.aKind!.needsUpdate=true;}
  }
  dispose(): void { for(const mesh of this.meshes){this.scene.remove(mesh);mesh.geometry.dispose();(mesh.material as ShaderMaterial).dispose();} }
}
