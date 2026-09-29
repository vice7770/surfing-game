import { describe, expect, it } from 'vitest';
import { BEACH_BAR, BEACH_OUTER, CANYON, PADANG, POINT_HEADLAND, POINT_OUTER, REEF, createSpot, deanDepth, padangBaseZ, padangCrestZ, padangForeFootZ, padangKneeZ, padangReefAt, padangSeaward, reefCrestZ, reefLedgeAt, smoothstep, type SurfSpot } from './Bathymetry';
import { seededRandom } from './random';
import { PEEL_SKILL_MINIMUM, breakerDepthFor } from './Breaking';
import { ledgePeel } from './ledgePeel';
import { PADANG_SWELLS, REEF_SWELLS } from '../game/SurfConditions';
import { ALONG_SHORE, OFFSHORE_DEPTH, edgeHeight } from './SurfZoneSimulation';

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

  describe('Padang Padang', () => {
    const padang = createSpot('padang', 1);
    const radians = (PADANG.angle * Math.PI) / 180;
    const edge = PADANG.alongShore / 2;
    // At x = −30 the crest line is past the peak and its fade, oblique, and well clear of the beach face and the channel.
    const x = -30;
    /** The wedge's base at along-shore position x: the most seaward point, walking seaward from the crest, where the bed still follows the wedge. */
    const baseDepth = (px: number): number => {
      let z = padangCrestZ(px);
      const wedge = (zz: number) => PADANG.crestDepth + padangSeaward(px, zz) * PADANG.wedgeSlope;
      while (padang.depthAt(px, z - 0.25) - wedge(z - 0.25) > -1e-6) z -= 0.25;
      return padang.depthAt(px, z);
    };

    it('climbs its wedge to the reef flat, across its crest line', () => {
      const crest = padangCrestZ(x);
      // The channel's Gaussian tail reaches here at 2e-7 m.
      expect(padang.depthAt(x, crest)).toBeCloseTo(PADANG.crestDepth, 6);
      const seaward = { x: Math.sin(radians), z: -Math.cos(radians) };
      const at = (n: number) => padang.depthAt(x + n * seaward.x, crest + n * seaward.z);
      expect((at(30) - at(10)) / 20).toBeCloseTo(PADANG.wedgeSlope, 6);
      expect(padangSeaward(x + 30 * seaward.x, crest + 30 * seaward.z)).toBeCloseTo(30, 9);
      expect(padang.depthAt(x, crest + 10)).toBeCloseTo(PADANG.crestDepth, 6);
    });

    // Mead's components for Padang Padang: ramp, focus, wedge, pinnacle, and no platform (Mead 2000, table 4.1). The tank's
    // sea arrives near-linear in deep water: injected on a 10 m platform, a 16 s swell kept changing shape for 150–200 m.
    it('rises from deep water up a shore-parallel forereef, then Mead’s ramp, to the wedge’s base at the peak', () => {
      const knee = padangKneeZ();
      for (let px = -160; px <= 20; px += 10) {
        expect(slopeZ(padang, px, knee - 2 * PADANG.foreRounding)).toBeCloseTo(PADANG.foreSlope, 9);
        expect(slopeZ(padang, px, (knee + padangBaseZ()) / 2)).toBeCloseTo(PADANG.rampSlope, 5);
        expect(padang.depthAt(px, padangForeFootZ() - PADANG.foreRounding - 1)).toBeCloseTo(PADANG.deep, 9);
      }
      expect(padang.depthAt(PADANG.peakX, padangBaseZ())).toBeCloseTo(PADANG.baseDepth, 6);
    });

    it('runs its crest line at its angle from the peak toward +x, the wedge fading out upcoast to the bare ramp at the −x open edge', () => {
      expect((padangCrestZ(0) - padangCrestZ(-40)) / 40).toBeCloseTo(Math.tan(radians), 12);
      const bare = PADANG.peakX - PADANG.endWidth;
      const knee = padangKneeZ();
      for (let z = -600; z <= -20; z += 10) {
        // The bare ramp, level along shore (an open edge copies its neighbours).
        expect(padang.depthAt(bare - 1, z)).toBeCloseTo(PADANG.kneeDepth - (z - knee) * PADANG.rampSlope, 6);
        expect(Math.abs(gradientX(padang, -edge + 1, z))).toBeLessThan(1e-9);
      }
    });

    // Mead & Black's idealised Bingin (1999; Mead 2000, ch. 5): with no platform, a wedge whose base shoals to breaking lets
    // the waves break on the ramp ahead of it, a close-out. The Small swell's sets must meet the wedge first all along the ride.
    it('keeps its wedge’s base deeper than the Small swell breaks along the whole ride', () => {
      const small = PADANG_SWELLS.small;
      const config = { spot: 'padang' as const, seed: 1, significantHeight: small.significantHeight, peakPeriod: small.peakPeriod, directionDegrees: 0, spreading: 24, tide: 0 };
      const breakDepth = breakerDepthFor(edgeHeight(config), OFFSHORE_DEPTH.padang);
      expect(baseDepth(PADANG.peakX)).toBeCloseTo(PADANG.baseDepth, 1);
      for (let px = PADANG.peakX; padangReefAt(px); px += 10) expect(baseDepth(px), `x ${px}`).toBeGreaterThan(breakDepth);
    });

    it('opens a channel along the window’s +x edge, level across it and as deep as the knee', () => {
      expect(PADANG.channelX).toBe(edge);
      for (let z = -600; z <= -40; z += 20) expect(Math.abs(gradientX(padang, edge, z))).toBeLessThan(1e-3);
      expect(padang.depthAt(edge, -150)).toBeCloseTo(PADANG.kneeDepth, 6);
      expect(padang.depthAt(edge, padangForeFootZ() - 100)).toBeCloseTo(PADANG.deep, 6);
    });

    it('rides its reef from the peak to the channel, 50–150 m', () => {
      expect(padangReefAt(PADANG.peakX)).toBe(true);
      expect(padangReefAt(PADANG.peakX - 1)).toBe(false);
      expect(padangReefAt(PADANG.channelX - 2 * PADANG.channelHalfWidth)).toBe(false);
      const ride = PADANG.channelX - 2 * PADANG.channelHalfWidth - PADANG.peakX;
      expect(ride).toBeGreaterThanOrEqual(50);
      expect(ride).toBeLessThanOrEqual(150);
    });

    it('is reef where the reef builds the bed, and sand in the channel and on the beach', () => {
      expect(padang.materialAt!(0, padangCrestZ(0))).toBe('reef');
      expect(padang.materialAt!(0, padangCrestZ(0) + 10)).toBe('reef'); // the reef flat
      expect(padang.materialAt!(0, padangKneeZ() - 20)).toBe('reef'); // the forereef
      expect(padang.materialAt!(PADANG.channelX, -150)).toBe('sand');
      expect(padang.materialAt!(0, -2)).toBe('sand'); // the beach face
    });

    it('has no cliff anywhere in the window', () => {
      for (let px = -edge; px <= edge; px += 4) {
        for (let z = padangForeFootZ() - 40; z <= 20; z += 2) {
          expect(Math.abs(padang.depthAt(px, z + 0.5) - padang.depthAt(px, z))).toBeLessThan(0.25);
          expect(Math.abs(padang.depthAt(px + 0.5, z) - padang.depthAt(px, z))).toBeLessThan(0.25);
        }
      }
    });

    it('meets a beach face and dry land shoreward of z = 0, with the crest line seaward of the face', () => {
      for (let px = -edge; px <= edge; px += 10) {
        expect(padang.depthAt(px, 5)).toBeLessThan(0);
        expect(padang.depthAt(px, -3)).toBeLessThanOrEqual(3 * PADANG.shoreSlope + 1e-12);
        if (padangReefAt(px)) expect(padangCrestZ(px)).toBeLessThan(-PADANG.crestDepth / PADANG.shoreSlope);
      }
    });

    // The skill ladder's angles are geometric, measured on aerial photos (Hutt 1997, via Mead 2000 ch. 6), so α wants the crest's
    // real speed at breaking: linear theory underestimates it in the surf zone, increasingly with H/h (Tissier et al. 2013,
    // GLOBEX), by about 1.2–1.27 at H/h 0.6–0.8 (the advisor's ruling, inferred); the lower bound keeps the check conservative.
    // Padang Padang is Mead's "very fast": the lower half of 30–40° at its peak (the advisor's target).
    it('is designed to peel very fast but makeable on the Small swell at its peak (phase matching)', () => {
      const small = PADANG_SWELLS.small;
      const config = { spot: 'padang' as const, seed: 1, significantHeight: small.significantHeight, peakPeriod: small.peakPeriod, directionDegrees: 0, spreading: 24, tide: 0 };
      const breakDepth = breakerDepthFor(edgeHeight(config), OFFSHORE_DEPTH.padang);
      const peel = (ratio: number) => ledgePeel({
        period: small.peakPeriod, deepDepth: OFFSHORE_DEPTH.padang, shelfDepth: PADANG.baseDepth, breakDepth,
        swellDegrees: small.directionDegrees ?? 0, ledgeDegrees: PADANG.angle, breakerCelerity: ratio * Math.sqrt(9.81 * breakDepth),
      }).angleDegrees;
      expect(peel(1.2)).toBeGreaterThanOrEqual(30);
      expect(peel(1.27)).toBeLessThanOrEqual(40);
      expect(peel(1.2)).toBeGreaterThanOrEqual(PEEL_SKILL_MINIMUM.professional);
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
    for (const name of ['beach', 'point', 'reef', 'canyon', 'padang'] as const) {
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
