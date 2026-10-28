import { describe, expect, it } from 'vitest';
import { Color, Scene } from 'three';
import { AutoTier } from '../src/render/quality';
import { crystalVisualScale, SHATTER } from '../src/render/fxConfig';
import { GlowQuads } from '../src/render/glowQuads';
import { Rings } from '../src/render/rings';
import { heatForStreak, shaftsForStrike } from '../src/render/juice';
import { popLines, popSize } from '../src/ui/popText';
import { nextChipModel, hudChipLayout } from '../src/ui/hudModel';
import { resetSave } from '../src/meta/save';
import { titleModel } from '../src/ui/screens/title';
describe('W1 visual models',()=>{
 it('scales crystals by distance',()=>{expect(crystalVisualScale(1)).toBe(1.9);expect(crystalVisualScale(9)).toBe(3.6);expect(crystalVisualScale(5)).toBeGreaterThan(crystalVisualScale(4));});
 it('uses one instanced ring mesh',()=>{const scene=new Scene(),rings=new Rings(scene);rings.launch('strike',0);rings.launch('close',0);rings.launch('fever',0);rings.update(10);expect(scene.children).toHaveLength(1);expect(rings.mesh.count).toBe(3);rings.dispose();});
 it('limits glow instances and hides empty mesh',()=>{const scene=new Scene(),glow=new GlowQuads(scene);glow.setTier('low');glow.begin();for(let i=0;i<300;i++)glow.disc(0,0,0,1,new Color(0xffffff),1);glow.end();expect(glow.mesh.count).toBe(160);glow.begin();glow.end();expect(glow.mesh.visible).toBe(false);glow.dispose();});
 it.each([[0,0],[2,0],[3,.6],[5,.6],[6,.85],[9,.85],[10,1]])('heat at streak %i is %s',(streak,heat)=>{expect(heatForStreak(streak)).toBe(heat);});
 it('escalates shafts and caps choir',()=>{expect(shaftsForStrike(1)).toEqual({count:2,strength:.47});expect(shaftsForStrike(7)).toEqual({count:6,strength:.6});});
 it('builds the pop text and near choir hints',()=>{expect(popLines(3,180,2)).toEqual({main:'+180',mult:'×2',sub:'3 at once!',hint:''});expect(popLines(5,250,1).hint).toBe('2 more for a Choir');expect(popLines(6,360,1).hint).toBe('1 more for a Choir');expect(popSize(20)).toBe(40);});
 it('previews the next unlock and threshold',()=>{const save=resetSave();save.unlocks.skins.push('quartz');save.unlocks.scales.push('dusk');save.progress.lifetimeShards=400;expect(nextChipModel(save,20)).toEqual({line:'Next: Rose Gold bell',have:420,need:500,unlocked:false});expect(nextChipModel(save,100)?.line).toBe('Unlocked: Rose Gold bell');});
 it('returns no next chip when all shard items are unlocked',()=>{const save=resetSave();save.unlocks.skins=['clear','quartz','rosegold','obsidian','aurora','rosewindow'];save.unlocks.scales=['bright','dusk','koto','dream','gamelan'];expect(nextChipModel(save,0)).toBeNull();});
 it('shows friend and unplayed daily badges',()=>{const save=resetSave();const model=titleModel({save,friend:'A1B2C3D4'},'2026-10-27');expect(model.friend).toBe("Friend's seed A1B2C3D4");expect(model.daily.aria).toBe('Tap Daily #1. Not played yet');expect(model.daily.badge).toBeNull();});
 it('shows played daily and mission badges',()=>{const save=resetSave();save.modes.tap.daily['2026-10-27']={best:8420,plays:1};save.missions.done=['a','b'];const model=titleModel({save,friend:null},'2026-10-27');expect(model.friend).toBeNull();expect(model.daily.aria).toBe("Tap Daily #1. Today's best: 8,420");expect(model.missions.aria).toBe('Missions 2 / 3');});
});

describe('unlock chip thresholds',()=>{
 it('skips stale already earned unlocks',()=>{const s=resetSave();s.progress.lifetimeShards=420;expect(nextChipModel(s,0)).toEqual({line:'Next: Rose Gold bell',have:420,need:500,unlocked:false});});
 it('clamps a crossing during the run',()=>{const s=resetSave();s.progress.lifetimeShards=480;expect(nextChipModel(s,30)).toEqual({line:'Unlocked: Rose Gold bell',have:500,need:500,unlocked:true});});
 it('shows Next before crossing',()=>{const s=resetSave();s.progress.lifetimeShards=480;expect(nextChipModel(s,10)?.line).toBe('Next: Rose Gold bell');});
 it('has no chip after all thresholds',()=>{const s=resetSave();s.progress.lifetimeShards=5000;expect(nextChipModel(s,0)).toBeNull();});
});

it('drops a slow tier after thirty post-warmup frames',()=>{const a=new AutoTier('medium');for(let i=0;i<20;i++)a.update(100);for(let i=0;i<29;i++)expect(a.update(100)).toBe('medium');expect(a.update(100)).toBe('low');});

it('keeps the signed shard tuning and pool capacity',()=>{expect(SHATTER.counts).toEqual({low:22,medium:30,high:40});expect(SHATTER.speed).toBe(11);expect(SHATTER.speedRandom).toBe(13);expect(SHATTER.drag).toBe(1.5);expect(SHATTER.life).toBe(2.6);});
it('steps down the low sub-tier after thirty slow frames',()=>{const a=new AutoTier('low');for(let i=0;i<20;i++)a.update(100);for(let i=0;i<30;i++)a.update(41);expect(a.lowSub).toBe(true);});

it.each([360,390,430])('reserves the HUD gap at %i px',width=>{const layout=hudChipLayout(width,110);expect(layout.maxWidth).toBeLessThanOrEqual(width/2-64);expect(layout.gap).toBe(16);expect(layout.maxWidth).toBeGreaterThanOrEqual(92);});
