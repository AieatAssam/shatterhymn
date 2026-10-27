import { describe, expect, it } from 'vitest';
import { levelRow } from '../src/sim/config';
describe('level table', () => {
  it('matches the specified rows and clamps', () => {
    expect(levelRow(0)).toEqual({ K: 3, spawnInterval: 1.5, speed: 0.85, fieldCap: 6, stepMs: 420 });
    expect(levelRow(4).K).toBe(5);
    const row = levelRow(8);
    expect(row.spawnInterval).toBeCloseTo(0.69, 2); expect(row.speed).toBeCloseTo(1.61, 2);
    expect(row.fieldCap).toBe(21); expect(row.stepMs).toBe(272);
    expect(levelRow(100)).toEqual({ K: 5, spawnInterval: 0.45, speed: 2.4, fieldCap: 28, stepMs: 220 });
  });
});
