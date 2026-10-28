import type { ScaleId } from '../audio/scales';
import type { ModeId } from '../modes/mode';
export interface ModeBests { score: number; biggest: number; longestChain: number; longestTimeMs: number }
export interface ModeSave { runs: number; demoDone: boolean; bests: ModeBests; daily: Record<string, {best: number; plays: number}>; crystals: number; choirs: number }
export interface SaveV2 {
 v: 2;
 settings: { sfx: number; music: number; vibration: boolean; reduceMotion: boolean | null; slowDial: boolean; shake: number; tips: boolean };
 progress: { lifetimeShards: number; lifetimeChoirs: number; lifetimeCrystals: number; runs: number; daysPlayed: number; lastPlayedDate: string | null; introDone: boolean; lastMode: ModeId; seenTips: string[]; seenKinds: string[] };
 modes: Record<ModeId, ModeSave>;
 missions: { date: string | null; ids: string[]; progress: Record<string, number>; done: string[]; bonusGiven: boolean; modesToday: ModeId[] };
 unlocks: { skins: string[]; scales: ScaleId[]; titles: string[] };
 equipped: { skin: string; scale: ScaleId; title: string };
}
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
export const SAVE_KEY = 'shatterhymn:save';
const modeDefault = (): ModeSave => ({ runs: 0, demoDone: false, bests: {score: 0, biggest: 0, longestChain: 0, longestTimeMs: 0}, daily: {}, crystals: 0, choirs: 0 });
export function resetSave(): SaveV2 { return {v: 2, settings: {sfx: 80, music: 60, vibration: true, reduceMotion: null, slowDial: false, shake: 100, tips: true}, progress: {lifetimeShards: 0, lifetimeChoirs: 0, lifetimeCrystals: 0, runs: 0, daysPlayed: 0, lastPlayedDate: null, introDone: false, lastMode: 'tap', seenTips: [], seenKinds: []}, modes: {tap: modeDefault(), slice: modeDefault()}, missions: {date: null, ids: [], progress: {}, done: [], bonusGiven: false, modesToday: []}, unlocks: {skins: ['clear'], scales: ['bright'], titles: ['novice']}, equipped: {skin: 'clear', scale: 'bright', title: 'novice'}}; }
const obj = (v: unknown): Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const num = (v: unknown, fallback = 0): number => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback;
const bool = (v: unknown, fallback = false): boolean => typeof v === 'boolean' ? v : fallback;
const str = (v: unknown, fallback: string): string => typeof v === 'string' ? v : fallback;
const nullable = (v: unknown): string | null => typeof v === 'string' ? v : null;
const strings = (v: unknown, fallback: string[] = []): string[] => Array.isArray(v) && v.every(x => typeof x === 'string') ? [...v] : [...fallback];
const scales: ScaleId[] = ['bright', 'dusk', 'koto', 'dream', 'gamelan'];
function readDaily(v: unknown): ModeSave['daily'] { const out: ModeSave['daily'] = {}; for (const [date, raw] of Object.entries(obj(v))) { const e = obj(raw); if (/^\d{4}-\d{2}-\d{2}$/.test(date)) out[date] = {best: num(e.best), plays: num(e.plays)}; } return out; }
function readMode(v: unknown): ModeSave { const m = obj(v), b = obj(m.bests); return {runs: num(m.runs), demoDone: bool(m.demoDone), bests: {score: num(b.score), biggest: num(b.biggest), longestChain: num(b.longestChain), longestTimeMs: num(b.longestTimeMs)}, daily: readDaily(m.daily), crystals: num(m.crystals), choirs: num(m.choirs)}; }
export function migrate(value: unknown): SaveV2 {
 const d = resetSave(), root = obj(value), s = obj(root.settings), p = obj(root.progress), u = obj(root.unlocks), e = obj(root.equipped);
 d.settings = {sfx: num(s.sfx,80), music: num(s.music,60), vibration: bool(s.vibration,true), reduceMotion: typeof s.reduceMotion === 'boolean' ? s.reduceMotion : null, slowDial: bool(s.slowDial), shake: num(s.shake,100), tips: bool(s.tips,true)};
 d.progress = {lifetimeShards: num(p.lifetimeShards), lifetimeChoirs: num(p.lifetimeChoirs), lifetimeCrystals: num(p.lifetimeCrystals), runs: num(p.runs), daysPlayed: num(p.daysPlayed), lastPlayedDate: nullable(p.lastPlayedDate), introDone: root.v === 2 ? bool(p.introDone) : num(p.runs) > 0 || bool(p.tutorialDone), lastMode: root.v === 2 && p.lastMode === 'slice' ? 'slice' : 'tap', seenTips: strings(p.seenTips), seenKinds: strings(p.seenKinds)};
 if (root.v === 2) { const modes = obj(root.modes), m = obj(root.missions); d.modes = {tap: readMode(modes.tap), slice: readMode(modes.slice)}; d.missions = {date: nullable(m.date), ids: strings(m.ids), progress: {}, done: strings(m.done), bonusGiven: bool(m.bonusGiven), modesToday: strings(m.modesToday).filter((x): x is ModeId => x === 'tap' || x === 'slice')}; for (const [id, n] of Object.entries(obj(m.progress))) d.missions.progress[id] = num(n); }
 else { const b = obj(root.bests); d.modes.tap = {runs: num(p.runs), demoDone: bool(p.tutorialDone), bests: {score: num(b.score), biggest: num(b.biggestN), longestChain: num(b.longestStreak), longestTimeMs: num(b.longestTimeMs)}, daily: readDaily(root.daily), crystals: num(p.lifetimeCrystals), choirs: num(p.lifetimeChoirs)}; }
 d.unlocks = {skins: strings(u.skins,['clear']), scales: strings(u.scales,['bright']).filter((x): x is ScaleId => scales.includes(x as ScaleId)), titles: strings(u.titles,['novice'])}; const scale = str(e.scale,'bright'); d.equipped = {skin: str(e.skin,'clear'), scale: scales.includes(scale as ScaleId) ? scale as ScaleId : 'bright', title: str(e.title,'novice')}; return d;
}
export function loadSave(storage: StorageLike): SaveV2 { let raw: string | null; try {raw = storage.getItem(SAVE_KEY);} catch {return resetSave();} if (raw === null) return resetSave(); try {return migrate(JSON.parse(raw));} catch {try {storage.setItem(`${SAVE_KEY}:corrupt`,raw);} catch { /* unavailable */ } return resetSave();} }
export function writeSave(storage: StorageLike, save: SaveV2): void { try { const raw = storage.getItem(SAVE_KEY); if (raw !== null && storage.getItem(`${SAVE_KEY}:v1`) === null) { try { const previous: unknown = JSON.parse(raw); if (obj(previous).v !== 2) storage.setItem(`${SAVE_KEY}:v1`,raw); } catch { /* corrupt save already handled on load */ } } const trim = (m: ModeSave): ModeSave => ({...m, daily: Object.fromEntries(Object.entries(m.daily).sort(([a],[b]) => b.localeCompare(a)).slice(0,60))}); storage.setItem(SAVE_KEY,JSON.stringify({...save,modes:{tap:trim(save.modes.tap),slice:trim(save.modes.slice)}})); } catch { /* unavailable */ } }
let timer: ReturnType<typeof setTimeout> | undefined;
export function scheduleWrite(storage: StorageLike, save: SaveV2): void {clearTimeout(timer);timer=setTimeout(()=>writeSave(storage,save),250);}
