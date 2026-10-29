import { Shape } from "three";
/** The five note outlines, centred and with unit circumradius. */
export function glyphShape(note: number): Shape {
  const shape = new Shape(); const points = note === 0 ? 3 : note === 1 ? 4 : note === 2 ? 6 : note === 3 ? 10 : note === 5 ? 16 : 24;
  for (let i = 0; i < points; i++) { const angle = Math.PI / 2 + i * Math.PI * 2 / points; const radius = note === 3 && i % 2 ? 0.45 : note === 5 && i % 2 ? 0.55 : 1; const x = Math.cos(angle) * radius * (note === 1 ? 0.68 : 1), y = Math.sin(angle) * radius; if (i === 0) shape.moveTo(x,y); else shape.lineTo(x,y); }
  shape.closePath(); return shape;
}

/** A shard silhouette shared by the results reward and the rendered glyphs. */
export function shardGlyphSvg(): string {
  const points = glyphShape(1).getPoints().map(p => `${12 + p.x * 10},${12 - p.y * 10}`).join(" ");
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><polygon fill="currentColor" points="${points}"/></svg>`;
}
