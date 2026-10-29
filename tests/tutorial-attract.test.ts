import { expect, it } from 'vitest';
import { AttractPilot } from '../src/sim/attract';
import { Sim } from '../src/sim/sim';
it('attract pilot strikes within 60 seconds and never selects an empty colour', () => {
  const sim = new Sim({ seed: 2, mode: 'attract', slowDial: false });
  const pilot = new AttractPilot(); let strikes=0;
  for(let i=0;i<60*60;i++){
    const input=pilot.update(sim.state);
    if(input.strike!==null) expect(sim.state.crystals.some(c=>c.alive && c.note===input.strike && c.rho<=8)).toBe(true);
    for(const event of sim.step(input)) if(event.type==='strike') strikes++;
  }
  expect(strikes).toBeGreaterThan(0);expect(sim.state.level).toBe(0);
});
