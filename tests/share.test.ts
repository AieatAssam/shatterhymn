import { describe, expect, it } from "vitest";
import { hymnLine, shareText, shareUrl } from "../src/meta/share";
import type { RunResult } from "../src/meta/runEnd";

const run: RunResult = { mode: "daily", seed: 0x3f9a12c0, slowDial: false, hymn: [0,0,1,3,10,2,4], stats: {score:18420,biggestN:9,longestStreak:14,timeMs:134000,crystalsBroken:0,choirs:0,closeCalls:0,prismsBroken:0,duds:0,strikes:0,maxMult:1,shards:0} };
describe("sharing", () => {
 it("maps the hymn and truncates by symbols", () => {
  expect(hymnLine(run.hymn)).toBe("🟥🟥🟨🟦✨🟩🟪");
  expect(hymnLine([20])).toBe("💔");
  expect(hymnLine(Array.from({length:40}, (_, i) => i % 5))).toBe("🟥🟨🟩🟦🟪🟥🟨🟩🟦🟪🟥🟨…🟦🟪🟥🟨🟩🟦🟪🟥🟨🟩🟦🟪🟥🟨🟩🟦🟪");
 });
 it("formats the daily template exactly", () => {
  expect(shareText(run,{dailyNo:12,url:shareUrl("https://example.com/",run)})).toBe("Shatterhymn Daily #12 — 18,420\n🟥🟥🟨🟦✨🟩🟪\nMost at once: 9 · Streak: 14 · 2:14\nPlay: https://example.com/?daily=1");
 });
 it("formats a seed and slow dial for a normal run", () => {
  const normal = {...run, mode:"run" as const, slowDial:true};
  expect(shareText(normal,{url:shareUrl("https://example.com/?daily=1#old",normal)})).toBe("Shatterhymn Run — 18,420\n🟥🟥🟨🟦✨🟩🟪\nMost at once: 9 · Streak: 14 · 2:14\nSlow dial · Play: https://example.com/?seed=3F9A12C0");
 });
});
