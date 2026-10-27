import { Color, Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { FLOOR_RADIUS, PALETTE } from "./fxConfig";
import { vertex, fragment } from "./shaders/floor";
export function createFloor(shared: Record<string, { value: unknown }>): Mesh {
  return new Mesh(new PlaneGeometry(FLOOR_RADIUS * 2, FLOOR_RADIUS * 2), new ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, transparent: true, depthWrite: false, uniforms: { ...shared, uFloorLine: { value: new Color(PALETTE.floorLine) }, uSweep: { value: -1 }, uReducedMotion: { value: 0 } } }));
}
