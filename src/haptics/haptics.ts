export type HapticId = 'fever' | 'ui' | 'tick' | 'dud' | 'shatter1' | 'shatter2' | 'shatter4' | 'shell' | 'mend' | 'crack' | 'newBest' | 'choir' | 'gameOver';

export const PATTERNS: Record<HapticId, { pattern: number[]; priority: number }> = {
  shatter1: { pattern: [10], priority: 5 }, shatter2: { pattern: [14], priority: 5 }, shatter4: { pattern: [18], priority: 5 },
  choir: { pattern: [22, 60, 18], priority: 8 }, dud: { pattern: [28], priority: 3 }, crack: { pattern: [26], priority: 7 },
  fever: { pattern: [12, 40, 16], priority: 5 }, mend: { pattern: [10, 40, 14], priority: 6 }, shell: { pattern: [8], priority: 5 },
  ui: { pattern: [6], priority: 1 }, tick: { pattern: [8], priority: 2 }, newBest: { pattern: [12, 50, 18], priority: 7 },
  gameOver: { pattern: [20, 40, 20, 80, 24], priority: 9 },
};

export class Haptics {
  enabled = true;
  readonly supported: boolean;
  readonly iosSwitch: boolean;
  private busyUntil = 0;
  private priority = 0;
  private readonly last = new Map<HapticId, number>();
  constructor(private readonly env: { vibrate?: (p: number[]) => boolean; now: () => number; isIOS: boolean }) {
    this.supported = !env.isIOS && typeof env.vibrate === 'function';
    this.iosSwitch = !this.supported && env.isIOS;
  }
  play(id: HapticId, close = false): void {
    if (!this.enabled || !this.supported || !this.env.vibrate) return;
    const now = this.env.now(), entry = PATTERNS[id], last = this.last.get(id);
    if ((last !== undefined && now - last < 50) || (now < this.busyUntil && entry.priority < this.priority)) return;
    const pattern = close ? [entry.pattern[0]! + 4, ...entry.pattern.slice(1)] : entry.pattern;
    this.env.vibrate(pattern);
    this.last.set(id, now);
    this.priority = entry.priority;
    this.busyUntil = now + pattern.reduce((sum, ms) => sum + ms, 0);
  }
}

export function hapticForStrike(n: number): HapticId {
  return n <= 1 ? 'shatter1' : n <= 3 ? 'shatter2' : 'shatter4';
}
