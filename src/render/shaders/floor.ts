export const vertex = `varying vec2 vPos; void main(){vPos=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
export const fragment = `uniform float uTime,uNoteGlow,uSweep,uReducedMotion,uHeat,uBeat,uAttract; uniform vec4 uRingFlash; uniform vec3 uNoteColor,uFloorLine; varying vec2 vPos;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} float noise(vec2 p){vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){float r=length(vPos); if(r>(uSweep<0.0?(uAttract>0.5?11.5:10.6):12.0)) discard; float lines=0.0; for(int i=1;i<=4;i++){float fi=float(i);float w=i==4?0.05:0.03; lines+= (1.0-smoothstep(w*0.5,w*0.5+0.025,abs(r-fi*2.5)))*((i==4?0.7:0.4)*(1.+.5*uBeat*(.3+uHeat))+uRingFlash[i-1]*1.5);} float angle=0.0; float spokes=0.0; float caustic=0.0; float ticks=0.0;
#ifndef LOW
angle=atan(vPos.y,vPos.x); spokes=pow(max(0.0,cos(angle*5.0)),1000.0)*0.25; caustic=max(noise(vPos*0.65+vec2(uTime*0.02,0.0)),noise(vPos*0.9+vec2(0.0,-uTime*0.015)))*0.06;
#else
if(uSweep>=0.0 || uAttract>0.5 || dot(uRingFlash,vec4(1.))>0.0){angle=atan(vPos.y,vPos.x);spokes=smoothstep(.995,1.,cos(angle*5.))*.25;}
#endif
if(uSweep>=0.0 || uAttract>0.5 || dot(uRingFlash,vec4(1.))>0.0) ticks=step(.92,cos(angle*60.))*(1.-smoothstep(0.,.03,abs(r-10.42)))*.30; float attractTicks=uAttract*step(.92,cos(angle*60.))*(1.-smoothstep(0.,.08,abs(r-10.0)))*3.0*pow(max(0.,cos(angle-uTime*.35)),8.); float glow=pow(1.0-smoothstep(0.0,4.0,r),1.6)*(0.16+0.14*uNoteGlow); float sweep=uSweep>=0.0?(uReducedMotion>0.5?sin(3.14159265*uSweep):(1.0-smoothstep(0.0,0.16,abs(r-uSweep*12.0)))*2.0):0.0; float reflection=(1.-smoothstep(0.,1.8,abs(r-10.)))*(.10+uAttract*.28); vec3 col=uFloorLine*(1.+.4*uHeat)*(lines+spokes+caustic+ticks)+vec3(.761,.792,.847)*(attractTicks+reflection+glow)+uNoteColor*sweep; gl_FragColor=vec4(col,1.0); }`;
