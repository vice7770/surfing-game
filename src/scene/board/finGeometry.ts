import type { FinSpec } from '../../physics/finForces';

/** Tip chord as a share of the base chord, and the leading edge's sweep: a typical thruster fin (modelling values). */
const TIP_SHARE = 0.25;
const SWEEP = (35 * Math.PI) / 180;

/**
 * A fin's outline as drawn, as (along the board toward the nose, down from
 * the bottom) points, m: a swept trapezoid as deep as the physics fin, whose
 * base chord makes its area the physics fin's, d(c + 0.25c)/2 = A.
 */
export function finOutline(spec: FinSpec): { points: Array<[number, number]>; area: number } {
  const base = (2 * spec.area) / ((1 + TIP_SHARE) * spec.depth);
  const tip = TIP_SHARE * base;
  const tipLead = base / 2 - spec.depth * Math.tan(SWEEP);
  const points: Array<[number, number]> = [[base / 2, 0], [tipLead, spec.depth], [tipLead - tip, spec.depth], [-base / 2, 0]];
  let twice = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    twice += x0 * y1 - x1 * y0;
  }
  return { points, area: Math.abs(twice) / 2 };
}
