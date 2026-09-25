import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_WAVE_SETTINGS, InteractiveWaterField } from '../wave/WaveModel';
import { LegacySurfWater, createWaterSample } from './SurfWater';

function steppedField(seed = 3) {
  const wave = new InteractiveWaterField(seed, { ...DEFAULT_WAVE_SETTINGS, shelfStrength: 0.4 });
  for (let step = 0; step < 240; step += 1) wave.step(1 / 60);
  return wave;
}

describe('LegacySurfWater', () => {
  it('returns exactly what the legacy field samples', () => {
    const wave = steppedField();
    const water = new LegacySurfWater(wave);
    const out = createWaterSample();
    for (const [x, z] of [[0.3, 2.1], [-4.4, 10.7], [6.2, -12.5], [1.1, 30.2]]) {
      const legacy = wave.sample(x, z);
      water.sampleAt(x, -0.4, z, out);
      expect(out.surfaceY).toBe(legacy.height);
      expect([out.slopeX, out.slopeZ]).toEqual([legacy.slopeX, legacy.slopeZ]);
      expect([out.normalX, out.normalY, out.normalZ]).toEqual([legacy.normal.x, legacy.normal.y, legacy.normal.z]);
      expect([out.flowX, out.flowY, out.flowZ]).toEqual([legacy.velocity.x, legacy.velocity.y, legacy.velocity.z]);
      expect(out.breaking).toBe(legacy.breaking);
      expect(out.regime).toBe('surface');
      expect(out.stillDepth).toBe(wave.depthAt(x, z));
      expect(out.bedY).toBe(-wave.depthAt(x, z));
      expect(out.wet).toBe(true);
      expect(out.outsideDomain).toBe(false);
      expect(water.surfaceAt(x, z)).toBe(wave.heightAt(x, z));
    }
  });

  it('says when a point lies outside the legacy grid instead of passing off a flat sea', () => {
    const wave = steppedField();
    const water = new LegacySurfWater(wave);
    const out = water.sampleAt(wave.xMin - 1, 0, 0, createWaterSample());
    expect(out.outsideDomain).toBe(true);
    expect(water.sampleAt(0, 0, wave.zMin + (wave.nz - 1) * wave.spacing + 0.5, createWaterSample()).outsideDomain).toBe(true);
  });

  it('pushes the board’s reaction impulse into the field exactly as the force reaction did', () => {
    const force = new Vector3(120, 900, -340);
    const dt = 1 / 60;
    const byForce = steppedField(5);
    const byImpulse = steppedField(5);
    byForce.applyBoardReaction(0.4, 6.3, force, dt);
    new LegacySurfWater(byImpulse).addReaction(0.4, 6.3, force.x * dt, force.y * dt, force.z * dt);
    for (let step = 0; step < 30; step += 1) {
      byForce.step(dt);
      byImpulse.step(dt);
    }
    expect(byImpulse.heightAt(1, 8)).toBe(byForce.heightAt(1, 8));
    expect(byImpulse.sample(0.4, 6.3).velocity.toArray()).toEqual(byForce.sample(0.4, 6.3).velocity.toArray());
  });
});
