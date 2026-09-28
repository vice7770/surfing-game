import { describe, expect, it } from 'vitest';
import { BEACH_BAR, BEACH_OUTER, CANYON, POINT_HEADLAND, POINT_OUTER, REEF, createSpot, deanDepth, reefCrestZ, reefLedgeAt, smoothstep, type SurfSpot } from './Bathymetry';
import { seededRandom } from './random';
import { breakerDepthFor } from './Breaking';
import { ledgePeel } from './ledgePeel';
import { REEF_SWELLS } from '../game/SurfConditions';
import { ALONG_SHORE } from './SurfZoneSimulation';

/** Offshore bed slope: depth increase per metre toward −z. */
function slopeZ(spot: SurfSpot, x: number, z: number, step = 0.5): number {
  return (spot.depthAt(x, z - step) - spot.depthAt(x, z + step)) / (2 * step);
}

function gradientX(spot: SurfSpot, x: number, z: number, step = 0.5): number {
  return (spot.depthAt(x + step, z) - spot.depthAt(x - step, z)) / (2 * step);
}

describe('surf spot bathymetry', () => {
  it('shapes the beach as a Dean profile with the design slope where a 1.4 m wave breaks', () => {
    const beach = createSpot('beach', 1);
    let ripX = 0;
    let deepest = -Infinity;
    for (let x = -200; x <= 200; x += 1) {
      const depth = beach.depthAt(x, -BEACH_BAR.offshore);
      if (depth > deepest) {
        deepest = depth;
        ripX = x;
      }
    }
    expect(deanDepth(58)).toBeCloseTo(1.8, 1);
    expect(slopeZ(beach, ripX, -58)).toBeCloseTo(0.0207, 3);
  });

  it('builds a sandbar between rip channels that move with the seed', () => {
    const beach = createSpot('beach', 1);
    const other = createSpot('beach', 2);
    const crest = -BEACH_BAR.offshore;
    const depths: number[] = [];
    let seedsDiffer = false;
    for (let x = -200; x <= 200; x += 1) {
      depths.push(beach.depthAt(x, crest));
      if (Math.abs(other.depthAt(x, crest) - beach.depthAt(x, crest)) > 0.3) seedsDiffer = true;
    }
    expect(Math.max(...depths) - Math.min(...depths)).toBeGreaterThan(0.8);
    expect(seedsDiffer).toBe(true);
    expect(createSpot('beach', 1).depthAt(37, crest)).toBe(beach.depthAt(37, crest));
  });

  it('angles the point contours about 31 degrees to the coast on the headland flank', () => {
    const point = createSpot('point', 1);
    const z = -POINT_HEADLAND.protrusion / 2 - 60;
    const angle = (Math.atan2(Math.abs(gradientX(point, 0, z)), Math.abs(slopeZ(point, 0, z))) * 180) / Math.PI;
    expect(angle).toBeGreaterThan(28);
    expect(angle).toBeLessThan(34);
  });

  describe("the Teahupo'o Reef", () => {
    const reef = createSpot('reef', 1);
    // At x = 0 the ledge lies well shoreward of the shelf's edge: shelf, forereef and deep water in turn.
    it('drops from a 10 m shelf down a 1:2.29 forereef to deep water', () => {
      expect(reef.depthAt(0, -120)).toBeCloseTo(REEF.shelfDepth, 3);
      expect(slopeZ(reef, 0, REEF.shelfEdge - 20)).toBeCloseTo(REEF.foreSlope, 9);
      expect(reef.depthAt(0, -260)).toBeCloseTo(REEF.deep, 12);
    });

    it('rises from the shelf to its crest up a ledge running at its angle to the shoreline, furthest out toward −x', () => {
      // At x = −40 the crest lies 80 m out, clear of the beach face.
      const crest = reefCrestZ(-40);
      // The pass's Gaussian adds ~1e-9 m this far from its axis.
      expect(reef.depthAt(-40, crest)).toBeCloseTo(REEF.crestDepth, 6);
      const radians = (REEF.angle * Math.PI) / 180;
      const seaward = { x: Math.sin(radians), z: -Math.cos(radians) };
      const at = (n: number) => reef.depthAt(-40 + n * seaward.x, crest + n * seaward.z);
      expect((at(8) - at(4)) / 4).toBeCloseTo(REEF.ledgeSlope, 6);
      expect((reefCrestZ(-40) - reefCrestZ(-80)) / 40).toBeCloseTo(Math.tan(radians), 12);
      expect(reefCrestZ(-80)).toBeLessThan(reefCrestZ(0));
    });

    it('opens a pass along the window’s +x edge, level across it', () => {
      const edge = ALONG_SHORE / 2;
      expect(REEF.passX).toBe(edge);
      for (let z = -260; z <= -40; z += 20) expect(Math.abs(gradientX(reef, edge, z))).toBeLessThan(1e-3);
      expect(reef.depthAt(edge, -140)).toBeCloseTo(REEF.passDepth, 6);
    });

    it('says where the ledge is ridden: out of the pass, with its crest still under water off the beach', () => {
      expect(reefLedgeAt(-60)).toBe(true);
      expect(reefLedgeAt(0)).toBe(true);
      // The crest meets the 1:9.64 inland slope's 1.5 m depth at z = −14.46, x = 25.5 (Part C); the pass reaches in from x = 30.
      expect(reefLedgeAt(24)).toBe(true);
      expect(reefLedgeAt(27)).toBe(false);
      expect(reefLedgeAt(REEF.passX)).toBe(false);
    });

    it('is reef where the reef builds the bed, and sand in the pass and on the beach', () => {
      expect(reef.materialAt!(-40, reefCrestZ(-40))).toBe('reef');
      expect(reef.materialAt!(0, -120)).toBe('reef'); // the shelf
      expect(reef.materialAt!(0, REEF.shelfEdge - 20)).toBe('reef'); // the forereef
      expect(reef.materialAt!(REEF.passX, -140)).toBe('sand');
      expect(reef.materialAt!(0, -2)).toBe('sand');
      expect(createSpot('beach', 1).materialAt).toBeUndefined();
    });

    it('falls from its crest across a reef flat into a lagoon, then rises to the shore at 1:9.64', () => {
      const x = -60;
      const crest = reefCrestZ(x);
      const radians = (REEF.angle * Math.PI) / 180;
      const shoreward = (d: number) => ({ x: x - d * Math.sin(radians), z: crest + d * Math.cos(radians) });
      const onFlat = shoreward(REEF.flatWidth / 2);
      expect(reef.depthAt(onFlat.x, onFlat.z)).toBeCloseTo(REEF.crestDepth, 6);
      expect(reef.materialAt!(onFlat.x, onFlat.z)).toBe('reef');
      const inLagoon = shoreward(REEF.flatWidth + 20);
      expect(reef.depthAt(inLagoon.x, inLagoon.z)).toBeCloseTo(REEF.lagoonDepth, 3);
      expect(reef.materialAt!(inLagoon.x, inLagoon.z)).toBe('sand');
      // The inland slope: 1:9.64 up to the shoreline at z = 0 (the Teahupo'o model's).
      expect(reef.depthAt(-60, -5)).toBeCloseTo(5 * REEF.inlandSlope, 9);
    });

    it('has no cliff anywhere in the window', () => {
      // The steepest faces are the 1:2.29 forereef and ledge: 0.22 m over half a metre.
      for (let x = -80; x <= 80; x += 2) {
        for (let z = -300; z <= 20; z += 2) {
          expect(Math.abs(reef.depthAt(x, z + 0.5) - reef.depthAt(x, z))).toBeLessThan(0.25);
          expect(Math.abs(reef.depthAt(x + 0.5, z) - reef.depthAt(x, z))).toBeLessThan(0.25);
        }
      }
    });

    it('meets a beach face and dry land shoreward of z = 0', () => {
      for (let x = -80; x <= 80; x += 10) {
        expect(reef.depthAt(x, 5)).toBeLessThan(0);
        expect(reef.depthAt(x, -3)).toBeLessThanOrEqual(3 * REEF.inlandSlope + 1e-12);
      }
    });

    it('is designed to peel fast but makeable on the Small swell (phase matching)', () => {
      const small = REEF_SWELLS.small;
      const peel = ledgePeel({
        period: small.peakPeriod, deepDepth: REEF.deep, shelfDepth: REEF.shelfDepth,
        breakDepth: breakerDepthFor(small.significantHeight, REEF.deep), swellDegrees: small.directionDegrees ?? 0, ledgeDegrees: REEF.angle,
      });
      expect(peel.peelSpeed).toBeGreaterThanOrEqual(10);
      expect(peel.peelSpeed).toBeLessThanOrEqual(13);
    });
  });

  it('cuts a canyon that is far deeper on its axis and fades before the offshore boundary', () => {
    const canyon = createSpot('canyon', 1);
    expect(canyon.depthAt(CANYON.axisX, -200) - canyon.depthAt(CANYON.axisX + 120, -200)).toBeGreaterThan(8);
    expect(Math.abs(canyon.depthAt(CANYON.axisX, -270) - canyon.depthAt(CANYON.axisX + 120, -270))).toBeLessThan(0.05);
  });

  it('runs the canyon along the window\'s open edge, so the bed is level across the boundary', () => {
    // An open edge copies its neighbours: a bed sloping across it drove the edge cells unstable.
    const canyon = createSpot('canyon', 1);
    const edge = ALONG_SHORE / 2;
    for (let z = -260; z <= -40; z += 20) expect(Math.abs(gradientX(canyon, edge, z))).toBeLessThan(1e-3);
    expect(canyon.depthAt(edge, -200) - canyon.depthAt(0, -200)).toBeGreaterThan(8);
  });

  it('puts dry land shoreward of every shoreline and stays finite', () => {
    for (const name of ['beach', 'point', 'reef', 'canyon'] as const) {
      const spot = createSpot(name, 3);
      for (let x = -300; x <= 300; x += 25) {
        expect(spot.depthAt(x, 20)).toBeLessThan(0);
        for (let z = -400; z <= 30; z += 10) expect(Number.isFinite(spot.depthAt(x, z))).toBe(true);
      }
    }
  });
});

/** Today's beds, copied, for the inner zone that must not change (the wave-sizes spec). */
const todayBeach = (seed: number) => {
  const random = seededRandom(seed, 0xbeac4);
  const rips: number[] = [];
  for (let k = -8; k <= 8; k += 1) rips.push(k * BEACH_BAR.ripSpacing + (random() * 2 - 1) * BEACH_BAR.ripJitter);
  return (x: number, z: number) => {
    let gap = 0;
    for (const rip of rips) gap = Math.max(gap, Math.exp(-(((x - rip) / BEACH_BAR.ripWidth) ** 2)));
    return deanDepth(-z) - BEACH_BAR.height * Math.exp(-(((-z - BEACH_BAR.offshore) / BEACH_BAR.width) ** 2)) * (1 - gap);
  };
};
const todayPoint = (x: number, z: number) => {
  const { center, halfWidth, protrusion, slope } = POINT_HEADLAND;
  const offshore = -protrusion * smoothstep(center + halfWidth, center - halfWidth, x) - z;
  return offshore <= 0 ? offshore * 0.06 : Math.min(12, slope * offshore);
};

describe('outer bathymetry (wave sizes)', () => {
  // The Reef is the Teahupo'o Reef rework's (its own tests, above).
  it('leaves the Beach and Point shoreward of −150 m as they were', () => {
    const beach = createSpot('beach', 1);
    const beachToday = todayBeach(1);
    const point = createSpot('point', 1);
    for (let x = -80; x <= 80; x += 8) {
      for (let z = -150; z <= 30; z += 3) {
        expect(point.depthAt(x, z)).toBeCloseTo(todayPoint(x, z), 9);
        // The outer bar's tail reaches the inner zone by under 1 cm.
        expect(Math.abs(beach.depthAt(x, z) - beachToday(x, z))).toBeLessThan(0.01);
      }
      // Today's small-day tank blends the spot's bed in over −270…−190 m: under 2 mm of change in what it sees.
      for (let z = -270; z <= -150; z += 3) {
        expect(Math.abs(beach.depthAt(x, z) - beachToday(x, z)) * smoothstep(-270, -190, z)).toBeLessThan(0.002);
      }
    }
  });

  it('gives the Beach an outer bar and a deepening shelf beyond it', () => {
    const beach = createSpot('beach', 1);
    const crest = beach.depthAt(0, -BEACH_OUTER.barOffshore);
    expect(crest).toBeGreaterThan(3);
    expect(crest).toBeLessThan(8);
    expect(crest).toBeLessThan(beach.depthAt(0, -BEACH_OUTER.barOffshore + 2 * BEACH_OUTER.barWidth));
    expect(crest).toBeLessThan(beach.depthAt(0, -BEACH_OUTER.barOffshore - 2 * BEACH_OUTER.barWidth));
    expect(beach.depthAt(0, -1300)).toBeGreaterThan(13.2);
  });

  it('carries the Point\'s shelf past 12 m on a gentler slope', () => {
    const point = createSpot('point', 1);
    expect(point.depthAt(0, -400)).toBeCloseTo(12 + POINT_OUTER.slope * (-60 - -400 - 12 / POINT_HEADLAND.slope), 6);
    expect(point.depthAt(0, -3000)).toBe(POINT_OUTER.maxDepth);
  });
});
