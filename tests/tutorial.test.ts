import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import { TUTORIAL_SCRIPT, TUTORIAL_RETRY } from '../src/sim/tutorial';
const idle = { strike: null };
describe('direct-strike tutorial script', () => {
  it('completes steps one and three on their specified taps', () => {
    const sim = new Sim({ seed: 1, mode: 'tutorial', slowDial: false, script: TUTORIAL_SCRIPT });
    for(const c of sim.state.crystals) c.rho=5; const red=sim.step({strike:0}); expect(red).toContainEqual(expect.objectContaining({type:'strike',note:0,n:2}));
    sim.setTutorialStep(2); for(const c of sim.state.crystals) c.rho=5; const yellow=sim.step({strike:1}); expect(yellow).toContainEqual(expect.objectContaining({type:'strike',note:1,n:1}));
    expect(sim.state.crystals.filter(c=>c.alive).map(c=>c.note)).toEqual([2]);
  });
  it('ignores strikes on button and auto steps and exposes the new retry copy', () => {
    const sim = new Sim({ seed: 1, mode: 'tutorial', slowDial: false, script: TUTORIAL_SCRIPT });
    sim.setTutorialStep(1); expect(sim.step({strike:0}).some(e=>e.type==='strike'||e.type==='dud')).toBe(false);
    sim.setTutorialStep(3); expect(sim.step({strike:0}).some(e=>e.type==='strike'||e.type==='dud')).toBe(false);
    expect(TUTORIAL_RETRY.replace('{Yellow}', 'Yellow')).toBe('That was Yellow. Tap red ▲ to break the red triangles.');
    expect(sim.step(idle)).toEqual([]);
  });
});
