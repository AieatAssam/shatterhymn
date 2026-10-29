export const BOARD = {
  skyTop: 0x1e1446, skyBottom: 0x0b2a38, glassDark: 0x1c2250, glassLight: 0x2c3a78, lead: 0x0a0716,
  ringL: [.36, .33, .30, .26], petalJitter: .035,
  shaftWarm: 0xffc89a, shaftCool: 0x9fe3ff, shaftCount: 4, shaftGain: .10, shaftSweepDeg: 6,
  shaftPeriodS: 18, shaftBreath: [.6, 1.0], shaftBreathPeriodS: 11,
  boardSat: 1.0, satMax: .55, breathPeriodS: 7, breathAmt: .08, hueDriftDeg: 12, hueDriftPeriodS: 24,
  yMaxArena: 48, yMaxShaft: 72, hubYMax: 50, crystalYMin: 120, crystalOverBoard: 2.5,
  moteColor: 0xffe6c4, moteCount: { high: 48, medium: 32, low: 16 }, moteSizePx: [2, 5], moteAlpha: .35,
  moteRiseHps: [.008, .025], moteSwayPx: 6, moteSwayPeriodS: 5, moteFadeS: 2.5, bakeScale: .5, leadSoftness: 3,
  beam: 0x9fe3ff, idleShaftGain: .015,
} as const;
export const PALETTE = { void0: 0x05040c, void1: 0x0b0920, void2: 0x151033, fog: 0x2a2163, beam: 0xb9c6ff, floorLine: 0xffe3b0, glass: 0xe8f1ff, glassRim: 0x9fd8ff, crack: 0xff3b5c, mend: 0xffd27a, ink: 0xf4f1ff } as const;
export const NOTE_COLORS = [0xff4f6e, 0xffc23f, 0x3fe0a0, 0x4fa8ff, 0xc77dff] as const;
export const KEY_DIR = [-0.35, 0.55, 0.76] as const;
export const CAMERA_FOV = 30, CAMERA_TILT = 10, ARENA_RADIUS = 10.3, ARENA_WIDTH = 0.94, ARENA_HEIGHT = 0.66;
export const FLOOR_RADIUS = 12, HALO_RADIUS = 2.0, HALO_WIDTH = 0.06;
export const BELL_PROFILE = [[0,1.30],[0.32,1.28],[0.52,1.15],[0.62,0.90],[0.66,0.55],[0.74,0.20],[0.92,-0.12],[1.08,-0.30],[1.12,-0.38],[1,-0.40]] as const;
export const BELL_SCALE = 1.3, BELL_IDLE_GLOW = 0.18, BEAM_MAX = 0.12, SHARD_HARVEST_DELAY = 1.5;
export const BELL_SEGMENTS = 48, BELL_Z = 0.9, GLASS_ALPHA = 0.18, BELL_RIM = 1.4, CRACK_GLOW = 2.2, MEND_GLOW = 1.8, MEND_SHIMMER_MS = 600;
export const BLOOM = { mipmapBlur: true, intensity: 1.45, luminanceThreshold: 0.70, luminanceSmoothing: 0.25, radius: 0.8, resolutionScale: 0.5 } as const;
export const VIGNETTE = { offset: 0.32, darkness: 0.30 } as const;
export const CA_OFFSET = 0.0006, CA_MODULATION = 0.35, NOISE_OPACITY = 0.035, RESIZE_DEBOUNCE_MS = 100;
export const LEVEL_SWEEP_MS = 900, IDLE_HZ = 0.5;

export const CRYSTAL_VIS = { far: 3.6, near: 1.9, farRho: 7, nearRho: 3 } as const;
export function crystalVisualScale(rho: number): number {
  const t = Math.min(1, Math.max(0, (rho - CRYSTAL_VIS.nearRho) / (CRYSTAL_VIS.farRho - CRYSTAL_VIS.nearRho)));
  return CRYSTAL_VIS.near + (CRYSTAL_VIS.far - CRYSTAL_VIS.near) * t * t * (3 - 2 * t);
}

export const CRYSTAL_GLOW = { poolRadius: 1.15, lowMaxRho: 8.5, shadowRadius: .9, shadowAlpha: .5 } as const;

export const SHATTER = { counts: { low: 22, medium: 30, high: 40 }, speed: 11, speedRandom: 13, drag: 1.5, size: .4, sizeRandom: .5, largeChance: .15, largeSize: 1, largeSizeRandom: .6, largeSpin: 1, largeSpinRandom: 2, life: 2.6, ringRadius: 9, ringLife: .9, fringeLife: .3, fringeOffset: .35, fringeAlpha: .6, discRadius: 6, discAlpha: .55, flashLife: .28, flashOpacity: [.12,.18,.24,.32], flashInterval: 1/3, bellDim: .35, bellDimLife: .6, shaftLife: .45 } as const;

export const TITLE_FX = { goldenScale: 1.25, orbitRadius: 1.3, sparkles: 6, poolAlpha: .55, tickSpeed: .35, discardRadius: 11.5 } as const;
export const TELL_FX = { closeScale: 1.6, closeLife: .25, goldShards: 12, ringWidth: .35, discWhite: .3 } as const;

export const FINISH = { floaterGap: 12, closeOffset: 56, closeOpaqueMs: 400, scoreMs: 600, gemBodyMax: .92, shardBodyMax: .45, shardDarkFacet: .4, beamFadePx: 80, titleSweep: 3 } as const;

export const PLAY_START = { selectedScale: 1.28, crystalMax: .85, shaftAlpha: .03, facetHi: 1.1 } as const;

export const FACE = { worriedGapU:2, worriedExitGapU:2.4, worriedExitMs:300, sliceWorriedY:.28, blinkMinMs:2500, blinkMaxMs:5500, blinkMs:140, doubleBlink:.15, doubleDelayMs:180, wakeMs:400, reducedExpressionMs:120, reducedLookMs:200 } as const;

export const SLICE_FX = { spill: { high: 14, medium: 10, low: 6 } } as const;
export function spillCount(tier: keyof typeof SLICE_FX.spill, reduced: boolean): number { return Math.ceil(SLICE_FX.spill[tier] * (reduced ? .5 : 1)); }

export const TAP_STAGE = {
  skyTop: 0x3d2c8f, skyMid: 0x6c46c0, skyBottom: 0xb8509e, skyMidY: .55,
  vignette: 0x2a1f6e, vignetteAmt: .45,
  hubCentre: 0x40307f, hubEdge: 0x4e3a9c,
  petalLight: [0x7650dc, 0x7b5ae8, 0x7650dc, 0x6e4cd0],
  petalDark: [0x6947c8, 0x6d4cd6, 0x6947c8, 0x6446c2],
  lead: 0xe0a040, leadAlpha: 1.0, leadPx: 2,
  frame: 0xe89a30, frameGlow: 0xc8642a, frameR: [.95, 1.02], frameCorePx: 3, frameGlowPx: 10, frameGlowAlpha: .35,
  shaft: 0xffc070, shaftGain: .16,
  twinkleAmt: .06, twinklePeriodS: 4.0,
  sweepColor: 0xffb050, sweepGain: .10, sweepWidthRad: .55, sweepPeriodS: 12,
  glintGain: .5, glintPeriodS: 3.0,
  frameBreath: .08, framePeriodS: 2.5,
  breathAmt: .05, hueDriftDeg: 6, hueDriftPeriodS: 24,
  gain: 1.0,
} as const;
export const CRYSTAL_EDGE = { outline: 0x1a0f2e, faceNz: [.93, .97], rim: [.94, 1.0], rimGain: .8, bodyMaxChannel: .92, bodyMaxLum: .36, poolAlpha: .20, shadowAlpha: .35 } as const;
