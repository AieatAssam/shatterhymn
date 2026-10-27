import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import { SIM_DT_MS } from '../src/core/loop';
import type { SimEvent } from '../src/sim/types';
const idle = { strike: null };
function timeline(seed: number, mode: 'run' | 'attract', seconds: number): { time: number; event: SimEvent }[] {
  const sim = new Sim({ seed, mode, slowDial: false });
  const out: { time: number; event: SimEvent }[] = [];
  for (let tick = 0; tick < seconds * 60; tick++) {
    for (const c of sim.state.crystals) c.alive = false;
    for (const event of sim.step(idle)) if (event.type === 'eventWarn' || event.type === 'chordWave' || (event.type === 'spawn' && event.kind === 'golden')) out.push({ time: (tick + 1) * SIM_DT_MS, event: structuredClone(event) });
  }
  return out;
}
describe('variety events', () => {
  it('warns of the first golden event in the specified interval', () => {
    for (let seed = 0; seed < 20; seed++) {
      const events = timeline(seed, 'run', 28), warn = events.find(x => x.event.type === 'eventWarn');
      expect(warn?.time).toBeGreaterThanOrEqual(19000); expect(warn?.time).toBeLessThanOrEqual(25000 + SIM_DT_MS);
      expect(warn?.event).toMatchObject({ kind: 'golden' });
      const spawned = events.find(x => x.event.type === 'spawn'); expect(spawned?.time).toBeLessThanOrEqual(32000);
    }
  });
  it('is deterministic for the same seed', () => { for (let seed = 0; seed < 3; seed++) expect(timeline(seed, 'run', 90)).toEqual(timeline(seed, 'run', 90)); });
  it('starts attract events with a chord and keeps attract progression fixed', () => {
    const sim = new Sim({ seed: 3, mode: 'attract', slowDial: false }); let wave: Extract<SimEvent, { type: 'chordWave' }> | undefined;
    for (let i = 0; i < 360; i++) { for (const c of sim.state.crystals) c.alive = false; for (const e of sim.step(idle)) if (e.type === 'chordWave') wave = e; }
    expect(wave?.ids).toHaveLength(7); expect(sim.state.K).toBe(5); expect(sim.state.level).toBe(0); expect(sim.state.elapsedMs).toBe(0);
  });
  it('does not run in tutorial', () => { const sim = new Sim({ seed: 1, mode: 'tutorial', slowDial: false }); for (let i = 0; i < 1800; i++) expect(sim.step(idle).some(e => e.type === 'eventWarn')).toBe(false); });
});
