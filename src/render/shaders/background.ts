import { BEAM_MAX } from "../fxConfig";
export const vertex = `varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 1.0, 1.0); }`;
export const fragment = `
uniform float uTime; uniform float uChoir; uniform vec3 uVoid0,uVoid1,uVoid2,uFog,uBeam; varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){ vec2 p=vUv; float n=0.0, a=0.5; vec2 q=p*3.0+vec2(uTime*0.01,0.0); for(int i=0;i<4;i++){n+=a*noise(q);q=q*2.0+7.1;a*=0.5;} vec3 col=mix(uVoid1,uVoid2,p.y)+uFog*n*n*0.30;
float beams=0.0; for(int i=0;i<5;i++){float fi=float(i); float x=0.10+fi*0.20+sin(uTime*6.283185/20.0+fi)*0.03+(p.y-1.0)*0.21256; float width=0.05+0.025*mod(fi*3.0,5.0); float d=(p.x-x)/width; beams+=exp(-d*d*3.0)*pow(p.y,1.6)*(0.55+0.45*sin(fi*2.3+uTime*0.15));} col+=uBeam*min(beams,1.0)*${BEAM_MAX.toFixed(2)}*(1.0+2.0*uChoir); float edge=smoothstep(0.30,0.78,length((p-0.5)*vec2  (1.0,1.0))); col=mix(col,uVoid0,edge); gl_FragColor=vec4(col,1.0); }`;
