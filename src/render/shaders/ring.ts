export const vertex = `varying vec2 vPos; void main(){vPos=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const fragment = `uniform float uRadius,uWidth,uAlpha; uniform vec3 uColor; varying vec2 vPos; void main(){float a=smoothstep(uWidth,0.,abs(length(vPos)-uRadius));gl_FragColor=vec4(uColor*2.,a*uAlpha);}`;
