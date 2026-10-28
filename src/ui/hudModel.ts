import type { SaveV2 } from '../meta/save';
import { SKINS, SCALE_UNLOCKS, nextLockedByShards } from '../meta/unlocks';

export function nextChipModel(save: SaveV2, runShards: number, celebrateId?: string | null): { line: string; have: number; need: number; unlocked: boolean } | null {
  const total = save.progress.lifetimeShards + runShards;
  if (celebrateId) {
    const item = [...SKINS, ...SCALE_UNLOCKS].find(x => x.id === celebrateId);
    if (item) return { line: `Unlocked: ${item.name}${SKINS.some(s => s.id === item.id) ? ' bell' : ''}`, have: Math.min(total, item.requirement.value), need: item.requirement.value, unlocked: true };
  }
  const next = nextLockedByShards(save);
  if (!next) return null;
  const unlocked = save.progress.lifetimeShards < next.need && total >= next.need;
  return { line: `${unlocked ? 'Unlocked' : 'Next'}: ${next.name}${next.kind === 'skin' ? ' bell' : ''}`, have: unlocked ? Math.min(total, next.need) : total, need: next.need, unlocked };
}

/** Available width of the chip in the symmetric HUD grid. */
export function hudChipLayout(viewport: number, bestWidth: number): { maxWidth: number; gap: number } {
  const gap = 16;
  return { maxWidth: Math.max(0, Math.min(viewport / 2 - 64, (viewport - 24 - bestWidth - gap * 2) / 2)), gap };
}

export function multiplierText(mult: number): string { return mult > 1 ? `×${mult}` : ""; }
