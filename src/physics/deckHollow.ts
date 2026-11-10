/**
 * The hollow over a banked planing deck (deck-hollow, 2026-11-10; opt-in, `BoardBodyOptions.deckHollow`, the
 * `?deckHollow=on` dev switch). The cause: a loaded board banked in a turn runs with its low rail and part of its deck
 * below the surface around it, but the water does not lie on that deck. The flow leaves the low rail and an air-open
 * hollow stands over the deck behind the point where the rail went under, until the water falls back in. So what
 * stands in the hollow (the deck's own skin, an upright rider's legs) is dry down to the deck, for a time.
 *
 * The rule is the water-physics advisor's, provisional (docs/research/water-physics/consult-log.md, the row of
 * 2026-11-10, "the hollow over a banked planing deck"), and its three numbers are that row's:
 * - a station `distance` behind where the low rail goes under has been open for t = distance / speed, `speed` the
 *   water's along the board;
 * - the hollow seals T = `seal`·√(depth / g) after it opens, `depth` the deck's depth under the surface sampled there
 *   (impact-to-seal time of a cavity, independent of speed: Bergmann et al. 2009 measured 2.49, Glasheen & McMahon
 *   1996 as quoted there about 2.3);
 * - the wet share goes 0 → 1 by smoothstep from `closing`·T to T (the ramp's form is the advisor's inference);
 * - below a depth Froude number speed / √(g·depth) of `planing` the board is off the plane and nothing separates: wet.
 */
export const HOLLOW = { seal: 2.3, closing: 0.6, planing: 1.5 } as const;

const GRAVITY = 9.81;

/**
 * The wet share, 0–1, of what stands in the hollow over the deck: 0 open (dry between the surface line and the deck),
 * 1 as if the surface lay flat over it. `distance` m behind the low rail's entry, `speed` m/s of the water along the
 * board, `depth` m of the deck under the sampled surface, and `foam`, the share of broken water there (0–1): a
 * turbulent bore has no clean separation, so the hollow fades out with it.
 */
export function hollowWetShare(distance: number, speed: number, depth: number, foam = 0): number {
  if (!(depth > 0)) return 1;
  if (!(speed >= HOLLOW.planing * Math.sqrt(GRAVITY * depth))) return 1;
  const age = Math.max(0, distance) / speed / (HOLLOW.seal * Math.sqrt(depth / GRAVITY));
  const x = Math.min(1, Math.max(0, (age - HOLLOW.closing) / (1 - HOLLOW.closing)));
  const sealed = x * x * (3 - 2 * x);
  return sealed + (1 - sealed) * Math.min(1, Math.max(0, foam));
}

/**
 * How far a rail's deck edge lies under the surface, m (negative: above it), from the depths of the two deck patches
 * nearest it across the board, `outer` and `inner`, evenly spaced: the edge is half a spacing past the outer one.
 */
export function railDepth(outer: number, inner: number): number {
  return Number.isFinite(outer) && Number.isFinite(inner) ? outer + (outer - inner) / 2 : outer;
}
