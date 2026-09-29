import type { FrontPoint } from './BreakingFront';
import { ONSET } from './crestOnset';

/**
 * The slice clock's constants: the end taper, m (slices appear and vanish at τ = 0 over a front's last metres,
 * swept-barrel-build.md), and the furthest ahead of its throw a slice's clock reads, s (provisional).
 */
export const CLOCK = { endTaper: 3, preThrow: 1 } as const;

/**
 * Advances every front point's clock by `dt` s (swept-barrel-build.md, "Smooth clock"; Mihalef et al. 2004).
 *
 * - A point's clock starts when its B first reaches the throw: τ = 0, then τ += dt each step.
 * - Before that, τ = −(throw − B) ÷ B's rise per s, in [−preThrow, 0], and −preThrow where B is not rising.
 * - The soft update: a front's clocks (in σ order) are swept forward, then back, each raised to at least its
 *   neighbour's less `gradient` s per metre between them. A throw thus spreads along the crest no slower than
 *   1/gradient m/s, neighbours never differ by more than `gradient` s per metre (no teeth), and no clock ever runs
 *   back, so no lip retracts. A point raised to τ ≥ 0 has thrown.
 * - What is drawn, `sliceTau`, tapers to 0 over `CLOCK.endTaper` m at each end of a front; the clock runs on.
 *
 * Only + − × ÷ and integer loops, for online determinism.
 */
export function advanceClocks(points: FrontPoint[], dt: number, gradient: number): void {
  const threshold = ONSET.throw * ONSET.depthAveraged;
  for (const point of points) {
    if (point.thrown) {
      point.tau += dt;
    } else if (point.b >= threshold) {
      point.thrown = true;
      point.tau = 0;
    } else {
      point.tau = point.bRate > 0 ? Math.max(-CLOCK.preThrow, -(threshold - point.b) / point.bRate) : -CLOCK.preThrow;
    }
  }
  let start = 0;
  while (start < points.length) {
    let end = start + 1;
    while (end < points.length && points[end].front === points[start].front) end += 1;
    for (let k = start + 1; k < end; k += 1) raise(points[k], points[k - 1], gradient);
    for (let k = end - 2; k >= start; k -= 1) raise(points[k], points[k + 1], gradient);
    const first = points[start].sigma;
    const last = points[end - 1].sigma;
    for (let k = start; k < end; k += 1) {
      const point = points[k];
      const fromEnd = Math.min(point.sigma - first, last - point.sigma);
      point.sliceTau = fromEnd < CLOCK.endTaper ? (point.tau * fromEnd) / CLOCK.endTaper : point.tau;
    }
    start = end;
  }
}

/** Raises `point`'s clock to at least its neighbour's less `gradient` s per metre between them. */
function raise(point: FrontPoint, neighbour: FrontPoint, gradient: number): void {
  const floor = neighbour.tau - gradient * Math.abs(point.sigma - neighbour.sigma);
  if (point.tau >= floor) return;
  point.tau = floor;
  if (floor >= 0) point.thrown = true;
}
