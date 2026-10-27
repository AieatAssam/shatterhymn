import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DynamicDrawUsage, Points, Scene, ShaderMaterial } from 'three';
import { NOTE_COLORS } from './fxConfig';
import * as shader from './shaders/spark';
import { TIERS, type Tier } from './quality';
type Spark = {x:number;y:number;z:number;vx:number;vy:number;vz:number;life:number;max:number;note:number;size:number};
export class Sparks {
 private readonly pool: Spark[] = Array.from({length:400},()=>({x:0,y:0,z:0,vx:0,vy:0,vz:0,life:0,max:1,note:0,size:0})); private cursor=0; private cap=400; private frameHarvest=0;
 private readonly geo=new BufferGeometry(); private readonly pos=new BufferAttribute(new Float32Array(1200),3); private readonly colors=new BufferAttribute(new Float32Array(1200),3); private readonly alpha=new BufferAttribute(new Float32Array(400),1); private readonly sizes=new BufferAttribute(new Float32Array(400),1); private readonly color=new Color(); private readonly white=new Color(0xffffff); private readonly material=new ShaderMaterial({vertexShader:shader.vertex,fragmentShader:shader.fragment,uniforms:{uDpr:{value:1}},transparent:true,depthWrite:false,blending:AdditiveBlending}); private readonly points:Points;
 constructor(private readonly scene:Scene){for(const [name,attr] of [['position',this.pos],['aColor',this.colors],['aAlpha',this.alpha],['aSize',this.sizes]] as const){attr.setUsage(DynamicDrawUsage);this.geo.setAttribute(name,attr);}this.points=new Points(this.geo,this.material);this.points.frustumCulled=false;scene.add(this.points);}
 setTier(t:Tier,dpr:number):void{this.cap=TIERS[t].sparks;for(let i=this.cap;i<this.pool.length;i++)this.pool[i]!.life=0;this.material.uniforms.uDpr!.value=dpr;}
 burst(x:number,y:number,note:number,count:number,harvest=false):void{if(harvest){count=Math.min(count,60-this.frameHarvest);this.frameHarvest+=count;} for(let i=0;i<count;i++){const s=this.pool[this.cursor++%this.cap]!;s.x=x;s.y=y;s.z=.8;s.vx=(Math.random()-.5)*4;s.vy=(Math.random()-.5)*4;s.vz=Math.random()*2;s.life=s.max=.25+Math.random()*.35;s.note=note;s.size=6+Math.random()*8;}}
 update(dt:number):void{this.frameHarvest=0;let n=0;for(const s of this.pool){if(s.life<=0)continue;s.life-=dt;if(s.life<=0)continue;s.x+=s.vx*dt;s.y+=s.vy*dt;s.z+=s.vz*dt;this.color.set(NOTE_COLORS[s.note]!).lerp(this.white,s.life/s.max);this.pos.setXYZ(n,s.x,s.y,s.z);this.colors.setXYZ(n,this.color.r,this.color.g,this.color.b);this.alpha.setX(n,s.life/s.max);this.sizes.setX(n,s.size);n++;}this.geo.setDrawRange(0,n);this.pos.needsUpdate=this.colors.needsUpdate=this.alpha.needsUpdate=this.sizes.needsUpdate=true;}
 reset():void{for(const s of this.pool)s.life=0;} dispose():void{this.scene.remove(this.points);this.geo.dispose();this.material.dispose();}
}
