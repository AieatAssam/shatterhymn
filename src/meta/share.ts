import { msToClock } from "../core/date";
import { seedToHex } from "../core/rng";
import type { RunResult } from "./runEnd";

const SYMBOLS: Record<number, string> = { 0: "🟥", 1: "🟨", 2: "🟩", 3: "🟦", 4: "🟪", 10: "✨", 20: "💔" };
export function hymnLine(hymn: number[]): string {
 const symbols = hymn.map(note => SYMBOLS[note] ?? "");
 return (symbols.length > 30 ? [...symbols.slice(0, 12), "…", ...symbols.slice(-17)] : symbols).join("");
}
export function shareUrl(base: string, r: RunResult): string {
 const url = new URL(base);
 url.search = r.daily ? `?daily=1&mode=${r.mode}` : `?seed=${seedToHex(r.seed)}&mode=${r.mode}`;
 url.hash = "";
 return url.toString();
}
export function shareText(r: RunResult, opts: { dailyNo?: number; url: string }): string {
 const label = r.mode === "tap" ? "Tap" : "Slice";
 const detail = r.mode === "tap" ? `Most at once: ${r.stats.biggest} · Streak: ${r.stats.longestChain}` : `Most in one swipe: ${r.stats.biggest} · Chain: ${r.stats.longestChain}`;
 return `Shatterhymn ${label}${r.daily ? ` · Daily #${opts.dailyNo}` : ""}: ${r.stats.score.toLocaleString("en-US")}\n${hymnLine(r.hymn)}\n${detail} · ${msToClock(r.stats.timeMs)}\n${r.slowDial ? "Slower crystals · " : ""}Play: ${opts.url}`;
}
