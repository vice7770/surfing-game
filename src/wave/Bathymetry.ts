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
 * The Teahupo'o Reef (the Teahupo'o Reef spec): a left slab. The tank's deep water rises up a
 * 1:2.29 forereef (Rodríguez-Burguette et al. 2025, a model of Teahupo'o's reef) to a shelf
 * about 10 m deep (Shand 2024), where the wave stands up before the reef rises again to its
 * crest, about 1.5 m under the surface (WSL). The ledge rises from the shelf, its foot meeting
 * the shelf's edge at the peak (x = crestX), and runs at `angle` degrees to the shoreline,
 * furthest out toward −x, so each wave breaks there first and peels toward +x (a left) at the
 * shelf's celerity over the sine of the crest's angle to it (`ledgePeel`). A pass runs along the
 * window's +x open edge, level across it like the Canyon's axis, where the left ends. A planar
 * beach face caps it all. Sources and provisional values: docs/research/teahupoo-reef-sources.md.
 * Mutable for the design sweep (`scripts/reefShape.ts`).
 */
export const REEF = {
  deep: 30, foreSlope: 1 / 2.29, shelfEdge: -150, shelfDepth: 10,
  ledgeSlope: 1 / 2.29, crestDepth: 1.5, crestX: -80, crestZ: -120, angle: 45,
  passX: 80, passHalfWidth: 25, passDepth: 12, shoreSlope: 0.2, takeOffX: -50,
};

/** Where the Reef's crest line (the top of its ledge) crosses along-shore position x. */
export function reefCrestZ(x: number): number {
  return REEF.crestZ + (x - REEF.crestX) * Math.tan((REEF.angle * Math.PI) / 180);
}

/** Distance seaward of the Reef's crest line, m, measured across it (negative shoreward of it). */
export function reefSeaward(x: number, z: number): number {
  return (reefCrestZ(x) - z) * Math.cos((REEF.angle * Math.PI) / 180);
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
      const r = REEF;
      // The shore-parallel forereef up to the shelf; on the shelf, the ledge rising from it to the crest.
      // The crest line keeps the ledge's foot shoreward of the shelf's edge (at the peak they meet), so the bed has no cliff.
      const fore = z >= r.shelfEdge ? r.shelfDepth : Math.min(r.deep, r.shelfDepth + (r.shelfEdge - z) * r.foreSlope);
      const ledge = r.crestDepth + Math.max(0, reefSeaward(x, z)) * r.ledgeSlope;
      const onReef = z >= r.shelfEdge ? Math.min(r.shelfDepth, ledge) : fore;
      // The pass: no reef, the shelf deepened to passDepth; flat across its axis at the window's edge.
      const pass = Math.exp(-(((x - r.passX) / r.passHalfWidth) ** 2));
      const depth = onReef + (Math.max(fore, r.passDepth) - onReef) * pass;
      // A 1:5 beach face (steep enough to stay shoreward of the forereef), and dry land shoreward of z = 0.
      return Math.min(depth, z < 0 ? -z * r.shoreSlope : -z * 0.06);
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
