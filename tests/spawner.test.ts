import { describe, expect, it } from 'vitest';
import { SIM_DT_MS } from '../src/core/loop';
import { Rng } from '../src/core/rng';
import { FORMATIONS, levelRow } from '../src/sim/config';
import { Sim } from '../src/sim/sim';
import { Spawner } from '../src/sim/spawner';
import type { SimInput } from '../src/sim/types';
function bot(sim: Sim): SimInput {
  const s = sim.state; const c = s.crystals.filter(c => c.alive && c.rho <= 10.2).sort((a, b) => a.rho - b.rho)[0];
  return { strike: c && s.recoveryMs <= 0 ? c.note : null };
}
const none = { strike: null };
describe('spawn director', () => {
  it('opens with the Crown at 300 ms', () => {
    const sim = new Sim({ seed: 1, mode: 'run', slowDial: false });
    for (let i=0;i<17;i++) expect(sim.step(none).filter(e=>e.type==='spawn')).toHaveLength(0);
    expect(sim.step(none).filter(e=>e.type==='spawn')).toHaveLength(8);
    const alive=sim.state.crystals.filter(c=>c.alive); expect(new Set(alive.map(c=>c.note)).size).toBe(1);
    const events=sim.step({strike:alive[0]!.note}); expect(events.some(e=>e.type==='choir'&&e.n===8)).toBe(true);
  });
  it('draws every active tone once per bag and rebuilds for new K', () => {
    const spawner = new Spawner(new Rng(7));
    for (const k of [3, 4, 5]) for (let i = 0; i < 10; i++) expect(Array.from({ length: k }, () => spawner.drawTone(k)).sort()).toEqual(Array.from({ length: k }, (_, n) => n));
  });
  it('respects caps, special unlocks and restrictions across 20 seeds', () => {
    for (let seed = 0; seed < 20; seed++) {
      const sim = new Sim({ seed, mode: 'run', slowDial: false });
      for (let t = 0; t < 5 * 60 * 60; t++) {
        if (sim.state.over) break;
        const events = sim.step(bot(sim));
        const alive = sim.state.crystals.filter(c => c.alive);
        expect(alive.length).toBeLessThanOrEqual(levelRow(sim.state.level).fieldCap + 3);
        expect(alive.filter(c => c.kind === 'prism').length).toBeLessThanOrEqual(1);
        for (const e of events) if (e.type === 'spawn') {
          const min = { normal: 0, geode: 2, prism: 3, splitter: 4, rusher: 5, mend: 5, golden: 1, dark: 0 }[e.kind];
          expect(sim.state.level).toBeGreaterThanOrEqual(min);
          if (e.kind === 'mend') expect(sim.state.cracks).toBeGreaterThan(0);
        }
      }
    }
    expect(SIM_DT_MS).toBeCloseTo(1000 / 60);
  }, 30000);
  it('only offers unlocked formations and Spiral and Ring spawn no specials', () => {
    class ForcedRng extends Rng {
      choice = 'spiral';
      override weighted<T>(items: readonly { item: T; w: number }[]): T {
        const allowed = FORMATIONS.filter(f => f.fromLevel <= currentLevel).map(f => f.id);
        expect(items.map(i => i.item)).toEqual(allowed);
        return items.find(i => i.item === this.choice)?.item ?? items[0]!.item;
      }
      override chance(): boolean { return true; }
    }
    let currentLevel = 0;
    for (currentLevel = 0; currentLevel <= 5; currentLevel++) {
      for (const choice of ['spiral', 'ring']) {
        const rng = new ForcedRng(12); rng.choice = choice;
        const spawner = new Spawner(rng);
        const sim = new Sim({ seed: 12, mode: 'run', slowDial: false });
        sim.state.level = currentLevel; sim.state.K = levelRow(currentLevel).K;
        spawner.update(sim.state, 1000, []);
        for (const c of sim.state.crystals) c.alive = false;
        const events: import('../src/sim/types').SimEvent[] = [];
        spawner.update(sim.state, 3000, events);
        if ((choice === 'spiral' && currentLevel >= 3) || (choice === 'ring' && currentLevel >= 4)) {
          for (let i = 0; i < 5; i++) spawner.update(sim.state, 300, events);
          expect(events.filter(e => e.type === 'spawn').every(e => e.kind === 'normal')).toBe(true);
        }
      }
    }
  });

});
