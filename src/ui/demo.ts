import { handIcon } from './icons';
export class Demo {
 private readonly root=document.createElement('div'); private readonly hand=document.createElement('div'); private readonly line=document.createElement('div');
 constructor(parent:HTMLElement, hudColumn?:HTMLElement, mode:'tap'|'slice'='tap') { this.root.className='demo'; this.line.className='demo-line';this.line.setAttribute('aria-live','polite');this.line.textContent=mode==='slice'?'Swipe fast to slice!':'Tap a crystal!';this.root.dataset.mode=mode;this.hand.className='demo-hand';this.hand.setAttribute('aria-hidden','true');this.hand.innerHTML=handIcon;const ripple=document.createElement('span');ripple.className='demo-ripple';this.hand.append(ripple);if(hudColumn){this.line.classList.add('demo-line-in-hud');hudColumn.querySelector('.hud-top')!.after(this.line);}else this.root.append(this.line);this.root.append(this.hand);parent.append(this.root); }
 setLine(text:string):void {if(this.line.textContent!==text)this.line.textContent=text;}
 update(x:number,y:number,phase?:number):void { if(phase!==undefined){const reduced=document.body.classList.contains("reduce-motion")||window.matchMedia("(prefers-reduced-motion: reduce)").matches;const t=reduced?0:Math.min(1,phase/300)*2-1;const distance=Math.min(window.innerHeight,window.innerWidth/(window.innerWidth/window.innerHeight))*.15; x+=t*distance;y-=t*distance;}this.hand.style.left=`${x}px`;this.hand.style.top=`${y}px`; }
 dispose():void {this.line.remove();this.root.remove();}
}
