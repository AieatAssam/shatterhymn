export function h(html: string): HTMLElement { const template = document.createElement("template"); template.innerHTML = html.trim(); return template.content.firstElementChild as HTMLElement; }
export function qs<T extends Element>(root: ParentNode, selector: string): T { const element = root.querySelector<T>(selector); if (!element) throw new Error(`Missing element: ${selector}`); return element; }
export function show(element: HTMLElement): void { element.classList.remove("is-hidden"); }
export function hide(element: HTMLElement): void { element.classList.add("is-hidden"); }
