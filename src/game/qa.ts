export interface QACrystal { id:number; note:number; kind:string; sx:number; sy:number; rPx:number; hitRPx:number }
export function installQA(api: {state:()=>unknown; crystals:()=>QACrystal[]; start:(daily:boolean,demo:boolean)=>void; skipIntro:()=>void; forceGameOver:()=>void; tapCrystal:(id:number)=>void; screen:()=>string}):void {
 const state=Object.assign(()=>api.state(),{state:api.state,crystals:api.crystals,start:(mode:string,opts?:{daily?:boolean;demo?:boolean})=>{if(mode==='tap')api.start(!!opts?.daily,!!opts?.demo);},skipIntro:api.skipIntro,forceGameOver:api.forceGameOver,tapCrystal:api.tapCrystal,screen:api.screen});
 (window as Window & {__shatterhymnQA?:typeof state}).__shatterhymnQA=state;
}
