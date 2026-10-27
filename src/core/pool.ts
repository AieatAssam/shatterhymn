export class Pool<T> {
  private readonly items: T[];
  private readonly free: number[];
  private readonly indices = new Map<T, number>();
  private readonly available: boolean[];
  constructor(size: number, create: (index: number) => T) {
    this.items = Array.from({ length: size }, (_, i) => create(i));
    this.free = Array.from({ length: size }, (_, i) => size - i - 1);
    this.available = Array<boolean>(size).fill(true);
    this.items.forEach((item, i) => this.indices.set(item, i));
  }
  acquire(): T | null {
    const index = this.free.pop();
    if (index === undefined) return null;
    this.available[index] = false;
    return this.items[index]!;
  }
  release(item: T): void {
    const index = this.indices.get(item);
    if (index === undefined || this.available[index]) return;
    this.available[index] = true;
    this.free.push(index);
  }
  clear(): void {
    this.free.length = 0;
    for (let i = this.items.length - 1; i >= 0; i--) { this.available[i] = true; this.free.push(i); }
  }
}
