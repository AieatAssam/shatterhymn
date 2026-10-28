import { describe, expect, it } from 'vitest';
import { popLines } from '../src/ui/popText';
import { multiplierText } from '../src/ui/hudModel';
import { crystalVisualScale } from '../src/render/fxConfig';
import { titleModel } from '../src/ui/screens/title';
import { resetSave } from '../src/meta/save';
import { resolveStrike } from '../src/sim/strike';
import { crystal, state } from './simFixtures';
import type { SimEvent } from '../src/sim/types';
describe('WOW models', () => {
  it('scales crystals smoothly from near to far', () => { expect(crystalVisualScale(3)).toBe(1.9); expect(crystalVisualScale(7)).toBe(3.6); expect(crystalVisualScale(5)).toBeGreaterThan(crystalVisualScale(4)); });
  it('uses the same multiplier for the strike pop and HUD on the strike tick', () => {
    const s = state([crystal(1)]), events: SimEvent[] = [];
    s.streak = 4; s.mult = 2;
    resolveStrike(s, 0, events, () => {});
    const strike = events.find(e => e.type === 'strike');
    expect(strike?.type).toBe('strike');
    if (strike?.type !== 'strike') throw new Error('missing strike');
    expect(popLines(strike.n, strike.points, strike.mult).mult).toBe(multiplierText(s.mult));
    expect(multiplierText(s.mult)).toBe('×3');
  });
  it('gates friend seed and models daily and missions chips', () => {
    const save = resetSave(), ctx = { save, friend: null as string | null };
    expect(titleModel(ctx, '2026-10-27')).toMatchObject({ friend: null, daily: { label: 'Daily #1', aria: 'Tap Daily #1. Not played yet', badge: null }, missions: { badge: '0 / 3' } });
    ctx.friend = 'A1B2C3D4'; expect(titleModel(ctx, '2026-10-27').friend).toBe("Friend's seed A1B2C3D4");
  });
  it('awards golden bonuses and counts the crystal in the strike', () => {
    const c = crystal(1), s = state([c]), events: SimEvent[] = []; c.kind = 'golden'; s.streak = 4;
    resolveStrike(s, 0, events, () => {});
    expect(s.stats.score).toBe(780); expect(s.stats.shards).toBe(6); expect(s.stats.goldens).toBe(1);
    expect(events).toContainEqual(expect.objectContaining({ type: 'golden', points: 750 })); expect(events).toContainEqual(expect.objectContaining({ type: 'strike', n: 1 }));
  });
});
