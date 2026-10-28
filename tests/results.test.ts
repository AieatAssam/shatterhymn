import {expect,it} from 'vitest';
import {resultsModel} from '../src/ui/screens/results';
import {result} from './metaHelpers';
it('shows the mode and its best',()=>{const r=result({score:100}),outcome={mode:'tap' as const,newBest:false,prevBest:18420,shardsEarned:0,missionShards:0,missionsCompleted:[],allMissionsBonus:false,unlocked:[],dailyBest:null,nextUnlock:null};const m=resultsModel(outcome,r.stats,'tap',false,12);expect(m.modeLabel).toBe('Tap');expect(m.best).toBe('Your Tap best: 18,420');expect(m.title).toBe('Oops! The bell broke.');});
