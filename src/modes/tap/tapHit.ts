export interface TapCandidate { id:number; note:number; sx:number; sy:number }
/** R1 uses a fixed 48 CSS pixel radius. */
export function nearestCrystal(candidates: readonly TapCandidate[], x:number, y:number): TapCandidate | null {
 let winner:TapCandidate|null=null, distance=48;
 for(const candidate of candidates){const d=Math.hypot(candidate.sx-x,candidate.sy-y);if(d<=distance){distance=d;winner=candidate;}}
 return winner;
}
