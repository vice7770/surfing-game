import { describe, expect, it } from 'vitest';
import type { WaveFrame } from '../physics/waveFrame';
import { RideAnalyzer, type RideReport, type RideSample } from './rideAnalysis';

const DEG = Math.PI / 180;

/** A wave travelling +z, the rider on its face riding along it toward +x. */
const FRAME: WaveFrame = {
  valid: true, directionX: 0, directionZ: 1, aheadOfCrest: 4, crestSpeed: 5, faceHeight: 1.5, faceFraction: 0.5,
  crestBreaking: 0, curlDistance: Infinity, curlSide: 0, speedOverGround: 7, speedShoreward: 0, speedAlongCrest: 7, requiredSpeed: 7,
};

/** A sample's parts; `course` moves the rider that way instead of along its heading (a board swinging about its path). */
type Part = Partial<Omit<RideSample, 'wave'>> & { wave?: Partial<WaveFrame>; course?: number };

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
    const { wave, course, ...part } = at(t);
    const base = {
      t, x, z, heading: 0, speed: 7, roll: 0, load: 1, phase: phase ?? 'standing', depth: 3, breakingHere: 0,
      ...part,
    };
    const sample: RideSample = {
      ...base,
      // Still water by default, so the speed through the water along the heading is the ground speed projected on it:
      // a board moving along a course off its heading reads less through the water than over the ground.
      throughWater: part.throughWater ?? base.speed * Math.cos((course ?? base.heading) - base.heading),
      wave: { ...FRAME, ...wave },
    };
    x += sample.speed * Math.sin(course ?? sample.heading) * dt;
    z += sample.speed * Math.cos(course ?? sample.heading) * dt;
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
  // Forsyth et al. 2024: a mean bottom turn is about 100° at 7.3 m/s, low on the face. It leaves the bottom climbing:
  // the face fraction holds at 0.25 through the turn (0.5–1.5 s) and then rises, which is the carry the turn is for.
  const CLIMB = 0.3;
  const climbing = (t: number) => 0.25 + CLIMB * Math.max(0, t - 1.5);
  const bottomTurn = (gaps?: number[]) => {
    const heading = turn(30 * DEG, 100 * DEG, 0.5, 1);
    return trace(2, (t) => ({ heading: heading(t), speed: 7.3, wave: { faceFraction: climbing(t) } }), gaps);
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

  // A board that pivots swings its heading about its path: speed x yaw rate then reads more pull than the path turns
  // with (the angulation study: 1.38 g against 0.91 g on the game's waves). The radius and the pull are the path's.
  it('reads the radius and the pull from the path, not the heading, when the board swings about its path', () => {
    const heading = turn(30 * DEG, 100 * DEG, 0.5, 1);
    const course = turn(30 * DEG, 50 * DEG, 0.5, 1);
    const report = analyze(trace(2, (t) => ({ heading: heading(t), course: course(t), speed: 7.3, wave: { faceFraction: climbing(t) } })));
    expect(report.maneuvers).toHaveLength(1);
    const [maneuver] = report.maneuvers;
    expect(maneuver.kind).toBe('bottom turn');
    expect(maneuver.yaw).toBeCloseTo(1.745, 1);
    expect(maneuver.peakYawRate).toBeCloseTo(1.745, 1);
    // 7.3 m along a path turning 50°: 8.4 m, 0.65 g.
    expect(maneuver.radius).toBeCloseTo(8.4, 1);
    expect(maneuver.lateralG).toBeCloseTo(0.65, 1);
  });

  /**
   * **The path's bend must gate the name, not only report it** (the reviewer's control of 2026-11-19). Before this,
   * `towardCrest` was read from the heading and `high` from the face fraction, while `pathYaw` and `pathLength` — the
   * actually-travelled path — were used only for the reported radius and pull. So a rider going dead straight along
   * the crest, turning nothing but its nose, scored a bottom turn with radius `Infinity` and 0 g.
   */
  describe('a run is only named when the board turned', () => {
    /** The control: dead straight along the crest at 4 m/s, flat, face fraction 0.25, the nose alone yawing 100° in 1 s. */
    const noseOnly = () => {
      const heading = turn(30 * DEG, 100 * DEG, 0.5, 1);
      return trace(2, (t) => ({ heading: heading(t), course: 90 * DEG, speed: 4, roll: 0, wave: { faceFraction: 0.25 } }));
    };

    it('does not name the nose-yaw control a bottom turn: its path never bent', () => {
      const report = analyze(noseOnly());
      expect(report.maneuvers.map((m) => m.kind)).toEqual(['unjudged']);
      const [run] = report.maneuvers;
      expect(run.unjudged).toBe('path did not bend');
      // The measurements that gave it away are still reported.
      expect(run.pathYaw).toBeCloseTo(0, 6);
      expect(run.radius).toBe(Infinity);
      expect(run.lateralG).toBeCloseTo(0, 6);
      expect(run.yaw).toBeCloseTo(1.745, 1);
    });

    // The nose turns across the wave (30° to 130°), while the path straightens back into the wave's own travel
    // (60° to −20°): its along-travel part grows, so the board bent away from the face the nose turned into.
    it('does not name a turn whose path bent away from the face its nose turned into', () => {
      const heading = turn(30 * DEG, 100 * DEG, 0.5, 1);
      const course = turn(60 * DEG, -80 * DEG, 0.5, 1);
      const report = analyze(trace(2, (t) => ({ heading: heading(t), course: course(t), speed: 7.3, wave: { faceFraction: climbing(t) } })));
      expect(report.maneuvers.map((m) => m.unjudged)).toEqual(['path turned the other way']);
    });

    it('does not name a bottom turn that never climbed after it let go', () => {
      const heading = turn(30 * DEG, 100 * DEG, 0.5, 1);
      const report = analyze(trace(2, (t) => ({ heading: heading(t), speed: 7.3, wave: { faceFraction: 0.25 } })));
      expect(report.maneuvers.map((m) => m.unjudged)).toEqual(['no carry']);
    });

    /**
     * Whether it climbed is read from the window's MEAN height, not its highest: the highest only ever rises, so a
     * peak test could not reject a run that slid down the face with a flicker in it. Here the board drops away from
     * 0.25 at 0.2 of the face a second, with two samples flicking up to 0.3 — above where it let go, so the peak says
     * it carried. The mean says it did not, and the mean is what decides.
     */
    it('is not fooled into a carry by a flicker on the way down', () => {
      const heading = turn(30 * DEG, 100 * DEG, 0.5, 1);
      const sliding = (t: number) => (t > 1.6 && t < 1.64 ? 0.3 : 0.25 - 0.2 * Math.max(0, t - 1.5));
      const report = analyze(trace(2, (t) => ({ heading: heading(t), speed: 7.3, wave: { faceFraction: sliding(t) } })));
      expect(report.maneuvers.map((m) => m.unjudged)).toEqual(['no carry']);
      expect(report.maneuvers[0].carry).toBeLessThan(0);
    });

    it('leaves a run unjudged when the ride ended before the carry could be seen', () => {
      // The turn ends at 1.5 s and the ride at 1.6 s: 0.1 s of carry, less than the 0.3 s watched.
      const heading = turn(30 * DEG, 100 * DEG, 0.5, 1);
      const report = analyze(trace(1.6, (t) => ({ heading: heading(t), speed: 7.3, wave: { faceFraction: climbing(t) } })));
      expect(report.maneuvers.map((m) => m.unjudged)).toEqual(['carry unseen']);
    });

    /**
     * The climb must be payable from the speed the board had **through the water along its heading**
     * (`boardVelocity·forward − waterFlow·forward`), not from its speed over the ground: on moving water the two
     * differ by up to 1.5x, and a bogged board reads 1.1–1.3 m/s through the water at 3.5–3.7 over still water.
     * The face fraction rises 1 per second after the release, so the 0.3 s window climbs 0.3 of a 1.5 m face: 0.45 m.
     * 1.2 m/s through the water buys v² / 2g = 0.07 m of height; the 4 m/s read over the ground would buy 0.82 m.
     */
    it('does not name a climb the speed through the water cannot pay for', () => {
      const heading = turn(30 * DEG, 100 * DEG, 0.5, 1);
      const report = analyze(trace(2, (t) => ({
        heading: heading(t), speed: 4, throughWater: 1.2, wave: { faceFraction: 0.25 + Math.max(0, t - 1.5) },
      })));
      expect(report.maneuvers.map((m) => m.unjudged)).toEqual(['speed cannot carry']);
      // The same climb, with the ground speed through the water, is a bottom turn: the column is what decides it.
      const paid = analyze(trace(2, (t) => ({
        heading: heading(t), speed: 4, throughWater: 4, wave: { faceFraction: 0.25 + Math.max(0, t - 1.5) },
      })));
      expect(paid.maneuvers.map((m) => m.kind)).toEqual(['bottom turn']);
    });

    it('leaves the turns off the top alone: they are judged as before', () => {
      const top = turn(100 * DEG, -60 * DEG, 0.5, 1);
      const topTurn = analyze(trace(2, (t) => ({ heading: top(t), wave: { faceFraction: 0.8, speedAlongCrest: 7 * Math.sin(top(t)) } })));
      expect(topTurn.maneuvers.map((m) => m.kind)).toEqual(['top turn']);
      // A nose-only run high on the face away from the crest still scores: the same hole, left for the owner to rule on.
      const nose = analyze(trace(2, (t) => ({ heading: top(t), course: 90 * DEG, wave: { faceFraction: 0.8 } })));
      expect(nose.maneuvers.map((m) => m.kind)).toEqual(['top turn']);
    });
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

    // The riding-the-wave spec: riding the whitewater in is riding; a ride ends when the wave dies under the rider.
    it('keeps riding in a bore; the wave dies in the shallows, or with no face and no broken water for 1.5 s', () => {
      expect(ending(3, { breakingHere: 0.8, wave: { faceHeight: 0.1 } }).riding).toBe(true);
      expect(ending(0.1, { depth: 0.3 }).report()?.end).toBe('wave died');
      expect(ending(1.4, { wave: { valid: false } }).riding).toBe(true);
      expect(ending(1.6, { wave: { valid: false } }).report()?.end).toBe('wave died');
      expect(ending(1.6, { wave: { faceHeight: 0.1 } }).report()?.end).toBe('wave died');
    });

    // Final review: carried by a bore with a higher crest far behind, the rider was 'lost' while riding the whitewater.
    it('does not lose the wave in broken water', () => {
      expect(ending(3, { breakingHere: 0.9, wave: { aheadOfCrest: 20, speedShoreward: 6.5, crestSpeed: 6 } }).riding).toBe(true);
    });

    // Final review: lying down (Enter) and standing again merged both rides into one report.
    it('forgets a ride the rider lies down from, and reads the next from its own stand', () => {
      const analyzer = new RideAnalyzer();
      const first = trace(3, () => ({}));
      for (const sample of first) analyzer.push(sample);
      const lay = first[first.length - 1].t;
      for (let i = 1; i <= 480; i += 1) analyzer.push({ ...first[1], t: lay + i / 60, phase: 'prone', speed: 1 });
      const again = lay + 8;
      analyzer.push({ ...first[1], t: again + 1 / 60, phase: 'landing' });
      for (let i = 2; i <= 121; i += 1) analyzer.push({ ...first[1], t: again + i / 60, phase: 'standing' });
      analyzer.push({ ...first[1], t: again + 122 / 60, phase: 'fallen' });
      const report = analyzer.report()!;
      expect(report.end).toBe('fell');
      expect(report.duration).toBeLessThan(2.2);
    });

    it('loses the wave only when leaving a live face far ahead of its crest', () => {
      const leaving = { wave: { aheadOfCrest: 12, speedShoreward: 9, crestSpeed: 6 } };
      expect(ending(1.4, leaving).riding).toBe(true);
      expect(ending(1.6, leaving).report()?.end).toBe('lost the wave');
      // Far ahead but slower than the crest: the wave is coming back to the rider.
      expect(ending(3, { wave: { aheadOfCrest: 12, speedShoreward: 4, crestSpeed: 6 } }).riding).toBe(true);
      // A slow rider on a live face is not lost: the crest passes and kicks it out, or the broken water carries it.
      expect(ending(3, { speed: 1 }).riding).toBe(true);
    });

    // Final review: in broken water every crest point breaks, so the curl reads 0 m; whitewater is not the pocket.
    it('does not count whitewater as near the curl', () => {
      expect(analyze(trace(3, () => ({ breakingHere: 0.9, wave: { curlDistance: 0 } }))).curlTime).toBe(0);
    });

    it('times the ride near the curl', () => {
      const near = analyze(trace(4, (t) => ({ wave: { curlDistance: t < 3 ? 5 : 20 } })));
      expect(near.curlTime).toBeCloseTo(3, 1);
      expect(analyze(trace(2, () => ({ wave: { curlDistance: Infinity } }))).curlTime).toBe(0);
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
    const uneven = analyze(bottomTurn([1, 2, 3, 4, 5, 6]));
    expect(uneven.maneuvers.map((m) => m.kind)).toEqual(['bottom turn']);
    expect(uneven.maneuvers[0].yaw).toBeCloseTo(normal.maneuvers[0].yaw, 1);
  });
});
