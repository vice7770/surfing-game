import { describe, expect, it, vi } from 'vitest';
import { Quaternion, Scene, Vector3 } from 'three';
import { WaterSurface } from '../scene/WaterSurface';
import { FlatSurfaceSource } from '../scene/FlatSurfaceSource';
import { SPOT_OPTICS } from '../scene/waterOptics';
import { stormSwell } from '../wave/StormSwell';
import { PARTICLE_BUDGETS } from '../wave/particleBudget';
import {
  DEFAULT_PHYSICAL_SETTINGS, GPU_TIER_COMPONENTS, LAB_SPREADING_FLOOR, PADANG_PRACTICE_SWELL, PRACTICE_SWELL, PhysicalMode, REEF_PRACTICE_SWELL,
  REFRACTED_SPREADING, TANK_SWELL_LIMITS, chopForWind, formatPhysicalReadout, labHeightLimit, labRawSea, labSpreadingFor, practiceSwell, spreadingFor,
  canyonAgeJoinSwitch, canyonBeachLookSwitch, canyonBedSwitch, canyonReefSeqSwitch, canyonTubeSwitch, onsetSwitch, startOutSwitch, strokeSwitch, surfaceMotionSwitch, swimSwitch, frothSwitch, extensionSwitch, boardSpraySwitch, spraySheetSwitch, duckDrawnOld, surfZoneConfigFor, tubeShapeSwitch, swellFor, swellHeightLimit, type PhysicalSettings,
} from './PhysicalMode';
import { SURF_SPOTS, physicalSettingsFor, swellChoice } from './SurfConditions';
import { LocalSurfZone, type SurfZoneHost } from './SurfZoneHost';
import { rideLineupOffset, type SurfZoneConfig } from '../wave/SurfZoneSimulation';
import { encodeSurfZoneState } from '../wave/surfZoneState';

const quick = { alongShore: 40, dx: 2, fineSpacing: 2, coarseSpacing: 4, spinUpPeriods: 1, componentCount: 8 };

describe('PhysicalMode', () => {
  it('uses the lighter Padang grid for ordinary play and preserves supplied sea configurations', async () => {
    const water = new WaterSurface(new FlatSurfaceSource());
    const mode = new PhysicalMode(new Scene());
    const warnings = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const capture = (spot: 'padang' | 'point', overrides: Partial<SurfZoneConfig> = {}) =>
      new Promise<SurfZoneConfig>((resolve) => {
        void mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot }, 5, water, overrides, (config) => {
          resolve(config);
          return { config, ready: new Promise<void>(() => {}), dispose: () => {} } as unknown as SurfZoneHost;
        });
      });
    try {
      expect(await capture('padang')).toMatchObject({ dx: 2, fineSpacing: 1 });
      mode.cancel();
      const legacyRoom = await capture('padang', { seed: 42, componentCount: 24 });
      expect(legacyRoom.dx).toBeUndefined();
      expect(legacyRoom.fineSpacing).toBeUndefined();
      mode.cancel();
      expect(await capture('padang', { dx: 1, fineSpacing: 0.5 })).toMatchObject({ dx: 1, fineSpacing: 0.5 });
      mode.cancel();
      expect((await capture('point')).dx).toBeUndefined();
    } finally {
      mode.cancel();
      water.dispose();
      warnings.mockRestore();
    }
  });

  it('turns the Canyon\'s spilling lip off for `?spillingCurl=0` (a dev switch), and leaves it on otherwise', async () => {
    const water = new WaterSurface(new FlatSurfaceSource());
    const mode = new PhysicalMode(new Scene());
    const capture = () => new Promise<SurfZoneConfig>((resolve) => {
      void mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'canyon' }, 5, water, {}, (config) => {
        resolve(config);
        return { config, ready: new Promise<void>(() => {}), dispose: () => {} } as unknown as SurfZoneHost;
      });
    });
    try {
      vi.stubGlobal('location', { search: '?spillingCurl=0' });
      expect((await capture()).spillingCurl).toBe(false);
      mode.cancel();
      vi.stubGlobal('location', { search: '' });
      expect((await capture()).spillingCurl).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
      mode.cancel();
      water.dispose();
    }
  });

  it('starts the rider `?startOut=<m>` seaward of the take-off (a dev switch), and at the spot\'s own start otherwise', () => {
    expect(startOutSwitch('?startOut=11')).toEqual({ startOut: 11 });
    expect(startOutSwitch('?startOut=-2.5')).toEqual({ startOut: -2.5 });
    for (const search of ['', '?startOut', '?startOut=', '?startOut=far', '?startOut=Infinity']) expect(startOutSwitch(search), search).toEqual({});
    const big = physicalSettingsFor('canyon', { swell: 'big', tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' });
    try {
      vi.stubGlobal('location', { search: '?startOut=6' });
      const compared = surfZoneConfigFor(big, 5, false);
      expect(compared.startOut).toBe(6);
      // The short arm's start at the Canyon's Big, 6 m out, in place of its own (11 m since canyon-long-wave).
      expect(rideLineupOffset(compared)).toBe(6);
      vi.stubGlobal('location', { search: '' });
      const own = surfZoneConfigFor(big, 5, false);
      expect(own.startOut).toBeUndefined();
      // Its own: 3 m out at Big's beach peak since canyon-beach-break (11 m on the reef before).
      expect(rideLineupOffset(own)).toBe(3);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  // The `?canyonTube=on` and `?tubeShape=c` dev switches: the Canyon's reef with its swept tubes (its default from the tube
  // from Basilisk, 2026-10-22, until canyon-beach-break, 2026-10-23, when the owner turned it off: "spilling waves are
  // supposed to be the default for the Canyon"), and the authored bounded-C in place of the cases' own frames; an online
  // room's config keeps the defaults.
  it('turns the Canyon\'s tubes on with `?canyonTube=on`, and draws the bounded-C with `?tubeShape=c` (dev switches)', () => {
    expect(canyonTubeSwitch('?canyonTube=on')).toEqual({ sweptBarrel: true });
    for (const search of ['', '?canyonTube', '?canyonTube=off']) expect(canyonTubeSwitch(search), search).toEqual({});
    expect(tubeShapeSwitch('?tubeShape=c')).toEqual({ tubeShape: 'bounded-C' });
    expect(tubeShapeSwitch('?tubeShape=basilisk')).toEqual({});
    const canyon = physicalSettingsFor('canyon', { swell: 'big', tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' });
    const padang = physicalSettingsFor('padang', { swell: 'big', tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' });
    try {
      expect(surfZoneConfigFor(canyon, 5, false).sweptBarrel).toBeUndefined();
      vi.stubGlobal('location', { search: '?canyonTube=on' });
      expect(surfZoneConfigFor(canyon, 5, false).sweptBarrel).toBe(true);
      // Only the Canyon's: Padang Padang keeps its barrel.
      expect(surfZoneConfigFor(padang, 5, false).sweptBarrel).toBeUndefined();
      expect(surfZoneConfigFor(canyon, 5, false, { sweptBarrel: undefined }).sweptBarrel).toBeUndefined();
      vi.stubGlobal('location', { search: '?tubeShape=c' });
      expect(surfZoneConfigFor(padang, 5, false).tubeShape).toBe('bounded-C');
      expect(surfZoneConfigFor(padang, 5, false, { tubeShape: 'basilisk' }).tubeShape).toBe('basilisk');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  // The `?canyonBed=old` dev switch (the reef bed, 2026-10-22; repointed by canyon-b, 2026-11-01): main's Canyon from before
  // version B (the reef with a beach peak either side), carried in the config, so the worker builds that bed and the
  // seabed is drawn from it; absent or anything else, today's (version B).
  it('runs the Canyon\'s old bed with `?canyonBed=old` (a dev switch), and the reef bed otherwise', () => {
    expect(canyonBedSwitch('?canyonBed=old')).toEqual({ canyonBed: 'old' });
    for (const search of ['', '?canyonBed', '?canyonBed=', '?canyonBed=reef', '?canyonBed=OLD']) expect(canyonBedSwitch(search), search).toEqual({});
    const medium = physicalSettingsFor('canyon', { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' });
    try {
      vi.stubGlobal('location', { search: '?canyonBed=old' });
      expect(surfZoneConfigFor(medium, 5, false).canyonBed).toBe('old');
      // A config that fixes the bed (an online room's: the reef bed on every client) keeps it.
      expect(surfZoneConfigFor(medium, 5, false, { canyonBed: 'reef' }).canyonBed).toBe('reef');
      vi.stubGlobal('location', { search: '' });
      expect(surfZoneConfigFor(medium, 5, false).canyonBed).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  // The `?canyonBeachLook=off` dev switch (canyon-beach-look): the Canyon's beach peaks drawn as the solver breaks them,
  // carried in the config to the worker at the Canyon only; online rooms run the default.
  it('draws the Canyon beach peaks as the solver breaks them with `?canyonBeachLook=off` (a dev switch), and as the reef otherwise', () => {
    expect(canyonBeachLookSwitch('?canyonBeachLook=off')).toEqual({ canyonBeachLook: false });
    for (const search of ['', '?canyonBeachLook', '?canyonBeachLook=on', '?canyonBeachLook=0']) expect(canyonBeachLookSwitch(search), search).toEqual({});
    const conditions = { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' } as const;
    try {
      vi.stubGlobal('location', { search: '?canyonBeachLook=off' });
      expect(surfZoneConfigFor(physicalSettingsFor('canyon', conditions, { stage: 2, compute: 'cpu' }), 5, false).canyonBeachLook).toBe(false);
      expect(surfZoneConfigFor(physicalSettingsFor('beach', conditions, { stage: 2, compute: 'cpu' }), 5, false).canyonBeachLook).toBeUndefined();
      expect(surfZoneConfigFor(physicalSettingsFor('canyon', conditions, { stage: 2, compute: 'cpu' }), 5, false, { canyonBeachLook: undefined }).canyonBeachLook).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  // The `?stroke=old` dev switch (canyon-catch, 2026-10-29): every spot's paddler with hands broadside to water that
  // outruns them, as before, carried in the config to the worker; anything else leaves the default (the feathering hand).
  it('paddles with the stroke as before canyon-catch with `?stroke=old` (a dev switch), and today\'s otherwise', () => {
    expect(strokeSwitch('?stroke=old')).toEqual({ stroke: 'old' });
    expect(strokeSwitch('?stroke=OLD')).toEqual({ stroke: 'old' });
    for (const search of ['', '?stroke', '?stroke=', '?stroke=feather', '?stroke=new']) expect(strokeSwitch(search), search).toEqual({});
    const conditions = { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' } as const;
    try {
      vi.stubGlobal('location', { search: '?stroke=old' });
      for (const spot of ['point', 'pool', 'canyon'] as const) {
        expect(surfZoneConfigFor(physicalSettingsFor(spot, conditions, { stage: 2, compute: 'cpu' }), 5, false).stroke, spot).toBe('old');
      }
      // An online room's config fixes it: the default on every client.
      expect(surfZoneConfigFor(physicalSettingsFor('canyon', conditions, { stage: 2, compute: 'cpu' }), 5, false, { stroke: undefined }).stroke).toBeUndefined();
      vi.stubGlobal('location', { search: '' });
      expect(surfZoneConfigFor(physicalSettingsFor('canyon', conditions, { stage: 2, compute: 'cpu' }), 5, false).stroke).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  // The `?surfaceMotion=old` dev switch (popup-moving-face, 2026-10-29): every spot's bodies sample the sea's surface held
  // still through their step, as before, carried in the config to the worker; anything else leaves the default (moving).
  it('holds the sea\'s surface still through the bodies\' step with `?surfaceMotion=old` (a dev switch), and moves it otherwise', () => {
    expect(surfaceMotionSwitch('?surfaceMotion=old')).toEqual({ surfaceMotion: 'old' });
    expect(surfaceMotionSwitch('?surfaceMotion=OLD')).toEqual({ surfaceMotion: 'old' });
    for (const search of ['', '?surfaceMotion', '?surfaceMotion=', '?surfaceMotion=new', '?stroke=old']) expect(surfaceMotionSwitch(search), search).toEqual({});
    const conditions = { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' } as const;
    try {
      vi.stubGlobal('location', { search: '?surfaceMotion=old' });
      for (const spot of ['point', 'pool', 'canyon'] as const) {
        expect(surfZoneConfigFor(physicalSettingsFor(spot, conditions, { stage: 2, compute: 'cpu' }), 5, false).surfaceMotion, spot).toBe('old');
      }
      // An online room's config fixes it: the default on every client.
      expect(surfZoneConfigFor(physicalSettingsFor('canyon', conditions, { stage: 2, compute: 'cpu' }), 5, false, { surfaceMotion: undefined }).surfaceMotion).toBeUndefined();
      vi.stubGlobal('location', { search: '' });
      expect(surfZoneConfigFor(physicalSettingsFor('canyon', conditions, { stage: 2, compute: 'cpu' }), 5, false).surfaceMotion).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  // The `?duckDrawn=old` dev switch (duck-drawn, 2026-10-31): the page's own two-body duck-dive drawn as before; drawing
  // only, so nothing goes to the sea's config.
  it('draws the two-body duck-dive as before with `?duckDrawn=old` (a dev switch), and as the dive otherwise', () => {
    expect(duckDrawnOld('?duckDrawn=old')).toBe(true);
    expect(duckDrawnOld('?duckDrawn=OLD')).toBe(true);
    for (const search of ['', '?duckDrawn', '?duckDrawn=', '?duckDrawn=new', '?duckBody=old']) expect(duckDrawnOld(search), search).toBe(false);
  });

  // The `?spraySheet=off` dev switch (spray-sheet, 2026-10-30): the boards' spray as drops at once, carried in the config
  // to the worker; anything else leaves the default (the curtain that tears into them).
  it('throws the boards\' spray as drops at once with `?spraySheet=off` (a dev switch), and as a curtain otherwise', () => {
    expect(spraySheetSwitch('?spraySheet=off')).toEqual({ spraySheet: 'off' });
    expect(spraySheetSwitch('?spraySheet=OFF')).toEqual({ spraySheet: 'off' });
    for (const search of ['', '?spraySheet', '?spraySheet=', '?spraySheet=on', '?boardSpray=off']) expect(spraySheetSwitch(search), search).toEqual({});
    const conditions = { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' } as const;
    try {
      vi.stubGlobal('location', { search: '?spraySheet=off' });
      for (const spot of ['point', 'pool', 'canyon'] as const) {
        expect(surfZoneConfigFor(physicalSettingsFor(spot, conditions, { stage: 2, compute: 'cpu' }), 5, false).spraySheet, spot).toBe('off');
      }
      // An online room's config fixes it: the default on every client.
      expect(surfZoneConfigFor(physicalSettingsFor('canyon', conditions, { stage: 2, compute: 'cpu' }), 5, false, { spraySheet: undefined }).spraySheet).toBeUndefined();
      vi.stubGlobal('location', { search: '' });
      expect(surfZoneConfigFor(physicalSettingsFor('canyon', conditions, { stage: 2, compute: 'cpu' }), 5, false).spraySheet).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  // The `?boardSpray=off` dev switch (board-spray, 2026-10-29): no spray off the boards, carried in the config to the
  // worker; anything else leaves the default (the sheets off the rails and tail).
  it('throws no spray off the boards with `?boardSpray=off` (a dev switch), and throws it otherwise', () => {
    expect(boardSpraySwitch('?boardSpray=off')).toEqual({ boardSpray: 'off' });
    expect(boardSpraySwitch('?boardSpray=OFF')).toEqual({ boardSpray: 'off' });
    // `?boardSpray=old` (spray-rework, 2026-10-31): #171's spray, the worker's round drops and the clear curtain.
    expect(boardSpraySwitch('?boardSpray=old')).toEqual({ boardSpray: 'old' });
    expect(boardSpraySwitch('?boardSpray=OLD')).toEqual({ boardSpray: 'old' });
    for (const search of ['', '?boardSpray', '?boardSpray=', '?boardSpray=on', '?froth=old']) expect(boardSpraySwitch(search), search).toEqual({});
    const conditions = { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' } as const;
    try {
      vi.stubGlobal('location', { search: '?boardSpray=off' });
      for (const spot of ['point', 'pool', 'canyon'] as const) {
        expect(surfZoneConfigFor(physicalSettingsFor(spot, conditions, { stage: 2, compute: 'cpu' }), 5, false).boardSpray, spot).toBe('off');
      }
      // An online room's config fixes it: the default on every client.
      expect(surfZoneConfigFor(physicalSettingsFor('canyon', conditions, { stage: 2, compute: 'cpu' }), 5, false, { boardSpray: undefined }).boardSpray).toBeUndefined();
      vi.stubGlobal('location', { search: '' });
      expect(surfZoneConfigFor(physicalSettingsFor('canyon', conditions, { stage: 2, compute: 'cpu' }), 5, false).boardSpray).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  // The `?extension=old` dev switch (compress-exit, 2026-10-29): every spot's rider letting Compress go as before,
  // carried in the config to the worker; anything else leaves the default (the legs no faster than the spring's catch).
  it('extends the legs at their full pace letting Compress go with `?extension=old` (a dev switch), and caught otherwise', () => {
    expect(extensionSwitch('?extension=old')).toEqual({ extension: 'old' });
    expect(extensionSwitch('?extension=OLD')).toEqual({ extension: 'old' });
    for (const search of ['', '?extension', '?extension=', '?extension=new', '?froth=old']) expect(extensionSwitch(search), search).toEqual({});
    const conditions = { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' } as const;
    try {
      vi.stubGlobal('location', { search: '?extension=old' });
      for (const spot of ['point', 'pool', 'canyon'] as const) {
        expect(surfZoneConfigFor(physicalSettingsFor(spot, conditions, { stage: 2, compute: 'cpu' }), 5, false).extension, spot).toBe('old');
      }
      // An online room's config fixes it: the default on every client.
      expect(surfZoneConfigFor(physicalSettingsFor('canyon', conditions, { stage: 2, compute: 'cpu' }), 5, false, { extension: undefined }).extension).toBeUndefined();
      vi.stubGlobal('location', { search: '' });
      expect(surfZoneConfigFor(physicalSettingsFor('canyon', conditions, { stage: 2, compute: 'cpu' }), 5, false).extension).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  // The `?froth=old` dev switch (bottom-stop, 2026-10-29): a roller's froth on the boards as before, carried in the
  // config to the worker; anything else leaves the default (only where the lens reaches, at most its grip).
  it('drags boards with a roller\'s froth as before bottom-stop with `?froth=old` (a dev switch), and today\'s otherwise', () => {
    expect(frothSwitch('?froth=old')).toEqual({ froth: 'old' });
    expect(frothSwitch('?froth=OLD')).toEqual({ froth: 'old' });
    for (const search of ['', '?froth', '?froth=', '?froth=new', '?swim=old']) expect(frothSwitch(search), search).toEqual({});
    const conditions = { swell: 'big', tide: 'mid', wind: 'calm', time: 'midday' } as const;
    try {
      vi.stubGlobal('location', { search: '?froth=old' });
      for (const spot of ['point', 'pool', 'canyon'] as const) {
        expect(surfZoneConfigFor(physicalSettingsFor(spot, conditions, { stage: 2, compute: 'cpu' }), 5, false).froth, spot).toBe('old');
      }
      // An online room's config fixes it: the default on every client.
      expect(surfZoneConfigFor(physicalSettingsFor('canyon', conditions, { stage: 2, compute: 'cpu' }), 5, false, { froth: undefined }).froth).toBeUndefined();
      vi.stubGlobal('location', { search: '' });
      expect(surfZoneConfigFor(physicalSettingsFor('canyon', conditions, { stage: 2, compute: 'cpu' }), 5, false).froth).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  // The `?swim=old` dev switch (swim-back, 2026-10-29): every spot's fallen surfer back on the board as before, carried
  // in the config to the worker; anything else leaves the default (the reel to the hand, the climb from the water).
  it('gets back on the board as before swim-back with `?swim=old` (a dev switch), and today\'s otherwise', () => {
    expect(swimSwitch('?swim=old')).toEqual({ swim: 'old' });
    expect(swimSwitch('?swim=OLD')).toEqual({ swim: 'old' });
    for (const search of ['', '?swim', '?swim=', '?swim=new', '?stroke=old']) expect(swimSwitch(search), search).toEqual({});
    const conditions = { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' } as const;
    try {
      vi.stubGlobal('location', { search: '?swim=old' });
      for (const spot of ['point', 'pool', 'canyon'] as const) {
        expect(surfZoneConfigFor(physicalSettingsFor(spot, conditions, { stage: 2, compute: 'cpu' }), 5, false).swim, spot).toBe('old');
      }
      // An online room's config fixes it: the default on every client.
      expect(surfZoneConfigFor(physicalSettingsFor('canyon', conditions, { stage: 2, compute: 'cpu' }), 5, false, { swim: undefined }).swim).toBeUndefined();
      vi.stubGlobal('location', { search: '' });
      expect(surfZoneConfigFor(physicalSettingsFor('canyon', conditions, { stage: 2, compute: 'cpu' }), 5, false).swim).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  // The `?onset=old` dev switch (point-onset, step 3b of the all-spots survey): every spot's onset as before, carried in
  // the config to the worker at every spot; anything else leaves the default.
  it('runs every spot\'s onset as before step 3b with `?onset=old` (a dev switch), and today\'s otherwise', () => {
    expect(onsetSwitch('?onset=old')).toEqual({ onsetRule: 'old' });
    expect(onsetSwitch('?onset=OLD')).toEqual({ onsetRule: 'old' });
    for (const search of ['', '?onset', '?onset=', '?onset=new', '?onset=0.45']) expect(onsetSwitch(search), search).toEqual({});
    const conditions = { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' } as const;
    try {
      vi.stubGlobal('location', { search: '?onset=old' });
      for (const spot of ['point', 'beach', 'canyon'] as const) {
        expect(surfZoneConfigFor(physicalSettingsFor(spot, conditions, { stage: 2, compute: 'cpu' }), 5, false).onsetRule, spot).toBe('old');
      }
      // An online room's config fixes it: the default on every client.
      expect(surfZoneConfigFor(physicalSettingsFor('point', conditions, { stage: 2, compute: 'cpu' }), 5, false, { onsetRule: undefined }).onsetRule).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  // The `?canyonReefSeq=off` dev switch (canyon-reef-sequence): the Canyon's reef counting its onsets as main did, carried
  // in the config to the worker; anything else, or another spot, leaves the default.
  it('counts the Canyon reef\'s onsets as main did with `?canyonReefSeq=off` (a dev switch), and in sequence otherwise', () => {
    expect(canyonReefSeqSwitch('?canyonReefSeq=off')).toEqual({ canyonReefSeq: false });
    expect(canyonReefSeqSwitch('?canyonReefSeq=OFF')).toEqual({ canyonReefSeq: false });
    for (const search of ['', '?canyonReefSeq', '?canyonReefSeq=', '?canyonReefSeq=on', '?canyonReefSeq=0']) expect(canyonReefSeqSwitch(search), search).toEqual({});
    const medium = physicalSettingsFor('canyon', { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' });
    const beach = physicalSettingsFor('beach', { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' });
    try {
      vi.stubGlobal('location', { search: '?canyonReefSeq=off' });
      expect(surfZoneConfigFor(medium, 5, false).canyonReefSeq).toBe(false);
      expect(surfZoneConfigFor(beach, 5, false).canyonReefSeq).toBeUndefined();
      // An online room's config fixes it: the default on every client.
      expect(surfZoneConfigFor(medium, 5, false, { canyonReefSeq: undefined }).canyonReefSeq).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  // The `?canyonAgeJoin=<J>` dev switch (canyon-wave-r2): the Canyon's breaking-age join alone, 0 for rule A, carried in
  // the config to the worker; anything else leaves the layout's own.
  it('runs the Canyon\'s breaking-age join from `?canyonAgeJoin=<J>` (a dev switch), and its layout\'s otherwise', () => {
    expect(canyonAgeJoinSwitch('?canyonAgeJoin=0')).toEqual({ canyonAgeJoin: 0 });
    expect(canyonAgeJoinSwitch('?canyonAgeJoin=0.35')).toEqual({ canyonAgeJoin: 0.35 });
    for (const search of ['', '?canyonAgeJoin', '?canyonAgeJoin=', '?canyonAgeJoin=-1', '?canyonAgeJoin=off']) expect(canyonAgeJoinSwitch(search), search).toEqual({});
    const medium = physicalSettingsFor('canyon', { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' });
    const beach = physicalSettingsFor('beach', { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' });
    try {
      vi.stubGlobal('location', { search: '?canyonAgeJoin=0' });
      expect(surfZoneConfigFor(medium, 5, false).canyonAgeJoin).toBe(0);
      expect(surfZoneConfigFor(beach, 5, false).canyonAgeJoin).toBeUndefined();
      // An online room's config fixes it: the default on every client.
      expect(surfZoneConfigFor(medium, 5, false, { canyonAgeJoin: undefined }).canyonAgeJoin).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('uploads snapshot visuals once while the camera keeps moving, and refreshes same-time restores and settings', async () => {
    const water = new WaterSurface(new FlatSurfaceSource());
    const mode = new PhysicalMode(new Scene());
    await mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'beach' }, 5, water, quick);
    const local = mode.host as LocalSurfZone;
    const visualUpdates = [
      vi.spyOn(mode.farField, 'update'), vi.spyOn(mode.lipSheet, 'update'),
      vi.spyOn(mode.bubbles, 'update'), vi.spyOn(mode.spray, 'update'),
    ];
    const camera = vi.spyOn(mode.camera, 'update');
    const refresh = () => { mode.update(1 / 120); water.update(); };
    for (let frame = 0; frame < 120; frame += 1) refresh();
    for (const update of visualUpdates) expect(update).toHaveBeenCalledTimes(1);
    expect(camera).toHaveBeenCalledTimes(120);
    const seaTime = local.snapshot.status.seaTime;
    const revision = water.surfaceRevision;
    local.refresh();
    refresh();
    for (const update of visualUpdates) expect(update).toHaveBeenCalledTimes(2);
    expect(water.surfaceRevision).toBe(revision + 1);
    const sea = encodeSurfZoneState(local.runner.simulation.exportState());
    local.restore(sea);
    expect(local.snapshot.status.seaTime).toBe(seaTime);
    refresh();
    for (const update of visualUpdates) expect(update).toHaveBeenCalledTimes(3);
    mode.setParticleLevel('low');
    refresh();
    for (const update of visualUpdates) expect(update).toHaveBeenCalledTimes(4);
    mode.spray.setLook('rich');
    mode.lipSheet.setLook('rich');
    refresh();
    for (const update of visualUpdates) expect(update).toHaveBeenCalledTimes(5);
    const enabled = vi.spyOn(local, 'setSprayEnabled');
    mode.setSprayVisible(false);
    refresh();
    expect(enabled).toHaveBeenCalledWith(false);
    for (const update of visualUpdates) expect(update).toHaveBeenCalledTimes(6);
    // A new host may begin at the same sea time and must replace every displayed buffer.
    await mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'beach' }, 5, water, quick);
    refresh();
    for (const update of visualUpdates) expect(update).toHaveBeenCalledTimes(7);
    mode.stop();
    water.dispose();
  });

  it('lets buoys and storms reach 4 m, and the Canyon 3 m as before (wave sizes)', () => {
    expect(TANK_SWELL_LIMITS.height.max).toBe(4);
    expect(swellHeightLimit('point')).toBe(4);
    // The Reef's 30 m edge (the Teahupo'o Reef) carries the 4 m cap.
    expect(swellHeightLimit('reef')).toBe(4);
    expect(swellHeightLimit('canyon')).toBe(3);
    const storm = { ...DEFAULT_PHYSICAL_SETTINGS, source: 'storm' as const, stormWindSpeed: 30, stormFetchKm: 2000, stormDurationHours: 96, stormDistanceKm: 0 };
    expect(swellFor({ ...storm, spot: 'point' }).significantHeight).toBe(4);
    expect(swellFor({ ...storm, spot: 'canyon' }).significantHeight).toBe(3);
    expect(swellFor({ ...DEFAULT_PHYSICAL_SETTINGS, source: 'buoy', spot: 'canyon', significantHeight: 3.8 }).significantHeight).toBe(3);
    expect(swellFor({ ...DEFAULT_PHYSICAL_SETTINGS, source: 'buoy', spot: 'point', significantHeight: 3.8 }).significantHeight).toBe(3.8);
  });

  it('gives Practice\'s groundswell at the tank\'s edge and a buoy\'s in deep water (wave sizes)', async () => {
    const water = new WaterSurface(new FlatSurfaceSource());
    const mode = new PhysicalMode(new Scene());
    const configs: SurfZoneConfig[] = [];
    const capture = (config: SurfZoneConfig) => {
      configs.push(config);
      return { config, ready: new Promise<void>(() => {}), dispose: () => {} } as unknown as SurfZoneHost;
    };
    void mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, source: 'practice' }, 1, water, quick, capture);
    void mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, source: 'buoy' }, 1, water, quick, capture);
    await Promise.resolve();
    mode.cancel();
    expect(configs[0].heightAt).toBe('edge');
    expect(configs[1].heightAt ?? 'deep').toBe('deep');
  });

  it('maps the spread slider from groundswell to windswell spreading', () => {
    expect(spreadingFor(0)).toBeCloseTo(24, 12);
    expect(spreadingFor(1)).toBeCloseTo(4, 12);
    expect(spreadingFor(0.5)).toBeCloseTo(Math.sqrt(24 * 4), 9);
    expect(spreadingFor(3)).toBeCloseTo(4, 12);
  });

  it('takes buoy values directly and derives them from a storm in storm mode', () => {
    const buoy = swellFor(DEFAULT_PHYSICAL_SETTINGS);
    expect(buoy).toEqual({
      significantHeight: DEFAULT_PHYSICAL_SETTINGS.significantHeight,
      peakPeriod: DEFAULT_PHYSICAL_SETTINGS.peakPeriod,
      spreading: spreadingFor(DEFAULT_PHYSICAL_SETTINGS.spread),
    });
    const settings = { ...DEFAULT_PHYSICAL_SETTINGS, source: 'storm' as const, stormWindSpeed: 18, stormFetchKm: 600, stormDurationHours: 36, stormDistanceKm: 4000 };
    const storm = stormSwell({ windSpeed: 18, fetchKm: 600, durationHours: 36, distanceKm: 4000 });
    const derived = swellFor(settings);
    expect(derived.storm).toEqual(storm);
    expect(derived.significantHeight).toBeCloseTo(storm.significantHeight, 12);
    expect(derived.peakPeriod).toBeCloseTo(storm.peakPeriod, 12);
    expect(derived.spreading).toBe(storm.spreading);
    expect(derived.bandwidth).toBe(storm.bandwidth);
  });

  it('keeps a derived storm swell inside what the tank can carry', () => {
    const near = swellFor({ ...DEFAULT_PHYSICAL_SETTINGS, source: 'storm', stormWindSpeed: 28, stormFetchKm: 2000, stormDurationHours: 96, stormDistanceKm: 200 });
    expect(near.storm!.significantHeight).toBeGreaterThan(4);
    expect(near.significantHeight).toBe(4);
    expect(near.peakPeriod).toBe(18);
  });

  it('practises on a steady groundswell whatever the buoy and storm say', () => {
    const practice = swellFor({ ...DEFAULT_PHYSICAL_SETTINGS, source: 'practice', significantHeight: 0.5, peakPeriod: 7, spread: 1 });
    expect(practice).toEqual(PRACTICE_SWELL);
    expect(practice.bandwidth).toBeLessThan(0.1);
    expect(practice.spreading).toBeGreaterThan(spreadingFor(0));
    expect(practice.directionDegrees).toBeDefined();
  });

  it('practises the Reef on its own groundswell and every other spot on the shared one', () => {
    expect(swellFor({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'reef', source: 'practice' })).toEqual(REEF_PRACTICE_SWELL);
    expect(swellFor({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'canyon', source: 'practice' })).toEqual(PRACTICE_SWELL);
    expect(REEF_PRACTICE_SWELL.bandwidth).toBeLessThan(0.1);
    expect(REEF_PRACTICE_SWELL.directionDegrees).toBe(0);
  });

  it('practises Padang Padang on its own long-period groundswell', () => {
    expect(swellFor({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'padang', source: 'practice' })).toEqual(PADANG_PRACTICE_SWELL);
    expect(PADANG_PRACTICE_SWELL.bandwidth).toBeLessThan(0.1);
    expect(PADANG_PRACTICE_SWELL.peakPeriod).toBeGreaterThanOrEqual(16);
    expect(PADANG_PRACTICE_SWELL.spreading).toBeGreaterThanOrEqual(75);
  });

  it('takes a spot’s own spreading when it sets one, and the spread slider’s otherwise', () => {
    expect(swellFor({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'padang', source: 'buoy', spreading: 150 }).spreading).toBe(150);
    expect(swellFor({ ...DEFAULT_PHYSICAL_SETTINGS, source: 'buoy' }).spreading).toBe(spreadingFor(DEFAULT_PHYSICAL_SETTINGS.spread));
  });

  // The 2026-10-21 playtest: the lab's buoy (s 8 from 10°) crossed the Canyon's crests in V's, and 4 m closed Padang Padang out.
  describe('the Wave Lab’s sea', () => {
    const lab: PhysicalSettings = { ...DEFAULT_PHYSICAL_SETTINGS, source: 'buoy', lab: true };
    const storms = [
      { stormWindSpeed: 18, stormFetchKm: 600, stormDurationHours: 36, stormDistanceKm: 3000 },
      { stormWindSpeed: 28, stormFetchKm: 2000, stormDurationHours: 96, stormDistanceKm: 200 },
      { stormWindSpeed: 12, stormFetchKm: 100, stormDurationHours: 6, stormDistanceKm: 0 },
      { stormWindSpeed: 30, stormFetchKm: 2000, stormDurationHours: 96, stormDistanceKm: 10000 },
    ];

    it('maps the spread at the break from the game’s refracted groundswell to the advisor’s floor', () => {
      expect(labSpreadingFor(0)).toBe(REFRACTED_SPREADING);
      expect(labSpreadingFor(0.5)).toBeCloseTo(150 / Math.SQRT2, 9);
      expect(labSpreadingFor(1)).toBe(LAB_SPREADING_FLOOR);
      expect(LAB_SPREADING_FLOOR).toBe(75);
      expect(labSpreadingFor(-1)).toBe(150);
      expect(labSpreadingFor(3)).toBe(75);
    });

    it('brings every buoy swell in square to the beach and long-crested, whatever the sliders say', () => {
      for (const spot of SURF_SPOTS) {
        for (const spread of [0, 0.3, 0.5, 0.6, 1]) {
          for (const directionDegrees of [-40, -10, 0, 10, 40]) {
            const settings = { ...lab, spot, spread, directionDegrees };
            const sea = swellFor(settings, false);
            expect(sea.directionDegrees).toBe(0);
            expect(sea.spreading).toBeGreaterThanOrEqual(LAB_SPREADING_FLOOR);
            expect(sea.spreading).toBeCloseTo(labSpreadingFor(spread), 12);
            const config = surfZoneConfigFor(settings, 1, true);
            expect(config.directionDegrees).toBe(0);
            expect(config.spreading).toBeGreaterThanOrEqual(LAB_SPREADING_FLOOR);
          }
        }
      }
    });

    it('brings every storm’s swell in square to the beach, no broader than the floor', () => {
      for (const spot of SURF_SPOTS) {
        for (const storm of storms) {
          const settings: PhysicalSettings = { ...lab, spot, source: 'storm', directionDegrees: 25, ...storm };
          const sea = swellFor(settings, false);
          expect(sea.directionDegrees).toBe(0);
          expect(sea.spreading).toBe(Math.max(LAB_SPREADING_FLOOR, sea.storm!.spreading));
          expect(sea.spreading).toBeGreaterThanOrEqual(LAB_SPREADING_FLOOR);
          expect(surfZoneConfigFor(settings, 1, false)).toMatchObject({ directionDegrees: 0, spreading: sea.spreading });
        }
      }
    });

    it('runs no bigger than each spot’s Big, a buoy’s height and a storm’s alike', () => {
      for (const spot of SURF_SPOTS) {
        const big = physicalSettingsFor(spot, { swell: 'big', tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'auto' }).significantHeight;
        if (spot !== 'pool') expect(big).toBe(swellChoice(spot, 'big').significantHeight);
        expect(labHeightLimit(spot)).toBeCloseTo(big, 12);
        expect(labHeightLimit(spot)).toBeLessThanOrEqual(swellHeightLimit(spot));
        expect(swellFor({ ...lab, spot, significantHeight: 4 }, false).significantHeight).toBeCloseTo(big, 12);
        expect(swellFor({ ...lab, spot, significantHeight: 1 }, false).significantHeight).toBe(1);
        expect(swellFor({ ...lab, spot, source: 'storm', ...storms[1] }, false).significantHeight).toBeCloseTo(big, 12);
      }
      expect(labHeightLimit('canyon')).toBe(2.4);
      expect(labHeightLimit('padang')).toBe(3.8);
    });

    it('keeps the raw spread and direction behind the dev flag ?labRawSea=1', () => {
      expect(labRawSea('?labRawSea=1')).toBe(true);
      expect(labRawSea('')).toBe(false);
      expect(labRawSea('?labRawSea=0')).toBe(false);
      expect(labRawSea()).toBe(false);
      const buoy = { ...lab, spot: 'canyon' as const, significantHeight: 4, spread: 0.6, directionDegrees: 10 };
      expect(swellFor(buoy, true)).toEqual({ significantHeight: 2.4, peakPeriod: buoy.peakPeriod, spreading: spreadingFor(0.6) });
      expect(surfZoneConfigFor(buoy, 1, false)).toMatchObject({ directionDegrees: 0, spreading: labSpreadingFor(0.6) });
      const storm = { ...lab, source: 'storm' as const, ...storms[0] };
      expect(swellFor(storm, true).spreading).toBe(swellFor(storm, true).storm!.spreading);
      expect(swellFor(storm, true).directionDegrees).toBeUndefined();
    });

    it('leaves Surf’s and Practice’s seas exactly as they were', () => {
      for (const spot of SURF_SPOTS) {
        for (const size of ['practice', 'small', 'medium', 'big'] as const) {
          const settings = physicalSettingsFor(spot, { swell: size, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'auto' });
          expect(settings.lab).toBeUndefined();
          const sea = swellFor(settings, false);
          // Neither the lab nor its dev flag reaches them.
          expect(swellFor(settings, true)).toEqual(sea);
          const config = surfZoneConfigFor(settings, 1, true);
          if (spot === 'pool') {
            // The pool's machine wave (Practice rides Medium) takes the spread slider's old groundswell, as before.
            expect(config).toMatchObject({ significantHeight: settings.significantHeight, spreading: spreadingFor(0), directionDegrees: 0 });
          } else if (size === 'practice') {
            expect(sea).toEqual(practiceSwell(spot));
          } else {
            const choice = swellChoice(spot, size);
            expect(config).toMatchObject({
              significantHeight: choice.significantHeight, peakPeriod: choice.peakPeriod, spreading: choice.spreading, directionDegrees: 0,
            });
          }
        }
      }
      // Practice from the lab is Surf's practice.
      expect(swellFor({ ...lab, spot: 'padang', source: 'practice' }, false)).toEqual(PADANG_PRACTICE_SWELL);
    });
  });

  it('roughens the chop more under onshore than offshore wind', () => {
    expect(chopForWind(12)).toBeGreaterThan(chopForWind(-12));
    expect(chopForWind(-12)).toBeGreaterThan(chopForWind(0));
    expect(chopForWind(0)).toBeGreaterThan(0);
  });

  it('builds the Reef on stage 2 even when the water tier or a dev asks for stage 1', async () => {
    const scene = new Scene();
    const water = new WaterSurface(new FlatSurfaceSource());
    const mode = new PhysicalMode(scene);
    const built: SurfZoneConfig[] = [];
    const gpuTier = vi.fn(async () => false);
    const factory = (config: SurfZoneConfig): SurfZoneHost => {
      built.push(config);
      return new LocalSurfZone(config);
    };
    // The Fast tier's water: stage 1 on the CPU.
    expect(await mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'reef', stage: 1, compute: 'cpu' }, 5, water, quick, factory, gpuTier)).toBe(true);
    expect(built[0].stage).toBe(2);
    expect(built[0].compute).toBe('auto');
    expect(gpuTier).toHaveBeenCalled();
    mode.stop();
  }, 60_000);

  it('shows the physical sea on the shared water surface and frames its break', async () => {
    const scene = new Scene();
    const water = new WaterSurface(new FlatSurfaceSource());
    const mode = new PhysicalMode(scene);
    const waterOptics = vi.spyOn(water, 'setOptics');
    const farOptics = vi.spyOn(mode.farField, 'setOptics');
    expect(await mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'reef' }, 5, water, quick)).toBe(true);
    const local = mode.host as LocalSurfZone;
    const simulation = local.runner.simulation;
    expect(waterOptics).toHaveBeenCalledWith(SPOT_OPTICS.reef);
    expect(farOptics).toHaveBeenCalledWith(SPOT_OPTICS.reef);
    water.update();
    expect(water.grid.nz).toBe(local.init.grid.nz);
    expect(mode.seabed.mesh.visible).toBe(true);
    expect(scene.children).toContain(mode.seabed.mesh);
    expect(scene.children).toContain(mode.farField.mesh);
    expect(mode.farField.mesh.visible).toBe(true);
    expect(scene.children).toContain(mode.lipSheet.mesh);
    expect(mode.lipSheet.mesh.visible).toBe(true);
    expect(scene.children).toContain(mode.bubbles.mesh);
    expect(mode.farField.textureSize.width).toBe(simulation.sea.components.length + 1);
    expect(mode.focus).toEqual(simulation.breakPoint());
    mode.advance(1);
    mode.update(1 / 60);
    // The front view, elevated on the beach side of the rider.
    expect(mode.camera.camera.position.y).toBeGreaterThan(mode.board.position.y + 2);
    expect(mode.camera.camera.position.z).toBeGreaterThan(mode.board.position.z);
    expect(mode.farField.temporalPhases[0]).toBeCloseTo((simulation.sea.components[0].omega * simulation.seaTime) % (2 * Math.PI), 4);
    const crest = simulation.solver.cellIndex(0, -60);
    simulation.lip.launch(crest, { x: 0, z: 5 }, simulation.solver.surfaceAt(crest) + 3, 0.5);
    // Once the strip has left the crest, the drawn sheet covers it.
    for (let step = 0; step < 18; step += 1) {
      mode.advance(1);
      mode.update(1 / 60);
    }
    expect(mode.lipSheet.mesh.geometry.index!.count).toBeGreaterThan(0);
    simulation.foam.source.fill(0);
    simulation.foam.source[crest] = 40;
    simulation.foam.reindexSources();
    local.runner.bubbles.update(simulation, 1 / 60);
    local.refresh();
    mode.update(1 / 30);
    expect(mode.bubbles.mesh.geometry.drawRange.count).toBeGreaterThan(0);
    const board = local.runner.board!;
    expect(scene.children).toContain(mode.board);
    expect(mode.board.visible).toBe(true);
    expect(mode.board.position.toArray()).toEqual(board.position.toArray());
    // The drawn pose is interpolated between snapshots: equal to the physics board's to rounding.
    mode.board.quaternion.toArray().forEach((value, k) => expect(value).toBeCloseTo(board.orientation.toArray()[k], 12));
    // The rider lies prone on the board, drawn from the snapshot, and the ride camera follows.
    expect(scene.children).toContain(mode.surfer.group);
    expect(mode.surfer.group.visible).toBe(true);
    // Facing the rider from the beach the screen's right is the board's left; from behind, its right.
    mode.camera.camera.updateMatrixWorld();
    expect(mode.screenSteer(1)).toBe(1);
    expect(mode.screenSteer(0)).toBe(0);
    mode.camera.setView('behind');
    mode.update(1 / 60);
    mode.camera.camera.updateMatrixWorld();
    expect(mode.screenSteer(1)).toBe(-1);
    // Held, a key keeps the way it steered when pressed, even once the board has turned past side-on to the
    // camera: re-read each frame, a hard turn flipped the mapping mid-turn and the key turned the board back.
    const facing = mode.board.quaternion.clone();
    mode.board.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI));
    expect(mode.screenSteer(1)).toBe(-1);
    expect(mode.screenSteer(0.4)).toBe(-0.4);
    // A new press, or the other key, reads the board as it now faces.
    expect(mode.screenSteer(0)).toBe(0);
    expect(mode.screenSteer(1)).toBe(1);
    expect(mode.screenSteer(-1)).toBe(-1);
    mode.board.quaternion.copy(facing);
    mode.screenSteer(0);
    mode.camera.setView('front');
    mode.update(1 / 60);
    expect(mode.homeView).toBe('front');
    expect(mode.nextView()).toBe('behind');
    expect(mode.nextView()).toBe('side');
    expect(mode.nextView()).toBe('overview');
    expect(mode.nextView()).toBe('front');
    // The owner, 2026-10-22: the right stick swings the ride view round the rider, lying down too.
    mode.update(1 / 60);
    for (let frame = 0; frame < 30; frame += 1) {
      mode.camera.steerSwing(1, 1 / 60);
      mode.update(1 / 60);
    }
    mode.camera.steerSwing(0, 1);
    const swung = mode.camera.swing;
    expect(swung).toBeGreaterThan(0.5);
    expect(mode.readout().find((row) => row.label === 'RIDER')?.value).toMatch(/^PRONE · \d+\.\d m\/s/);
    mode.advance(1, { paddle: false, popUp: true, steer: 0 });
    mode.update(1 / 60);
    expect(local.runner.session!.rider.phase).toBe('push');
    mode.retry();
    mode.advance(1);
    mode.update(1 / 60);
    expect(local.runner.session!.rider.phase).toBe('prone');
    expect(local.runner.status().ride!.resets).toBe(1);
    // Popping up and paddling out again keep it; the camera button starts the next view from its own framing.
    expect(mode.camera.swing).toBe(swung);
    expect(mode.camera.view).toBe('front');
    expect(mode.nextView()).toBe('behind');
    expect(mode.camera.swing).toBe(0);
    mode.setVisible(false);
    expect(mode.board.visible).toBe(false);
    expect(mode.surfer.group.visible).toBe(false);
    expect(mode.lipSheet.mesh.visible).toBe(false);
    expect(mode.bubbles.mesh.visible).toBe(false);
    expect(mode.seabed.mesh.visible).toBe(false);
    expect(mode.farField.mesh.visible).toBe(false);
    mode.stop();
    expect(mode.ready).toBe(false);
  });

  it('gives the sea it starts the water look for its spray, and the running sea every change (G9: Classic keeps its spray)', async () => {
    const water = new WaterSurface(new FlatSurfaceSource());
    const mode = new PhysicalMode(new Scene());
    mode.setSprayLook('classic');
    expect(await mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'beach' }, 1, water, quick, (config) => new LocalSurfZone(config, {}))).toBe(true);
    const host = mode.host as LocalSurfZone;
    expect(host.runner.spray.look).toBe('classic');
    mode.setSprayLook('rich');
    expect(host.runner.spray.look).toBe('rich');
  });

  it('gives the sea it starts the Particles level, the running sea every change, and draws the lip sheet at its detail', async () => {
    const water = new WaterSurface(new FlatSurfaceSource());
    const mode = new PhysicalMode(new Scene());
    mode.setParticleLevel('low');
    expect(await mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'beach' }, 1, water, quick, (config) => new LocalSurfZone(config, {}))).toBe(true);
    const host = mode.host as LocalSurfZone;
    expect([host.runner.spray.level, host.runner.bubbles.level]).toEqual(['low', 'low']);
    expect((mode.lipSheet as unknown as { subdivisions: number }).subdivisions).toBe(PARTICLE_BUDGETS.low.lipSubdivisions);
    mode.setParticleLevel('high');
    expect([host.runner.spray.level, host.runner.bubbles.level]).toEqual(['high', 'high']);
    expect((mode.lipSheet as unknown as { subdivisions: number }).subdivisions).toBe(PARTICLE_BUDGETS.high.lipSubdivisions);
  });

  it('frames a riderless sea from its idle view, and a ride from the default view', async () => {
    const water = new WaterSurface(new FlatSurfaceSource());
    const mode = new PhysicalMode(new Scene());
    mode.idleView = 'cinematic';
    expect(await mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'beach' }, 1, water, quick, (config) => new LocalSurfZone(config, {}))).toBe(true);
    expect(mode.homeView).toBe('cinematic');
    expect(mode.camera.view).toBe('cinematic');
    mode.defaultView = 'side';
    expect(await mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'beach' }, 1, water, quick)).toBe(true);
    expect(mode.homeView).toBe('side');
  });

  it('rides as the chosen surfer: the body loaded once, dressed, and the board in its design', () => {
    const mode = new PhysicalMode(new Scene());
    const load = vi.spyOn(mode.surfer, 'load').mockResolvedValue();
    const dress = vi.spyOn(mode.surfer, 'dress');
    mode.setSurfer({ body: 'surfer3', outfit: 'vest', color: 'coral', board: 'midnight' });
    expect(load).toHaveBeenCalledWith('surfer3');
    expect(dress).toHaveBeenLastCalledWith('vestShorts', { accent: expect.objectContaining({ r: expect.any(Number) }) });
    const colours = () => {
      const found: string[] = [];
      mode.board.traverse((object) => {
        type Coloured = { color?: { getHexString(): string } };
        const materials = ([] as Coloured[]).concat((object as unknown as { material?: Coloured | Coloured[] }).material ?? []);
        for (const material of materials) if (material.color) found.push(`#${material.color.getHexString()}`);
      });
      return found;
    };
    expect(colours()).toContain('#2c3a50');
    mode.setSurfer({ body: 'surfer3', outfit: 'fullsuit', color: 'teal', board: 'classic' });
    expect(load).toHaveBeenCalledTimes(1);
    expect(colours()).not.toContain('#2c3a50');
  });

  it('lets go of a superseded surf zone at once, without waiting for its spin-up', async () => {
    const water = new WaterSurface(new FlatSurfaceSource());
    const mode = new PhysicalMode(new Scene());
    const dispose = vi.fn();
    const neverReady = (config: SurfZoneConfig) => ({ config, ready: new Promise<void>(() => {}), dispose }) as unknown as SurfZoneHost;
    const stuck = mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'beach' }, 1, water, quick, neverReady);
    const next = mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'point' }, 1, water, quick);
    expect(await stuck).toBe(false);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(await next).toBe(true);
    const cancelled = mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'reef' }, 1, water, quick, neverReady);
    mode.cancel();
    expect(await cancelled).toBe(false);
    expect(dispose).toHaveBeenCalledTimes(2);
    expect(mode.config?.spot).toBe('point');
  });

  it('lets only the latest of overlapping starts take over', async () => {
    const water = new WaterSurface(new FlatSurfaceSource());
    const mode = new PhysicalMode(new Scene());
    const first = mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'beach' }, 1, water, quick);
    const second = mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'point' }, 1, water, quick);
    expect(await first).toBe(false);
    expect(await second).toBe(true);
    expect(mode.config?.spot).toBe('point');
    const third = mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'reef' }, 1, water, quick);
    mode.cancel();
    expect(await third).toBe(false);
    expect(mode.config?.spot).toBe('point');
  });

  it('describes the running sea, solver cost and next set in the Wave Lab readout', async () => {
    const mode = new PhysicalMode(new Scene());
    const water = new WaterSurface(new FlatSurfaceSource());
    await mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'canyon', significantHeight: 1.8, peakPeriod: 12 }, 2, water, quick);
    const rows = mode.readout();
    const value = (label: string) => rows.find((row) => row.label === label)?.value;
    expect(value('SPOT')).toBe('CANYON');
    expect(value('SWELL')).toMatch(/^Hs 1\.8 m · Tp 12\.0 s · 10°$/);
    expect(value('SOLVER')).toMatch(/cells · \d+\.\d ms\/step$/);
    expect(value('NEXT SET')).toBe('in 25 s');
    expect(value('BREAKER')).toMatch(/^ξ \d+\.\d\d · (SPILLING|PLUNGING|SURGING)$/);
    // The Canyon's terrace (the canyon spilling prototype) may already have broken a wave during the spin-up.
    expect(value('PEEL')).toMatch(/^waiting for a break$|^.+ · \d+° \(needs ≥ \d+°\)$/);
    expect(value('WIND')).toBe('calm');
    expect(value('BREAKING')).toMatch(/^\d+ % of the surf zone$/);
    expect(value('STORM')).toBeUndefined();
    expect(value('LIP')).toBe('no lip yet');
    expect(formatPhysicalReadout(mode.config!, mode.host!.snapshot.status)).toEqual(rows);
  });

  it('shows the rider against the crest in the readout', async () => {
    const mode = new PhysicalMode(new Scene());
    const water = new WaterSurface(new FlatSurfaceSource());
    await mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'point' }, 2, water, quick);
    const status = mode.host!.snapshot.status;
    const wave = {
      valid: true, directionX: 0, directionZ: 1, aheadOfCrest: 4.2, crestSpeed: 5.1, faceHeight: 1.2, faceFraction: 0.55, crestBreaking: 0,
      curlDistance: Infinity, curlSide: 0, speedOverGround: 6, speedShoreward: 3, speedAlongCrest: 5, requiredSpeed: 7.2,
    };
    const ride = { phase: 'standing' as const, speed: 6, boardSpeed: 6.2, cue: false, popUp: { outcome: 'none' as const, duration: 0, landingPeak: 0, frontShare: 0 }, resets: 0, balance: 1, wave,
      leash: { snapped: false, tension: 0, distance: 0, reeling: false }, duck: 0, boardInReach: false, knock: 0, breath: 1, rescues: 0 };
    const value = (rows: { label: string; value: string }[], label: string) => rows.find((row) => row.label === label)?.value;
    const rows = formatPhysicalReadout(mode.config!, { ...status, ride });
    expect(value(rows, 'CREST')).toBe('c 5.1 m/s · need 7.2 m/s');
    expect(value(rows, 'FACE')).toBe('4.2 m ahead · 55 % up');
    const closeOut = formatPhysicalReadout(mode.config!, { ...status, ride: { ...ride, wave: { ...wave, requiredSpeed: Infinity } } });
    expect(value(closeOut, 'CREST')).toBe('c 5.1 m/s · close-out');
    const behind = formatPhysicalReadout(mode.config!, { ...status, ride: { ...ride, wave: { ...wave, aheadOfCrest: -2 } } });
    expect(value(behind, 'FACE')).toBe('2.0 m behind the crest');
    const flat = formatPhysicalReadout(mode.config!, { ...status, ride: { ...ride, wave: { ...wave, valid: false } } });
    expect(value(flat, 'CREST')).toBe('no wave face here');
    expect(value(flat, 'FACE')).toBeUndefined();
  });

  it('builds the sea from a storm and reports it', async () => {
    const mode = new PhysicalMode(new Scene());
    const water = new WaterSurface(new FlatSurfaceSource());
    await mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, source: 'storm', stormWindSpeed: 18, stormFetchKm: 600, stormDurationHours: 36, stormDistanceKm: 4000 }, 2, water, quick);
    const storm = stormSwell({ windSpeed: 18, fetchKm: 600, durationHours: 36, distanceKm: 4000 });
    expect(mode.storm).toEqual(storm);
    expect(mode.config!.significantHeight).toBeCloseTo(storm.significantHeight, 12);
    expect(mode.config!.bandwidth).toBe(storm.bandwidth);
    const rows = mode.readout();
    const value = (label: string) => rows.find((row) => row.label === label)?.value;
    expect(value('SWELL')).toMatch(/^Hs 1\.4 m · Tp 13\.5 s · 10°$/);
    expect(value('STORM')).toBe('Hs 7.1 m · Tp 13.5 s · fetch-limited · arrives after 4.4 days');
    expect(value('SPREAD')).toBe('s 75 · band ±14 %');
  });

  it('builds the GPU tier\'s richer sea only when a GPU answers and the water may use it', async () => {
    const water = new WaterSurface(new FlatSurfaceSource());
    const { componentCount: _count, ...coarse } = quick;
    const asked: string[] = [];
    const probe = (answer: boolean) => async () => {
      asked.push(String(answer));
      return answer;
    };
    const mode = new PhysicalMode(new Scene());
    await mode.start(DEFAULT_PHYSICAL_SETTINGS, 2, water, { ...coarse, spinUpPeriods: 0.2 }, undefined, probe(true));
    expect(mode.config!.componentCount).toBe(GPU_TIER_COMPONENTS);
    expect(mode.readout().find((row) => row.label === 'SOLVER')?.value).toContain(`${GPU_TIER_COMPONENTS} components`);
    await mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, compute: 'cpu' }, 2, water, { ...coarse, spinUpPeriods: 0.2 }, undefined, probe(true));
    expect(mode.config!.componentCount).toBeUndefined();
    await mode.start(DEFAULT_PHYSICAL_SETTINGS, 2, water, { ...coarse, spinUpPeriods: 0.2 }, undefined, probe(false));
    expect(mode.config!.componentCount).toBeUndefined();
    expect(asked).toEqual(['true', 'false']);
    mode.stop();
  });

  it('runs practice on the same solver with only the incoming swell changed', async () => {
    const mode = new PhysicalMode(new Scene());
    const water = new WaterSurface(new FlatSurfaceSource());
    const natural = { ...DEFAULT_PHYSICAL_SETTINGS, spot: 'point' as const, directionDegrees: -30 };
    await mode.start({ ...natural, source: 'practice' }, 2, water, quick);
    const practice = mode.config!;
    expect(practice).toMatchObject({
      spot: 'point', stage: 2, tide: natural.tide, windSpeed: natural.windSpeed,
      significantHeight: PRACTICE_SWELL.significantHeight, peakPeriod: PRACTICE_SWELL.peakPeriod,
      spreading: PRACTICE_SWELL.spreading, bandwidth: PRACTICE_SWELL.bandwidth, directionDegrees: PRACTICE_SWELL.directionDegrees,
    });
    const rows = mode.readout();
    expect(rows.find((row) => row.label === 'SWELL')?.value).toMatch(/practice/);
    mode.stop();
  });
});
