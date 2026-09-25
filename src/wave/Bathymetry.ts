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
export const REEF = { edge: -150, apexX: 0, protrusion: 100, halfWidth: 250, edgeWidth: 80, shelfDepth: 2, channelDepth: 10 };
export const CANYON = { axisX: 0, halfWidth: 30, depth: 14, head: 60, fullAt: 160, fadeStart: 260, fadeEnd: 320 };

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
      const edgeZ = REEF.edge - REEF.protrusion * Math.max(0, 1 - Math.abs(x - REEF.apexX) / REEF.halfWidth);
      const beachDepth = deanDepth(-z);
      const onReef = smoothstep(edgeZ - REEF.edgeWidth / 2, edgeZ + REEF.edgeWidth / 2, z);
      const channel = Math.max(beachDepth, REEF.channelDepth);
      const shelf = Math.min(beachDepth, REEF.shelfDepth);
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
