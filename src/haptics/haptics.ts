export type HapticId = 'ui' | 'tick' | 'dud' | 'close' | 'shatter1' | 'shatter2' | 'shatter4' | 'shell' | 'mend' | 'crack' | 'newBest' | 'choir' | 'gameOver';

export const PATTERNS: Record<HapticId, { pattern: number[]; priority: number }> = {
  ui: { pattern: [6], priority: 1 }, tick: { pattern: [8], priority: 2 },
  dud: { pattern: [10, 40, 10], priority: 3 }, close: { pattern: [6, 30, 6], priority: 4 },
  shatter1: { pattern: [14], priority: 5 }, shatter2: { pattern: [14, 30, 16], priority: 5 },
  shatter4: { pattern: [16, 24, 18, 24, 20], priority: 5 }, shell: { pattern: [10], priority: 5 },
  mend: { pattern: [10, 40, 14, 40, 18], priority: 6 },
  crack: { pattern: [20, 15, 20, 15, 20, 15, 20], priority: 7 },
  newBest: { pattern: [12, 50, 12, 50, 20], priority: 7 },
  choir: { pattern: [20, 70, 20, 50, 20, 35, 20, 22, 20, 15, 20], priority: 8 },
  gameOver: { pattern: [20, 20, 20, 40, 20, 80, 20, 140, 20], priority: 9 },
};

export class Haptics {
  enabled = true;
  readonly supported: boolean;
  readonly iosSwitch: boolean;
  private busyUntil = 0;
  private priority = 0;
  private readonly last = new Map<HapticId, number>();
  constructor(private readonly env: { vibrate?: (p: number[]) => boolean; now: () => number; isIOS: boolean }) {
    this.supported = typeof env.vibrate === 'function';
    this.iosSwitch = !this.supported && env.isIOS;
  }
  play(id: HapticId): void {
    if (!this.enabled || !this.env.vibrate) return;
    const now = this.env.now(), entry = PATTERNS[id], last = this.last.get(id);
    if ((last !== undefined && now - last < 50) || (now < this.busyUntil && entry.priority < this.priority)) return;
    this.env.vibrate(entry.pattern);
    this.last.set(id, now);
    this.priority = entry.priority;
    this.busyUntil = now + entry.pattern.reduce((sum, ms) => sum + ms, 0);
  }
}

export function hapticForStrike(n: number): HapticId {
  return n <= 1 ? 'shatter1' : n <= 3 ? 'shatter2' : 'shatter4';
}
