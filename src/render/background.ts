import { BufferAttribute, BufferGeometry, Color, Mesh, ShaderMaterial, Vector2, Vector4 } from "three";
import { NOTE_COLORS, PALETTE } from "./fxConfig";
import { vertex, fragment } from "./shaders/background";
export function createBackground(shared: Record<string, { value: unknown }>): Mesh {
  const geometry = new BufferGeometry(); geometry.setAttribute("position", new BufferAttribute(new Float32Array([-1,-1,0, 3,-1,0, -1,3,0]), 3));
  const material = new ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, depthTest: false, depthWrite: false, uniforms: { ...shared, uChoir: { value: 0 }, uRealTime: { value: 0 }, uAspect: { value: 1 }, uBell: { value: new Vector2(.5,.5) }, uRose: { value: 0 }, uWarnNote: { value: -1 }, uNotes: { value: NOTE_COLORS.map(c => new Color(c)) }, uShafts: { value: Array.from({length:6}, () => new Vector4()) }, uVoid0: { value: new Color(PALETTE.void0) }, uVoid1: { value: new Color(PALETTE.void1) }, uVoid2: { value: new Color(PALETTE.void2) }, uFog: { value: new Color(PALETTE.fog) }, uBeam: { value: new Color(PALETTE.beam) } } });
  const mesh = new Mesh(geometry, material); mesh.frustumCulled = false; mesh.renderOrder = -100; return mesh;
}
