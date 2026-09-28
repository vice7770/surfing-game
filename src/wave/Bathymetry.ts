import { seededRandom } from './random';

export type SpotName = 'beach' | 'point' | 'reef' | 'canyon';

/**
 * Still-water depth below datum, m; negative on dry land. +x runs along shore,
 * +z toward the beach, and z = 0 is the shoreline at x = 0.
 */
/** What a bed is made of, for contact (the Teahupo'o Reef, Part C). */
export type BedMaterial = 'sand' | 'reef';

export interface SurfSpot {
  readonly name: SpotName;
  depthAt(x: number, z: number): number;
  /** What the bed is made of; absent, sand everywhere. */
  materialAt?(x: number, z: number): BedMaterial;
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
 * The Beach's outer bar and shelf (the wave-sizes spec; docs/research/outer-profiles.md): a Gaussian bar 2 m
 * high 450 m out (crest 5 m deep, inside Duck's 300–600 m and 3–8 m), 80 m long so its tail leaves the inner
 * bed alone, on Dean's profile continued to 30 m.
 */
export const BEACH_OUTER = { barOffshore: 450, barHeight: 2, barWidth: 80, maxDepth: 30 };
/** The Point's shelf past its 12 m: a gentler 1:67 slope to 30 m (an assumption; see the research doc). */
export const POINT_OUTER = { slope: 0.015, maxDepth: 30 };
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

/**
 * Whether the Reef's ledge is ridden at along-shore position x: out of the pass (beyond two of its
 * half-widths from its axis) and where the crest still lies seaward of the beach face's crest depth.
 * Past it, waves break on the beach face in the pass and the lagoon: not the Reef's wave.
 */
export function reefLedgeAt(x: number): boolean {
  return x < REEF.passX - 2 * REEF.passHalfWidth && reefCrestZ(x) < -REEF.crestDepth / REEF.shoreSlope;
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
      const outerBar = BEACH_OUTER.barHeight * Math.exp(-(((offshore - BEACH_OUTER.barOffshore) / BEACH_OUTER.barWidth) ** 2));
      return deanDepth(offshore, 0.12, BEACH_OUTER.maxDepth) - bar - outerBar;
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
      if (offshore <= 0) return offshore * 0.06;
      const shelf = maxDepth / slope;
      return offshore <= shelf ? slope * offshore : Math.min(POINT_OUTER.maxDepth, maxDepth + POINT_OUTER.slope * (offshore - shelf));
    },
  };
}

/** The Reef's bed in its parts: the pass's weight, the reef's own depth, and the beach face's. */
function reefTerms(x: number, z: number): { pass: number; onReef: number; fore: number; beachFace: number } {
  const r = REEF;
  // The shore-parallel forereef up to the shelf; on the shelf, the ledge rising from it to the crest.
  // The crest line keeps the ledge's foot shoreward of the shelf's edge (at the peak they meet), so the bed has no cliff.
  const fore = z >= r.shelfEdge ? r.shelfDepth : Math.min(r.deep, r.shelfDepth + (r.shelfEdge - z) * r.foreSlope);
  const ledge = r.crestDepth + Math.max(0, reefSeaward(x, z)) * r.ledgeSlope;
  const onReef = z >= r.shelfEdge ? Math.min(r.shelfDepth, ledge) : fore;
  // The pass: no reef, the shelf deepened to passDepth; flat across its axis at the window's edge.
  const pass = Math.exp(-(((x - r.passX) / r.passHalfWidth) ** 2));
  // A 1:5 beach face (steep enough to stay shoreward of the forereef), and dry land shoreward of z = 0.
  const beachFace = z < 0 ? -z * r.shoreSlope : -z * 0.06;
  return { pass, onReef, fore, beachFace };
}

function reef(): SurfSpot {
  return {
    name: 'reef',
    depthAt(x, z) {
      const { pass, onReef, fore, beachFace } = reefTerms(x, z);
      const depth = onReef + (Math.max(fore, REEF.passDepth) - onReef) * pass;
      return Math.min(depth, beachFace);
    },
    // Rock where the reef builds the bed (Part C): out of the pass, seaward of the beach.
    materialAt(x, z) {
      const { pass, onReef, beachFace } = reefTerms(x, z);
      return pass < 0.5 && onReef < beachFace ? 'reef' : 'sand';
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
