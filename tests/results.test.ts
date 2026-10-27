import { describe, expect, it } from "vitest";
import { resultsModel } from "../src/ui/screens/results";
import { resetSave } from "../src/meta/save";
import type { RunOutcome } from "../src/meta/runEnd";
import type { RunStats } from "../src/sim/types";
describe("results model",()=>{it("formats the specified results copy",()=>{const outcome:RunOutcome={newBest:true,prevBest:12400,shardsEarned:184,missionShards:0,missionsCompleted:[],allMissionsBonus:false,unlocked:[],dailyBest:null,nextUnlock:{kind:"skin",id:"rosegold",name:"Rose Gold",have:412,need:500}};const stats:RunStats={score:15000,timeMs:134000,biggestN:0,longestStreak:0,crystalsBroken:0,choirs:0,closeCalls:0,prismsBroken:0,duds:0,strikes:0,maxMult:1,shards:184,goldens:0};const model=resultsModel(outcome,stats,resetSave());expect(model.title).toBe("The bell broke.");expect(model.best).toBe("New best!");expect(model.time).toBe("Time 2:14");expect(model.shards).toBe("+184 shards");expect(model.next).toBe("Next: Rose Gold bell — 412 / 500 shards");outcome.newBest=false;expect(resultsModel(outcome,stats,resetSave()).best).toBe("Best: 12,400");});});
