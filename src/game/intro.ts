export const INTRO = { handMs: 450, autoMs: 2400, autoMinMs: 1200, autoAbsMaxMs: 3300,
 titleAfterStrikeMs: 1100, titleMinMs: 1800, titleAbsMaxMs: 4400, minShowMs: 1000 } as const;

export class IntroTimeline {
 elapsed = 0; struckAt: number | null = null; skipped = false;
 constructor(readonly hold = false, readonly startAbsMs = 0) {}
 touch(): boolean {
  if (this.hold) return false;
  this.skipped = true;
  if (this.struckAt !== null) return false;
  this.struckAt = Math.max(300, this.elapsed);
  return true;
 }
 advance(dt: number): { auto: boolean; title: boolean } {
  this.elapsed = Math.min(this.hold ? 1200 : Infinity, this.elapsed + dt);
  if (this.hold) return {auto: false, title: false};
  const cap = this.startAbsMs + this.elapsed >= Math.max(INTRO.titleAbsMaxMs, this.startAbsMs + INTRO.minShowMs);
  const autoAt = Math.max(INTRO.autoMinMs, Math.min(INTRO.autoMs, INTRO.autoAbsMaxMs - this.startAbsMs));
  const auto = this.struckAt === null && (this.elapsed >= autoAt || cap);
  if (auto) this.struckAt = this.elapsed;
  return {auto, title: this.skipped || cap || (this.struckAt !== null && this.elapsed >= Math.max(INTRO.titleMinMs, this.struckAt + INTRO.titleAfterStrikeMs))};
 }
}
