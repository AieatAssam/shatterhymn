import { expect, it } from 'vitest';
import { AttractPilot } from '../src/sim/attract';
import { Sim } from '../src/sim/sim';
import { TUTORIAL_SCRIPT } from '../src/sim/tutorial';
const none = { press: false, release: false, cancel: false };
it('provides seven scripted steps and tutorial crystals stop without scoring or contact', () => {
  expect(TUTORIAL_SCRIPT).toHaveLength(7);
  const sim = new Sim({ seed: 1, mode: 'tutorial', slowDial: false, script: TUTORIAL_SCRIPT });
  sim.setTutorialStep(2);
  for (let i = 0; i < 1000; i++) sim.step(none);
  expect(sim.state.crystals.filter(c => c.alive).map(c => c.rho)).toEqual([5, 5]);
  sim.step({ press: true, release: true, cancel: false });
  expect(sim.state.stats.score).toBe(0); expect(sim.state.cracks).toBe(0); expect(sim.state.elapsedMs).toBe(0);
});
it('attract pilot waits for five crystals and attract stays at level zero', () => {
  const sim = new Sim({ seed: 2, mode: 'attract', slowDial: false });
  for (let i = 0; i < 5; i++) Object.assign(sim.state.crystals[i]!, { alive: true, id: i + 1, note: 0, rho: 5, r: 0.55 });
  const pilot = new AttractPilot();
  expect(pilot.update(sim.state, 2500)).toEqual({ press: true, release: true, cancel: false });
  for (let i = 0; i < 5000; i++) sim.step(pilot.update(sim.state));
  expect(sim.state.level).toBe(0); expect(sim.state.cracks).toBe(0); expect(sim.state.elapsedMs).toBe(0);
});
