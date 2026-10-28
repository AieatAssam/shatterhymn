import { hash32 } from "../core/rng";
export { dailyNumber } from "../core/date";
export function dailySeed(mode: "tap" | "slice", iso: string): number;
export function dailySeed(iso: string): number;
export function dailySeed(modeOrIso: string, iso?: string): number {
  const mode = iso === undefined ? "tap" : modeOrIso;
  return hash32((mode === "slice" ? "shatterhymn-slice-daily-" : "shatterhymn-daily-") + (iso ?? modeOrIso));
}
