export function clamp01(t: number): number { return Math.max(0, Math.min(1, t)); }
export function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
export function easeOutCubic(t: number): number { return 1 - (1 - t) ** 3; }
export function easeOutQuad(t: number): number { return 1 - (1 - t) ** 2; }
export function easeOutBack(t: number, s = 1.70158): number { return 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2; }
export function easeInOutSine(t: number): number { return -(Math.cos(Math.PI * t) - 1) / 2; }
