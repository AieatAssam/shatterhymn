import { describe, expect, it, vi } from 'vitest';
import { CHOIR_R, HALO_R, TARGETABLE_R } from '../src/sim/config';
import { resolveStrike } from '../src/sim/strike';
import type { SimEvent } from '../src/sim/types';
import { crystal, state } from './simFixtures';

function strike(s: ReturnType<typeof state>, note = 0) {
  const events: SimEvent[] = []; const spawn = vi.fn(); resolveStrike(s, note, events, spawn);
  return { events, spawn, hit: events.find(e => e.type === 'strike') };
}
describe('strike', () => {
  it('scores matching crystals and leaves other notes alive', () => {
    const s = state([crystal(1), crystal(2), crystal(3), crystal(4, 1)]); const r = strike(s);
    expect(r.hit).toMatchObject({ n: 3, points: 30, mult: 1 }); expect(s.crystals[3]!.alive).toBe(true);
  });
  it('ignores an empty strike', () => { const s=state(); s.streak=5; s.mult=3; expect(strike(s).events).toEqual([]); expect(s.streak).toBe(5); });
  it('scores two pairs and a group of four equally, and applies the multiplier', () => {
    const s=state([crystal(1),crystal(2)]);expect(strike(s).hit).toMatchObject({points:20});s.crystals=[crystal(3),crystal(4)];expect(strike(s).hit).toMatchObject({points:20});const other=state([crystal(1),crystal(2),crystal(3),crystal(4)]);expect(strike(other).hit).toMatchObject({points:40});other.streak=3;other.crystals=[crystal(1),crystal(2),crystal(3)];expect(strike(other).hit).toMatchObject({points:60,mult:2});
  });
  it('follows the multiplier ladder' , () => {
    const s = state(); const mults = [];
    for (let i = 0; i < 16; i++) { s.crystals = [crystal(i)]; strike(s); mults.push(s.mult); }
    expect(mults).toEqual([1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8]);
  });
  it('breaks a geode shell before shattering it', () => {
    const c = crystal(1); c.kind = 'geode'; c.shell = true; c.r = 0.7; const s = state([c]);
    const first = strike(s); expect(first.events).toContainEqual({ type: 'shellBreak', id: 1, x: 6, y: 0, note: 0 });
    expect(first.hit).toMatchObject({ n: 0, points: 5 }); expect(c.alive).toBe(true);
    expect(strike(s).hit).toMatchObject({ n: 1 }); expect(c.alive).toBe(false);
  });
  it('blasts nearby crystals without reaching distant ones', () => {
    const p = crystal(1, 2, 5); p.kind = 'prism';
    const s = state([p, crystal(2, 2, 6), crystal(3, 2, 7), crystal(4, 0, 8), crystal(5, 0, -8)]);
    expect(strike(s, 2).hit).toMatchObject({ n: 4 }); expect(s.crystals[4]!.alive).toBe(true);
  });
  it('records close calls without extra points', () => {
    const c = crystal(1, 0, HALO_R + 0.55 + 1); const s = state([c]);
    expect(strike(s).hit).toMatchObject({ n: 1, closeCount: 1, points: 10 });
  });
  it('sweeps nearby survivors in a choir', () => {
    const cs = Array.from({ length: 7 }, (_, i) => crystal(i, 0, 6));
    cs.push(crystal(7, 1, CHOIR_R), crystal(8, 1, 4), crystal(9, 1, 8)); const s = state(cs); const r = strike(s);
    expect(r.hit).toMatchObject({ n: 7, points: 670 });
    expect(r.events.find(e => e.type === 'choir')).toMatchObject({ swept: [expect.anything(), expect.anything()] });
    expect(cs[9]!.alive).toBe(true);
  });
  it('spawns next-note splitter children with wraparound', () => {
    for (const [note, next] of [[1, 2], [3, 0]]) {
      const c = crystal(1, note); c.kind = 'splitter'; const s = state([c]); s.K = 4; const r = strike(s, note);
      expect(r.spawn).toHaveBeenCalledTimes(2); expect(r.spawn.mock.calls.map(call => call[1])).toEqual([next, next]);
    }
  });
  it('mends only when cracked and always counts the crystal', () => {
    for (const cracks of [2, 0]) {
      const c = crystal(1); c.kind = 'mend'; const s = state([c]); s.cracks = cracks; const r = strike(s);
      expect(r.hit).toMatchObject({ n: 1 }); expect(s.cracks).toBe(cracks ? 1 : 0);
      expect(r.events.some(e => e.type === 'mend')).toBe(cracks > 0);
    }
  });
  it('does not target crystals outside the targetable radius', () => {
    const c = crystal(1, 0, TARGETABLE_R + 0.1); const s = state([c]);
    expect(strike(s).events).toEqual([]); expect(c.alive).toBe(true);
  });
});
