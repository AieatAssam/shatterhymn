import type { SimEvent } from "../sim/types";
export const TIPS: Record<string, string> = {
 golden: "Gold crystal! Smash it for lots of points.",
 chord: "Seven of one colour! Tap one to smash them all.",
 crack: "Ouch! Keep crystals away from the bell.",
 geode: "Rock crystal! Tap it twice to crack it open.",
 prism: "Rainbow crystal! Smash it to break everything near it.",
 splitter: "Splitter! It breaks into two small crystals.",
 rusher: "Fast one! Tap it quick.",
 mend: "Glowing white crystal! Smash it to fix the bell.",
 blue: "New colour: blue star!",
 purple: "New colour: purple circle!",
};
export class BannerQueue {
 private readonly pending: string[] = []; private current: string | null = null; private until = 0;
 constructor(private readonly now: () => number, readonly seen: Set<string>, public enabled = true, private readonly onSeen: () => void = () => {}) {}
 enqueue(id: string): void { if (!this.enabled || !TIPS[id] || this.seen.has(id) || this.pending.includes(id) || this.current === id) return; this.pending.push(id); }
 update(): string | null { if (!this.enabled) { this.current = null; this.pending.length = 0; return null; } const now = this.now(); if (this.current && now >= this.until) this.current = null; if (!this.current && this.pending.length) { this.current = this.pending.shift()!; this.seen.add(this.current); this.onSeen(); this.until = now + 3000; } return this.current; }
 event(event: SimEvent): void { if (event.type === "chordWave") this.enqueue("chord"); else if (event.type === "crack") this.enqueue(event.type); else if (event.type === "spawn") this.enqueue(event.kind); else if (event.type === "levelUp" && event.newNote !== null) this.enqueue(event.newNote === 3 ? "blue" : "purple"); }
}
