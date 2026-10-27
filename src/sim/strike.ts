import { GOLDEN_POINTS, GOLDEN_SHARDS, CHOIR_N, CHOIR_R, CLOSE_GAP, CRYSTAL_R, HALO_R, JAR_MS, PRISM_BLAST_R, RECOVERY_MS, SCORE, SPLITTER_CHILD_ANGLE, TARGETABLE_R } from './config';
import type { Crystal, ShatterInfo, SimEvent, SimState } from './types';

export type SpawnChild = (parent: Crystal, note: number, theta: number) => void;

function info(c: Crystal): ShatterInfo {
  return { id: c.id, x: c.x, y: c.y, note: c.note, kind: c.kind, close: c.rho - HALO_R - c.r <= CLOSE_GAP, dist: c.rho };
}

export function resolveStrike(state: SimState, note: number, events: SimEvent[], spawnChild: SpawnChild): void {
  state.recoveryMs = RECOVERY_MS;
  state.stats.strikes++;
  const targets = state.crystals.filter(c => c.alive && c.rho <= TARGETABLE_R && c.note === note);
  let shellBreaks = 0;
  const shelled = new Set<Crystal>();
  const shattered: ShatterInfo[] = [];
  const prisms: Crystal[] = [];
  for (const c of targets) {
    if (c.kind === 'geode' && c.shell) {
      shelled.add(c);
      c.shell = false;
      c.r = CRYSTAL_R;
      shellBreaks++;
      events.push({ type: 'shellBreak', id: c.id, x: c.x, y: c.y, note: c.note });
    }
  }
  const shatter = (c: Crystal, blast: boolean): void => {
    if (!c.alive) return;
    c.alive = false;
    shattered.push(info(c));
    if (c.kind === 'prism') {
      state.stats.prismsBroken++;
      if (!blast) prisms.push(c);
    }
    if (c.kind === 'mend' && state.cracks > 0) {
      state.cracks--;
      events.push({ type: 'mend', cracks: state.cracks });
    }
    if (c.kind === 'splitter') {
      const childNote = (c.note + 1) % state.K;
      const theta = c.theta;
      spawnChild(c, childNote, theta - SPLITTER_CHILD_ANGLE);
      spawnChild(c, childNote, theta + SPLITTER_CHILD_ANGLE);
    }
  };
  for (const c of targets) {
    if (!shelled.has(c)) shatter(c, false);
  }
  for (const prism of prisms) {
    events.push({ type: 'prismBlast', x: prism.x, y: prism.y, radius: PRISM_BLAST_R });
    for (const c of state.crystals) {
      if (c.alive && Math.hypot(c.x - prism.x, c.y - prism.y) <= PRISM_BLAST_R) shatter(c, true);
    }
  }
  const n = shattered.length;
  if (n === 0 && shellBreaks === 0) {
    state.streak = 0;
    state.mult = 1;
    state.jarMs = JAR_MS;
    state.stats.duds++;
    events.push({ type: 'dud', note });
    return;
  }
  state.streak++;
  state.mult = Math.min(SCORE.multCap, 1 + Math.floor((state.streak - 1) / 2));
  const mult = state.mult;
  const closeCount = shattered.filter(c => c.close).length;
  let points = (SCORE.base * n * n + SCORE.shell * shellBreaks + SCORE.close * closeCount) * mult;
  const swept: ShatterInfo[] = [];
  if (n >= CHOIR_N) {
    for (const c of state.crystals) {
      if (c.alive && c.rho <= CHOIR_R) {
        c.alive = false;
        swept.push(info(c));
        if (c.kind === 'prism') state.stats.prismsBroken++;
      }
    }
    const choirPoints = (SCORE.choirFlat + SCORE.choirEach * swept.length) * mult;
    points += choirPoints;
    state.stats.choirs++;
    events.push({ type: 'choir', note, n, swept, points: choirPoints });
  }
  for (const c of [...shattered, ...swept]) if (c.kind === 'golden') {
    const bonus = GOLDEN_POINTS * mult; points += bonus; state.stats.shards += GOLDEN_SHARDS; state.stats.goldens++;
    events.push({ type: 'golden', id: c.id, x: c.x, y: c.y, note: c.note, points: bonus });
  }
  state.stats.score += points;
  state.stats.biggestN = Math.max(state.stats.biggestN, n);
  state.stats.longestStreak = Math.max(state.stats.longestStreak, state.streak);
  state.stats.maxMult = Math.max(state.stats.maxMult, mult);
  state.stats.crystalsBroken += n + swept.length;
  state.stats.closeCalls += closeCount;
  state.stats.shards += n + swept.length + (n >= CHOIR_N ? 10 : 0);
  state.hymn.push(note);
  if (n >= CHOIR_N) state.hymn.push(10);
  events.push({ type: 'strike', note, n, shellBreaks, points, mult, streak: state.streak, shattered, closeCount });
}
