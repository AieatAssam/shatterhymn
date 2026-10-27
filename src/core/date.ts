export function localDateISO(d: Date): string {
  return `${d.getFullYear().toString().padStart(4, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}
export function dailyNumber(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number);
  return Math.floor((Date.UTC(year!, month! - 1, day!) - Date.UTC(2026, 9, 27)) / 86400000) + 1;
}
export function msToClock(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
}
