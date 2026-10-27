import { Rng } from '../core/rng';
import { CRYSTAL_R, FAIRNESS_ANGLE, FAIRNESS_MS, FAIRNESS_R, FAIRNESS_ROTATION, FAIRNESS_TRIES, FORMATIONS, GEODE_R, KINDS, MAX_CRYSTALS, MEND_COOLDOWN_MS, OPENING_SPAWN_MS, PRISM_CYCLE_MS, RING_SPEED_FACTOR, RUSHER_R, RUSHER_SPEED_FACTOR, SPAWN_COUNT_FACTOR, SPAWN_R, SPAWN_RETRY_MS, SPIRAL_ANGLE, SPIRAL_INTERVAL_MS, SPIRAL_SWIRL, SPLITTER_PUSH_MS, SWIRL_MAX, SWIRL_MIN, levelRow } from './config';
import { ATTRACT_LEVEL, ATTRACT_FIRST_EVENT_MS, ATTRACT_EVENT_GAP_MS, EVENT_FIRST_MS, EVENT_GAP_MS, EVENT_WARN_MS, EVENT_RETRY_MS, EVENT_GIVE_UP_MS, EVENT_SEED_SALT, EVENT_WEIGHTS, GOLDEN_FROM_LEVEL, GOLDEN_SPEED, GOLDEN_SWIRL, CHORD_FROM_LEVEL, CHORD_COUNT, CHORD_ARC, CHORD_SPEED, CHORD_CAP_SLACK } from './config';
import type { Crystal, Kind, RunMode, SimEvent, SimState } from './types';

export function aliveCount(state: SimState): number { let n = 0; for (const c of state.crystals) if (c.alive) n++; return n; }
function effectiveLevel(state: SimState): number { return state.mode === 'attract' ? ATTRACT_LEVEL : state.level; }
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
  private readonly eventRng: Rng;
  private eventTimer: number;
  private pendingEvent: { kind: 'golden' | 'chord'; note: number; theta: number } | null = null;
  private lastEvent: 'golden' | 'chord' = 'golden';
  private retryElapsed = 0;
  constructor(private readonly rng: Rng, seed = 0, mode: RunMode = 'run') {
    this.eventRng = new Rng((seed ^ EVENT_SEED_SALT) >>> 0);
    this.eventTimer = mode === 'attract' ? ATTRACT_FIRST_EVENT_MS : this.eventRng.range(...EVENT_FIRST_MS);
  }
  updateEvents(state: SimState, dt: number, events: SimEvent[]): void {
    this.eventTimer -= dt;
    const level = effectiveLevel(state), row = levelRow(level);
    if (!this.pendingEvent && this.eventTimer <= EVENT_WARN_MS) {
      if (level < GOLDEN_FROM_LEVEL && state.elapsedMs + this.eventTimer < 20000 - 1e-7) { this.eventTimer = this.eventRng.range(...EVENT_GAP_MS); return; }
      const kind = state.mode === 'attract' ? (this.lastEvent === 'golden' ? 'chord' : 'golden') : level < CHORD_FROM_LEVEL || this.lastEvent === 'chord' ? 'golden' : this.eventRng.weighted([{ item: 'golden' as const, w: EVENT_WEIGHTS.golden }, { item: 'chord' as const, w: EVENT_WEIGHTS.chord }]);
      this.pendingEvent = { kind, note: this.eventRng.int(state.K), theta: this.eventRng.range(0, Math.PI * 2) };
      events.push({ type: 'eventWarn', ...this.pendingEvent });
    }
    if (!this.pendingEvent || this.eventTimer > 1e-7) return;
    const { kind, note } = this.pendingEvent, count = kind === 'chord' ? CHORD_COUNT : 1;
    const cap = row.fieldCap + (kind === 'chord' ? CHORD_CAP_SLACK : 1);
    let theta = this.pendingEvent.theta, tries = 0;
    const blocked = () => { for (let i = 0; i < count; i++) if (this.blocked(state, theta + (count === 1 ? 0 : (i / (count - 1) - 0.5) * CHORD_ARC))) return true; return false; };
    while (blocked() && tries++ < FAIRNESS_TRIES) theta += FAIRNESS_ROTATION;
    if (aliveCount(state) + count > cap || blocked()) {
      this.retryElapsed += EVENT_RETRY_MS;
      if (this.retryElapsed < EVENT_GIVE_UP_MS) { this.eventTimer = EVENT_RETRY_MS; return; }
    } else {
      const ids: number[] = [];
      for (let i = 0; i < count; i++) {
        const c = this.spawn(state, note, theta + (count === 1 ? 0 : (i / (count - 1) - 0.5) * CHORD_ARC), kind === 'golden' ? 'golden' : 'normal', row.speed * (kind === 'golden' ? GOLDEN_SPEED : CHORD_SPEED), kind === 'golden' ? this.eventRng.sign() * GOLDEN_SWIRL : 0, events);
        if (c) ids.push(c.id);
      }
      if (kind === 'chord') events.push({ type: 'chordWave', note, theta, ids });
    }
    this.lastEvent = kind; this.pendingEvent = null; this.retryElapsed = 0;
    this.eventTimer = state.mode === 'attract' ? this.eventRng.range(...ATTRACT_EVENT_GAP_MS) : this.eventRng.range(...EVENT_GAP_MS);
  }
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
    if (aliveCount(state) + this.pending.length < levelRow(effectiveLevel(state)).fieldCap + 2) this.spawn(state, note, theta, 'normal', levelRow(effectiveLevel(state)).speed, parent.swirl, events, parent.rho, SPLITTER_PUSH_MS);
  }
  private kind(state: SimState): Kind {
    for (const def of KINDS) {
      if (effectiveLevel(state) < def.fromLevel) continue;
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
      if (p.delay <= 1e-7) { let tries = 0; while (this.blocked(state, p.theta) && tries < FAIRNESS_TRIES) { p.theta += FAIRNESS_ROTATION; tries++; } if (!this.blocked(state, p.theta)) this.spawn(state, p.note, p.theta, 'normal', levelRow(effectiveLevel(state)).speed, SPIRAL_SWIRL, events); this.pending.splice(i, 1); }
    }
    this.timer -= dt;
    if (this.timer > 1e-7) return;
    const row = levelRow(effectiveLevel(state));
    const unlocked = FORMATIONS.filter(f => f.fromLevel <= effectiveLevel(state));
    const formation: Formation = this.opening ? 'ring' : this.rng.weighted(unlocked.map(f => ({ item: f.id, w: f.weight })));
    const count = formation === 'single' ? 1 : formation === 'pair' ? 2 : formation === 'arc' ? Math.min(5, 3 + Math.floor(effectiveLevel(state) / 3)) : formation === 'duet' ? 4 : formation === 'spiral' ? state.K : 6;
    if (aliveCount(state) + this.pending.length + count > Math.min(row.fieldCap, MAX_CRYSTALS)) { this.timer = SPAWN_RETRY_MS; return; }
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
    const wasOpening = this.opening;
    this.opening = false;
    const fillFast = aliveCount(state) < Math.min(row.fieldCap, 8);
    this.timer = (wasOpening || fillFast) ? Math.min(500, row.spawnInterval * 1000 * 0.4) : row.spawnInterval * 1000 * (1 + SPAWN_COUNT_FACTOR * (count - 1));
  }
}
