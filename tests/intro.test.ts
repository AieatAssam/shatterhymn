import { expect, it } from 'vitest';
import { IntroTimeline } from '../src/game/intro';
import { Sim } from '../src/sim/sim';
it('auto strikes the Crown and mounts the title at 4800 ms',()=>{const t=new IntroTimeline(),sim=new Sim({seed:1,mode:'intro',slowDial:false});let choir=false;for(let i=0;i<288;i++){const x=t.advance(1000/60);for(const e of sim.step({strike:x.auto?0:null}))if(e.type==='choir'&&e.n===8)choir=true;}expect(choir).toBe(true);expect(t.advance(.01).title).toBe(true);});
it('queues early touch and waits until at least 2500 ms for title',()=>{const t=new IntroTimeline();expect(t.touch()).toBe(true);expect(t.advance(2499).title).toBe(false);expect(t.advance(1).title).toBe(true);});
