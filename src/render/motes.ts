import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, Scene, ShaderMaterial } from "three";
import { BOARD } from "./fxConfig";
import type { Tier } from "./quality";

/** Screen-space dust, kept in one draw call regardless of quality tier. */
export class Motes {
  private readonly geometry = new BufferGeometry();
  private readonly material = new ShaderMaterial({
    transparent: true, blending: AdditiveBlending, depthTest: false, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uDpr: { value: 1 }, uWidth: { value: 1 }, uColor: { value: new Color(BOARD.moteColor) } },
    vertexShader: `attribute float aSeed; uniform float uTime,uDpr,uWidth; varying float vAlpha;
      void main(){float speed=mix(.008,.025,fract(aSeed*7.17));float y=fract(position.y+uTime*speed);float x=position.x+sin(uTime*6.283185/5.+aSeed*23.)*6./uWidth;
      float edge=min(y,1.-y);vAlpha=min(1.,edge/max(speed*2.5,.001));gl_Position=vec4(x*2.-1.,y*2.-1.,0.,1.);gl_PointSize=mix(2.,5.,fract(aSeed*13.71))*uDpr;}`,
    fragmentShader: `uniform vec3 uColor;varying float vAlpha;void main(){vec2 p=gl_PointCoord*2.-1.;float a=exp(-dot(p,p)*4.)*smoothstep(1.,.5,length(p));gl_FragColor=vec4(uColor,a*vAlpha*.35);}`,
  });
  private readonly points: Points;
  constructor(scene: Scene) {
    const positions = new Float32Array(64 * 3), seeds = new Float32Array(64);
    for (let i = 0; i < seeds.length; i++) { seeds[i] = (i + .5) / seeds.length; positions[i * 3] = ((i * 37) % 97) / 97; positions[i * 3 + 1] = ((i * 53) % 101) / 101; }
    this.geometry.setAttribute("position", new BufferAttribute(positions, 3)); this.geometry.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    this.points = new Points(this.geometry, this.material); this.points.frustumCulled = false; this.points.renderOrder = -90; scene.add(this.points);
  }
  setTier(tier: Tier, dpr: number, slice=false): void { this.geometry.setDrawRange(0, slice && tier === "high" ? 64 : BOARD.moteCount[tier]); this.material.uniforms.uDpr!.value = dpr; }
  update(time: number, width: number): void { this.material.uniforms.uTime!.value = time; this.material.uniforms.uWidth!.value = width; }
  dispose(): void { this.points.removeFromParent(); this.geometry.dispose(); this.material.dispose(); }
}
