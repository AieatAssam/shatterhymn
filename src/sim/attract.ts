import { SIM_DT_MS } from '../core/loop';
import { TARGETABLE_R } from './config';
import type { SimInput, SimState } from './types';

export class AttractPilot {
  private timer = 2500;
  private target: number | null = null;
  update(state: SimState, dt = SIM_DT_MS): SimInput {
    const input = { press: false, release: false, cancel: false };
    if (this.target === null) {
      this.timer -= dt;
      if (this.timer > 0 || state.jarMs > 0 || state.dial.holding) return input;
      const counts = Array.from({ length: state.K }, () => 0);
      for (const c of state.crystals) if (c.alive && c.rho <= TARGETABLE_R) counts[c.note] = (counts[c.note] ?? 0) + 1;
      if (Math.max(...counts) === 0) return input;
      this.target = counts.indexOf(Math.max(...counts));
      input.press = true;
      if (this.target === 0 && state.recoveryMs <= dt) { input.release = true; this.target = null; this.timer = 2500; }
    } else if (state.dial.holding && !state.dial.waitingRecovery && state.dial.note === this.target) {
      input.release = true; this.target = null; this.timer = 2500;
    }
    return input;
  }
}
