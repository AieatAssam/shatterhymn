import { describe, expect, it } from 'vitest';
import { chordDegrees, degreeToSemis, noteHz, SCALES } from '../src/audio/scales';
import { AudioEngine } from '../src/audio/audio';
import { EventBus, type GameEvent } from '../src/core/events';
import type { SimEvent } from '../src/sim/types';

describe('scales', () => {
 it('uses the specified pitches and wraps degrees', () => { expect(noteHz('bright', 0)).toBeCloseTo(523.25, 2); expect(noteHz('bright', 3)).toBeCloseTo(783.99, 2); expect(degreeToSemis('bright', 5)).toBe(12); expect(degreeToSemis('bright', 7)).toBe(16); });
 it('contains five increasing notes per scale', () => { for (const {semis} of Object.values(SCALES)) { expect(semis).toHaveLength(5); semis.forEach((n, i) => { expect(n).toBeGreaterThanOrEqual(0); expect(n).toBeLessThan(12); if (i) expect(n).toBeGreaterThan(semis[i - 1]!); }); } });
 it('builds capped chords', () => { expect(chordDegrees(0, 3)).toEqual([0, 2, 4]); expect(chordDegrees(0, 20)).toHaveLength(7); });
 it('ignores audio calls before unlock', () => { const bus = new EventBus<GameEvent | SimEvent>(); const audio = new AudioEngine(bus, './'); expect(() => { audio.playDial(0); audio.playStrike(0); audio.playShatter(0, 3); audio.playChoir(0); audio.playClose(0); audio.playCrack(); audio.playMend(); audio.playGameOver(); audio.playNewBest(); audio.playUnlock(); audio.playUi('click'); audio.duck(-9, 60, 300, 1000); audio.suspend(); audio.resume();  }).not.toThrow(); audio.setScale('dusk'); expect(audio.noteHz(1)).toBeCloseTo(noteHz('dusk', 1)); });
});
