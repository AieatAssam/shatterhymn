import { BufferAttribute, BufferGeometry, Color, Mesh, ShaderMaterial } from "three";
import { PALETTE } from "./fxConfig";
import { vertex, fragment } from "./shaders/background";
export function createBackground(shared: Record<string, { value: unknown }>): Mesh {
  const geometry = new BufferGeometry(); geometry.setAttribute("position", new BufferAttribute(new Float32Array([-1,-1,0, 3,-1,0, -1,3,0]), 3));
  const material = new ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, depthTest: false, depthWrite: false, uniforms: { ...shared, uChoir: { value: 0 }, uVoid0: { value: new Color(PALETTE.void0) }, uVoid1: { value: new Color(PALETTE.void1) }, uVoid2: { value: new Color(PALETTE.void2) }, uFog: { value: new Color(PALETTE.fog) }, uBeam: { value: new Color(PALETTE.beam) } } });
  const mesh = new Mesh(geometry, material); mesh.frustumCulled = false; mesh.renderOrder = -100; return mesh;
}
