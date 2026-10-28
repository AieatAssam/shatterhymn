const paths = ["M12 2 L22 21 H2 Z", "M12 2 L19 12 L12 22 L5 12 Z", "M7 3 H17 L22 12 L17 21 H7 L2 12 Z", "M12 2 L14.9 8.2 L21.5 8.8 L16.5 13.3 L18 20 L12 16.5 L6 20 L7.5 13.3 L2.5 8.8 L9.1 8.2 Z", "M12 2 A10 10 0 1 1 11.99 2 Z"];
export const colors = ["#FF4F6E", "#FFC23F", "#3FE0A0", "#4FA8FF", "#C77DFF"];
export function glyph(note: number): string { return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${paths[note]}"/></svg>`; }
export const bellIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c-4 0-6 3-6 7v4l-2 4h16l-2-4v-4c0-4-2-7-6-7ZM9 20h6"/><path class="heart-crack" d="M13 5l-2 5 3 1-3 5"/></svg>`;
export const pauseIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>`;
export const lockIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z"/></svg>`;

export const playIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`;
export const dailyIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14v14H5zM5 10h14M9 3v4M15 3v4M12 12v6M9 15h6"/></svg>`;
export const missionsIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></svg>`;
export const collectionIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12l4 6-10 12L2 9z M2 9h20 M12 21 8 9l4-6 4 6z"/></svg>`;
export const settingsIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`;

export const handIcon = `<svg viewBox="0 0 24 24" fill="rgba(255,255,255,.18)" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11V4.5a1.5 1.5 0 0 1 3 0V10m0-1.5a1.5 1.5 0 0 1 3 0V11m0-1a1.5 1.5 0 0 1 3 0v4.5c0 3.6-2.7 6.5-6.2 6.5h-.6c-2 0-3.5-.9-4.6-2.4L4.4 15a1.6 1.6 0 0 1 2.4-2l2.2 2"/></svg>`;
