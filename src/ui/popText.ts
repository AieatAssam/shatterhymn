import type { SimEvent } from "../sim/types";
import { colors } from "./icons";
interface Label { el: HTMLElement; x: number; y: number; age: number }
export class PopText {
 private readonly labels: Label[]; private next=0;
 constructor(root: HTMLElement, private readonly project: (x:number,y:number)=>{sx:number;sy:number}, private readonly reduced: boolean) { this.labels=Array.from({length:12},()=>{const el=document.createElement("div"); el.className="pop-text"; root.append(el); return {el,x:0,y:0,age:700};}); }
 private add(text: string, x: number, y: number, color: string, size: number, sub = ""): void { const label=this.labels[this.next]!, el=label.el; this.next=(this.next+1)%this.labels.length; label.x=x;label.y=y;label.age=0;el.style.color=color;el.style.fontSize=`${size}px`;el.textContent=text; if(sub){const line=document.createElement("span");line.textContent=sub;el.append(line);} }
 event(event: SimEvent): void { if(event.type === "strike") { const c=event.shattered[0]; this.add(`+${event.points}`,c?.x ?? 0,c?.y ?? 0,colors[event.note]!,Math.min(40,22+2*event.n),event.n>=2?`${event.n} at once!`:""); for(const hit of event.shattered) if(hit.close) this.add("Close!",hit.x,hit.y,"#FFD27A",16); } else if(event.type === "dud") this.add("Missed",0,0,"#A59FC9",16); }
 update(dt: number): void { for(const label of this.labels) { if(label.age>=700) continue; label.age=Math.min(700,label.age+dt); const p=this.project(label.x,label.y), t=label.age/700, scale=1+.4*Math.exp(-8*t)*Math.cos(8*Math.PI*t); label.el.style.transform=`translate3d(${p.sx}px,${p.sy-(this.reduced?8:40)*t}px,0) translate(-50%,-50%) scale(${scale})`; label.el.style.opacity=String(Math.min(1,(700-label.age)/250)); } }
}
