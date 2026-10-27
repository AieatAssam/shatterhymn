import { AudioEngine } from "../audio/audio";
import { EventBus, type GameEvent } from "../core/events";
import type { SimEvent } from "../sim/types";
import { Loop } from "../core/loop";
import { Input } from "../input/input";
import { GameRenderer } from "../render/renderer";
import { Sim } from "../sim/sim";
import { BannerQueue, TIPS } from "../ui/banners";
import { DialBar } from "../ui/dialBar";
import { Hud } from "../ui/hud";
import { PopText } from "../ui/popText";
import { mount as mountPause } from "../ui/screens/pause";

type InterimSave = { progress?: { runs?: number; seenTips?: string[] }; bests?: { score?: number }; settings?: { tips?: boolean; sfx?: number; music?: number }; equipped?: { scale?: import("../audio/scales").ScaleId } };
export class Controller {
 private readonly bus = new EventBus<GameEvent | SimEvent>(); private readonly audio = new AudioEngine(this.bus, import.meta.env.BASE_URL); private sim = this.newSim(); private readonly input: Input; private readonly renderer: GameRenderer; private readonly loop: Loop; private restartMs = 0;
 private readonly hud: Hud; private readonly dial: DialBar; private readonly pops: PopText; private readonly banners: BannerQueue; private readonly save: InterimSave; private runs: number; private pauseScreen: ReturnType<typeof mountPause> | null = null; private countMs = 0;
 constructor(canvas: HTMLCanvasElement, surface: HTMLElement) {
  try { this.save = JSON.parse(localStorage.getItem("shatterhymn:save") || "{}"); } catch { this.save = {}; }
  this.audio.setVolumes(this.save.settings?.sfx ?? 80, this.save.settings?.music ?? 60); this.audio.setScale(this.save.equipped?.scale ?? "bright");
  this.runs = (this.save.progress?.runs ?? 0) + 1; this.save.progress ??= {}; this.save.progress.runs = this.runs;
  const seen = new Set((this.save.progress.seenTips ?? []).filter(id => id in TIPS)); this.banners = new BannerQueue(() => performance.now(), seen, this.save.settings?.tips !== false, () => { this.save.progress!.seenTips = [...seen]; this.writeSave(); }); this.writeSave();
  const unlock = (): void => { document.removeEventListener("pointerdown", unlock, true); document.removeEventListener("keydown", unlock, true); void this.audio.unlock(); };
  document.addEventListener("pointerdown", unlock, true); document.addEventListener("keydown", unlock, true);
  this.input = new Input(surface, { onFirstGesture: () => { void this.audio.unlock(); }, iosSwitch: false, onPause: () => this.pause() });
  this.loop = new Loop({ now: () => performance.now(), tick: () => this.tick(), frame: (real, sim) => this.frame(real, sim) });
  this.renderer = new GameRenderer(canvas, () => this.sim.state, this.loop);
  const hudRoot = document.querySelector<HTMLElement>("#hud")!; this.hud = new Hud(hudRoot, () => this.pause(), this.save.bests?.score ?? 0); this.dial = new DialBar(hudRoot, () => this.runs); this.pops = new PopText(hudRoot, (x,y) => this.renderer.project(x,y), window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  document.addEventListener("visibilitychange", () => { if (document.hidden) { this.audio.suspend(); if (this.pauseScreen && this.countMs > 0) { this.countMs = 0; this.pauseScreen.countdown(""); } this.pause(); this.loop.stop(); } else { this.audio.resume(); this.loop.start(); } });
  this.loop.start();
 }
 private writeSave(): void { try { localStorage.setItem("shatterhymn:save", JSON.stringify(this.save)); } catch { /* Storage may be unavailable. */ } }
 private newSim(): Sim { return new Sim({seed: (Math.random()*0x100000000) >>> 0, mode: "run", slowDial: false}); }
 private startRun(): void { this.bus.emit({ type: "runStart", mode: "run", seed: 0 }); this.input.cancelHold(); this.sim=this.newSim(); this.renderer.reset(); this.hud.reset(); this.runs++; this.save.progress!.runs=this.runs; this.writeSave(); }
 private pause(): void { if (this.pauseScreen || this.sim.state.over) return; this.bus.emit({type: "ui", sound: "click"}); this.loop.paused=true; this.input.setEnabled(false); this.pauseScreen=mountPause(document.querySelector<HTMLElement>("#screens")!, {resume:()=>this.resume(), restart:()=>{ this.bus.emit({type: "ui", sound: "click"}); this.pauseScreen?.unmount(); this.pauseScreen=null; this.countMs=0; this.startRun(); this.input.setEnabled(true); this.loop.paused=false; }}); }
 private resume(): void { if (!this.pauseScreen || this.countMs > 0) return; this.bus.emit({type: "ui", sound: "click"}); this.countMs=1200; this.pauseScreen.countdown("3"); }
 private tick(): void { if (this.sim.state.over) { this.input.consume(); return; } for (const event of this.sim.step(this.input.consume())) { this.bus.emit(event); this.renderer.event(event); this.hud.event(event); this.pops.event(event); this.banners.event(event); if (event.type === "gameOver") this.restartMs=1400; } }
 private frame(real: number, sim: number): void {
  this.renderer.frame(real, sim); this.hud.update(this.sim.state,real); this.dial.update(this.sim.state,real); this.pops.update(real); const tip = this.banners.update(); this.hud.banner(tip ? TIPS[tip]! : null);
  if(this.countMs>0) { this.countMs=Math.max(0,this.countMs-real); if(this.countMs===0) { this.pauseScreen?.unmount(); this.pauseScreen=null; this.input.setEnabled(true); this.loop.paused=false; } else this.pauseScreen?.countdown(String(Math.ceil(this.countMs/400))); }
  if (this.sim.state.over) { this.restartMs-=real; if (this.restartMs<=0) this.startRun(); }
 }
}
