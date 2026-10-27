import type { ScaleId } from "../audio/scales";
import type { SaveV1 } from "./save";
import type { RunResult } from "./runEnd";
type Requirement = { type: "shards" | "choirs" | "score" | "time" | "firstChoir"; value: number };
type Item = { id: string; name: string; requirement: Requirement };
export const SKINS: readonly Item[] = [
 { id: "clear", name: "Clear Glass", requirement: { type: "shards", value: 0 } }, { id: "quartz", name: "Smoked Quartz", requirement: { type: "shards", value: 150 } }, { id: "rosegold", name: "Rose Gold", requirement: { type: "shards", value: 500 } }, { id: "obsidian", name: "Obsidian", requirement: { type: "shards", value: 1200 } }, { id: "aurora", name: "Aurora", requirement: { type: "shards", value: 2500 } }, { id: "rosewindow", name: "Rose Window", requirement: { type: "shards", value: 5000 } }, { id: "crown", name: "Choirmaster's Crown", requirement: { type: "choirs", value: 10 } },
];
export const SCALE_UNLOCKS: readonly Item[] = [
 { id: "bright", name: "Bright", requirement: { type: "shards", value: 0 } }, { id: "dusk", name: "Dusk", requirement: { type: "shards", value: 300 } }, { id: "koto", name: "Koto", requirement: { type: "shards", value: 800 } }, { id: "dream", name: "Dream", requirement: { type: "shards", value: 1800 } }, { id: "gamelan", name: "Gamelan", requirement: { type: "shards", value: 3500 } },
];
export const TITLES: readonly Item[] = [
 { id: "novice", name: "Novice Bell", requirement: { type: "shards", value: 0 } }, { id: "chorister", name: "Chorister", requirement: { type: "firstChoir", value: 1 } }, { id: "cantor", name: "Cantor", requirement: { type: "score", value: 10000 } }, { id: "bellwright", name: "Bellwright", requirement: { type: "time", value: 180000 } }, { id: "choirmaster", name: "Choirmaster", requirement: { type: "choirs", value: 10 } }, { id: "cathedral", name: "Cathedral", requirement: { type: "score", value: 50000 } },
];
export type Unlock = { kind: "skin" | "scale" | "title"; id: string };
export function checkUnlocks(save: SaveV1, r?: RunResult): Unlock[] {
 const unlocked: Unlock[] = [];
 for (const [kind, items] of [["skin", SKINS], ["scale", SCALE_UNLOCKS], ["title", TITLES]] as const) for (const item of items) {
  const list: string[] = kind === "skin" ? save.unlocks.skins : kind === "scale" ? save.unlocks.scales : save.unlocks.titles;
  const req = item.requirement; const have = req.type === "shards" ? save.progress.lifetimeShards : req.type === "choirs" || req.type === "firstChoir" ? save.progress.lifetimeChoirs : req.type === "score" ? (r?.stats.score ?? save.bests.score) : (r?.stats.timeMs ?? save.bests.longestTimeMs);
  if (!list.includes(item.id) && have >= req.value) { if (kind === "scale") save.unlocks.scales.push(item.id as ScaleId); else list.push(item.id); unlocked.push({ kind, id: item.id }); }
 }
 const highest = [...TITLES].reverse().find(item => save.unlocks.titles.includes(item.id));
 if (highest && unlocked.some(item => item.kind === "title")) save.equipped.title = highest.id;
 return unlocked;
}
export function nextLockedByShards(save: SaveV1): { kind: string; id: string; name: string; have: number; need: number } | null {
 const candidates = [...SKINS.map(item => ({ kind: "skin", item, list: save.unlocks.skins })), ...SCALE_UNLOCKS.map(item => ({ kind: "scale", item, list: save.unlocks.scales as string[] }))].filter(x => x.item.requirement.type === "shards" && !x.list.includes(x.item.id)).sort((a, b) => a.item.requirement.value - b.item.requirement.value);
 const next = candidates[0]; return next ? { kind: next.kind, id: next.item.id, name: next.item.name, have: save.progress.lifetimeShards, need: next.item.requirement.value } : null;
}
