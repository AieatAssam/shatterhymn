import type { RunMode, RunStats } from "../sim/types";
import type { SaveV1 } from "./save";
import { pickMissions, updateMissions } from "./missions";
import { checkUnlocks, nextLockedByShards, type Unlock } from "./unlocks";
export interface RunResult { mode: RunMode; seed: number; stats: RunStats; hymn: number[]; slowDial: boolean }
export interface RunOutcome { newBest: boolean; prevBest: number; shardsEarned: number; missionShards: number; missionsCompleted: string[]; allMissionsBonus: boolean; unlocked: Unlock[]; dailyBest: number | null; nextUnlock: ReturnType<typeof nextLockedByShards> }
export function applyRunResult(save: SaveV1, r: RunResult, todayISO: string): RunOutcome {
 if (save.missions.date !== todayISO) save.missions = { date: todayISO, ids: pickMissions(todayISO), progress: {}, done: [], bonusGiven: false };
 const s = r.stats, prevBest = save.bests.score, newBest = s.score > prevBest;
 save.bests.score = Math.max(prevBest, s.score); save.bests.biggestN = Math.max(save.bests.biggestN, s.biggestN); save.bests.longestStreak = Math.max(save.bests.longestStreak, s.longestStreak); save.bests.longestTimeMs = Math.max(save.bests.longestTimeMs, s.timeMs);
 let dailyBest: number | null = null;
 if (r.mode === "daily") { const entry = save.daily[todayISO] ?? { best: 0, plays: 0 }; entry.best = Math.max(entry.best, s.score); entry.plays++; save.daily[todayISO] = entry; dailyBest = entry.best; }
 if (save.progress.lastPlayedDate !== todayISO) { save.progress.daysPlayed++; save.progress.lastPlayedDate = todayISO; }
 save.progress.runs++; save.progress.lifetimeShards += s.shards; save.progress.lifetimeChoirs += s.choirs; save.progress.lifetimeCrystals += s.crystalsBroken;
 const missionsCompleted = updateMissions(save, r); const allMissionsBonus = save.missions.ids.length === 3 && save.missions.ids.every(id => save.missions.done.includes(id)) && !save.missions.bonusGiven;
 if (allMissionsBonus) save.missions.bonusGiven = true;
 const missionShards = missionsCompleted.length * 40 + (allMissionsBonus ? 100 : 0); save.progress.lifetimeShards += missionShards;
 const unlocked = checkUnlocks(save, r);
 return { newBest, prevBest, shardsEarned: s.shards, missionShards, missionsCompleted, allMissionsBonus, unlocked, dailyBest, nextUnlock: nextLockedByShards(save) };
}
