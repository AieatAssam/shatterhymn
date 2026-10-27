import type { SimEvent } from "../sim/types";
export const TIPS: Record<string, string> = {
 dud: "No crystals of that colour were on screen. Picking a colour with none makes the bell wobble for a moment.",
 crack: "A crystal hit the bell. Two more hits and the run ends. Nearby crystals were cleared.",
 geode: "New: Geode. Hit it twice with its colour. The first hit breaks the rock shell.",
 prism: "New: Prism. It keeps changing colour. Break it and it breaks everything near it.",
 splitter: "New: Splitter. It breaks into two small crystals of the next colour.",
 rusher: "New: Rusher. Small and fast. Deal with it first.",
 mend: "New: Mend crystal (white glow). Break it to repair one crack.",
 blue: "New colour: Blue star. The dial now has 4 colours.",
 purple: "New colour: Purple circle. The dial now has 5 colours.",
};
export class BannerQueue {
 private readonly pending: string[] = []; private current: string | null = null; private until = 0;
 constructor(private readonly now: () => number, readonly seen: Set<string>, public enabled = true, private readonly onSeen: () => void = () => {}) {}
 enqueue(id: string): void { if (!this.enabled || !TIPS[id] || this.seen.has(id) || this.pending.includes(id) || this.current === id) return; this.pending.push(id); }
 update(): string | null { if (!this.enabled) { this.current = null; this.pending.length = 0; return null; } const now = this.now(); if (this.current && now >= this.until) this.current = null; if (!this.current && this.pending.length) { this.current = this.pending.shift()!; this.seen.add(this.current); this.onSeen(); this.until = now + 3000; } return this.current; }
 event(event: SimEvent): void { if (event.type === "dud" || event.type === "crack") this.enqueue(event.type); else if (event.type === "spawn") this.enqueue(event.kind); else if (event.type === "levelUp" && event.newNote !== null) this.enqueue(event.newNote === 3 ? "blue" : "purple"); }
}
