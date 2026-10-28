import { SIM_DT_MS } from '../core/loop';
import type { SimInput, SimState } from './types';

export class AttractPilot {
  private timer = 2500;
  update(state: SimState, dt = SIM_DT_MS): SimInput {
    this.timer -= dt;
    if (this.timer > 0 || state.recoveryMs > 0) return { strike: null };
    this.timer = 2500;
    const counts = Array.from({ length: state.K }, () => 0);
    for (const c of state.crystals) if (c.alive && c.rho <= 8) counts[c.note] = (counts[c.note] ?? 0) + 1;
    let best = -1;
    for (let i = 0; i < state.K; i++) if (counts[i]! >= 3 && (best < 0 || counts[i]! > counts[best]!)) best = i;
    return { strike: best < 0 ? null : best };
  }
}
