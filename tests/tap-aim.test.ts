import { expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import { Rng } from '../src/core/rng';
import { tapCandidates, pickCrystal } from '../src/modes/tap/tapHit';
import { crystalVisualScale } from '../src/render/fxConfig';
it('scripted taps hit at least 17 of 18 including just-spawned crystals',()=>{const sim=new Sim({seed:3,mode:'run',slowDial:false,profile:'beginner'}),rng=new Rng(3);let tries=0,hits=0;for(let tick=0;tick<3600&&tries<18;tick++){if(tick%30===0){const target=sim.state.crystals.filter(c=>c.alive).sort((a,b)=>b.id-a.id)[0];if(target){tries++;const p={x:195+18*target.x,y:422-18*target.y},angle=rng.range(0,Math.PI*2),err=rng.range(0,14),cs=tapCandidates(sim.state.crystals,(x,y)=>({sx:195+18*x,sy:422-18*y}),crystalVisualScale),id=pickCrystal(cs,p.x+err*Math.cos(angle),p.y+err*Math.sin(angle),note=>cs.filter(c=>c.note===note).length),winner=cs.find(c=>c.id===id);if(winner&&(winner.id===target.id||winner.note===target.note))hits++;if(winner)sim.step({strike:winner.note});continue;}}sim.step({strike:null});}expect(tries).toBe(18);expect(hits).toBeGreaterThanOrEqual(17);});
