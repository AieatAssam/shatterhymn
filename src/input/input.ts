import type { SimInput } from "../sim/types";

export type StrokeSample = { x:number; y:number; t:number; pointerType:'touch'|'pen'|'mouse' };
export class Input {
  private pointer:number|null=null;
  private strokeHandlers:{begin:(sample:StrokeSample)=>void;move:(sample:StrokeSample)=>void;end:(t:number)=>void}|null=null;
  setStrokeHandlers(handlers:{begin:(sample:StrokeSample)=>void;move:(sample:StrokeSample)=>void;end:(t:number)=>void}|null):void {this.endStroke();this.strokeHandlers=handlers;}
  private sample(e:PointerEvent):StrokeSample {return {x:e.clientX,y:e.clientY,t:e.timeStamp,pointerType:e.pointerType==='mouse'?'mouse':e.pointerType==='pen'?'pen':'touch'};}
  private endStroke(t=0):void {if(this.pointer!==null){this.pointer=null;this.strokeHandlers?.end(t);}}
  injectStroke(points:{x:number;y:number}[],durationMs:number,startMs:number,pointerType:'touch'|'pen'|'mouse'='touch'):void {if(!this.enabled||!this.strokeHandlers||!points.length)return;const first=points[0]!;this.strokeHandlers.begin({...first,t:startMs,pointerType});for(let i=1;i<points.length;i++){const a=points[i-1]!,b=points[i]!,steps=Math.max(1,Math.ceil(durationMs/(points.length-1)/8));for(let j=1;j<=steps;j++){const f=j/steps;this.strokeHandlers.move({x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,t:startMs+durationMs*(i-1+f)/(points.length-1),pointerType});}}this.strokeHandlers.end(startMs+durationMs);}

  private strike: number | null = null;
  private missPoint: {x:number;y:number}|null = null;
  private enabled = true;
  private first = false;
  private label: HTMLLabelElement | null = null;
  constructor(private readonly surface: HTMLElement, private readonly opts: { onFirstGesture: () => void; onTap?: (x: number, y: number, pointerType: StrokeSample['pointerType']) => void; iosSwitch: boolean; onPause?: () => void }) {
    if (opts.iosSwitch) {
      const doc = surface.ownerDocument;
      const label = doc.createElement("label"), toggle = doc.createElement("input");
      label.id = surface.id; label.className = surface.className; label.htmlFor = "hx";
      toggle.id = "hx"; toggle.type = "checkbox"; toggle.setAttribute("switch", "");
      Object.assign(toggle.style, { position: "absolute", opacity: "0", pointerEvents: "none", width: "1px", height: "1px" });
      surface.replaceWith(label); label.after(toggle); this.surface = label; this.label = label;
    }
    this.surface.addEventListener("contextmenu", this.prevent);
    this.surface.addEventListener("pointerdown", e => { if (!this.enabled || (e.pointerType === "mouse" && e.button !== 0)) return; this.gesture(); if(this.strokeHandlers){if(this.pointer!==null)return;this.pointer=e.pointerId;this.surface.setPointerCapture?.(e.pointerId);this.strokeHandlers.begin(this.sample(e));}else this.opts.onTap?.(e.clientX,e.clientY,this.sample(e).pointerType); });
    this.surface.addEventListener("pointermove",e=>{if(!this.enabled||this.pointer!==e.pointerId||(e.pointerType==='mouse'&&e.buttons===0))return;const coalesced=e.getCoalescedEvents?.();for(const sample of coalesced?.length?coalesced:[e])this.strokeHandlers?.move(this.sample(sample));});
    for(const name of ['pointerup','pointercancel','lostpointercapture'] as const)this.surface.addEventListener(name,e=>{if(this.pointer===e.pointerId)this.endStroke(e.timeStamp);});
    this.surface.ownerDocument?.addEventListener?.('visibilitychange',()=>{if(this.surface.ownerDocument.hidden)this.endStroke();});
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
  injectStrike(note:number):void {if(this.enabled)this.strike=note;}
  miss(x:number,y:number):void {if(this.enabled)this.missPoint={x,y};}
  consume(): SimInput { const result = { strike: this.strike, miss:this.missPoint }; this.strike = null; this.missPoint=null; return result; }
  setEnabled(on: boolean): void { this.enabled = on; if (!on) {this.endStroke();this.reset();} }
  setVibration(on: boolean): void { if (this.label) { if (on) this.label.htmlFor = "hx"; else this.label.removeAttribute("for"); } }
  reset(): void { this.strike = null; this.missPoint=null; }
}
