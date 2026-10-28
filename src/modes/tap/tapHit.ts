import { TAP_HIT } from '../../sim/config';
export interface TapCandidate { id:number; note:number; sx:number; sy:number; visPx:number; rho:number }
export function pickCrystal(cands: readonly TapCandidate[], x:number, y:number, groupCount:(note:number)=>number): number | null {
 let winner: TapCandidate | null = null, best = Infinity;
 for (const c of cands) { const hit = Math.max(TAP_HIT.minPx,TAP_HIT.scale*c.visPx), distance = Math.hypot(c.sx-x,c.sy-y); if (distance > hit) continue; const d = distance/hit;
  if (!winner || d < best-TAP_HIT.tieEps || (Math.abs(d-best)<=TAP_HIT.tieEps && (groupCount(c.note)>groupCount(winner.note) || (groupCount(c.note)===groupCount(winner.note) && (c.rho<winner.rho || (c.rho===winner.rho && c.id<winner.id)))))) {winner=c;best=d;}
 } return winner?.id ?? null;
}
