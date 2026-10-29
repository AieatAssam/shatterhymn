import { expect, it } from 'vitest';
import { Mesh, Scene, ShaderMaterial } from 'three';
import { BLADE_FX } from '../src/render/fxConfig';
import { BladeRibbon } from '../src/render/blade';

it('keeps the ribbon head at every sample and clears it for a new stroke',()=>{
 const ribbon=new BladeRibbon(new Scene());
 const points=()=> (ribbon as unknown as {points:{x:number;y:number;time:number;speed:number;mode:number}[]}).points;
 for(let i=0;i<200;i++){
  const x=i*.0001,y=.5+i*.00005,time=i*2;
  ribbon.add(x,y,time,2,1,844);
  expect(points().at(-1)).toEqual({x,y,time,speed:2,mode:1});
  expect(points().length).toBeLessThanOrEqual(64);
 }
 ribbon.reset();expect(points()).toHaveLength(0);ribbon.dispose();
});


it('renders configured inert trails in a separate overlay for 320 ms',()=>{
 const scene=new Scene(),overlay=new Scene(),ribbon=new BladeRibbon(scene,overlay);
 expect(BLADE_FX).toMatchObject({inertColor:0x3b2f7a,inertLifeMs:320,ready:{widthPx:7,alpha:.65},slow:{widthPx:8,alpha:.8,edgePx:2},spent:{widthPx:7,alpha:.75,edgePx:2,dashOnPx:10,dashOffPx:8},edgeAlpha:.55,head:{radiusPx:18,widthPx:3,edgePx:1.5,alpha:.85,spentMin:.4,spentMax:.9,spentHz:3,reducedAlpha:.7}});
 const mesh=overlay.children[0] as Mesh,material=mesh.material as ShaderMaterial;
 expect(mesh.renderOrder).toBeGreaterThan(11);expect(material.depthTest).toBe(false);
 ribbon.add(0,.5,0,0,2,1000);ribbon.add(.1,.5,100,1,2,1000);ribbon.update(320,1,1000,false,0,0);
 const points=(ribbon as unknown as {points:unknown[]}).points;expect(points).toHaveLength(2);
 const positions=mesh.geometry.getAttribute('position');expect(positions.getY(1)-positions.getY(0)).toBeCloseTo(.12);
 ribbon.update(321,1,1000,false,0,0);expect(points).toHaveLength(1);ribbon.dispose();
});
