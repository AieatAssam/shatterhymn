import type { SimInput } from "../sim/types";

export class Input {
  private strike: number | null = null;
  private enabled = true;
  private first = false;
  private label: HTMLLabelElement | null = null;
  constructor(private readonly surface: HTMLElement, private readonly opts: { onFirstGesture: () => void; onTap?: (x: number, y: number) => void; iosSwitch: boolean; onPause?: () => void }) {
    if (opts.iosSwitch) {
      const doc = surface.ownerDocument;
      const label = doc.createElement("label"), toggle = doc.createElement("input");
      label.id = surface.id; label.className = surface.className; label.htmlFor = "hx";
      toggle.id = "hx"; toggle.type = "checkbox"; toggle.setAttribute("switch", "");
      Object.assign(toggle.style, { position: "absolute", opacity: "0", pointerEvents: "none", width: "1px", height: "1px" });
      surface.replaceWith(label); label.after(toggle); this.surface = label; this.label = label;
    }
    this.surface.addEventListener("contextmenu", this.prevent);
    this.surface.addEventListener("pointerdown", e => { if (!this.enabled || (e.pointerType === "mouse" && e.button !== 0)) return; this.gesture(); this.opts.onTap?.(e.clientX,e.clientY); });
    const target = this.surface.ownerDocument?.defaultView ?? this.surface;
    target.addEventListener("keydown", this.keyDown as EventListener);
  }
  private gesture(): void { if (!this.first) { this.first = true; this.opts.onFirstGesture(); } }
  private readonly prevent = (e: Event): void => e.preventDefault();
  private readonly keyDown = (e: KeyboardEvent): void => {
    if ((e.target as HTMLElement | null)?.closest?.("button, input, select, textarea")) return;
    if (e.code === "Escape" || e.code === "KeyP") { if (!e.repeat) this.opts.onPause?.(); return; }
    if (!this.enabled || e.repeat) return;
    const match = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
    if (!match) return;
    const note = Number(match[1]) - 1; e.preventDefault(); this.tap(note);
  };
  tap(note: number): void { if (!this.enabled) return; this.strike = note; this.gesture(); }
  consume(): SimInput { const result = { strike: this.strike }; this.strike = null; return result; }
  setEnabled(on: boolean): void { this.enabled = on; if (!on) this.reset(); }
  setVibration(on: boolean): void { if (this.label) { if (on) this.label.htmlFor = "hx"; else this.label.removeAttribute("for"); } }
  reset(): void { this.strike = null; }
}
