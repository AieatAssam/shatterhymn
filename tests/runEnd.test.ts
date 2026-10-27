import { expect, it } from "vitest";
import { applyRunResult } from "../src/meta/runEnd";
import { resetSave } from "../src/meta/save";
import { result } from "./metaHelpers";
it("records first best, daily attempts, shards and distinct dates", () => { const s = resetSave(); const first = applyRunResult(s, result({ score: 100, shards: 12 }, "daily"), "2026-10-27"); expect(first.newBest).toBe(true); expect(first.prevBest).toBe(0); expect(first.shardsEarned).toBe(12); applyRunResult(s, result({ score: 50 }, "daily"), "2026-10-27"); expect(s.daily["2026-10-27"]).toEqual({ best: 100, plays: 2 }); expect(s.progress.daysPlayed).toBe(1); applyRunResult(s, result({ score: 200 }, "daily"), "2026-10-28"); expect(s.progress.daysPlayed).toBe(2); expect(s.daily["2026-10-28"]?.best).toBe(200); });
