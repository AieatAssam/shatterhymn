import { SIM_DT_MS } from '../core/loop';
import { Rng } from '../core/rng';
import { ATTRACT_K, ATTRACT_LEVEL, CRACK_GRACE_MS, FLARE_R, HALO_R, LEVEL_MS, MAX_CRACKS, MAX_CRYSTALS, PRISM_CYCLE_MS, SPLITTER_PUSH_DISTANCE, SPLITTER_PUSH_MS, levelRow } from './config';
import { advanceDial, cancelDial, pressDial, releaseDial } from './dial';
import { Spawner } from './spawner';
import { resolveStrike } from './strike';
import type { TutorialScript } from './tutorial';
import type { Crystal, RunMode, ShatterInfo, SimEvent, SimInput, SimState } from './types';

function emptyCrystal(): Crystal {
  return { id: 0, alive: false, kind: 'normal', note: 0, rho: 0, theta: 0, r: 0, speed: 0, swirl: 0, shell: false, prismMs: 0, pushMs: 0, ageMs: 0, x: 0, y: 0 };
}
export class Sim {
  readonly state: SimState;
  private readonly spawner: Spawner;
  private readonly events: SimEvent[] = [];
  private readonly script?: TutorialScript;
  private tutorialStep = -1;
  private readonly eventsEnabled: boolean;
  constructor(opts: { seed: number; mode: RunMode; slowDial: boolean; script?: TutorialScript; events?: boolean }) {
    this.script = opts.script;
    this.eventsEnabled = opts.events !== false;
    this.spawner = new Spawner(new Rng(opts.seed), opts.seed, opts.mode);
    this.state = { mode: opts.mode, seed: opts.seed, tick: 0, elapsedMs: 0, level: 0, K: opts.mode === 'attract' ? ATTRACT_K : 3, crystals: Array.from({ length: MAX_CRYSTALS }, emptyCrystal), dial: { holding: false, note: 0, stepElapsedMs: 0, holdMs: 0, waitingRecovery: false }, recoveryMs: 0, jarMs: 0, graceMs: 0, cracks: 0, streak: 0, mult: 1, over: false, stats: { score: 0, timeMs: 0, biggestN: 0, longestStreak: 0, crystalsBroken: 0, choirs: 0, closeCalls: 0, prismsBroken: 0, duds: 0, strikes: 0, maxMult: 1, shards: 0, goldens: 0 }, hymn: [], slowDial: opts.slowDial };
    if (opts.mode === 'tutorial' && this.script) this.setTutorialStep(0);
  }
  setTutorialStep(index: number): void {
    if (this.state.mode !== 'tutorial' || !this.script || index === this.tutorialStep) return;
    this.tutorialStep = index;
    const step = this.script[index];
    if (!step) return;
    for (const crystal of this.state.crystals) crystal.alive = false;
    this.state.jarMs = 0; this.state.recoveryMs = 0;
    for (const spawn of step.spawns) this.spawner.spawn(this.state, spawn.note, spawn.theta, 'normal', levelRow(0).speed, 0, this.events);
  }
  step(input: SimInput): readonly SimEvent[] {
    const s = this.state, dt = SIM_DT_MS, events = this.events;
    events.length = 0;
    if (s.over) return events;
    s.recoveryMs = Math.max(0, s.recoveryMs - dt); s.jarMs = Math.max(0, s.jarMs - dt); s.graceMs = Math.max(0, s.graceMs - dt);
    if (input.cancel) cancelDial(s);
    if (input.press) pressDial(s, events);
    if (input.release) {
      const note = releaseDial(s);
      if (note !== null && (s.mode !== 'tutorial' || this.tutorialStep === 2 || this.tutorialStep === 4)) {
        const score = s.stats.score;
        resolveStrike(s, note, events, (parent, childNote, theta) => this.spawner.spawnChild(s, parent, childNote, theta, events));
        if (s.mode === 'tutorial') { s.stats.score = score; s.stats.shards = 0; }
      }
    }
    advanceDial(s, dt, levelRow(s.mode === 'attract' ? ATTRACT_LEVEL : s.level).stepMs, events);
    if (s.mode !== 'tutorial' && s.mode !== 'attract') {
      s.elapsedMs = (s.tick + 1) * dt;
      const level = Math.floor((s.elapsedMs + 1e-7) / LEVEL_MS);
      if (level > s.level) { const oldK = s.K; s.level = level; s.K = levelRow(level).K; events.push({ type: 'levelUp', level, K: s.K, newNote: s.K > oldK ? s.K - 1 : null }); }
    }
    if (s.mode !== 'tutorial') { this.spawner.update(s, dt, events); if (this.eventsEnabled) this.spawner.updateEvents(s, dt, events); }
    for (const c of s.crystals) {
      if (!c.alive) continue;
      if (c.kind === 'prism') { c.prismMs -= dt; while (c.prismMs <= 1e-7) { c.note = (c.note + 1) % s.K; c.prismMs += PRISM_CYCLE_MS; } }
      if (c.pushMs > 0) { const push = Math.min(dt, c.pushMs); c.rho += SPLITTER_PUSH_DISTANCE * push / SPLITTER_PUSH_MS; c.pushMs = Math.max(0, c.pushMs - dt); c.rho -= c.speed * (dt - push) / 1000; }
      else c.rho -= c.speed * dt / 1000;
      if (s.mode === 'tutorial') c.rho = Math.max(this.script?.[this.tutorialStep]?.stopRho ?? 5, c.rho);
      c.theta += c.swirl * dt / 1000; c.x = c.rho * Math.cos(c.theta); c.y = c.rho * Math.sin(c.theta); c.ageMs += dt;
    }
    if (s.mode === 'attract') for (const c of s.crystals) if (c.alive && c.rho - c.r <= HALO_R) c.alive = false;
    if (s.mode !== 'tutorial' && s.mode !== 'attract') {
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
