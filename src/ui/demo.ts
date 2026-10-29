import { handIcon } from './icons';
export class Demo {
 private readonly root=document.createElement('div'); private readonly hand=document.createElement('div'); private readonly line=document.createElement('div');
 constructor(parent:HTMLElement, hudColumn?:HTMLElement) { this.root.className='demo'; this.line.className='demo-line';this.line.setAttribute('aria-live','polite');this.line.textContent='Tap a crystal!';this.hand.className='demo-hand';this.hand.setAttribute('aria-hidden','true');this.hand.innerHTML=handIcon;const ripple=document.createElement('span');ripple.className='demo-ripple';this.hand.append(ripple);if(hudColumn){this.line.classList.add('demo-line-in-hud');hudColumn.querySelector('.hud-top')!.after(this.line);}else this.root.append(this.line);this.root.append(this.hand);parent.append(this.root); }
 update(x:number,y:number):void { this.hand.style.left=`${x}px`;this.hand.style.top=`${y}px`; }
 dispose():void {this.line.remove();this.root.remove();}
}
