import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/meta/missions';
import { TIPS } from '../src/ui/banners';
import { SETTINGS_LABELS } from '../src/ui/screens/settings';
import { resultsModel } from '../src/ui/screens/results';
import type { RunOutcome } from '../src/meta/runEnd';
import { result } from './metaHelpers';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

describe('player copy', () => {
  it('includes the lift tip', () => expect(TIPS.lift).toBe('Lift your finger to slice again!'));
  it('removes old hold and dial wording from source and documentation', () => {
    const files = listFiles('src').filter(path => /\.(ts|css|html|md)$/.test(path));
    const content = [...files.map(file => readFileSync(file, 'utf8')), readFileSync('README.md', 'utf8'), readFileSync('CREDITS.md', 'utf8')]
      .join('\n')
      .replace(/slowDial/g, 'slowSetting').replace(/\bhold\b/g, 'freeze');
    expect(content).not.toMatch(/\bhold\b|let go|\bdial\b|colour button|combo lost/i);
  });
  it('documents both modes and credits Slice inspiration in the in-game credits', () => {
    const readme = readFileSync('README.md', 'utf8');
    const credits = readFileSync('CREDITS.md', 'utf8');
    for (const path of ['docs/media/title.png', 'docs/media/tap.gif', 'docs/media/slice.gif']) expect(readme).toContain(path);
    expect(readme).toContain('## Two ways to play');
    expect(readme).toContain('Shatterhymn is not affiliated with or endorsed by Halfbrick Studios.');
    expect(credits).toContain('Slice mode is inspired by Fruit Ninja by Halfbrick Studios.');
    expect(credits).toContain('Shatterhymn is a separate fan-made game. It is not made by, endorsed by, sponsored by or affiliated with Halfbrick Studios.');
    expect(credits).toContain('It uses no Fruit Ninja code, art, sound or names in play. Fruit Ninja and Halfbrick are trademarks of their owner.');
    expect(readFileSync('src/ui/screens/credits.ts', 'utf8')).toContain('CREDITS.md?raw');
  });
  it('keeps the audited strings short and free of placeholders', () => {
    const outcome: RunOutcome = { mode: 'tap', newBest: true, prevBest: 0, shardsEarned: 184, missionShards: 0, missionsCompleted: [], allMissionsBonus: false, unlocked: [], dailyBest: null, nextUnlock: { kind: 'skin', id: 'rosegold', name: 'Rose Gold', have: 412, need: 500 } };
    const model = resultsModel(outcome, result().stats, 'tap', false, 1);
    outcome.newBest = false;
    const previousBest = resultsModel(outcome, result().stats, 'tap', false, 1).best;
    const strings = [
      ...MISSIONS.map(mission => mission.text), ...Object.values(TIPS),
      ...Object.values(SETTINGS_LABELS), model.title, model.score,
      model.best, previousBest, model.time, model.shards, ...model.stats,
    ];
    for (const text of strings) {
      expect(text).not.toMatch(/TODO|TBD|lorem| {2}|—/i);
      expect(text.length).toBeLessThanOrEqual(80);
    }
  });
});

it('removes the pad and lockout identifiers from source', () => {
  for (const file of listFiles('src')) {
    expect(readFileSync(file, 'utf8'), file).not.toMatch(/colorPad|color-pad|lockMs|EMPTY_LOCK_MS|uPadTop/);
  }
});
