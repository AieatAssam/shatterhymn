import { AudioEngine } from "../audio/audio";
import { EventBus, type GameEvent } from "../core/events";
import type { SimEvent } from "../sim/types";
import { Loop } from "../core/loop";
import { Input } from "../input/input";
import { Haptics, hapticForStrike } from "../haptics/haptics";
import { GameRenderer } from "../render/renderer";
import { Sim } from "../sim/sim";
import { BannerQueue, TIPS } from "../ui/banners";
import { DialBar } from "../ui/dialBar";
import { Hud } from "../ui/hud";
import { PopText } from "../ui/popText";
import { dailyNumber, localDateISO } from "../core/date";
import { hexToSeed, randomSeed, seedToHex } from "../core/rng";
import { dailySeed } from "../meta/daily";
import { applyRunResult, type RunOutcome, type RunResult } from "../meta/runEnd";
import { checkUnlocks } from "../meta/unlocks";
import { loadSave, writeSave, resetSave, type SaveV1, type StorageLike } from "../meta/save";
import { AttractPilot } from "../sim/attract";
import { TUTORIAL_SCRIPT, TUTORIAL_RETRY } from "../sim/tutorial";
import { TutorialOverlay } from "../ui/tutorialOverlay";
import { pickMissions } from "../meta/missions";
import type { RunStats } from "../sim/types";
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
 private readonly bus = new EventBus<GameEvent | SimEvent>(); private readonly audio = new AudioEngine(this.bus, import.meta.env.BASE_URL); private sim!: Sim; private readonly input: Input; private readonly renderer: GameRenderer; private readonly loop: Loop; private restartMs = 0;
 private readonly hud: Hud; private readonly dial: DialBar; private readonly pops: PopText; private readonly banners: BannerQueue; private readonly save: SaveV1; private readonly storage: StorageLike; private liveBest = false; private readonly initialMode: "run" | "daily"; private nextSeed: number | null; private runs: number; private pauseScreen: ReturnType<typeof mountPause> | null = null; private countMs = 0; private state: "title" | "tutorial" | "run" | "daily" | "paused" | "over" = "title"; private activeScreen: {unmount:()=>void} | null = null; private readonly pilot = new AttractPilot(); private outcome: RunOutcome | null = null; private resultStats: RunStats | null = null; private resultHymn: number[] = []; private resultMode: "run" | "daily" = "run"; private result: RunResult | null = null; private runDailyNo = 1; private forceFeverCapture = new URLSearchParams(location.search).get("qa")==="1" && new URLSearchParams(location.search).get("fever")==="1"; private settingsFromPause = false; private currentScreen = "title"; private hasGesture = false; private readonly ios: boolean; private readonly vibrationSupported: boolean; private tutorial: TutorialOverlay | null = null; private tutorialStep = 0; private tutorialAge = 0; private tutorialMode: "run" | "daily" = "run";
 constructor(canvas: HTMLCanvasElement, surface: HTMLElement) {
  if (new URLSearchParams(location.search).get("qa") === "1") (window as Window & { __shatterhymnQA?: () => unknown }).__shatterhymnQA = () => { const s=this.sim.state; return { dialNote:s.dial.note, mult:s.mult, streak:s.streak, score:s.stats.score, cracks:s.cracks, over:s.over, crystals:s.crystals.filter(c=>c.alive).map(c=>({note:c.note,rho:c.rho,kind:c.kind})) }; };
  this.storage = { getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) };
  this.save = loadSave(this.storage);
  if (checkUnlocks(this.save).length) writeSave(this.storage, this.save);
  const params = new URLSearchParams(location.search); this.initialMode = params.get("daily") === "1" ? "daily" : "run"; this.nextSeed = hexToSeed(params.get("seed") ?? "");
  this.sim = new Sim({seed: randomSeed(), mode: "attract", slowDial: false});
  this.audio.setVolumes(this.save.settings?.sfx ?? 80, this.save.settings?.music ?? 60); this.audio.setScale(this.save.equipped?.scale ?? "bright");
  this.runs = this.save.progress.runs + 1;
  const seen = new Set((this.save.progress.seenTips ?? []).filter(id => id in TIPS)); this.banners = new BannerQueue(() => performance.now(), seen, this.save.settings?.tips !== false, () => { this.save.progress.seenTips = [...seen]; this.writeSave(); }); this.writeSave();
  const unlock = (): void => { this.hasGesture=true; document.removeEventListener("pointerdown", unlock, true); document.removeEventListener("keydown", unlock, true); void this.audio.unlock(); };
  document.addEventListener("pointerdown", unlock, true); document.addEventListener("keydown", unlock, true);
  const haptics = new Haptics({ vibrate: typeof navigator.vibrate === "function" ? navigator.vibrate.bind(navigator) : undefined, now: () => performance.now(), isIOS: /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) });
  this.ios = haptics.iosSwitch; this.vibrationSupported = haptics.supported; haptics.enabled = this.save.settings?.vibration !== false;
  this.input = new Input(surface, { onFirstGesture: () => { void this.audio.unlock(); }, iosSwitch: haptics.iosSwitch, onPause: () => this.pause() });
  this.input.setVibration(haptics.enabled);
  this.bus.on("settings", e => { haptics.enabled = e.settings.vibration; this.input.setVibration(haptics.enabled); });
  this.bus.on("dialStep", () => haptics.play("tick"));
  this.bus.on("strike", e => { if (e.n > 0) { haptics.play(e.streak === 6 ? "fever" : hapticForStrike(e.n)); if (e.closeCount > 0) setTimeout(() => haptics.play("close"), 60); } });
  this.bus.on("shellBreak", () => haptics.play("shell"));
  this.bus.on("dud", () => haptics.play("dud")); this.bus.on("crack", () => haptics.play("crack"));
  this.bus.on("mend", () => haptics.play("mend")); this.bus.on("choir", () => haptics.play("choir"));
  this.bus.on("gameOver", () => haptics.play("gameOver")); this.bus.on("newBestLive", () => haptics.play("newBest")); this.bus.on("ui", () => haptics.play("ui"));
  this.loop = new Loop({ now: () => performance.now(), tick: () => this.tick(), frame: (real, sim) => this.frame(real, sim) });
  this.renderer = new GameRenderer(canvas, () => this.sim.state, this.loop);
  const hudRoot = document.querySelector<HTMLElement>("#hud")!; if(!document.querySelector(".hud-backing")){const b=document.createElement("div");b.className="hud-backing";document.body.prepend(b);} this.hud = new Hud(hudRoot, () => this.pause(), this.save.bests?.score ?? 0); this.dial = new DialBar(hudRoot, () => this.runs); this.pops = new PopText(hudRoot, (x,y) => this.renderer.project(x,y), window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  document.addEventListener("visibilitychange", () => { if (document.hidden) { this.audio.suspend(); if (this.pauseScreen && this.countMs > 0) { this.countMs = 0; this.pauseScreen.countdown(""); } this.pause(); this.loop.stop(); } else { this.audio.resume(); this.loop.start(); } });
  this.showTitle(); this.applySettings(); this.loop.start();
 }
 private writeSave(): void { writeSave(this.storage, this.save); }
 private newSim(mode: "run" | "daily"): Sim { this.runDailyNo = dailyNumber(localDateISO(new Date())); const seed = mode === "daily" ? dailySeed(localDateISO(new Date())) : this.nextSeed ?? randomSeed(); this.nextSeed = null; return new Sim({ seed, mode, slowDial: this.save.settings.slowDial }); }
 private rollover(): void { const iso=localDateISO(new Date()); if(this.save.missions.date!==iso){this.save.missions={date:iso,ids:pickMissions(iso),progress:{},done:[],bonusGiven:false};this.writeSave();} }
 private context(): ScreenContext { return {save:this.save,back:()=>this.back(),play:mode=>this.startRun(mode),open:name=>this.open(name),changed:()=>this.applySettings(),equip:(kind,id)=>{if(kind==="scale"){this.save.equipped.scale=id as ScaleId;this.audio.setScale(id as ScaleId);}else if(kind==="skin"){this.save.equipped.skin=id;this.renderer.setSkin(id);}else this.save.equipped.title=id;this.writeSave();},preview:id=>this.audio.previewScale(id),tick:()=>this.audio.playDial(0),reset:()=>{Object.assign(this.save,resetSave());this.rollover();this.applySettings();this.showTitle();},ios:this.ios,vibration:this.vibrationSupported,friend:this.nextSeed===null?null:seedToHex(this.nextSeed),dailyHighlight:this.initialMode==="daily"}; }
 private applySettings():void {const settings=this.save.settings;const reduced=settings.reduceMotion??window.matchMedia("(prefers-reduced-motion: reduce)").matches;this.bus.emit({type:"settings",settings});this.renderer.setReducedMotion(reduced);this.renderer.setShake(settings.shake);this.renderer.setSkin(this.save.equipped.skin);this.pops.reduced=reduced;this.banners.enabled=settings.tips;this.sim.state.slowDial=settings.slowDial;this.writeSave();}
 private showTitle():void {this.clearTutorial();this.activeScreen?.unmount();this.pauseScreen?.unmount();this.pauseScreen=null;this.state="title";this.loop.paused=false;this.input.setEnabled(false);this.sim=new Sim({seed:randomSeed(),mode:"attract",slowDial:false});this.renderer.reset();this.renderer.setSkin(this.save.equipped.skin);this.bus.emit({type:"runStart",mode:"attract",seed:this.sim.state.seed});this.rollover();document.querySelector<HTMLElement>("#hud")!.classList.add("is-hidden");this.activeScreen=mountTitle(document.querySelector<HTMLElement>("#screens")!,this.context());}
 private open(name:string):void { if(name==="title"){this.showTitle();return;} if(name==="tutorial"){this.startTutorial("run");return;} if(name==="missions")this.rollover(); this.activeScreen?.unmount();this.activeScreen=null;this.currentScreen=name;const root=document.querySelector<HTMLElement>("#screens")!,ctx=this.context();if(name==="settings")this.activeScreen=mountSettings(root,ctx);else if(name==="credits")this.activeScreen=mountCredits(root,ctx);else if(name==="collection")this.activeScreen=mountCollection(root,ctx);else if(name==="missions")this.activeScreen=mountMissions(root,ctx); }
 private back():void { if(this.currentScreen==="credits"){this.open("settings");return;} if(this.settingsFromPause){this.activeScreen?.unmount();this.activeScreen=null;this.settingsFromPause=false;this.showPause();}else this.showTitle(); }
 private startRun(mode: "run" | "daily" = this.initialMode): void { if (!this.save.progress.tutorialDone) { this.startTutorial(mode); return; } this.clearTutorial(); this.activeScreen?.unmount();this.activeScreen=null;this.pauseScreen?.unmount();this.pauseScreen=null;this.countMs=0;this.input.cancelHold(); this.sim=this.newSim(mode);this.state=mode; this.liveBest = false; this.bus.emit({ type: "runStart", mode, seed: this.sim.state.seed }); this.renderer.reset(); this.hud.reset(this.save.bests.score); this.hud.nextUnlock(this.save,0,true); this.runs = this.save.progress.runs + 1;document.querySelector<HTMLElement>("#hud")!.classList.remove("is-hidden");this.input.setEnabled(true);this.loop.paused=false; }
 private clearTutorial(): void { this.tutorial?.unmount(); this.tutorial = null; document.querySelector<HTMLElement>("#hud")!.classList.remove("tutorial-hud", "tutorial-hearts"); }
 private startTutorial(mode: "run" | "daily"): void {
  this.activeScreen?.unmount(); this.activeScreen=null; this.pauseScreen?.unmount(); this.pauseScreen=null; this.settingsFromPause=false; this.clearTutorial(); this.input.cancelHold();
  this.tutorialMode=mode; this.tutorialStep=0; this.tutorialAge=0; this.state="tutorial";
  this.sim=new Sim({seed:randomSeed(),mode:"tutorial",slowDial:this.save.settings.slowDial,script:TUTORIAL_SCRIPT});
  this.renderer.reset(); this.hud.reset(this.save.bests.score); this.bus.emit({type:"runStart",mode:"tutorial",seed:this.sim.state.seed});
  const hud=document.querySelector<HTMLElement>("#hud")!; hud.classList.remove("is-hidden"); hud.classList.add("tutorial-hud");
  this.tutorial=new TutorialOverlay(document.querySelector<HTMLElement>("#screens")!,this.save.progress.tutorialDone,()=>this.finishTutorial(),()=>this.advanceTutorial());
  this.showTutorialStep(); this.input.setEnabled(true); this.loop.paused=false;
 }
 private showTutorialStep(): void { const step=TUTORIAL_SCRIPT[this.tutorialStep]!; this.tutorialAge=0; this.tutorial?.show(step.text,step.button); document.querySelector<HTMLElement>("#hud")!.classList.toggle("tutorial-hearts",this.tutorialStep===5); }
 private advanceTutorial(): void { if(this.tutorialStep===6){this.finishTutorial();return;} this.tutorialStep++; this.sim.setTutorialStep(this.tutorialStep); this.showTutorialStep(); }
 private finishTutorial(): void { this.save.progress.tutorialDone=true; this.writeSave(); this.clearTutorial(); this.startRun(this.tutorialMode); }
 private tickTutorial(): void {
  const input=this.input.consume(); const before=this.tutorialStep; const events=this.sim.step(input);
  for(const event of events){this.bus.emit(event);this.renderer.event(event);}
  if(before===0 && input.press) this.advanceTutorial();
  if((before===1 || (before===0 && input.press)) && input.release) this.advanceTutorial();
  if(before===2 || before===4) {
   for(const event of events) {
    if(event.type==="strike" && event.note===(before===2?0:1) && event.n===(before===2?2:1)) { this.advanceTutorial(); break; }
    if(before===2 && (event.type==="dud" || event.type==="strike") && event.note!==0) this.tutorial?.show(TUTORIAL_RETRY.replace("{Yellow}",["Red","Yellow","Green"][event.note] ?? "Yellow"));
   }
  }
 }
 private showPause():void {this.pauseScreen=mountPause(document.querySelector<HTMLElement>("#screens")!,{resume:()=>this.resume(),restart:()=>this.startRun(this.sim.state.mode === "daily" ? "daily" : "run"),settings:()=>{this.pauseScreen?.unmount();this.pauseScreen=null;this.settingsFromPause=true;this.open("settings");},quit:()=>this.showTitle()});}
 private pause(): void { if (this.state!=="run" && this.state!=="daily") return; this.state="paused";this.bus.emit({type: "ui", sound: "click"}); this.loop.paused=true; this.input.setEnabled(false);this.showPause(); }
 private resume(): void { if (!this.pauseScreen || this.countMs > 0) return; this.bus.emit({type: "ui", sound: "click"}); this.countMs=1200; this.pauseScreen.countdown("3"); }
 private tick(): void { if(this.state==="tutorial"){this.tickTutorial();return;} if(this.state==="title"){const events=this.sim.step(this.pilot.update(this.sim.state));for(const event of events){this.renderer.event(event);if(this.hasGesture)this.bus.emit(event);}return;} if (this.sim.state.over) { this.input.consume(); return; } const events = this.sim.step(this.input.consume()); if (!this.liveBest && this.save.bests.score > 0 && this.sim.state.stats.score > this.save.bests.score) { this.liveBest = true; this.bus.emit({ type: "newBestLive", score: this.sim.state.stats.score }); this.hud.newBest(); } for (const event of events) { this.bus.emit(event); this.renderer.event(event); this.hud.event(event); if(event.type==="strike"||event.type==="golden")this.hud.nextUnlock(this.save,this.sim.state.stats.shards,true); this.pops.event(event); this.banners.event(event); if (event.type === "gameOver") { const state = this.sim.state; const outcome = applyRunResult(this.save, { mode: state.mode, seed: state.seed, stats: event.stats, hymn: event.hymn, slowDial: state.slowDial }, localDateISO(new Date())); for (const id of outcome.missionsCompleted) this.bus.emit({ type: "missionComplete", id }); for (const unlock of outcome.unlocked) this.bus.emit({ type: "unlock", ...unlock }); this.writeSave(); this.result={mode:state.mode,seed:state.seed,stats:event.stats,hymn:[...event.hymn],slowDial:state.slowDial};this.outcome=outcome;this.resultStats=event.stats;this.resultHymn=[...event.hymn];this.resultMode=state.mode === "daily" ? "daily" : "run";this.state="over";this.input.setEnabled(false);this.restartMs=0; } } }
 private frame(real: number, sim: number): void {
  this.renderer.frame(real, sim); if(this.forceFeverCapture && (this.state==="run"||this.state==="daily") && !this.sim.state.over){this.sim.state.streak=Math.max(this.sim.state.streak,3);this.sim.state.mult=Math.max(this.sim.state.mult,3);this.renderer.forceHeat(.6);} this.hud.update(this.sim.state,real); this.dial.update(this.sim.state,real); this.pops.update(real); const tip = this.banners.update(); this.hud.banner(tip ? TIPS[tip]! : null);
  if(this.state==="tutorial" && this.tutorialStep===3) { this.tutorialAge+=real; if(this.tutorialAge>=1600) this.advanceTutorial(); }
  if(this.countMs>0) { this.countMs=Math.max(0,this.countMs-real); if(this.countMs===0) { this.pauseScreen?.unmount(); this.pauseScreen=null; this.input.setEnabled(true); this.loop.paused=false; this.state=this.sim.state.mode === "daily" ? "daily" : "run"; } else this.pauseScreen?.countdown(String(Math.ceil(this.countMs/400))); }
  if (this.state==="over" && !this.activeScreen) { this.restartMs-=real; if (this.restartMs<=0 && this.outcome && this.resultStats && this.result) {document.querySelector<HTMLElement>("#hud")!.classList.add("is-hidden");this.activeScreen=mountResults(document.querySelector<HTMLElement>("#screens")!,this.context(),this.outcome,this.resultStats,this.resultHymn,this.resultMode,this.result,this.runDailyNo);} }
 }
}
