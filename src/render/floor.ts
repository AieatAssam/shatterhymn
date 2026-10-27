import { AdditiveBlending, Color, Mesh, PlaneGeometry, ShaderMaterial, Vector4 } from "three";
import { FLOOR_RADIUS, PALETTE } from "./fxConfig";
import { vertex, fragment } from "./shaders/floor";
export function createFloor(shared: Record<string, { value: unknown }>): Mesh {
  return new Mesh(new PlaneGeometry(FLOOR_RADIUS * 2, FLOOR_RADIUS * 2), new ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, transparent: true, blending: AdditiveBlending, depthWrite: false, uniforms: { ...shared, uFloorLine: { value: new Color(PALETTE.floorLine) }, uRingFlash: { value: new Vector4() }, uAttract: { value: 0 }, uSweep: { value: -1 }, uReducedMotion: { value: 0 } } }));
}
