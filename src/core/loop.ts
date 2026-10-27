export const SIM_DT_MS = 1000 / 60;
export class Loop {
  paused = false;
  private last: number | null = null;
  private acc = 0;
  private freezeUntil = 0;
  private slowStart = 0;
  private slowHold = 0;
  private slowRamp = 0;
  private slowScale = 1;
  private raf: number | null = null;
  constructor(private readonly opts: { now: () => number; tick: () => void; frame: (realDtMs: number, simDtMs: number) => void }) {}
  get frozen(): boolean { return this.opts.now() < this.freezeUntil; }
  get timeScale(): number {
    const elapsed = this.opts.now() - this.slowStart;
    if (elapsed <= this.slowHold) return this.slowScale;
    if (this.slowRamp <= 0 || elapsed >= this.slowHold + this.slowRamp) return 1;
    return this.slowScale + (1 - this.slowScale) * (elapsed - this.slowHold) / this.slowRamp;
  }
  start(): void {
    if (this.raf !== null) return;
    this.last = this.opts.now();
    const frame = (now: number): void => { this.raf = null; this.pumpFrame(now); if (this.running) this.raf = requestAnimationFrame(frame); };
    this.running = true;
    this.raf = requestAnimationFrame(frame);
  }
  private running = false;
  stop(): void { this.running = false; if (this.raf !== null) cancelAnimationFrame(this.raf); this.raf = null; this.last = null; }
  pumpFrame(nowMs: number): void {
    const realDt = this.last === null ? 0 : Math.max(0, Math.min(100, nowMs - this.last));
    this.last = nowMs;
    const simDt = this.paused || nowMs < this.freezeUntil ? 0 : realDt * this.timeScale;
    this.acc += simDt;
    let steps = 0;
    while (this.acc >= SIM_DT_MS && steps < 5) { this.opts.tick(); this.acc -= SIM_DT_MS; steps++; if (nowMs < this.freezeUntil) { this.acc = 0; break; } }
    if (steps === 5) this.acc = 0;
    this.opts.frame(realDt, simDt);
  }
  freeze(ms: number): void {
    const oldEnd = this.freezeUntil;
    this.freezeUntil = Math.max(oldEnd, this.opts.now() + ms);
    if (this.slowStart >= oldEnd && oldEnd > this.opts.now()) this.slowStart += this.freezeUntil - oldEnd;
  }
  slowmo(scale: number, holdMs: number, rampMs: number): void {
    this.slowScale = scale; this.slowHold = holdMs; this.slowRamp = rampMs;
    this.slowStart = Math.max(this.opts.now(), this.freezeUntil);
  }
}
