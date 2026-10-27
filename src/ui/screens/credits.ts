import credits from "../../../CREDITS.md?raw";
import { button, panel, unmount, type ScreenContext } from "./common";
export function mount(root: HTMLElement, ctx: ScreenContext): {unmount:()=>void} {const box=panel(root,"Credits");const text=document.createElement("pre");text.className="credits";text.textContent=credits;box.append(text);button(box,"Back",ctx.back);return {unmount:()=>unmount(box)};}
