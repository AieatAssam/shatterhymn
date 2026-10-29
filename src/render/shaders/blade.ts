import { SLICE_FX } from '../fxConfig';
const R = SLICE_FX.rescue.ribbon;
export const vertex = `attribute float aEdge,aAlpha,aMode,aAlong; varying float vEdge,vAlpha,vMode,vAlong; void main(){vEdge=aEdge;vAlpha=aAlpha;vMode=aMode;vAlong=aAlong;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const fragment = `uniform vec3 uEdgeColor; varying float vEdge,vAlpha,vMode,vAlong; void main(){if(vMode<.5 || vMode>1.5)discard;float d=abs(vEdge);float core=1.-smoothstep(0.,${R.coreEdge},d);float body=exp(-${R.bodyFalloff.toFixed(1)}*d*d);gl_FragColor=vec4(mix(uEdgeColor*${R.bodyHdr},vec3(${R.coreHdr.toFixed(1)}),core),vAlpha*max(core,body));}`;

export const inertFragment = `uniform vec3 uColor; uniform float uReadyAlpha,uSlowAlpha,uSpentAlpha,uEdgeAlpha,uReadyWidth,uSlowWidth,uSpentWidth,uEdgeWidth,uDashOn,uDashOff; varying float vEdge,vAlpha,vMode,vAlong; void main(){if(vMode>.5 && vMode<1.5)discard; float width=vMode<.5?uReadyWidth:(vMode<2.5?uSlowWidth:uSpentWidth);float edge=vMode<.5?0.:uEdgeWidth;if(vMode>2.5 && mod(vAlong,uDashOn+uDashOff)>=uDashOn)discard;float core=width/(width+2.*edge);bool isEdge=abs(vEdge)>core;float alpha=isEdge?uEdgeAlpha:(vMode<.5?uReadyAlpha:(vMode<2.5?uSlowAlpha:uSpentAlpha));gl_FragColor=vec4(isEdge?vec3(1.):uColor,vAlpha*alpha);
#include <colorspace_fragment>
}`;
