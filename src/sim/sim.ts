import { SIM_DT_MS } from '../core/loop';
import { Rng } from '../core/rng';
import { ARENA_R, TAP_OPENING, ATTRACT_K, CRACK_GRACE_MS, FLARE_R, HALO_R, LEVEL_MS, MAX_CRACKS, MAX_CRYSTALS, PRISM_CYCLE_MS, SLOW_SPEED_FACTOR, SPLITTER_PUSH_DISTANCE, SPLITTER_PUSH_MS, levelRow } from './config';

import { Spawner } from './spawner';
import { resolveStrike } from './strike';
import type { Crystal, RunMode, ShatterInfo, SimEvent, SimInput, SimState } from './types';

function emptyCrystal(): Crystal {
  return { id: 0, alive: false, kind: 'normal', note: 0, rho: 0, theta: 0, r: 0, speed: 0, swirl: 0, shell: false, prismMs: 0, pushMs: 0, ageMs: 0, x: 0, y: 0 };
}
export class Sim {
  readonly state: SimState;
  private readonly spawner: Spawner;
  private readonly events: SimEvent[] = [];
  private readonly openingRng: Rng;
  private crownNote = 0;
  private readonly eventsEnabled: boolean;
  constructor(opts: { seed: number; mode: RunMode; slowDial: boolean; profile?: 'beginner' | 'standard'; gentleMiss?: boolean; events?: boolean }) {
    this.openingRng = new Rng(opts.seed);
    this.eventsEnabled = opts.events !== false;
    this.spawner = new Spawner(new Rng(opts.seed), opts.seed, opts.mode);
    this.state = { mode: opts.mode, seed: opts.seed, tick: 0, elapsedMs: 0, level: 0, K: opts.mode === 'attract' ? ATTRACT_K : 3, crystals: Array.from({ length: MAX_CRYSTALS }, emptyCrystal), recoveryMs: 0, queuedNote: null, graceMs: 0, cracks: 0, streak: 0, mult: 1, over: false, stats: { score: 0, timeMs: 0, biggestN: 0, longestStreak: 0, crystalsBroken: 0, choirs: 0, closeCalls: 0, prismsBroken: 0, misses: 0, strikes: 0, maxMult: 1, shards: 0, goldens: 0 }, hymn: [], slowDial: opts.slowDial, profile: opts.mode === 'daily' ? 'standard' : opts.profile ?? 'standard', gentleMiss: opts.gentleMiss ?? false };
  }
  private fireStrike(note: number, events: SimEvent[]): void {
    resolveStrike(this.state, note, events, (parent, childNote, theta) => this.spawner.spawnChild(this.state, parent, childNote, theta, events));
  }
  forceGameOver(): void { this.state.cracks = MAX_CRACKS; this.forced = true; }
  private forced = false;
  step(input: SimInput): readonly SimEvent[] {
    const s = this.state, dt = SIM_DT_MS, events = this.events;
    events.length = 0;
    if (s.over) return events;
    if (this.forced) { this.forced = false; s.over = true; events.push({type: 'gameOver', stats: s.stats, hymn: s.hymn}); return events; }
    s.recoveryMs = Math.max(0, s.recoveryMs - dt); s.graceMs = Math.max(0, s.graceMs - dt);
    const nextMs = (s.tick + 1) * dt;
    if (s.mode !== 'attract' && s.tick * dt < TAP_OPENING.crownAtMs && nextMs + 1e-7 >= TAP_OPENING.crownAtMs) {
      this.crownNote = s.mode === 'intro' ? 0 : this.openingRng.int(3);
      const theta = this.openingRng.range(0, Math.PI * 2);
      for (let i = 0; i < TAP_OPENING.crownCount; i++) this.spawner.spawn(s, this.crownNote, theta + i * Math.PI * 2 / TAP_OPENING.crownCount, 'normal', TAP_OPENING.crownSpeed, TAP_OPENING.crownSwirl, events, TAP_OPENING.crownRho);
    }
    if (s.mode !== 'attract' && s.mode !== 'intro' && s.tick * dt < TAP_OPENING.followAtMs && nextMs + 1e-7 >= TAP_OPENING.followAtMs) {
      let note = this.spawner.drawTone(s.K); while (note === this.crownNote) note = this.spawner.drawTone(s.K);
      const theta = this.openingRng.range(0, Math.PI * 2);
      for (let i = 0; i < TAP_OPENING.followCount; i++) this.spawner.spawn(s, note, theta + (i / (TAP_OPENING.followCount - 1) - .5) * TAP_OPENING.followArc, 'normal', levelRow(0).speed * TAP_OPENING.followSpeedFactor, 0, events, 8.5);
    }
    if (input.miss && s.gentleMiss && s.streak >= 2 && Math.hypot(input.miss.x, input.miss.y) <= ARENA_R) { s.streak = 0; s.mult = 1; s.stats.misses++; events.push({type:'miss', ...input.miss}); }
    if (input.strike !== null && input.strike >= 0 && input.strike < s.K) {
      if (s.mode === 'intro' && nextMs < TAP_OPENING.crownAtMs || s.recoveryMs > 0 || s.queuedNote !== null) s.queuedNote = input.strike;
      else this.fireStrike(input.strike, events);
    }
    if (s.recoveryMs === 0 && s.queuedNote !== null && (s.mode !== 'intro' || nextMs >= TAP_OPENING.crownAtMs)) {
      const note = s.queuedNote; s.queuedNote = null; this.fireStrike(note, events);
    }
    if (s.mode !== 'attract') {
      s.elapsedMs = (s.tick + 1) * dt;
      const level = s.mode === 'intro' ? 0 : Math.floor((s.elapsedMs + 1e-7) / LEVEL_MS);
      if (level > s.level) { const oldK = s.K; s.level = level; s.K = levelRow(level).K; events.push({ type: 'levelUp', level, K: s.K, newNote: s.K > oldK ? s.K - 1 : null }); }
    }
    if (s.mode === 'attract' || (s.mode !== 'intro' && nextMs >= TAP_OPENING.spawnerStartMs)) this.spawner.update(s, dt, events);
    if (s.mode !== 'intro' && this.eventsEnabled) this.spawner.updateEvents(s, dt, events);
    for (const c of s.crystals) {
      if (!c.alive) continue;
      if (c.ageMs === 0 && c.rho === TAP_OPENING.crownRho && nextMs <= TAP_OPENING.crownAtMs + 1e-7) { c.ageMs += dt; continue; }
      if (c.kind === 'prism') { c.prismMs -= dt; while (c.prismMs <= 1e-7) { c.note = (c.note + 1) % s.K; c.prismMs += PRISM_CYCLE_MS; } }
      const speed = c.speed * ((s.mode === 'run' || s.mode === 'daily') && s.slowDial ? SLOW_SPEED_FACTOR : 1);
      if (c.pushMs > 0) { const push = Math.min(dt, c.pushMs); c.rho += SPLITTER_PUSH_DISTANCE * push / SPLITTER_PUSH_MS; c.pushMs = Math.max(0, c.pushMs - dt); c.rho -= speed * (dt - push) / 1000; }
      else c.rho -= speed * dt / 1000;
      if (s.mode === 'intro') c.rho = Math.max(TAP_OPENING.crownRho, c.rho);
      c.theta += c.swirl * dt / 1000; c.x = c.rho * Math.cos(c.theta); c.y = c.rho * Math.sin(c.theta); c.ageMs += dt;
    }
    if (s.mode === 'attract') for (const c of s.crystals) if (c.alive && c.rho - c.r <= HALO_R) c.alive = false;
    if (s.mode !== 'intro' && s.mode !== 'attract') {
      let lastId = 0;
      for (;;) {
        let c: Crystal | undefined;
        for (const candidate of s.crystals) if (candidate.alive && candidate.id > lastId && candidate.rho - candidate.r <= HALO_R && (!c || candidate.id < c.id)) c = candidate;
        if (!c) break;
        lastId = c.id;
        c.alive = false;
        if (s.graceMs > 0) { events.push({ type: 'graceHit', id: c.id, x: c.x, y: c.y }); continue; }
        s.cracks++; s.streak = 0; s.mult = 1; s.graceMs = CRACK_GRACE_MS; s.hymn.push(20);
        const flared: ShatterInfo[] = [];
        for (const other of s.crystals) if (other.alive && other.rho <= FLARE_R) { other.alive = false; flared.push({ id: other.id, x: other.x, y: other.y, note: other.note, kind: other.kind, close: false, dist: other.rho }); }
        events.push({ type: 'crack', cracks: s.cracks, x: c.x, y: c.y, flared });
        if (s.cracks >= MAX_CRACKS) { s.over = true; break; }
      }
    }
    s.tick++; s.stats.timeMs = s.elapsedMs;
    if (s.over) events.push({ type: 'gameOver', stats: s.stats, hymn: s.hymn });
    return events;
  }
}
