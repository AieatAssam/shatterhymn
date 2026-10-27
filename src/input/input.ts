import type { SimInput } from "../sim/types";

export class Input {
  private press = false; private release = false; private cancel = false; private pointer: number | null = null; private key: string | null = null; private enabled = true; private first = false;
  constructor(private readonly surface: HTMLElement, private readonly opts: { onFirstGesture: () => void; iosSwitch: boolean; onPause?: () => void }) {
    surface.addEventListener("pointerdown", this.down as EventListener);
    surface.addEventListener("pointerup", this.up as EventListener);
    surface.addEventListener("pointercancel", this.up as EventListener);
    surface.addEventListener("lostpointercapture", this.up as EventListener);
    surface.addEventListener("touchstart", this.prevent, { passive: false });
    surface.addEventListener("contextmenu", this.prevent);
    const target = surface.ownerDocument?.defaultView ?? surface;
    target.addEventListener("keydown", this.keyDown as EventListener);
    target.addEventListener("keyup", this.keyUp as EventListener);
  }
  private gesture(): void { if (!this.first) { this.first = true; this.opts.onFirstGesture(); } }
  private readonly prevent = (e: Event): void => { e.preventDefault(); };
  private readonly down = (e: PointerEvent): void => { e.preventDefault(); if (!this.enabled || this.pointer !== null || this.key !== null || !e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return; this.pointer = e.pointerId; this.press = true; this.gesture(); this.surface.setPointerCapture(e.pointerId); };
  private readonly up = (e: PointerEvent): void => { if (e.pointerId !== this.pointer) return; this.pointer = null; this.release = true; };
  private readonly keyDown = (e: KeyboardEvent): void => { if (e.code === "Escape" || e.code === "KeyP") { if (!e.repeat) this.opts.onPause?.(); return; } if (e.code !== "Space" && !/^Key[A-Z]$/.test(e.code)) return; e.preventDefault(); if (!this.enabled || e.repeat || this.key !== null || this.pointer !== null) return; this.key = e.code; this.press = true; this.gesture(); };
  private readonly keyUp = (e: KeyboardEvent): void => { if (e.code !== this.key) return; e.preventDefault(); this.key = null; this.release = true; };
  consume(): SimInput { const result = { press: this.press, release: this.release, cancel: this.cancel }; this.press = this.release = this.cancel = false; return result; }
  setEnabled(on: boolean): void { this.enabled = on; if (!on) this.cancelHold(); }
  cancelHold(): void { this.pointer = null; this.key = null; this.press = this.release = false; this.cancel = true; }
}
