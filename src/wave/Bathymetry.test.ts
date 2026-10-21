import { describe, expect, it } from 'vitest';
import { BEACH_BAR, BEACH_OUTER, CANYON, CANYON_OLD, PADANG, canyonArmAt, canyonPeelAt, canyonArmEndX, canyonBreakLineZ, canyonFootZ, canyonReefEndX, POINT_HEADLAND, POINT_OUTER, REEF, createSpot, deanDepth, padangBaseZ, padangCrestZ, padangFocusShape, padangForeFootZ, padangKneeZ, padangReefAt, padangSeaward, reefCrestZ, reefLedgeAt, smoothstep, type SurfSpot } from './Bathymetry';
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
  // window since canyon-layout (2026-10-22: 220 m, 240 m since canyon-long-wave; ALONG_SHORE's 160 m before).
  it('keeps the Canyon level along shore seaward of its arm, with no canyon, and level across both open edges', () => {
    const canyon = createSpot('canyon', 1);
    const edge = CANYON.alongShore / 2;
    // Seaward of the arm's furthest foot, at the bottom of its end just upcoast of the peak, the bed is the plain shelf
    // everywhere along shore.
    const foot = canyonFootZ();
    for (let x = -edge; x <= edge; x += 5) {
      for (let z = foot - 1; z >= CANYON.zoneInner + CANYON.blendLength; z -= 10) expect(canyon.depthAt(x, z)).toBe(CANYON.shelfDepth);
    }
    // An open edge copies its neighbours: a bed sloping across it drove the edge cells unstable.
    for (let z = -400; z <= -10; z += 10) {
      expect(Math.abs(gradientX(canyon, -edge, z))).toBeLessThan(1e-3);
      expect(Math.abs(gradientX(canyon, edge, z))).toBeLessThan(1e-3);
    }
  });

  it('lays the Canyon\'s arm obliquely from its peak toward +x and the beach, a planar face running into the beach face, plunging its sets', () => {
    const canyon = createSpot('canyon', 1);
    // The break line runs from its peak toward +x and the beach at the design angle, until it meets the beach face.
    expect(canyonBreakLineZ(CANYON.peakX + 20) - canyonBreakLineZ(CANYON.peakX)).toBeCloseTo(20 * Math.tan((CANYON.angle * Math.PI) / 180), 6);
    // A short reef near a visible beach (canyon-layout, 2026-10-22; the advisor's design C with a 1:15 beach): the peak
    // 120 m from the waterline, the line 35–40 m along shore to its end on the beach face (about 110 m along it). Since
    // canyon-long-wave (2026-10-22) the face runs on past the line's end until its foot meets the beach face's (`runOn`),
    // 50–55 m downcoast of the peak, so the waves' break runs down the arm into the beach face; the footprint, from the
    // upcoast end to the end of the taper, leaves open water either side clear of each edge's levelling, 50 m and more
    // (72–83 m to the window's sides: in a 220 m window, 67–68 m, the crests wrapping round the upcoast end came back
    // from the −x side's mirror as a chevron inshore).
    const armEnd = canyonArmEndX();
    const reefEnd = canyonReefEndX();
    const upcoastEnd = CANYON.peakX - (CANYON.shelfDepth - CANYON.crestDepth) / CANYON.endSlope;
    expect(-CANYON.peakZ).toBe(120);
    expect(armEnd - CANYON.peakX).toBeGreaterThan(35);
    expect(armEnd - CANYON.peakX).toBeLessThan(40);
    expect(Math.hypot(armEnd - CANYON.peakX, canyonBreakLineZ(armEnd) - CANYON.peakZ)).toBeLessThan(115);
    expect(reefEnd - CANYON.peakX).toBeGreaterThan(50);
    expect(reefEnd - CANYON.peakX).toBeLessThan(55);
    expect(upcoastEnd).toBeGreaterThan(-CANYON.alongShore / 2 + OPEN_EDGE_RAMP + 60);
    expect(reefEnd + CANYON.endTaper).toBeLessThan(CANYON.alongShore / 2 - OPEN_EDGE_RAMP - 50);
    // One planar face (`fan` 0): along the arm, from the take-off to the beach face, the face climbs at pathSlope along
    // the waves' path (+z) from the shelf to the crest line, and behind the line the terrace's top is crestDepth deep.
    expect(CANYON.fan).toBe(0);
    for (const x of [CANYON.takeOffX, -2, 6]) {
      const zLine = canyonBreakLineZ(x);
      expect(canyon.depthAt(x, zLine + 2)).toBeCloseTo(CANYON.crestDepth, 6);
      // Behind the line the top is level for flatWidth, then falls at pathSlope to the trough, which the beach face closes.
      expect(canyon.depthAt(x, zLine + CANYON.flatWidth - 1)).toBeCloseTo(CANYON.crestDepth, 6);
      // Down the arm the 1:15 beach face closes the trough before it is 2 m deep: from 8 m downcoast of the take-off on.
      const trough = zLine + CANYON.flatWidth + (CANYON.lagoonDepth - CANYON.crestDepth) / CANYON.pathSlope + 1;
      if (x <= -2) {
        expect(-trough * CANYON.shoreSlope).toBeGreaterThan(CANYON.lagoonDepth);
        expect(canyon.depthAt(x, trough)).toBeCloseTo(CANYON.lagoonDepth, 6);
      } else {
        expect(canyon.depthAt(x, trough)).toBeCloseTo(-trough * CANYON.shoreSlope, 6);
      }
      const foot = zLine - (CANYON.shelfDepth - CANYON.crestDepth) / CANYON.pathSlope;
      expect(canyon.depthAt(x, foot - 2)).toBeCloseTo(CANYON.shelfDepth, 6);
      for (const [a, b] of [[zLine - 10, zLine - 2], [foot + 10, foot + 30], [zLine - 60, zLine - 40]]) {
        expect((canyon.depthAt(x, a) - canyon.depthAt(x, b)) / (b - a)).toBeCloseTo(CANYON.pathSlope, 9);
      }
    }
    // Past the line's end on the beach face the face runs on (`runOn`): seaward of the beach face's own contour the reef
    // makes the bed, and its breaks count toward the peel; nearer the beach the beach face is shallower, and its shore
    // break does not count. Past the taper, plain beach face.
    const runOnX = (armEnd + reefEnd) / 2;
    expect(canyon.depthAt(runOnX, -70)).toBeCloseTo(CANYON.crestDepth + (canyonBreakLineZ(runOnX) + 70) * CANYON.pathSlope, 9);
    expect(canyon.depthAt(runOnX, -70)).toBeLessThan(70 * CANYON.shoreSlope - 0.2);
    expect(canyonPeelAt(runOnX, -70)).toBe(true);
    expect(canyon.depthAt(runOnX, -25)).toBeCloseTo(25 * CANYON.shoreSlope, 9);
    expect(canyonPeelAt(runOnX, -25)).toBe(false);
    for (let z = -200; z <= -5; z += 5) expect(canyon.depthAt(reefEnd + CANYON.endTaper + 1, z)).toBeCloseTo(Math.min(CANYON.shelfDepth, -z * CANYON.shoreSlope), 9);
    // The reef bed (2026-10-22, docs/research/canyon-reef-bed-2026-10-22): the waves breaking on the 1:23 face plunge
    // weakly, as the owner's reference reel (the advisor: ξb about 0.42–0.55). ξb = slope / √(Hb / L0) with the advisor's
    // Hb = 0.78 h: Big's and Medium's sets, 3.3–3.7 m and 2.2–2.3 m deep by the peak, and Big's median wave at 2.2 m. On
    // the planar face (canyon-long-wave) Small's sets, about 1.8 m deep, plunge weakly too (they spilled on the fan, ξb
    // under 0.3 at 1.3 m on its 1:45 shallow face).
    const iribarren = (slope: number, depth: number, period: number) => slope / Math.sqrt((0.78 * depth) / ((9.81 * period ** 2) / (2 * Math.PI)));
    for (const [depth, period] of [[3.5, 14], [2.25, 11], [CANYON.hingeDepth, 14], [1.8, 9]]) {
      expect(iribarren(CANYON.pathSlope, depth, period)).toBeGreaterThanOrEqual(0.4);
      expect(iribarren(CANYON.pathSlope, depth, period)).toBeLessThan(0.6);
    }
  });

  it('puts every depth\'s contour furthest out at the Canyon\'s peak, so each wave starts breaking there', () => {
    const canyon = createSpot('canyon', 1);
    for (let depth = 1.5; depth < CANYON.shelfDepth - 0.05; depth += 0.5) {
      // Each along-shore column's most seaward point this shallow, and the column where it lies furthest out.
      let best = { x: Number.NaN, z: Infinity };
      for (let x = -CANYON.alongShore / 2 + OPEN_EDGE_RAMP; x <= CANYON.alongShore / 2 - OPEN_EDGE_RAMP; x += 0.5) {
        let z = CANYON.zoneInner + CANYON.blendLength;
        while (z < 0 && canyon.depthAt(x, z) > depth) z += 0.25;
        if (z < best.z) best = { x, z };
      }
      // At the peak, or just upcoast of it where its end falls to that depth: never down the arm or past the end.
      expect(best.x).toBeLessThanOrEqual(CANYON.peakX + 0.5);
      expect(best.x).toBeGreaterThanOrEqual(CANYON.peakX - (depth - CANYON.crestDepth) / CANYON.endSlope - 0.5);
    }
  });

  it('ends the Canyon\'s arm clear of both open edges\' levelling, so each edge copies plain shelf and beach face', () => {
    const canyon = createSpot('canyon', 1);
    // The open edge eases the bed over OPEN_EDGE_RAMP to its profile that far in: there the arm's end must be gone, and
    // since canyon-layout (2026-10-22) its taper past its end on the beach face too (since canyon-long-wave, past where
    // its face runs on to, `canyonReefEndX`).
    const levelled = -CANYON.alongShore / 2 + OPEN_EDGE_RAMP;
    expect(CANYON.peakX - (CANYON.shelfDepth - CANYON.crestDepth) / CANYON.endSlope).toBeGreaterThan(levelled);
    expect(canyonReefEndX() + CANYON.endTaper).toBeLessThan(-levelled);
    for (let z = -400; z <= -5; z += 5) {
      expect(canyon.depthAt(levelled, z)).toBeCloseTo(Math.min(CANYON.shelfDepth, -z * CANYON.shoreSlope), 9);
      expect(canyon.depthAt(-levelled, z)).toBeCloseTo(Math.min(CANYON.shelfDepth, -z * CANYON.shoreSlope), 9);
    }
    // The peel is measured on the arm, from its end beside the peak to where its face meets the beach face (`canyonArmAt`).
    expect(canyonArmAt(CANYON.peakX)).toBe(true);
    expect(canyonArmAt(levelled)).toBe(false);
    expect(canyonArmAt(canyonArmEndX() + 1)).toBe(true);
    expect(canyonArmAt(canyonReefEndX() + 1)).toBe(false);
    // Only the arm's breaks count: its face, its end and its flat top, not the lagoon's bores or the shore break on the
    // beach face behind the short arm, which read as "a right" (canyon-layout, 2026-10-22).
    const line = canyonBreakLineZ(CANYON.takeOffX);
    expect(canyonPeelAt(CANYON.takeOffX, line - 30)).toBe(true);
    expect(canyonPeelAt(CANYON.takeOffX, line + CANYON.flatWidth - 1)).toBe(true);
    expect(canyonPeelAt(CANYON.takeOffX, line + CANYON.flatWidth + 1)).toBe(false);
    expect(canyonPeelAt(-20, -25)).toBe(false);
    expect(canyonPeelAt(-20, -150)).toBe(true);
    expect(canyonPeelAt(levelled, -150)).toBe(false);
    // The old layout (canyon-layout's short arm) counts its arm's breaks as main did: to its taper, then none.
    const oldLine = canyonBreakLineZ(CANYON_OLD.takeOffX, CANYON_OLD);
    expect(canyonPeelAt(CANYON_OLD.takeOffX, oldLine - 30, CANYON_OLD)).toBe(true);
    expect(canyonPeelAt(CANYON_OLD.takeOffX, oldLine + CANYON_OLD.flatWidth + 1, CANYON_OLD)).toBe(false);
    expect(canyonArmAt(canyonArmEndX(CANYON_OLD) + 1, CANYON_OLD)).toBe(false);
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
