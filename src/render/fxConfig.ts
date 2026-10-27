export const PALETTE = { void0: 0x05040c, void1: 0x0b0920, void2: 0x151033, fog: 0x2a2163, beam: 0xb9c6ff, floorLine: 0x3b3480, glass: 0xe8f1ff, glassRim: 0x9fd8ff, crack: 0xff3b5c, mend: 0xffd27a, ink: 0xf4f1ff } as const;
export const NOTE_COLORS = [0xff4f6e, 0xffc23f, 0x3fe0a0, 0x4fa8ff, 0xc77dff] as const;
export const KEY_DIR = [-0.35, 0.55, 0.76] as const;
export const CAMERA_FOV = 30, CAMERA_TILT = 10, ARENA_RADIUS = 10.3, ARENA_WIDTH = 0.94, ARENA_HEIGHT = 0.66;
export const FLOOR_RADIUS = 12, HALO_RADIUS = 2.0, HALO_WIDTH = 0.06;
export const BELL_PROFILE = [[0,1.30],[0.32,1.28],[0.52,1.15],[0.62,0.90],[0.66,0.55],[0.74,0.20],[0.92,-0.12],[1.08,-0.30],[1.12,-0.38],[1,-0.40]] as const;
export const BELL_SCALE = 1.3, BELL_IDLE_GLOW = 0.18, BEAM_MAX = 0.12, SHARD_HARVEST_DELAY = 1.5;
export const BELL_SEGMENTS = 48, BELL_Z = 0.9, GLASS_ALPHA = 0.18, BELL_RIM = 1.4, CRACK_GLOW = 2.2, MEND_GLOW = 1.8, MEND_SHIMMER_MS = 600;
export const BLOOM = { mipmapBlur: true, intensity: 1.45, luminanceThreshold: 0.62, luminanceSmoothing: 0.25, radius: 0.8, resolutionScale: 0.5 } as const;
export const VIGNETTE = { offset: 0.32, darkness: 0.68 } as const;
export const CA_OFFSET = 0.0006, CA_MODULATION = 0.35, NOISE_OPACITY = 0.035, RESIZE_DEBOUNCE_MS = 100;
export const LEVEL_SWEEP_MS = 900, IDLE_HZ = 0.5;

export const CRYSTAL_VIS = { far: 3.6, near: 1.9, farRho: 7, nearRho: 3 } as const;
export function crystalVisualScale(rho: number): number {
  const t = Math.min(1, Math.max(0, (rho - CRYSTAL_VIS.nearRho) / (CRYSTAL_VIS.farRho - CRYSTAL_VIS.nearRho)));
  return CRYSTAL_VIS.near + (CRYSTAL_VIS.far - CRYSTAL_VIS.near) * t * t * (3 - 2 * t);
}

export const CRYSTAL_GLOW = { poolRadius: 1.15, lowMaxRho: 8.5, shadowRadius: .9, shadowAlpha: .5 } as const;

export const SHATTER = { counts: { low: 22, medium: 30, high: 40 }, speed: 11, speedRandom: 13, drag: 1.5, size: .4, sizeRandom: .5, largeChance: .15, largeSize: 1, largeSizeRandom: .6, largeSpin: 1, largeSpinRandom: 2, life: 2.6, ringRadius: 9, ringLife: .9, fringeLife: .3, fringeOffset: .35, fringeAlpha: .6, discRadius: 6, discAlpha: .55, flashLife: .35, flashOpacity: [.3,.45,.6,.75], flashInterval: 1/3, bellDim: .35, bellDimLife: .6, shaftLife: 1.2 } as const;

export const TITLE_FX = { goldenScale: 1.25, orbitRadius: 1.3, sparkles: 6, poolAlpha: .55, tickSpeed: .35, discardRadius: 11.5 } as const;
export const TELL_FX = { closeScale: 1.6, closeLife: .25, goldShards: 12, ringWidth: .35, discWhite: .3 } as const;

export const FINISH = { floaterGap: 12, closeOffset: 56, closeOpaqueMs: 400, scoreMs: 600, gemBodyMax: .55, shardBodyMax: .45, shardDarkFacet: .4, beamFadePx: 80, titleSweep: 3 } as const;

export const PLAY_START = { rose: .055, rosePeriod: 7.0, roseBreath: .08, selectedScale: 1.28, crystalMax: .85, shaftAlpha: .03, facetHi: 1.1 } as const;
