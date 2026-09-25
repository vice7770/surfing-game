import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { DEFAULT_WAVE_SETTINGS, InteractiveWaterField } from './WaveModel';

describe('InteractiveWaterField', () => {
  it('repeats water evolution for the same seed, settings, and fixed steps', () => {
    const first = new InteractiveWaterField(42, { ...DEFAULT_WAVE_SETTINGS });
    const second = new InteractiveWaterField(42, { ...DEFAULT_WAVE_SETTINGS });
    for (let frame = 0; frame < 120; frame += 1) {
      first.step(1 / 60);
      second.step(1 / 60);
    }
    expect(first.sample(1.25, -4).height).toBe(second.sample(1.25, -4).height);
    expect(first.sample(1.25, -4).normal.toArray()).toEqual(second.sample(1.25, -4).normal.toArray());
    expect(first.sample(1.25, -4).velocity.toArray()).toEqual(second.sample(1.25, -4).velocity.toArray());
  });

  it('propagates initialized wave energy in its configured direction', () => {
    const wave = new InteractiveWaterField(9, { ...DEFAULT_WAVE_SETTINGS, speed: 2.5 });
    const initial = wave.crestZ();
    for (let frame = 0; frame < 60; frame += 1) wave.step(1 / 60);
    expect(wave.crestZ()).toBeGreaterThan(initial + 1);
    expect(wave.crestZ()).toBeLessThan(initial + 5);
  });

  it('advances a faster configured long wave farther before the break', () => {
    const slow = new InteractiveWaterField(9, { ...DEFAULT_WAVE_SETTINGS, speed: 2 });
    const fast = new InteractiveWaterField(9, { ...DEFAULT_WAVE_SETTINGS, speed: 4 });
    const slowStart = slow.crestZ();
    const fastStart = fast.crestZ();
    for (let frame = 0; frame < 120; frame += 1) {
      slow.step(1 / 60);
      fast.step(1 / 60);
    }
    expect(slow.crestZ()).toBeGreaterThan(slowStart + 2);
    expect(fast.crestZ() - fastStart).toBeGreaterThan(slow.crestZ() - slowStart + 1.5);
  });

  it('keeps flat still water at rest over a sloping shelf', () => {
    const wave = new InteractiveWaterField(5, {
      height: 0, period: 8, speed: 3, shelfStrength: 1,
    });
    expect(wave.depthAt(0, 25)).toBeLessThan(wave.depthAt(0, -18) * 0.5);
    for (let frame = 0; frame < 300; frame += 1) wave.step(1 / 60);
    for (const z of [-18, -4, 4, 12, 25]) {
      expect(wave.heightAt(0, z)).toBe(0);
      expect(wave.sample(0, z).velocity.length()).toBe(0);
    }
  });

  it('slows a traveling crest over the shelf without unbounded energy', () => {
    const flat = new InteractiveWaterField(3, { ...DEFAULT_WAVE_SETTINGS });
    const shelf = new InteractiveWaterField(3, { ...DEFAULT_WAVE_SETTINGS, shelfStrength: 1 });
    const initialEnergy = shelf.totalEnergy();
    for (let frame = 0; frame < 720; frame += 1) {
      flat.step(1 / 60);
      shelf.step(1 / 60);
    }
    expect(flat.crestZ() - shelf.crestZ()).toBeGreaterThan(1);
    expect(Number.isFinite(shelf.totalEnergy())).toBe(true);
    expect(shelf.totalEnergy()).toBeLessThan(initialEnergy);
  }, 20_000);

  it('produces a different initialized surface shape for a different seed', () => {
    const first = new InteractiveWaterField(21, { ...DEFAULT_WAVE_SETTINGS });
    const next = new InteractiveWaterField(22, { ...DEFAULT_WAVE_SETTINGS });
    expect(first.sample(3, -15).height).not.toBe(next.sample(3, -15).height);
  });

  it('keeps height, slopes, normals, and surface velocity finite during evolution', () => {
    const wave = new InteractiveWaterField(123, { height: 2.4, period: 12, speed: 5 });
    for (let frame = 0; frame < 360; frame += 1) wave.step(1 / 60);
    const sample = wave.sample(5.5, 8);
    expect(Number.isFinite(sample.height)).toBe(true);
    expect(Number.isFinite(sample.slopeX)).toBe(true);
    expect(Number.isFinite(sample.slopeZ)).toBe(true);
    expect(sample.normal.toArray().every(Number.isFinite)).toBe(true);
    expect(sample.velocity.toArray().every(Number.isFinite)).toBe(true);
    expect(Math.abs(sample.height)).toBeLessThan(6);
  });

  it('reset restores exactly the initial incoming wave state', () => {
    const wave = new InteractiveWaterField(2, { ...DEFAULT_WAVE_SETTINGS });
    const initial = wave.sample(0, -18);
    for (let frame = 0; frame < 90; frame += 1) wave.step(1 / 60);
    wave.reset();
    expect(wave.time).toBe(0);
    expect(wave.sample(0, -18).height).toBe(initial.height);
    expect(wave.sample(0, -18).velocity.toArray()).toEqual(initial.velocity.toArray());
  });

  it('applies the hull reaction opposite to the force on the board', () => {
    const wave = new InteractiveWaterField(8, { height: 0, period: 8, speed: 0 });
    const before = wave.sample(0, 0).velocity.z;
    wave.applyBoardReaction(0, 0, new Vector3(0, 0, 80), 1 / 60);
    expect(wave.sample(0, 0).velocity.z).toBeLessThan(before);
  });

  it('spreads vertical hull pressure outward through the shallow-water flow', () => {
    const wave = new InteractiveWaterField(8, { height: 0, period: 8, speed: 0 });
    wave.applyBoardReaction(0, 0, new Vector3(0, 800, 0), 1 / 60);
    expect(wave.sample(0.5, 0).velocity.x).toBeGreaterThan(0);
    expect(wave.sample(-0.5, 0).velocity.x).toBeLessThan(0);
  });

  it('tracks bounded wave energy through propagation and breaking', () => {
    const wave = new InteractiveWaterField(2, { ...DEFAULT_WAVE_SETTINGS });
    const initial = wave.totalEnergy();
    for (let frame = 0; frame < 360; frame += 1) wave.step(1 / 60);
    const earlyLoss = wave.breakingDissipation;
    for (let frame = 360; frame < 600; frame += 1) wave.step(1 / 60);
    const after = wave.totalEnergy();
    expect(Number.isFinite(after)).toBe(true);
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(initial);
    expect(wave.breakingDissipation).toBeGreaterThan(0);
    expect(wave.breakingDissipation).toBeGreaterThanOrEqual(earlyLoss);
    expect(wave.breakingDissipation).toBeLessThan(initial - after);
    wave.reset();
    expect(wave.breakingDissipation).toBe(0);
  });

  it('removes energy compared with the same wave without breaker damping', () => {
    const breaking = new InteractiveWaterField(2, { ...DEFAULT_WAVE_SETTINGS });
    const unbroken = new InteractiveWaterField(2, { ...DEFAULT_WAVE_SETTINGS });
    unbroken.breakingAt = () => 0;
    for (let frame = 0; frame < 600; frame += 1) {
      breaking.step(1 / 60);
      unbroken.step(1 / 60);
    }
    expect(breaking.breakingDissipation).toBeGreaterThan(0);
    expect(unbroken.breakingDissipation).toBe(0);
    expect(breaking.totalEnergy()).toBeLessThan(unbroken.totalEnergy());
  }, 20_000);

  it('keeps current in the shared field and responds to wind forcing', () => {
    const still = new InteractiveWaterField(4, { height: 0, period: 8, speed: 0, currentX: 0.4, windX: 0 });
    const windy = new InteractiveWaterField(4, { height: 0, period: 8, speed: 0, currentX: 0.4, windX: 0.06 });
    expect(still.sample(0, 0).velocity.x).toBeCloseTo(0.4, 2);
    for (let frame = 0; frame < 120; frame += 1) {
      still.step(1 / 60);
      windy.step(1 / 60);
    }
    expect(windy.sample(0, 0).velocity.x).toBeGreaterThan(still.sample(0, 0).velocity.x + 0.05);
  });

  it('peels across the physical crest while leaving the unbroken face rideable', () => {
    const wave = new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS });
    for (let frame = 0; frame < 480; frame += 1) wave.step(1 / 60);
    const crest = wave.crestZ();
    const peakBreaking = (x: number): number => {
      let peak = 0;
      for (let z = crest - 3; z <= crest + 3; z += 0.5) {
        peak = Math.max(peak, wave.sample(x, z).breaking);
      }
      return peak;
    };
    expect(peakBreaking(-15)).toBeGreaterThan(0.05);
    expect(peakBreaking(10)).toBe(0);
    expect(wave.breakingFrontX).toBeGreaterThan(-15);
    expect(wave.breakingFrontX).toBeLessThan(10);
    expect(wave.breakingDissipation).toBeGreaterThan(0);
  });

  it('makes a marginal spilling crest more responsive over the shelf', () => {
    const flat = new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS });
    const shelf = new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS, shelfStrength: 1 });
    for (let frame = 0; frame < 600; frame += 1) {
      flat.step(1 / 60);
      shelf.step(1 / 60);
    }
    const crestZ = 12;
    const marginalSlope = 0.03;
    expect(flat.breakingAt(0, crestZ, marginalSlope, crestZ)).toBe(0);
    expect(shelf.breakingAt(0, crestZ, marginalSlope, crestZ)).toBeGreaterThan(0);
    expect(shelf.breakingAt(0, crestZ, 10, crestZ)).toBeLessThanOrEqual(1);
  });

  it('reports the steepest shelf bed slope for the physics readout', () => {
    expect(new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS, shelfStrength: 0 }).maxBedSlope()).toBe(0);
    const reef = new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS, height: 2.2, shelfStrength: 0.65 });
    const analytic = (reef.meanDepth * 0.58 * 0.65 * 1.5) / 28;
    expect(reef.maxBedSlope() / analytic).toBeCloseTo(1, 2);
  });
});
