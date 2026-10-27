export const vertex = `attribute vec3 aColor,aCore,aDark; attribute float aFlash,aCrack,aFade,aKind; varying vec3 vColor,vCore,vDark,vNormal,vView,vLocal; varying float vFlash,vCrack,vFade,vKind,vSeed; void main(){vSeed=float(gl_InstanceID);vColor=aColor;vCore=aCore;vDark=aDark;vFlash=aFlash;vCrack=aCrack;vFade=aFade;vKind=aKind;vLocal=position;vec4 p=modelViewMatrix*instanceMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*mat3(instanceMatrix)*normal);vView=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`;
export const fragment = `uniform vec3 uKeyDir; uniform float uTime,uHeat; varying vec3 vColor,vCore,vDark,vNormal,vView,vLocal; varying float vFlash,vCrack,vFade,vKind,vSeed;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} float edge(vec2 p){vec2 g=floor(p),f=fract(p);float a=10.,b=10.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 o=vec2(float(x),float(y));vec2 q=o+vec2(hash(g+o),hash(g+o+19.))-f;float d=dot(q,q);if(d<a){b=a;a=d;}else b=min(b,d);}return sqrt(b)-sqrt(a);}
vec3 env(vec3 d){ // the cathedral seen through the gem (no texture fetch)
  float up=clamp(d.y*0.5+0.5,0.,1.);
  vec3 c=mix(vec3(0.02,0.015,0.05),vec3(0.17,0.14,0.40),up);
  float a=atan(d.x,d.z);
  float win=smoothstep(0.55,1.0,sin(a*5.0+uTime*0.15))*smoothstep(0.35,0.95,up);
  return c+vec3(0.72,0.78,1.0)*win;
}
void main(){
  vec3 N=normalize(vNormal),V=normalize(vView);
  float ndv=clamp(dot(N,V),0.,1.);
  float facet=floor((0.25+0.75*max(dot(N,uKeyDir),0.))*4.)/4.;          // SG gem-cut steps (kept)
  float fres=pow(1.-ndv,2.6);
  float fid=fract(sin(dot(floor(N*3.0+0.5),vec3(12.9898,78.233,37.719)))*43758.5453); // per-facet id
  vec3 body=mix(vDark,vColor,facet);
  vec3 R=refract(-V,N,0.66);                                              // glass IOR ≈1.5
  vec3 seen=env(R)*vColor*1.8;                                            // refraction tint
  vec3 Ri=reflect(R,vec3(-N.xy,N.z));
  float tir=pow(max(dot(Ri,uKeyDir),0.),8.);                              // internal facet flare
  vec3 color=mix(body,seen,0.42)+vCore*tir*(0.8+0.8*fid);
  vec3 irid=0.5+0.5*cos(6.2831*(fres*1.3+fid*0.4+uTime*0.04+vec3(0.,0.33,0.67)));
  color+=mix(vec3(1.),vCore,0.4)*fres*2.2+irid*fres*0.45;                 // white rim + thin-film
  float core=smoothstep(0.62,0.,length(vLocal.xy));
  color+=vCore*(1.2*core+1.4*core*core)*(vKind>3.5&&vKind<4.5?1.3:1.);    // hot inner glow
  vec3 H=normalize(uKeyDir+V);
  float glint=pow(max(dot(N,H),0.),96.)*(0.55+0.45*sin(uTime*7.+vSeed*31.+fid*20.));
  color+=vec3(6.)*glint;                                                  // star glints (bloom)
  color+=vec3(1.,0.82,0.48)*fres*1.2*uHeat;                               // fever: gold rims
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
  color=mix(color,vec3(4.),vFlash);
  gl_FragColor=vec4(color,vFade);
}`;