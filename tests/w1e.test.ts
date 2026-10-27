import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { placeFloaters } from "../src/game/floaters";
import { scoreCount } from "../src/ui/hud";
import { shardColor } from "../src/render/shards";
import { Juice, heatForStreak } from "../src/render/juice";
import { Loop } from "../src/core/loop";
import { Sim } from "../src/sim/sim";
import { crystal } from "./simFixtures";

describe("W1e finish",()=>{
 it("keeps three coincident labels separated and inside the viewport",()=>{
  const rects=placeFloaters(Array.from({length:3},()=>({x:100,y:100,width:80,height:30})),{left:8,top:8,right:300,bottom:400});
  const sorted=[...rects].sort((a,b)=>a.y-b.y); expect(sorted[0]!.y).toBeGreaterThanOrEqual(8);
  for(let i=1;i<sorted.length;i++)expect(sorted[i]!.y-(sorted[i-1]!.y+sorted[i-1]!.height)).toBeGreaterThanOrEqual(12);
  expect(sorted[2]!.y+sorted[2]!.height).toBeLessThanOrEqual(400);
 });
 it("never counts down across chained strikes",()=>{
  let last=0;for(let age=0;age<=600;age+=10){const next=scoreCount(0,200,age,last);expect(next).toBeGreaterThanOrEqual(last);last=next;}
  for(let age=0;age<=600;age+=10){const next=scoreCount(200,320,age,last);expect(next).toBeGreaterThanOrEqual(last);last=next;} expect(last).toBe(320);
  expect(scoreCount(0,200,400,200)).toBe(200);
 });
 it("keeps yellow shard body below the bright clamp",()=>{expect(Math.max(...shardColor([1,.54,.05]))).toBeLessThanOrEqual(.45);});
 it("uses the balanced chip width for the Rose Gold label",()=>{const css=readFileSync('src/styles/main.css','utf8');expect(css).toMatch(/max-width:min\(100%, calc\(50vw - 40px\)\); text-wrap:balance/);expect('Next: Rose Gold bell'.split(' ').slice(-2).join(' ')).toBe('Gold bell');});
 it("drives the fever target through three scripted strikes",()=>{
  const sim=new Sim({seed:1,mode:'run',slowDial:false,events:false});const juice=new Juice(new Loop({now:()=>0,tick:()=>{},frame:()=>{}}));
  for(let i=0;i<3;i++){while(sim.state.recoveryMs>0)sim.step({strike:null});Object.assign(sim.state.crystals[i]!,crystal(i+1,0,6));for(const event of sim.step({strike:0}))juice.event(event);}
  expect(sim.state.mult).toBe(2);expect(sim.state.streak).toBe(3);expect(heatForStreak(3)).toBe(.6);expect(juice.heat.target).toBe(.6);
  for(let i=3;i<5;i++){while(sim.state.recoveryMs>0)sim.step({strike:null});Object.assign(sim.state.crystals[i]!,crystal(i+1,0,6));for(const event of sim.step({strike:0}))juice.event(event);}expect(sim.state.mult).toBe(3);expect(juice.heat.target).toBe(.6);
 });
});
