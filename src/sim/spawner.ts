import { Rng } from '../core/rng';
import { CRYSTAL_R, FAIRNESS_ANGLE, FAIRNESS_MS, FAIRNESS_R, FAIRNESS_ROTATION, FAIRNESS_TRIES, FORMATIONS, GEODE_R, KINDS, MAX_CRYSTALS, MEND_COOLDOWN_MS, OPENING_SPAWN_MS, PRISM_CYCLE_MS, RING_SPEED_FACTOR, RUSHER_R, RUSHER_SPEED_FACTOR, SPAWN_COUNT_FACTOR, SPAWN_R, SPAWN_RETRY_MS, SPIRAL_ANGLE, SPIRAL_INTERVAL_MS, SPIRAL_SWIRL, SPLITTER_PUSH_MS, SWIRL_MAX, SWIRL_MIN, levelRow } from './config';
import type { Crystal, Kind, SimEvent, SimState } from './types';

type Formation = typeof FORMATIONS[number]['id'];
interface Pending { note: number; theta: number; delay: number }
export class Spawner {
  private timer = OPENING_SPAWN_MS;
  private opening = true;
  private bag: number[] = [];
  private bagK = 0;
  private pending: Pending[] = [];
  private lastMendMs = -Infinity;
  private nextId = 1;
  constructor(private readonly rng: Rng) {}
  drawTone(K: number): number {
    if (this.bagK !== K) { this.bag = []; this.bagK = K; }
    if (!this.bag.length) this.bag = this.rng.shuffle(Array.from({ length: K }, (_, i) => i));
    return this.bag.shift()!;
  }
  spawn(state: SimState, note: number, theta: number, kind: Kind, speed: number, swirl: number, events: SimEvent[], rho = SPAWN_R, pushMs = 0): Crystal | undefined {
    const slot = state.crystals.find(c => !c.alive);
    if (!slot) return undefined;
    Object.assign(slot, { id: this.nextId++, alive: true, kind, note, rho, theta, r: kind === 'geode' ? GEODE_R : kind === 'rusher' || pushMs > 0 ? RUSHER_R : CRYSTAL_R, speed, swirl, shell: kind === 'geode', prismMs: PRISM_CYCLE_MS, pushMs, ageMs: 0, x: rho * Math.cos(theta), y: rho * Math.sin(theta) });
    events.push({ type: 'spawn', id: slot.id, kind, note });
    return slot;
  }
  spawnChild(state: SimState, parent: Crystal, note: number, theta: number, events: SimEvent[]): void {
    if (state.crystals.filter(c => c.alive).length + this.pending.length < levelRow(state.level).fieldCap + 2) this.spawn(state, note, theta, 'normal', levelRow(state.level).speed, parent.swirl, events, parent.rho, SPLITTER_PUSH_MS);
  }
  private kind(state: SimState): Kind {
    for (const def of KINDS) {
      if (state.level < def.fromLevel) continue;
      if (def.kind === 'mend' && (state.cracks === 0 || state.elapsedMs - this.lastMendMs < MEND_COOLDOWN_MS || state.crystals.some(c => c.alive && c.kind === 'mend'))) continue;
      if (def.kind === 'prism' && state.crystals.some(c => c.alive && c.kind === 'prism')) continue;
      if (this.rng.chance(def.chance)) { if (def.kind === 'mend') this.lastMendMs = state.elapsedMs; return def.kind; }
    }
    return 'normal';
  }
  private blocked(state: SimState, theta: number): boolean {
    return state.crystals.some(c => c.alive && c.rho > FAIRNESS_R && c.ageMs < FAIRNESS_MS && Math.abs(Math.atan2(Math.sin(c.theta - theta), Math.cos(c.theta - theta))) <= FAIRNESS_ANGLE);
  }
  update(state: SimState, dt: number, events: SimEvent[]): void {
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i]!; p.delay -= dt;
      if (p.delay <= 1e-7) { let tries = 0; while (this.blocked(state, p.theta) && tries < FAIRNESS_TRIES) { p.theta += FAIRNESS_ROTATION; tries++; } if (!this.blocked(state, p.theta)) this.spawn(state, p.note, p.theta, 'normal', levelRow(state.level).speed, SPIRAL_SWIRL, events); this.pending.splice(i, 1); }
    }
    this.timer -= dt;
    if (this.timer > 1e-7) return;
    const row = levelRow(state.level);
    const unlocked = FORMATIONS.filter(f => f.fromLevel <= state.level);
    const formation: Formation = this.opening ? 'pair' : this.rng.weighted(unlocked.map(f => ({ item: f.id, w: f.weight })));
    const count = formation === 'single' ? 1 : formation === 'pair' ? 2 : formation === 'arc' ? Math.min(5, 3 + Math.floor(state.level / 3)) : formation === 'duet' ? 4 : formation === 'spiral' ? state.K : 6;
    if (state.crystals.filter(c => c.alive).length + this.pending.length + count > Math.min(row.fieldCap, MAX_CRYSTALS)) { this.timer = SPAWN_RETRY_MS; return; }
    let theta = this.rng.range(0, Math.PI * 2);
    const arc = formation === 'arc' ? this.rng.range(0.7, 1.2) : 1;
    const offsets = Array.from({ length: count }, (_, i) => formation === 'pair' ? (i === 0 ? -0.21 : 0.21) : formation === 'arc' || formation === 'duet' ? (i / (count - 1) - 0.5) * arc : formation === 'spiral' ? i * SPIRAL_ANGLE : formation === 'ring' ? i * Math.PI * 2 / count : 0);
    let tries = 0;
    while (offsets.some(offset => this.blocked(state, theta + offset)) && tries < FAIRNESS_TRIES) { theta += FAIRNESS_ROTATION; tries++; }
    if (offsets.some(offset => this.blocked(state, theta + offset))) { this.timer = SPAWN_RETRY_MS; return; }
    const swirl = formation === 'spiral' ? SPIRAL_SWIRL : this.rng.sign() * this.rng.range(SWIRL_MIN, SWIRL_MAX);
    const first = formation === 'spiral' ? this.rng.int(state.K) : this.drawTone(state.K);
    let second = first;
    if (formation === 'duet') { do { second = this.drawTone(state.K); } while (second === first); }
    for (let i = 0; i < count; i++) {
      const note = formation === 'spiral' ? (first + i) % state.K : formation === 'ring' && i > 0 ? this.drawTone(state.K) : formation === 'duet' && i % 2 ? second : first;
      if (formation === 'spiral' && i > 0) { this.pending.push({ note, theta: theta + offsets[i]!, delay: i * SPIRAL_INTERVAL_MS }); continue; }
      const kind = formation === 'spiral' || formation === 'ring' ? 'normal' : this.kind(state);
      const speed = row.speed * (formation === 'ring' ? RING_SPEED_FACTOR : kind === 'rusher' ? RUSHER_SPEED_FACTOR : 1);
      this.spawn(state, note, theta + offsets[i]!, kind, speed, swirl, events);
    }
    this.opening = false;
    this.timer = row.spawnInterval * 1000 * (1 + SPAWN_COUNT_FACTOR * (count - 1));
  }
}
