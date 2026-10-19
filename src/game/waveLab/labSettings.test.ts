import { describe, expect, it } from 'vitest';
import { labHeightLimit } from '../PhysicalMode';
import { SURF_SPOTS, TIMES } from '../SurfConditions';
import { LAB_KEY, LabStore, defaultLabSettings, labWater, needsRebuild, sanitizeLabSettings, timeOfDayFor } from './labSettings';

const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, data };
};

describe('lab settings', () => {
  it('keeps a saved 3.8 m swell at Padang Padang, its Big (wave sizes)', () => {
    expect(sanitizeLabSettings({ physical: { spot: 'padang', significantHeight: 3.8 } }).physical.significantHeight).toBe(3.8);
  });

  // The 2026-10-21 playtest: the slider and forecast said 4.0 m at the Canyon, the run 3.0 m, and it broke in rows.
  it('loads a sea saved above its spot’s limit clamped to it, the spot’s Big', () => {
    for (const spot of SURF_SPOTS) {
      expect(sanitizeLabSettings({ physical: { spot, significantHeight: 4 } }).physical.significantHeight).toBe(labHeightLimit(spot));
    }
    expect(sanitizeLabSettings({ physical: { spot: 'canyon', significantHeight: 4 } }).physical.significantHeight).toBe(2.4);
    expect(sanitizeLabSettings({ physical: { spot: 'canyon', significantHeight: 3 } }).physical.significantHeight).toBe(2.4);
    expect(sanitizeLabSettings({ physical: { spot: 'padang', significantHeight: 4 } }).physical.significantHeight).toBe(3.8);
    expect(sanitizeLabSettings({ physical: { spot: 'canyon', significantHeight: 1.8 } }).physical.significantHeight).toBe(1.8);
    const store = new LabStore(memory());
    store.save({ ...defaultLabSettings(), physical: { ...defaultLabSettings().physical, spot: 'canyon', source: 'buoy', significantHeight: 4 } });
    expect(store.value.physical.significantHeight).toBe(2.4);
  });

  it('marks every lab sea as the lab’s, so it arrives square to the beach', () => {
    expect(defaultLabSettings().physical.lab).toBe(true);
    expect(sanitizeLabSettings({ physical: { lab: false } }).physical.lab).toBe(true);
    expect(sanitizeLabSettings(null).physical.lab).toBe(true);
  });

  it('starts at the Canyon on the practice swell at midday, in the Rich look', () => {
    const lab = defaultLabSettings();
    expect(lab.physical).toMatchObject({ spot: 'canyon', source: 'practice' });
    expect({ sunHeight: lab.sunHeight, sunDirection: lab.sunDirection }).toEqual(TIMES.midday);
    expect(lab.waterLook).toBe('rich');
  });

  it('cleans stored values: unknown enums fall back, numbers are kept in range', () => {
    const lab = sanitizeLabSettings({ physical: { spot: 'moon', source: 'storm', significantHeight: 99, tide: -7, stage: 3 }, sunHeight: 'x', waterLook: 'neon' });
    expect(lab.physical.spot).toBe('canyon');
    expect(lab.physical.source).toBe('storm');
    expect(lab.physical.significantHeight).toBe(2.4);
    expect(lab.physical.tide).toBe(-1);
    expect(lab.physical.stage).toBe(2);
    expect(lab.sunHeight).toBe(defaultLabSettings().sunHeight);
    expect(lab.waterLook).toBe('rich');
  });

  it('rebuilds for sea settings and the water tier, not for light or look', () => {
    const lab = defaultLabSettings();
    expect(needsRebuild(lab, { ...lab, sunHeight: 0.2, waterLook: 'classic' })).toBe(false);
    expect(needsRebuild(lab, { ...lab, physical: { ...lab.physical, tide: 0.5 } })).toBe(true);
    expect(needsRebuild(lab, { ...lab, physical: { ...lab.physical, spot: 'reef' } })).toBe(true);
    expect(needsRebuild(lab, { ...lab, water: 'chosen' })).toBe(true);
  });

  // Review: the lab ran the heavy solver even where the Auto benchmark had picked the light one.
  it('runs the water the graphics settings chose, unless a developer chose otherwise', () => {
    const lab = defaultLabSettings();
    expect(lab.water).toBe('graphics');
    const graphics = { stage: 1, compute: 'cpu' } as const;
    expect(labWater(lab, graphics, true)).toEqual(graphics);
    const chosen = { ...lab, water: 'chosen' as const, physical: { ...lab.physical, stage: 2 as const, compute: 'auto' as const } };
    expect(labWater(chosen, graphics, true)).toEqual({ stage: 2, compute: 'auto' });
    expect(labWater(chosen, graphics, false)).toEqual(graphics);
    expect(sanitizeLabSettings({ water: 'nonsense' }).water).toBe('graphics');
  });

  it('names a preset time of day only when the sun matches it', () => {
    expect(timeOfDayFor(TIMES.sunset)).toBe('sunset');
    expect(timeOfDayFor({ sunHeight: 0.5, sunDirection: 0 })).toBe('custom');
  });

  it('store keeps applied settings only, and survives broken storage', () => {
    const storage = memory();
    const store = new LabStore(storage);
    const applied = { ...defaultLabSettings(), physical: { ...defaultLabSettings().physical, spot: 'reef' as const } };
    store.save(applied);
    expect(new LabStore(storage).value.physical.spot).toBe('reef');
    storage.data.set(LAB_KEY, '{not json');
    expect(new LabStore(storage).value.physical.spot).toBe('canyon');
    const failing = new LabStore({ getItem: () => { throw new Error('private'); }, setItem: () => { throw new Error('full'); } });
    failing.save(applied);
    expect(failing.value.physical.spot).toBe('reef');
  });

  it('keeps a saved Padang Padang spot, and still falls back from an unknown one', () => {
    expect(sanitizeLabSettings({ physical: { spot: 'padang' } }).physical.spot).toBe('padang');
    expect(sanitizeLabSettings({ physical: { spot: 'bells' } }).physical.spot).toBe('canyon');
  });
});
