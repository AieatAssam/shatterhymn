import { describe, expect, it } from "vitest";
import { resultsModel } from "../src/ui/screens/results";
import { resetSave } from "../src/meta/save";
import type { RunOutcome } from "../src/meta/runEnd";
import type { RunStats } from "../src/sim/types";

describe("results copy", () => {
  it("shows next unlock label and points-from-best", () => {
    const save = resetSave();
    save.unlocks.skins.push("quartz");
    save.unlocks.scales.push("dusk");
    save.progress.lifetimeShards = 441;
    save.bests.score = 18420;
    const outcome = {
      newBest: false,
      prevBest: 18420,
      shardsEarned: 4,
      missionShards: 0,
      missionsCompleted: [],
      allMissionsBonus: false,
      unlocked: [],
      dailyBest: null,
      nextUnlock: { kind: "skin", id: "rosegold", name: "Rose Gold", have: 441, need: 500 },
    } as RunOutcome;
    const stats = { score: 128, timeMs: 22000, biggestN: 2, longestStreak: 5, crystalsBroken: 4, choirs: 0, closeCalls: 0, prismsBroken: 0, duds: 0, strikes: 0, maxMult: 2, shards: 4, goldens: 0 } as RunStats;
    const model = resultsModel(outcome, stats, save);
    expect(model.next).toBe("Next: Rose Gold bell — 441 / 500 shards");
    expect(model.pbGap).toBe("18,292 points from your best.");
  });
});
