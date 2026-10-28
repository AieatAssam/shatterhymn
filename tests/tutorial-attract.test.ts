import { expect, it } from 'vitest';
import { AttractPilot } from '../src/sim/attract';
import { Sim } from '../src/sim/sim';
it('attract pilot strikes five targetable same-colour crystals without duds', () => {
  const sim = new Sim({ seed: 2, mode: 'attract', slowDial: false });
  for (let i = 0; i < 5; i++) Object.assign(sim.state.crystals[i]!, { alive: true, id: i + 1, note: 0, rho: 5, r: 0.55 });
  const pilot = new AttractPilot(); expect(pilot.update(sim.state, 2500)).toEqual({ strike: 0 });
  const events=sim.step({strike:0}); expect(events.some(e=>e.type==='strike')).toBe(true);
  let strikes=1; const duds=0; for(let i=0;i<60*60;i++){const input=pilot.update(sim.state);for(const event of sim.step(input)){if(event.type==='strike')strikes++;}}
  expect(strikes).toBeGreaterThan(0);expect(duds).toBe(0);expect(sim.state.level).toBe(0);
});
