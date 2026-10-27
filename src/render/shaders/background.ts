import { BEAM_MAX, FINISH } from "../fxConfig";
export const vertex = `varying vec2 vUv; void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,1.,1.);}`;
export const bakeFragment = `
#ifndef OCTAVES
#define OCTAVES 4
#endif
uniform float uAspect; uniform vec2 uBell; uniform vec3 uVoid0,uVoid1,uVoid2,uFog; uniform vec3 uNotes[5]; varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
vec3 noteCol(float i){return i<.5?uNotes[0]:i<1.5?uNotes[1]:i<2.5?uNotes[2]:i<3.5?uNotes[3]:uNotes[4];}
void main(){vec2 p=vUv; float n=0.,a=.5;vec2 q=vec2(p.x*uAspect,p.y)*3.;for(int i=0;i<OCTAVES;i++){n+=a*noise(q);q=q*2.03+7.1;a*=.5;}vec3 col=mix(uVoid1,uVoid2,p.y)+uFog*n*n*.30;
for(int i=0;i<5;i++){float fi=float(i),dx=p.x-(.14+fi*.18),hw=.04,u=dx/hw*.5+.5;vec3 glass=noteCol(mod(fi*2.+floor(u*3.),5.));if(p.y>.78){float lancet=step(abs(dx),hw)*step(.80,p.y)*step(p.y,.95-abs(dx)*1.6);float pane=abs(fract(u*3.)-.5)*2.;float frame=step(abs(dx),hw-.003)*step(.803,p.y)*step(p.y,.947-abs(dx)*1.6);col+=glass*lancet*frame*smoothstep(0.,.25,pane)*.22;}}
col=mix(col,uVoid0,smoothstep(.30,.78,length(p-.5)));vec2 dv=(p-uBell)*vec2(uAspect,1.);float r=length(dv)/.26;float alpha=1.;if(r<1.&&r>.18){float ba=atan(dv.y,dv.x),ring=floor(r*4.),petals=ring<.5?5.:ring<2.5?10.:20.;float su=(ba/6.283185+.5)*petals+(abs(ring-2.)<.5?.5:0.),seg=floor(su);float se=abs(fract(su)-.5)*2., re=abs(fract(r*4.)-.5)*2.; float lead=smoothstep(.18-fwidth(su)*2.,.18+fwidth(su)*2.,se)*smoothstep(.22-fwidth(r*4.)*2.,.22+fwidth(r*4.)*2.,re);float ni=mod(seg+ring*2.,5.);float roseEdge=smoothstep(1.,1.-max(fwidth(r),.001),r)*smoothstep(.18,.18+max(fwidth(r),.001),r);col=mix(col,noteCol(ni)*lead*smoothstep(1.,.85,r)*smoothstep(.18,.26,r),roseEdge);alpha=ni/4.;}gl_FragColor=vec4(col,alpha);}`;
export const fragment = `
uniform sampler2D uBake; uniform float uDialTop,uTime,uRealTime,uChoir,uHeat,uBeat,uAspect,uRose,uWarnNote,uShaftCount,uTitle,uStrikeNote,uStrikeAge;
uniform float uViewportHeight; uniform vec2 uBell; uniform vec3 uVoid0,uBeam,uNoteColor; uniform vec3 uNotes[5]; uniform vec4 uShafts[6]; varying vec2 vUv;
vec3 noteCol(float i){return i<.5?uNotes[0]:i<1.5?uNotes[1]:i<2.5?uNotes[2]:i<3.5?uNotes[3]:i<4.5?uNotes[4]:vec3(1.,.82,.48);}
void main(){vec2 p=vUv;vec4 baked=texture2D(uBake,p);vec2 dv=(p-uBell)*vec2(uAspect,1.);float br=length(dv),r=br/.26;vec3 col=baked.rgb;if(p.y>.78 && !(r<1.&&r>.18)) col=mix(col,uVoid0,uTitle);
if(r<1.&&r>.18){float ba=atan(dv.y,dv.x),ring=floor(r*4.),petals=ring<.5?5.:ring<2.5?10.:20.;float ni=mod(floor((ba/6.283185+.5)*petals+(abs(ring-2.)<.5?.5:0.))+ring*2.,5.);float warn=(uWarnNote>=0.&&abs(ni-uWarnNote)<.5)?3.5+1.5*sin(uRealTime*25.1327):0.;float lit=(mix(.045,.21,uTitle)+uHeat*(.30+.35*uBeat)+uRose)*(1.+warn);if(abs(ni-uStrikeNote)<.5)lit+=.9*pow(max(0.,1.-uStrikeAge/.9),2.);col=col*lit*mix(.55,1.,uTitle);}
if(p.y<=.84){float beamAmp=${BEAM_MAX.toFixed(2)}*(1.+2.*uChoir+2.5*uHeat+1.2*uBeat*uHeat)*mix(1.,.6,uTitle);for(int i=0;i<5;i++){float fi=float(i),wx=.14+fi*.18,dx=p.x-wx,u=dx/.04*.5+.5;vec3 glass=noteCol(mod(fi*2.+floor(u*3.),5.));float x=wx+sin(uTime*.314159+fi)*.02+(p.y-.80)*.21256;float w=.05+.025*mod(fi*3.,5.),d=(p.x-x)/w;float b=exp(-d*d*3.)*pow(clamp(p.y/.80,0.,1.),1.6)*smoothstep(.84,.78,p.y)*(.55+.45*sin(fi*2.3+uTime*.15));col+=mix(uBeam,glass,.7*uHeat)*min(b,1.)*beamAmp;}}
if(uShaftCount>0.){float ba=atan(dv.y,dv.x);for(int i=0;i<6;i++){vec4 s=uShafts[i];float age=uRealTime-s.y,life=s.z>1.3?1.4:1.2;if(s.z<=0.||age<0.||age>life)continue;float t=age/life,da=abs(atan(sin(ba-s.x),cos(ba-s.x))),w=mix(.10,.26,t);col+=noteCol(s.w)*exp(-da*da/(w*w))*smoothstep(.03,.10,br)*exp(-br*1.4)*(1.-t)*(1.-t)*s.z*1.6*smoothstep(uDialTop,uDialTop+${FINISH.beamFadePx.toFixed(1)}/uViewportHeight,p.y);}}
col=mix(col,col*(.6+1.2*uNoteColor)+uNoteColor*.05,.5*uHeat);col=mix(col,uVoid0,(1.-uTitle)*.85*smoothstep(.72,.84,p.y));gl_FragColor=vec4(col,1.);}`;
