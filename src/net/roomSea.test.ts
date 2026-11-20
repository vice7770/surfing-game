import { describe, expect, it } from 'vitest';
import { roomSurfZoneConfig } from './roomSea';

describe('roomSurfZoneConfig', () => {
  it('builds the same stage 2, 64-component sea for every player', () => {
    const config = roomSurfZoneConfig({ spot: 'canyon', conditions: { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, seed: 42 }, 123);
    expect(config).toMatchObject({
      spot: 'canyon', seed: 42, stage: 2, compute: 'auto', componentCount: 64, startSeaTime: 123,
      significantHeight: 1.4, peakPeriod: 11, tide: 0, windSpeed: 0,
    });
  });

  // The pool-barrel decisions (2026-10-31): every player builds the room's Wave Pool floor; a room without waves runs Training.
  it("builds the Wave Pool's Barrel floor for a Barrel room, and Training for a room without waves", () => {
    const conditions = { swell: 'big', tide: 'mid', wind: 'calm', time: 'midday' } as const;
    const training = roomSurfZoneConfig({ spot: 'pool', conditions, seed: 3 }, 0, 'cpu');
    expect(training.poolWaves).toBeUndefined();
    expect(roomSurfZoneConfig({ spot: 'pool', conditions: { ...conditions, waves: 'training' }, seed: 3 }, 0, 'cpu')).toEqual(training);
    const barrel = roomSurfZoneConfig({ spot: 'pool', conditions: { ...conditions, waves: 'barrel' }, seed: 3 }, 0, 'cpu');
    expect(barrel).toMatchObject({ spot: 'pool', poolWaves: 'barrel', peakPeriod: training.peakPeriod });
    expect(barrel.significantHeight).toBeGreaterThan(training.significantHeight);
    expect(roomSurfZoneConfig({ spot: 'reef', conditions: { ...conditions, waves: 'barrel' }, seed: 3 }, 0, 'cpu').poolWaves).toBeUndefined();
  });

  it('ignores the time of day, which only lights the scene', () => {
    const dawn = roomSurfZoneConfig({ spot: 'point', conditions: { swell: 'small', tide: 'low', wind: 'offshore', time: 'dawn' }, seed: 1 }, 0);
    const dusk = roomSurfZoneConfig({ spot: 'point', conditions: { swell: 'small', tide: 'low', wind: 'offshore', time: 'sunset' }, seed: 1 }, 0);
    expect(dawn).toEqual(dusk);
  });

  it('builds the practice groundswell as the Surf screen does', () => {
    const config = roomSurfZoneConfig({ spot: 'canyon', conditions: { swell: 'practice', tide: 'mid', wind: 'calm', time: 'midday' }, seed: 5 }, 0, 'cpu');
    expect(config).toMatchObject({ significantHeight: 1.4, peakPeriod: 12, bandwidth: 0.08, directionDegrees: 0, compute: 'cpu', heightAt: 'edge' });
    // A buoy swell is given in deep water (the wave-sizes spec).
    const big = roomSurfZoneConfig({ spot: 'point', conditions: { swell: 'big', tide: 'mid', wind: 'calm', time: 'midday' }, seed: 5 }, 0, 'cpu');
    expect(big.heightAt ?? 'deep').toBe('deep');
  });
});
