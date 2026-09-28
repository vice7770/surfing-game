import { seededRandom } from './random';

export type SpotName = 'beach' | 'point' | 'reef' | 'canyon' | 'padang';

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
 * Padang Padang (the Padang Padang spec): a left over a shallow coral shelf on the west coast of Bali's Bukit.
 * The swell arrives in water `deep` deep (the tank's edge, where its linear sea is near-linear) and shoals up a
 * shore-parallel forereef at `foreSlope` (rounded at its top and foot) onto a platform `platformDepth` deep, then climbs a ramp at Mead & Black's
 * orthogonal gradient, inferred from the measured vortex ratios of its tubes (about 1:19; Mead & Black 2001), to a
 * reef flat `crestDepth` deep that nearly dries at the lowest spring tides. The ramp's top edge (the crest line) runs
 * at `angle` degrees to the shoreline from the peak (x = peakX), so each wave breaks there first and peels toward +x
 * (a left) at the platform's celerity over the sine of the crest's angle to the edge (`ledgePeel`). A channel as
 * deep as the platform runs along the window's +x open edge, level across its axis, where the left ends. Upcoast of
 * the peak the crest line eases to run along shore, so the bed is level along shore at the window's −x open edge
 * (an open edge copies its neighbours: a bed sloping across it ran the Reef's Big swell to NaN). A planar beach face
 * caps it all. Sources and provisional values: docs/research/padang-padang-sources.md. Mutable for the design sweep
 * (`scripts/padangShape.ts`).
 */
export const PADANG = {
  deep: 25, foreSlope: 1 / 20, foreRounding: 10, platformDepth: 10, rampSlope: 1 / 19, crestDepth: 1.25, peakX: -50, peakZ: -90, angle: 35,
  levelWidth: 20, channelX: 80, channelHalfWidth: 20, shoreSlope: 0.2, takeOffX: -40,
};

/**
 * Where Padang Padang's forereef tops out onto its platform: its rounding plus 1 m seaward of the ramp's most seaward foot, which is at
 * the peak (the oblique ramp's footprint across shore is its width over cos(angle)), so the bed has no cliff.
 */
export function padangShelfEdge(): number {
  const { peakZ, platformDepth, crestDepth, rampSlope, angle } = PADANG;
  return peakZ - (platformDepth - crestDepth) / rampSlope / Math.cos((angle * Math.PI) / 180) - PADANG.foreRounding - 1;
}

/** The crest line's along-shore coordinate: x past the peak, eased (C¹) into a level strip `levelWidth` wide upcoast of it. */
function padangAlong(x: number): number {
  const { peakX, levelWidth } = PADANG;
  if (x >= peakX) return x;
  const into = Math.max(0, x - (peakX - levelWidth));
  return peakX - levelWidth / 2 + (into * into) / (2 * levelWidth);
}

/** Where Padang Padang's crest line (the top of its ramp) crosses along-shore position x. */
export function padangCrestZ(x: number): number {
  return PADANG.peakZ + (padangAlong(x) - PADANG.peakX) * Math.tan((PADANG.angle * Math.PI) / 180);
}

/** Distance seaward of Padang Padang's crest line, m, measured across it (negative shoreward of it). */
export function padangSeaward(x: number, z: number): number {
  const { peakX, levelWidth, angle } = PADANG;
  // The line's local dz/dx: tan(angle) past the peak, easing to 0 across the level strip.
  const ease = x >= peakX ? 1 : Math.max(0, x - (peakX - levelWidth)) / levelWidth;
  return (padangCrestZ(x) - z) / Math.hypot(1, ease * Math.tan((angle * Math.PI) / 180));
}

/** max(0, d), rounded quadratically (C¹) over ±r: a ramp's knee without a slope break. */
function rounded(d: number, r: number): number {
  if (d <= -r) return 0;
  if (d >= r) return d;
  return ((d + r) * (d + r)) / (4 * r);
}

/** Whether Padang Padang's reef is ridden at along-shore position x: from its peak to where the channel begins (two half-widths from its axis). */
export function padangReefAt(x: number): boolean {
  return x >= PADANG.peakX && x < PADANG.channelX - 2 * PADANG.channelHalfWidth;
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

function padang(): SurfSpot {
  return {
    name: 'padang',
    depthAt(x, z) {
      const p = PADANG;
      // The shore-parallel forereef from deep water up to the platform.
      const shelf = padangShelfEdge();
      // Rounded (C¹) over foreRounding m at its top and its foot, so its slope breaks scatter no spurious harmonics.
      const foot = shelf - (p.deep - p.platformDepth) / p.foreSlope;
      const fore = p.platformDepth + (rounded(shelf - z, p.foreRounding) - rounded(foot - z, p.foreRounding)) * p.foreSlope;
      // The ramp from the reef flat down to the platform, across the crest line, on the forereef's extra depth (the
      // ramp's foot lies shoreward of the forereef's rounded top, so the two never overlap).
      const reef = Math.min(p.platformDepth, p.crestDepth + Math.max(0, padangSeaward(x, z)) * p.rampSlope) + (fore - p.platformDepth);
      // The channel: no reef, the platform and forereef beneath, flat across its axis at the window's edge.
      const channel = Math.exp(-(((x - p.channelX) / p.channelHalfWidth) ** 2));
      const depth = reef + (fore - reef) * channel;
      // A beach face, and dry land shoreward of z = 0.
      return Math.min(depth, z < 0 ? -z * p.shoreSlope : -z * 0.06);
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
    case 'padang': return padang();
  }
}
