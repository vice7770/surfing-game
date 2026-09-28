import { describe, expect, it } from 'vitest';
import { GRAVITY } from './dispersion';
import {
  LH82_AREA, PSI_RANGE, REEF_OVERTURN, jetFlightTime, jetRelativeSpeed, overturn, overturnParameter, overturnSize, reefOverturn, tubeFloorDepth, tubeGeometry,
  vortexRatio,
} from './Overturn';

describe('the overturn of a plunging wave (Pick & Feddersen 2026)', () => {
  it('reproduces the published fits at the ends of their range', () => {
    const steep = overturn(0.0889);
    expect(steep.area).toBeCloseTo(0.43, 2);
    expect(steep.jetArea).toBeCloseTo(0.26, 2);
    expect(steep.aspect).toBeCloseTo(0.446, 3);
    expect((steep.tilt * 180) / Math.PI).toBeCloseTo(23, 0);
    const gentle = overturn(0.0156);
    expect(gentle.area).toBeCloseTo(0.04, 2);
    expect(gentle.aspect).toBeCloseTo(0.324, 3);
    expect((gentle.tilt * 180) / Math.PI).toBeCloseTo(50.5, 0);
  });

  it('draws bigger, rounder and flatter overturns on steeper slopes', () => {
    const gentle = overturn(overturnParameter(1 / 50, 0.3));
    const steep = overturn(overturnParameter(1 / 15, 0.3));
    expect(steep.area).toBeGreaterThan(gentle.area);
    expect(steep.jetArea).toBeGreaterThan(gentle.jetArea);
    expect(steep.aspect).toBeGreaterThan(gentle.aspect);
    expect(steep.tilt).toBeLessThan(gentle.tilt);
  });

  it('keeps to the fitted range rather than extrapolating', () => {
    expect(overturn(0.5)).toEqual(overturn(PSI_RANGE.max));
    expect(overturn(0)).toEqual(overturn(PSI_RANGE.min));
  });

  it("sizes the void on Longuet-Higgins's curve: area = LH82_AREA · width · length", () => {
    const shape = overturn(0.05);
    const { length, width } = overturnSize(shape, 2);
    expect(width / length).toBeCloseTo(shape.aspect, 12);
    expect(LH82_AREA * width * length).toBeCloseTo(shape.area * 4, 12);
  });

  it('launches a ballistic jet from the crest, in its frame, that lands at the front end of the void', () => {
    const shape = overturn(0.05);
    const height = 1.5;
    const tube = tubeGeometry(shape, height);
    const speed = jetRelativeSpeed(shape, height);
    let x = 0;
    let y = 0;
    let vy = 0;
    const h = 1e-5;
    const drop = tube.width / 2 + tube.length * Math.sin(tube.tilt);
    while (y > -drop) {
      x += speed * h;
      vy -= GRAVITY * h;
      y += vy * h;
    }
    expect(x).toBeCloseTo(tube.length * Math.cos(tube.tilt), 3);
  });

  it('times the jet from the crest to where it lands, which is how long it pours (Erinin et al. 2023)', () => {
    const shape = overturn(0.05);
    const tube = tubeGeometry(shape, 1.5);
    const flight = jetFlightTime(shape, 1.5);
    expect(flight).toBeCloseTo(Math.sqrt((2 * (tube.width / 2 + tube.length * Math.sin(tube.tilt))) / GRAVITY), 12);
    expect(jetRelativeSpeed(shape, 1.5) * flight).toBeCloseTo(tube.length * Math.cos(tube.tilt), 12);
    // Their jets took 1.5-1.6 sqrt(H/g) from forming to impact; the fitted overturns fly in the same few tenths.
    expect(flight / Math.sqrt(1.5 / GRAVITY)).toBeGreaterThan(0.8);
    expect(flight / Math.sqrt(1.5 / GRAVITY)).toBeLessThan(1.8);
  });

  it("carves the void's floor from half its width under the crest down to where the jet lands", () => {
    const tube = tubeGeometry(overturn(0.05), 1.5);
    const front = tube.length * Math.cos(tube.tilt);
    expect(tubeFloorDepth(tube, 0)).toBeCloseTo(tube.width / 2, 6);
    expect(tubeFloorDepth(tube, front)).toBeCloseTo(tube.width / 2 + tube.length * Math.sin(tube.tilt), 6);
    // Between them it bellies below the straight axis, by up to half the width across it.
    const middle = tubeFloorDepth(tube, front / 2);
    expect(middle).toBeGreaterThan(tube.width / 2 + (front / 2) * Math.tan(tube.tilt));
    expect(Number.isNaN(tubeFloorDepth(tube, -0.1))).toBe(true);
    expect(Number.isNaN(tubeFloorDepth(tube, front + 0.1))).toBe(true);
  });

  it('implies jet speeds within the measured 1.15-1.73 times the crest speed', () => {
    // Depth-limited: H = 0.78 h, and the crest runs at √(g(h + H)).
    for (let psi = PSI_RANGE.min; psi <= PSI_RANGE.max; psi += 0.005) {
      const height = 1.5;
      const crest = Math.sqrt(GRAVITY * (height / 0.78 + height));
      const ratio = 1 + jetRelativeSpeed(overturn(psi), height) / crest;
      expect(ratio).toBeGreaterThan(1.15);
      expect(ratio).toBeLessThan(1.8);
    }
  });
});

describe('the reef overturn (Teahupo\'o Reef, Part B)', () => {
  it('rounds the tube by Mead & Black\'s vortex ratio for the gradient the wave climbs', () => {
    expect(vortexRatio(1 / 4)).toBeCloseTo(0.065 * 4 + 0.821, 12);
    const shape = reefOverturn(1 / 4);
    if (shape === 'collapse' || shape === undefined) throw new Error('expected a tube');
    expect(shape.aspect).toBeCloseTo(1 / vortexRatio(1 / 4), 12);
    expect(shape.area).toBe(REEF_OVERTURN.area);
    expect(shape.tilt).toBeCloseTo((REEF_OVERTURN.tiltDegrees * Math.PI) / 180, 12);
  });

  it('throws a lip as thick as its sourced share of the wave, over the void\'s length', () => {
    const shape = reefOverturn(1 / 4);
    if (shape === 'collapse' || shape === undefined) throw new Error('expected a tube');
    const lengthOverHeight = Math.sqrt(shape.area / (LH82_AREA * shape.aspect));
    expect(shape.jetArea).toBeCloseTo(REEF_OVERTURN.lipThickness * lengthOverHeight, 12);
  });

  it('collapses without a tube beyond extreme, where a vortex would stand taller than long', () => {
    expect(vortexRatio(1 / 2.29)).toBeLessThan(REEF_OVERTURN.extremeRatio);
    expect(reefOverturn(1 / 2.29)).toBe('collapse');
  });

  it('leaves gradients gentler than the fit covers, and none at all, to the plane-slope rule', () => {
    expect(reefOverturn(1 / (REEF_OVERTURN.gentlestRun + 1))).toBeUndefined();
    expect(reefOverturn(0)).toBeUndefined();
    expect(reefOverturn(-0.1)).toBeUndefined();
    expect(reefOverturn(Number.NaN)).toBeUndefined();
  });

  it('draws a finite void floor along a round tube\'s whole length', () => {
    const shape = reefOverturn(1 / 3);
    if (shape === 'collapse' || shape === undefined) throw new Error('expected a tube');
    expect(shape.aspect).toBeLessThanOrEqual(1);
    const tube = tubeGeometry(shape, 4);
    for (let ahead = 0; ahead <= tube.length * Math.cos(tube.tilt); ahead += 0.1) {
      expect(Number.isFinite(tubeFloorDepth(tube, ahead))).toBe(true);
    }
  });
});
