import { CanvasTexture, Color, DoubleSide, LatheGeometry, Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from "three";
import { BELL_PROFILE, BELL_SEGMENTS, BELL_Z, NOTE_COLORS, PALETTE } from "./fxConfig";
import * as bellShader from "./shaders/bell";
import * as haloShader from "./shaders/halo";
function crackTexture(seed: number): CanvasTexture {
  const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is unavailable");
  let n = seed; const random = (): number => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; };
  ctx.strokeStyle = "white"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
  let x = 65 + seed * 40, y = 245; ctx.beginPath(); ctx.moveTo(x,y);
  for (let i = 0; i < 8; i++) { const oldX = x, oldY = y; x += (random()-0.5)*28; y -= 23 + random()*5; ctx.lineTo(x,y); if (i === 2 || i === 4 || i === 6) { ctx.moveTo(oldX,oldY); ctx.lineTo(oldX+(random()-0.5)*55,oldY-22); ctx.moveTo(x,y); } }
  ctx.stroke(); return new CanvasTexture(canvas);
}
export function createBell(shared: Record<string, { value: unknown }>): Mesh {
  const geometry = new LatheGeometry(BELL_PROFILE.map(([x,y]) => new Vector2(x,y)), BELL_SEGMENTS); geometry.rotateX(-Math.PI / 2);
  const material = new ShaderMaterial({ vertexShader: bellShader.vertex, fragmentShader: bellShader.fragment, side: DoubleSide, transparent: true, depthWrite: false, uniforms: { ...shared, uGlass: { value: new Color(PALETTE.glass) }, uRim: { value: new Color(PALETTE.glassRim) }, uCrackColor: { value: new Color(PALETTE.crack) }, uMendColor: { value: new Color(PALETTE.mend) }, uCracks: { value: 0 }, uGrace: { value: 0 }, uMend: { value: 0 }, uMendTime: { value: 0 }, uCrack0: { value: crackTexture(1) }, uCrack1: { value: crackTexture(2) }, uCrack2: { value: crackTexture(3) } } });
  const mesh = new Mesh(geometry, material); mesh.position.z = BELL_Z; return mesh;
}
export function createHalo(shared: Record<string, { value: unknown }>): Mesh {
  const material = new ShaderMaterial({ vertexShader: haloShader.vertex, fragmentShader: haloShader.fragment, transparent: true, depthWrite: false, uniforms: { ...shared, uInk: { value: new Color(PALETTE.ink) }, uCrackColor: { value: new Color(PALETTE.crack) }, uNotes: { value: NOTE_COLORS.map(color => new Color(color)) }, uDanger: { value: 0 }, uActive: { value: 3 }, uCurrent: { value: 0 } } });
  const mesh = new Mesh(new PlaneGeometry(5,5), material); mesh.position.z = 0.01; return mesh;
}
