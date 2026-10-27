import { HALO_RADIUS } from "../fxConfig";
export const vertex = `varying vec2 vPos; void main(){vPos=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
export const fragment = `uniform vec3 uInk,uCrackColor; uniform float uTime,uDanger,uCloseFlash; varying vec2 vPos;
void main(){float r=length(vPos);float halo=1.0-smoothstep(0.03,0.045,abs(r-${HALO_RADIUS.toFixed(1)}));vec3 col=mix(uInk,uCrackColor,uDanger)*(0.35+uDanger*0.2*sin(uTime*18.84956))*halo;col=mix(col,vec3(2.,1.6,.9),uCloseFlash*halo);gl_FragColor=vec4(col,halo*0.35);}`;
