export type ScaleId = "bright" | "dusk" | "koto" | "dream" | "gamelan";
export const SCALES: Record<ScaleId, { name: string; semis: readonly [number, number, number, number, number] }> = {
 bright: { name: "Bright", semis: [0, 2, 4, 7, 9] }, dusk: { name: "Dusk", semis: [0, 3, 5, 7, 10] },
 koto: { name: "Koto", semis: [0, 2, 3, 7, 8] }, dream: { name: "Dream", semis: [0, 2, 4, 6, 8] }, gamelan: { name: "Gamelan", semis: [0, 1, 3, 7, 8] },
};
export function degreeToSemis(scale: ScaleId, degree: number): number { const octave = Math.floor(degree / 5); return SCALES[scale].semis[degree - octave * 5]! + octave * 12; }
export function noteHz(scale: ScaleId, degree: number, octave = 0): number { return 523.25 * 2 ** (degreeToSemis(scale, degree) / 12 + octave); }
export function chordDegrees(note: number, n: number): number[] { return Array.from({ length: Math.min(7, Math.max(0, n)) }, (_, i) => note + Math.floor(i / 3) * 5 + [0, 2, 4][i % 3]!); }
