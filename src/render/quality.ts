export type Tier = "high" | "medium" | "low";
export const TIERS = { high: { dpr: 2, shards: 1600, sparks: 400, bloom: 0.5 }, medium: { dpr: 1.25, shards: 1000, sparks: 300, bloom: 0.5 }, low: { dpr: 1, shards: 600, sparks: 160, bloom: 0.35 } } as const;
export const LOW_SUB = { dpr: 0.85, bloom: 0.3, thresholdMs: 40, frames: 30, bakeScale: 1.0, luminanceThreshold: 0.72 } as const;
export function detectTier(coarse: boolean): Tier { return coarse ? "medium" : "high"; }
export class AutoTier {
  private readonly frames = new Float32Array(90); private count = 0; private index = 0; private total = 0; private elapsed = 0; private lastChange = -3000; private fastMs = 0; private lowered = false; private raised = false;
  private readonly recent = new Float32Array(LOW_SUB.frames); private recentIndex = 0; private recentCount = 0; private recentTotal = 0; lowSub = false;
  constructor(public tier: Tier) {}
  update(dt: number): Tier {
    this.elapsed += dt;
    if (this.elapsed <= 2000 || dt > 250 || dt <= 0) { this.fastMs = 0; return this.tier; }
    if (this.recentCount === LOW_SUB.frames) this.recentTotal -= this.recent[this.recentIndex]!; else this.recentCount++;
    this.recent[this.recentIndex] = dt; this.recentTotal += dt; this.recentIndex = (this.recentIndex + 1) % LOW_SUB.frames;
    if (this.tier === "low" && this.recentCount === LOW_SUB.frames && this.recentTotal / LOW_SUB.frames > LOW_SUB.thresholdMs) this.lowSub = true;
    if (this.count === 90) this.total -= this.frames[this.index]!; else this.count++;
    this.frames[this.index] = dt; this.total += dt; this.index = (this.index + 1) % 90;
    if (this.count === 30 && this.total / 30 > 40 && this.tier !== "low") { this.tier = this.tier === "high" ? "medium" : "low"; this.lowered = true; this.lastChange = this.elapsed; }
    if (this.count < 90) return this.tier;
    const mean = this.total / 90;
    this.fastMs = mean < 11 ? this.fastMs + dt : 0;
    if (mean > 19 && this.elapsed - this.lastChange >= 3000 && this.tier !== "low") {
      this.tier = this.tier === "high" ? "medium" : "low"; this.lowered = true; this.lastChange = this.elapsed; this.fastMs = 0;
    } else if (this.fastMs >= 6000 && this.lowered && !this.raised && this.tier !== "high") {
      this.tier = this.tier === "low" ? "medium" : "high"; this.raised = true; this.lastChange = this.elapsed; this.fastMs = 0;
    }
    return this.tier;
  }
}
