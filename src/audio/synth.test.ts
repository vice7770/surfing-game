import { describe, expect, it } from 'vitest';
import { LOOP_SECONDS, SOUND_IDS, isLoop, synthesize } from './synth';

const rms = (samples: Float32Array) => Math.sqrt(samples.reduce((sum, s) => sum + s * s, 0) / samples.length);

describe('synthesize', () => {
  const rate = 22050;

  it('makes every sound audible and within full scale', () => {
    for (const id of SOUND_IDS) {
      const samples = synthesize(id, rate);
      expect(rms(samples), id).toBeGreaterThan(0.005);
      expect(Math.max(...samples.map(Math.abs)), id).toBeLessThanOrEqual(1);
    }
  });

  it('makes loops of a fixed length that join without a click, and short one-shots', () => {
    for (const id of SOUND_IDS) {
      const samples = synthesize(id, rate);
      if (isLoop(id)) {
        expect(samples.length, id).toBe(Math.round(LOOP_SECONDS * rate));
        let step = 0;
        for (let i = 1; i < samples.length; i += 1) step += Math.abs(samples[i] - samples[i - 1]);
        step /= samples.length - 1;
        expect(Math.abs(samples[samples.length - 1] - samples[0]), id).toBeLessThanOrEqual(step * 3);
      } else {
        expect(samples.length, id).toBeLessThan(2 * rate);
      }
    }
  });

  it('gives the same samples for the same seed', () => {
    expect(Array.from(synthesize('roar', rate, 7).subarray(0, 64))).toEqual(Array.from(synthesize('roar', rate, 7).subarray(0, 64)));
    expect(Array.from(synthesize('roar', rate, 7).subarray(0, 64))).not.toEqual(Array.from(synthesize('roar', rate, 8).subarray(0, 64)));
  });
});
