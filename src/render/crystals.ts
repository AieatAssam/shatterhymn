import { AdditiveBlending, Color, DoubleSide, DynamicDrawUsage, ExtrudeGeometry, InstancedBufferAttribute, InstancedMesh, MeshBasicMaterial, Object3D, RingGeometry, Scene, ShaderMaterial } from "three";
import { easeOutBack } from "../core/ease";
import { MAX_CRYSTALS } from "../sim/config";
import type { Crystal, SimEvent, SimState } from "../sim/types";
import { glyphShape } from "./glyphs";
import { NOTE_COLORS } from "./fxConfig";
import * as shader from "./shaders/crystal";

const CAP = MAX_CRYSTALS * 7;
const cores = [0xffb3c0,0xffe8a8,0xb8ffe2,0xc2e2ff,0xebd3ff].map(c => new Color(c));
const darks = [0x7a1230,0x7a4a06,0x0b5a3e,0x103c7a,0x46177a].map(c => new Color(c));
const colors = NOTE_COLORS.map(c => new Color(c));
const kinds = { normal: 0, geode: 1, prism: 2, splitter: 3, rusher: 4, mend: 5 } as const;
type Visual = { id: number; crystal: Crystal; flash: number; shellFlash: number; note: number; previousNote: number; blend: number; trailX: Float32Array; trailY: Float32Array };
export class Crystals {
  private readonly meshes: InstancedMesh[] = []; private readonly attrs: Record<string, InstancedBufferAttribute>[] = []; private readonly visual: Visual[] = Array.from({length: MAX_CRYSTALS}, () => ({id: 0, crystal: {id:0,alive:false,kind:'normal',note:0,rho:0,theta:0,r:0,speed:0,swirl:0,shell:false,prismMs:0,pushMs:0,ageMs:0,x:0,y:0}, flash: 0, shellFlash: 0, note: 0, previousNote: 0, blend: 1, trailX: new Float32Array(6), trailY: new Float32Array(6)}));
  private readonly object = new Object3D(); private readonly color = new Color(); private readonly core = new Color(); private readonly dark = new Color(); private readonly counts = new Int32Array(5); private readonly rings: InstancedMesh;
  constructor(private readonly scene: Scene, shared: Record<string, { value: unknown }>) {
    for (let i=0;i<5;i++) {
      const geometry = new ExtrudeGeometry(glyphShape(i), { depth: 0.30, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.10, bevelSegments: 1 }).toNonIndexed(); geometry.computeVertexNormals(); geometry.translate(0,0,-0.15); geometry.computeBoundingSphere(); geometry.scale(1 / geometry.boundingSphere!.radius, 1 / geometry.boundingSphere!.radius, 1);
      const attrs: Record<string, InstancedBufferAttribute> = {};
      for (const name of ["aColor","aCore","aDark","aFlash","aCrack","aFade","aKind"]) { const attr = new InstancedBufferAttribute(new Float32Array(CAP * (name === "aColor" || name === "aCore" || name === "aDark" ? 3 : 1)), name === "aColor" || name === "aCore" || name === "aDark" ? 3 : 1); attr.setUsage(DynamicDrawUsage); geometry.setAttribute(name,attr); attrs[name]=attr; }
      const mesh = new InstancedMesh(geometry, new ShaderMaterial({uniforms: {...shared}, vertexShader: shader.vertex, fragmentShader: shader.fragment, transparent: true, depthWrite: false, side: DoubleSide}), CAP); mesh.instanceMatrix.setUsage(DynamicDrawUsage); mesh.frustumCulled=false; mesh.count=0; this.meshes.push(mesh); this.attrs.push(attrs); scene.add(mesh);
    }
    this.rings = new InstancedMesh(new RingGeometry(1.15,1.23,32), new MeshBasicMaterial({color: 0xffd27a, transparent: true, opacity: 0.7, blending: AdditiveBlending, depthWrite: false, side: DoubleSide}), MAX_CRYSTALS); this.rings.instanceMatrix.setUsage(DynamicDrawUsage); this.rings.frustumCulled=false; this.rings.count=0; scene.add(this.rings);
  }
  event(event: SimEvent): void {
    if (event.type === "strike" || event.type === "choir") { const items = event.type === "strike" ? event.shattered : event.swept; for (const item of items) for (const v of this.visual) if (v.id === item.id) v.flash=50; }
    if (event.type === "shellBreak") for (const v of this.visual) if (v.id === event.id) v.shellFlash=120;
  }
  reset(): void { for (const v of this.visual) { v.id=0; v.flash=0; v.shellFlash=0; } }
  update(state: SimState, dt: number, time: number): void {
    this.counts.fill(0); let ringCount=0;
    for (let slot=0;slot<state.crystals.length;slot++) {
      const c=state.crystals[slot]!; const v=this.visual[slot]!;
      if (c.alive && c.id !== v.id) { v.id=c.id; Object.assign(v.crystal,c); v.note=c.note; v.previousNote=c.note; v.blend=1; v.flash=0; v.shellFlash=0; v.trailX.fill(c.x); v.trailY.fill(c.y); }
      if (c.alive) { if (c.note !== v.note) { v.previousNote=v.note; v.note=c.note; v.blend=0; } v.blend=Math.min(1,v.blend+dt/150); Object.assign(v.crystal,c); if (c.kind === "rusher") { for (let j=5;j>0;j--) { v.trailX[j]=v.trailX[j-1]!; v.trailY[j]=v.trailY[j-1]!; } v.trailX[0]=c.x; v.trailY[0]=c.y; } }
      const draw=c.alive ? c : v.flash>0 ? v.crystal : null; if (!draw) continue;
      const note=draw.note; const mesh=this.meshes[note]!; const attr=this.attrs[note]!; const spin=(0.6+(draw.id%61)/100)*(draw.id%2 ? 1 : -1); const age=draw.ageMs/1000; const scale=draw.r*easeOutBack(Math.min(1,draw.ageMs/280),1.7); const fade=Math.min(1,draw.ageMs/280);
      this.color.copy(colors[draw.kind === "prism" ? v.previousNote : note]!).lerp(colors[note]!,draw.kind === "prism" ? v.blend : 1); this.core.copy(cores[note]!).multiplyScalar(note === 0 || note === 3 || note === 4 ? 1.8 : 1.7); this.dark.copy(darks[note]!); if(draw.rho<4.5) this.core.multiplyScalar(1+0.35*Math.sin(time*6*Math.PI));
      const copies=draw.kind === "rusher" && c.alive ? 7 : 1;
      for(let j=0;j<copies;j++) { const index=this.counts[note]!; this.counts[note]=index+1; this.object.position.set(j === 0 ? draw.x : v.trailX[j-1]!,j === 0 ? draw.y : v.trailY[j-1]!,0.6+0.08*Math.sin(age*2*Math.PI*0.7+draw.id)); this.object.rotation.set(0.20944*Math.sin(age*2*Math.PI*0.7+draw.id),0.20944*Math.cos(age*2*Math.PI*0.7+draw.id),age*spin); this.object.scale.setScalar(scale); this.object.updateMatrix(); mesh.setMatrixAt(index,this.object.matrix); attr.aColor!.setXYZ(index,this.color.r,this.color.g,this.color.b); attr.aCore!.setXYZ(index,this.core.r,this.core.g,this.core.b); attr.aDark!.setXYZ(index,this.dark.r,this.dark.g,this.dark.b); attr.aFlash!.setX(index,v.flash>0 ? 1 : Math.min(1,v.shellFlash/50)); attr.aCrack!.setX(index,0); attr.aFade!.setX(index,fade*(j===0?1:(7-j)/9)); attr.aKind!.setX(index,draw.kind === "geode" && !draw.shell ? 0 : kinds[draw.kind]); }
      if(draw.kind === "mend") { this.object.position.set(draw.x,draw.y,0.4); this.object.rotation.set(0,0,0); this.object.scale.setScalar(draw.r*(1+0.08*Math.sin(time*3*Math.PI))); this.object.updateMatrix(); this.rings.setMatrixAt(ringCount++,this.object.matrix); }
      v.flash=Math.max(0,v.flash-dt); v.shellFlash=Math.max(0,v.shellFlash-dt);
    }
    for(let i=0;i<5;i++){const mesh=this.meshes[i]!; mesh.count=this.counts[i]!; mesh.instanceMatrix.needsUpdate=true; const a=this.attrs[i]!; a.aColor!.needsUpdate=true; a.aCore!.needsUpdate=true; a.aDark!.needsUpdate=true; a.aFlash!.needsUpdate=true; a.aCrack!.needsUpdate=true; a.aFade!.needsUpdate=true; a.aKind!.needsUpdate=true;} this.rings.count=ringCount; this.rings.instanceMatrix.needsUpdate=true;
  }
  dispose(): void { for(const mesh of this.meshes){this.scene.remove(mesh);mesh.geometry.dispose();(mesh.material as ShaderMaterial).dispose();} this.scene.remove(this.rings);this.rings.geometry.dispose();(this.rings.material as MeshBasicMaterial).dispose(); }
}
