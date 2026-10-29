import { TAP_HIT, TARGETABLE_R } from '../../sim/config';
import type { Crystal } from '../../sim/types';
export type PointerKind = 'touch' | 'pen' | 'mouse';
export interface TapCandidate { id:number; note:number; sx:number; sy:number; visPx:number; rho:number }
export function tapHitPx(visPx:number, pointer:PointerKind, shortSidePx:number):number { return Math.max(Math.max(TAP_HIT.minPx[pointer],Math.min(TAP_HIT.maxPx[pointer],TAP_HIT.shortFrac[pointer]*shortSidePx)),TAP_HIT.scale[pointer]*visPx); }
export function tapCandidates(crystals:readonly Crystal[], project:(x:number,y:number)=>{sx:number;sy:number}, visualScale:(rho:number)=>number):TapCandidate[] { return crystals.filter(c=>c.alive&&c.rho<=TARGETABLE_R).map(c=>{const p=project(c.x,c.y),q=project(c.x+c.r*visualScale(c.rho)*(c.kind==='golden'?1.25:1),c.y);return {id:c.id,note:c.note,...p,visPx:Math.hypot(q.sx-p.sx,q.sy-p.sy),rho:c.rho};}); }
export function pickCrystal(cands:readonly TapCandidate[],x:number,y:number,groupCount:(note:number)=>number,pointer:PointerKind='touch',shortSidePx=390):number|null {
 let winner:TapCandidate|null=null,best=Infinity,on=false;
 for(const c of cands){const dist=Math.hypot(c.sx-x,c.sy-y),hit=tapHitPx(c.visPx,pointer,shortSidePx);if(dist>hit)continue;const inside=dist<=c.visPx,d=inside?dist/c.visPx:dist/hit;
 const tie=winner!==null && (groupCount(c.note)>groupCount(winner.note)||(groupCount(c.note)===groupCount(winner.note)&&(c.rho<winner.rho||(c.rho===winner.rho&&c.id<winner.id))));
 if(!winner||(inside&&!on)||(inside===on&&(d<best-TAP_HIT.tieEps||(Math.abs(d-best)<=TAP_HIT.tieEps&&tie)))){winner=c;best=d;on=inside;}}
 return winner?.id??null;
}
