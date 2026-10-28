import { hash32, Rng } from '../core/rng';
import type { SaveV2 } from './save';
import type { RunResult } from './runEnd';
type MissionType = 'crystals'|'score'|'timeMs'|'modesToday'|'daily'|'biggest'|'choirs'|'maxMult'|'longestChain';
export const MISSIONS: readonly {id:string; text:string; mode:'any'|'tap'|'slice'; type:MissionType; target:number; best:boolean}[] = [
 {id:'m_any_150',text:'Break 150 crystals today',mode:'any',type:'crystals',target:150,best:false},
 {id:'m_any_s3k',text:'Score 3,000 in one game',mode:'any',type:'score',target:3000,best:true},
 {id:'m_any_t60',text:'Keep the bell safe for 1 minute',mode:'any',type:'timeMs',target:60000,best:true},
 {id:'m_any_both',text:'Play both Tap and Slice today',mode:'any',type:'modesToday',target:2,best:true},
 {id:'m_any_daily',text:'Play a Daily game',mode:'any',type:'daily',target:1,best:false},
 {id:'m_tap_n6',text:'In Tap, smash 6 crystals at once',mode:'tap',type:'biggest',target:6,best:true},
 {id:'m_tap_choir',text:'In Tap, get a Choir: 7 at once',mode:'tap',type:'choirs',target:1,best:false},
 {id:'m_tap_x4',text:'In Tap, reach a ×4 bonus',mode:'tap',type:'maxMult',target:4,best:true},
 {id:'m_tap_s10k',text:'In Tap, score 10,000 in one game',mode:'tap',type:'score',target:10000,best:true},
 {id:'m_slice_4',text:'In Slice, cut 4 crystals in one swipe',mode:'slice',type:'biggest',target:4,best:true},
 {id:'m_slice_ch3',text:'In Slice, cut 3 of one colour in one swipe',mode:'slice',type:'longestChain',target:3,best:true},
 {id:'m_slice_100',text:'In Slice, slice 100 crystals today',mode:'slice',type:'crystals',target:100,best:false},
];
export function pickMissions(iso:string):string[]{const deck=new Rng(hash32('shatterhymn-missions-'+iso)).shuffle([...MISSIONS]);const first=deck.findIndex(m=>m.mode==='any');const [any]=deck.splice(first,1);return [any!.id,...deck.slice(0,2).map(m=>m.id)];}
export function updateMissions(save:SaveV2,r:RunResult):string[]{const completed:string[]=[];for(const id of save.missions.ids){const m=MISSIONS.find(x=>x.id===id);if(!m||(m.mode!=='any'&&m.mode!==r.mode))continue;const amount=m.type==='daily'?Number(r.daily):m.type==='modesToday'?save.missions.modesToday.length:r.stats[m.type];const old=save.missions.progress[id]??0;const value=m.best?Math.max(old,amount):old+amount;save.missions.progress[id]=value;if(value>=m.target&&!save.missions.done.includes(id)){save.missions.done.push(id);completed.push(id);}}return completed;}
