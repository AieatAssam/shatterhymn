export interface PlayArea {left:number;top:number;width:number;height:number;bottom:number}
export function playArea(width:number,height:number,aspect:number):PlayArea {const h=Math.min(height,width/aspect),w=h*aspect,left=(width-w)/2,top=(height-h)/2;return {left,top,width:w,height:h,bottom:top+h};}
export function toSlice(area:PlayArea,x:number,y:number):{x:number;y:number} {return {x:(x-area.left)/area.height,y:(area.bottom-y)/area.height};}
export function fromSlice(area:PlayArea,x:number,y:number):{sx:number;sy:number} {return {sx:area.left+x*area.height,sy:area.bottom-y*area.height};}
