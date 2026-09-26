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

  // Measured ranges: W/L 0.25-0.48 at Surf Ranch (Feddersen et al. 2023), up to a round 1:1 (passyworld).
  // P7 finding: thrown at the crest's own speed (JET_SPEED_RATIO 1), the lip sits on the face beneath
  // it and lands 0-0.16 m ahead of the crest: no tube opens. A tube needs a jet that outruns the face,
  // or a jet leaving a face gone vertical; both wait for measured jet kinematics (plan P7, Task 2).
  it.fails('throws jets whose tubes land within the measured width-to-length range on the reef edge', () => {
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
    for (let frame = 0; frame < 30 * 30 && ratios.length < 8; frame += 1) simulation.step(1 / 30);
    expect(ratios.length).toBeGreaterThan(0);
    const sorted = [...ratios].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    console.info(`reef edge tubes, width-to-length: ${sorted.map((r) => r.toFixed(2)).join(', ')}; lengths ahead of the crest, m: ${lengths.map((l) => l.toFixed(2)).join(', ')}`);
    // The lip lands ahead of the advancing crest: there is a tube at all.
    expect([...lengths].sort((a, b) => a - b)[Math.floor(lengths.length / 2)]).toBeGreaterThan(0);
    expect(median).toBeGreaterThanOrEqual(0.25);
    expect(median).toBeLessThanOrEqual(1);
  }, 60_000);
});
