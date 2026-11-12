import { ShaderLib, type WebGLProgramParametersWithUniforms } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { surfZoneConfigFor, type PhysicalSettings } from '../../game/PhysicalMode';
import { physicalSettingsFor } from '../../game/SurfConditions';
import { FarFieldOcean } from '../FarFieldOcean';
import { LipSheetMesh } from '../LipSheetMesh';
import { SpraySheetMesh } from '../SpraySheetMesh';
import { WaterSurface, type SurfaceSource } from '../WaterSurface';
import { WATER_BODY_GAIN } from '../waterOptics';
import { RICH_WATER } from './richWaterGlsl';
import { DISPLAY_EXPOSURE, WATER_LIGHT, richBodyGain, setWaterLight, waterLightExposure, waterLightOn, waterLightSwitch } from './waterLight';

const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 8, nz: 8 };
const source: SurfaceSource = { grid, time: 0, bedRevision: 0, write: () => {}, writeBed: () => {} };

/** A material's uniforms after its `onBeforeCompile`, run on three's own physical shader sources. */
function compiled(material: { onBeforeCompile: (shader: WebGLProgramParametersWithUniforms, renderer: never) => void }) {
  const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader };
  material.onBeforeCompile(shader as unknown as WebGLProgramParametersWithUniforms, undefined as never);
  return shader as { uniforms: Record<string, { value: unknown }>; vertexShader: string; fragmentShader: string };
}

describe('the water light (ruling 25e)', () => {
  afterEach(() => {
    setWaterLight(false);
    vi.unstubAllGlobals();
  });

  it('reads `?waterLight=on|off` and nothing else', () => {
    expect(waterLightSwitch('?waterLight=on')).toEqual({ waterLight: 'on' });
    expect(waterLightSwitch('?waterLight= OFF ')).toEqual({ waterLight: 'off' });
    for (const search of ['', '?waterLight', '?waterLight=', '?waterLight=1', '?waterlight=on']) expect(waterLightSwitch(search), search).toEqual({});
  });

  it('is on in the 2 m pool alone, unless the switch says otherwise', () => {
    const conditions = { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' } as const;
    const barrel: PhysicalSettings = { ...physicalSettingsFor('pool', conditions, { stage: 2, compute: 'cpu' }), poolWaves: 'barrel' };
    const canyon = physicalSettingsFor('canyon', conditions, { stage: 2, compute: 'cpu' });
    expect(waterLightOn(surfZoneConfigFor(barrel, 5, false))).toBe(false);
    expect(waterLightOn(surfZoneConfigFor(canyon, 5, false))).toBe(false);
    expect(waterLightOn(undefined)).toBe(false);
    vi.stubGlobal('location', { search: '?poolSize=ref' });
    expect(waterLightOn(surfZoneConfigFor(barrel, 5, false))).toBe(true);
    expect(surfZoneConfigFor(barrel, 5, false).waterLight).toBeUndefined();
    vi.stubGlobal('location', { search: '?poolSize=ref&waterLight=off' });
    expect(waterLightOn(surfZoneConfigFor(barrel, 5, false))).toBe(false);
    vi.stubGlobal('location', { search: '?waterLight=on' });
    expect(waterLightOn(surfZoneConfigFor(canyon, 5, false))).toBe(true);
    expect(waterLightOn(surfZoneConfigFor(barrel, 5, false))).toBe(true);
    // An online room pins the switch and the pool's size absent: the default, off.
    vi.stubGlobal('location', { search: '?poolSize=ref&waterLight=on' });
    expect(waterLightOn(surfZoneConfigFor(barrel, 5, false, { poolSize: undefined, waterLight: undefined }))).toBe(false);
    expect(waterLightOn(surfZoneConfigFor(canyon, 5, false, { poolSize: undefined, waterLight: undefined }))).toBe(false);
  });

  it('gives every Rich water drawing one gain and the frame its exposure; off is exactly as before', () => {
    expect(richBodyGain.value).toBe(RICH_WATER.bodyGain);
    expect(waterLightExposure(false)).toBe(DISPLAY_EXPOSURE);
    expect(DISPLAY_EXPOSURE).toBe(1.05);
    expect(waterLightExposure(true)).toBe(WATER_LIGHT.exposure);
    const sea = new WaterSurface({ ...source, cubic: true });
    const far = new FarFieldOcean();
    const lip = new LipSheetMesh();
    const spray = new SpraySheetMesh();
    for (const mesh of [sea, far, lip, spray]) mesh.setLook('rich');
    const gains = () => [sea.mesh.material, far.mesh.material, lip.richMaterial, spray.richMaterial].map((material) => compiled(material).uniforms.waterBodyGain.value);
    const offText = [sea.mesh.material, far.mesh.material, lip.richMaterial, spray.richMaterial].map((material) => compiled(material).fragmentShader);
    expect(gains()).toEqual([4, 4, 4, 4]);
    setWaterLight(true);
    sea.refreshBodyGain();
    far.refreshBodyGain();
    expect(gains()).toEqual([1, 1, 1, 1]);
    // The programs' text does not change: the gain is a uniform.
    expect([sea.mesh.material, far.mesh.material, lip.richMaterial, spray.richMaterial].map((material) => compiled(material).fragmentShader)).toEqual(offText);
    // Classic keeps its own gain under the light.
    sea.setLook('classic');
    far.setLook('classic');
    expect(compiled(sea.mesh.material).uniforms.waterBodyGain.value).toBe(WATER_BODY_GAIN);
    expect(compiled(far.mesh.material).uniforms.waterBodyGain.value).toBe(WATER_BODY_GAIN);
    setWaterLight(false);
    sea.setLook('rich');
    far.setLook('rich');
    expect(gains()).toEqual([4, 4, 4, 4]);
  });
});
