import { describe, expect, it } from 'vitest';
import { Rng, hash32, seedToHex, hexToSeed } from '../src/core/rng';

describe('Rng', () => {
  it('repeats a seeded sequence', () => {
    const a = new Rng(1), b = new Rng(1);
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(Array.from({ length: 5 }, () => b.next()));
  });
  it('hashes strings stably', () => { expect(hash32('abc')).toBe(0x1cc93dbc); expect(hash32('abc')).not.toBe(hash32('abd')); });
  it('draws uniform bounded integers', () => {
    const rng = new Rng(1), counts = [0, 0, 0, 0, 0];
    for (let i = 0; i < 10000; i++) { const n = rng.int(5); expect(n).toBeGreaterThanOrEqual(0); expect(n).toBeLessThan(5); counts[n]!++; }
    expect(counts.every(n => n >= 1800)).toBe(true);
  });
  it('shuffles in place as a permutation', () => {
    const values = [1, 2, 3, 4, 5]; expect(new Rng(1).shuffle(values)).toBe(values); expect([...values].sort()).toEqual([1, 2, 3, 4, 5]);
  });
  it('converts seeds', () => { expect(seedToHex(0x3f9a12c0)).toBe('3F9A12C0'); expect(hexToSeed('zz')).toBeNull(); expect(hexToSeed('3F9A12C0')).toBe(0x3f9a12c0); });
});
