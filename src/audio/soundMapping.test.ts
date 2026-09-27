import { describe, expect, it } from 'vitest';
import { LIP_HIT_STRIDE, ROAR_SECTORS, SOUND_EVENT_CAPACITY, STROKE_HIT_STRIDE } from '../wave/SurfZoneRunner';
import { MIN_INTERVAL, ONE_SHOT_CAP, OneShotShaper, soundTargets, type SoundFrame } from './soundMapping';

function frame(overrides: Partial<SoundFrame> = {}): SoundFrame {
  return {
    dt: 1 / 60, timeScale: 1, paused: false,
    listener: { x: 0, y: 3, z: 0, underwater: false },
    roar: new Float32Array(ROAR_SECTORS * 3),
    lipHits: new Float32Array(SOUND_EVENT_CAPACITY * LIP_HIT_STRIDE), lipHitCount: 0,
    strokeHits: new Float32Array(SOUND_EVENT_CAPACITY * STROKE_HIT_STRIDE), strokeHitCount: 0,
    significantHeight: 0.3, windSpeed: 0,
    ...overrides,
  };
}

const loop = (targets: ReturnType<typeof soundTargets>, key: string) => targets.loops.find((l) => l.key === key);

function lipHits(hits: { x: number; z: number; volume: number; speed: number }[]): Pick<SoundFrame, 'lipHits' | 'lipHitCount'> {
  const data = new Float32Array(Math.max(SOUND_EVENT_CAPACITY, hits.length) * LIP_HIT_STRIDE);
  hits.forEach((hit, i) => data.set([hit.x, hit.z, hit.volume, hit.speed, 0], i * LIP_HIT_STRIDE));
  return { lipHits: data, lipHitCount: hits.length };
}

describe('soundTargets', () => {
  it('is silent on a flat, calm sea with no board', () => {
    const targets = soundTargets(frame());
    expect(targets.loops.every((l) => l.gain === 0)).toBe(true);
    expect(targets.oneShots).toEqual([]);
    expect(targets.muffle).toBe(0);
  });

  it('roars louder where more water breaks, from where it breaks', () => {
    const roar = new Float32Array(ROAR_SECTORS * 3);
    roar.set([5, 10, -40], 2 * 3);
    roar.set([50, -20, -60], 5 * 3);
    const targets = soundTargets(frame({ roar }));
    const quiet = loop(targets, 'roar:2')!;
    const loud = loop(targets, 'roar:5')!;
    expect(loud.gain).toBeGreaterThan(quiet.gain);
    expect(quiet.gain).toBeGreaterThan(0);
    expect(loud.gain).toBeLessThanOrEqual(1);
    expect(loud.position).toEqual({ x: -20, y: 0, z: -60 });
    expect(loop(targets, 'roar:0')!.gain).toBe(0);
  });

  it('carries the distant surf with the swell and the wind with its speed', () => {
    expect(loop(soundTargets(frame({ significantHeight: 2.4 })), 'distant')!.gain)
      .toBeGreaterThan(loop(soundTargets(frame({ significantHeight: 0.9 })), 'distant')!.gain);
    const onshore = loop(soundTargets(frame({ windSpeed: 6 })), 'wind')!;
    const offshore = loop(soundTargets(frame({ windSpeed: -6 })), 'wind')!;
    expect(onshore.gain).toBeGreaterThan(0);
    expect(onshore.gain).toBeCloseTo(offshore.gain, 9);
  });

  it('rushes under a moving board, faster and higher with its speed, and sprays with its sideslip', () => {
    const slow = soundTargets(frame({ board: { x: 1, y: 0, z: 2, speed: 2, sideslip: 0 } }));
    const fast = soundTargets(frame({ board: { x: 1, y: 0, z: 2, speed: 9, sideslip: 2 } }));
    expect(loop(fast, 'rush')!.gain).toBeGreaterThan(loop(slow, 'rush')!.gain);
    expect(loop(fast, 'rush')!.rate).toBeGreaterThan(loop(slow, 'rush')!.rate);
    expect(loop(fast, 'rush')!.position).toEqual({ x: 1, y: 0, z: 2 });
    expect(loop(slow, 'rail')!.gain).toBe(0);
    expect(loop(fast, 'rail')!.gain).toBeGreaterThan(0);
    expect(loop(soundTargets(frame({ board: { x: 0, y: 0, z: 0, speed: 0.2, sideslip: 0 } })), 'rush')!.gain).toBe(0);
  });

  it('splashes a jet louder than a roller of the same water, each where it landed', () => {
    const targets = soundTargets(frame(lipHits([{ x: 3, z: -30, volume: 0.5, speed: 6 }, { x: -3, z: -35, volume: 0.5, speed: 2 }])));
    const jet = targets.oneShots.find((s) => s.id === 'lipJet')!;
    const roller = targets.oneShots.find((s) => s.id === 'lipRoller')!;
    expect(jet.gain).toBeGreaterThan(roller.gain);
    expect(jet.position).toEqual({ x: 3, y: 0, z: -30 });
  });

  it('merges a burst of landings by place, and keeps only the loudest places', () => {
    const hits = Array.from({ length: 200 }, (_, i) => ({ x: i * 2, z: -40, volume: 0.01 * (i + 1), speed: 5 }));
    const { oneShots } = soundTargets(frame(lipHits(hits)));
    expect(oneShots).toHaveLength(ONE_SHOT_CAP);
    const kept = Math.min(...oneShots.map((s) => s.gain));
    const quietest = soundTargets(frame(lipHits(hits.slice(0, 6)))).oneShots[0].gain;
    expect(kept).toBeGreaterThan(quietest);
    // Two landings a metre apart are one crash.
    expect(soundTargets(frame(lipHits([{ x: 1, z: -40, volume: 0.2, speed: 5 }, { x: 2, z: -40, volume: 0.2, speed: 5 }]))).oneShots).toHaveLength(1);
  });

  it('gathers landings in one place into a few crashes a second, keeping their energy', () => {
    const shaper = new OneShotShaper();
    const shots: number[] = [];
    for (let i = 0; i < 60; i += 1) {
      const targets = soundTargets(frame(lipHits([{ x: 3, z: -30, volume: 0.1, speed: 6 }])), shaper);
      for (const shot of targets.oneShots) shots.push(shot.gain);
    }
    expect(shots.length).toBeGreaterThanOrEqual(Math.floor(1 / MIN_INTERVAL.lipJet));
    expect(shots.length).toBeLessThanOrEqual(Math.ceil(1 / MIN_INTERVAL.lipJet) + 1);
    // Each crash carries the frames it gathered, so it is louder than one frame's landing alone.
    expect(Math.max(...shots)).toBeGreaterThan(soundTargets(frame(lipHits([{ x: 3, z: -30, volume: 0.1, speed: 6 }]))).oneShots[0].gain);
  });

  it('splashes a paddler’s pull once per stroke, not once per step', () => {
    const shaper = new OneShotShaper();
    const strokes = new Float32Array(SOUND_EVENT_CAPACITY * STROKE_HIT_STRIDE);
    strokes.set([1, 2, 5, 0], 0);
    let count = 0;
    for (let i = 0; i < 60; i += 1) count += soundTargets(frame({ strokeHits: strokes, strokeHitCount: 1 }), shaper).oneShots.length;
    expect(count).toBeLessThanOrEqual(Math.ceil(1 / MIN_INTERVAL.paddle) + 1);
    expect(count).toBeGreaterThan(0);
  });

  it('splashes a harder stroke louder', () => {
    const splash = (work: number) => {
      const strokes = new Float32Array(SOUND_EVENT_CAPACITY * STROKE_HIT_STRIDE);
      strokes.set([1, 2, work, 0], 0);
      return soundTargets(frame({ strokeHits: strokes, strokeHitCount: 1 })).oneShots.find((s) => s.id === 'paddle')!;
    };
    expect(splash(120).gain).toBeGreaterThan(splash(30).gain);
    expect(splash(30).position).toEqual({ x: 1, y: 0, z: 2 });
  });

  it('sounds the pop-up and the plunge once, on the phase change', () => {
    const board = { x: 0, y: 0, z: 0, speed: 5, sideslip: 0 };
    const popUp = soundTargets(frame({ board, ride: { phase: 'push', previousPhase: 'prone', speed: 5 } }));
    expect(popUp.oneShots.map((s) => s.id)).toEqual(['popUp']);
    const still = soundTargets(frame({ board, ride: { phase: 'push', previousPhase: 'push', speed: 5 } }));
    expect(still.oneShots).toEqual([]);
    const plunge = soundTargets(frame({ board, ride: { phase: 'fallen', previousPhase: 'standing', speed: 7 } }));
    expect(plunge.oneShots.map((s) => s.id)).toEqual(['plunge']);
  });

  // The wipeout spec: each a physical cause in the frame.
  it('snaps the leash once, when it snaps', () => {
    const board = { x: 3, y: 0, z: 4, speed: 2, sideslip: 0 };
    const ride = { phase: 'fallen' as const, previousPhase: 'fallen' as const, speed: 2 };
    const snap = soundTargets(frame({ board, ride: { ...ride, leashSnapped: true, previouslySnapped: false } }));
    expect(snap.oneShots.map((s) => s.id)).toEqual(['leashSnap']);
    expect(snap.oneShots[0].position).toEqual({ x: 3, y: 0, z: 4 });
    const after = soundTargets(frame({ board, ride: { ...ride, leashSnapped: true, previouslySnapped: true } }));
    expect(after.oneShots).toEqual([]);
  });

  it('knocks the board on the swimmer louder the harder it hits, and not at all for a brush', () => {
    const board = { x: 0, y: 0, z: 0, speed: 2, sideslip: 0 };
    const knock = (impulse: number) => soundTargets(frame({ board, ride: { phase: 'fallen', previousPhase: 'fallen', speed: 2, knock: impulse } }))
      .oneShots.find((s) => s.id === 'knock');
    expect(knock(3)).toBeUndefined();
    expect(knock(40)!.gain).toBeGreaterThan(knock(12)!.gain);
  });

  it('plunges the duck-dive once, as the press goes past half', () => {
    const board = { x: 0, y: 0, z: 0, speed: 2, sideslip: 0 };
    const ride = { phase: 'prone' as const, previousPhase: 'prone' as const, speed: 2 };
    expect(soundTargets(frame({ board, ride: { ...ride, duck: 0.6, previousDuck: 0.4 } })).oneShots.map((s) => s.id)).toEqual(['duckDive']);
    expect(soundTargets(frame({ board, ride: { ...ride, duck: 0.9, previousDuck: 0.8 } })).oneShots).toEqual([]);
  });

  it('muffles everything and bubbles under water', () => {
    const targets = soundTargets(frame({ listener: { x: 0, y: -1, z: 0, underwater: true } }));
    expect(targets.muffle).toBe(1);
    expect(loop(targets, 'bubbles')!.gain).toBeGreaterThan(0);
  });

  it('holds a quiet, muffled bed while paused, with nothing new', () => {
    const roar = new Float32Array(ROAR_SECTORS * 3);
    roar.set([50, 0, -40], 0);
    const running = soundTargets(frame({ roar, significantHeight: 2 }));
    const paused = soundTargets(frame({ roar, significantHeight: 2, paused: true, ...lipHits([{ x: 0, z: -40, volume: 1, speed: 6 }]) }));
    expect(paused.oneShots).toEqual([]);
    expect(paused.muffle).toBeGreaterThan(0.5);
    expect(loop(paused, 'roar:0')!.gain).toBeCloseTo(loop(running, 'roar:0')!.gain * 0.25, 9);
  });

  it('slows the sound with the simulation', () => {
    expect(soundTargets(frame({ timeScale: 0.4 })).playbackRate).toBe(0.4);
    expect(soundTargets(frame()).playbackRate).toBe(1);
  });
});

// The wipeout spec, Part B: under water, the rider hears the world muffled.
describe('the rider under water', () => {
  it('muffles everything while the rider\'s head is under, wherever the camera is', () => {
    const board = { x: 0, y: 0, z: 0, speed: 1, sideslip: 0 };
    expect(soundTargets(frame({ board, ride: { phase: 'fallen', previousPhase: 'fallen', speed: 1, headUnder: true } })).muffle).toBe(1);
    expect(soundTargets(frame({ board, ride: { phase: 'fallen', previousPhase: 'fallen', speed: 1, headUnder: false } })).muffle).toBe(0);
  });
});
