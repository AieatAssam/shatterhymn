export interface PlayArea { left:number; top:number; width:number; height:number; bottom:number }
export function playArea(width:number,height:number,aspect:number):PlayArea {
 const h=Math.min(height,width/aspect), w=h*aspect, left=(width-w)/2, top=(height-h)/2;
 return {left,top,width:w,height:h,bottom:top+h};
}
export function toWorld(area:PlayArea,x:number,y:number):{x:number;y:number} {return {x:(x-area.left)/area.height,y:(area.bottom-y)/area.height};}
export function toScreen(area:PlayArea,x:number,y:number):{sx:number;sy:number} {return {sx:area.left+x*area.height,sy:area.bottom-y*area.height};}

/** A short tap only produces visual feedback; it never changes the simulation. */
export function pokeTarget(crystals:readonly {id:number;alive:boolean;kind:'normal'|'dark'|'big';x:number;y:number;hitR:number}[], x:number,y:number,path:number,durationMs:number):number|null {
 if(path>=0.03 || durationMs<0 || durationMs>250)return null;
 return crystals.find(c=>c.alive&&c.kind==='normal'&&Math.hypot(c.x-x,c.y-y)<=c.hitR*1.5)?.id??null;
}
