import { expect, it } from 'vitest';
import { dailyNumber, localDateISO, msToClock } from '../src/core/date';
it('counts UTC calendar days including a DST crossing', () => {
  expect(dailyNumber('2026-10-27')).toBe(1); expect(dailyNumber('2026-11-27')).toBe(32); expect(dailyNumber('2027-03-30')).toBe(155);
});
it('formats local dates and clocks', () => { expect(localDateISO(new Date(2026, 0, 5))).toBe('2026-01-05'); expect(msToClock(134000)).toBe('2:14'); });
