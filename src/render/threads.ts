import { AdditiveBlending, Color, DynamicDrawUsage, InstancedMesh, Object3D, PlaneGeometry, Scene, ShaderMaterial } from 'three';
import type { ShatterInfo } from '../sim/types';
import { NOTE_COLORS } from './fxConfig';
import * as shader from './shaders/thread';
export class Threads {
 private readonly obj=new Object3D();private readonly mat=new ShaderMaterial({vertexShader:shader.vertex,fragmentShader:shader.fragment,transparent:true,depthWrite:false,blending:AdditiveBlending,uniforms:{uColor:{value:new Color()},uAlpha:{value:0}}});private readonly mesh=new InstancedMesh(new PlaneGeometry(1,1),this.mat,64);private age=0;private hold=0;
 constructor(private readonly scene:Scene){this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);this.mesh.frustumCulled=false;this.mesh.count=0;scene.add(this.mesh);}
 burst(items:ShatterInfo[],note:number,hold:number):void{this.age=0;this.hold=hold;this.mat.uniforms.uColor!.value.set(NOTE_COLORS[note]!);this.mesh.count=Math.min(64,items.length);for(let i=0;i<this.mesh.count;i++){const p=items[i]!;this.obj.position.set(p.x/2,p.y/2,.8);this.obj.rotation.set(0,0,Math.atan2(p.y,p.x));this.obj.scale.set(Math.hypot(p.x,p.y),.04,1);this.obj.updateMatrix();this.mesh.setMatrixAt(i,this.obj.matrix);}this.mesh.instanceMatrix.needsUpdate=true;}
 update(dt:number):void{this.age+=dt;this.mat.uniforms.uAlpha!.value=Math.max(0,1-Math.max(0,this.age-this.hold)/120);}
 reset():void{this.mesh.count=0;}dispose():void{this.scene.remove(this.mesh);this.mesh.geometry.dispose();this.mat.dispose();}
}
