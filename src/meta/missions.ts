import { hash32, Rng } from "../core/rng";
import type { SaveV1 } from "./save";
import type { RunResult } from "./runEnd";
type MissionType = "biggestN" | "choirs" | "timeMs" | "maxMult" | "score" | "prismsBroken" | "closeCalls" | "crystalsBroken" | "daily";
export const MISSIONS: readonly { id: string; text: string; type: MissionType; target: number; best: boolean }[] = [
 { id: "m_n4", text: "Break 4 crystals with one note", type: "biggestN", target: 4, best: true },
 { id: "m_n6", text: "Break 6 crystals with one note", type: "biggestN", target: 6, best: true },
 { id: "m_choir", text: "Sing a Choir (7 or more with one note)", type: "choirs", target: 1, best: false },
 { id: "m_t60", text: "Survive for 1 minute in one run", type: "timeMs", target: 60000, best: true },
 { id: "m_t120", text: "Survive for 2 minutes in one run", type: "timeMs", target: 120000, best: true },
 { id: "m_x4", text: "Reach a ×4 multiplier", type: "maxMult", target: 4, best: true },
 { id: "m_s3k", text: "Score 3,000 in one run", type: "score", target: 3000, best: true },
 { id: "m_s10k", text: "Score 10,000 in one run", type: "score", target: 10000, best: true },
 { id: "m_prism", text: "Break 3 Prisms", type: "prismsBroken", target: 3, best: false },
 { id: "m_close", text: "Get 10 close calls (break a crystal right next to the bell)", type: "closeCalls", target: 10, best: false },
 { id: "m_150", text: "Break 150 crystals", type: "crystalsBroken", target: 150, best: false },
 { id: "m_daily", text: "Play the Daily Hymn once", type: "daily", target: 1, best: false },
];
export function pickMissions(iso: string): string[] { return new Rng(hash32("shatterhymn-missions-" + iso)).shuffle(MISSIONS.map(m => m.id)).slice(0, 3); }
export function updateMissions(save: SaveV1, r: RunResult): string[] {
 const completed: string[] = [];
 for (const id of save.missions.ids) { const mission = MISSIONS.find(m => m.id === id); if (!mission) continue; const amount = mission.type === "daily" ? Number(r.mode === "daily") : r.stats[mission.type]; const old = save.missions.progress[id] ?? 0; const value = mission.best ? Math.max(old, amount) : old + amount; save.missions.progress[id] = value; if (value >= mission.target && !save.missions.done.includes(id)) { save.missions.done.push(id); completed.push(id); } }
 return completed;
}
