import { CustomBlending, OneFactor, OneMinusSrcAlphaFactor, Color, DynamicDrawUsage, InstancedBufferAttribute, InstancedMesh, Object3D, PlaneGeometry, Scene, ShaderMaterial } from 'three';
import type { Tier } from './quality';
const CAPS = { high: 512, medium: 256, low: 160 } as const;
export class GlowQuads {
 readonly mesh: InstancedMesh; private cap=512; tier: Tier = "high"; private count=0; private readonly obj=new Object3D();
 private readonly colors=new InstancedBufferAttribute(new Float32Array(512*3),3); private readonly alpha=new InstancedBufferAttribute(new Float32Array(512),1); private readonly mode=new InstancedBufferAttribute(new Float32Array(512),1); private readonly widths=new InstancedBufferAttribute(new Float32Array(512),1);
 constructor(private readonly scene:Scene) {
  const geo=new PlaneGeometry(1,1); geo.setAttribute('aColor',this.colors);geo.setAttribute('aAlpha',this.alpha);geo.setAttribute('aMode',this.mode);geo.setAttribute('aWidth',this.widths);
  for(const a of [this.colors,this.alpha,this.mode,this.widths]) a.setUsage(DynamicDrawUsage);
  const mat=new ShaderMaterial({transparent:true,depthWrite:false,blending:CustomBlending,blendSrc:OneFactor,blendDst:OneMinusSrcAlphaFactor,vertexShader:`attribute vec3 aColor; attribute float aAlpha,aMode,aWidth; varying float vWidth; varying vec3 vColor; varying float vAlpha,vMode; varying vec2 vUv; void main(){vUv=uv*2.-1.;vColor=aColor;vAlpha=aAlpha;vMode=aMode;vWidth=aWidth;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 vColor; varying float vAlpha,vMode; varying vec2 vUv; varying float vWidth; void main(){float r=length(vUv);float a;if(vMode<.5)a=pow(max(0.,1.-r),2.2);else if(vMode<1.5)a=smoothstep(vWidth,0.,abs(r-(1.-vWidth)));else if(vMode<2.5){float t=vUv.x*.5+.5;a=(1.-t)*(1.-t)*smoothstep(1.,0.,abs(vUv.y));}else if(vMode<3.5)a=pow(max(0.,1.-r),2.2);else a=smoothstep(vWidth,0.,abs(r-(1.-vWidth)))*smoothstep(-.3,.1,vUv.x);if(a*vAlpha<.004)discard;gl_FragColor=(vMode>2.5 && vMode<3.5)?vec4(vColor*a*vAlpha,a*vAlpha):vec4(vColor*1.6*a*vAlpha,0.);}`});
  this.mesh=new InstancedMesh(geo,mat,512);this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);this.mesh.frustumCulled=false;this.mesh.renderOrder=2;this.mesh.count=0;this.mesh.visible=false;scene.add(this.mesh);
 }
 setTier(t:Tier):void{this.cap=CAPS[t];this.tier=t;} begin():void{this.count=0;}
 private push(x:number,y:number,z:number,w:number,h:number,angle:number,color:Color,alpha:number,mode:number,width=.14):void{if(this.count>=this.cap)return;const i=this.count++;this.obj.position.set(x,y,z);this.obj.rotation.set(0,0,angle);this.obj.scale.set(w,h,1);this.obj.updateMatrix();this.mesh.setMatrixAt(i,this.obj.matrix);this.colors.setXYZ(i,color.r,color.g,color.b);this.alpha.setX(i,alpha);this.mode.setX(i,mode);this.widths.setX(i,width);}
 disc(x:number,y:number,z:number,r:number,c:Color,a:number):void{this.push(x,y,z,r*2,r*2,0,c,a,0);}
 shadow(x:number,y:number,z:number,r:number,c:Color,a:number):void{this.push(x,y,z,r*2,r*2,0,c,a,3);}
 ring(x:number,y:number,z:number,r:number,c:Color,a:number,width?:number):void{this.push(x,y,z,r*2,r*2,0,c,a,1,width === undefined ? .14 : Math.min(1,width/Math.max(r,.001)));}
 arc(x:number,y:number,z:number,r:number,angle:number,c:Color,a:number):void{this.push(x,y,z,r*2,r*2,angle,c,a,4,.1);}
 streak(x0:number,y0:number,x1:number,y1:number,z:number,w:number,c:Color,a:number):void{this.push((x0+x1)/2,(y0+y1)/2,z,Math.hypot(x1-x0,y1-y0),w,Math.atan2(y1-y0,x1-x0),c,a,2);}
 end():void{this.mesh.count=this.count;this.mesh.visible=this.count>0;this.mesh.instanceMatrix.needsUpdate=true;this.colors.needsUpdate=true;this.alpha.needsUpdate=true;this.mode.needsUpdate=true;this.widths.needsUpdate=true;}
 dispose():void{this.scene.remove(this.mesh);this.mesh.geometry.dispose();(this.mesh.material as ShaderMaterial).dispose();}
}
