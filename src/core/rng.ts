export function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}
export class Rng {
  constructor(public state: number) { this.state = state >>> 0; }
  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a: number, b: number): number { return a + (b - a) * this.next(); }
  int(n: number): number { return Math.floor(this.next() * n); }
  sign(): 1 | -1 { return this.next() < 0.5 ? -1 : 1; }
  chance(p: number): boolean { return this.next() < p; }
  pick<T>(arr: readonly T[]): T { return arr[this.int(arr.length)]!; }
  weighted<T>(items: readonly { item: T; w: number }[]): T {
    const total = items.reduce ( (sum, entry) => sum + entry.w, 0);
    let roll = this.next() * total;
    for (const entry of items) { roll -= entry.w; if (roll < 0) return entry.item; }
    return items[items.length - 1]!.item;
  }
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) { const j = this.int(i + 1); [arr[i], arr[j]] = [arr[j]!, arr[i]!]; }
    return arr;
  }
}
export function seedToHex(seed: number): string { return (seed >>> 0).toString(16).toUpperCase().padStart(8, '0'); }
export function hexToSeed(hex: string): number | null { return /^[0-9a-fA-F]{8}$/.test(hex) ? Number.parseInt(hex, 16) : null; }
export function randomSeed(): number { return crypto.getRandomValues(new Uint32Array(1))[0]!; }
