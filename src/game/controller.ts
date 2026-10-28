import { AudioEngine } from "../audio/audio";
import { EventBus, type GameEvent } from "../core/events";
import type { SimEvent } from "../sim/types";
import { Loop } from "../core/loop";
import { Input } from "../input/input";
import { Haptics, hapticForStrike } from "../haptics/haptics";
import { GameRenderer } from "../render/renderer";
import { tapMetaStats } from "../modes/mode";
import { TapMode } from "../modes/tap/tapMode";
import { crystalVisualScale } from "../render/fxConfig";
import { BannerQueue, TIPS } from "../ui/banners";
import { Hud } from "../ui/hud";
import { PopText } from "../ui/popText";
import { dailyNumber, localDateISO } from "../core/date";
import { hexToSeed, randomSeed, seedToHex } from "../core/rng";
import { dailySeed } from "../meta/daily";
import { applyRunResult, type RunOutcome, type RunResult } from "../meta/runEnd";
import { checkUnlocks } from "../meta/unlocks";
import { loadSave, writeSave, resetSave, type SaveV2, type StorageLike } from "../meta/save";
import { pickMissions } from "../meta/missions";
import type { MetaStats } from "../modes/mode";
import type { ScaleId } from "../audio/scales";
import type { ScreenContext } from "../ui/screens/common";
import { mount as mountTitle } from "../ui/screens/title";
import { mount as mountResults } from "../ui/screens/results";
import { mount as mountCollection } from "../ui/screens/collection";
import { mount as mountMissions } from "../ui/screens/missions";
import { mount as mountSettings } from "../ui/screens/settings";
import { mount as mountCredits } from "../ui/screens/credits";
import { mount as mountPause } from "../ui/screens/pause";

export class Controller {
 private readonly haptics: Haptics; private readonly bus = new EventBus<GameEvent | SimEvent>(); private readonly audio = new AudioEngine(this.bus, import.meta.env.BASE_URL); private sim!: TapMode; private readonly input: Input; private readonly renderer: GameRenderer; private readonly loop: Loop; private restartMs = 0;
 private readonly hud: Hud; private readonly pops: PopText; private readonly banners: BannerQueue; private readonly save: SaveV2; private readonly storage: StorageLike; private choirClose = false; private liveBest = false; private readonly initialMode: "run" | "daily"; private nextSeed: number | null; private pauseScreen: ReturnType<typeof mountPause> | null = null; private countMs = 0; private currentState: "title" | "run" | "daily" | "paused" | "over" = "title"; private get state() {return this.currentState;} private set state(value: "title" | "run" | "daily" | "paused" | "over") {this.currentState=value;document.body.dataset.screen=value === "daily" ? "run" : value === "paused" ? "pause" : value === "over" ? "run" : value; if (value === "title") delete document.body.dataset.mode; else document.body.dataset.mode="tap";} private activeScreen: {unmount:()=>void} | null = null; private outcome: RunOutcome | null = null; private resultStats: MetaStats | null = null; private resultHymn: number[] = []; private resultMode: "run" | "daily" = "run"; private result: RunResult | null = null; private runDailyNo = 1; private forceFeverCapture = new URLSearchParams(location.search).get("qa")==="1" && new URLSearchParams(location.search).get("fever")==="1"; private settingsFromPause = false; private currentScreen = "title"; private hasGesture = false; private readonly ios: boolean; private readonly vibrationSupported: boolean;
 constructor(canvas: HTMLCanvasElement, surface: HTMLElement) {
  this.storage = { getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) };
  this.save = loadSave(this.storage);
  if (checkUnlocks(this.save).length) writeSave(this.storage, this.save);
  const params = new URLSearchParams(location.search); this.initialMode = params.get("daily") === "1" ? "daily" : "run"; this.nextSeed = hexToSeed(params.get("seed") ?? "");
  this.sim = new TapMode(randomSeed(), "attract", false);
  this.audio.setVolumes(this.save.settings?.sfx ?? 80, this.save.settings?.music ?? 60); this.audio.setScale(this.save.equipped?.scale ?? "bright");
  const seen = new Set((this.save.progress.seenTips ?? []).filter(id => id in TIPS)); this.banners = new BannerQueue(() => performance.now(), seen, this.save.settings?.tips !== false, () => { this.save.progress.seenTips = [...seen]; this.writeSave(); }); this.writeSave();
  const unlock = (): void => { this.hasGesture=true; document.removeEventListener("pointerdown", unlock, true); document.removeEventListener("keydown", unlock, true); void this.audio.unlock(); };
  document.addEventListener("pointerdown", unlock, true); document.addEventListener("keydown", unlock, true);
  const haptics = new Haptics({ vibrate: typeof navigator.vibrate === "function" ? navigator.vibrate.bind(navigator) : undefined, now: () => performance.now(), isIOS: /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) });
  this.haptics = haptics; this.ios = haptics.iosSwitch; this.vibrationSupported = haptics.supported; haptics.enabled = this.save.settings?.vibration !== false;
  this.input = new Input(surface, { onTap: (x,y) => this.sim.tapAt(x,y), onFirstGesture: () => { void this.audio.unlock(); }, iosSwitch: haptics.iosSwitch, onPause: () => this.pause() });
  this.input.setVibration(haptics.enabled);
  this.bus.on("settings", e => { haptics.enabled = e.settings.vibration; this.input.setVibration(haptics.enabled); });
  this.bus.on("strike", e => { if (e.n > 0) { if(e.n<7) haptics.play(hapticForStrike(e.n),e.closeCount>0); else this.choirClose=e.closeCount>0; } });
  this.bus.on("shellBreak", () => haptics.play("shell"));
  this.bus.on("crack", () => haptics.play("crack"));
  this.bus.on("mend", () => haptics.play("mend")); this.bus.on("choir", () => haptics.play("choir",this.choirClose));
  this.bus.on("gameOver", () => haptics.play("gameOver")); this.bus.on("newBestLive", () => haptics.play("newBest")); this.bus.on("ui", () => haptics.play("ui"));
  this.loop = new Loop({ now: () => performance.now(), tick: () => this.tick(), frame: (real, sim) => this.frame(real, sim) });
  this.renderer = new GameRenderer(canvas, () => this.sim.state, this.loop);
  const hudRoot = document.querySelector<HTMLElement>("#hud")!; if(!document.querySelector(".hud-backing")){const b=document.createElement("div");b.className="hud-backing";document.body.prepend(b);} this.hud = new Hud(hudRoot, () => this.pause(), this.save.modes.tap.bests.score ?? 0); this.pops = new PopText(hudRoot, (x,y) => this.renderer.project(x,y), window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  document.addEventListener("visibilitychange", () => { if (document.hidden) { this.audio.suspend(); if (this.pauseScreen && this.countMs > 0) { this.countMs = 0; this.pauseScreen.countdown(""); } this.pause(); this.loop.stop(); } else { this.audio.resume(); this.loop.start(); } });
  this.showTitle(); this.applySettings(); this.loop.start();
  if(params.get("qa")==="1") { void import("./qa").then(({installQA})=>{const crystals=()=>this.sim.state.crystals.filter(c=>c.alive).map(c=>{const p=this.renderer.project(c.x,c.y), q=this.renderer.project(c.x+c.r*crystalVisualScale(c.rho)*(c.kind==="golden"?1.25:1),c.y);return {id:c.id,note:c.note,kind:c.kind,...p,rPx:Math.hypot(q.sx-p.sx,q.sy-p.sy),hitRPx:48};}); installQA({crystals,screen:()=>document.body.dataset.screen??"title",start:daily=>this.startRun(daily?"daily":"run"),forceGameOver:()=>this.sim.forceGameOver(),tapCrystal:id=>{const c=this.sim.state.crystals.find(x=>x.alive&&x.id===id);if(c){const p=this.renderer.project(c.x,c.y);this.sim.tapAt(p.sx,p.sy);}},state:()=>{const s=this.sim.state;return {screen:document.body.dataset.screen,mode:document.body.dataset.mode??null,daily:s.mode==="daily",score:s.stats.score,cracks:s.cracks,over:s.over,mult:s.mult,streak:s.streak,chainStep:0,strokeCuts:0,stats:s.stats,crystals:crystals(),blade:{state:"idle",speedHps:0,armed:false}};}});if(params.get("mode")==="tap")this.startRun(params.get("daily")==="1"?"daily":"run");}); }
 }
 private configureMode():void {this.sim.configure({frame:(real,sim)=>this.renderer.frame(real,sim),input:on=>this.input.setEnabled(on),project:(x,y)=>this.renderer.project(x,y),tap:note=>this.input.tap(note)});}
 private writeSave(): void { writeSave(this.storage, this.save); }
 private newSim(mode: "run" | "daily"): TapMode { this.runDailyNo = dailyNumber(localDateISO(new Date())); const seed = mode === "daily" ? dailySeed(localDateISO(new Date())) : this.nextSeed ?? randomSeed(); this.nextSeed = null; return new TapMode(seed, mode, this.save.settings.slowDial); }
 private rollover(): void { const iso=localDateISO(new Date()); if(this.save.missions.date!==iso){this.save.missions={date:iso,ids:pickMissions(iso),progress:{},done:[],bonusGiven:false,modesToday:[]};this.writeSave();} }
 private context(): ScreenContext { return {save:this.save,back:()=>this.back(),play:mode=>this.startRun(mode),open:name=>this.open(name),changed:()=>this.applySettings(),equip:(kind,id)=>{if(kind==="scale"){this.save.equipped.scale=id as ScaleId;this.audio.setScale(id as ScaleId);}else if(kind==="skin"){this.save.equipped.skin=id;this.renderer.setSkin(id);}else this.save.equipped.title=id;this.writeSave();},preview:id=>this.audio.previewScale(id),tick:()=>this.audio.playDial(0),reset:()=>{Object.assign(this.save,resetSave());this.rollover();this.applySettings();this.showTitle();},ios:this.ios,vibration:this.vibrationSupported,friend:this.nextSeed===null?null:seedToHex(this.nextSeed),dailyHighlight:this.initialMode==="daily"}; }
 private applySettings():void {const settings=this.save.settings;const reduced=settings.reduceMotion??window.matchMedia("(prefers-reduced-motion: reduce)").matches;this.bus.emit({type:"settings",settings});this.renderer.setReducedMotion(reduced);this.renderer.setShake(settings.shake);this.renderer.setSkin(this.save.equipped.skin);this.pops.reduced=reduced;this.banners.enabled=settings.tips;this.sim.state.slowDial=settings.slowDial;this.writeSave();}
 private showTitle():void {this.activeScreen?.unmount();this.pauseScreen?.unmount();this.pauseScreen=null;this.state="title";this.currentScreen="title";this.loop.paused=false;this.sim=new TapMode(randomSeed(),"attract",false);this.configureMode();this.sim.setInputEnabled(false);this.renderer.reset();this.renderer.setSkin(this.save.equipped.skin);this.bus.emit({type:"runStart",mode:"attract",seed:this.sim.state.seed});this.rollover();document.querySelector<HTMLElement>("#hud")!.classList.add("is-hidden");this.activeScreen=mountTitle(document.querySelector<HTMLElement>("#screens")!,this.context());}
 private open(name:string):void { if(name==="title"){this.showTitle();return;} if(name==="tutorial"){this.startRun("run");return;} if(name==="missions")this.rollover(); this.activeScreen?.unmount();this.activeScreen=null;this.currentScreen=name;document.body.dataset.screen=name;delete document.body.dataset.mode;const root=document.querySelector<HTMLElement>("#screens")!,ctx=this.context();if(name==="settings")this.activeScreen=mountSettings(root,ctx);else if(name==="credits")this.activeScreen=mountCredits(root,ctx);else if(name==="collection")this.activeScreen=mountCollection(root,ctx);else if(name==="missions")this.activeScreen=mountMissions(root,ctx); }
 private back():void { if(this.currentScreen==="credits"){this.open("settings");return;} if(this.settingsFromPause){this.activeScreen?.unmount();this.activeScreen=null;this.settingsFromPause=false;this.showPause();}else this.showTitle(); }
 private startRun(mode: "run" | "daily" = this.initialMode): void {  this.activeScreen?.unmount();this.activeScreen=null;this.pauseScreen?.unmount();this.pauseScreen=null;this.countMs=0;this.input.reset(); this.sim=this.newSim(mode);this.configureMode();this.state=mode; this.liveBest = false; this.bus.emit({ type: "runStart", mode, seed: this.sim.state.seed }); this.renderer.reset(); this.hud.reset(this.save.modes.tap.bests.score); this.hud.nextUnlock(this.save,0,true);document.querySelector<HTMLElement>("#hud")!.classList.remove("is-hidden");document.querySelector<HTMLElement>("#hud")!.dataset.mode="tap";this.sim.setInputEnabled(true);this.loop.paused=false; }
 private showPause():void {this.pauseScreen=mountPause(document.querySelector<HTMLElement>("#screens")!,{resume:()=>this.resume(),restart:()=>this.startRun(this.sim.state.mode === "daily" ? "daily" : "run"),settings:()=>{this.pauseScreen?.unmount();this.pauseScreen=null;this.settingsFromPause=true;this.open("settings");},quit:()=>this.showTitle()});}
 private pause(): void { if (this.state!=="run" && this.state!=="daily") return; this.state="paused";this.bus.emit({type: "ui", sound: "click"}); this.loop.paused=true; this.sim.setInputEnabled(false);this.showPause(); }
 private resume(): void { if (!this.pauseScreen || this.countMs > 0) return; this.bus.emit({type: "ui", sound: "click"}); this.countMs=1200; this.pauseScreen.countdown("3"); }
 private tick(): void { if(this.state==="title"){this.sim.tick();const events=this.sim.events;for(const event of events){this.renderer.event(event);if(this.hasGesture)this.bus.emit(event);}return;} if (this.sim.state.over) { this.input.consume(); return; } if(this.forceFeverCapture){this.sim.state.streak=Math.max(this.sim.state.streak,5);this.sim.state.mult=Math.min(8,1+Math.floor((this.sim.state.streak-1)/2));} this.sim.queue(this.input.consume());this.sim.tick();const events = this.sim.events; if (!this.liveBest && this.save.modes.tap.bests.score > 0 && this.sim.state.stats.score > this.save.modes.tap.bests.score) { this.liveBest = true; this.bus.emit({ type: "newBestLive", score: this.sim.state.stats.score }); this.hud.newBest(); } for (const event of events) { this.bus.emit(event); if(this.renderer.event(event)) this.haptics.play("fever"); this.hud.event(event); if(event.type==="strike"||event.type==="golden")this.hud.nextUnlock(this.save,this.sim.state.stats.shards,true); this.pops.event(event); this.banners.event(event); if (event.type === "gameOver") { const state = this.sim.state; const outcome = applyRunResult(this.save, { mode: "tap", daily: state.mode === "daily", seed: state.seed, stats: tapMetaStats(event.stats), hymn: event.hymn, slowDial: state.slowDial }, localDateISO(new Date())); for (const id of outcome.missionsCompleted) this.bus.emit({ type: "missionComplete", id }); for (const unlock of outcome.unlocked) this.bus.emit({ type: "unlock", ...unlock }); this.writeSave(); this.result={mode:"tap",daily:state.mode==="daily",seed:state.seed,stats:tapMetaStats(event.stats),hymn:[...event.hymn],slowDial:state.slowDial};this.outcome=outcome;this.resultStats=tapMetaStats(event.stats);this.resultHymn=[...event.hymn];this.resultMode=state.mode === "daily" ? "daily" : "run";this.state="over";this.sim.setInputEnabled(false);this.restartMs=1400; } } }
 private frame(real: number, sim: number): void {
  this.sim.frame(real, sim); if(this.forceFeverCapture && (this.state==="run"||this.state==="daily") && !this.sim.state.over){this.renderer.forceHeat(.6);} this.hud.update(this.sim.state,real); this.pops.update(real,this.sim.state.mult); const tip = this.banners.update(); this.hud.banner(tip ? TIPS[tip]! : null);
  if(this.countMs>0) { this.countMs=Math.max(0,this.countMs-real); if(this.countMs===0) { this.pauseScreen?.unmount(); this.pauseScreen=null; this.sim.setInputEnabled(true); this.loop.paused=false; this.state=this.sim.state.mode === "daily" ? "daily" : "run"; } else this.pauseScreen?.countdown(String(Math.ceil(this.countMs/400))); }
  if (this.state==="over" && !this.activeScreen) { this.restartMs-=real; if (this.restartMs<=0 && this.outcome && this.resultStats && this.result) {document.querySelector<HTMLElement>("#hud")!.classList.add("is-hidden");document.body.dataset.screen="results";this.activeScreen=mountResults(document.querySelector<HTMLElement>("#screens")!,this.context(),this.outcome,this.resultStats,this.resultHymn,this.resultMode,this.result,this.runDailyNo);} }
 }
}
