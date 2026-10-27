function lattice(seed: number, i: number): number {
  let h = (seed ^ Math.imul(i, 0x9e3779b1)) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 0xffffffff * 2 - 1;
}
export function valueNoise1D(seed: number, x: number): number {
  const i = Math.floor(x), t = x - i, smooth = t * t * (3 - 2 * t);
  const a = lattice(seed, i), b = lattice(seed, i + 1);
  return a + (b - a) * smooth;
}
