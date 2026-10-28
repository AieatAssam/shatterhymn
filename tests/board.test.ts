import {expect,it} from 'vitest';
import {Scene, Points} from 'three';
import {BOARD,SHATTER} from '../src/render/fxConfig';
import {Motes} from '../src/render/motes';
it('uses the living board values and one motes draw call',()=>{expect(BOARD.satMax).toBe(.55);expect(BOARD.boardSat).toBe(.60);expect(BOARD.bakeScale).toBe(.5);expect(SHATTER.flashOpacity).toEqual([.12,.18,.24,.32]);const scene=new Scene();const motes=new Motes(scene);expect(scene.children.filter(x=>x instanceof Points)).toHaveLength(1);motes.dispose();});
