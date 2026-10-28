import { expect, it } from 'vitest';
import { dailyNumber, localDateISO, msToClock } from '../src/core/date';
it('counts UTC calendar days including a DST crossing', () => {
  expect(dailyNumber('2026-10-27')).toBe(1); expect(dailyNumber('2026-11-27')).toBe(32); expect(dailyNumber('2027-03-30')).toBe(155);
});
it('formats local dates and clocks', () => { expect(localDateISO(new Date(2026, 0, 5))).toBe('2026-01-05'); expect(msToClock(134000)).toBe('2:14'); });

it('keeps Tap daily seeds and separates Slice seeds', async () => {
  const { dailySeed } = await import('../src/meta/daily');
  const { hash32 } = await import('../src/core/rng');
  const iso = '2026-10-28';
  expect(dailySeed('tap', iso)).toBe(hash32('shatterhymn-daily-' + iso));
  expect(dailySeed(iso)).toBe(dailySeed('tap', iso));
  expect(dailySeed('slice', iso)).toBe(hash32('shatterhymn-slice-daily-' + iso));
});
