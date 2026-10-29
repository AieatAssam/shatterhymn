import { Color, IcosahedronGeometry, Mesh, HalfFloatType, NoToneMapping, PerspectiveCamera, Plane, Raycaster, Scene, ShaderMaterial, SRGBColorSpace, Vector2, Vector3, Vector4, WebGLRenderer } from "three";
import { BloomEffect, ChromaticAberrationEffect, EffectComposer, EffectPass, NoiseEffect, RenderPass, ToneMappingEffect, ToneMappingMode, VignetteEffect } from "postprocessing";
import type { Loop } from "../core/loop";
import { BladeRibbon } from './blade';
import type { SliceState } from '../sim/sliceSim';
import type { SliceEvent } from '../sim/sliceTypes';
import { SLICE_TOSS } from '../sim/sliceConfig';
import { Face } from "./face";
import { Shards } from "./shards";
import { Motes } from "./motes";
import { Sparks } from "./sparks";
import { Rings } from "./rings";
import { Threads } from "./threads";
import { Juice, freezeMsForStrike, shaftsForStrike } from "./juice";
import { Spring1D } from "../core/spring";
import type { SimEvent, SimState } from "../sim/types";
import { GlowQuads } from './glowQuads';
import { Crystals } from "./crystals";
import { createBackground, bakeBackground, createBackgroundTarget } from "./background";
import { createBell, createHalo } from "./bell";
import { fitCamera, fitSliceCamera } from "./camera";
import { BELL_IDLE_GLOW, BELL_SCALE, BLOOM, BOARD, SHATTER, TELL_FX, crystalVisualScale, CAMERA_FOV, CA_MODULATION, CA_OFFSET, KEY_DIR, NOISE_OPACITY, NOTE_COLORS, PALETTE, RESIZE_DEBOUNCE_MS, LEVEL_SWEEP_MS, VIGNETTE } from "./fxConfig";
import { createFloor } from "./floor";
import { AutoTier, detectTier, TIERS, LOW_SUB, type Tier } from "./quality";
export function setPostTier(mainPass: EffectPass, post: EffectPass, tier: Tier): void {
  const wantPost = tier === "high";
  post.enabled = wantPost; post.renderToScreen = wantPost; mainPass.renderToScreen = !wantPost;
}
class TierBloomEffect extends BloomEffect {
  scale: number = BLOOM.resolutionScale;
  override setSize(width: number, height: number): void {
    super.setSize(width, height);
    this.mipmapBlurPass.setSize(Math.max(1, Math.round(width * this.scale)), Math.max(1, Math.round(height * this.scale)));
  }
}
export class GameRenderer {
  private readonly backgroundTarget = createBackgroundTarget(); private appliedLowSub = false; private readonly renderer: WebGLRenderer; private readonly composer: EffectComposer; private readonly scene = new Scene(); private readonly camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 1000);
  private readonly bloom = new TierBloomEffect(BLOOM); private readonly post: EffectPass; private readonly mainPass: EffectPass; private readonly quality: AutoTier; private tier: Tier; private resizeTimer: number | undefined; private time = 0; private lastFrameTime: number | null = null;
  private readonly tint = [new Spring1D(0,6,1), new Spring1D(0,6,1), new Spring1D(0,6,1)];
  private readonly glow: GlowQuads; private readonly crystals: Crystals; private tintStart=-10; private tintPeak=0; private tintInitial=0; private tintDuration=.22; private tintAttack=0; private shaftCursor=0; private strikeTime=-10; private readonly bursts: {x:number;y:number;note:number;scale:number;start:number}[]=[]; private rose=0; private warnUntil=0; private warnAngle=0; private warnNote=0; private closeFlash=0; private chordIds:number[]=[]; private chordNote=0; private readonly sparks: Sparks; private readonly shards: Shards; private readonly rings: Rings; private readonly threads: Threads; private readonly juice: Juice; private readonly caEffect: ChromaticAberrationEffect; private readonly feverFrame: HTMLDivElement; private readonly flashOverlay: HTMLDivElement; private readonly choirText: HTMLDivElement; private choirTextDelay=160; private gameOverBurst = -1; private reducedMotion = false; private gestured=false;
  private readonly closeBursts: {x:number;y:number;scale:number;start:number}[]=[]; private readonly goldColor=new Color(PALETTE.mend); private readonly projection = new Vector3(); private readonly strikeBursts: {x:number;y:number;note:number;start:number}[] = []; private lastFlash=-10; private flashStart=-10; private flashStrength=0;
  private readonly face = new Face(); private readonly bladeRibbon = new BladeRibbon(this.scene); private slice:SliceState|null=null; private sliceNote=0; private sliceChain=0; private sliceFlashes:{x:number;y:number;note:number;start:number;dx:number;dy:number}[]=[];
  private readonly motes = new Motes(this.scene);
  private readonly debug: HTMLDivElement | null;
  private debugElapsed = 0; private debugFrames = 0; private levelSweep = -1; private lastNote = 0;
  private readonly gems: Mesh[] = [];
  private readonly fringeColors = [0xff4060,0x40ff90,0x4f80ff].map(c => new Color(c));
  private readonly colors = NOTE_COLORS.map(c => new Color(c)); private readonly discColors = NOTE_COLORS.map(c => new Color(c).lerp(new Color(0xffffff), TELL_FX.discWhite));
  private readonly shared = { uTime: { value: 0 }, uHeat: { value: 0 }, uBeat: { value: 0 }, uKeyDir: { value: new Vector3(...KEY_DIR).normalize() }, uNoteColor: { value: new Color(NOTE_COLORS[0]) }, uNoteGlow: { value: 0 } };
  private readonly background = createBackground(this.shared); private readonly floor = createFloor(this.shared); private readonly halo = createHalo(this.shared); private readonly bell = createBell(this.shared);
  private readonly onResize = (): void => { window.clearTimeout(this.resizeTimer); this.resizeTimer = window.setTimeout(() => this.resize(), RESIZE_DEBOUNCE_MS); };
  constructor(canvas: HTMLCanvasElement, private readonly getState: () => SimState, loop: Loop) {
    this.juice = new Juice(loop); this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches; this.juice.reducedMotion=this.reducedMotion;
    this.feverFrame=document.createElement("div"); this.feverFrame.className="fever-frame"; Object.assign(this.feverFrame.style,{position:"fixed",inset:"0",pointerEvents:"none",zIndex:"4"});canvas.parentElement?.appendChild(this.feverFrame);
    this.flashOverlay=document.createElement("div"); Object.assign(this.flashOverlay.style,{position:"fixed",inset:"0",background:"white",pointerEvents:"none",opacity:"0",zIndex:"5"}); canvas.parentElement?.appendChild(this.flashOverlay);
    this.choirText=document.createElement("div"); Object.assign(this.choirText.style,{position:"fixed",left:"50%",top:"17%",transform:"translate(-50%, -50%)",pointerEvents:"none",textAlign:"center",color:"#ffd27a",textShadow:"0 0 18px #ffd27a",opacity:"0",zIndex:"6"}); canvas.parentElement?.appendChild(this.choirText);
    this.renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", stencil: false, depth: true, alpha: false });
    this.debug = new URLSearchParams(location.search).get("debug") === "1" ? document.createElement("div") : null;
    if (this.debug) { this.debug.className = "debug-overlay"; canvas.parentElement?.appendChild(this.debug); this.renderer.info.autoReset = false; }
    this.renderer.outputColorSpace = SRGBColorSpace; this.renderer.toneMapping = NoToneMapping; this.renderer.setClearColor(PALETTE.void0);
    this.scene.add(this.background, this.floor, this.halo, this.bell, this.face.mesh);
    for(let i=0;i<5;i++){const gem=new Mesh(new IcosahedronGeometry(.12,0),new ShaderMaterial({vertexShader:`varying vec3 n; void main(){n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 n; void main(){float f=floor((.25+.75*max(dot(normalize(n),normalize(vec3(-.35,.55,.76))),0.))*4.)/4.;gl_FragColor=vec4(vec3(1.,.63,.2)*(1.+f*2.),1.);}`}));gem.visible=false;this.scene.add(gem);this.gems.push(gem);}
    this.bell.renderOrder=5; this.glow=new GlowQuads(this.scene); this.crystals = new Crystals(this.scene, this.shared, this.glow); this.sparks=new Sparks(this.scene); this.shards=new Shards(this.scene,this.sparks,this.shared); this.shards.reducedMotion=this.reducedMotion; this.rings=new Rings(this.scene); this.threads=new Threads(this.scene);
    this.crystals.onBurst=(x,y,note,choir)=>this.shards.burst(x,y,note,choir?8:0);
    this.composer = new EffectComposer(this.renderer, { frameBufferType: HalfFloatType });
    const noise = new NoiseEffect({ premultiply: true }); noise.blendMode.opacity.value = NOISE_OPACITY;
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.mainPass = new EffectPass(this.camera, this.bloom, new VignetteEffect(VIGNETTE), new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }), noise); this.composer.addPass(this.mainPass);
    this.caEffect = new ChromaticAberrationEffect({ offset: new Vector2(CA_OFFSET, CA_OFFSET), radialModulation: true, modulationOffset: CA_MODULATION }); this.post = new EffectPass(this.camera, this.caEffect); this.composer.addPass(this.post);
    const gl = this.renderer.getContext(); const debugInfo = gl.getExtension("WEBGL_debug_renderer_info"); const software = debugInfo && /SwiftShader|llvmpipe|softpipe|Software/i.test(String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)));
    this.tier = software ? "low" : detectTier(window.matchMedia("(pointer: coarse)").matches); this.quality = new AutoTier(this.tier); this.setTier(this.tier);
    window.addEventListener("resize", this.onResize); window.visualViewport?.addEventListener("resize", this.onResize);
  }
  event(event: SimEvent): boolean {
    if(event.type==='gameOver')this.face.trigger('dizzy'); else if(event.type==='crack')this.face.trigger('wince'); else if(event.type==='choir')this.face.trigger('delighted'); else if(event.type==='strike' && event.n>0)this.face.trigger(event.n>=4?'happy':'smile'); else if(event.type==='mend')this.face.trigger('relieved'); else if(event.type==='miss')this.face.trigger('worried');
    this.crystals.event(event); const previousFever=this.juice.feverEntered; this.juice.event(event); const entered=!previousFever && this.juice.feverEntered;
    if (event.type === "levelUp") this.levelSweep = 0;
    if(event.type === "chordWave"){this.chordIds=event.ids;this.chordNote=event.note;}
    if(event.type === "eventWarn" && event.kind === "chord") { (this.background.material as ShaderMaterial).uniforms.uWarnNote!.value=event.note; this.warnUntil=this.time+1; this.warnAngle=event.theta; (this.background.material as ShaderMaterial).uniforms.uWarnAngle!.value=event.theta; this.warnNote=event.note; }
    if(event.type === "strike" && event.n>0) { this.strikeTime=this.time; this.setBoardTint(event.note,event.n>=7?.45:event.n>=4?.34:event.n>=2?.26:.18,event.n>=7?.50:event.n>=4?.36:event.n>=2?.30:.26,0); if(entered)this.setBoardTint(event.note,.18,.40,.06); let cx=0,cy=0; for(const hit of event.shattered){cx+=hit.x;cy+=hit.y;} const count=event.shattered.length||1;cx/=count;cy/=count;this.strikeBursts.push({x:cx,y:cy,note:event.note,start:this.time});const bgStrike=(this.background.material as ShaderMaterial).uniforms;bgStrike.uStrikeNote!.value=event.note;bgStrike.uStrikeAge!.value=0;if(this.time-this.lastFlash>=SHATTER.flashInterval){this.lastFlash=this.flashStart=this.time;this.flashStrength=SHATTER.flashOpacity[event.n>=7?3:event.n>=4?2:event.n>=2?1:0]!*(this.reducedMotion?.5:1);const pos=this.project(cx,cy);this.flashOverlay.style.background=`radial-gradient(circle at ${pos.sx}px ${pos.sy}px, #${NOTE_COLORS[event.note]!.toString(16).padStart(6,"0")}, transparent 75%)`; } for(const hit of event.shattered) this.bursts.push({x:hit.x,y:hit.y,note:hit.note,scale:crystalVisualScale(Math.hypot(hit.x,hit.y)),start:this.time}); const bg=(this.background.material as ShaderMaterial).uniforms; const slots=bg.uShafts!.value as Vector4[]; const ladder=shaftsForStrike(event.n); const base=event.shattered[0]; for(let i=0;i<ladder.count;i++){const c=event.shattered[i];const angle=c?Math.atan2(c.y,c.x):Math.atan2(base?.y??0,base?.x??1)+i*Math.PI*2/ladder.count;slots[this.shaftCursor++%6]!.set(angle,this.time,ladder.strength,event.n>=7?-1:event.note);}for(const hit of event.shattered)if(hit.close){this.closeFlash=1;this.closeBursts.push({x:hit.x,y:hit.y,scale:crystalVisualScale(Math.hypot(hit.x,hit.y))*.45,start:this.time});this.sparks.burst(hit.x,hit.y,hit.note,10); }const flash=(this.floor.material as ShaderMaterial).uniforms.uRingFlash!.value as Vector4;for(const c of event.shattered){const idx=Math.max(0,Math.min(3,Math.round(Math.hypot(c.x,c.y)/2.5)-1));flash.setComponent(idx,Math.min(1,flash.getComponent(idx)+.5));} }
    if(event.type === "golden") { const slots=(this.background.material as ShaderMaterial).uniforms.uShafts!.value as Vector4[];slots[this.shaftCursor++%6]!.set(Math.atan2(event.y,event.x),this.time,.6,5);this.shards.burst(event.x,event.y,event.note,TELL_FX.goldShards,false,false,true);this.sparks.burst(event.x,event.y,event.note,20); }
    if(event.type === "strike") { if(event.n>=7 && event.closeCount>0)this.choirTextDelay=180;  if(event.n>=2)this.threads.burst(event.shattered,event.note,freezeMsForStrike(event.n,event.closeCount>0)); }
    if(event.type === "miss") this.rings.launch("miss",0,0,undefined,event.x,event.y);
    if(event.type === "shellBreak") this.shards.burst(event.x,event.y,event.note,0,true);
    if(event.type === "crack") { this.rings.launch("crack",0); if(this.getState().stats.score>0) for(const c of event.flared)this.shards.burst(c.x,c.y,c.note); }
    // SG§5 f10: three rings begin at the end of the freeze, 50 ms apart.
    if(event.type === "choir") { this.choirText.innerHTML=`<div style="font:700 72px Cinzel,serif">CHOIR!</div><div style="font:600 20px Inter,sans-serif">${event.n} at once</div>`; this.choirTextDelay=160; this.rings.launch("choir",event.note,160);this.rings.launch("choir",event.note,210,0xffffff);this.rings.launch("choir",event.note,260,0xffd27a); }
    if(event.type === "gameOver") { this.gameOverBurst=250; this.juice.heat.target=this.juice.heat.x; }
    return entered;
  }
  private boardTint():number { const age=this.time-this.tintStart; if(age<0)return 0; if(this.tintAttack>0 && age<this.tintAttack)return this.tintInitial+(this.tintPeak-this.tintInitial)*age/this.tintAttack; return this.tintPeak*Math.max(0,1-(age-this.tintAttack)/this.tintDuration)**2; }
  private setBoardTint(note:number,peak:number,duration:number,attack:number):void { this.tintInitial=this.boardTint();this.tintPeak=Math.max(this.tintInitial,peak*(this.reducedMotion?.6:1));this.tintStart=this.time;this.tintDuration=duration;this.tintAttack=attack;(this.background.material as ShaderMaterial).uniforms.uTintColor!.value.setHex(NOTE_COLORS[note]!); }
  setSlice(state:SliceState|null):void {this.slice=state;this.choirText.style.top=state?"30%":"17%";this.motes.setTier(this.tier,this.renderer.getPixelRatio(),!!state);this.shards.harvestY=state?-4.1:0;this.floor.visible=!state;this.halo.visible=!state;this.bladeRibbon.reset();}
  bladePoint(x:number,y:number,time:number,speed:number,armed:boolean):void {this.bladeRibbon.add(x,y,time,speed,armed);}
  sliceEvent(e:SliceEvent):void {if(!this.slice)return;const aspect=this.slice.aspect;if(e.type==='cut'){this.crystals.cut(e,aspect);const x=(e.x-aspect/2)*10,y=(e.y-.5)*10;this.shards.burst(x,y,e.note,this.tier==='high'?12:this.tier==='medium'?8:5,false,false,false,Math.atan2(e.dirY,e.dirX),true);this.sliceFlashes.push({x,y,note:e.note,start:this.time,dx:e.dirX,dy:e.dirY});this.sliceNote=e.note;this.sliceChain=e.chainStep;this.face.trigger('happy');this.juice.sliceCut(e.k);}else if(e.type==='toss'&&e.kind==='dark'){this.face.trigger('worried');}else if(e.type==='fall'&&!e.cracked){this.face.trigger('worried');}else if(e.type==='darkHit'){const x=(e.x-aspect/2)*10,y=(e.y-.5)*10;this.shards.burst(x,y,0,0,true);this.sparks.burst(x,y,0,12);this.rings.launch('crack',0,0,undefined,x,y);this.juice.sliceDark();}else if(e.type==='choir'){this.juice.sliceChoir();this.face.trigger('delighted');this.choirText.innerHTML='<div style="font:700 72px Cinzel,serif">CHOIR!</div>';this.choirTextDelay=120;this.rings.launch('choir',e.note,120);this.rings.launch('choir',e.note,170,0xffffff);this.rings.launch('choir',e.note,220,0xffd27a);for(const c of e.swept)this.shards.burst((c.x-aspect/2)*10,(c.y-.5)*10,c.note); }else if(e.type==='strokeEnd')this.sliceChain=0;}
  reset(): void { this.bladeRibbon.reset(); this.sliceFlashes.length=0; this.face.reset();this.crystals.reset();this.shards.reset();this.sparks.reset();this.rings.reset();this.threads.reset();this.bell.visible=true;this.gameOverBurst=-1;this.levelSweep=-1;this.chordIds=[];this.bursts.length=0;this.strikeBursts.length=0;this.closeBursts.length=0;this.strikeTime=-10;this.closeFlash=0;this.choirText.style.opacity="0"; }
  setSkin(id:string):void { const styles:Record<string,[number,number,number]>={clear:[0xe8f1ff,0x9fd8ff,.18],quartz:[0x8b7b6e,0xe0c9b0,.35],rosegold:[0xe8a090,0xffd0b8,.30],obsidian:[0x151020,0x8a7cff,.80],aurora:[0x3fe0a0,0xd8fff4,.30],rosewindow:[0xe8f1ff,0xffd27a,.55],crown:[0xe8f1ff,0xffd27a,.18]};const style=styles[id]??styles.clear!;const u=(this.bell.material as ShaderMaterial).uniforms;u.uGlass!.value.setHex(style[0]);u.uRim!.value.setHex(style[1]);u.uAlpha!.value=style[2];u.uSkin!.value=id==="aurora"?1:id==="rosewindow"?2:0;this.face.setRim(style[1]);this.shards.bellColor=style[0];for(const gem of this.gems)gem.visible=id==="crown"; }
  forceHeat(v: number): void { this.juice.heat.target = Math.max(this.juice.heat.target, v); }
  setShake(value:number):void {this.juice.shakeMultiplier=value/100;}
  setReducedMotion(value:boolean):void{this.reducedMotion=value;this.juice.reducedMotion=value;this.shards.reducedMotion=value;if(value){this.juice.ca=CA_OFFSET;this.juice.fov.x=CAMERA_FOV;this.juice.fov.target=CAMERA_FOV;this.juice.fov.v=0;}}

  frame(realDtMs: number, simDtMs: number): void {
    this.time += realDtMs / 1000; this.motes.update(this.time, window.innerWidth); for(let i=0;i<this.gems.length;i++){const angle=this.time*.4+i*Math.PI*2/5;this.gems[i]!.position.set(Math.cos(angle)*1.2,Math.sin(angle)*1.2,1.35);} this.shared.uHeat.value=this.juice.heat.x;this.feverFrame.style.boxShadow=`inset 0 0 90px rgba(194,202,216,${.12*Math.max(0,this.juice.heat.x)})`; this.shared.uBeat.value=Math.exp(-7*((this.time*72/60)%1)); this.shared.uTime.value = this.time * (this.reducedMotion ? .25 : 1); this.juice.update(realDtMs);
    if(this.gameOverBurst>=0){this.gameOverBurst-=realDtMs;if(this.gameOverBurst<0){this.shards.burst(0,0,this.lastNote,20,false,true);this.bell.visible=false;}}
    if (this.levelSweep >= 0) { this.levelSweep += realDtMs; if (this.levelSweep >= LEVEL_SWEEP_MS) this.levelSweep = -1; }
    const floor = (this.floor.material as ShaderMaterial).uniforms; floor.uSweep!.value = this.levelSweep < 0 ? -1 : this.levelSweep / LEVEL_SWEEP_MS; floor.uReducedMotion!.value = this.reducedMotion ? 1 : 0; floor.uAttract!.value=this.getState().mode === "attract" ? 1 : 0;
    const state = this.getState(); const nearest=state.crystals.filter(c=>c.alive).sort((a,b)=>a.rho-b.rho)[0]; this.face.mesh.quaternion.copy(this.camera.quaternion);this.face.update(realDtMs,this.slice?.cracks ?? state.cracks,(state.mode==='intro'&&state.elapsedMs<300)||(state.mode==='attract'&&!this.gestured),nearest??null,state.over && this.gameOverBurst<0,this.reducedMotion);
    const target = this.colors[this.lastNote]!;
    this.tint[0]!.target = target.r; this.tint[1]!.target = target.g; this.tint[2]!.target = target.b;
    const steps = Math.max(1, Math.ceil(realDtMs / 1000 / (1 / 120))); const dt = realDtMs / 1000 / steps;
    for (let i = 0; i < steps; i++) for (const spring of this.tint) spring.step(dt);
    this.shared.uNoteColor.value.setRGB(this.tint[0]!.x, this.tint[1]!.x, this.tint[2]!.x);
    this.shared.uNoteGlow.value = Math.min(1, BELL_IDLE_GLOW + this.shards.glow);
    const halo = (this.halo.material as ShaderMaterial).uniforms; let danger = 0; for (const c of state.crystals) if (c.alive && c.rho - c.r < 3.1) { danger = 1; break; } halo.uDanger!.value = danger;this.closeFlash=Math.max(0,this.closeFlash-realDtMs/150);halo.uCloseFlash!.value=this.closeFlash;
    const bell = (this.bell.material as ShaderMaterial).uniforms; bell.uStrikeDim!.value = this.time-this.strikeTime<SHATTER.bellDimLife?SHATTER.bellDim:Math.min(1,SHATTER.bellDim+(this.time-this.strikeTime-SHATTER.bellDimLife)*3); bell.uCracks!.value = this.slice?.cracks ?? state.cracks; bell.uGrace!.value = state.graceMs > 0 ? 1 : 0; bell.uDud!.value = 0; bell.uCrackFlash!.value = Math.max(0, 1 - this.juice.crackTime / 80);
    const j=this.juice; const squash=0;
    this.bell.scale.set(BELL_SCALE*(this.reducedMotion?1:j.bellX.x+.06*squash),BELL_SCALE*(this.reducedMotion?1:j.bellY.x-.08*squash),BELL_SCALE);
    this.bell.rotation.z=0;
    this.bell.position.x=j.recoilX*Math.exp(-j.crackTime/100);this.bell.position.y=j.recoilY*Math.exp(-j.crackTime/100);if(this.slice){this.bell.position.set(0,-4.1,0);this.bell.scale.setScalar(.4);this.face.mesh.position.y=-4.1;this.face.mesh.scale.setScalar(.4);}else{this.face.mesh.position.y=0;this.face.mesh.scale.setScalar(1);}
    this.bloom.intensity=(this.tier=== "low"?1.6:BLOOM.intensity)+(j.bloom-BLOOM.intensity)+.15*j.heat.x;this.caEffect.offset.set(this.reducedMotion?0:j.ca,this.reducedMotion?0:j.ca);this.flashOverlay.style.opacity=String(this.flashStrength*Math.max(0,1-(this.time-this.flashStart)/SHATTER.flashLife)**2);
    // SG§5 f10 and f102: the Choir label enters at the burst and fades after settling.
    const textAge=j.choirTime-this.choirTextDelay;
    const textAlpha=textAge<0?0:this.reducedMotion?Math.min(1,textAge/150):1;
    this.choirText.style.opacity=String(textAlpha*Math.max(0,Math.min(1,(1200-j.choirTime)/300)));
    const textScale=this.reducedMotion?1:1+.6*Math.exp(-textAge/160)*Math.cos(textAge*2*Math.PI*4/1000);
    this.choirText.style.transform=`translate(-50%, -50%) scale(${textAge<0?1:textScale})`;

    if(j.feverEntered){this.rings.launch("fever",0);j.feverEntered=false;} this.rose=Math.max(0,this.rose-2*realDtMs/1000);const bg=(this.background.material as ShaderMaterial).uniforms;bg.uTintAmt!.value=this.boardTint();bg.uShaftLife!.value=this.reducedMotion?.3:.6;bg.uViewportHeight!.value=window.innerHeight; bg.uRealTime!.value=this.time; bg.uStrikeAge!.value=this.time-this.strikeTime;bg.uRose!.value=this.rose; bg.uSlice!.value=this.slice?1:0; bg.uTitle!.value=state.mode === "attract" ? 1 : 0; bg.uShaftCount!.value=(bg.uShafts!.value as Vector4[]).filter(s => s.z>0 && this.time-s.y <= (this.reducedMotion?.3:s.w<0?.6:SHATTER.shaftLife)).length;if(this.time>this.warnUntil)bg.uWarnNote!.value=-1;const ringFlash=floor.uRingFlash!.value as Vector4;for(let i=0;i<4;i++)ringFlash.setComponent(i,Math.max(0,ringFlash.getComponent(i)-4*realDtMs/1000));
    (this.background.material as ShaderMaterial).uniforms.uChoir!.value=j.choirTime>=0&&j.choirTime<160?1:0;
    if(this.slice)fitSliceCamera(this.camera,this.camera.aspect,Math.min(1,window.innerWidth/this.slice.aspect/window.innerHeight)); else fitCamera(this.camera,this.camera.aspect); if(!this.slice && state.mode === "attract") this.camera.setViewOffset(window.innerWidth,window.innerHeight,0,window.innerHeight*.08,window.innerWidth,window.innerHeight); else this.camera.clearViewOffset(); this.camera.position.x+=j.offsetX;this.camera.position.y+=j.offsetY;this.camera.rotation.z+=j.roll;this.camera.fov=this.slice?30:j.fov.x;this.camera.updateProjectionMatrix();
    // SG§5 f1–f9 and f10–f24: ghosts animate during freeze and burst in a ripple.
    this.projection.set(0,0,0).project(this.camera);(bg.uBell!.value as Vector2).set((this.projection.x+1)/2,(this.projection.y+1)/2);this.glow.begin();for(let i=this.sliceFlashes.length-1;i>=0;i--){const f=this.sliceFlashes[i]!,age=(this.time-f.start)/.25;if(age>=1){this.sliceFlashes.splice(i,1);continue;}this.glow.streak(f.x-f.dx*1.2,f.y-f.dy*1.2,f.x+f.dx*1.2,f.y+f.dy*1.2,2,60/Math.max(1,window.innerHeight),this.colors[f.note]!,1-age);} for(let i=this.closeBursts.length-1;i>=0;i--){const b=this.closeBursts[i]!,t=(this.time-b.start)/TELL_FX.closeLife;if(t>=1){this.closeBursts.splice(i,1);continue;}this.glow.ring(b.x,b.y,.8,TELL_FX.closeScale*b.scale*(1-(1-t)**2),this.goldColor,1-t);} if(this.time<this.warnUntil){const x=Math.cos(this.warnAngle)*10,y=Math.sin(this.warnAngle)*10;this.glow.arc(x,y,.5,1,this.warnAngle,this.goldColor.setHex(0xc2cad8),.7);} for(let i=this.strikeBursts.length-1;i>=0;i--){const b=this.strikeBursts[i]!, age=this.time-b.start;if(age>=SHATTER.ringLife){this.strikeBursts.splice(i,1);continue;}const t=age/SHATTER.ringLife, ease=1-Math.pow(2,-10*t),alpha=(1-t)*(1-t),color=this.colors[b.note]!;this.glow.ring(b.x,b.y,.8,SHATTER.ringRadius*ease,color,.9*alpha,TELL_FX.ringWidth);this.glow.disc(b.x,b.y,.7,SHATTER.discRadius*ease,this.discColors[b.note]!,SHATTER.discAlpha*alpha);if(age<SHATTER.fringeLife){for(let k=0;k<3;k++)this.glow.ring(b.x,b.y,.81,Math.max(0,SHATTER.ringRadius*ease+(k-1)*SHATTER.fringeOffset),this.fringeColors[k]!,SHATTER.fringeAlpha);}} for(let i=this.bursts.length-1;i>=0;i--){const b=this.bursts[i]!,age=this.time-b.start;if(age>=.7){this.bursts.splice(i,1);continue;}const t=age/.7;this.glow.disc(b.x,b.y,.8,1.2*b.scale*(1-(1-t)*(1-t)),this.colors[b.note]!, .9*(1-t)*(1-t));} if(this.slice){this.crystals.updateSlice(this.slice.crystals,this.slice.aspect,simDtMs,SLICE_TOSS.gravity[this.slice.profile]);this.bladeRibbon.update(performance.now(),this.slice.aspect,Math.min(window.innerHeight,window.innerWidth/this.slice.aspect),this.reducedMotion,this.sliceNote,this.sliceChain);}else this.crystals.update(state, simDtMs, this.time, realDtMs, this.reducedMotion);let previous:typeof state.crystals[number]|null=null;for(const id of this.chordIds){let found:typeof state.crystals[number]|null=null;for(const c of state.crystals)if(c.alive&&c.id===id){found=c;break;}if(found){if(previous)this.glow.streak(previous.x,previous.y,found.x,found.y,.1,.12,this.colors[this.chordNote]!,.25);previous=found;}}this.glow.end();this.rings.update(realDtMs);this.threads.update(realDtMs);
    // SG§5 f10–f45 and f37–f102: particles use scaled time and harvest into the bell.
    this.shards.update(state.over ? realDtMs/1000 : simDtMs/1000,state.over);this.sparks.update(simDtMs/1000);
    // SG§5 f102: the in-world effects have settled; text is owned by M6.

    const now = performance.now(); const frameTime = this.lastFrameTime === null ? 0 : now - this.lastFrameTime; this.lastFrameTime = now;
    const tier = this.quality.update(frameTime); if (tier !== this.tier || (tier === "low" && this.quality.lowSub !== this.appliedLowSub)) this.setTier(tier);
    if (this.debug) this.renderer.info.reset();
    this.composer.render(realDtMs / 1000);
    if (this.debug) { this.debugElapsed += realDtMs; this.debugFrames++; if (this.debugElapsed >= 500) { let alive = 0; for (const crystal of state.crystals) if (crystal.alive) alive++; this.debug.textContent = `FPS: ${Math.round(this.debugFrames * 1000 / this.debugElapsed)} · Tier: ${this.tier}${this.tier === "low" && this.appliedLowSub ? "-" : ""} · Draw calls: ${this.renderer.info.render.calls} · Alive crystals: ${alive}`; this.debugElapsed = 0; this.debugFrames = 0; } }
  }
  unproject(sx:number,sy:number): {x:number;y:number} {const ray=new Raycaster();ray.setFromCamera(new Vector2(sx/window.innerWidth*2-1,1-sy/window.innerHeight*2),this.camera);const point=new Vector3();ray.ray.intersectPlane(new Plane(new Vector3(0,0,1),0),point);return {x:point.x,y:point.y};}
  wake():void {this.gestured=true;this.face.wake();}
  boop():void {this.face.trigger('boop');}
  project(x: number, y: number): { sx: number; sy: number } { this.projection.set(x, y, 0).project(this.camera); return { sx: (this.projection.x + 1) * window.innerWidth / 2, sy: (1 - this.projection.y) * window.innerHeight / 2 }; }
  resize(): void { const width = window.innerWidth, height = window.innerHeight; if (!width || !height) return; fitCamera(this.camera, width / height); (this.background.material as ShaderMaterial).uniforms.uAspect!.value=width/height; this.renderer.setSize(width, height, false); this.composer.setSize(width, height); const size = this.renderer.getDrawingBufferSize(new Vector2()); bakeBackground(this.renderer, this.background, this.backgroundTarget, this.camera, size.x, size.y, BOARD.bakeScale, this.tier === "high" ? 4 : 2); }
  setTier(tier: Tier): void { this.tier = tier; this.quality.tier = tier; this.appliedLowSub = tier === "low" && this.quality.lowSub; this.renderer.setPixelRatio(tier === "low" ? (this.appliedLowSub ? LOW_SUB.dpr : 1) : Math.min(window.devicePixelRatio || 1, TIERS[tier].dpr)); this.bloom.scale = this.appliedLowSub ? LOW_SUB.bloom : TIERS[tier].bloom; this.bloom.luminanceMaterial.threshold = tier === "low" ? LOW_SUB.luminanceThreshold : BLOOM.luminanceThreshold; if(tier === "low") (this.floor.material as ShaderMaterial).defines.LOW = 1; else delete (this.floor.material as ShaderMaterial).defines.LOW; (this.floor.material as ShaderMaterial).needsUpdate = true; setPostTier(this.mainPass, this.post, tier); this.bloom.mipmapBlurPass.levels = tier === "low" ? 3 : tier === "medium" ? 5 : 8; this.bloom.mipmapBlurPass.radius=tier === "low" ? .75 : BLOOM.radius; (this.background.material as ShaderMaterial).defines.OCTAVES=tier === "high" ? 4 : 2;(this.background.material as ShaderMaterial).needsUpdate=true;this.motes.setTier(tier,this.renderer.getPixelRatio(),!!this.slice);this.glow.setTier(tier); this.shards.setTier(tier);this.sparks.setTier(tier,this.renderer.getPixelRatio()); this.resize(); }
  dispose(): void {
    window.removeEventListener("resize", this.onResize); window.visualViewport?.removeEventListener("resize", this.onResize); window.clearTimeout(this.resizeTimer);
    for (const mesh of [this.background, this.floor, this.halo, this.bell]) { mesh.geometry.dispose(); const material = mesh.material as ShaderMaterial; if (mesh === this.bell) for (const name of ["uCrack0", "uCrack1", "uCrack2"]) material.uniforms[name]!.value.dispose(); material.dispose(); }
    for(const gem of this.gems){gem.geometry.dispose();(gem.material as ShaderMaterial).dispose();}
    this.bladeRibbon.dispose();this.motes.dispose();this.glow.dispose();this.crystals.dispose();this.shards.dispose();this.sparks.dispose();this.rings.dispose();this.threads.dispose();this.flashOverlay.remove();this.feverFrame.remove();this.choirText.remove();this.debug?.remove();
    this.backgroundTarget.dispose(); this.composer.dispose(); this.renderer.dispose();
  }
}

