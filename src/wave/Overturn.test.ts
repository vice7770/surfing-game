import { describe, expect, it } from 'vitest';
import { GRAVITY } from './dispersion';
import {
  LH82_AREA, PSI_RANGE, REEF_OVERTURN, jetFlightTime, jetRelativeSpeed, orthogonalGradient, overturn, overturnParameter, overturnSize, reefOverturn,
  tubeFloorDepth, tubeGeometry, vortexRatio,
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
  // A sea whose H0/h0 puts a 1:12 gradient beyond Pick & Feddersen's fits (ψ0 0.18) and a 1:30 one inside (0.07).
  const STEEP_SEA = 0.05;
  const psiOf = (gradient: number) => overturnParameter(gradient, STEEP_SEA);

  it('takes the void, jet and tilt from Pick & Feddersen inside their fits, and only the roundness from Mead & Black', () => {
    const psi = overturnParameter(1 / 30, STEEP_SEA);
    expect(psi).toBeLessThan(PSI_RANGE.max);
    const shape = reefOverturn(1 / 30, STEEP_SEA)!;
    expect(shape).toEqual({ ...overturn(psi), aspect: 1 / vortexRatio(1 / 30) });
  });

  // Mead & Black's surfed breaks measured vortex ratios 1.42 (Shark Island, their steepest bed) to 3.43: 1:9.2 to 1:40.
  it('rounds the tube by Mead & Black\'s vortex ratio for the gradient the wave climbs', () => {
    expect(vortexRatio(1 / 12)).toBeCloseTo(0.065 * 12 + 0.821, 12);
    const shape = reefOverturn(1 / 12, STEEP_SEA)!;
    expect(shape.aspect).toBeCloseTo(1 / vortexRatio(1 / 12), 12);
    expect(shape.area).toBe(REEF_OVERTURN.area);
    expect(shape.tilt).toBeCloseTo((REEF_OVERTURN.tiltDegrees * Math.PI) / 180, 12);
  });

  it('throws a lip as thick as its sourced share of the wave, over the void\'s length', () => {
    const shape = reefOverturn(1 / 12, STEEP_SEA)!;
    const lengthOverHeight = Math.sqrt(shape.area / (LH82_AREA * shape.aspect));
    expect(shape.jetArea).toBeCloseTo(REEF_OVERTURN.lipThickness * lengthOverHeight, 12);
  });

  it('takes a spot\'s own jet area beyond the fits, in place of the slab, and changes nothing else of the shape', () => {
    const slab = reefOverturn(1 / 12, STEEP_SEA)!;
    const own = reefOverturn(1 / 12, STEEP_SEA, 0.585)!;
    expect(psiOf(1 / 12)).toBeGreaterThan(PSI_RANGE.max);
    expect(own.jetArea).toBe(0.585);
    expect(slab.jetArea).not.toBe(0.585);
    expect({ ...own, jetArea: 0 }).toEqual({ ...slab, jetArea: 0 });
    // The ledge's roundest tube takes it too, so the slab's 0.47 H² there is the one it replaces.
    const steep = reefOverturn(1 / 2.29, STEEP_SEA)!;
    expect(steep.jetArea).toBeCloseTo(0.4694, 4);
    expect(reefOverturn(1 / 2.29, STEEP_SEA, 0.585)!.jetArea).toBe(0.585);
  });

  it('leaves the jet inside Pick & Feddersen\'s fits theirs, whatever a spot asks, and a gradient too gentle to the plane-slope rule', () => {
    expect(psiOf(1 / 30)).toBeLessThan(PSI_RANGE.max);
    expect(reefOverturn(1 / 30, STEEP_SEA, 0.585)).toEqual(reefOverturn(1 / 30, STEEP_SEA));
    expect(reefOverturn(1 / 41, STEEP_SEA, 0.585)).toBeUndefined();
  });

  it('holds a steeper bed\'s tube at the roundest one measured: nothing says a break over a submerged crest collapses', () => {
    for (const gradient of [1 / 9, 1 / 2.29, 1]) {
      const shape = reefOverturn(gradient, STEEP_SEA)!;
      expect(shape.aspect).toBeCloseTo(1 / REEF_OVERTURN.roundestRatio, 12);
      expect(shape.jetArea).toBeGreaterThan(0);
    }
  });

  it('leaves gradients gentler than any measured, and none at all, to the plane-slope rule', () => {
    expect(reefOverturn(1 / 40, STEEP_SEA)).toBeDefined();
    expect(reefOverturn(1 / 41, STEEP_SEA)).toBeUndefined();
    expect(reefOverturn(0, STEEP_SEA)).toBeUndefined();
    expect(reefOverturn(-0.1, STEEP_SEA)).toBeUndefined();
    expect(reefOverturn(Number.NaN, STEEP_SEA)).toBeUndefined();
  });

  it('draws a finite void floor along the roundest tube\'s whole length', () => {
    const shape = reefOverturn(1 / 2.29, STEEP_SEA)!;
    expect(shape.aspect).toBeLessThanOrEqual(1);
    const tube = tubeGeometry(shape, 4);
    for (let ahead = 0; ahead <= tube.length * Math.cos(tube.tilt); ahead += 0.1) {
      expect(Number.isFinite(tubeFloorDepth(tube, ahead))).toBe(true);
    }
  });
});

describe('the orthogonal gradient, measured as Mead & Black did', () => {
  // They averaged the bed's gradient along the wave's path from 2–3 m shallower to 2–3 m deeper than its breaking depth.
  it('reads a plane slope\'s own gradient, down to the shoreline for a small wave', () => {
    const plane = (s: number) => 4 - s / 4;
    expect(orthogonalGradient(plane, 4, 0.5, 100)).toBeCloseTo(1 / 4, 9);
    expect(orthogonalGradient(plane, 2, 0.5, 100)).toBeCloseTo(1 / 4, 9);
  });

  it('ends a band reaching past the ledge at its crest, whatever lies beyond: the gradient the wave climbs', () => {
    // A 1:2.29 ledge breaking at 4 m, topping out at a 1.5 m reef flat; the band's shallow end (0.7 m) is never reached.
    const ledge = (s: number) => Math.max(1.5, 4 - s / 2.29);
    // The crest is found at the samples (every 0.5 m): within a step of where it is.
    const ledgeGradient = (gradient: number) => expect(Math.abs(gradient * 2.29 - 1)).toBeLessThan(0.03);
    const open = orthogonalGradient(ledge, 3.2, 0.5, 60);
    ledgeGradient(open);
    // The same wherever the water it is sampled from ends (NaN), past the crest or before it.
    expect(orthogonalGradient((s) => (s > 20 ? Number.NaN : ledge(s)), 3.2, 0.5, 60)).toBe(open);
    ledgeGradient(orthogonalGradient((s) => (s > 4 ? Number.NaN : ledge(s)), 3.2, 0.5, 60));
    // A bigger wave's band lies on the ledge alone.
    expect(orthogonalGradient(ledge, 5, 0.5, 60)).toBeCloseTo(1 / 2.29, 9);
  });

  it('ends a band reaching deeper than the shelf at the shelf, and starts one at the break when it is already shallower', () => {
    // Up a 1:2.29 face from a 10 m shelf; a 9 m breaking depth's band (6.5–11.5 m) reaches below the shelf.
    const face = (s: number) => (s < 0 ? Math.min(10, 4 - s / 2.29) : Math.max(1.5, 4 - s / 2.29));
    // The shelf's edge is found at the samples, within a step of where it is.
    expect(Math.abs(orthogonalGradient(face, 9, 0.5, 200) * 2.29 - 1)).toBeLessThan(0.03);
  });
});
