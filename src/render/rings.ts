import { AdditiveBlending, Color, DoubleSide, Mesh, PlaneGeometry, Scene, ShaderMaterial } from 'three';
import { CHOIR_R, FLARE_R } from '../sim/config';
import { NOTE_COLORS, PALETTE } from './fxConfig';
import * as shader from './shaders/ring';
type Ring={mesh:Mesh;age:number;delay:number;duration:number;end:number;choir:boolean};
export class Rings {
 private readonly pool:Ring[]=[];private cursor=0;
 constructor(private readonly scene:Scene){for(let i=0;i<10;i++){const mesh=new Mesh(new PlaneGeometry(24,24),new ShaderMaterial({vertexShader:shader.vertex,fragmentShader:shader.fragment,transparent:true,depthWrite:false,side:DoubleSide,blending:AdditiveBlending,uniforms:{uRadius:{value:0},uWidth:{value:.35},uAlpha:{value:0},uColor:{value:new Color()}}}));mesh.position.z=.04;mesh.visible=false;scene.add(mesh);this.pool.push({mesh,age:0,delay:0,duration:0,end:0,choir:false});}}
 launch(kind:'strike'|'dud'|'crack'|'choir',note:number,delay=0,color?:number):void{const r=this.pool[this.cursor++%10]!;r.age=0;r.delay=delay;r.duration=kind==='choir'?700:kind==='strike'?420:kind==='dud'?300:220;r.end=kind==='choir'?12:kind==='strike'?11:kind==='dud'?3:FLARE_R;r.choir=kind==='choir';(r.mesh.material as ShaderMaterial).uniforms.uColor!.value.set(color??(kind==='dud'?0xa59fc9:kind==='crack'?PALETTE.crack:NOTE_COLORS[note]!));}
 update(dt:number):void{for(const r of this.pool){r.age+=dt;const t=(r.age-r.delay)/r.duration;r.mesh.visible=t>=0&&t<1;if(!r.mesh.visible)continue;const u=(r.mesh.material as ShaderMaterial).uniforms;u.uRadius!.value=r.choir?(r.age-r.delay<220?CHOIR_R*(r.age-r.delay)/220:CHOIR_R+(12-CHOIR_R)*(r.age-r.delay-220)/480):r.end*(1-(1-t)**3);u.uWidth!.value=.35+(.08-.35)*t;u.uAlpha!.value=(1-t)**1.5;}}
 reset():void{for(const r of this.pool){r.age=10000;r.mesh.visible=false;}}dispose():void{for(const r of this.pool){this.scene.remove(r.mesh);r.mesh.geometry.dispose();(r.mesh.material as ShaderMaterial).dispose();}}
}
