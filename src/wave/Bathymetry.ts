import { seededRandom } from './random';

export type SpotName = 'beach' | 'point' | 'reef' | 'canyon';

/**
 * Still-water depth below datum, m; negative on dry land. +x runs along shore,
 * +z toward the beach, and z = 0 is the shoreline at x = 0.
 */
export interface SurfSpot {
  readonly name: SpotName;
  depthAt(x: number, z: number): number;
}

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Dean (1991) equilibrium profile h = A s^(2/3) at offshore distance s, capped, with a planar foreshore on land. */
export function deanDepth(offshore: number, a = 0.12, maxDepth = 12, landSlope = 0.06): number {
  if (offshore <= 0) return offshore * landSlope;
  return Math.min(maxDepth, a * Math.pow(offshore, 2 / 3));
}

export const BEACH_BAR = { offshore: 90, height: 0.9, width: 18, ripSpacing: 110, ripWidth: 22, ripJitter: 25 };
export const POINT_HEADLAND = { center: 0, halfWidth: 150, protrusion: 120, slope: 0.04, maxDepth: 12 };
/**
 * A-frame reef: a 10 m channel, a 0.15 shelf edge (edgeWidth sets the slope)
 * and a 1 m shelf, shallow enough that waves break on the edge as plunging
 * jets rather than crossing it to spill on the shelf (plan P7: 769 jets a
 * minute against 307 with a 2 m shelf). The edge's two arms run from the apex at `obliquity`
 * degrees to the shoreline, out to `halfWidth` either side. The whole edge
 * lies in the tank's 1 m surf zone (z ≥ −150) across the 160 m window, so a
 * steep coarse-sand beach (Dean A 0.3) backs the shelf to leave room for it.
 */
export const REEF = {
  edge: -55, apexX: 0, obliquity: 21.8, halfWidth: 125, edgeWidth: 80, shelfDepth: 1, channelDepth: 10, beachA: 0.3,
  /** 2: the A-frame; 1: a single arm, one oblique edge crossing x = apexX at edgeMid, so the reef peels one way. */
  arms: 2, edgeMid: -90,
};

/**
 * Where the reef's shelf edge crosses along-shore position `x`. Two arms: an
 * A-frame, furthest out at the apex and back to `edge` beyond the arms. One
 * arm: a straight edge at `obliquity` to the shoreline through (apexX, edgeMid),
 * further out toward −x.
 */
export function reefEdgeZ(x: number): number {
  const slope = Math.tan((REEF.obliquity * Math.PI) / 180);
  if (REEF.arms === 1) return REEF.edgeMid - (x - REEF.apexX) * slope;
  const reach = Math.max(0, REEF.halfWidth - Math.abs(x - REEF.apexX));
  return REEF.edge - reach * slope;
}
/**
 * A canyon cut through the shelf. It bends the swell off its axis, leaving a
 * shadow over it, and gathers it on its flank: 60–130 m from the axis at the
 * break line, by the swell's direction and period. The axis runs along the
 * window's open edge (x = 80, half the 160 m window), so the window holds the
 * focusing flank and the bed is level across the boundary. On the centreline
 * the focus fell on the open edges and the break line was all shadow; with a
 * canyon wall crossing an edge, the edge cells ran unstable until the
 * dispersive terms carried the surface's curvature across open edges.
 */
export const CANYON = { axisX: 80, halfWidth: 30, depth: 14, head: 60, fullAt: 160, fadeStart: 200, fadeEnd: 250 };

function beach(seed: number): SurfSpot {
  const random = seededRandom(seed, 0xbeac4);
  const rips: number[] = [];
  for (let k = -8; k <= 8; k += 1) rips.push(k * BEACH_BAR.ripSpacing + (random() * 2 - 1) * BEACH_BAR.ripJitter);
  return {
    name: 'beach',
    depthAt(x, z) {
      const offshore = -z;
      let gap = 0;
      for (const rip of rips) gap = Math.max(gap, Math.exp(-(((x - rip) / BEACH_BAR.ripWidth) ** 2)));
      const bar = BEACH_BAR.height * Math.exp(-(((offshore - BEACH_BAR.offshore) / BEACH_BAR.width) ** 2)) * (1 - gap);
      return deanDepth(offshore) - bar;
    },
  };
}

function point(): SurfSpot {
  const { center, halfWidth, protrusion, slope, maxDepth } = POINT_HEADLAND;
  return {
    name: 'point',
    depthAt(x, z) {
      // The shoreline steps offshore across the headland; its flank sets the contour angle.
      const shoreline = -protrusion * smoothstep(center + halfWidth, center - halfWidth, x);
      const offshore = shoreline - z;
      return offshore <= 0 ? offshore * 0.06 : Math.min(maxDepth, slope * offshore);
    },
  };
}

function reef(): SurfSpot {
  return {
    name: 'reef',
    depthAt(x, z) {
      const edgeZ = reefEdgeZ(x);
      const onReef = smoothstep(edgeZ - REEF.edgeWidth / 2, edgeZ + REEF.edgeWidth / 2, z);
      const channel = Math.max(deanDepth(-z), REEF.channelDepth);
      const shelf = Math.min(deanDepth(-z, REEF.beachA), REEF.shelfDepth);
      return channel + (shelf - channel) * onReef;
    },
  };
}

function canyon(): SurfSpot {
  return {
    name: 'canyon',
    depthAt(x, z) {
      const offshore = -z;
      const along = smoothstep(CANYON.head, CANYON.fullAt, offshore) * (1 - smoothstep(CANYON.fadeStart, CANYON.fadeEnd, offshore));
      return deanDepth(offshore) + CANYON.depth * Math.exp(-(((x - CANYON.axisX) / CANYON.halfWidth) ** 2)) * along;
    },
  };
}

export function createSpot(name: SpotName, seed: number): SurfSpot {
  switch (name) {
    case 'beach': return beach(seed);
    case 'point': return point();
    case 'reef': return reef();
    case 'canyon': return canyon();
  }
}
