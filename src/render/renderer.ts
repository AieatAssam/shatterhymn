import { Color, HalfFloatType, NoToneMapping, PerspectiveCamera, Scene, ShaderMaterial, SRGBColorSpace, Vector2, Vector3, WebGLRenderer } from "three";
import { BloomEffect, ChromaticAberrationEffect, EffectComposer, EffectPass, NoiseEffect, RenderPass, ToneMappingEffect, ToneMappingMode, VignetteEffect } from "postprocessing";
import { Spring1D } from "../core/spring";
import type { SimEvent, SimState } from "../sim/types";
import { Crystals } from "./crystals";
import { createBackground } from "./background";
import { createBell, createHalo } from "./bell";
import { fitCamera } from "./camera";
import { BLOOM, CAMERA_FOV, CA_MODULATION, CA_OFFSET, KEY_DIR, NOISE_OPACITY, NOTE_COLORS, PALETTE, RESIZE_DEBOUNCE_MS, VIGNETTE } from "./fxConfig";
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
  private readonly tint = [new Spring1D(0,6,1), new Spring1D(0,6,1), new Spring1D(0,6,1)];
  private readonly crystals: Crystals;
  private readonly colors = NOTE_COLORS.map(c => new Color(c));
  private readonly shared = { uTime: { value: 0 }, uKeyDir: { value: new Vector3(...KEY_DIR).normalize() }, uNoteColor: { value: new Color(NOTE_COLORS[0]) }, uNoteGlow: { value: 0 } };
  private readonly background = createBackground(this.shared); private readonly floor = createFloor(this.shared); private readonly halo = createHalo(this.shared); private readonly bell = createBell(this.shared);
  private readonly onResize = (): void => { window.clearTimeout(this.resizeTimer); this.resizeTimer = window.setTimeout(() => this.resize(), RESIZE_DEBOUNCE_MS); };
  constructor(canvas: HTMLCanvasElement, private readonly getState: () => SimState) {
    this.renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", stencil: false, depth: true, alpha: false });
    this.renderer.outputColorSpace = SRGBColorSpace; this.renderer.toneMapping = NoToneMapping; this.renderer.setClearColor(PALETTE.void0);
    this.scene.add(this.background, this.floor, this.halo, this.bell);
    this.crystals = new Crystals(this.scene, this.shared);
    this.composer = new EffectComposer(this.renderer, { frameBufferType: HalfFloatType });
    const noise = new NoiseEffect({ premultiply: true }); noise.blendMode.opacity.value = NOISE_OPACITY;
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new EffectPass(this.camera, this.bloom, new VignetteEffect(VIGNETTE), new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC })));
    this.post = new EffectPass(this.camera, new ChromaticAberrationEffect({ offset: new Vector2(CA_OFFSET, CA_OFFSET), radialModulation: true, modulationOffset: CA_MODULATION }), noise); this.composer.addPass(this.post);
    this.tier = detectTier(window.matchMedia("(pointer: coarse)").matches); this.quality = new AutoTier(this.tier); this.setTier(this.tier);
    window.addEventListener("resize", this.onResize); window.visualViewport?.addEventListener("resize", this.onResize);
  }
  event(event: SimEvent): void { this.crystals.event(event); }
  reset(): void { this.crystals.reset(); }
  frame(realDtMs: number, simDtMs: number): void {
    this.time += realDtMs / 1000; this.shared.uTime.value = this.time;
    const state = this.getState(), target = this.colors[state.dial.note]!;
    this.tint[0]!.target = target.r; this.tint[1]!.target = target.g; this.tint[2]!.target = target.b;
    const steps = Math.max(1, Math.ceil(realDtMs / 1000 / (1 / 120))); const dt = realDtMs / 1000 / steps;
    for (let i = 0; i < steps; i++) for (const spring of this.tint) spring.step(dt);
    this.shared.uNoteColor.value.setRGB(this.tint[0]!.x, this.tint[1]!.x, this.tint[2]!.x);
    this.shared.uNoteGlow.value = state.dial.holding ? Math.min(1, 0.5 + state.dial.holdMs / 2000) : 0;
    const halo = (this.halo.material as ShaderMaterial).uniforms; halo.uCurrent!.value = state.dial.note; halo.uActive!.value = state.K;
    let danger = 0; for (const c of state.crystals) if (c.alive && c.rho - c.r < 3.1) { danger = 1; break; } halo.uDanger!.value = danger;
    const bell = (this.bell.material as ShaderMaterial).uniforms; bell.uCracks!.value = state.cracks; bell.uGrace!.value = state.graceMs > 0 ? 1 : 0;
    this.crystals.update(state, simDtMs, this.time);
    const now = performance.now(); const frameTime = this.lastFrameTime === null ? 0 : now - this.lastFrameTime; this.lastFrameTime = now;
    const tier = this.quality.update(frameTime); if (tier !== this.tier) this.setTier(tier);
    this.composer.render(realDtMs / 1000);
  }
  resize(): void { const width = window.innerWidth, height = window.innerHeight; if (!width || !height) return; fitCamera(this.camera, width / height); this.renderer.setSize(width, height, false); this.composer.setSize(width, height); }
  setTier(tier: Tier): void { this.tier = tier; this.quality.tier = tier; this.renderer.setPixelRatio(tier === "low" ? 1 : Math.min(window.devicePixelRatio || 1, TIERS[tier].dpr)); this.bloom.scale = TIERS[tier].bloom; this.post.enabled = tier !== "low"; this.resize(); }
  dispose(): void {
    window.removeEventListener("resize", this.onResize); window.visualViewport?.removeEventListener("resize", this.onResize); window.clearTimeout(this.resizeTimer);
    for (const mesh of [this.background, this.floor, this.halo, this.bell]) { mesh.geometry.dispose(); const material = mesh.material as ShaderMaterial; if (mesh === this.bell) for (const name of ["uCrack0", "uCrack1", "uCrack2"]) material.uniforms[name]!.value.dispose(); material.dispose(); }
    this.crystals.dispose();
    this.composer.dispose(); this.renderer.dispose();
  }
}
