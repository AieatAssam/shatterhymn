import { expect, it } from 'vitest';
import { INTRO, IntroTimeline } from '../src/game/intro';
import { Sim } from '../src/sim/sim';

it('no input, start 600 ms: auto-tap at 2400 ms elapsed, title at 3500 ms elapsed (4100 ms absolute)', () => {
 const t=new IntroTimeline(false,600);
 expect(t.advance(2399)).toEqual({auto:false,title:false});expect(t.advance(1)).toEqual({auto:true,title:false});expect(t.advance(1099).title).toBe(false);expect(t.advance(1).title).toBe(true);
 const sim=new Sim({seed:1,mode:'intro',slowDial:false});let choir=false;
 for(let i=1;i<=210;i++)for(const e of sim.step({strike:i===144?0:null}))if(e.type==='choir'&&e.n===8)choir=true;
 expect(choir).toBe(true);
});
it('no input, start 1500 ms: auto-tap at 1800 ms, title at 2900 ms elapsed (4400 absolute)',()=>{const t=new IntroTimeline(false,1500);expect(t.advance(1799)).toEqual({auto:false,title:false});expect(t.advance(1)).toEqual({auto:true,title:false});expect(t.advance(1099).title).toBe(false);expect(t.advance(1).title).toBe(true);});
it('slow boot, start 3200 ms: auto-tap at 1200 ms, title at 1200 ms elapsed by the cap (4400 absolute)',()=>{const t=new IntroTimeline(false,3200);expect(t.advance(1199)).toEqual({auto:false,title:false});expect(t.advance(1)).toEqual({auto:true,title:true});});
it('very slow boot, start 4000 ms: auto and title together at 1000 ms elapsed (minimum show)',()=>{const t=new IntroTimeline(false,4000);expect(t.advance(999)).toEqual({auto:false,title:false});expect(t.advance(1)).toEqual({auto:true,title:true});});
it('touch at 1000 ms: touch() returns true, next advance gives title: true; a second touch() returns false',()=>{const t=new IntroTimeline();t.advance(1000);expect(t.touch()).toBe(true);expect(t.advance(0).title).toBe(true);expect(t.touch()).toBe(false);});
it('touch at 100 ms (before the Crown): struckAt is 300 and title is true at once',()=>{const t=new IntroTimeline();t.advance(100);expect(t.touch()).toBe(true);expect(t.struckAt).toBe(300);expect(t.advance(0).title).toBe(true);});
it('hold mode: touch() returns false, no title, elapsed stays 1200',()=>{const t=new IntroTimeline(true);expect(t.touch()).toBe(false);expect(t.advance(1200)).toEqual({auto:false,title:false});expect(t.advance(10000)).toEqual({auto:false,title:false});expect(t.elapsed).toBe(1200);});
it('INTRO config equals POLISH P3',()=>{expect(INTRO).toEqual({handMs:450,autoMs:2400,autoMinMs:1200,autoAbsMaxMs:3300,titleAfterStrikeMs:1100,titleMinMs:1800,titleAbsMaxMs:4400,minShowMs:1000});});
