import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { surfZoneConfigFor, testWaveSwitch } from './PhysicalMode';
import { physicalSettingsFor } from './SurfConditions';
import { TEST_WAVE_RESTART_DELAY, TEST_WAVE_STARTS, TestWaveRun, testWaveOverrides } from './testWave';
import { surfZoneSea } from '../wave/SurfZoneSimulation';
import { TEST_WAVE, foamFelt } from '../wave/testWave';

const medium = { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' } as const;

describe('the test wave (`?testWave`)', () => {
  it('parses `?testWave=ride|catch` and `?testFoam=on`, and nothing else', () => {
    expect(testWaveSwitch('?testWave=ride')).toEqual({ testWave: 'ride' });
    expect(testWaveSwitch('?testWave=CATCH')).toEqual({ testWave: 'catch' });
    expect(testWaveSwitch('?testWave=ride&testFoam=on')).toEqual({ testWave: 'ride', testFoam: 'on' });
    for (const search of ['', '?testWave', '?testWave=', '?testWave=on', '?testWave=true', '?testFoam=on', '?canyonWaves=true']) {
      expect(testWaveSwitch(search), search).toEqual({});
    }
  });

  it('pins the spot, the layout, the wave and the seed whatever the menu says, and leaves the other switches be', () => {
    try {
      vi.stubGlobal('location', { search: '?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&testWave=ride' });
      // The menu's choice (here the Point at Big) is overridden whole.
      const settings = physicalSettingsFor('point', { ...medium, swell: 'big' }, { stage: 2, compute: 'cpu' });
      const config = surfZoneConfigFor(settings, 77, false, testWaveOverrides('ride'));
      expect(config).toMatchObject({
        spot: 'canyon', canyonBed: 'b', testWave: 'ride', significantHeight: TEST_WAVE.height, peakPeriod: 11, directionDegrees: 0,
        componentCount: 1, tide: 0, windSpeed: 0, startSeaTime: TEST_WAVE_STARTS.ride.seaTime,
        rider: 'new', feltFrame: 'deck', riderBody: 'two', stanceReach: 'keep', deepen: 'on',
      });
      expect(config.testFoam).toBeUndefined();
      expect(foamFelt(config)).toBe(false);
      expect(foamFelt({ ...config, testFoam: 'on' })).toBe(true);
      // One regular component, no random phase: the seed names nothing.
      const sea = surfZoneSea(config);
      expect(sea.components).toHaveLength(1);
      expect(sea.components[0]).toMatchObject({ omega: (2 * Math.PI) / 11, direction: 0, phase: 0 });
      expect(surfZoneSea({ ...config, seed: 9 }).components).toEqual(sea.components);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('leaves every sea without it as it was, and an online room pins it off', () => {
    const config = surfZoneConfigFor(physicalSettingsFor('canyon', medium, { stage: 2, compute: 'cpu' }), 2, false);
    expect(config.testWave).toBeUndefined();
    expect(foamFelt(config)).toBe(true);
    expect(surfZoneSea(config).components).toHaveLength(24);
    // main.ts's room overrides name both, so the address never reaches a room's sea.
    const room = readFileSync(new URL('../main.ts', import.meta.url), 'utf8');
    const pinned = room.slice(room.indexOf('const overrides: Partial<SurfZoneConfig> = {'));
    const block = pinned.slice(0, pinned.indexOf('\n    };'));
    expect(block).toMatch(/\btestWave: undefined\b/);
    expect(block).toMatch(/\btestFoam: undefined\b/);
  });

  it('starts the same wave again 2 s after a fall or the wave\'s end, and waits for the restored sea', () => {
    const start = 50;
    const run = new TestWaveRun('ride', new Uint8Array([1, 2, 3]), start);
    expect(run.frame({ seaTime: start + 0.5, ride: { phase: 'standing' } })).toBe(false);
    // A fall at 51 s: nothing until 2 s later.
    expect(run.frame({ seaTime: start + 1, ride: { phase: 'fallen' } })).toBe(false);
    expect(run.frame({ seaTime: start + 1 + TEST_WAVE_RESTART_DELAY - 0.02, ride: { phase: 'fallen' } })).toBe(false);
    expect(run.frame({ seaTime: start + 1 + TEST_WAVE_RESTART_DELAY, ride: { phase: 'fallen' } })).toBe(true);
    run.restarted();
    // The host still reports the old sea for a frame or two: no second restart from it.
    expect(run.frame({ seaTime: start + 3.1, ride: { phase: 'fallen' } })).toBe(false);
    expect(run.frame({ seaTime: start + 0.02, ride: { phase: 'standing' } })).toBe(false);
    // Standing to the wave's end, then 2 s more.
    expect(run.frame({ seaTime: start + run.life, ride: { phase: 'standing' } })).toBe(false);
    expect(run.frame({ seaTime: start + run.life + TEST_WAVE_RESTART_DELAY, ride: { phase: 'standing' } })).toBe(true);
    expect(run.restarts).toBe(1);
    // Every restore gets its own copy (a worker takes the bytes).
    expect(run.seaCopy()).not.toBe(run.sea);
    expect([...run.seaCopy()]).toEqual([1, 2, 3]);
  });
});
