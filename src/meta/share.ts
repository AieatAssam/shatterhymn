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
 url.search = r.mode === "daily" ? "?daily=1" : `?seed=${seedToHex(r.seed)}`;
 url.hash = "";
 return url.toString();
}
export function shareText(r: RunResult, opts: { dailyNo?: number; url: string }): string {
 const label = r.mode === "daily" ? `Daily #${opts.dailyNo}` : "Run";
 return `Shatterhymn ${label} — ${r.stats.score.toLocaleString("en-US")}\n${hymnLine(r.hymn)}\nMost at once: ${r.stats.biggestN} · Streak: ${r.stats.longestStreak} · ${msToClock(r.stats.timeMs)}\n${r.slowDial ? "Slow dial · " : ""}Play: ${opts.url}`;
}
