import {expect,it} from 'vitest';
import {titleModel} from '../src/ui/screens/title';
import {resetSave} from '../src/meta/save';
it('reveals meta after three total runs and formats Tap best',()=>{const save=resetSave();expect(titleModel({save,friend:null},'2026-01-01')).toMatchObject({meta:false,settings:true});save.progress.runs=3;save.modes.tap.runs=3;save.modes.tap.bests.score=18420;const m=titleModel({save,friend:null},'2026-01-01');expect(m.meta).toBe(true);expect(m.settings).toBe(true);expect(m.best).toBe('Best 18,420');expect(m.daily.aria).toContain('Not played yet');});
