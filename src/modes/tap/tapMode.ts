import { Sim } from '../../sim/sim';
import { AttractPilot } from '../../sim/attract';
import { TARGETABLE_R } from '../../sim/config';
import { pickCrystal } from './tapHit';
import { crystalVisualScale } from '../../render/fxConfig';
import type { RunMode, SimInput, SimEvent } from '../../sim/types';
import { tapMetaStats, type GameMode, type ModeStart } from '../mode';
export class TapMode implements GameMode {
 readonly id='tap' as const;
 private sim:Sim;
 private pending:SimInput={strike:null};
 private readonly pilot=new AttractPilot();
 private project:(x:number,y:number)=>{sx:number;sy:number}=()=>({sx:0,sy:0});
 private tap:(note:number)=>void=()=>{};
 private miss:(x:number,y:number)=>void=()=>{}; private unproject:(x:number,y:number)=>{x:number;y:number}=()=>({x:0,y:0}); private boop:()=>void=()=>{};
 events:readonly SimEvent[]=[];
 private frameHook:(real:number,sim:number)=>void=()=>{};
 private inputHook:(on:boolean)=>void=()=>{};
 constructor(seed:number, mode:RunMode, slow:boolean, private attractDelay=0){this.sim=new Sim({seed,mode,slowDial:slow});}
 get state(){return this.sim.state;}
 get over(){return this.state.over;}
 start(opts:ModeStart):void {this.sim=new Sim({seed:opts.seed,mode:opts.daily?'daily':'run',slowDial:opts.slow,profile:opts.profile,gentleMiss:opts.gentleMiss});}
 queue(input:SimInput):void {this.pending=input;}
 tick():void {if(this.attractDelay>0){this.attractDelay-=1000/60;this.events=[];return;}this.events=this.sim.step(this.state.mode==='attract'?this.pilot.update(this.state):this.pending);this.pending={strike:null};}
 tapAt(x:number,y:number):void {const cs=this.state.crystals.filter(c=>c.alive&&c.rho<=TARGETABLE_R);const candidates=cs.map(c=>{const p=this.project(c.x,c.y),q=this.project(c.x+c.r*crystalVisualScale(c.rho)*(c.kind==='golden'?1.25:1),c.y);return {id:c.id,note:c.note,...p,visPx:Math.hypot(q.sx-p.sx,q.sy-p.sy),rho:c.rho};});const id=pickCrystal(candidates,x,y,note=>cs.filter(c=>c.note===note).length);const winner=cs.find(c=>c.id===id);if(winner){this.tap(winner.note);return;}const center=this.project(0,0),edge=this.project(1.6,0);if(Math.hypot(x-center.sx,y-center.sy)<=1.3*Math.hypot(edge.sx-center.sx,edge.sy-center.sy)){this.boop();return;}if(this.state.gentleMiss){const p=this.unproject(x,y);this.miss(p.x,p.y);}}
 configure(hooks:{frame:(real:number,sim:number)=>void; input:(on:boolean)=>void;project:(x:number,y:number)=>{sx:number;sy:number};tap:(note:number)=>void;miss:(x:number,y:number)=>void;unproject:(x:number,y:number)=>{x:number;y:number};boop:()=>void}):void {this.frameHook=hooks.frame;this.inputHook=hooks.input;this.project=hooks.project;this.tap=hooks.tap;this.miss=hooks.miss;this.unproject=hooks.unproject;this.boop=hooks.boop;}
 frame(real:number,sim:number):void {this.frameHook(real,sim);}
 setInputEnabled(on:boolean):void {this.inputHook(on);}
 result(){const s=this.state;return s.over?{stats:tapMetaStats(s.stats),hymn:[...s.hymn],seed:s.seed}:null;}
 qa(){return this.state;}
 forceGameOver():void {this.sim.forceGameOver();}
 dispose():void {}
}
