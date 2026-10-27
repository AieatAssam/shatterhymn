import { hash32 } from "../core/rng";
export { dailyNumber } from "../core/date";
export function dailySeed(iso: string): number { return hash32("shatterhymn-daily-" + iso); }
