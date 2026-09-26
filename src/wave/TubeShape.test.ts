import { describe, expect, it } from 'vitest';
import { measureTube } from './TubeShape';
import { SurfZoneSimulation } from './SurfZoneSimulation';

describe('tube shape', () => {
  it('measures a tube in the crest frame: a lip the crest overruns has no length', () => {
    expect(measureTube({ x: 0, y: 2, z: 0 }, { x: 0, z: 3 }, 0, 4).length).toBe(0);
    expect(measureTube({ x: 0, y: 2, z: 0 }, { x: 0, z: 3 }, 0, 1).length).toBeCloseTo(2, 12);
  });

  it('measures a ballistic flight: length launch to landing, height the drop, width ratio their quotient', () => {
    const drop = 2;
    const flight = Math.sqrt((2 * drop) / 9.81);
    const tube = measureTube({ x: 1, y: 3, z: 10 }, { x: 1, z: 10 + 5 * flight }, 1);
    expect(tube.length).toBeCloseTo(5 * flight, 12);
    expect(tube.height).toBeCloseTo(drop, 12);
    expect(tube.widthRatio).toBeCloseTo(drop / (5 * flight), 12);
  });

  /** Tubes drawn by the reef edge's first jets: width-to-length ratios and lengths ahead of the crest, m. */
  function reefEdgeTubes(): { ratios: number[]; lengths: number[] } {
    const simulation = new SurfZoneSimulation({
      spot: 'reef', seed: 1, significantHeight: 1.5, peakPeriod: 12, directionDegrees: 0, spreading: 24, tide: 0,
      alongShore: 8, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1, componentCount: 12,
    });
    const ratios: number[] = [];
    const lengths: number[] = [];
    const landed = simulation.lip.onLand;
    simulation.lip.onLand = (x, z, volume, vx, vy, vz, flight) => {
      landed?.(x, z, volume, vx, vy, vz, flight);
      if (flight) {
        const tube = measureTube(flight.launch, { x, z }, flight.y, flight.crestSpeed * flight.age);
        ratios.push(tube.widthRatio);
        lengths.push(tube.length);
      }
    };
    // The first set reaches the edge some 40 s in.
    for (let frame = 0; frame < 60 * 30 && ratios.length < 8; frame += 1) simulation.step(1 / 30);
    return { ratios, lengths };
  }
  const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

  it('throws jets that land ahead of the advancing crest on the reef edge', () => {
    // Thrown at the crest's own speed, the lip sat on the face beneath it (P7). It now outruns its
    // crest by the speed that flies its overturn (Pick & Feddersen 2026).
    const { lengths } = reefEdgeTubes();
    expect(lengths.length).toBeGreaterThan(0);
    expect(median(lengths)).toBeGreaterThan(0.3);
  }, 60_000);

  // Measured ranges: W/L 0.25-0.48 at Surf Ranch (Feddersen et al. 2023), up to a round 1:1 (passyworld).
  // The lip flies over its overturn's void, whose floor the water meets under it (P7): at Hs 1.5 m the
  // reef edge's tubes land about 1.75 m ahead of their crest and 1.3 m below it.
  it('throws jets whose tubes land within the measured width-to-length range on the reef edge', () => {
    const { ratios } = reefEdgeTubes();
    expect(median(ratios)).toBeGreaterThanOrEqual(0.25);
    expect(median(ratios)).toBeLessThanOrEqual(1);
  }, 60_000);
});
