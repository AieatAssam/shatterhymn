import { describe, expect, it } from 'vitest';
import { levelRow } from '../src/sim/config';
describe('level table', () => {
  it('matches the specified rows and clamps', () => {
    expect(levelRow(0)).toEqual({ K: 3, spawnInterval: 1.3, speed: 0.9, fieldCap: 9 });
    expect(levelRow(1)).toEqual({ K: 3, spawnInterval: 1.2, speed: 1, fieldCap: 10 });
    expect(levelRow(2)).toEqual({ K: 4, spawnInterval: 1.1, speed: 1.1, fieldCap: 11 });
    expect(levelRow(4).K).toBe(5);
    const row = levelRow(8);
    expect(row.spawnInterval).toBeCloseTo(0.69, 2); expect(row.speed).toBeCloseTo(1.61, 2);
    expect(row.fieldCap).toBe(21); expect(row).not.toHaveProperty("stepMs");
    expect(levelRow(100)).toEqual({ K: 5, spawnInterval: 0.45, speed: 2.4, fieldCap: 28 });
  });
});
