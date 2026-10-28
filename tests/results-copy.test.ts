import { describe, expect, it } from "vitest";
import { resultsModel } from "../src/ui/screens/results";
import { resetSave } from "../src/meta/save";
import type { RunOutcome } from "../src/meta/runEnd";
import { result } from "./metaHelpers";

describe("results copy", () => {
  it("shows next unlock label and points-from-best", () => {
    const save = resetSave();
    save.unlocks.skins.push("quartz");
    save.unlocks.scales.push("dusk");
    save.progress.lifetimeShards = 441;
    save.modes.tap.bests.score = 18420;
    const outcome = {
      mode: "tap", newBest: false,
      prevBest: 18420,
      shardsEarned: 4,
      missionShards: 0,
      missionsCompleted: [],
      allMissionsBonus: false,
      unlocked: [],
      dailyBest: null,
      nextUnlock: { kind: "skin", id: "rosegold", name: "Rose Gold", have: 441, need: 500 },
    } as RunOutcome;
    const stats = result({ score: 128, timeMs: 22000, biggest: 2, longestChain: 5, crystals: 4, maxMult: 2, shards: 4 }).stats;
    const model = resultsModel(outcome, stats, "tap", false, 1);
    expect(model.next).toBe("Next: Rose Gold bell — 441 / 500 shards");
    expect(model.pbGap).toBe("18,292 points from your best.");
  });
});
