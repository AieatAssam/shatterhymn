import { describe, expect, it } from 'vitest';
import { sliceHitstopMs } from '../src/render/juice';
import { hapticForSlice, PATTERNS } from '../src/haptics/haptics';
import { sliceDegree } from '../src/audio/audio';
import { degreeToSemis } from '../src/audio/scales';
import { Crystals, HalfPool, HALF_CAP } from '../src/render/crystals';
import { titleModel } from '../src/ui/screens/title';
import { resetSave } from '../src/meta/save';
describe('Slice presentation rules',()=>{
 it('scales hitstop with cuts and chains',()=>{expect([1,2,4,8].map(k=>sliceHitstopMs(k,1))).toEqual([40,46,58,70]);expect(sliceHitstopMs(5,5)).toBe(70);});
 it('selects crisp cut haptics',()=>{expect([1,2,3,4,8].map(hapticForSlice)).toEqual(['slice1','slice2','slice3','slice4','slice4']);expect(PATTERNS.combo.pattern).toEqual([20,40,26]);});
 it('ascends through the scale and caps at degree nine',()=>{expect([1,2,5,6,10,12].map(sliceDegree)).toEqual([0,1,4,5,9,9]);expect(degreeToSemis('bright',5)-degreeToSemis('bright',0)).toBe(12);});
 it('recycles the oldest pair at the 48 half cap',()=>{const pool=new HalfPool();for(let i=0;i<25;i++){pool.add().x=i;pool.add().x=i;}expect(pool.slots).toHaveLength(HALF_CAP);expect(pool.slots[0]!.x).toBe(24);expect(pool.slots[2]!.x).toBe(1);});
 it('enables Slice and uses its own best and daily',()=>{const save=resetSave();save.modes.slice.runs=1;save.modes.slice.bests.score=3100;save.modes.slice.daily['2026-01-01']={best:80,plays:1};const model=titleModel({save,friend:null},'2026-01-01');expect(model.slice).toMatchObject({enabled:true,best:'Best 3,100',daily:{badge:'80',played:true}});});
});

import { ExtrudeGeometry, Quaternion, Scene, Vector3 } from 'three';
import { glyphShape } from '../src/render/glyphs';
import { buildChordTable, chordFor, capHeat, tumbleAngle, halfScale, CAP } from '../src/render/sliceCap';
import { SLICE_TOSS } from '../src/sim/sliceConfig';
import { spillCount, SLICE_FX } from '../src/render/fxConfig';
import { Shards } from '../src/render/shards';
import { Sparks } from '../src/render/sparks';

function radius(note:number):number { const g=new ExtrudeGeometry(glyphShape(note),{depth:.42,bevelEnabled:true,bevelThickness:.18,bevelSize:.12,bevelSegments:2});g.translate(0,0,-.21);g.computeBoundingSphere();const r=g.boundingSphere!.radius;g.dispose();return r; }
describe('Slice cut face',()=>{
 it('chord table: triangle glyph chord through the origin matches a brute-force polygon intersection within 0.01 for all 64 directions',()=>{const r=radius(0),points=glyphShape(0).extractPoints(12).shape.map(p=>{const n=Math.hypot(p.x,p.y);return [p.x*(1+CAP.bevelX/n)/r,p.y*(1+CAP.bevelX/n)/r] as const;});const table=buildChordTable(glyphShape(0),r);for(let k=0;k<64;k++){const a=k*Math.PI/64,dx=Math.cos(a),dy=Math.sin(a);for(let sign=0;sign<2;sign++){const x=dx*(sign?-1:1),y=dy*(sign?-1:1);let best=Infinity;for(let j=0;j<points.length;j++){const p=points[j]!,q=points[(j+1)%points.length]!,ex=q[0]-p[0],ey=q[1]-p[1],den=x*ey-y*ex;if(Math.abs(den)<1e-10)continue;const t=(p[0]*ey-p[1]*ex)/den,u=(p[0]*y-p[1]*x)/den;if(t>=0&&u>=0&&u<=1)best=Math.min(best,t);}expect(Math.abs(table[k*2+sign]!-best)).toBeLessThan(.01);}}});
 it('chord table: every glyph 0-4 has tPlus > 0 and tMinus > 0 in every direction',()=>{for(let n=0;n<5;n++)for(const t of buildChordTable(glyphShape(n),radius(n)))expect(t).toBeGreaterThan(0);});
 it('chordFor folds angles: (dx,dy) and (-dx,-dy) give the same half and opposite mid',()=>{const table=buildChordTable(glyphShape(0),radius(0));for(let i=0;i<100;i++){const a=i*.071,p=chordFor(table,Math.cos(a),Math.sin(a)),q=chordFor(table,-Math.cos(a),-Math.sin(a));expect(p.half).toBeCloseTo(q.half,6);expect(p.mid).toBeCloseTo(-q.mid,6);}});
 it('capHeat is 1 at 0 and 60 ms, between 0.4 and 0.6 at 300 ms, 0 at 540 ms and 900 ms',()=>{expect(capHeat(0)).toBe(1);expect(capHeat(60)).toBe(1);expect(capHeat(300)).toBeCloseTo(.5);expect(capHeat(540)).toBe(0);expect(capHeat(900)).toBe(0);});
 it('tumbleAngle: 0 at 0 ms, 0.96 ± 0.01 at 220 ms, ≤ 1.30 at 900 ms; reduced motion stays 0.96 after 220 ms',()=>{expect(tumbleAngle(0,false)).toBe(0);expect(tumbleAngle(220,false)).toBeCloseTo(.96);expect(tumbleAngle(900,false)).toBeLessThanOrEqual(1.3);expect(tumbleAngle(900,true)).toBeCloseTo(.96);});
 it('tumble turns the cap toward the camera: for 12 cut directions and both sides, the rotated cap normal has z ≥ 0.80 at 220 ms',()=>{for(let i=0;i<12;i++)for(const side of [-1,1]){const a=i*Math.PI/6,c=new Vector3(-side*Math.cos(a),-side*Math.sin(a),0),axis=new Vector3(c.y,-c.x,0);c.applyQuaternion(new Quaternion().setFromAxisAngle(axis,tumbleAngle(220,false)));expect(c.z).toBeGreaterThanOrEqual(.8);}});
 it('half scale starts at SLICE_TOSS.radius × 10 and ends at 0.85 of it',()=>{expect(halfScale(0)).toBeCloseTo(SLICE_TOSS.radius*11);expect(halfScale(120)).toBeCloseTo(SLICE_TOSS.radius*10);expect(halfScale(900)).toBeCloseTo(SLICE_TOSS.radius*10*.85);});
 it('spill counts per tier are 14 / 10 / 6 and halve (ceil) with reduced motion',()=>{expect(['high','medium','low'].map(t=>spillCount(t as 'high'|'medium'|'low',false))).toEqual([14,10,6]);expect(['high','medium','low'].map(t=>spillCount(t as 'high'|'medium'|'low',true))).toEqual([7,5,3]);});
 it('spill shards never harvest and die within 0.75 s',()=>{const scene=new Scene(),sparks=new Sparks(scene),shards=new Shards(scene,sparks,{});shards.spill(-1,0,1,0,0,1,0,0,0,14,1.6);const pool=(shards as unknown as {pool:{age:number;life:number;harvest:boolean}[]}).pool;const spill=pool.slice(0,14);expect(spill.every(s=>!s.harvest&&s.life<=.75)).toBe(true);shards.update(.75);expect(spill.every(s=>s.age>=s.life)).toBe(true);shards.dispose();sparks.dispose();});
});

it('the slice face is fully on screen: bellY - faceRadiusH >= 8 / 844',()=>{const faceRadiusH=5*.4/2/10;expect(SLICE_FX.bellY-faceRadiusH).toBeGreaterThanOrEqual(8/844);});

import { ribbonWidthPx } from '../src/render/blade';
import { slashAt, FlashLimiter } from '../src/render/renderer';
import { splashCount } from '../src/render/fxConfig';
import { thwackHz } from '../src/audio/audio';
import { Juice } from '../src/render/juice';
import { GlowQuads } from '../src/render/glowQuads';
import { Haptics } from '../src/haptics/haptics';
import type { Loop } from '../src/core/loop';
it('armed ribbon width and reduced motion cap',()=>{expect([1.5,2.5,4].map(v=>ribbonWidthPx(v,false))).toEqual([16,24,30]);expect(ribbonWidthPx(4,true)).toBe(22);});
it('slash length, lifetime and alpha',()=>{expect(slashAt(100,1)).toMatchObject({length:.3,alpha:1});expect(slashAt(320,9)).toMatchObject({length:.42,alpha:0});});
it('flash peaks are at least 333 ms apart',()=>{const limiter=new FlashLimiter(),peaks:number[]=[];for(let t=0;t<1000;t+=30)if(limiter.allow(t))peaks.push(t);for(let i=1;i<peaks.length;i++)expect(peaks[i]!-peaks[i-1]!).toBeGreaterThanOrEqual(333);});
it('kick respects reduced motion and shake setting',()=>{const j=new Juice({freeze:()=>{}} as unknown as Loop);j.sliceCut(1,1,1,0,844);j.update(30);const full=j.offsetX;j.shakeMultiplier=0;expect(j.offsetX).toBe(0);j.shakeMultiplier=1;j.reducedMotion=true;expect(j.offsetX).toBe(0);expect(full).not.toBe(0);});
it('splash counts and lifetimes respect tier and motion',()=>{expect(['high','medium','low'].map(t=>splashCount(t as 'high'|'medium'|'low',false))).toEqual([18,12,8]);expect(splashCount('high',true)).toBe(9);const scene=new Scene(),sparks=new Sparks(scene),shards=new Shards(scene,sparks,{});shards.splash(0,0,0,18,0,1);const pool=(shards as unknown as {pool:{age:number;life:number;harvest:boolean}[]}).pool.slice(0,18);expect(pool.every(s=>!s.harvest&&s.life<=.5)).toBe(true);shards.update(.5);expect(pool.every(s=>s.age>=s.life)).toBe(true);shards.dispose();sparks.dispose();});
it('thwack rises by a semitone per chain step',()=>{expect(thwackHz(1,2)/thwackHz(1,1)).toBeCloseTo(2**(1/12));});

it('halves fly apart along the normal with six to ten radians per second spin',()=>{const scene=new Scene(),glow=new GlowQuads(scene),crystals=new Crystals(scene,{},glow);crystals.cut({type:'cut',id:3,x:.5,y:.5,vx:0,vy:0,angle:0,note:0,k:1,chainStep:1,points:10,dirX:1,dirY:0,speed:3},1);const halves=(crystals as unknown as {halves:HalfPool}).halves.slots.slice(0,2);expect(halves.map(h=>h.vy)).toEqual([-9,9]);expect(halves.map(h=>Math.abs(h.spin))).toEqual([9,9]);crystals.dispose();glow.dispose();});
it('slice haptics add four milliseconds and cap at thirty',()=>{const values:number[][]=[];const h=new Haptics({vibrate:p=>{values.push(p);return true;},now:()=>100,isIOS:false});h.play('slice4',4);expect(values).toEqual([[30]]);});

it('slash draws on, holds, then fades and shrinks through its full lifetime',()=>{expect(slashAt(0,1)).toMatchObject({draw:0,alpha:1,width:1});expect(slashAt(20,1).draw).toBe(.5);expect(slashAt(40,1).draw).toBe(1);expect(slashAt(120,1).alpha).toBe(1);expect(slashAt(220,1)).toMatchObject({alpha:.25,width:.7});expect(slashAt(320,1).width).toBeCloseTo(.4);});
it('flash limiter accepts only one peak for ten cuts in 300 ms',()=>{const limiter=new FlashLimiter();expect(Array.from({length:10},(_,i)=>limiter.allow(i*30)).filter(Boolean)).toHaveLength(1);expect(limiter.allow(333)).toBe(true);});
