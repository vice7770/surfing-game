import { Scene } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { FlatSurfaceSource } from '../scene/FlatSurfaceSource';
import { WaterSurface } from '../scene/WaterSurface';
import { loadBarrelCaseBytes } from '../wave/barrel/barrelLibrary';
import type { SurfZoneConfig } from '../wave/SurfZoneSimulation';
import { DEFAULT_PHYSICAL_SETTINGS, PhysicalMode, resetBarrelCaseBytes, type HostExtras } from './PhysicalMode';
import type { SurfZoneHost } from './SurfZoneHost';

// The page's fetch of the barrel files, stubbed: a module mock, so this file keeps it to itself.
vi.mock('../wave/barrel/barrelLibrary', async (actual) => ({
  ...(await actual<typeof import('../wave/barrel/barrelLibrary')>()),
  loadBarrelCaseBytes: vi.fn(async () => [new Uint8Array([1, 2, 3])]),
}));

const quick = { alongShore: 40, dx: 2, fineSpacing: 2, coarseSpacing: 4, spinUpPeriods: 1, componentCount: 8 };

/** Start the mode at each spot with a host that never gets ready, and what each start handed its host. */
async function extrasFor(spots: ('padang' | 'reef')[]) {
  const water = new WaterSurface(new FlatSurfaceSource());
  const mode = new PhysicalMode(new Scene());
  const extras: (HostExtras | undefined)[] = [];
  const capture = (config: SurfZoneConfig, extra?: HostExtras) => {
    extras.push(extra);
    return { config, ready: new Promise<void>(() => {}), dispose: () => {} } as unknown as SurfZoneHost;
  };
  for (const spot of spots) {
    void mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot }, 1, water, quick, capture);
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
  }
  mode.cancel();
  return extras;
}

describe('the barrel files for the contact (the Padang Padang spec, Part B, PR 4)', () => {
  it('hands the barrel case bytes to the host at a swept spot, and none elsewhere', async () => {
    resetBarrelCaseBytes();
    const extras = await extrasFor(['padang', 'reef']);
    expect(extras).toHaveLength(2);
    expect(Array.from(extras[0]!.barrelCases![0])).toEqual([1, 2, 3]);
    expect(extras[1]?.barrelCases).toBeUndefined();
  });

  it('fetches them once for every start', async () => {
    resetBarrelCaseBytes();
    vi.mocked(loadBarrelCaseBytes).mockClear();
    await extrasFor(['padang', 'padang']);
    expect(loadBarrelCaseBytes).toHaveBeenCalledTimes(1);
  });

  it('starts a swept spot without the contact when the files fail to load, and tries again next time', async () => {
    resetBarrelCaseBytes();
    vi.mocked(loadBarrelCaseBytes).mockRejectedValueOnce(new Error('offline'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const extras = await extrasFor(['padang', 'padang']);
    expect(extras).toHaveLength(2);
    expect(extras[0]?.barrelCases).toBeUndefined();
    expect(extras[1]?.barrelCases).toBeDefined();
    warn.mockRestore();
  });
});
