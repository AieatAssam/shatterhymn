import { describe, expect, it, vi } from 'vitest';
import { Haptics, hapticForStrike, PATTERNS } from '../src/haptics/haptics';

describe('haptics', () => {
  it('uses the specified patterns and priorities', () => {
    expect(PATTERNS).toEqual({
      shatter1: { pattern: [10], priority: 5 }, shatter2: { pattern: [14], priority: 5 }, shatter4: { pattern: [18], priority: 5 },
      choir: { pattern: [22, 60, 18], priority: 8 }, dud: { pattern: [28], priority: 3 }, crack: { pattern: [26], priority: 7 },
      fever: { pattern: [12, 40, 16], priority: 5 }, mend: { pattern: [10, 40, 14], priority: 6 }, shell: { pattern: [8], priority: 5 },
      ui: { pattern: [6], priority: 1 }, tick: { pattern: [8], priority: 2 }, newBest: { pattern: [12, 50, 18], priority: 7 },
      gameOver: { pattern: [20, 40, 20, 80, 24], priority: 9 },
    });
  });
  it('arbitrates priorities and throttles repeated patterns', () => {
    let now = 0; const vibrate = vi.fn(() => true);
    const h = new Haptics({ vibrate, now: () => now, isIOS: false });
    h.play('tick'); expect(vibrate).toHaveBeenLastCalledWith([8]);
    h.play('tick'); expect(vibrate).toHaveBeenCalledTimes(1);
    h.play('crack'); now = 10; h.play('shatter1'); h.play('tick'); expect(vibrate).toHaveBeenCalledTimes(2);
    h.play('choir'); expect(vibrate).toHaveBeenCalledTimes(3);
    now = 500; h.play('shatter1', true); expect(vibrate).toHaveBeenLastCalledWith([14]); expect(vibrate).toHaveBeenCalledTimes(4);
    h.enabled = false; now = 1000; h.play('gameOver'); expect(vibrate).toHaveBeenCalledTimes(4);
  });
  it('degrades without vibrate and selects strike tiers', () => {
    const h = new Haptics({ now: () => 0, isIOS: true });
    expect(h.supported).toBe(false); expect(h.iosSwitch).toBe(true); expect(() => h.play('tick')).not.toThrow();
    const vibrate = vi.fn(() => true); const ios = new Haptics({ vibrate, now: () => 0, isIOS: true }); ios.play('choir'); expect(vibrate).not.toHaveBeenCalled();
    expect([1, 2, 3, 4, 9].map(hapticForStrike)).toEqual(['shatter1', 'shatter2', 'shatter2', 'shatter4', 'shatter4']);
  });
});
