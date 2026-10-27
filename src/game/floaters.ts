import { FINISH } from "../render/fxConfig";
export interface FloaterRect { x:number; y:number; width:number; height:number }
export interface FloaterViewport { left:number; top:number; right:number; bottom:number }
/** Input order is oldest first. Place the newest first, then stack older overlaps below. */
export function placeFloaters(rects: FloaterRect[], viewport: FloaterViewport): FloaterRect[] {
 const placed: FloaterRect[] = [];
 for (let i=rects.length-1;i>=0;i--) {
  const r=rects[i]!; const x=Math.max(viewport.left,Math.min(r.x,viewport.right-r.width));
  let y=Math.max(viewport.top,Math.min(r.y,viewport.bottom-r.height));
  for (const other of [...placed].sort((a,b)=>a.y-b.y)) if (x < other.x+other.width+FINISH.floaterGap && x+r.width+FINISH.floaterGap > other.x && y < other.y+other.height+FINISH.floaterGap && y+r.height+FINISH.floaterGap > other.y) y=other.y+other.height+FINISH.floaterGap;
  if(y+r.height>viewport.bottom) { y=Math.max(viewport.top,viewport.bottom-r.height); for(const other of [...placed].sort((a,b)=>b.y-a.y)) if(x<other.x+other.width+FINISH.floaterGap && x+r.width+FINISH.floaterGap>other.x && y<other.y+other.height+FINISH.floaterGap && y+r.height+FINISH.floaterGap>other.y) y=Math.max(viewport.top,other.y-r.height-FINISH.floaterGap); }
  placed.push({...r,x,y});
 }
 return placed.reverse();
}
