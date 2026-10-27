import type { SimEvent } from '../sim/types';
import { placeFloaters } from '../game/floaters';
import { FINISH } from '../render/fxConfig';
import { colors } from './icons';
export function popLines(n:number,points:number,mult:number):{main:string;mult:string;sub:string;hint:string}{return {main:`+${points}`,mult:mult>1?`×${mult}`:'',sub:n>=2?`${n} at once!`:'',hint:n===5?'2 more for a Choir':n===6?'1 more for a Choir':''};}
export function popSize(n:number):number{return n>=2?40:32;}
interface Label {el:HTMLElement;main:HTMLElement;mult:HTMLElement;sub:HTMLElement;hint:HTMLElement;x:number;y:number;age:number;life:number;sign:number;order:number;close:boolean}
export class PopText {
 private readonly labels:Label[];private next=0;private serial=0;
 constructor(root:HTMLElement,private readonly project:(x:number,y:number)=>{sx:number;sy:number},public reduced:boolean){this.labels=Array.from({length:16},(_,i)=>{const el=document.createElement('div');el.className='pop-text';const main=document.createElement('span'),mult=document.createElement('span'),sub=document.createElement('span'),hint=document.createElement('span');main.className='main';mult.className='mult';sub.className='sub';hint.className='hint';el.append(main,mult,sub,hint);root.append(el);return {el,main,mult,sub,hint,x:0,y:0,age:1200,life:900,sign:i%2?1:-1,order:0,close:false};});}
 private add(text:string,x:number,y:number,color:string,size:number,sub='',mult='',hint='',big=false,life=900):void{const l=this.labels[this.next]!,el=l.el;this.next=(this.next+1)%this.labels.length;l.x=x;l.y=y;l.age=0;l.order=++this.serial;l.close=text==='Close!';el.classList.toggle('close',l.close);l.life=life;el.style.color=color;el.style.setProperty('--note',color);el.style.fontSize=`${size}px`;el.classList.toggle('big',big);el.classList.toggle('points',text.startsWith('+'));l.main.textContent=text;l.mult.textContent=mult;l.sub.textContent=sub;l.hint.textContent=hint;}
 event(e:SimEvent):void{if(e.type==='strike'&&e.n>0){let x=0,y=0;for(const c of e.shattered){x+=c.x;y+=c.y;}const count=e.shattered.length||1;const lines=popLines(e.n,e.points,e.mult);this.add(lines.main,x/count,y/count,colors[e.note]!,popSize(e.n),lines.sub,lines.mult,lines.hint,e.n>=4);const close=e.shattered.filter(hit=>hit.close).sort((a,b)=>Math.hypot(a.x,a.y)-Math.hypot(b.x,b.y))[0];if(close)this.add('Close!',close.x,close.y,'#FFD27A',34);}else if(e.type==='golden')this.add(`Gold bonus +${e.points}`,e.x,e.y,'#FFD27A',30);else if(e.type==='chordWave')this.add('Chord wave',Math.cos(e.theta)*9,Math.sin(e.theta)*9,'#FFD27A',20,'','','',false,1200);else if(e.type==='dud')this.add('Missed',0,0,'#A59FC9',16);}
 update(dt:number):void{
  const active=this.labels.filter(l=>l.age<l.life).sort((a,b)=>a.order-b.order);
  const rects=active.map(l=>{const p=this.project(l.x,l.y),t=l.age/l.life; const bounds=l.el.getBoundingClientRect(),width=bounds.width,height=bounds.height;return {x:p.sx-width/2,y:p.sy-height/2-(l.close?FINISH.closeOffset:0)-(this.reduced?8:56)*t,width,height};});
  const rootStyle=getComputedStyle(document.documentElement);const inset=(name:string):number=>parseFloat(rootStyle.getPropertyValue(name))||0;const placed=placeFloaters(rects,{left:inset('--safe-left')+FINISH.floaterGap,top:inset('--safe-top')+FINISH.floaterGap,right:window.innerWidth-inset('--safe-right')-FINISH.floaterGap,bottom:window.innerHeight-inset('--safe-bottom')-FINISH.floaterGap});
  active.forEach((l,i)=>{const r=placed[i]!;l.el.style.transform=`translate3d(${r.x}px,${r.y}px,0)`;l.el.style.opacity=String(l.close && l.age<FINISH.closeOpaqueMs?1:Math.min(1,(l.life-l.age)/250));l.age=Math.min(l.life,l.age+dt);if(l.age>=l.life)l.el.style.opacity='0';});
 }
}
