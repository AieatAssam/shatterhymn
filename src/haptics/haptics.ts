import { SLICE_FX } from '../render/fxConfig';
const SLICE_HAPTICS = SLICE_FX.rescue.haptics;
export type HapticId = 'slice1' | 'slice2' | 'slice3' | 'slice4' | 'combo' | 'fever' | 'ui' | 'tick' | 'shatter1' | 'shatter2' | 'shatter4' | 'shell' | 'mend' | 'crack' | 'newBest' | 'choir' | 'gameOver';

export const PATTERNS: Record<HapticId, { pattern: number[]; priority: number }> = {
  slice1:{pattern:[SLICE_HAPTICS.slice[0]],priority:4},slice2:{pattern:[SLICE_HAPTICS.slice[1]],priority:4},slice3:{pattern:[SLICE_HAPTICS.slice[2]],priority:4},slice4:{pattern:[SLICE_HAPTICS.slice[3]],priority:4},combo:{pattern:[...SLICE_HAPTICS.combo],priority:6},
  shatter1: { pattern: [10], priority: 5 }, shatter2: { pattern: [14], priority: 5 }, shatter4: { pattern: [18], priority: 5 },
  choir: { pattern: [22, 60, 18], priority: 8 }, crack: { pattern: [26], priority: 7 },
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
  play(id: HapticId, extraMs = 0): void {
    if (!this.enabled || !this.supported || !this.env.vibrate) return;
    const now = this.env.now(), entry = PATTERNS[id], last = this.last.get(id);
    if ((last !== undefined && now - last < 50) || (now < this.busyUntil && entry.priority < this.priority)) return;
    const pattern = extraMs ? [Math.min(SLICE_HAPTICS.cap,entry.pattern[0]! + extraMs), ...entry.pattern.slice(1)] : entry.pattern;
    this.env.vibrate(pattern);
    this.last.set(id, now);
    this.priority = entry.priority;
    this.busyUntil = now + pattern.reduce((sum, ms) => sum + ms, 0);
  }
}

export function hapticForStrike(n: number): HapticId {
  return n <= 1 ? 'shatter1' : n <= 3 ? 'shatter2' : 'shatter4';
}

export function hapticForSlice(k:number):HapticId {return k<=1?"slice1":k===2?"slice2":k===3?"slice3":"slice4";}
