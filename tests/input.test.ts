import { describe, expect, it } from "vitest";
import { Input } from "../src/input/input";
class Surface extends EventTarget { dispatch(type:string,fields:Record<string,unknown>={}):void{const e=new Event(type,{cancelable:true});Object.assign(e,fields);this.dispatchEvent(e);} }
function setup(){const surface=new Surface();const input=new Input(surface as unknown as HTMLElement,{onFirstGesture:()=>{},iosSwitch:false});return {surface,input};}
describe("direct input",()=>{
 it("keeps the latest tap in the frame",()=>{const {input}=setup();input.tap(0);input.tap(2);expect(input.consume()).toEqual({strike:2,miss:null});expect(input.consume()).toEqual({strike:null,miss:null});});
 it("resets the queued tap when disabled",()=>{const {input}=setup();input.tap(1);input.setEnabled(false);expect(input.consume()).toEqual({strike:null,miss:null});input.setEnabled(true);input.tap(0);expect(input.consume()).toEqual({strike:0,miss:null});});
 it("ignores Space and letter keys, supports digits, and ignores repeats",()=>{const {surface,input}=setup();surface.dispatch("keydown",{code:"Space",repeat:false});surface.dispatch("keydown",{code:"KeyA",repeat:false});expect(input.consume()).toEqual({strike:null,miss:null});surface.dispatch("keydown",{code:"Digit2",repeat:false});expect(input.consume()).toEqual({strike:1,miss:null});surface.dispatch("keydown",{code:"Numpad3",repeat:true});expect(input.consume()).toEqual({strike:null,miss:null});});
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

describe('slice pointer routing',()=>{
 function fixture(fail=false){
  const surface=new Surface(); const calls:string[]=[];const captured:number[]=[];
  Object.assign(surface,{setPointerCapture:(id:number)=>{captured.push(id);if(fail)throw new Error('capture');},releasePointerCapture:()=>{}});
  const input=new Input(surface as unknown as HTMLElement,{onFirstGesture:()=>{},iosSwitch:false,onTap:()=>calls.push('tap')});
  const dispatch=(type:string,id:number,extra:Record<string,unknown>={})=>surface.dispatch(type,{pointerId:id,pointerType:'touch',clientX:1,clientY:2,...extra});
  return {input,calls,captured,dispatch};
 }
 it('captures a stroke and recovers after cancel',()=>{const f=fixture();f.input.setStrokeHandlers({begin:()=>f.calls.push('begin'),move:()=>f.calls.push('move'),end:()=>f.calls.push('end')});f.dispatch('pointerdown',1);f.dispatch('pointermove',1);f.dispatch('pointercancel',1);f.dispatch('lostpointercapture',1);f.dispatch('pointerdown',2);expect(f.captured).toEqual([1,2]);expect(f.calls).toEqual(['begin','move','end','begin']);});
 it('keeps a stroke when capture fails and routes coalesced samples',()=>{const f=fixture(true);const times:number[]=[];f.input.setStrokeHandlers({begin:()=>{},move:p=>times.push(p.t),end:()=>{}});f.dispatch('pointerdown',1);f.dispatch('pointermove',1,{getCoalescedEvents:()=>[1,2,3,4].map(timeStamp=>({clientX:0,clientY:0,pointerType:'touch',timeStamp}))});expect(times).toEqual([1,2,3,4]);f.dispatch('pointermove',1,{getCoalescedEvents:()=>[]});expect(times).toHaveLength(5);});
 it('lets the newest finger win and preserves tap routing',()=>{const f=fixture();f.input.setStrokeHandlers({begin:()=>f.calls.push('begin'),move:()=>f.calls.push('move'),end:()=>f.calls.push('end')});f.dispatch('pointerdown',1);f.dispatch('pointerdown',2);f.dispatch('pointermove',1);f.dispatch('pointermove',2);expect(f.calls).toEqual(['begin','end','begin','move']);f.input.setStrokeHandlers(null);f.dispatch('pointerdown',3);expect(f.calls.at(-1)).toBe('tap');});
});
