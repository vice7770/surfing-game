import { describe, expect, it } from 'vitest';
import { BREATH, Breathing } from './breathing';
import { createRiderVisualState, type RiderVisualState } from './riderVisualState';

const LEVER = 0.22;

/** Steps `breathing` through `seconds` at `rate` Hz from `start`, the state shaped by `shape(t, state)`; returns the last extension. */
function breathe(breathing: Breathing, seconds: number, rate: number, shape: (t: number, state: RiderVisualState) => void, start = 0): number {
  const state = createRiderVisualState();
  let extension = 0;
  for (let i = 0; i <= Math.round(seconds * rate); i += 1) {
    const t = start + i / rate;
    shape(t, state);
    state.clock = t;
    extension = breathing.update(state, LEVER);
  }
  return extension;
}

const resting = (_t: number, state: RiderVisualState) => {
  state.phase = 'prone';
  state.stroking = 0;
};
const paddling = (_t: number, state: RiderVisualState) => {
  state.phase = 'prone';
  state.stroking = 1;
};

describe('breathing (step 4)', () => {
  it('breathes 16 times a minute at rest, the chest barely moving (the clinical 12–20; Yang et al. 2022\'s quiet breath)', () => {
    const breathing = new Breathing();
    let most = 0;
    breathe(breathing, 20, 60, resting);
    for (let i = 0; i < 300; i += 1) most = Math.max(most, Math.abs(breathe(breathing, 1 / 60, 60, resting, 20 + i / 60)));
    expect(breathing.rate).toBeCloseTo(BREATH.restRate, 6);
    // The sternum's travel, 1.5 % of a 0.2 m chest, turned about the lever: a fraction of a degree each way.
    expect(most * LEVER).toBeLessThan(0.005);
    expect(most).toBeGreaterThan(0);
  });

  it('breathes faster and deeper after 20 s of paddling, and eases back at rest (Blackie et al. 1991: 36 ± 9 at the most)', () => {
    const breathing = new Breathing();
    breathe(breathing, 20, 60, paddling);
    expect(breathing.rate).toBeGreaterThan(28);
    expect(breathing.rate).toBeLessThanOrEqual(BREATH.fullRate);
    let most = 0;
    for (let i = 0; i < 180; i += 1) most = Math.max(most, Math.abs(breathe(breathing, 1 / 60, 60, paddling, 20 + i / 60)));
    expect(most * LEVER).toBeGreaterThan(0.015);
    breathe(breathing, 30, 60, resting, 23);
    expect(breathing.rate).toBeLessThan(26);
    breathe(breathing, 90, 60, resting, 53);
    expect(breathing.rate).toBeLessThan(18);
  });

  it('works up with the legs pumping standing, and with swimming', () => {
    const pumping = new Breathing();
    breathe(pumping, 20, 60, (t, state) => {
      state.phase = 'standing';
      // The pelvis dropping and rising 0.2 m at 1.25 Hz: the legs at 0.8 m/s at the most.
      const height = 0.8 - 0.1 * (1 - Math.cos(2 * Math.PI * 1.25 * t));
      state.boardPosition.set(0, 0, 0);
      state.boardQuaternion.identity();
      state.points[0].set(0, height, 0);
    });
    expect(pumping.rate).toBeGreaterThan(24);
    const swimming = new Breathing();
    breathe(swimming, 20, 60, (_t, state) => {
      state.phase = 'fallen';
      state.swim.stroking = true;
    });
    expect(swimming.rate).toBeGreaterThan(28);
  });

  it('holds the breath under water and resumes at the surface, gasping for what it held', () => {
    const breathing = new Breathing();
    breathe(breathing, 5, 60, resting);
    const held = breathe(breathing, 3, 60, (_t, state) => {
      state.phase = 'fallen';
      state.swim.under = true;
      state.breath = 0.5;
    }, 5);
    const still = breathe(breathing, 1, 60, (_t, state) => {
      state.phase = 'fallen';
      state.swim.under = true;
      state.breath = 0.4;
    }, 8);
    expect(still).toBeCloseTo(held, 6);
    breathe(breathing, 10, 60, (_t, state) => {
      state.phase = 'fallen';
      state.swim.under = false;
      state.breath = 0.4;
    }, 9);
    expect(breathing.rate).toBeGreaterThan(BREATH.restRate + 5);
  });

  it('breathes alike at 30, 60 and 144 Hz, and keeps its breath at a clock standing still', () => {
    const at = (rate: number) => {
      const breathing = new Breathing();
      return breathe(breathing, 10, rate, (t, state) => {
        state.phase = 'prone';
        state.stroking = t < 5 ? 1 : 0;
      });
    };
    const fine = at(144);
    expect(Math.abs(at(30) - fine)).toBeLessThan(0.02 * Math.abs(fine) + 1e-4);
    expect(Math.abs(at(60) - fine)).toBeLessThan(0.01 * Math.abs(fine) + 1e-4);
    const breathing = new Breathing();
    const last = breathe(breathing, 3, 60, paddling);
    expect(breathe(breathing, 0, 60, paddling, 3)).toBeCloseTo(last, 12);
  });

  it('starts at rest after a reset', () => {
    const breathing = new Breathing();
    breathe(breathing, 20, 60, paddling);
    breathing.reset();
    breathe(breathing, 0, 60, paddling, 20);
    expect(breathing.rate).toBeCloseTo(BREATH.restRate, 6);
  });
});
