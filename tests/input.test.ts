import { describe, expect, it } from "vitest";
import { Input } from "../src/input/input";
class Surface extends EventTarget { dispatch(type:string,fields:Record<string,unknown>={}):void{const e=new Event(type,{cancelable:true});Object.assign(e,fields);this.dispatchEvent(e);} }
function setup(){const surface=new Surface();const input=new Input(surface as unknown as HTMLElement,{onFirstGesture:()=>{},iosSwitch:false});return {surface,input};}
describe("direct input",()=>{
 it("keeps the latest tap in the frame",()=>{const {input}=setup();input.tap(0);input.tap(2);expect(input.consume()).toEqual({strike:2});expect(input.consume()).toEqual({strike:null});});
 it("resets the queued tap when disabled",()=>{const {input}=setup();input.tap(1);input.setEnabled(false);expect(input.consume()).toEqual({strike:null});input.setEnabled(true);input.tap(0);expect(input.consume()).toEqual({strike:0});});
 it("ignores Space and letter keys, supports digits, and ignores repeats",()=>{const {surface,input}=setup();surface.dispatch("keydown",{code:"Space",repeat:false});surface.dispatch("keydown",{code:"KeyA",repeat:false});expect(input.consume()).toEqual({strike:null});surface.dispatch("keydown",{code:"Digit2",repeat:false});expect(input.consume()).toEqual({strike:1});surface.dispatch("keydown",{code:"Numpad3",repeat:true});expect(input.consume()).toEqual({strike:null});});
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
