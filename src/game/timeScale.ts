export const TIME_SCALE_MIN = 0.4;
export const TIME_SCALE_MAX = 1;

/**
 * Convert wall-clock seconds into simulated seconds. Slowing every subsystem by
 * the same factor is Froude-consistent slow motion: g and the fixed physics
 * step are unchanged, so replays stay deterministic.
 */
export function simulatedSeconds(wallSeconds: number, timeScale: number): number {
  const scale = Number.isFinite(timeScale)
    ? Math.min(TIME_SCALE_MAX, Math.max(TIME_SCALE_MIN, timeScale))
    : TIME_SCALE_MAX;
  return Math.max(0, wallSeconds) * scale;
}
