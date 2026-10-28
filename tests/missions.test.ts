import {expect,it} from 'vitest';
import {MISSIONS,pickMissions} from '../src/meta/missions';
import {resetSave} from '../src/meta/save';
import {applyRunResult} from '../src/meta/runEnd';
import {result} from './metaHelpers';
it('picks three distinct missions including an any mission deterministically',()=>{for(let i=1;i<=28;i++){const day=`2026-01-${String(i).padStart(2,'0')}`,ids=pickMissions(day);expect(ids).toEqual(pickMissions(day));expect(new Set(ids).size).toBe(3);expect(ids.some(id=>MISSIONS.find(m=>m.id===id)?.mode==='any')).toBe(true);}});
it('counts modes together and restricts mode-specific missions',()=>{const s=resetSave();s.missions={date:'2026-01-01',ids:['m_any_both','m_tap_n6'],progress:{},done:[],bonusGiven:false,modesToday:[]};applyRunResult(s,result({biggest:10},'slice'),'2026-01-01');expect(s.missions.progress.m_tap_n6).toBeUndefined();applyRunResult(s,result({biggest:6}),'2026-01-01');expect(s.missions.done).toEqual(expect.arrayContaining(['m_any_both','m_tap_n6']));});
