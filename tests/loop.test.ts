import { expect, it } from 'vitest';
import { Loop } from '../src/core/loop';
function setup() {
  let now = 0, ticks = 0, frames = 0;
  const loop = new Loop({ now: () => now, tick: () => { ticks++; }, frame: () => { frames++; } });
  loop.pumpFrame(0);
  return { loop, advance(ms: number) { now += ms; loop.pumpFrame(now); }, get ticks() { return ticks; }, get frames() { return frames; } };
}
it('runs 60 fixed ticks in a second', () => {
  const t = setup(); for (let i = 0; i < 60; i++) t.advance(1000 / 60); expect(t.ticks).toBeGreaterThanOrEqual(59); expect(t.ticks).toBeLessThanOrEqual(61);
});
it('uses the maximum freeze deadline and continues rendering', () => {
  const t = setup(); t.loop.freeze(100); t.loop.freeze(50); t.advance(50); expect(t.loop.frozen).toBe(true); expect(t.ticks).toBe(0); expect(t.frames).toBe(2); t.advance(50); expect(t.loop.frozen).toBe(false);
});
it('applies slow motion and ramps after its hold', () => {
  const t = setup(); t.loop.slowmo(0.25, 600, 250); for (let i = 0; i < 60; i++) t.advance(1000 / 60); expect(t.ticks).toBeGreaterThanOrEqual(26); expect(t.ticks).toBeLessThanOrEqual(29);
  const first = setup(); first.loop.slowmo(0.25, 600, 250); for (let i = 0; i < 15; i++) first.advance(1000 / 60); expect(first.ticks).toBeGreaterThanOrEqual(3); expect(first.ticks).toBeLessThanOrEqual(4);
});
it('defers slow motion until freeze ends', () => {
  const t = setup(); t.loop.freeze(100); t.loop.slowmo(0.25, 600, 250); t.advance(50); expect(t.loop.timeScale).toBe(0.25); t.advance(50); expect(t.loop.timeScale).toBe(0.25);
});
it('pauses ticks but still renders', () => { const t = setup(); t.loop.paused = true; t.advance(100); expect(t.ticks).toBe(0); expect(t.frames).toBe(2); });
it('limits catch-up after a frame gap', () => { const t = setup(); t.advance(500); expect(t.ticks).toBeLessThanOrEqual(5); });
