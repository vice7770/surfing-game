/** Hand-drawn 24×24 stroke icons for the menus (plan P8), drawn in the text colour. */
const svg = (paths: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const ICONS = {
  surf: svg('<path d="M2 17c2.5 0 3.5-2.5 6-2.5s3.5 2.5 6 2.5 3.5-2.5 6-2.5"/><path d="M4 12.5C5.5 7 10.5 4.5 15 6.5c2.6 1.2 3.4 4 1.8 5.6-1.3 1.3-3.8.8-3.8-1.3"/>'),
  waveLab: svg('<path d="M9 3h6"/><path d="M10 3v6.2L4.6 18.4A1.7 1.7 0 0 0 6.1 21h11.8a1.7 1.7 0 0 0 1.5-2.6L14 9.2V3"/><path d="M7.2 15.5c1.6-.9 3.2.9 4.8 0s3.2-.9 4.8 0"/>'),
  multiplayer: svg('<circle cx="9" cy="8" r="3"/><path d="M3.5 20c0-3.3 2.5-5.8 5.5-5.8s5.5 2.5 5.5 5.8"/><circle cx="17" cy="9" r="2.4"/><path d="M16.2 14.3c2.7.2 4.3 2.3 4.3 5"/>'),
  logbook: svg('<path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v12.5H8.5A3.5 3.5 0 0 1 5 17z"/><path d="M5 17a3.5 3.5 0 0 1 3.5-3.5H19"/><path d="M9 8.5h6"/>'),
  settings: svg('<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>'),
  fullscreen: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  pause: svg('<path d="M9 5v14M15 5v14"/>'),
  back: svg('<path d="M14.5 5.5 8 12l6.5 6.5"/>'),
} as const;

export type IconName = keyof typeof ICONS;
