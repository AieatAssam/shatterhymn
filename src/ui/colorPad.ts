import type { SimState } from "../sim/types";
import { colors, glyph } from "./icons";

export type PadState = "title" | "tutorial" | "run" | "daily" | "paused" | "over";
export function padVisible(state: PadState, tutorialNeedsPad = false): boolean { return state === "run" || state === "daily" || (state === "tutorial" && tutorialNeedsPad); }

const names = ["Red triangle", "Yellow diamond", "Green hexagon", "Blue star", "Purple circle"];
export function colorPadCount(K: number): number { return Math.max(0, Math.min(K, names.length)); }
export class ColorPad {
  readonly element: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly buttons: HTMLButtonElement[] = [];
  private shown = 0;
  constructor(root: HTMLElement, private readonly tap: (note: number) => void, private readonly run: () => number) {
    this.element = document.createElement("div"); this.element.className = "color-pad"; this.element.hidden = true; this.element.setAttribute("aria-label", "Colour buttons");
    this.hint = document.createElement("div"); this.hint.className = "color-pad-hint"; this.hint.textContent = "Tap a colour to shatter every crystal of that colour."; this.element.append(this.hint);
    root.append(this.element);
  }
  setReducedMotion(value: boolean): void { this.element.classList.toggle("reduce-motion", value); }
  update(state: SimState): void {
    const count = colorPadCount(state.K);
    this.hint.hidden = this.run() > 3;
    if (count === this.shown) { this.element.classList.toggle("lockout", state.lockMs > 0); return; }
    while (this.buttons.length > count) this.buttons.pop()!.remove();
    for (let note = this.buttons.length; note < count; note++) {
      const button = document.createElement("button"); button.type = "button"; button.className = "color-button new-note"; button.style.setProperty("--note", colors[note]!);
      button.setAttribute("aria-label", `${names[note]}, key ${note + 1}`); button.innerHTML = `${glyph(note)}<span class="key-number">${note + 1}</span>`;
      button.addEventListener("pointerdown", event => { event.preventDefault(); button.classList.add("pilot-pressed"); window.setTimeout(() => button.classList.remove("pilot-pressed"), 80); this.tap(note); });
      button.addEventListener("click", event => { if (event.detail === 0) this.tap(note); });
      window.setTimeout(() => button.classList.remove("new-note"), 250);
      this.element.append(button); this.buttons.push(button);
    }
    this.shown = count; this.element.style.setProperty("--button-count", String(count)); this.element.classList.toggle("lockout", state.lockMs > 0);
  }
  pilot(note: number | null): void { if (note === null) return; const button = this.buttons[note]; if (!button) return; button.classList.add("pilot-pressed"); window.setTimeout(() => button.classList.remove("pilot-pressed"), 80); }
}
