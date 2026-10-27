import { expect, it } from 'vitest';
import { hash32 } from '../src/core/rng';
import { Sim } from '../src/sim/sim';
function record(seed: number) {
  const sim = new Sim({ seed, mode: 'attract', slowDial: false });
  for (let i = 0; i < 3600; i++) sim.step({ strike: i % 55 === 0 ? i % 3 : null });
  expect(sim.state.tick).toBe(3600);
  return { stats: sim.state.stats, hymn: sim.state.hymn, hash: hash32(JSON.stringify(sim.state.crystals)) };
}
it('replays the same input timeline deterministically and differentiates seeds', () => {
  expect(record(123)).toEqual(record(123)); expect(record(123).hash).not.toBe(record(124).hash);
});
it('keeps the daily seed stable', () => { expect(hash32('shatterhymn-daily-2026-10-27')).toBe(4017599459); });
