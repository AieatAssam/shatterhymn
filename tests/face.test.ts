import {expect,it} from 'vitest';
import {faceState,FACE_HOLD} from '../src/render/face';
it('chooses active expressions in priority order with specified durations',()=>{expect(faceState({smile:1,wince:1,delighted:1})).toBe('wince');expect(faceState({dizzy:1,wince:1})).toBe('dizzy');expect(faceState({},true)).toBe('sleepy');expect(FACE_HOLD).toMatchObject({wince:600,delighted:1400,happy:700,relieved:600,boop:500,worried:400,smile:400});});
