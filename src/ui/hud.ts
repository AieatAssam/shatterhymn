import { Spring1D } from "../core/spring";
import type { SimEvent, SimState } from "../sim/types";
import { bellIcon, pauseIcon } from "./icons";
import { h, qs } from "./dom";
export class Hud {
 readonly element: HTMLElement; private readonly score: HTMLElement; private readonly best: HTMLElement; private readonly mult: HTMLElement; private readonly hearts: HTMLElement[]; private readonly scoreSpring = new Spring1D(1, 4, .45); private readonly multSpring = new Spring1D(1, 4.5, .4); private from = 0; private target = 0; private age = 600; private lastMult = 1;
 constructor(root: HTMLElement, onPause: () => void, private readonly bestScore: number) {
  this.element = h(`<div class="hud-column"><div class="hud-top"><div class="hearts">${bellIcon.repeat(3)}</div><div class="score-block"><div class="score">0</div><div class="best"></div><div class="mult"></div></div><button class="pause-button" type="button" aria-label="Pause">${pauseIcon}</button></div><div class="banner" aria-live="polite"></div></div>`); root.append(this.element);
  this.score = qs(this.element, ".score"); this.best = qs(this.element, ".best"); this.mult = qs(this.element, ".mult"); this.hearts = Array.from(this.element.querySelectorAll<HTMLElement>(".hearts svg")); qs<HTMLButtonElement>(this.element, ".pause-button").addEventListener("click", onPause); this.best.textContent = `BEST ${bestScore.toLocaleString("en-US")}`;
 }
 event(event: SimEvent): void { if (event.type === "strike") { this.from = Number(this.score.textContent?.replaceAll(",", "")) || 0; this.target += event.points; this.age = 0; this.scoreSpring.x = 1.18; if (event.mult > this.lastMult) this.multSpring.x = 1.3; this.lastMult = event.mult; } if (event.type === "dud" || event.type === "crack") { this.lastMult = 1; this.multSpring.x = .7; } }
 update(state: SimState, dt: number): void { this.age = Math.min(600, this.age + dt); const t = 1 - (1 - this.age / 600) ** 3; this.score.textContent = Math.round(this.from + (this.target - this.from) * t).toLocaleString("en-US"); const steps = Math.max(1, Math.ceil(dt / 8)); for (let i=0;i<steps;i++) { this.scoreSpring.step(dt/steps/1000); this.multSpring.step(dt/steps/1000); } this.score.style.transform = `scale(${this.scoreSpring.x})`; this.mult.style.transform = `scale(${this.multSpring.x})`; this.mult.textContent = state.mult > 1 ? `×${state.mult}` : ""; this.hearts.forEach((heart, i) => heart.classList.toggle("broken", i >= 3 - state.cracks)); }
 reset(): void { this.from = this.target = 0; this.age = 600; this.lastMult = 1; }
 banner(text: string | null): void { const el = qs<HTMLElement>(this.element, ".banner"); if (el.textContent !== (text ?? "")) el.textContent = text ?? ""; el.classList.toggle("visible", !!text); }
}
