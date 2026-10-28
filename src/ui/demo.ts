import { handIcon } from './icons';
export class Demo {
 private readonly root=document.createElement('div'); private readonly hand=document.createElement('div');
 constructor(parent:HTMLElement) { this.root.className='demo'; const line=document.createElement('div');line.className='demo-line';line.setAttribute('aria-live','polite');line.textContent='Tap a crystal!';this.hand.className='demo-hand';this.hand.setAttribute('aria-hidden','true');this.hand.innerHTML=handIcon;this.root.append(line,this.hand);parent.append(this.root); }
 update(x:number,y:number):void { this.hand.style.left=`${x}px`;this.hand.style.top=`${y}px`; }
 dispose():void {this.root.remove();}
}
