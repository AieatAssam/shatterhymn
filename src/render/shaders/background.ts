import { BEAM_MAX } from "../fxConfig";
export const vertex = `varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 1.0, 1.0); }`;
export const fragment = `
#ifndef OCTAVES
#define OCTAVES 4
#endif
uniform float uTime,uRealTime,uChoir,uHeat,uBeat,uAspect,uRose,uWarnNote;
uniform vec2 uBell; uniform vec3 uVoid0,uVoid1,uVoid2,uFog,uBeam,uNoteColor; uniform vec3 uNotes[5]; uniform vec4 uShafts[6];
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
vec3 noteCol(float i){return i<0.5?uNotes[0]:i<1.5?uNotes[1]:i<2.5?uNotes[2]:i<3.5?uNotes[3]:i<4.5?uNotes[4]:vec3(1.,.82,.48);}
void main(){
  vec2 p=vUv;
  // nebula (aspect-correct, fever tints it toward the note)
  float n=0.,a=.5; vec2 q=vec2(p.x*uAspect,p.y)*3.0+vec2(uTime*.01,uTime*.004);
  for(int i=0;i<OCTAVES;i++){n+=a*noise(q);q=q*2.03+7.1;a*=.5;}
  vec3 col=mix(uVoid1,uVoid2,p.y)+mix(uFog,uNoteColor*.45,.25*uHeat)*n*n*.30;
  // 5 lancet windows at the top; each casts its beam (beam tinted by its glass when hot)
  float beamAmp=${BEAM_MAX.toFixed(2)}*(1.+2.*uChoir+.6*uHeat+.25*uBeat);
  for(int i=0;i<5;i++){
    float fi=float(i), wx=.14+fi*.18, dx=p.x-wx, hw=.04;
    float lancet=step(abs(dx),hw)*step(.80,p.y)*step(p.y,.95-abs(dx)*1.6);
    float u=dx/hw*.5+.5; float pane=abs(fract(u*3.)-.5)*2.;
    vec3 glass=noteCol(mod(fi*2.+floor(u*3.),5.));
    col+=glass*lancet*smoothstep(0.,.25,pane)*(.10+.10*uHeat+.30*uChoir);
    float x=wx+sin(uTime*.314159+fi)*.02+(p.y-.80)*.21256;              // −12° slant
    float w=.05+.025*mod(fi*3.,5.), d=(p.x-x)/w;
    float b=exp(-d*d*3.)*pow(clamp(p.y/.80,0.,1.),1.6)*smoothstep(.84,.78,p.y)*(.55+.45*sin(fi*2.3+uTime*.15));
    col+=mix(uBeam,glass,.35*uHeat)*min(b,1.)*beamAmp;
  }
  float edge=smoothstep(.30,.78,length(p-.5)); col=mix(col,uVoid0,edge);   // keep 80% dark
  // rose window behind the bell (frames the arena)
  vec2 dv=(p-uBell)*vec2(uAspect,1.); float br=length(dv), ba=atan(dv.y,dv.x);
  float r=br/0.26;
  if(r<1.&&r>.18){
    float ring=floor(r*4.), petals=ring<.5?5.:ring<2.5?10.:20.;
    float su=(ba/6.283185+.5)*petals+(abs(ring-2.)<.5?.5:0.), seg=floor(su);
    float lead=smoothstep(0.,.18,abs(fract(su)-.5)*2.)*smoothstep(0.,.22,abs(fract(r*4.)-.5)*2.);
    float ni=mod(seg+ring*2.,5.);
    float warn=(uWarnNote>=0.&&abs(ni-uWarnNote)<.5)?2.+1.5*sin(uRealTime*25.1327):0.;
    float sweep=.8+.2*sin((ba/6.283185)*12.566-uRealTime*.9);
    float lit=(0.045+0.20*uHeat+.06*uBeat*(.3+uHeat)+uRose)*(1.+warn)*sweep*smoothstep(1.,.85,r)*smoothstep(.18,.26,r);
    col+=noteCol(ni)*lit*lead;
  }
  // light shafts from the bell toward what you just broke
  for(int i=0;i<6;i++){
    vec4 s=uShafts[i]; float age=uRealTime-s.y, life=s.z>1.3?.9:.55;
    if(s.z<=0.||age<0.||age>life) continue;
    float t=age/life, da=abs(atan(sin(ba-s.x),cos(ba-s.x))), w=mix(.05,.14,t);
    col+=noteCol(s.w)*exp(-da*da/(w*w))*smoothstep(.03,.10,br)*exp(-br*1.4)*(1.-t)*(1.-t)*s.z;
  }
  gl_FragColor=vec4(col,1.);
}`;
