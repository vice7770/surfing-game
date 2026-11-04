import { describe, expect, it } from 'vitest';
import { BEACH_BAR, BEACH_OUTER, CANYON, CANYON_B, CANYON_BEACH, CANYON_HALF_RAMP, PADANG, canyonBankEdge, canyonBankEdgeZ, canyonBankFaceShare, canyonBankJoin, canyonShape, canyonArmAt, canyonPeelAt, canyonArmEndX, canyonBarAt, canyonBarDepth, canyonBars, canyonBreakLineZ, canyonFloorDepth, canyonFootZ, canyonJoin, canyonOnset, canyonReefEndX, canyonReefSpan, canyonSandDepth, POINT_HEADLAND, POINT_OUTER, REEF, createSpot, deanDepth, padangBaseZ, padangCrestZ, padangFocusShape, padangForeFootZ, padangKneeZ, padangReefAt, padangSeaward, reefCrestZ, reefLedgeAt, smoothstep, type SurfSpot } from './Bathymetry';
import { seededRandom } from './random';
import { PEEL_SKILL_MINIMUM, breakerDepthFor } from './Breaking';
import { ledgePeel } from './ledgePeel';
import { PADANG_SWELLS, REEF_SWELLS } from '../game/SurfConditions';
import { ALONG_SHORE, OFFSHORE_DEPTH, edgeHeight } from './SurfZoneSimulation';
import { OPEN_EDGE_RAMP } from './ShallowWaterSolver';

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
      // Square to the beach since 2026-10-05 (docs/research/crest-angle-2026-10-05.md): 13.6 m/s, against 11.4 m/s from 20°.
      const small = REEF_SWELLS.small;
      const peel = ledgePeel({
        period: small.peakPeriod, deepDepth: REEF.deep, shelfDepth: REEF.shelfDepth,
        breakDepth: breakerDepthFor(small.significantHeight, REEF.deep), swellDegrees: small.directionDegrees ?? 0, ledgeDegrees: REEF.angle,
      });
      expect(peel.peelSpeed).toBeGreaterThanOrEqual(10);
      expect(peel.peelSpeed).toBeLessThanOrEqual(14);
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

    // Mead & Black's orthogonal gradient is along the wave's path (1:18–1:20, inferred from Padang Padang's measured vortex
    // ratios; Mead & Black 2001), not across the 40° crest line: the owner's decision, 2026-09-29.
    it('climbs its wedge at Mead & Black’s 1:18–1:20 along the swell’s path, square to the tank', () => {
      const along = slopeZ(padang, x, padangCrestZ(x) - 30);
      expect(along).toBeGreaterThanOrEqual(1 / 20);
      expect(along).toBeLessThanOrEqual(1 / 18);
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
      // The wedge's base at the peak, beneath the focus's crest.
      expect(padang.depthAt(PADANG.peakX, padangBaseZ()) + PADANG.focusRelief).toBeCloseTo(PADANG.baseDepth, 6);
    });

    it('runs its crest line at its angle from the peak toward +x, the wedge fading out upcoast to the bare ramp at the −x open edge', () => {
      expect((padangCrestZ(0) - padangCrestZ(-40)) / 40).toBeCloseTo(Math.tan(radians), 12);
      // Past the wedge's fade and the focus's flank.
      const bare = Math.min(PADANG.peakX - PADANG.endWidth, PADANG.peakX - PADANG.focusHalfWidth);
      expect(bare).toBeGreaterThan(-edge);
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
      const relief = PADANG.focusRelief;
      PADANG.focusRelief = 0; // the wedge's own base; the focus below
      try {
      const small = PADANG_SWELLS.small;
      const config = { spot: 'padang' as const, seed: 1, significantHeight: small.significantHeight, peakPeriod: small.peakPeriod, directionDegrees: 0, spreading: 24, tide: 0 };
      const breakDepth = breakerDepthFor(edgeHeight(config), OFFSHORE_DEPTH.padang);
      expect(baseDepth(PADANG.peakX)).toBeCloseTo(PADANG.baseDepth, 1);
      for (let px = PADANG.peakX; padangReefAt(px); px += 10) expect(baseDepth(px), `x ${px}`).toBeGreaterThan(breakDepth);
      } finally {
        PADANG.focusRelief = relief;
      }
    });

    // Mead's focus "breaks earlier than any other part of the wave" (Mead 2000): a spur on the swell's line through the peak.
    it('raises a focus on the swell’s line through its peak, highest at the wedge’s base, tapering to nothing seaward, up the wedge and to the sides', () => {
      const base = padangBaseZ();
      const shape = (px: number, z: number) => padangFocusShape(px, z);
      expect(shape(PADANG.peakX, base)).toBe(1);
      expect(padang.depthAt(PADANG.peakX, base)).toBeCloseTo(PADANG.baseDepth - PADANG.focusRelief, 6);
      expect(shape(PADANG.peakX, base - PADANG.focusLength)).toBe(0);
      expect(shape(PADANG.peakX, base + PADANG.focusInset)).toBe(0);
      expect(shape(PADANG.peakX + PADANG.focusHalfWidth, base)).toBe(0);
      expect(shape(PADANG.peakX - PADANG.focusHalfWidth, base)).toBe(0);
      // Its crest deepens seaward at 1:20–1:40 over its seaward half (Mead's focus gradients are 1:10–1:80).
      const crest = (u: number) => padang.depthAt(PADANG.peakX, base - u);
      const gradient = (crest(PADANG.focusLength / 2) - crest(0)) / (PADANG.focusLength / 2);
      expect(gradient).toBeGreaterThanOrEqual(1 / 40);
      expect(gradient).toBeLessThanOrEqual(1 / 20);
      // Deeper than the Small swell breaks where it meets the wedge's base, so the peak breaks on the wedge, first.
      const small = PADANG_SWELLS.small;
      const config = { spot: 'padang' as const, seed: 1, significantHeight: small.significantHeight, peakPeriod: small.peakPeriod, directionDegrees: 0, spreading: 24, tide: 0 };
      expect(crest(0)).toBeGreaterThan(breakerDepthFor(edgeHeight(config), OFFSHORE_DEPTH.padang));
    });

    it('opens a channel along the window’s +x edge, level across it, as deep as the knee inshore of its line', () => {
      expect(PADANG.channelX).toBe(edge);
      for (let z = -600; z <= -40; z += 20) expect(Math.abs(gradientX(padang, edge, z))).toBeLessThan(1e-3);
      expect(padang.depthAt(edge, PADANG.channelFrom + 40)).toBeCloseTo(PADANG.kneeDepth, 6);
      // Seaward of the line, the bare ramp: the crests cross it as they do along the reef.
      const seaward = PADANG.channelFrom - 40;
      expect(padang.depthAt(edge, seaward)).toBeCloseTo(PADANG.kneeDepth - (seaward - padangKneeZ()) * PADANG.rampSlope, 6);
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
      // The calibrated Small swell (1.2 m, the size report) breaks shallower than the design's 1.6 m, so its crests run
      // slower and the same peel reads faster: 29–31° geometric, at the ladder's fast end but makeable.
      expect(peel(1.27)).toBeLessThanOrEqual(40);
      expect(peel(1.2)).toBeGreaterThanOrEqual(PEEL_SKILL_MINIMUM.professional);
      expect(peel(1.27)).toBeGreaterThanOrEqual(30);
    });
  });

  // The straight-crest bed (the owner, 2026-10-06): no canyon, so nothing seaward of the arm turns the crests. Its own
  // window since canyon-layout (2026-10-22: 220 m, 240 m since canyon-long-wave, 260 m since canyon-wave-r2; ALONG_SHORE's
  // 160 m before).
  // The reef's layout (version A) is the `?canyonBed=old` dev switch's since canyon-b (2026-11-01).
  const A = CANYON_BEACH;
  it('keeps the Canyon level along shore seaward of its arm, with no canyon, and level across both open edges', () => {
    const canyon = createSpot('canyon', 1, { canyonBed: 'old' });
    const edge = A.alongShore / 2;
    // Seaward of the arm's furthest foot, at the bottom of its end just upcoast of the peak, the bed is the plain shelf
    // everywhere along shore.
    // Since canyon-beach-break the beach peaks' bars climb from the platform too: seaward of the furthest of their feet
    // (where the gentlest bar is the platform's depth) the bed is the plain platform as well.
    const foot = Math.min(canyonFootZ(A), ...canyonBars(A).map((bar) => bar.crestZ - (A.shelfDepth - bar.crestDepth) / bar.slope));
    for (let x = -edge; x <= edge; x += 5) {
      for (let z = foot - 1; z >= A.zoneInner + A.blendLength; z -= 10) expect(canyon.depthAt(x, z)).toBe(A.shelfDepth);
    }
    // An open edge copies its neighbours: a bed sloping across it drove the edge cells unstable.
    for (let z = -400; z <= -10; z += 10) {
      expect(Math.abs(gradientX(canyon, -edge, z))).toBeLessThan(1e-3);
      expect(Math.abs(gradientX(canyon, edge, z))).toBeLessThan(1e-3);
    }
  });

  it('lays the Canyon\'s arm obliquely from its peak toward +x and the beach, a planar face running into the beach face, plunging its sets', () => {
    const canyon = createSpot('canyon', 1, { canyonBed: 'old' });
    // The break line runs from its peak toward +x and the beach at the design angle, until it meets the beach face.
    expect(canyonBreakLineZ(A.peakX + 20, A) - canyonBreakLineZ(A.peakX, A)).toBeCloseTo(20 * Math.tan((A.angle * Math.PI) / 180), 6);
    // A short reef near a visible beach (canyon-layout, 2026-10-22; the advisor's design C with a 1:15 beach): the peak
    // 120 m from the waterline, the line 35–40 m along shore to its end on the beach face (about 110 m along it). Since
    // canyon-long-wave (2026-10-22) the face runs on past the line's end until its foot meets the beach face's (`runOn`),
    // 50–55 m downcoast of the peak, so the waves' break runs down the arm into the beach face; the footprint, from the
    // upcoast end to the end of the taper, leaves open water either side clear of each edge's levelling, 50 m and more
    // (82–93 m to the window's sides since canyon-wave-r2; in the 220 m and 240 m windows, 67–83 m, the crests wrapping
    // round the upcoast end came back from the −x side's mirror as a chevron inshore).
    const armEnd = canyonArmEndX(A);
    const reefEnd = canyonReefEndX(A);
    const upcoastEnd = A.peakX - (A.shelfDepth - A.crestDepth) / A.endSlope;
    expect(-A.peakZ).toBe(120);
    expect(armEnd - A.peakX).toBeGreaterThan(35);
    expect(armEnd - A.peakX).toBeLessThan(40);
    expect(Math.hypot(armEnd - A.peakX, canyonBreakLineZ(armEnd, A) - A.peakZ)).toBeLessThan(115);
    expect(reefEnd - A.peakX).toBeGreaterThan(50);
    expect(reefEnd - A.peakX).toBeLessThan(55);
    expect(upcoastEnd).toBeGreaterThan(-A.alongShore / 2 + OPEN_EDGE_RAMP + 60);
    expect(reefEnd + A.endTaper).toBeLessThan(A.alongShore / 2 - OPEN_EDGE_RAMP - 50);
    // One planar face (`fan` 0): along the arm, from the take-off to the beach face, the face climbs at pathSlope along
    // the waves' path (+z) from the shelf to the crest line, and behind the line the terrace's top is crestDepth deep.
    expect(A.fan).toBe(0);
    for (const x of [A.reefTakeOffX, -2, 6]) {
      const zLine = canyonBreakLineZ(x, A);
      expect(canyon.depthAt(x, zLine + 2)).toBeCloseTo(A.crestDepth, 6);
      // Behind the line the top is level for flatWidth, then falls at pathSlope to the trough, which the beach face closes.
      expect(canyon.depthAt(x, zLine + A.flatWidth - 1)).toBeCloseTo(A.crestDepth, 6);
      // Down the arm the 1:15 beach face closes the trough before it is 2 m deep: from 8 m downcoast of the take-off on.
      const trough = zLine + A.flatWidth + (A.lagoonDepth - A.crestDepth) / A.pathSlope + 1;
      if (x <= -2) {
        expect(-trough * A.shoreSlope).toBeGreaterThan(A.lagoonDepth);
        expect(canyon.depthAt(x, trough)).toBeCloseTo(A.lagoonDepth, 6);
      } else {
        expect(canyon.depthAt(x, trough)).toBeCloseTo(-trough * A.shoreSlope, 6);
      }
      const foot = zLine - (A.shelfDepth - A.crestDepth) / A.pathSlope;
      expect(canyon.depthAt(x, foot - 2)).toBeCloseTo(A.shelfDepth, 6);
      for (const [a, b] of [[zLine - 10, zLine - 2], [foot + 10, foot + 30], [zLine - 60, zLine - 40]]) {
        expect((canyon.depthAt(x, a) - canyon.depthAt(x, b)) / (b - a)).toBeCloseTo(A.pathSlope, 9);
      }
    }
    // Past the line's end on the beach face the face runs on (`runOn`): seaward of the beach face's own contour the reef
    // makes the bed, and its breaks count toward the peel; nearer the beach the beach face is shallower, and its shore
    // break does not count. Past the taper, plain beach face.
    const runOnX = (armEnd + reefEnd) / 2;
    expect(canyon.depthAt(runOnX, -70)).toBeCloseTo(A.crestDepth + (canyonBreakLineZ(runOnX, A) + 70) * A.pathSlope, 9);
    expect(canyon.depthAt(runOnX, -70)).toBeLessThan(70 * A.shoreSlope - 0.2);
    expect(canyonPeelAt(runOnX, -70, A)).toBe(true);
    expect(canyon.depthAt(runOnX, -25)).toBeCloseTo(25 * A.shoreSlope, 9);
    expect(canyonPeelAt(runOnX, -25, A)).toBe(false);
    for (let z = -200; z <= -5; z += 5) {
      const x = reefEnd + A.endTaper + 1;
      expect(canyon.depthAt(x, z)).toBeCloseTo(Math.min(canyonFloorDepth(x, z, A), -z * A.shoreSlope), 9);
    }
    // The reef bed (2026-10-22, docs/research/canyon-reef-bed-2026-10-22): the waves breaking on the 1:23 face plunge
    // weakly, as the owner's reference reel (the advisor: ξb about 0.42–0.55). ξb = slope / √(Hb / L0) with the advisor's
    // Hb = 0.78 h: Big's and Medium's sets, 3.3–3.7 m and 2.2–2.3 m deep by the peak, and Big's median wave at 2.2 m. On
    // the planar face (canyon-long-wave) Small's sets, about 1.8 m deep, plunge weakly too (they spilled on the fan, ξb
    // under 0.3 at 1.3 m on its 1:45 shallow face).
    const iribarren = (slope: number, depth: number, period: number) => slope / Math.sqrt((0.78 * depth) / ((9.81 * period ** 2) / (2 * Math.PI)));
    for (const [depth, period] of [[3.5, 14], [2.25, 11], [A.hingeDepth, 14], [1.8, 9]]) {
      expect(iribarren(A.pathSlope, depth, period)).toBeGreaterThanOrEqual(0.4);
      expect(iribarren(A.pathSlope, depth, period)).toBeLessThan(0.6);
    }
  });

  it('puts every depth\'s contour furthest out at the Canyon\'s peak, so each wave starts breaking there', () => {
    const canyon = createSpot('canyon', 1, { canyonBed: 'old' });
    for (let depth = 1.5; depth < A.shelfDepth - 0.05; depth += 0.5) {
      // Each along-shore column's most seaward point this shallow, and the column where it lies furthest out.
      let best = { x: Number.NaN, z: Infinity };
      // Over the reef's footprint (the beach peaks beside it have their own tips, `canyonBars`).
      const reef = canyonReefSpan(A);
      for (let x = reef.from; x <= reef.to; x += 0.5) {
        let z = A.zoneInner + A.blendLength;
        while (z < 0 && canyon.depthAt(x, z) > depth) z += 0.25;
        if (z < best.z) best = { x, z };
      }
      // At the peak, or just upcoast of it where its end falls to that depth: never down the arm or past the end.
      expect(best.x).toBeLessThanOrEqual(A.peakX + 0.5);
      expect(best.x).toBeGreaterThanOrEqual(A.peakX - (depth - A.crestDepth) / A.endSlope - 0.5);
    }
  });

  it('ends the Canyon\'s arm clear of both open edges\' levelling, so each edge copies plain shelf and beach face', () => {
    const canyon = createSpot('canyon', 1, { canyonBed: 'old' });
    // The open edge eases the bed over OPEN_EDGE_RAMP to its profile that far in: there the arm's end must be gone, and
    // since canyon-layout (2026-10-22) its taper past its end on the beach face too (since canyon-long-wave, past where
    // its face runs on to, `canyonReefEndX`).
    const levelled = -A.alongShore / 2 + OPEN_EDGE_RAMP;
    expect(A.peakX - (A.shelfDepth - A.crestDepth) / A.endSlope).toBeGreaterThan(levelled);
    expect(canyonReefEndX(A) + A.endTaper).toBeLessThan(-levelled);
    // Since canyon-beach-break the bars end clear of the levelling too: each edge copies the beach sections' plain floor
    // and beach face.
    for (let z = -400; z <= -5; z += 5) {
      expect(canyon.depthAt(levelled, z)).toBeCloseTo(Math.min(canyonFloorDepth(levelled, z, A), -z * A.shoreSlope), 9);
      expect(canyon.depthAt(-levelled, z)).toBeCloseTo(Math.min(canyonFloorDepth(-levelled, z, A), -z * A.shoreSlope), 9);
    }
    for (const bar of canyonBars(A)) expect(Math.abs(bar.x) + bar.reach + A.barTaper).toBeLessThanOrEqual(-levelled);
    // The peel is measured on the arm, from its end beside the peak to where its face meets the beach face (`canyonArmAt`).
    expect(canyonArmAt(A.peakX, A)).toBe(true);
    expect(canyonArmAt(levelled, A)).toBe(false);
    expect(canyonArmAt(canyonArmEndX(A) + 1, A)).toBe(true);
    expect(canyonArmAt(canyonReefEndX(A) + 1, A)).toBe(false);
    // Only the arm's breaks count: its face, its end and its flat top, not the lagoon's bores or the shore break on the
    // beach face behind the short arm, which read as "a right" (canyon-layout, 2026-10-22).
    const line = canyonBreakLineZ(A.reefTakeOffX, A);
    expect(canyonPeelAt(A.reefTakeOffX, line - 30, A)).toBe(true);
    expect(canyonPeelAt(A.reefTakeOffX, line + A.flatWidth - 1, A)).toBe(true);
    expect(canyonPeelAt(A.reefTakeOffX, line + A.flatWidth + 1, A)).toBe(false);
    expect(canyonPeelAt(-20, -25, A)).toBe(false);
    expect(canyonPeelAt(-20, -150, A)).toBe(true);
    expect(canyonPeelAt(levelled, -150, A)).toBe(false);
    // Version A, the reef with its beach either side (main's at 376d9cd4), in the 400 m window; version B (canyon-b) keeps
    // the window, the beach peaks and the breaking rules, and has no reef of its own.
    expect([A.alongShore, A.ageJoin, A.beach, A.reef, A.bowl]).toEqual([400, 0.5, 1, 1, 0]);
    expect([CANYON.alongShore, CANYON.ageJoin, CANYON.beach, CANYON.reef, CANYON.bowl]).toEqual([400, 0.5, 1, 0, 1]);
  });

  // canyon-beach-break (2026-10-23, docs/research/canyon-beach-break-2026-10-23): a sandbar peak each side of the reef.
  it('lays a sandbar peak each side of the Canyon\'s reef: V contours from its tip, attached to the beach, on a 5 m floor', () => {
    const canyon = createSpot('canyon', 1, { canyonBed: 'old' });
    const reef = canyonReefSpan(A);
    const tan = Math.tan((A.barAngle * Math.PI) / 180);
    const [up, down] = canyonBars(A);
    expect(up.x).toBe(A.takeOffX);
    // One each side, clear of the reef's footprint and its rips (the floor between).
    expect(up.x + up.reach + A.barTaper).toBeLessThan(reef.from);
    expect(down.x - down.reach - A.barTaper).toBeGreaterThan(reef.to);
    for (const bar of [up, down]) {
      // Along its axis the bar climbs at its slope from the floor to the waterline, the beach staying at z = 0.
      for (const [a, b] of [[-200, -150], [-120, -60], [-50, -10]]) {
        expect((canyon.depthAt(bar.x, a) - canyon.depthAt(bar.x, b)) / (b - a)).toBeCloseTo(bar.slope, 6);
      }
      expect(canyon.depthAt(bar.x, -0.5)).toBeGreaterThan(0);
      expect(canyon.depthAt(bar.x, 0.5)).toBeLessThan(0);
      // Each depth's contour runs back from the tip at barAngle either side, over its tip's hyperbola.
      for (const u of [-30, -15, 15, 30]) {
        const run = Math.sqrt(u * u + bar.rounding ** 2) - bar.rounding;
        expect(canyonBarDepth(bar, bar.x + u, -120 + run * tan, A)).toBeCloseTo(canyonBarDepth(bar, bar.x, -120, A), 9);
        expect(canyonBarAt(bar.x + u, -100, A)).toBe(bar === up ? 0 : 1);
      }
      // Past its arms the floor and the beach face: the rip.
      expect(canyonBarAt(bar.x + bar.reach + A.barTaper + 1, -100, A)).toBe(-1);
    }
    // The beach sections' floor: 5 m, the platform's 6 m over the reef's footprint and seaward of its ramp.
    expect(canyonFloorDepth(-150, -150, A)).toBe(A.floorDepth);
    expect(canyonFloorDepth(0, -150, A)).toBe(A.shelfDepth);
    expect(canyonFloorDepth(-150, -300, A)).toBe(A.shelfDepth);
    // The mellower, longer peak upcoast; the steeper, shorter one downcoast (the owner's decision 13).
    expect(up.slope).toBeLessThan(down.slope);
    expect(up.reach).toBeGreaterThan(down.reach);
    // The sand bed under the rock cover includes the bars: they are never rock (canyonRockCover).
    for (const bar of [up, down]) expect(canyonSandDepth(bar.x, -100, A)).toBe(canyon.depthAt(bar.x, -100));
  });

  it('breaks the Canyon\'s beach earlier than its reef, and passes its breaking age along its crests by rule A', () => {
    const reef = canyonReefSpan(A);
    // The reef keeps the spot's onset and join exactly, over its footprint and onsetPin m beside it, at every depth.
    for (let x = reef.from - A.onsetPin; x <= reef.to + A.onsetPin; x += 1) {
      for (let z = -330; z < 0; z += 5) {
        expect(canyonOnset(x, z, 0.65, A)).toBe(0.65);
        expect(canyonJoin(x, z, 0.5, A)).toBe(0.5);
      }
    }
    // The beach: its own onset where the bed is onsetShallow m deep or shallower, the spot's past onsetDeep; rule A.
    const [up, down] = canyonBars(A);
    for (const bar of [up, down]) {
      expect(canyonOnset(bar.x, -60, 0.65, A)).toBe(A.barOnset);
      expect(canyonOnset(bar.x, -300, 0.65, A)).toBe(0.65);
      for (const z of [-300, -60]) expect(canyonJoin(bar.x, z, 0.5, A)).toBe(A.barJoin);
    }
    expect(A.barOnset).toBeLessThan(0.65);
    expect(A.barJoin).toBe(0);
  });

  // canyon-b (2026-11-01, docs/research/canyon-b-2026-11-01; the water-physics advisor's design): the upcoast beach peak's
  // +x arm runs on, with no rip, into a reef bowl, then backs off into a channel; no reef of its own.
  // Version B is the `?canyonBed=b` dev switch's since canyon-c (2026-11-03).
  const B = CANYON_B;
  it('runs version B\'s upcoast bar\'s +x arm into a reef bowl: the arm as it was, then the bowl\'s transect, its crest backing off, the channel', () => {
    const canyon = createSpot('canyon', 1, { canyonBed: 'b' });
    const [up, down] = canyonBars(B);
    const bowlX = (u: number) => up.x + u;
    // The tip and the whole −x arm, and the downcoast bar, value for value; the +x arm, its contours at its own angle, the
    // plain bar to where the bowl ramps in.
    const old = createSpot('canyon', 1, { canyonBed: 'old' });
    for (let z = -250; z < 0; z += 5) {
      for (const u of [-60, -30, -10, 0]) expect(canyon.depthAt(bowlX(u), z)).toBe(old.depthAt(bowlX(u), z));
      for (const x of [down.x - 50, down.x, down.x + 50]) expect(canyon.depthAt(x, z)).toBe(old.depthAt(x, z));
      // No bowl yet: the bed is the sand's (the bars without it).
      for (const u of [20, 40, B.bowlFrom - 1]) expect(canyon.depthAt(bowlX(u), z)).toBe(canyonSandDepth(bowlX(u), z, B));
    }
    const tan = (degrees: number) => Math.tan((degrees * Math.PI) / 180);
    const arm = Math.sqrt(40 ** 2 + up.rounding ** 2) - up.rounding;
    expect(canyonBarDepth(up, bowlX(40), -120 + arm * tan(B.bowlArmAngle), B)).toBeCloseTo(canyonBarDepth(up, up.x, -120, B), 9);
    expect(canyonBarDepth(up, bowlX(-40), -120 + arm * tan(B.barAngle), B)).toBeCloseTo(canyonBarDepth(up, up.x, -120, B), 9);
    expect([up.plusReach, up.plusTaper, up.bowl, down.plusReach, down.bowl]).toEqual([B.bowlEnd + B.bowlBackOff, B.bowlFade, true, down.reach, false]);
    // The whole bowl's transect along +z (its middle): the bar's 1:50 to the platform, level at it, the 1:21 face to the
    // crest on the bar's 1.9 m contour, a level top, then down to meet the bar.
    const u = 0.5 * (B.bowlFrom + B.bowlRamp + B.bowlEnd);
    const x = bowlX(u);
    const crestZ = canyonBreakLineZ(x, B);
    const run = Math.sqrt(u * u + up.rounding ** 2) - up.rounding;
    expect(crestZ).toBeCloseTo(run * Math.tan((B.bowlArmAngle * Math.PI) / 180) - B.bowlCrestContour / up.slope, 9);
    expect(canyon.depthAt(x, crestZ)).toBeCloseTo(B.bowlCrest, 6);
    expect(canyon.depthAt(x, crestZ + B.bowlTop - 3)).toBeCloseTo(B.bowlCrest, 6);
    const knee = crestZ - (B.bowlPlatform - B.bowlCrest) / B.bowlFace;
    expect((canyon.depthAt(x, crestZ - 25) - canyon.depthAt(x, crestZ - 5)) / 20).toBeCloseTo(B.bowlFace, 6);
    expect(canyon.depthAt(x, knee - B.bowlKnee - 1)).toBeCloseTo(B.bowlPlatform, 6);
    // The platform is no shallower than the bar beside it (it carries the waves unbroken to the face), at most 0.4 m deeper.
    const plain = (z: number) => canyonBarDepth(up, x, z, B, false);
    for (let z = knee - B.bowlKnee - 1; z > knee - 25; z -= 1) {
      expect(canyon.depthAt(x, z)).toBeGreaterThanOrEqual(plain(z) - 1e-9);
      expect(canyon.depthAt(x, z) - plain(z)).toBeLessThan(0.4);
    }
    expect(canyon.depthAt(x, crestZ - 100)).toBeCloseTo(plain(crestZ - 100), 6);
    // Along shore: the crest backs off at the bowl's end; past the fade the plain floor and beach face, the channel.
    expect(canyon.depthAt(bowlX(B.bowlEnd + B.bowlBackOff), canyonBreakLineZ(bowlX(B.bowlEnd + B.bowlBackOff), B))).toBeCloseTo(B.bowlBackCrest, 1);
    const channel = up.x + up.plusReach + up.plusTaper + 1;
    for (const cx of [channel, 20, 60]) for (let z = B.floorEdge; z < -1; z += 5) expect(canyon.depthAt(cx, z)).toBeCloseTo(Math.min(B.floorDepth, -z * B.shoreSlope), 9);
    // Rock where the bowl stands above the bar (its face, top and back), sand elsewhere: the bars stay sand.
    expect(canyonSandDepth(x, crestZ, B) - canyon.depthAt(x, crestZ)).toBeGreaterThan(0.5);
    expect(canyonSandDepth(x, crestZ - 60, B)).toBeCloseTo(canyon.depthAt(x, crestZ - 60), 9);
    expect(canyonSandDepth(up.x, -100, B)).toBe(canyon.depthAt(up.x, -100));
    // The reef's footprint is the bowl's, its readout and front columns; the arm (its peel's columns) from where it ramps
    // in to where its crest has backed off.
    expect(canyonReefSpan(B)).toEqual({ from: bowlX(B.bowlFrom), to: channel - 1 });
    expect(canyonArmAt(bowlX(B.bowlFrom + 1), B)).toBe(true);
    expect(canyonArmAt(bowlX(B.bowlFrom - 1), B)).toBe(false);
    expect(canyonPeelAt(x, crestZ - 20, B)).toBe(true);
    expect(canyonPeelAt(x, crestZ + B.peelReach + 1, B)).toBe(false);
  });

  it('breaks version B\'s bowl by the reef\'s rules from where it ramps in, the arm by the beach\'s, blended on the arm\'s side', () => {
    const [up] = canyonBars(B);
    const from = up.x + B.bowlFrom;
    // The bowl: the spot's onset at every depth and the reef's gate, from where it ramps in to past its fade.
    for (let x = from; x <= canyonReefSpan(B).to + B.onsetPin; x += 1) {
      for (let z = -330; z < 0; z += 5) {
        expect(canyonOnset(x, z, 0.65, B)).toBe(0.65);
        expect(canyonJoin(x, z, 0.5, B)).toBe(0.5);
      }
    }
    // The arm: the beach's, from bowlRulesBlend m before the bowl.
    for (const x of [up.x, from - B.bowlRulesBlend - 1]) {
      expect(canyonOnset(x, -60, 0.65, B)).toBe(B.barOnset);
      for (const z of [-300, -60]) expect(canyonJoin(x, z, 0.5, B)).toBe(B.barJoin);
    }
    // The −x arm and the downcoast peak as on the old layout.
    for (const x of [up.x - 40, 121, 150]) expect([canyonOnset(x, -60, 0.65, B), canyonJoin(x, -60, 0.5, B)]).toEqual([canyonOnset(x, -60, 0.65, CANYON_BEACH), canyonJoin(x, -60, 0.5, CANYON_BEACH)]);
    // Neither has a bank: the join rule (`canyonJoin`'s 'bed' or 'zone') leaves them as they were.
    for (const shape of [B, CANYON_BEACH]) {
      for (let x = -200; x <= 200; x += 5) for (let z = -440; z < 0; z += 20) expect(canyonJoin(x, z, 0.5, shape, 'zone')).toBe(canyonJoin(x, z, 0.5, shape));
    }
  });

  // canyon-c (2026-11-03, docs/research/canyon-c-2026-11-03; the water-physics advisor's ruling with the owner's
  // decisions): one straight bank peeling from +x into the reef bowl, its planform flipped; a channel past it.
  it('lays version C\'s bank: a straight 45° crest contour from the flipped bowl\'s seaward end to its tip, a 1:44 face, the edge ramp, the inside', () => {
    const C = CANYON;
    const canyon = createSpot('canyon', 1);
    const join = canyonBankJoin();
    const middle = C.upPeakX + 0.5 * (C.bowlFrom + C.bowlRamp + C.bowlEnd);
    // The join: the flipped bowl's seaward (+x) end, B's −x end mirrored about the bowl's middle, on its crest contour.
    expect(middle).toBe(-39.5);
    expect(join.x).toBe(2 * middle - (C.upPeakX + C.bowlFrom));
    expect(join.z).toBeCloseTo(canyonBreakLineZ(C.upPeakX + C.bowlFrom, CANYON_B), 9);
    // The crest contour runs at 45° from the join to the tip, seaward toward +x: the tip far out, the bowl near the beach.
    const [bank] = canyonBars();
    expect([bank.x, bank.bank, bank.reach, bank.plusTaper]).toEqual([C.bankTipX, true, C.bankTipX - join.x, C.bankFade]);
    for (const x of [join.x, 0, 31, 75, 120, C.bankTipX]) expect(canyonBreakLineZ(x)).toBeCloseTo(join.z - (x - join.x), 9);
    expect(-canyonBreakLineZ(C.bankTipX)).toBeGreaterThan(220);
    // Along +z the face climbs at 1:44 up to the edge; the edge is 1.2 m deep to x +31, deepening linearly to 3.6 m at the tip.
    expect([canyonBankEdge(join.x), canyonBankEdge(31)]).toEqual([1.2, 1.2]);
    for (const x of [140, 160]) expect(canyonBankEdge(x)).toBeCloseTo(3.6, 12);
    expect(canyonBankEdge(85.5)).toBeCloseTo(2.4, 9);
    for (const x of [0, 31, 75, 120]) {
      const line = canyonBreakLineZ(x);
      const edge = canyonBankEdge(x);
      const edgeZ = line - (edge - C.bowlCrestContour) / C.bankFace;
      for (const [a, b] of [[edgeZ - 40, edgeZ - 10], [edgeZ - 80, edgeZ - 50]]) expect((canyon.depthAt(x, a) - canyon.depthAt(x, b)) / (b - a)).toBeCloseTo(C.bankFace, 6);
      // The edge and the level top behind it, then the inside, max(2 m, edge + 0.5 m), until the 1:15 beach face.
      expect(canyon.depthAt(x, edgeZ)).toBeCloseTo(edge, 6);
      expect(canyon.depthAt(x, edgeZ + C.bankTop - 1)).toBeCloseTo(edge, 6);
      const inside = Math.max(C.bankInside, edge + C.bankInsideOver);
      const lagoon = edgeZ + C.bankTop + (inside - edge) / C.bankBack + 2;
      if (lagoon < -inside / C.shoreSlope) expect(canyon.depthAt(x, lagoon)).toBeCloseTo(inside, 6);
      expect(canyon.depthAt(x, -10)).toBeCloseTo(10 * C.shoreSlope, 9);
      // Never deeper than the floor.
      for (let z = -440; z < 0; z += 5) expect(canyon.depthAt(x, z)).toBeLessThanOrEqual(Math.min(canyonFloorDepth(x, z), -z * C.shoreSlope) + 1e-9);
    }
    // Each depth between the edge's two ends: its contour straight at 45°, ending where the edge reaches it (the first break).
    for (const depth of [1.5, 2.0, 2.5, 3.0, 3.5]) {
      const ends = 31 + (depth - C.bankEdge) / ((C.bankEdgeTip - C.bankEdge) / (C.bankTipX - C.bankRampFrom));
      const outermost = (x: number) => { let z = -440; while (z < 0 && canyon.depthAt(x, z) > depth) z += 0.25; return z; };
      // Down the line of its end (toward the bowl) the contour lies on the face, straight at 45°…
      for (const x of [ends - 5, ends - 15]) if (x > 0) expect(outermost(x)).toBeCloseTo(canyonBreakLineZ(x) - (depth - C.bowlCrestContour) / C.bankFace, 0);
      // …and up the line the bank's top is deeper: no water that shallow until the beach face.
      if (ends + 10 < C.bankTipX) expect(outermost(ends + 10)).toBeCloseTo(-depth / C.shoreSlope, 0);
    }
    // The tip fades into the floor over 25 m, clear of the +x open edge's levelling.
    for (let z = -440; z < -5; z += 5) {
      const x = C.bankTipX + C.bankFade;
      expect(canyon.depthAt(x, z)).toBeCloseTo(Math.min(canyonFloorDepth(x, z), -z * C.shoreSlope), 9);
    }
    expect(C.bankTipX + C.bankFade).toBeLessThan(C.alongShore / 2 - OPEN_EDGE_RAMP);
    // The tank's blend ends 20 m seaward of the tip's 5 m foot.
    expect(canyonFootZ()).toBeCloseTo(canyonBreakLineZ(C.bankTipX) - (C.floorDepth - C.bowlCrestContour) / C.bankFace, 9);
    expect(C.zoneInner + C.blendLength).toBeLessThanOrEqual(canyonFootZ() - 20);
    expect(C.zoneInner + C.blendLength).toBeGreaterThan(canyonFootZ() - 21);
    // The bank is sand and its own peak's (`canyonBarAt`); the bars are gone.
    expect(canyonBarAt(75, canyonBreakLineZ(75))).toBe(0);
    expect(canyonSandDepth(75, canyonBreakLineZ(75))).toBe(canyon.depthAt(75, canyonBreakLineZ(75)));
  });

  it('flips version C\'s bowl: B\'s bowl and the bar under it, mirrored along shore about its middle, the channel past it', () => {
    const C = CANYON;
    const canyon = createSpot('canyon', 1);
    const b = createSpot('canyon', 1, { canyonBed: 'b' });
    const middle = C.upPeakX + 0.5 * (C.bowlFrom + C.bowlRamp + C.bowlEnd);
    const span = canyonReefSpan();
    // The whole bowl and its back-off, value for value B's at the mirrored x: its transect, rock and curl kept.
    for (let x = canyonArmEndX(); x <= canyonBankJoin().x - C.bowlRamp; x += 1) {
      for (let z = -300; z < 0; z += 2) expect(canyon.depthAt(x, z)).toBe(b.depthAt(2 * middle - x, z));
    }
    // It ramps in at its +x end, where the bank joins, and backs off at its −x end: its arm, peel and readout columns.
    expect(span).toEqual({ from: 2 * middle - (C.upPeakX + C.bowlEnd + C.bowlBackOff + C.bowlFade), to: canyonBankJoin().x });
    expect(canyonArmEndX()).toBe(2 * middle - (C.upPeakX + C.bowlEnd + C.bowlBackOff));
    expect(canyonArmAt(middle)).toBe(true);
    expect(canyonArmAt(span.to + 1)).toBe(false);
    expect(canyonArmAt(canyonArmEndX() - 1)).toBe(false);
    expect(canyonPeelAt(middle, canyonBreakLineZ(middle) - 20)).toBe(true);
    // Its crest contour is on the bowl's base bar's 1.9 m contour, B's mirrored: seaward at its +x end, where the bank joins.
    for (const x of [-50, -40, -30]) expect(canyonBreakLineZ(x)).toBeCloseTo(canyonBreakLineZ(2 * middle - x, CANYON_B), 9);
    expect(canyonBreakLineZ(-25)).toBeLessThan(canyonBreakLineZ(-50));
    // The channel: past the bowl's −x end, the plain floor and beach face to the −x edge; both A-frames are gone.
    for (const x of [span.from - 2, -112, -150, -C.alongShore / 2]) {
      for (let z = -440; z < 0; z += 5) expect(canyon.depthAt(x, z)).toBeCloseTo(Math.min(canyonFloorDepth(x, z), -z * C.shoreSlope), 9);
      expect(canyonBarAt(x, -100)).toBe(-1);
    }
    for (let z = C.floorEdge; z < -C.floorDepth / C.shoreSlope; z += 5) expect(canyon.depthAt(-150, z)).toBe(C.floorDepth);
    // The bowl stands on its base bar (the bed's own peak's), rock above the sand.
    expect(canyonBarAt(middle, canyonBreakLineZ(middle))).toBe(0);
    expect(canyonSandDepth(middle, canyonBreakLineZ(middle)) - canyon.depthAt(middle, canyonBreakLineZ(middle))).toBeGreaterThan(0.5);
  });

  it('breaks version C\'s flipped bowl by the reef\'s rules and its bank by the beach\'s onset', () => {
    const C = CANYON;
    const span = canyonReefSpan();
    for (let x = span.from - C.onsetPin; x <= span.to; x += 1) {
      for (let z = -330; z < 0; z += 5) {
        expect(canyonOnset(x, z, 0.65)).toBe(0.65);
        expect(canyonJoin(x, z, 0.5)).toBe(0.5);
        expect(canyonJoin(x, z, 0.5, C, 'zone')).toBe(0.5);
      }
    }
    // The bank: the beach's 0.40 onset where it is 3 m deep or shallower, easing to the spot's 0.65 by 4.5 m.
    for (const x of [span.to + C.bowlRulesBlend + 1, 31, 75, 140]) {
      const edge = canyonBankEdgeZ(x);
      expect(canyonOnset(x, edge - 20, 0.65)).toBeCloseTo(canyonBankEdge(x) + 20 * C.bankFace <= C.onsetShallow ? C.barOnset : canyonOnset(x, edge - 20, 0.65), 9);
    }
    expect(canyonOnset(75, canyonBreakLineZ(75) + 20, 0.65)).toBe(C.barOnset);
    expect(canyonOnset(75, -420, 0.65)).toBe(0.65);
    expect([C.barOnset, C.barJoin]).toEqual([0.4, 0]);
  });

  // The water-physics advisor's second ruling (2026-11-04, §2a): the bank's breaking-age join keyed to the bed. With the
  // take-off zone's gate (the first ruling's §2) the line stalled: the gate sat above the bank's 0.40 onset, so it passed
  // the age only to cells that would break anyway, and the peak's white died over the inside before the shoulder broke.
  it('passes version C\'s breaking age by its bed: rule A on the bank\'s face, the reef\'s gate behind its edge line', () => {
    const C = CANYON;
    const span = canyonReefSpan();
    const canyon = createSpot('canyon', 1);
    expect(C.bankJoinBlend).toBe(3);
    for (const x of [span.to + C.bowlRulesBlend + 1, 0, 31, 75, 120, C.bankTipX]) {
      // The edge line: the top of the bank's face, where the face reaches the edge's depth (the frame probe's edgeZ).
      const edge = canyonBankEdgeZ(x);
      expect(edge).toBeCloseTo(canyonBreakLineZ(x) - (canyonBankEdge(x) - C.bowlCrestContour) / C.bankFace, 9);
      expect(canyon.depthAt(x, edge)).toBeCloseTo(canyonBankEdge(x), 6);
      // Rule A on the face, seaward of it; the gate on its top, its back and the inside, shoreward; blended over 3 m.
      for (const dz of [-80, -20, -C.bankJoinBlend / 2 - 0.01]) expect(canyonJoin(x, edge + dz, 0.5)).toBe(C.barJoin);
      for (const dz of [C.bankJoinBlend / 2 + 0.01, C.bankTop, 40]) expect(canyonJoin(x, edge + dz, 0.5)).toBe(0.5);
      expect(canyonJoin(x, edge, 0.5)).toBeCloseTo(0.25, 9);
      for (let dz = -C.bankJoinBlend; dz < C.bankJoinBlend; dz += 0.25) {
        expect(canyonJoin(x, edge + dz + 0.25, 0.5)).toBeGreaterThanOrEqual(canyonJoin(x, edge + dz, 0.5));
        expect(canyonBankFaceShare(x, edge + dz)).toBeCloseTo((0.5 - canyonJoin(x, edge + dz, 0.5)) / 0.5, 12);
      }
    }
    // Past the tip the face fades with the bank into the floor: the gate beyond it, at every depth.
    for (let z = -440; z < 0; z += 5) expect(canyonJoin(C.bankTipX + C.bankFade, z, 0.5)).toBe(0.5);
    expect(canyonJoin(C.bankTipX + 0.5 * C.bankFade, canyonBankEdgeZ(C.bankTipX + 0.5 * C.bankFade) - 20, 0.5)).toBeCloseTo(0.25, 9);
    // Between the bowl and the bank the bowl's rules blend in over bowlRulesBlend m, on the face only.
    const middle = span.to + 0.5 * C.bowlRulesBlend;
    expect(canyonJoin(middle, canyonBankEdgeZ(middle) - 20, 0.5)).toBeCloseTo(0.25, 9);
    expect(canyonJoin(middle, canyonBankEdgeZ(middle) + 20, 0.5)).toBe(0.5);
    // The channel past the bowl's −x end keeps the beach's rule A at every depth.
    for (const x of [span.from - C.onsetPin - C.onsetBlend - 1, -150]) for (let z = -440; z < 0; z += 20) expect(canyonJoin(x, z, 0.5)).toBe(C.barJoin);
  });

  // `canyonJoin` 'zone' (the `?canyonJoin=zone` dev switch): the branch's head at ca567450, the first ruling's §2.
  it('passes version C\'s breaking age by its take-off zone with the \'zone\' rule: rule A to x +31, the gate up the line', () => {
    const C = CANYON;
    const span = canyonReefSpan();
    for (let z = -440; z < 0; z += 10) {
      for (const x of [span.to + C.bowlRulesBlend + 1, 0, 20, 31]) expect(canyonJoin(x, z, 0.5, C, 'zone')).toBe(C.barJoin);
      for (const x of [36, 75, 140, 160]) expect(canyonJoin(x, z, 0.5, C, 'zone')).toBe(0.5);
      expect(canyonJoin(33.5, z, 0.5, C, 'zone')).toBeCloseTo(0.25, 9);
    }
    expect(C.bankGateFrom).toBe(31);
  });

  // The advisor's option (b), the owner's call (`?canyonRamp=half`): the edge ramp halved.
  it('halves version C\'s edge ramp with \'half\': the edge 2.4 m at the tip, its line at 56° to the shore, not 63°, and the join keyed to it', () => {
    const H = CANYON_HALF_RAMP;
    expect(Object.isFrozen(H)).toBe(true);
    expect(canyonShape('half')).toBe(H);
    expect({ ...H, bankEdgeTip: CANYON.bankEdgeTip }).toEqual({ ...CANYON });
    expect([canyonBankEdge(31, H), canyonBankEdge(140, H)]).toEqual([1.2, 2.4]);
    expect(canyonBankEdge(85.5, H)).toBeCloseTo(1.8, 12);
    expect((H.bankEdgeTip - H.bankEdge) / (H.bankTipX - H.bankRampFrom)).toBeCloseTo(0.011, 3);
    const angle = (shape: typeof CANYON) => (Math.atan((canyonBankEdgeZ(31, shape) - canyonBankEdgeZ(140, shape)) / (140 - 31)) * 180) / Math.PI;
    expect(angle(CANYON)).toBeCloseTo(63, 0);
    expect(angle(H)).toBeCloseTo(56, 0);
    // The bed: as today's to x +31 and on the bowl, the edge shallower up the line.
    const half = createSpot('canyon', 1, { canyonBed: 'half' });
    const today = createSpot('canyon', 1);
    for (let x = -200; x <= 31; x += 7) for (let z = -440; z < 0; z += 13) expect(half.depthAt(x, z)).toBe(today.depthAt(x, z));
    expect(half.depthAt(100, canyonBankEdgeZ(100, H) + 2)).toBeCloseTo(canyonBankEdge(100, H), 6);
    // Its join follows its own edge line.
    for (const x of [75, 120]) {
      expect(canyonJoin(x, canyonBankEdgeZ(x, H) - 5, 0.5, H)).toBe(0);
      expect(canyonJoin(x, canyonBankEdgeZ(x, H) + 5, 0.5, H)).toBe(0.5);
    }
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
