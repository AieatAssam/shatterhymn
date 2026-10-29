import type { SliceEvent } from '../sim/sliceTypes';
import type { SimEvent } from '../sim/types';
import { placeFloaters } from '../game/floaters';
import { FINISH, SLICE_FX } from '../render/fxConfig';
import { colors } from './icons';
import { playArea } from '../modes/slice/playArea';
export function popLines(n:number,points:number,mult:number):{main:string;mult:string;sub:string;hint:string}{return {main:`+${points}`,mult:mult>1?`×${mult}`:'',sub:n>=2&&n<7?`${n} at once!`:'',hint:n===5?'2 more for a Choir':n===6?'1 more for a Choir':''};}
export function popSize(n:number):number{return n>=2?40:32;}
export function swipeCallout(cuts:number,bonus:number):{main:string;sub:string;size:number}|null {if(cuts<3)return null;return {main:cuts===3?'Nice!':cuts===4?'Great!':cuts===5?'Amazing!':'Incredible!',sub:`${cuts} in one swipe! +${bonus}`,size:cuts===3?34:cuts===4?40:cuts===5?46:52};}
export function slicePopY(y:number,width:number,height:number,safeTop:number,labelHeight:number):number {
 const area=playArea(width,height,Math.max(.45,Math.min(2.4,width/height)));
 const top=Math.max(64,.09*height)+safeTop,bottom=area.bottom-area.height*(SLICE_FX.bellY+.10)-12;
 return Math.max(top,Math.min(bottom-labelHeight,y));
}
export function sliceCutText(points:number):string {return `+${points}`;}
export function sliceSwipeScale(age:number):number {if(age>=180)return 1;const t=Math.max(0,age)/180;return 1+.4*Math.exp(-6*t)*Math.cos(8*t);}
interface Label {el:HTMLElement;main:HTMLElement;mult:HTMLElement;sub:HTMLElement;hint:HTMLElement;x:number;y:number;age:number;life:number;sign:number;order:number;close:boolean;multValue:number;sliceKind:''|'cut'|'swipe';screenX:number;screenY:number}
export class PopText {
 private readonly labels:Label[];private next=0;private serial=0;
 constructor(root:HTMLElement,private readonly project:(x:number,y:number)=>{sx:number;sy:number},public reduced:boolean){this.labels=Array.from({length:16},(_,i)=>{const el=document.createElement('div');el.className='pop-text';const main=document.createElement('span'),mult=document.createElement('span'),sub=document.createElement('span'),hint=document.createElement('span');main.className='main';mult.className='mult';sub.className='sub';hint.className='hint';el.append(main,mult,sub,hint);root.append(el);return {el,main,mult,sub,hint,x:0,y:0,age:1200,life:900,sign:i%2?1:-1,order:0,close:false,multValue:1,sliceKind:'' as const,screenX:0,screenY:0};});}
 private add(text:string,x:number,y:number,color:string,size:number,sub='',mult='',hint='',big=false,life=900):void{const l=this.labels[this.next]!,el=l.el;this.next=(this.next+1)%this.labels.length;l.x=x;l.y=y;l.sliceKind='';l.age=0;l.order=++this.serial;l.close=text==='Close!';el.classList.remove('slice-pop');el.classList.toggle('close',l.close);el.classList.toggle('penalty',text.startsWith("No "));l.life=life;el.style.color=color;el.style.setProperty('--note',color);el.style.fontSize=`${size}px`;el.classList.toggle('big',big);el.classList.toggle('points',text.startsWith('+'));l.main.textContent=text;l.mult.textContent=mult;l.sub.textContent=sub;l.hint.textContent=hint;}
 event(e:SimEvent):void{if(e.type==='strike'&&e.n>0){let x=0,y=0;for(const c of e.shattered){x+=c.x;y+=c.y;}const count=e.shattered.length||1;const lines=popLines(e.n,e.points,e.mult);this.add(lines.main,x/count,y/count,colors[e.note]!,popSize(e.n),lines.sub,lines.mult,lines.hint,e.n>=4);this.labels[(this.next+this.labels.length-1)%this.labels.length]!.multValue=e.mult;}else if(e.type==='golden')this.add(`Gold bonus +${e.points}`,e.x,e.y,'#FFD27A',30);else if(e.type==='chordWave')this.add('Chord wave',Math.cos(e.theta)*9,Math.sin(e.theta)*9,'#FFD27A',20,'','','',false,1200);}

 slice(e:SliceEvent,toScreen:(x:number,y:number)=>{sx:number;sy:number}):void {
  if(e.type!=='cut'&&e.type!=='strokeEnd'&&e.type!=='bigHit'&&e.type!=='bigBreak')return;
  if(e.type==='bigHit'&&e.hpLeft===0)return;
  const call=e.type==='strokeEnd'?swipeCallout(e.cuts,e.bonus):e.type==='bigBreak'?{main:'BIG BREAK!',sub:`+${e.points}`,size:46}:null;if(e.type==='strokeEnd'&&!call)return;
  if(call){const old=this.labels.filter(l=>l.sliceKind==='swipe'&&l.age<l.life).sort((a,b)=>a.order-b.order);if(old.length>=2)old[0]!.age=Math.max(old[0]!.age,old[0]!.life-250);}
  const p=toScreen(e.x,e.y);this.add(call?.main??(e.type==='bigHit'?`${e.hpLeft} more!`:sliceCutText(e.type==='cut'?e.points:0)),e.x,e.y,e.type==='cut'||e.type==='bigHit'?colors[e.note]!: '#FFD27A',call?.size??(e.type==='bigHit'?24:e.type==='cut'&&e.chainStep>=3?22:18),call?.sub??'','','',false,call?1030:500);
  const l=this.labels[(this.next+this.labels.length-1)%this.labels.length]!;l.sliceKind=call?'swipe':'cut';l.screenX=p.sx;l.screenY=p.sy;l.el.classList.add('slice-pop');if(!call)l.el.style.color='white';
 }

 update(dt:number,currentMult?:number):void{
  if(currentMult !== undefined) for(const l of this.labels) if(!l.sliceKind && l.el.classList.contains("points") && l.multValue !== currentMult){l.age=l.life;l.el.style.opacity="0";}
  const slice=this.labels.filter(l=>l.sliceKind&&l.age<l.life);for(const l of slice){const width=l.el.offsetWidth,height=l.el.offsetHeight,safeTop=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-top'))||0;const scale=this.reduced||l.sliceKind==='cut'?1:sliceSwipeScale(l.age);const x=Math.max(12,Math.min(window.innerWidth-12-width*scale,l.screenX-width*scale/2));const y=slicePopY(l.screenY-height*scale/2-(this.reduced||l.sliceKind==='swipe'?0:30*l.age/l.life),window.innerWidth,window.innerHeight,safeTop,height*scale);l.el.style.transform=`translate3d(${x}px,${y}px,0) scale(${scale})`;l.el.style.opacity=String(Math.min(1,(l.life-l.age)/(l.sliceKind==='cut'?200:250)));l.age=Math.min(l.life,l.age+dt);if(l.age>=l.life)l.el.style.opacity='0';}
  const active=this.labels.filter(l=>!l.sliceKind&&l.age<l.life).sort((a,b)=>a.order-b.order);
  const rects=active.map(l=>{const p=this.project(l.x,l.y),t=l.age/l.life; if(l.el.classList.contains("penalty")){p.sx=window.innerWidth/2;p.sy=window.innerHeight*.22;} else if(l.el.classList.contains("points")){p.sx=window.innerWidth/2;p.sy=window.innerHeight*.68;} const bounds=l.el.getBoundingClientRect(),width=bounds.width,height=bounds.height;return {x:p.sx-width/2,y:l.el.classList.contains("points")?p.sy-height/2:p.sy-height/2-(l.close?FINISH.closeOffset:0)-(this.reduced?0:56)*t,width,height};});
  const rootStyle=getComputedStyle(document.documentElement);const inset=(name:string):number=>parseFloat(rootStyle.getPropertyValue(name))||0;const placed=placeFloaters(rects,{left:inset('--safe-left')+FINISH.floaterGap,top:inset('--safe-top')+FINISH.floaterGap,right:window.innerWidth-inset('--safe-right')-FINISH.floaterGap,bottom:window.innerHeight-inset('--safe-bottom')-FINISH.floaterGap});
  active.forEach((l,i)=>{const r=placed[i]!;const y=l.el.classList.contains("points")?Math.max(240,r.y):r.y;l.el.style.transform=`translate3d(${r.x}px,${y}px,0)`;l.el.style.opacity=String(l.close && l.age<FINISH.closeOpaqueMs?1:Math.min(1,(l.life-l.age)/250));l.age=Math.min(l.life,l.age+dt);if(l.age>=l.life)l.el.style.opacity='0';});
 }
}
