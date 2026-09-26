import { describe, expect, it } from 'vitest';
import { BEACH_BAR, CANYON, POINT_HEADLAND, REEF, createSpot, deanDepth, reefEdgeZ, type SurfSpot } from './Bathymetry';
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

  it("sets the angle of the reef edge's arms by its obliquity", () => {
    const along = (a: number, b: number) => (reefEdgeZ(REEF.apexX + b) - reefEdgeZ(REEF.apexX + a)) / (b - a);
    expect(along(20, 60)).toBeCloseTo(Math.tan((REEF.obliquity * Math.PI) / 180), 12);
    expect(along(-60, -20)).toBeCloseTo(-Math.tan((REEF.obliquity * Math.PI) / 180), 12);
    expect(reefEdgeZ(REEF.apexX + REEF.halfWidth + 10)).toBe(REEF.edge);
  });

  it('runs a single-arm reef edge straight across at its obliquity through its middle point', () => {
    const saved = { ...REEF };
    Object.assign(REEF, { arms: 1, obliquity: 30, edgeMid: -90 });
    try {
      expect(reefEdgeZ(REEF.apexX)).toBeCloseTo(-90, 12);
      expect((reefEdgeZ(40) - reefEdgeZ(-40)) / 80).toBeCloseTo(-Math.tan(Math.PI / 6), 12);
    } finally {
      Object.assign(REEF, saved);
    }
  });

  it('raises the reef shelf steeply enough to plunge', () => {
    const reef = createSpot('reef', 1);
    const apex = reefEdgeZ(REEF.apexX);
    let steepest = 0;
    for (let z = apex - REEF.edgeWidth; z <= apex + REEF.edgeWidth / 2; z += 0.5) steepest = Math.max(steepest, slopeZ(reef, REEF.apexX, z));
    expect(steepest).toBeGreaterThan(0.1);
    expect(steepest).toBeLessThan(0.2);
    expect(reef.depthAt(REEF.apexX, apex + REEF.edgeWidth)).toBeCloseTo(REEF.shelfDepth, 1);
    expect(reef.depthAt(REEF.apexX, apex - REEF.edgeWidth)).toBeCloseTo(REEF.channelDepth, 1);
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
