import { Color, HalfFloatType, NoToneMapping, PerspectiveCamera, Scene, ShaderMaterial, SRGBColorSpace, Vector2, Vector3, WebGLRenderer } from "three";
import { BloomEffect, ChromaticAberrationEffect, EffectComposer, EffectPass, NoiseEffect, RenderPass, ToneMappingEffect, ToneMappingMode, VignetteEffect } from "postprocessing";
import { Loop } from "../core/loop";
import { createBackground } from "./background";
import { createBell, createHalo } from "./bell";
import { fitCamera } from "./camera";
import { BLOOM, CAMERA_FOV, CA_MODULATION, CA_OFFSET, IDLE_HZ, KEY_DIR, NOISE_OPACITY, NOTE_COLORS, PALETTE, RESIZE_DEBOUNCE_MS, VIGNETTE } from "./fxConfig";
import { createFloor } from "./floor";
import { AutoTier, detectTier, TIERS, type Tier } from "./quality";
class TierBloomEffect extends BloomEffect {
  scale: number = BLOOM.resolutionScale;
  override setSize(width: number, height: number): void {
    super.setSize(width, height);
    this.mipmapBlurPass.setSize(Math.max(1, Math.round(width * this.scale)), Math.max(1, Math.round(height * this.scale)));
  }
}
export class GameRenderer {
  private readonly renderer: WebGLRenderer; private readonly composer: EffectComposer; private readonly scene = new Scene(); private readonly camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 1000);
  private readonly bloom = new TierBloomEffect(BLOOM); private readonly post: EffectPass; private readonly quality: AutoTier; private tier: Tier; private resizeTimer: number | undefined; private time = 0; private lastFrameTime: number | null = null;
  private readonly colors = NOTE_COLORS.map(c => new Color(c));
  private readonly shared = { uTime: { value: 0 }, uKeyDir: { value: new Vector3(...KEY_DIR).normalize() }, uNoteColor: { value: new Color(NOTE_COLORS[0]) }, uNoteGlow: { value: 0 } };
  private readonly background = createBackground(this.shared); private readonly floor = createFloor(this.shared); private readonly halo = createHalo(this.shared); private readonly bell = createBell(this.shared);
  private readonly onResize = (): void => { window.clearTimeout(this.resizeTimer); this.resizeTimer = window.setTimeout(() => this.resize(), RESIZE_DEBOUNCE_MS); };
  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", stencil: false, depth: true, alpha: false });
    this.renderer.outputColorSpace = SRGBColorSpace; this.renderer.toneMapping = NoToneMapping; this.renderer.setClearColor(PALETTE.void0);
    this.scene.add(this.background, this.floor, this.halo, this.bell);
    this.composer = new EffectComposer(this.renderer, { frameBufferType: HalfFloatType });
    const noise = new NoiseEffect({ premultiply: true }); noise.blendMode.opacity.value = NOISE_OPACITY;
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new EffectPass(this.camera, this.bloom, new VignetteEffect(VIGNETTE), new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC })));
    this.post = new EffectPass(this.camera, new ChromaticAberrationEffect({ offset: new Vector2(CA_OFFSET, CA_OFFSET), radialModulation: true, modulationOffset: CA_MODULATION }), noise); this.composer.addPass(this.post);
    this.tier = detectTier(window.matchMedia("(pointer: coarse)").matches); this.quality = new AutoTier(this.tier); this.setTier(this.tier);
    window.addEventListener("resize", this.onResize); window.visualViewport?.addEventListener("resize", this.onResize);
  }
  frame(realDtMs: number): void {
    this.time += realDtMs / 1000; this.shared.uTime.value = this.time;
    const phase = this.time * IDLE_HZ; const note = Math.floor(phase) % 3; const blend = phase - Math.floor(phase);
    this.shared.uNoteColor.value.copy(this.colors[note]!).lerp(this.colors[(note + 1) % 3]!, blend);
    this.shared.uNoteGlow.value = 0.5 + 0.5 * Math.sin(this.time * Math.PI * 2 * IDLE_HZ);
    (this.halo.material as ShaderMaterial).uniforms.uCurrent!.value = note;
    const now = performance.now(); const frameTime = this.lastFrameTime === null ? 0 : now - this.lastFrameTime; this.lastFrameTime = now;
    const tier = this.quality.update(frameTime); if (tier !== this.tier) this.setTier(tier);
    this.composer.render(realDtMs / 1000);
  }
  resize(): void { const width = window.innerWidth, height = window.innerHeight; if (!width || !height) return; fitCamera(this.camera, width / height); this.renderer.setSize(width, height, false); this.composer.setSize(width, height); }
  setTier(tier: Tier): void { this.tier = tier; this.quality.tier = tier; this.renderer.setPixelRatio(tier === "low" ? 1 : Math.min(window.devicePixelRatio || 1, TIERS[tier].dpr)); this.bloom.scale = TIERS[tier].bloom; this.post.enabled = tier !== "low"; this.resize(); }
  dispose(): void {
    window.removeEventListener("resize", this.onResize); window.visualViewport?.removeEventListener("resize", this.onResize); window.clearTimeout(this.resizeTimer);
    for (const mesh of [this.background, this.floor, this.halo, this.bell]) { mesh.geometry.dispose(); const material = mesh.material as ShaderMaterial; if (mesh === this.bell) for (const name of ["uCrack0", "uCrack1", "uCrack2"]) material.uniforms[name]!.value.dispose(); material.dispose(); }
    this.composer.dispose(); this.renderer.dispose();
  }
}
export function startArena(canvas: HTMLCanvasElement): Loop { const renderer = new GameRenderer(canvas); const loop = new Loop({ now: () => performance.now(), tick: () => {}, frame: (real) => renderer.frame(real) }); loop.start(); return loop; }
