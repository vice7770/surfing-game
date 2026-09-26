import { describe, expect, it } from 'vitest';
import type { WaveFrame } from '../physics/waveFrame';
import { RideAnalyzer, type RideReport, type RideSample } from './rideAnalysis';

const DEG = Math.PI / 180;

/** A wave travelling +z, the rider on its face riding along it toward +x. */
const FRAME: WaveFrame = {
  valid: true, directionX: 0, directionZ: 1, aheadOfCrest: 4, crestSpeed: 5, faceHeight: 1.5, faceFraction: 0.5,
  crestBreaking: 0, speedOverGround: 7, speedShoreward: 0, speedAlongCrest: 7, requiredSpeed: 7,
};

type Part = Partial<Omit<RideSample, 'wave'>> & { wave?: Partial<WaveFrame> };

/**
 * A synthetic ride's samples: a landing at t = 0, then standing samples to `seconds`
 * at intervals cycling through `gaps` (in 1/60 s), the rider moving at its speed and
 * heading; `at(t)` sets anything else.
 */
function trace(seconds: number, at: (t: number) => Part, gaps: number[] = [1]): RideSample[] {
  const samples: RideSample[] = [];
  let x = 0;
  let z = 0;
  const make = (t: number, dt: number, phase?: RideSample['phase']): RideSample => {
    const { wave, ...part } = at(t);
    const sample: RideSample = {
      t, x, z, heading: 0, speed: 7, roll: 0, load: 1, phase: phase ?? 'standing', depth: 3, breakingHere: 0,
      ...part, wave: { ...FRAME, ...wave },
    };
    x += sample.speed * Math.sin(sample.heading) * dt;
    z += sample.speed * Math.cos(sample.heading) * dt;
    return { ...sample, x, z };
  };
  samples.push(make(0, 0, 'landing'));
  let t = 0;
  for (let i = 0; t < seconds - 1e-9; i += 1) {
    const dt = gaps[i % gaps.length] / 60;
    t += dt;
    samples.push(make(t, dt));
  }
  return samples;
}

/** Heading easing from `from` by `yaw` over [start, start + duration], at a constant rate, or as a half-sine. */
function turn(from: number, yaw: number, start: number, duration: number, shape: 'constant' | 'sine' = 'constant') {
  return (t: number) => {
    const s = Math.max(0, Math.min(1, (t - start) / duration));
    return from + yaw * (shape === 'constant' ? s : (1 - Math.cos(Math.PI * s)) / 2);
  };
}

function analyze(samples: RideSample[], timeScale?: number, fall = true): RideReport {
  const analyzer = new RideAnalyzer(timeScale);
  for (const sample of samples) analyzer.push(sample);
  if (fall) {
    const last = samples[samples.length - 1];
    analyzer.push({ ...last, t: last.t + 1 / 60, phase: 'fallen' });
  }
  return analyzer.report()!;
}

describe('RideAnalyzer', () => {
  // Forsyth et al. 2024: a mean bottom turn is about 100° at 7.3 m/s, low on the face.
  const bottomTurn = () => {
    const heading = turn(30 * DEG, 100 * DEG, 0.5, 1);
    return trace(2, (t) => ({ heading: heading(t), speed: 7.3, wave: { faceFraction: 0.25 } }));
  };

  it('finds a bottom turn toward the crest low on the face, with its radius and load', () => {
    const report = analyze(bottomTurn());
    expect(report.maneuvers).toHaveLength(1);
    const [maneuver] = report.maneuvers;
    expect(maneuver.kind).toBe('bottom turn');
    expect(maneuver.yaw).toBeCloseTo(1.745, 1);
    expect(maneuver.peakYawRate).toBeCloseTo(1.745, 1);
    expect(maneuver.radius).toBeCloseTo(4.2, 1);
    expect(maneuver.lateralG).toBeCloseTo(1.3, 1);
    expect(maneuver.speedIn).toBeCloseTo(7.3, 6);
    expect(maneuver.faceFraction).toBeCloseTo(0.25, 6);
    // Timed from the ride's start: it stood at 1/60 s and turned from 0.5 s to 1.5 s.
    expect(maneuver.start).toBeCloseTo(0.5 - 1 / 60, 6);
    expect(maneuver.end).toBeCloseTo(1.5 - 1 / 60, 6);
    expect(maneuver.pocket).toBe(false);
  });

  it('finds a cutback: a long turn away from the crest high on the face that reverses along it', () => {
    const heading = turn(100 * DEG, -150 * DEG, 0.5, 1);
    const report = analyze(trace(2, (t) => ({
      heading: heading(t), wave: { faceFraction: 0.8, speedAlongCrest: 7 * Math.sin(heading(t)) },
    })));
    expect(report.maneuvers.map((m) => m.kind)).toEqual(['cutback']);
  });

  it('finds a snap: a quick, sharp turn away from the crest high on the face', () => {
    const heading = turn(100 * DEG, -90 * DEG, 0.5, 0.6, 'sine');
    const report = analyze(trace(1.6, (t) => ({
      heading: heading(t), wave: { faceFraction: 0.8, crestBreaking: 0.5, speedAlongCrest: 7 * Math.sin(heading(t)) },
    })));
    expect(report.maneuvers.map((m) => m.kind)).toEqual(['snap']);
    expect(report.maneuvers[0].peakYawRate).toBeCloseTo(4.1, 1);
    expect(report.maneuvers[0].pocket).toBe(true);
  });

  it('ignores a wobble', () => {
    const heading = turn(90 * DEG, 20 * DEG, 0.5, 0.2);
    expect(analyze(trace(1.5, (t) => ({ heading: heading(t) }))).maneuvers).toEqual([]);
  });

  it('measures the ride: time, distance, speeds and time in the pocket', () => {
    const report = analyze(trace(3, (t) => ({ speed: t < 1 ? 5 : 7, wave: { faceFraction: 0.5, crestBreaking: t < 2 ? 0.5 : 0 } })));
    expect(report.end).toBe('fell');
    expect(report.duration).toBeCloseTo(3, 1);
    expect(report.distance).toBeCloseTo(19, 0);
    expect(report.topSpeed).toBe(7);
    expect(report.meanSpeed).toBeCloseTo(19 / 3, 1);
    expect(report.pocketTime).toBeCloseTo(2, 1);
  });

  describe('ends', () => {
    const ending = (seconds: number, part: Part) => {
      const analyzer = new RideAnalyzer();
      for (const sample of trace(1 + seconds, (t) => (t > 1 ? part : {}))) analyzer.push(sample);
      return analyzer;
    };

    it('in a fall', () => {
      expect(analyze(trace(1, () => ({}))).end).toBe('fell');
    });

    it('kicked out: behind the crest for half a second', () => {
      expect(ending(0.4, { wave: { aheadOfCrest: -2 } }).riding).toBe(true);
      expect(ending(0.6, { wave: { aheadOfCrest: -2 } }).report()?.end).toBe('kicked out');
    });

    it('inside: in a bore for two seconds, or in the shallows', () => {
      expect(ending(1.9, { breakingHere: 0.8 }).riding).toBe(true);
      expect(ending(2.1, { breakingHere: 0.8 }).report()?.end).toBe('inside');
      expect(ending(0.1, { depth: 0.3 }).report()?.end).toBe('inside');
    });

    it('lost the face: too slow, or no wave, for 1.5 s', () => {
      expect(ending(1.4, { speed: 1 }).riding).toBe(true);
      expect(ending(1.6, { speed: 1 }).report()?.end).toBe('lost the face');
      expect(ending(1.6, { wave: { aheadOfCrest: 12, faceHeight: 0.1 } }).report()?.end).toBe('lost the face');
    });

    it('starts only once the rider stands from a pop-up', () => {
      const analyzer = new RideAnalyzer();
      for (const sample of trace(1, () => ({})).slice(1)) analyzer.push(sample);
      expect(analyzer.riding).toBe(false);
    });
  });

  // Review Focus 3: slow motion and dropped worker steps change nothing but the recorded time scale.
  it('reads the same ride at any time scale, and through uneven samples', () => {
    const slow = analyze(bottomTurn(), 0.4);
    const normal = analyze(bottomTurn());
    expect(slow.timeScale).toBe(0.4);
    expect({ ...slow, timeScale: 1 }).toEqual(normal);
    const heading = turn(30 * DEG, 100 * DEG, 0.5, 1);
    const uneven = analyze(trace(2, (t) => ({ heading: heading(t), speed: 7.3, wave: { faceFraction: 0.25 } }), [1, 2, 3, 4, 5, 6]));
    expect(uneven.maneuvers.map((m) => m.kind)).toEqual(['bottom turn']);
    expect(uneven.maneuvers[0].yaw).toBeCloseTo(normal.maneuvers[0].yaw, 1);
  });
});
