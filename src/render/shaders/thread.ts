export const vertex = `void main(){gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`;
export const fragment = `uniform vec3 uColor; uniform float uAlpha; void main(){gl_FragColor=vec4(uColor*2.5,uAlpha);}`;
