import { describe, expect, it } from "vitest";
import { loadSave, resetSave, SAVE_KEY, writeSave } from "../src/meta/save";
function storage() { const data = new Map<string, string>(); return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } }; }
describe("save", () => {
 it("defaults and repairs fields", () => { const s = storage(); expect(loadSave(s)).toEqual(resetSave()); s.setItem(SAVE_KEY, JSON.stringify({ settings: { music: 33 }, bests: { score: "bad" } })); const save = loadSave(s); expect(save.settings.shake).toBe(100); expect(save.settings.music).toBe(33); expect(save.bests.score).toBe(0); });
 it("backs up corrupt JSON", () => { const s = storage(); s.setItem(SAVE_KEY, "{broken"); expect(loadSave(s)).toEqual(resetSave()); expect(s.getItem(SAVE_KEY + ":corrupt")).toBe("{broken"); });
 it("trims daily entries and ignores storage failures", () => { const s = storage(), save = resetSave(); for (let i=1;i<=70;i++) save.daily[`2026-${String(Math.ceil(i/28)).padStart(2,"0")}-${String((i-1)%28+1).padStart(2,"0")}`] = { best: i, plays: 1 }; writeSave(s, save); expect(Object.keys(loadSave(s).daily)).toHaveLength(60); expect(loadSave(s).daily["2026-01-01"]).toBeUndefined(); expect(() => writeSave({ getItem: () => null, setItem: () => { throw new Error(); } }, save)).not.toThrow(); });
});
