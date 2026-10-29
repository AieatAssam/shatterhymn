export const SLICE_BLADE = { windowMs: 64, minSpanMs: 32, armSps: 2.2, disarmSps: 1.414, maxCutsPerArm: 6, budget: { cap: 6 }, radius: { touch: 0.020, pen: 0.020, mouse: 0.012 }, tapMaxPathH: 0.03, trailPoints: 64 } as const;
export const BEGINNER_BLADE = { armSps: 2.2, disarmSps: 1.257 } as const;
export const SLICE_TOSS = { spawnY: -0.08, x0Frac: [0.12, 0.88], apexXFrac: [0.15, 0.85], maxVx: 0.30, gravity: { standard: 1.6, beginner: 1.35 }, apexY: { standard: [0.55, 0.88], beginner: [0.60, 0.80] }, spin: [1.2, 3.5], radius: 0.075, hitRadius: 0.085, darkRadius: 0.070, darkHitRadius: 0.040, staggerMs: 110, fallY: -0.10, maxAlive: 14 } as const;
export const SLICE_SCORE = { perCut: 10, chainCap: 10, choirChain: 5, choirFlat: 500, choirEach: 10, comboMin: 3, comboEach: 20 } as const;
export const SLICE_RULES = { maxCracks: 3, crackGraceMs: 1500, missGraceMs: { standard: 6000, beginner: 30000 }, darkFromMs: { standard: 12000, beginner: 25000 }, levelMs: 20000 } as const;
export const SLICE_WAVES = {
 standard: [
  {at:600,pattern:'fan',count:3,colours:1}, {at:2200,pattern:'cross',count:2,colours:1},
  {at:3800,pattern:'line',count:5,colours:1}, {at:5600,pattern:'fountain',count:4,colours:2},
  {at:7200,pattern:'lob',count:3,colours:1}, {at:8600,pattern:'cross',count:4,colours:2},
  {at:10000,pattern:'fan',count:5,colours:1},
 ],
 beginner: [
  {at:600,pattern:'fountain',count:1,colours:1}, {at:2200,pattern:'fan',count:3,colours:1},
  {at:3800,pattern:'cross',count:2,colours:1}, {at:5600,pattern:'line',count:5,colours:1},
  {at:7200,pattern:'fountain',count:3,colours:2}, {at:8600,pattern:'lob',count:3,colours:1},
  {at:10000,pattern:'fan',count:4,colours:2},
 ],
} as const;

export const SLICE_AIM = { lagMs: 120, bladeMinPx: { touch: 22, pen: 18, mouse: 0 }, bladeShortFrac: { touch: .055, pen: .045, mouse: 0 }, bladeMaxH: .035 } as const;
export const SLICE_EARLY = { beginner: { factor: .75, holdMs: 15000, rampMs: 10000 }, standard: { factor: .85, holdMs: 8000, rampMs: 7000 } } as const;
export function sliceEarly(profile:'beginner'|'standard',daily:boolean,elapsedMs:number):number {const c=SLICE_EARLY[profile];return daily?1:c.factor+(1-c.factor)*Math.max(0,Math.min(1,(elapsedMs-c.holdMs)/c.rampMs));}

export const SLICE_RUSH = { firstMs: { standard: 30000, beginner: 40000 }, everyMs: 60000, durationMs: 4000, warnMs: 900, spawnEveryMs: 200, pointsMult: 2 } as const;
export const SLICE_BIG = { radius: .11, hitRadius: .115, hp: 3, fromMs: { standard: 15000, beginner: 25000 }, everyMs: 25000, hitKick: .35, hitPoints: 10, breakPoints: 50 } as const;
