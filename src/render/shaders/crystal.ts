import { PLAY_START } from "../fxConfig";
export const vertex = `attribute vec3 aColor,aCore,aDark; attribute vec4 aCut; varying vec4 vCut; attribute float aFlash,aCrack,aFade,aKind; varying vec3 vColor,vCore,vDark,vNormal,vView,vLocal; varying float vFlash,vCrack,vFade,vKind,vSeed; void main(){vCut=aCut;vSeed=float(gl_InstanceID);vColor=aColor;vCore=aCore;vDark=aDark;vFlash=aFlash;vCrack=aCrack;vFade=aFade;vKind=aKind;vLocal=position;vec4 p=modelViewMatrix*instanceMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*mat3(instanceMatrix)*normal);vView=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`;
export const fragment = `varying vec4 vCut; uniform vec3 uKeyDir; uniform float uTime,uHeat; varying vec3 vColor,vCore,vDark,vNormal,vView,vLocal; varying float vFlash,vCrack,vFade,vKind,vSeed;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} float edge(vec2 p){vec2 g=floor(p),f=fract(p);float a=10.,b=10.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 o=vec2(float(x),float(y));vec2 q=o+vec2(hash(g+o),hash(g+o+19.))-f;float d=dot(q,q);if(d<a){b=a;a=d;}else b=min(b,d);}return sqrt(b)-sqrt(a);}
vec3 env(vec3 d){ // the cathedral seen through the gem (no texture fetch)
  float up=clamp(d.y*0.5+0.5,0.,1.);
  vec3 c=mix(vec3(0.02,0.015,0.05),vec3(0.17,0.14,0.40),up);
  float a=atan(d.x,d.z);
  float win=smoothstep(0.55,1.0,sin(a*5.0+uTime*0.15))*smoothstep(0.35,0.95,up);
  return c+vec3(0.72,0.78,1.0)*win;
}
void main(){
  if(vCut.w != 0. && dot(vLocal,vCut.xyz)*vCut.w < 0.) discard;
  vec3 N=normalize(vNormal),V=normalize(vView);
  float ndv=clamp(dot(N,V),0.,1.);
  float light=max(dot(N,uKeyDir),0.);
  float silhouette=1.-ndv; float fres=smoothstep(.88-fwidth(silhouette),1.,silhouette);
  vec3 body=mix(vDark,vColor,step(.08,light))*(.35+.65*light);
  float lum=dot(body,vec3(.2126,.7152,.0722)); body*=min(1.,.55/max(lum,.0001));
  vec3 color=body;
  float core=smoothstep(.30,0.,length(vLocal.xy));
  vec3 coreColor=vCore;float coreLum=dot(coreColor,vec3(.2126,.7152,.0722));coreColor*=min(1.,.8/max(coreLum,.0001));
  color=mix(color,coreColor,core*.2);
  vec3 H=normalize(uKeyDir+V);
  float glint=pow(max(dot(N,H),0.),48.)*(.55+.45*sin(uTime*7.+vSeed*31.));
  color+=vec3(.62,.85,1.)*fres*1.0+vec3(1.)*glint*1.6;
  color+=vec3(1.)*fres*.6*uHeat;
  vec3 irid=.5+.5*cos(6.2831*(fres+uTime*.04+vec3(0.,.33,.67)));
  float e=min(edge(vLocal.xy*3.),min(edge(vLocal.xy*6.),edge(vLocal.xy*12.)));
  color+=vec3(4.)*(1.-smoothstep(0.,0.04,e))*vCrack;
  if(vKind>0.5&&vKind<1.5&&length(vLocal.xy)>0.3){float cracks=1.-smoothstep(0.025,0.06,abs(sin(atan(vLocal.y,vLocal.x)*1.5)*length(vLocal.xy)));vec3 rock=mix(vec3(0.023,0.018,0.039),vec3(0.068,0.051,0.116),hash(floor(vLocal.xy*18.)));color=mix(rock,color,cracks);}
  if(vKind>1.5&&vKind<2.5)color+=irid*0.6*fres;
  if(vKind>2.5&&vKind<3.5)color+=vec3(2.5)*smoothstep(0.03,0.,abs(vLocal.x));
  if(vKind>4.5&&vKind<5.5)color=mix(color,vec3(dot(color,vec3(0.333)))+vec3(0.5),0.5);   // mend (range now bounded)
  if(vKind>5.5){                                                          // golden (§5.4)
    color=mix(color,color*vec3(1.25,1.0,0.6),0.35)+vec3(1.0,0.78,0.35)*(fres*2.6+glint*2.0)
         +vec3(1.,.82,.48)*0.25*(0.5+0.5*sin(uTime*9.4248));
  }
  if(vCut.w != 0. && !gl_FrontFacing) color=vCore*1.6;
  color=mix(color,vec3(1.),vFlash);
  color*=min(1.,${Number(PLAY_START.crystalMax).toFixed(2)}/max(max(color.r,color.g),max(color.b,.0001)));
  gl_FragColor=vec4(color,vFade);
}`;