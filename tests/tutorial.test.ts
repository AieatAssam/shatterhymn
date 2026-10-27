import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import { TUTORIAL_SCRIPT, TUTORIAL_RETRY } from '../src/sim/tutorial';

const idle = { press: false, release: false, cancel: false };
const press = { ...idle, press: true };
const release = { ...idle, release: true };
function setup(step: number): Sim {
  const sim = new Sim({ seed: 1, mode: 'tutorial', slowDial: false, script: TUTORIAL_SCRIPT });
  sim.setTutorialStep(step);
  for (let i = 0; i < 3600; i++) sim.step(idle);
  return sim;
}
function yellow(sim: Sim): void {
  sim.step(press);
  for (let i = 0; i < 25; i++) sim.step(idle);
}
describe('tutorial script', () => {
  it('stops the two red crystals at 5 without cracks after a minute, then shatters both', () => {
    const sim = setup(2);
    expect(sim.state.crystals.filter(c => c.alive).map(c => [c.note, c.rho])).toEqual([[0, 5], [0, 5]]);
    expect(sim.state.cracks).toBe(0);
    expect(sim.state.elapsedMs).toBe(0);
    sim.step(press);
    expect(sim.step(release)).toContainEqual(expect.objectContaining({ type: 'strike', note: 0, n: 2 }));
    expect(sim.state.stats.score).toBe(0);
  });
  it('reports a wrong note and keeps the red pair alive', () => {
    const sim = setup(2);
    yellow(sim);
    expect(sim.step(release)).toContainEqual(expect.objectContaining({ type: 'dud', note: 1 }));
    expect(sim.state.crystals.filter(c => c.alive)).toHaveLength(2);
    expect(TUTORIAL_RETRY.replace('{Yellow}', 'Yellow')).toBe('That was Yellow. Let go while the dial is on red.');
  });
  it('requires yellow to shatter the diamond in step five', () => {
    const sim = setup(4);
    sim.step(press);
    expect(sim.step(release)).toContainEqual(expect.objectContaining({ type: 'dud', note: 0 }));
    for (let i = 0; i < 40; i++) sim.step(idle);
    yellow(sim);
    expect(sim.step(release)).toContainEqual(expect.objectContaining({ type: 'strike', note: 1, n: 1 }));
    expect(sim.state.crystals.filter(c => c.alive).map(c => c.note)).toEqual([2]);
    sim.setTutorialStep(5);
    expect(sim.state.crystals.filter(c => c.alive)).toHaveLength(0);
  });
});
