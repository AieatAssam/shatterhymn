export interface SliceCrystal { id:number; alive:boolean; kind:'normal'|'dark'|'big'; hp:number; note:number; x:number; y:number; vx:number; vy:number; r:number; hitR:number; spin:number; angle:number; ageMs:number; wave:number }
export interface SliceStats { score:number; timeMs:number; biggestSwipe:number; longestChain:number; crystalsSliced:number; choirs:number; darkHits:number; falls:number; strokes:number; shards:number }
export interface BladeSegment { x0:number; y0:number; x1:number; y1:number; r:number; stroke:number; arm:number; speed:number }
export interface SliceInput { segments:readonly BladeSegment[]; strokeEnded:number|null; endings?:readonly {stroke:number;index:number}[] }
export type SliceEvent =
 | {type:'rushStart';note:number}
 | {type:'rushEnd';cuts:number;points:number}
 | {type:'bigHit';id:number;x:number;y:number;hpLeft:number;note:number;dirX:number;dirY:number;points:number}
 | {type:'bigBreak';id:number;x:number;y:number;note:number;points:number}
 | {type:'spent';stroke:number;arm:number;reason:'arm'|'budget'}
 | {type:'toss';id:number;note:number;kind:'normal'|'dark'|'big'}
 | {type:'cut';id:number;x:number;y:number;vx:number;vy:number;angle:number;note:number;k:number;chainStep:number;points:number;dirX:number;dirY:number;speed:number}
 | {type:'darkHit';id:number;x:number;y:number;cracked:boolean;stroke:number;arm:number}
 | {type:'choir';note:number;n:number;swept:{id:number;x:number;y:number;note:number}[];points:number}
 | {type:'strokeEnd';cuts:number;bonus:number;x:number;y:number;best:boolean}
 | {type:'fall';id:number;x:number;note:number;cracked:boolean;warning:boolean}
 | {type:'crack';cracks:number;cause:'dark'|'fall'}
 | {type:'levelUp';level:number;K:number}
 | {type:'gameOver';stats:SliceStats;hymn:number[]};
