import { BufferAttribute, BufferGeometry, Color, Mesh, ShaderMaterial, Vector2, Vector4, WebGLRenderTarget, WebGLRenderer, Scene, Camera, HalfFloatType } from "three";
import { NOTE_COLORS, PALETTE } from "./fxConfig";
import { vertex, fragment, bakeFragment } from "./shaders/background";
export function createBackground(shared: Record<string, { value: unknown }>): Mesh {
  const geometry = new BufferGeometry(); geometry.setAttribute("position", new BufferAttribute(new Float32Array([-1,-1,0, 3,-1,0, -1,3,0]), 3));
  const material = new ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, depthTest: false, depthWrite: false, uniforms: { ...shared, uBake: { value: null }, uStrikeNote: { value: -1 }, uStrikeAge: { value: 10 }, uChoir: { value: 0 }, uRealTime: { value: 0 }, uAspect: { value: 1 }, uBell: { value: new Vector2(.5,.5) }, uRose: { value: 0 }, uWarnNote: { value: -1 }, uNotes: { value: NOTE_COLORS.map(c => new Color(c)) }, uShaftCount: { value: 0 }, uTitle: { value: 0 }, uShafts: { value: Array.from({length:6}, () => new Vector4()) }, uVoid0: { value: new Color(PALETTE.void0) }, uVoid1: { value: new Color(PALETTE.void1) }, uVoid2: { value: new Color(PALETTE.void2) }, uFog: { value: new Color(PALETTE.fog) }, uBeam: { value: new Color(PALETTE.beam) } } });
  const mesh = new Mesh(geometry, material); mesh.frustumCulled = false; mesh.renderOrder = -100; return mesh;
}

export function bakeBackground(renderer: WebGLRenderer, background: Mesh, target: WebGLRenderTarget, camera: Camera, width: number, height: number, scale: number, octaves: number): void {
  target.setSize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
  const material = background.material as ShaderMaterial;
  const bake = new ShaderMaterial({ vertexShader: vertex, fragmentShader: bakeFragment, uniforms: material.uniforms, defines: { OCTAVES: octaves }, depthTest: false, depthWrite: false });
  const scene = new Scene(); const mesh = new Mesh(background.geometry, bake); mesh.frustumCulled = false; scene.add(mesh);
  const previous = renderer.getRenderTarget(); renderer.setRenderTarget(target); renderer.render(scene, camera); renderer.setRenderTarget(previous);
  material.uniforms.uBake!.value = target.texture; bake.dispose();
}
export function createBackgroundTarget(): WebGLRenderTarget { return new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthBuffer: false }); }
