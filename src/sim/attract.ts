import { SIM_DT_MS } from '../core/loop';
import { ATTRACT_HOLD_RHO, TARGETABLE_R } from './config';
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
      const nearest = Array.from({ length: state.K }, () => Infinity);
      for (const c of state.crystals) if (c.alive && c.rho <= TARGETABLE_R) nearest[c.note] = Math.min(nearest[c.note]!, c.rho);
      let best = -1;
      for (let i = 0; i < state.K; i++) {
        if (counts[i]! >= 5 && nearest[i]! > ATTRACT_HOLD_RHO) continue;
        if (counts[i]! >= 7 && nearest[i]! <= ATTRACT_HOLD_RHO) { best = i; break; }
        if (counts[i]! > 0 && (best < 0 || counts[i]! > counts[best]!)) best = i;
      }
      if (best < 0) return input;
      this.target = best;
      input.press = true;
      if (this.target === 0 && state.recoveryMs <= dt) { input.release = true; this.target = null; this.timer = 2500; }
    } else if (state.dial.holding && !state.dial.waitingRecovery && state.dial.note === this.target) {
      input.release = true; this.target = null; this.timer = 2500;
    }
    return input;
  }
}
