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
import { GLOW } from '../glowMath';
import { GlowPass } from '../GlowPass';
import { DISPLAY_EXPOSURE, WATER_LIGHT, richBodyGain, setWaterLight, waterLightExposure, waterLightOn, waterLightState, waterLightSwitch } from './waterLight';

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

  it('acts in the Rich look alone: Classic keeps its gain and both exposures; a look change re-applies (step 17 review)', () => {
    const off = { on: false, gain: RICH_WATER.bodyGain, exposure: DISPLAY_EXPOSURE, glowExposure: GLOW.exposure };
    // A sea that does not want it (every spot but the 2 m pool, and online rooms): as before, in either look.
    expect(waterLightState(false, 'rich')).toEqual(off);
    expect(waterLightState(false, 'classic')).toEqual(off);
    // The 2 m pool in Classic (the Low preset): unchanged.
    expect(waterLightState(true, 'classic')).toEqual(off);
    expect(waterLightState(true, undefined)).toEqual(off);
    // In Rich: gain 1, exposure 1.6, and the grade's exposure scaled by the same 1.6 / 1.05.
    const on = waterLightState(true, 'rich');
    expect(on).toEqual({ on: true, gain: 1, exposure: 1.6, glowExposure: GLOW.exposure * (1.6 / 1.05) });
    expect(on.glowExposure / GLOW.exposure).toBeCloseTo(on.exposure / DISPLAY_EXPOSURE, 12);
    // Switching the look at runtime: each state follows the look drawn, back and forth.
    const states = (['rich', 'classic', 'rich'] as const).map((look) => waterLightState(true, look));
    expect(states.map((state) => [state.gain, state.exposure])).toEqual([[1, 1.6], [4, 1.05], [1, 1.6]]);
    // The glow takes the exposure as its own setting; off, its settings are `GLOW`'s exactly.
    expect(new GlowPass({ samples: 2, exposure: on.glowExposure }).settings.exposure).toBe(on.glowExposure);
    expect(new GlowPass({ samples: GLOW.samples, exposure: off.glowExposure }).settings).toEqual({ ...GLOW });
  });
});
