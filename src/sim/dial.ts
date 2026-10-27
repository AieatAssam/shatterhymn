import { SLOW_DIAL_FACTOR } from './config';
import type { SimEvent, SimState } from './types';

function start(state: SimState, events: SimEvent[]): void {
  state.dial.waitingRecovery = false;
  state.dial.note = 0;
  state.dial.stepElapsedMs = 0;
  state.dial.holdMs = 0;
  events.push({ type: 'holdStart' }, { type: 'dialStep', note: 0, holdMs: 0 });
}

export function pressDial(state: SimState, events?: SimEvent[]): void {
  if (state.jarMs > 0 || state.dial.holding) return;
  state.dial.holding = true;
  state.dial.note = 0;
  state.dial.waitingRecovery = true;
  if (state.recoveryMs <= 0 && events) start(state, events);
}

export function releaseDial(state: SimState): number | null {
  if (!state.dial.holding) return null;
  const note = state.dial.waitingRecovery && state.recoveryMs > 0 ? null : state.dial.note;
  state.dial.holding = false;
  state.dial.waitingRecovery = false;
  return note;
}

export function cancelDial(state: SimState): void {
  state.dial.holding = false;
  state.dial.waitingRecovery = false;
}

export function advanceDial(state: SimState, dt: number, stepMs: number, events: SimEvent[]): void {
  if (!state.dial.holding) return;
  if (state.dial.waitingRecovery) {
    if (state.recoveryMs > 0) return;
    start(state, events);
  }
  state.dial.holdMs += dt;
  state.dial.stepElapsedMs += dt;
  const interval = stepMs * (state.slowDial ? SLOW_DIAL_FACTOR : 1);
  while (state.dial.stepElapsedMs + 1e-9 >= interval) {
    state.dial.stepElapsedMs -= interval;
    state.dial.note = (state.dial.note + 1) % state.K;
    events.push({ type: 'dialStep', note: state.dial.note, holdMs: state.dial.holdMs });
  }
}
