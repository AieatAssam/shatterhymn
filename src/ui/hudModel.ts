import type { SaveV1 } from '../meta/save';
import { nextLockedByShards } from '../meta/unlocks';
export function nextChipModel(save:SaveV1,runShards:number):{line:string;have:number;need:number;unlocked:boolean}|null{const next=nextLockedByShards(save);if(!next)return null;const have=next.have+runShards,unlocked=have>=next.need;return {line:`${unlocked?'Unlocked':'Next'}: ${next.name}${next.kind==='skin'?' bell':''}`,have,need:next.need,unlocked};}
