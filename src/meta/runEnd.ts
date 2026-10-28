import type { ModeId, MetaStats } from '../modes/mode';
import type { SaveV2 } from './save';
import { pickMissions, updateMissions } from './missions';
import { checkUnlocks, nextLockedByShards, type Unlock } from './unlocks';
export interface RunResult { mode: ModeId; daily: boolean; seed: number; stats: MetaStats; hymn: number[]; slowDial: boolean }
export interface RunOutcome { mode: ModeId; newBest: boolean; prevBest: number; shardsEarned: number; missionShards: number; missionsCompleted: string[]; allMissionsBonus: boolean; unlocked: Unlock[]; dailyBest: number | null; nextUnlock: ReturnType<typeof nextLockedByShards> }
export function applyRunResult(save: SaveV2, r: RunResult, todayISO: string): RunOutcome {
 if (save.missions.date !== todayISO) save.missions = {date:todayISO,ids:pickMissions(todayISO),progress:{},done:[],bonusGiven:false,modesToday:[]};
 const s=r.stats, mode=save.modes[r.mode], prevBest=mode.bests.score, newBest=s.score>prevBest;
 mode.bests.score=Math.max(prevBest,s.score); mode.bests.biggest=Math.max(mode.bests.biggest,s.biggest); mode.bests.longestChain=Math.max(mode.bests.longestChain,s.longestChain); mode.bests.longestTimeMs=Math.max(mode.bests.longestTimeMs,s.timeMs); mode.runs++; mode.crystals+=s.crystals; mode.choirs+=s.choirs;
 let dailyBest: number | null=null; if(r.daily){const entry=mode.daily[todayISO]??{best:0,plays:0};entry.best=Math.max(entry.best,s.score);entry.plays++;mode.daily[todayISO]=entry;dailyBest=entry.best;}
 if(save.progress.lastPlayedDate!==todayISO){save.progress.daysPlayed++;save.progress.lastPlayedDate=todayISO;} save.progress.runs++;save.progress.lastMode=r.mode;save.progress.lifetimeShards+=s.shards;save.progress.lifetimeChoirs+=s.choirs;save.progress.lifetimeCrystals+=s.crystals;
 if(!save.missions.modesToday.includes(r.mode))save.missions.modesToday.push(r.mode);
 const missionsCompleted=updateMissions(save,r);const allMissionsBonus=save.missions.ids.length===3&&save.missions.ids.every(id=>save.missions.done.includes(id))&&!save.missions.bonusGiven;if(allMissionsBonus)save.missions.bonusGiven=true;
 const missionShards=missionsCompleted.length*40+(allMissionsBonus?100:0);save.progress.lifetimeShards+=missionShards;const unlocked=checkUnlocks(save,r);
 return {mode:r.mode,newBest,prevBest,shardsEarned:s.shards,missionShards,missionsCompleted,allMissionsBonus,unlocked,dailyBest,nextUnlock:nextLockedByShards(save)};
}
