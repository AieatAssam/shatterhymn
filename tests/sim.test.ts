import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import type { SimInput } from '../src/sim/types';
const none: SimInput = { press: false, release: false, cancel: false };
function bot(sim: Sim): SimInput {
  const s = sim.state;
  const nearest = s.crystals.filter(c => c.alive).sort((a, b) => a.rho - b.rho)[0];
  return { press: !s.dial.holding && s.jarMs <= 0, release: !!nearest && s.dial.holding && !s.dial.waitingRecovery && s.dial.note === nearest.note, cancel: false };
}
function run(seed: number, useBot: boolean): Sim {
  const sim = new Sim({ seed, mode: 'run', slowDial: false });
  while (!sim.state.over && sim.state.tick < 15 * 60 * 60) sim.step(useBot ? bot(sim) : none);
  return sim;
}
describe('simulation', () => {
  it('resolves contacts, flare, grace and game over once', () => {
    const sim = new Sim({ seed: 1, mode: 'run', slowDial: false });
    const c = sim.state.crystals[0]!, other = sim.state.crystals[1]!;
    Object.assign(c, { alive: true, id: 1, rho: 2, r: 0.55, x: 2 });
    Object.assign(other, { alive: true, id: 2, rho: 3, r: 0.55 });
    sim.state.streak = 3;
    expect(sim.step(none).map(e => e.type)).toContain('crack');
    expect([sim.state.cracks, sim.state.streak, other.alive]).toEqual([1, 0, false]);
    Object.assign(c, { alive: true, rho: 2 });
    expect(sim.step(none).map(e => e.type)).toContain('graceHit');
    sim.state.cracks = 2; sim.state.graceMs = 0; c.alive = true;
    expect(sim.step(none).map(e => e.type).filter(t => t === 'gameOver')).toHaveLength(1);
    expect(sim.step(none)).toHaveLength(0);
  });
  it('ends on the third crack in that tick and rejects later strikes', () => {
    const sim = new Sim({ seed: 1, mode: 'run', slowDial: false });
    sim.state.cracks = 2;
    const c = sim.state.crystals[0]!;
    Object.assign(c, { alive: true, id: 1, note: 1, rho: 2, r: .55, speed: 0 });
    const events = sim.step(none);
    expect(sim.state.over).toBe(true);
    expect(events.map(e => e.type)).toEqual(expect.arrayContaining(['crack', 'gameOver']));
    Object.assign(c, { alive: true, note: 0, rho: 5 });
    expect(sim.step({ press: true, release: true, cancel: false })).toEqual([]);
    expect(c.alive).toBe(true);
  });
  it('levels at 20, 40 and 80 seconds', () => {
    const sim = new Sim({ seed: 4, mode: 'run', slowDial: false });
    const levels = [];
    for (let i = 0; i < 4800; i++) { for (const c of sim.state.crystals) c.alive = false; levels.push(...sim.step(none).filter(e => e.type === 'levelUp')); }
    expect(levels.map(e => [e.level, e.K, e.newNote])).toEqual([[1, 3, null], [2, 4, 3], [3, 4, null], [4, 5, 4]]);
  });
  it('ends idle runs in the specified range for 20 seeds', () => {
    for (let seed = 0; seed < 20; seed++) { const s = run(seed, false).state; expect(s.over).toBe(true); expect(s.elapsedMs).toBeGreaterThanOrEqual(12000); expect(s.elapsedMs).toBeLessThanOrEqual(40000); }
  });
  it('measures urgent bot survival over 20 seeds', () => {
    const times = Array.from({ length: 20 }, (_, seed) => { const s = run(seed, true).state; expect(s.over).toBe(true); return s.elapsedMs / 1000; }).sort((a, b) => a - b);
    const median = (times[9]! + times[10]!) / 2;
    console.log('Urgent bot median survival:', median);
    expect(median).toBeGreaterThanOrEqual(60);
  });
});
