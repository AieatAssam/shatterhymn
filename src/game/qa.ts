export interface QACrystal { id:number; note:number; kind:string; sx:number; sy:number; rPx:number; hitRPx:number }
type BoardCrystal={x:number;y:number;note:number;kind?:'normal'|'dark'|'big'};
export function installQA(api: {state:()=>unknown; crystals:()=>QACrystal[]; start:(mode:'tap'|'slice',daily:boolean,demo:boolean)=>void; skipIntro:()=>void; forceGameOver:()=>void; tapCrystal:(id:number)=>void; screen:()=>string; swipe:(points:{x:number;y:number}[],duration:number)=>Promise<{cuts:number;armed:boolean;maxSpeedHps:number}>; tapTestBoard:()=>QACrystal[]; sliceTestBoard:(list?:BoardCrystal[])=>QACrystal[];blade:()=>{state:string;speedHps:number;speedSps:number;strokeCuts:number;budget:number}}):void {
 const state=Object.assign(()=>api.state(),{state:api.state,crystals:api.crystals,start:(mode:'tap'|'slice',opts?:{daily?:boolean;demo?:boolean})=>api.start(mode,!!opts?.daily,!!opts?.demo),skipIntro:api.skipIntro,forceGameOver:api.forceGameOver,tapCrystal:api.tapCrystal,screen:api.screen,swipe:api.swipe,tapTestBoard:api.tapTestBoard,sliceTestBoard:api.sliceTestBoard,blade:api.blade});
 (window as Window & {__shatterhymnQA?:typeof state}).__shatterhymnQA=state;
}
