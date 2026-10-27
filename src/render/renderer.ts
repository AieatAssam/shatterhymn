import { Color, IcosahedronGeometry, Mesh, HalfFloatType, NoToneMapping, PerspectiveCamera, Scene, ShaderMaterial, SRGBColorSpace, Vector2, Vector3, Vector4, WebGLRenderer } from "three";
import { BloomEffect, ChromaticAberrationEffect, EffectComposer, EffectPass, NoiseEffect, RenderPass, ToneMappingEffect, ToneMappingMode, VignetteEffect } from "postprocessing";
import type { Loop } from "../core/loop";
import { Shards } from "./shards";
import { Sparks } from "./sparks";
import { Rings } from "./rings";
import { Threads } from "./threads";
import { Juice, freezeMsForStrike, shaftsForStrike } from "./juice";
import { Spring1D } from "../core/spring";
import type { SimEvent, SimState } from "../sim/types";
import { GlowQuads } from './glowQuads';
import { Crystals } from "./crystals";
import { createBackground } from "./background";
import { createBell, createHalo } from "./bell";
import { fitCamera } from "./camera";
import { BELL_IDLE_GLOW, BELL_SCALE, BLOOM, CAMERA_FOV, CA_MODULATION, CA_OFFSET, KEY_DIR, NOISE_OPACITY, NOTE_COLORS, PALETTE, RESIZE_DEBOUNCE_MS, LEVEL_SWEEP_MS, VIGNETTE } from "./fxConfig";
import { createFloor } from "./floor";
import { AutoTier, detectTier, TIERS, type Tier } from "./quality";
export function setPostTier(mainPass: EffectPass, post: EffectPass, tier: Tier): void {
  const wantPost = tier !== "low";
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
  private readonly renderer: WebGLRenderer; private readonly composer: EffectComposer; private readonly scene = new Scene(); private readonly camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 1000);
  private readonly bloom = new TierBloomEffect(BLOOM); private readonly post: EffectPass; private readonly mainPass: EffectPass; private readonly quality: AutoTier; private tier: Tier; private resizeTimer: number | undefined; private time = 0; private lastFrameTime: number | null = null;
  private readonly tint = [new Spring1D(0,6,1), new Spring1D(0,6,1), new Spring1D(0,6,1)];
  private readonly glow: GlowQuads; private readonly crystals: Crystals; private shaftCursor=0; private rose=0; private warnUntil=0; private closeFlash=0; private chordIds:number[]=[]; private chordNote=0; private readonly sparks: Sparks; private readonly shards: Shards; private readonly rings: Rings; private readonly threads: Threads; private readonly juice: Juice; private readonly caEffect: ChromaticAberrationEffect; private readonly flashOverlay: HTMLDivElement; private readonly choirText: HTMLDivElement; private choirTextDelay=160; private gameOverBurst = -1; private reducedMotion = false;
  private readonly projection = new Vector3();
  private readonly debug: HTMLDivElement | null;
  private debugElapsed = 0; private debugFrames = 0; private levelSweep = -1;
  private readonly gems: Mesh[] = [];
  private readonly colors = NOTE_COLORS.map(c => new Color(c));
  private readonly shared = { uTime: { value: 0 }, uHeat: { value: 0 }, uBeat: { value: 0 }, uKeyDir: { value: new Vector3(...KEY_DIR).normalize() }, uNoteColor: { value: new Color(NOTE_COLORS[0]) }, uNoteGlow: { value: 0 } };
  private readonly background = createBackground(this.shared); private readonly floor = createFloor(this.shared); private readonly halo = createHalo(this.shared); private readonly bell = createBell(this.shared);
  private readonly onResize = (): void => { window.clearTimeout(this.resizeTimer); this.resizeTimer = window.setTimeout(() => this.resize(), RESIZE_DEBOUNCE_MS); };
  constructor(canvas: HTMLCanvasElement, private readonly getState: () => SimState, loop: Loop) {
    this.juice = new Juice(loop); this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches; this.juice.reducedMotion=this.reducedMotion;
    this.flashOverlay=document.createElement("div"); Object.assign(this.flashOverlay.style,{position:"fixed",inset:"0",background:"white",pointerEvents:"none",opacity:"0",zIndex:"5"}); canvas.parentElement?.appendChild(this.flashOverlay);
    this.choirText=document.createElement("div"); Object.assign(this.choirText.style,{position:"fixed",left:"50%",top:"50%",transform:"translate(-50%, -50%)",pointerEvents:"none",textAlign:"center",color:"#ffd27a",textShadow:"0 0 18px #ffd27a",opacity:"0",zIndex:"6"}); canvas.parentElement?.appendChild(this.choirText);
    this.renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", stencil: false, depth: true, alpha: false });
    this.debug = new URLSearchParams(location.search).get("debug") === "1" ? document.createElement("div") : null;
    if (this.debug) { this.debug.className = "debug-overlay"; canvas.parentElement?.appendChild(this.debug); this.renderer.info.autoReset = false; }
    this.renderer.outputColorSpace = SRGBColorSpace; this.renderer.toneMapping = NoToneMapping; this.renderer.setClearColor(PALETTE.void0);
    this.scene.add(this.background, this.floor, this.halo, this.bell);
    for(let i=0;i<5;i++){const gem=new Mesh(new IcosahedronGeometry(.12,0),new ShaderMaterial({vertexShader:`varying vec3 n; void main(){n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 n; void main(){float f=floor((.25+.75*max(dot(normalize(n),normalize(vec3(-.35,.55,.76))),0.))*4.)/4.;gl_FragColor=vec4(vec3(1.,.63,.2)*(1.+f*2.),1.);}`}));gem.visible=false;this.scene.add(gem);this.gems.push(gem);}
    this.bell.renderOrder=5; this.glow=new GlowQuads(this.scene); this.crystals = new Crystals(this.scene, this.shared, this.glow); this.sparks=new Sparks(this.scene); this.shards=new Shards(this.scene,this.sparks,this.shared); this.shards.reducedMotion=this.reducedMotion; this.rings=new Rings(this.scene); this.threads=new Threads(this.scene);
    this.crystals.onBurst=(x,y,note,choir)=>this.shards.burst(x,y,note,choir?8:0);
    this.composer = new EffectComposer(this.renderer, { frameBufferType: HalfFloatType });
    const noise = new NoiseEffect({ premultiply: true }); noise.blendMode.opacity.value = NOISE_OPACITY;
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.mainPass = new EffectPass(this.camera, this.bloom, new VignetteEffect(VIGNETTE), new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC })); this.composer.addPass(this.mainPass);
    this.caEffect = new ChromaticAberrationEffect({ offset: new Vector2(CA_OFFSET, CA_OFFSET), radialModulation: true, modulationOffset: CA_MODULATION }); this.post = new EffectPass(this.camera, this.caEffect, noise); this.composer.addPass(this.post);
    this.tier = detectTier(window.matchMedia("(pointer: coarse)").matches); this.quality = new AutoTier(this.tier); this.setTier(this.tier);
    window.addEventListener("resize", this.onResize); window.visualViewport?.addEventListener("resize", this.onResize);
  }
  event(event: SimEvent): void {
    this.crystals.event(event); this.juice.event(event);
    if (event.type === "levelUp") this.levelSweep = 0;
    if(event.type === "chordWave"){this.chordIds=event.ids;this.chordNote=event.note;}
    if(event.type === "eventWarn" && event.kind === "chord") { (this.background.material as ShaderMaterial).uniforms.uWarnNote!.value=event.note; this.warnUntil=this.time+1; }
    if(event.type === "strike" && event.n>0) { const bg=(this.background.material as ShaderMaterial).uniforms; const slots=bg.uShafts!.value as Vector4[]; const ladder=shaftsForStrike(event.n); const base=event.shattered[0]; for(let i=0;i<ladder.count;i++){const c=event.shattered[i];const angle=c?Math.atan2(c.y,c.x):Math.atan2(base?.y??0,base?.x??1)+i*Math.PI*2/ladder.count;slots[this.shaftCursor++%6]!.set(angle,this.time,ladder.strength,event.note);}for(const hit of event.shattered)if(hit.close){this.closeFlash=1;this.rings.launch("close",0,0,0xffd27a,hit.x,hit.y);this.sparks.burst(hit.x,hit.y,hit.note,10); }const flash=(this.floor.material as ShaderMaterial).uniforms.uRingFlash!.value as Vector4;for(const c of event.shattered){const idx=Math.max(0,Math.min(3,Math.round(Math.hypot(c.x,c.y)/2.5)-1));flash.setComponent(idx,Math.min(1,flash.getComponent(idx)+.5));}if(event.n>=4)this.rose=Math.max(this.rose,event.n>=7?.6:.10+.04*(event.n-4)); }
    if(event.type === "golden") { const slots=(this.background.material as ShaderMaterial).uniforms.uShafts!.value as Vector4[];slots[this.shaftCursor++%6]!.set(Math.atan2(event.y,event.x),this.time,.8,5);this.shards.burst(event.x,event.y,event.note,12);this.sparks.burst(event.x,event.y,event.note,20); }
    if(event.type === "strike") { if(event.n>=7 && event.closeCount>0)this.choirTextDelay=180; this.rings.launch("strike",event.note); if(event.n>=2)this.threads.burst(event.shattered,event.note,freezeMsForStrike(event.n,event.closeCount>0)); }
    if(event.type === "dud") this.rings.launch("dud",event.note);
    if(event.type === "shellBreak") this.shards.burst(event.x,event.y,event.note,0,true);
    if(event.type === "crack") { this.rings.launch("crack",0); for(const c of event.flared)this.shards.burst(c.x,c.y,c.note); }
    // SG§5 f10: three rings begin at the end of the freeze, 50 ms apart.
    if(event.type === "choir") { this.choirText.innerHTML=`<div style="font:700 72px Cinzel,serif">CHOIR!</div><div style="font:600 20px Inter,sans-serif">${event.n} at once</div>`; this.choirTextDelay=160; this.rings.launch("choir",event.note,160);this.rings.launch("choir",event.note,210,0xffffff);this.rings.launch("choir",event.note,260,0xffd27a); }
    if(event.type === "gameOver") this.gameOverBurst=250;
  }
  reset(): void { this.crystals.reset();this.shards.reset();this.sparks.reset();this.rings.reset();this.threads.reset();this.bell.visible=true;this.gameOverBurst=-1;this.levelSweep=-1;this.chordIds=[];this.closeFlash=0;this.choirText.style.opacity="0"; }
  setSkin(id:string):void { const styles:Record<string,[number,number,number]>={clear:[0xe8f1ff,0x9fd8ff,.18],quartz:[0x8b7b6e,0xe0c9b0,.35],rosegold:[0xe8a090,0xffd0b8,.30],obsidian:[0x151020,0x8a7cff,.80],aurora:[0x3fe0a0,0xd8fff4,.30],rosewindow:[0xe8f1ff,0xffd27a,.55],crown:[0xe8f1ff,0xffd27a,.18]};const style=styles[id]??styles.clear!;const u=(this.bell.material as ShaderMaterial).uniforms;u.uGlass!.value.setHex(style[0]);u.uRim!.value.setHex(style[1]);u.uAlpha!.value=style[2];u.uSkin!.value=id==="aurora"?1:id==="rosewindow"?2:0;this.shards.bellColor=style[0];for(const gem of this.gems)gem.visible=id==="crown"; }
  setShake(value:number):void {this.juice.shakeMultiplier=value/100;}
  setReducedMotion(value:boolean):void{this.reducedMotion=value;this.juice.reducedMotion=value;this.shards.reducedMotion=value;if(value){this.juice.ca=CA_OFFSET;this.juice.fov.x=CAMERA_FOV;this.juice.fov.target=CAMERA_FOV;this.juice.fov.v=0;}}

  frame(realDtMs: number, simDtMs: number): void {
    this.time += realDtMs / 1000; for(let i=0;i<this.gems.length;i++){const angle=this.time*.4+i*Math.PI*2/5;this.gems[i]!.position.set(Math.cos(angle)*1.2,Math.sin(angle)*1.2,1.35);} this.shared.uHeat.value=this.juice.heat.x; this.shared.uBeat.value=Math.exp(-7*((this.time*72/60)%1)); this.shared.uTime.value = this.time * (this.reducedMotion ? .25 : 1); this.juice.update(realDtMs);
    if(this.gameOverBurst>=0){this.gameOverBurst-=realDtMs;if(this.gameOverBurst<0){this.shards.burst(0,0,this.getState().dial.note,20,false,true);this.bell.visible=false;}}
    if (this.levelSweep >= 0) { this.levelSweep += realDtMs; if (this.levelSweep >= LEVEL_SWEEP_MS) this.levelSweep = -1; }
    const floor = (this.floor.material as ShaderMaterial).uniforms; floor.uSweep!.value = this.levelSweep < 0 ? -1 : this.levelSweep / LEVEL_SWEEP_MS; floor.uReducedMotion!.value = this.reducedMotion ? 1 : 0;
    const state = this.getState(), target = this.colors[state.dial.note]!;
    this.tint[0]!.target = target.r; this.tint[1]!.target = target.g; this.tint[2]!.target = target.b;
    const steps = Math.max(1, Math.ceil(realDtMs / 1000 / (1 / 120))); const dt = realDtMs / 1000 / steps;
    for (let i = 0; i < steps; i++) for (const spring of this.tint) spring.step(dt);
    this.shared.uNoteColor.value.setRGB(this.tint[0]!.x, this.tint[1]!.x, this.tint[2]!.x);
    this.shared.uNoteGlow.value = Math.min(1,Math.max(BELL_IDLE_GLOW, state.dial.holding ? Math.min(1, 0.5 + state.dial.holdMs / 2000) : 0)+this.shards.glow);
    const halo = (this.halo.material as ShaderMaterial).uniforms; halo.uCurrent!.value = state.dial.note; halo.uActive!.value = state.K;
    let danger = 0; for (const c of state.crystals) if (c.alive && c.rho - c.r < 3.1) { danger = 1; break; } halo.uDanger!.value = danger;this.closeFlash=Math.max(0,this.closeFlash-realDtMs/150);halo.uCloseFlash!.value=this.closeFlash;
    const bell = (this.bell.material as ShaderMaterial).uniforms; bell.uCracks!.value = state.cracks; bell.uGrace!.value = state.graceMs > 0 ? 1 : 0; bell.uDud!.value = this.reducedMotion && this.juice.dudTime < 600 ? Math.sin(Math.PI * this.juice.dudTime / 600) : 0; bell.uCrackFlash!.value = Math.max(0, 1 - this.juice.crackTime / 80);
    const j=this.juice; const anticipation=j.holding?Math.min(1,j.holdTime/90):0; const squash=1-(1-anticipation)**2;
    this.bell.scale.set(BELL_SCALE*(j.bellX.x+.06*squash),BELL_SCALE*(j.bellY.x-.08*squash),BELL_SCALE);
    this.bell.rotation.z=(!this.reducedMotion&&j.holding ? Math.min(3,.6+.4*j.holdTime/1000)*Math.PI/180*Math.sin(j.time*22*Math.PI):0)+(!this.reducedMotion&&j.dudTime<600?8*Math.PI/180*Math.exp(-6*j.dudTime/1000)*Math.sin(14*Math.PI*j.dudTime/1000):0);
    this.bell.position.x=j.recoilX*Math.exp(-j.crackTime/100);this.bell.position.y=j.recoilY*Math.exp(-j.crackTime/100);
    this.bloom.intensity=(this.tier=== "low"?1.6:BLOOM.intensity)+(j.bloom-BLOOM.intensity)+.15*j.heat.x;this.caEffect.offset.set(j.ca,j.ca);this.flashOverlay.style.opacity=String(j.flash);
    // SG§5 f10 and f102: the Choir label enters at the burst and fades after settling.
    const textAge=j.choirTime-this.choirTextDelay;
    const textAlpha=textAge<0?0:this.reducedMotion?Math.min(1,textAge/150):1;
    this.choirText.style.opacity=String(textAlpha*Math.max(0,Math.min(1,(2000-j.choirTime)/300)));
    const textScale=this.reducedMotion?1:1+.6*Math.exp(-textAge/160)*Math.cos(textAge*2*Math.PI*4/1000);
    this.choirText.style.transform=`translate(-50%, -50%) scale(${textAge<0?1:textScale})`;

    if(j.feverEntered){this.rings.launch("fever",0);this.rose=Math.max(this.rose,.35);j.feverEntered=false;} this.rose=Math.max(0,this.rose-2*realDtMs/1000);const bg=(this.background.material as ShaderMaterial).uniforms;bg.uRealTime!.value=this.time;bg.uRose!.value=this.rose;if(this.time>this.warnUntil)bg.uWarnNote!.value=-1;const ringFlash=floor.uRingFlash!.value as Vector4;for(let i=0;i<4;i++)ringFlash.setComponent(i,Math.max(0,ringFlash.getComponent(i)-4*realDtMs/1000));
    (this.background.material as ShaderMaterial).uniforms.uChoir!.value=j.choirTime>=0&&j.choirTime<160?1:0;
    fitCamera(this.camera,this.camera.aspect); this.camera.position.x+=j.offsetX;this.camera.position.y+=j.offsetY;this.camera.rotation.z+=j.roll;this.camera.fov=j.fov.x;this.camera.updateProjectionMatrix();
    // SG§5 f1–f9 and f10–f24: ghosts animate during freeze and burst in a ripple.
    this.projection.set(0,0,0).project(this.camera);(bg.uBell!.value as Vector2).set((this.projection.x+1)/2,(this.projection.y+1)/2);this.glow.begin();this.crystals.update(state, simDtMs, this.time, realDtMs, this.reducedMotion);let previous:typeof state.crystals[number]|null=null;for(const id of this.chordIds){let found:typeof state.crystals[number]|null=null;for(const c of state.crystals)if(c.alive&&c.id===id){found=c;break;}if(found){if(previous)this.glow.streak(previous.x,previous.y,found.x,found.y,.1,.12,this.colors[this.chordNote]!,.25);previous=found;}}this.glow.end();this.rings.update(realDtMs);this.threads.update(realDtMs);
    // SG§5 f10–f45 and f37–f102: particles use scaled time and harvest into the bell.
    this.shards.update(simDtMs/1000);this.sparks.update(simDtMs/1000);
    // SG§5 f102: the in-world effects have settled; text is owned by M6.

    const now = performance.now(); const frameTime = this.lastFrameTime === null ? 0 : now - this.lastFrameTime; this.lastFrameTime = now;
    const tier = this.quality.update(frameTime); if (tier !== this.tier) this.setTier(tier);
    if (this.debug) this.renderer.info.reset();
    this.composer.render(realDtMs / 1000);
    if (this.debug) { this.debugElapsed += realDtMs; this.debugFrames++; if (this.debugElapsed >= 500) { let alive = 0; for (const crystal of state.crystals) if (crystal.alive) alive++; this.debug.textContent = `FPS: ${Math.round(this.debugFrames * 1000 / this.debugElapsed)} · Tier: ${this.tier} · Draw calls: ${this.renderer.info.render.calls} · Alive crystals: ${alive}`; this.debugElapsed = 0; this.debugFrames = 0; } }
  }
  project(x: number, y: number): { sx: number; sy: number } { this.projection.set(x, y, 0).project(this.camera); return { sx: (this.projection.x + 1) * window.innerWidth / 2, sy: (1 - this.projection.y) * window.innerHeight / 2 }; }
  resize(): void { const width = window.innerWidth, height = window.innerHeight; if (!width || !height) return; fitCamera(this.camera, width / height); (this.background.material as ShaderMaterial).uniforms.uAspect!.value=width/height; this.renderer.setSize(width, height, false); this.composer.setSize(width, height); }
  setTier(tier: Tier): void { this.tier = tier; this.quality.tier = tier; this.renderer.setPixelRatio(tier === "low" ? 1 : Math.min(window.devicePixelRatio || 1, TIERS[tier].dpr)); this.bloom.scale = TIERS[tier].bloom; setPostTier(this.mainPass, this.post, tier); this.bloom.mipmapBlurPass.levels = tier === "low" ? 3 : 8; this.bloom.mipmapBlurPass.radius=tier === "low" ? .75 : BLOOM.radius; (this.background.material as ShaderMaterial).defines.OCTAVES=tier === "low" ? 2 : tier === "medium" ? 3 : 4;(this.background.material as ShaderMaterial).needsUpdate=true;this.glow.setTier(tier); this.shards.setTier(tier);this.sparks.setTier(tier,this.renderer.getPixelRatio()); this.resize(); }
  dispose(): void {
    window.removeEventListener("resize", this.onResize); window.visualViewport?.removeEventListener("resize", this.onResize); window.clearTimeout(this.resizeTimer);
    for (const mesh of [this.background, this.floor, this.halo, this.bell]) { mesh.geometry.dispose(); const material = mesh.material as ShaderMaterial; if (mesh === this.bell) for (const name of ["uCrack0", "uCrack1", "uCrack2"]) material.uniforms[name]!.value.dispose(); material.dispose(); }
    for(const gem of this.gems){gem.geometry.dispose();(gem.material as ShaderMaterial).dispose();}
    this.glow.dispose();this.crystals.dispose();this.shards.dispose();this.sparks.dispose();this.rings.dispose();this.threads.dispose();this.flashOverlay.remove();this.choirText.remove();this.debug?.remove();
    this.composer.dispose(); this.renderer.dispose();
  }
}
