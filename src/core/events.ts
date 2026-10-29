import type { SimEvent } from '../sim/types';
import type { SliceEvent } from '../sim/sliceTypes';

export type GameBusEvent = GameEvent | SimEvent | (SliceEvent & { mode: 'slice' });

export type GameEvent =
  | { type: 'newBestLive'; score: number }
  | { type: 'missionComplete'; id: string }
  | { type: 'unlock'; kind: 'skin' | 'scale' | 'title'; id: string }
  | { type: 'ui'; sound: 'click' | 'back' | 'toggle' }
  | { type: 'settings'; settings: { sfx: number; music: number; vibration: boolean; reduceMotion: boolean | null; slowDial: boolean; shake: number; tips: boolean } }
  | { type: 'pause' } | { type: 'resume' }
  | { type: 'runStart'; mode: 'run' | 'daily' | 'tutorial' | 'attract'; seed: number };

export class EventBus<E extends { type: string } = GameEvent> {
  private readonly listeners = new Map<string, ((event: E) => void)[]>();
  on<T extends E['type']>(type: T, fn: (event: Extract<E, { type: T }>) => void): () => void {
    let listeners = this.listeners.get(type);
    if (!listeners) { listeners = []; this.listeners.set(type, listeners); }
    const listener = fn as (event: E) => void;
    listeners.push(listener);
    return () => { const index = listeners.indexOf(listener); if (index !== -1) listeners.splice(index, 1); };
  }
  emit(event: E): void {
    const listeners = this.listeners.get(event.type);
    if (!listeners) return;
    for (const listener of [...listeners]) {
      try { listener(event); } catch (error) { console.error(error); }
    }
  }
  clear(): void { this.listeners.clear(); }
}
