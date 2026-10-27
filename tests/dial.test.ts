import { describe, expect, it } from 'vitest';
import { advanceDial, cancelDial, pressDial, releaseDial } from '../src/sim/dial';
import type { SimEvent } from '../src/sim/types';
import { state } from './simFixtures';
describe('dial', () => {
  it('starts, steps, and wraps', () => {
    const s = state(); const events: SimEvent[] = [];
    pressDial(s, events);
    expect(events).toEqual([{ type: 'holdStart' }, { type: 'dialStep', note: 0, holdMs: 0 }]);
    advanceDial(s, 420, 420, events); expect(s.dial.note).toBe(1);
    advanceDial(s, 840, 420, events); expect(s.dial.note).toBe(0);
    expect(releaseDial(s)).toBe(0);
  });
  it('uses the slow setting', () => {
    const s = state(); s.slowDial = true; const e: SimEvent[] = [];
    pressDial(s, e); advanceDial(s, 566, 420, e); expect(s.dial.note).toBe(0);
    advanceDial(s, 1, 420, e); expect(s.dial.note).toBe(1);
  });
  it('ignores jar, waits for recovery, and cancels', () => {
    const s = state(); const e: SimEvent[] = []; s.jarMs = 1; pressDial(s, e); expect(s.dial.holding).toBe(false);
    s.jarMs = 0; s.recoveryMs = 10; pressDial(s, e); advanceDial(s, 10, 420, e); expect(e).toHaveLength(0);
    s.recoveryMs = 0; advanceDial(s, 1, 420, e); expect(e[0]).toEqual({ type: 'holdStart' });
    cancelDial(s); expect(releaseDial(s)).toBeNull();
  });
});
