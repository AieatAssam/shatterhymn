import { Sim } from '../../sim/sim';
import { AttractPilot } from '../../sim/attract';
import { TARGETABLE_R } from '../../sim/config';
import { pickCrystal } from './tapHit';
import { crystalVisualScale } from '../../render/fxConfig';
import type { RunMode, SimInput, SimEvent, SimState } from '../../sim/types';
import { tapMetaStats, type GameMode, type ModeStart } from '../mode';
import type { EventBus, GameEvent } from '../../core/events';
import type { GameRenderer } from '../../render/renderer';
import type { Hud } from '../../ui/hud';
import type { PopText } from '../../ui/popText';
import { TIPS, type BannerQueue } from '../../ui/banners';
import type { SaveV2 } from '../../meta/save';
export class TapMode implements GameMode {
 readonly id='tap' as const;
 private sim:Sim;
 private pending:SimInput={strike:null};
 private readonly pilot=new AttractPilot();
 private project:(x:number,y:number)=>{sx:number;sy:number}=()=>({sx:0,sy:0});
 private tap:(note:number)=>void=()=>{};
 private miss:(x:number,y:number)=>void=()=>{}; private unproject:(x:number,y:number)=>{x:number;y:number}=()=>({x:0,y:0}); private boop:()=>void=()=>{};
 private events:readonly SimEvent[]=[];
 private hooks: {bus:EventBus<GameEvent|SimEvent>;renderer:GameRenderer;hud:Hud;pops:PopText;banners:BannerQueue;save:SaveV2;audible:()=>boolean;onStrike:()=>void;onOver:()=>void;fever:()=>void;demoVisible:()=>boolean}|null=null; private liveBest=false; private consume:()=>SimInput=()=>({strike:null});
 private frameHook:(real:number,sim:number)=>void=()=>{};
 private inputHook:(on:boolean)=>void=()=>{};
 constructor(seed:number, mode:RunMode, slow:boolean, private attractDelay=0){this.sim=new Sim({seed,mode,slowDial:slow});}
 private get state(){return this.sim.state;}
 get over(){return this.state.over;}
 start(opts:ModeStart):void {this.sim=new Sim({seed:opts.seed,mode:opts.daily?'daily':'run',slowDial:opts.slow,profile:opts.profile,gentleMiss:opts.gentleMiss});}
 queue(input:SimInput):void {this.pending=input;}
 tick():void {if(this.over){this.consume();return;}if(this.attractDelay>0){this.attractDelay-=1000/60;this.events=[];return;}this.events=this.sim.step(this.state.mode==='attract'?this.pilot.update(this.state):this.consume());this.pending={strike:null};this.forwardEvents();}
 tapAt(x:number,y:number):void {const cs=this.state.crystals.filter(c=>c.alive&&c.rho<=TARGETABLE_R);const candidates=cs.map(c=>{const p=this.project(c.x,c.y),q=this.project(c.x+c.r*crystalVisualScale(c.rho)*(c.kind==='golden'?1.25:1),c.y);return {id:c.id,note:c.note,...p,visPx:Math.hypot(q.sx-p.sx,q.sy-p.sy),rho:c.rho};});const id=pickCrystal(candidates,x,y,note=>cs.filter(c=>c.note===note).length);const winner=cs.find(c=>c.id===id);if(winner){this.tap(winner.note);return;}const center=this.project(0,0),edge=this.project(1.6,0);if(Math.hypot(x-center.sx,y-center.sy)<=1.3*Math.hypot(edge.sx-center.sx,edge.sy-center.sy)){this.boop();return;}if(this.state.gentleMiss){const p=this.unproject(x,y);this.miss(p.x,p.y);}}
 configure(hooks:{bus:EventBus<GameEvent|SimEvent>;renderer:GameRenderer;hud:Hud;pops:PopText;banners:BannerQueue;save:SaveV2;audible:()=>boolean;onStrike:()=>void;onOver:()=>void;fever:()=>void;demoVisible:()=>boolean;consume:()=>SimInput;frame:(real:number,sim:number)=>void; input:(on:boolean)=>void;project:(x:number,y:number)=>{sx:number;sy:number};tap:(note:number)=>void;miss:(x:number,y:number)=>void;unproject:(x:number,y:number)=>{x:number;y:number};boop:()=>void}):void {this.hooks=hooks;this.consume=hooks.consume;this.frameHook=hooks.frame;this.inputHook=hooks.input;this.project=hooks.project;this.tap=hooks.tap;this.miss=hooks.miss;this.unproject=hooks.unproject;this.boop=hooks.boop;}
 private forwardEvents():void {const h=this.hooks;if(!h)return;const s=this.state;if(s.mode==='intro'||s.mode==='attract'){for(const e of this.events){h.renderer.event(e);if(h.audible())h.bus.emit(e);}return;}if(!this.liveBest&&h.save.modes.tap.bests.score>0&&s.stats.score>h.save.modes.tap.bests.score){this.liveBest=true;h.bus.emit({type:'newBestLive',score:s.stats.score});h.hud.newBest();}for(const e of this.events){if(e.type==='strike'&&e.n>0)h.onStrike();h.bus.emit(e);if(h.renderer.event(e))h.fever();h.hud.event(e);if(e.type==='strike'||e.type==='golden')h.hud.nextUnlock(h.save,s.stats.shards,true);h.pops.event(e);h.banners.event(e);if(e.type==='gameOver')h.onOver();}}
 getView(){return this.state;}
 get seed(){return this.state.seed;}
 get daily(){return this.state.mode==='daily';}
 get elapsedMs(){return this.state.elapsedMs;}
 get score(){return this.state.stats.score;}
 get shards(){return this.state.stats.shards;}
 get mult(){return this.state.mult;}
 setSlow(slow:boolean){this.state.slowDial=slow;}
 crystals(){return this.state.crystals.filter(c=>c.alive).map(c=>{const p=this.project(c.x,c.y),q=this.project(c.x+c.r*crystalVisualScale(c.rho)*(c.kind==='golden'?1.25:1),c.y);const rPx=Math.hypot(q.sx-p.sx,q.sy-p.sy);return {id:c.id,note:c.note,kind:c.kind,...p,rPx,hitRPx:Math.max(48,1.25*rPx)};});}
 tapCrystal(id:number){const c=this.crystals().find(c=>c.id===id);if(c)this.tapAt(c.sx,c.sy);}
 demoPosition(){const cs=this.crystals();return cs.reduce<typeof cs[number]|null>((a,c)=>!a||c.sy>a.sy?c:a,null);}
 hud(hud:{update:(state:SimState,dt:number)=>void},dt:number){hud.update(this.state,dt);}
 qa(screen:string,mode:string|null){const s=this.state;return {screen,mode,daily:s.mode==='daily',score:s.stats.score,cracks:s.cracks,over:s.over,mult:s.mult,streak:s.streak,chainStep:0,strokeCuts:0,stats:s.stats,crystals:this.crystals(),blade:{state:'idle',speedHps:0,armed:false}};}
 frame(real:number,sim:number):void {this.frameHook(real,sim);const h=this.hooks;if(!h)return;h.hud.update(this.state,real);h.pops.update(real,this.state.mult);const tip=this.state.elapsedMs>=10000&&!h.demoVisible()?h.banners.update():null;h.hud.banner(tip?TIPS[tip]!:null);}
 setInputEnabled(on:boolean):void {this.inputHook(on);}
 result(){const s=this.state;return s.over?{stats:tapMetaStats(s.stats),hymn:[...s.hymn],seed:s.seed}:null;}
 forceGameOver():void {this.sim.forceGameOver();}
 dispose():void {}
}
