const paths = ["M12 2 L22 21 H2 Z", "M12 2 L22 12 L12 22 L2 12 Z", "M7 3 H17 L22 12 L17 21 H7 L2 12 Z", "M12 2 L14.9 8.2 L21.5 8.8 L16.5 13.3 L18 20 L12 16.5 L6 20 L7.5 13.3 L2.5 8.8 L9.1 8.2 Z", "M12 2 A10 10 0 1 1 11.99 2 Z"];
export const colors = ["#FF4F6E", "#FFC23F", "#3FE0A0", "#4FA8FF", "#C77DFF"];
export function glyph(note: number): string { return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${paths[note]}"/></svg>`; }
export const bellIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c-4 0-6 3-6 7v4l-2 4h16l-2-4v-4c0-4-2-7-6-7ZM9 20h6"/><path class="heart-crack" d="M13 5l-2 5 3 1-3 5"/></svg>`;
export const pauseIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>`;
export const lockIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z"/></svg>`;
