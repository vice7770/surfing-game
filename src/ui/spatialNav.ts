export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** How much a sideways offset counts against a candidate, relative to distance along the move. */
const ACROSS_WEIGHT = 2;

/**
 * The item a keyboard arrow or D-pad press moves focus to (plan P8): among those
 * whose centre lies beyond the current one in that direction, the nearest along
 * the move, with sideways offset counted double. Stays put when there is none.
 */
export function spatialNext(rects: readonly Rect[], current: number, direction: Direction): number {
  const from = rects[current];
  if (!from) return current;
  const cx = from.x + from.width / 2;
  const cy = from.y + from.height / 2;
  let best = current;
  let bestScore = Infinity;
  rects.forEach((rect, index) => {
    if (index === current) return;
    const dx = rect.x + rect.width / 2 - cx;
    const dy = rect.y + rect.height / 2 - cy;
    const along = direction === 'left' ? -dx : direction === 'right' ? dx : direction === 'up' ? -dy : dy;
    const across = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx);
    if (along <= 0.5) return;
    const score = along + ACROSS_WEIGHT * across;
    if (score < bestScore) {
      bestScore = score;
      best = index;
    }
  });
  return best;
}
