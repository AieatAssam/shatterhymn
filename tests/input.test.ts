import { describe, expect, it } from "vitest";
import { Input } from "../src/input/input";

class Surface extends EventTarget {
  setPointerCapture(): void {}
  dispatch(type: string, fields: Record<string, unknown> = {}): void { const e = new Event(type, {cancelable: true}); Object.assign(e, fields); this.dispatchEvent(e); }
}
function setup(): { surface: Surface; input: Input } { const surface = new Surface(); return {surface, input: new Input(surface as unknown as HTMLElement, {onFirstGesture: () => {}, iosSwitch: false})}; }
const pointer = (id: number, primary = true): Record<string, unknown> => ({pointerId: id, isPrimary: primary, pointerType: "touch", button: 0});
describe("input edges", () => {
  it("preserves a press and release between ticks", () => { const {surface,input}=setup(); surface.dispatch("pointerdown",pointer(1)); surface.dispatch("pointerup",pointer(1)); expect(input.consume()).toEqual({press:true,release:true,cancel:false}); expect(input.consume()).toEqual({press:false,release:false,cancel:false}); });
  it("ignores a second pointer", () => { const {surface,input}=setup(); surface.dispatch("pointerdown",pointer(1)); surface.dispatch("pointerdown",pointer(2,false)); surface.dispatch("pointerup",pointer(2)); expect(input.consume()).toEqual({press:true,release:false,cancel:false}); surface.dispatch("pointerup",pointer(1)); expect(input.consume().release).toBe(true); });
  it("releases on pointer cancellation", () => { const {surface,input}=setup(); surface.dispatch("pointerdown",pointer(1)); input.consume(); surface.dispatch("pointercancel",pointer(1)); expect(input.consume()).toEqual({press:false,release:true,cancel:false}); });
  it("cancels a hold", () => { const {surface,input}=setup(); surface.dispatch("pointerdown",pointer(1)); input.consume(); input.cancelHold(); expect(input.consume()).toEqual({press:false,release:false,cancel:true}); });
  it("handles Space like a pointer", () => { const {surface,input}=setup(); surface.dispatch("keydown",{code:"Space",repeat:false}); surface.dispatch("keyup",{code:"Space"}); expect(input.consume()).toEqual({press:true,release:true,cancel:false}); });
});

it("creates the iOS switch and follows vibration settings", () => {
  class Element extends EventTarget {
    id = ""; className = ""; htmlFor = ""; type = ""; style = {}; attributes = new Map<string, string>();
    ownerDocument!: { createElement: () => Element }; replacement?: Element; sibling?: Element;
    setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
    removeAttribute(name: string): void { if (name === "for") this.htmlFor = ""; else this.attributes.delete(name); }
    replaceWith(element: Element): void { this.replacement = element; }
    after(element: Element): void { this.sibling = element; }
    setPointerCapture(): void {}
  }
  const doc = { createElement: () => { const element = new Element(); element.ownerDocument = doc; return element; } };
  const surface = doc.createElement(); surface.id = "surface";
  const input = new Input(surface as unknown as HTMLElement, { onFirstGesture: () => {}, iosSwitch: true });
  const label = surface.replacement!, toggle = label.sibling!;
  expect(label.id).toBe("surface"); expect(label.htmlFor).toBe("hx");
  expect(toggle.id).toBe("hx"); expect(toggle.type).toBe("checkbox"); expect(toggle.attributes.has("switch")).toBe(true);
  input.setVibration(false); expect(label.htmlFor).toBe("");
  input.setVibration(true); expect(label.htmlFor).toBe("hx");
  const other = doc.createElement(); new Input(other as unknown as HTMLElement, { onFirstGesture: () => {}, iosSwitch: false });
  expect(other.replacement).toBeUndefined();
});
