import type { ScaleId } from "../audio/scales";
import type { Kind } from "../sim/types";

export interface SaveV1 {
 v: 1;
 settings: { sfx: number; music: number; vibration: boolean; reduceMotion: boolean | null; slowDial: boolean; shake: number; tips: boolean };
 progress: { lifetimeShards: number; lifetimeChoirs: number; lifetimeCrystals: number; runs: number; daysPlayed: number; lastPlayedDate: string | null; tutorialDone: boolean; seenTips: string[]; seenKinds: Kind[] };
 bests: { score: number; biggestN: number; longestStreak: number; longestTimeMs: number };
 daily: Record<string, { best: number; plays: number }>;
 missions: { date: string | null; ids: string[]; progress: Record<string, number>; done: string[]; bonusGiven: boolean };
 unlocks: { skins: string[]; scales: ScaleId[]; titles: string[] };
 equipped: { skin: string; scale: ScaleId; title: string };
}
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
export const SAVE_KEY = "shatterhymn:save";
export function resetSave(): SaveV1 { return { v: 1, settings: { sfx: 80, music: 60, vibration: true, reduceMotion: null, slowDial: false, shake: 100, tips: true }, progress: { lifetimeShards: 0, lifetimeChoirs: 0, lifetimeCrystals: 0, runs: 0, daysPlayed: 0, lastPlayedDate: null, tutorialDone: false, seenTips: [], seenKinds: [] }, bests: { score: 0, biggestN: 0, longestStreak: 0, longestTimeMs: 0 }, daily: {}, missions: { date: null, ids: [], progress: {}, done: [], bonusGiven: false }, unlocks: { skins: ["clear"], scales: ["bright"], titles: ["novice"] }, equipped: { skin: "clear", scale: "bright", title: "novice" } }; }
const object = (v: unknown): Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const num = (v: unknown, fallback = 0): number => typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : fallback;
const bool = (v: unknown, fallback: boolean): boolean => typeof v === "boolean" ? v : fallback;
const str = (v: unknown, fallback: string): string => typeof v === "string" ? v : fallback;
const nullableString = (v: unknown): string | null => typeof v === "string" ? v : null;
const strings = (v: unknown, fallback: string[] = []): string[] => Array.isArray(v) && v.every(x => typeof x === "string") ? [...v] : [...fallback];
const scales: ScaleId[] = ["bright", "dusk", "koto", "dream", "gamelan"];
const kinds: Kind[] = ["normal", "geode", "prism", "splitter", "rusher", "mend"];
export function migrate(value: unknown): SaveV1 {
 const d = resetSave(), root = object(value), s = object(root.settings), p = object(root.progress), b = object(root.bests), m = object(root.missions), u = object(root.unlocks), e = object(root.equipped);
 d.settings = { sfx: num(s.sfx, 80), music: num(s.music, 60), vibration: bool(s.vibration, true), reduceMotion: typeof s.reduceMotion === "boolean" ? s.reduceMotion : null, slowDial: bool(s.slowDial, false), shake: num(s.shake, 100), tips: bool(s.tips, true) };
 d.progress = { lifetimeShards: num(p.lifetimeShards), lifetimeChoirs: num(p.lifetimeChoirs), lifetimeCrystals: num(p.lifetimeCrystals), runs: num(p.runs), daysPlayed: num(p.daysPlayed), lastPlayedDate: nullableString(p.lastPlayedDate), tutorialDone: bool(p.tutorialDone, false), seenTips: strings(p.seenTips), seenKinds: strings(p.seenKinds).filter((x): x is Kind => kinds.includes(x as Kind)) };
 d.bests = { score: num(b.score), biggestN: num(b.biggestN), longestStreak: num(b.longestStreak), longestTimeMs: num(b.longestTimeMs) };
 for (const [date, raw] of Object.entries(object(root.daily))) { const entry = object(raw); if (/^\d{4}-\d{2}-\d{2}$/.test(date)) d.daily[date] = { best: num(entry.best), plays: num(entry.plays) }; }
 d.missions = { date: nullableString(m.date), ids: strings(m.ids), progress: {}, done: strings(m.done), bonusGiven: bool(m.bonusGiven, false) };
 for (const [id, value] of Object.entries(object(m.progress))) d.missions.progress[id] = num(value);
 d.unlocks = { skins: strings(u.skins, ["clear"]), scales: strings(u.scales, ["bright"]).filter((x): x is ScaleId => scales.includes(x as ScaleId)), titles: strings(u.titles, ["novice"]) };
 const scale = str(e.scale, "bright"); d.equipped = { skin: str(e.skin, "clear"), scale: scales.includes(scale as ScaleId) ? scale as ScaleId : "bright", title: str(e.title, "novice") };
 return d;
}
export function loadSave(storage: StorageLike): SaveV1 {
 let raw: string | null; try { raw = storage.getItem(SAVE_KEY); } catch { return resetSave(); }
 if (raw === null) return resetSave();
 try { return migrate(JSON.parse(raw)); } catch { try { storage.setItem(`${SAVE_KEY}:corrupt`, raw); } catch { /* Storage can be unavailable. */ } return resetSave(); }
}
export function writeSave(storage: StorageLike, save: SaveV1): void { try { const daily = Object.fromEntries(Object.entries(save.daily).sort(([a], [b]) => b.localeCompare(a)).slice(0, 60)); storage.setItem(SAVE_KEY, JSON.stringify({ ...save, daily })); } catch { /* Storage can be unavailable. */ } }
let timer: ReturnType<typeof setTimeout> | undefined;
export function scheduleWrite(storage: StorageLike, save: SaveV1): void { clearTimeout(timer); timer = setTimeout(() => writeSave(storage, save), 250); }
