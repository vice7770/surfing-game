/**
 * The Particles setting (graphics): how many of the whitewater's drawn
 * particles the worker keeps, and how wide the largest of them are drawn.
 * Visual only: the water, its foam and air, the lip and the rider never read
 * the particles, which draw from random streams of their own. High is the
 * game as it was.
 */
export type ParticleLevel = 'low' | 'medium' | 'high';

export const PARTICLE_LEVELS: readonly ParticleLevel[] = ['low', 'medium', 'high'];

export interface ParticleBudget {
  /** The share of each source's spray, mist and tube whitewater that is spawned (lip impacts, bores, strokes, feathering, spits, eruptions). */
  spawn: number;
  /** The share of a roller's foam-ball sprites kept (as wide as ever: their overdraw is the cost where they crowd the view). */
  foamBall: number;
  /** The share of the bubbles entrained. */
  bubbles: number;
  /** The share of each pool used: spray and mist, a closing tube's whitewater, the bubbles. */
  pool: number;
  /** Mist sprites are drawn this share of their width (mist is the widest sprite, and its overdraw the cost). */
  mistSize: number;
  /** Spline points the Rich lip sheet draws between its parcels, both ways (the page rebuilds it for every snapshot). */
  lipSubdivisions: number;
}

export const PARTICLE_BUDGETS: Readonly<Record<ParticleLevel, Readonly<ParticleBudget>>> = {
  high: { spawn: 1, foamBall: 1, bubbles: 1, pool: 1, mistSize: 1, lipSubdivisions: 3 },
  medium: { spawn: 0.5, foamBall: 0.5, bubbles: 0.5, pool: 0.5, mistSize: 0.8, lipSubdivisions: 2 },
  low: { spawn: 0.25, foamBall: 0.25, bubbles: 0.25, pool: 0.25, mistSize: 0.6, lipSubdivisions: 1 },
};

/** The budget for a level (High for anything unknown). */
export function particleBudget(level: ParticleLevel): Readonly<ParticleBudget> {
  return PARTICLE_BUDGETS[level] ?? PARTICLE_BUDGETS.high;
}

/** A pool's size at a budget: its share of the whole, in whole particles. */
export function poolSize(capacity: number, budget: Readonly<ParticleBudget>): number {
  return budget.pool === 1 ? capacity : Math.floor(capacity * budget.pool);
}
