import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/meta/missions';
import { TIPS } from '../src/ui/banners';
import { TUTORIAL_RETRY, TUTORIAL_SCRIPT } from '../src/sim/tutorial';
import { SETTINGS_LABELS } from '../src/ui/screens/settings';
import { resultsModel } from '../src/ui/screens/results';
import { resetSave } from '../src/meta/save';
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
  it('removes old hold and dial wording from source and README', () => {
    const files = listFiles('src').filter(path => /\.(ts|css|html|md)$/.test(path));
    const content = [...files.map(file => readFileSync(file, 'utf8')), readFileSync('README.md', 'utf8')]
      .join('\n')
      .replace(/slowDial/g, 'slowSetting');
    expect(content).not.toMatch(/\bhold\b|let go|\bdial\b/i);
  });
  it('keeps the audited strings short and free of placeholders', () => {
    const outcome: RunOutcome = { newBest: true, prevBest: 0, shardsEarned: 184, missionShards: 0, missionsCompleted: [], allMissionsBonus: false, unlocked: [], dailyBest: null, nextUnlock: { kind: 'skin', id: 'rosegold', name: 'Rose Gold', have: 412, need: 500 } };
    const model = resultsModel(outcome, result().stats, resetSave());
    outcome.newBest = false;
    const previousBest = resultsModel(outcome, result().stats, resetSave()).best;
    const strings = [
      ...MISSIONS.map(mission => mission.text), ...Object.values(TIPS),
      ...TUTORIAL_SCRIPT.flatMap(step => [step.text, ...(step.button ? [step.button] : [])]),
      TUTORIAL_RETRY, ...Object.values(SETTINGS_LABELS), model.title, model.score,
      model.best, previousBest, model.time, model.shards, model.next!, ...model.stats,
    ];
    for (const text of strings) {
      expect(text).not.toMatch(/TODO|TBD|lorem| {2}/i);
      expect(text.length).toBeLessThanOrEqual(120);
    }
  });
});
