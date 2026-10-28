import { Sim } from '../../sim/sim';
import { AttractPilot } from '../../sim/attract';
import { TARGETABLE_R } from '../../sim/config';
import { nearestCrystal } from './tapHit';
import type { RunMode, SimInput, SimEvent } from '../../sim/types';
import { tapMetaStats, type GameMode, type ModeStart } from '../mode';
export class TapMode implements GameMode {
 readonly id='tap' as const;
 private sim:Sim;
 private pending:SimInput={strike:null};
 private readonly pilot=new AttractPilot();
 private project:(x:number,y:number)=>{sx:number;sy:number}=()=>({sx:0,sy:0});
 private tap:(note:number)=>void=()=>{};
 events:readonly SimEvent[]=[];
 private frameHook:(real:number,sim:number)=>void=()=>{};
 private inputHook:(on:boolean)=>void=()=>{};
 constructor(seed:number, mode:RunMode, slow:boolean){this.sim=new Sim({seed,mode,slowDial:slow});}
 get state(){return this.sim.state;}
 get over(){return this.state.over;}
 start(opts:ModeStart):void {this.sim=new Sim({seed:opts.seed,mode:opts.daily?'daily':'run',slowDial:opts.slow});}
 queue(input:SimInput):void {this.pending=input;}
 tick():void {this.events=this.sim.step(this.state.mode==='attract'?this.pilot.update(this.state):this.pending);this.pending={strike:null};}
 tapAt(x:number,y:number):void {const candidates=this.state.crystals.filter(c=>c.alive&&c.rho<=TARGETABLE_R).map(c=>({id:c.id,note:c.note,...this.project(c.x,c.y)}));const winner=nearestCrystal(candidates,x,y);if(winner)this.tap(winner.note);}
 configure(hooks:{frame:(real:number,sim:number)=>void; input:(on:boolean)=>void;project:(x:number,y:number)=>{sx:number;sy:number};tap:(note:number)=>void}):void {this.frameHook=hooks.frame;this.inputHook=hooks.input;this.project=hooks.project;this.tap=hooks.tap;}
 frame(real:number,sim:number):void {this.frameHook(real,sim);}
 setInputEnabled(on:boolean):void {this.inputHook(on);}
 result(){const s=this.state;return s.over?{stats:tapMetaStats(s.stats),hymn:[...s.hymn],seed:s.seed}:null;}
 qa(){return this.state;}
 forceGameOver():void {this.sim.forceGameOver();}
 dispose():void {}
}
