import { Color, ShaderLib, type WebGLProgramParametersWithUniforms } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import {
  FOAM_CAP_SCALE, FOAM_COLOUR_HEX, FOAM_COLOUR_LUMINANCE, FOAM_REFLECTANCE,
  foamAlbedoColour, foamAlbedoProgramKey, foamAlbedoScale, foamReflectance, setFoamAlbedo, waterFoamAlbedoPars, withFoamAlbedo,
} from './foamAlbedo';
import { YOUTH_AIR, YOUTH_COVER, foamYouth } from './foamFreshness';
import { RICH_FOAM, RICH_FOAM_FRESH } from './richWaterGlsl';
import { richRollerFoam } from './rollerGlsl';
import { WaterSurface, type SurfaceSource } from '../WaterSurface';
import { FarFieldOcean } from '../FarFieldOcean';

const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 8, nz: 8 };
const source: SurfaceSource = { grid, time: 0, bedRevision: 0, write: () => {}, writeBed: () => {} };

/** The sRGB inverse EOTF, per channel: a code value in 0–1 to radiance. The hex is a code value; the ratio is not. */
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** Rec. 709 luminance of an sRGB hex, in linear light — computed here so the file's constant cannot drift from it. */
function hexLuminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => toLinear(v / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** A three `Color`'s luminance: its channels are already in the linear working space. */
const colourLuminance = (c: Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

/** A material's shaders after its `onBeforeCompile`, run on three's own physical shader sources. */
function compiled(material: { onBeforeCompile: (shader: WebGLProgramParametersWithUniforms, renderer: never) => void }) {
  const shader = {
    uniforms: {},
    vertexShader: ShaderLib.physical.vertexShader,
    fragmentShader: ShaderLib.physical.fragmentShader,
  } as unknown as WebGLProgramParametersWithUniforms;
  material.onBeforeCompile(shader, undefined as never);
  return { vertex: shader.vertexShader, fragment: shader.fragmentShader, uniforms: shader.uniforms as Record<string, { value: unknown }> };
}

/** The Rich look is drawn only for a source whose bodies ride the Catmull-Rom surface. */
const richSurface = () => {
  const water = new WaterSurface({ ...source, cubic: true });
  water.setLook('rich');
  return water;
};

afterEach(() => setFoamAlbedo(false));

describe('the foam albedo: the cap (step 5i, §5.3 of step 5h)', () => {
  it('knows what #d8f2e9 is worth in linear light, which is the whole diagnosis', () => {
    // 0.840 against a sourced ceiling of 0.55-0.60 for the whitest foam ever measured.
    expect(hexLuminance(FOAM_COLOUR_HEX)).toBeCloseTo(FOAM_COLOUR_LUMINANCE, 3);
    expect(FOAM_COLOUR_LUMINANCE).toBeGreaterThan(1.5 * FOAM_REFLECTANCE.fresh);
    // And three's own conversion agrees: the uniform's untouched value is this luminance.
    expect(colourLuminance(new Color(FOAM_COLOUR_HEX))).toBeCloseTo(FOAM_COLOUR_LUMINANCE, 3);
  });

  it('levels the foam colour to an active whitecap`s 0.50 with the switch on, and leaves it alone with it off', () => {
    expect(colourLuminance(foamAlbedoColour())).toBeCloseTo(FOAM_COLOUR_LUMINANCE, 4);
    setFoamAlbedo(true);
    expect(colourLuminance(foamAlbedoColour())).toBeCloseTo(FOAM_REFLECTANCE.fresh, 4);
    expect(FOAM_CAP_SCALE).toBeCloseTo(0.5953, 4);
  });

  it('keeps the hue: only the level moves, so capped foam is the same colour of white', () => {
    const plain = new Color(FOAM_COLOUR_HEX);
    setFoamAlbedo(true);
    const capped = foamAlbedoColour();
    for (const k of ['r', 'g', 'b'] as const) expect(capped[k] / plain[k]).toBeCloseTo(FOAM_CAP_SCALE, 6);
  });

  it('hands the same cap to the far ocean`s whitecaps and to the tank, from one source', () => {
    const farFoam = () => compiled(new FarFieldOcean().mesh.material).uniforms.waterFoamColor.value as Color;
    const tankFoam = () => compiled(new WaterSurface(source).mesh.material).uniforms.waterFoamColor.value as Color;
    expect(colourLuminance(farFoam())).toBeCloseTo(FOAM_COLOUR_LUMINANCE, 4);
    expect(colourLuminance(tankFoam())).toBeCloseTo(FOAM_COLOUR_LUMINANCE, 4);
    setFoamAlbedo(true);
    expect(colourLuminance(farFoam())).toBeCloseTo(FOAM_REFLECTANCE.fresh, 4);
    expect(colourLuminance(tankFoam())).toBeCloseTo(FOAM_REFLECTANCE.fresh, 4);
  });
});

describe('the foam albedo: the age', () => {
  it('runs from the fresh whitecap to thin foam, and never outside the two sourced ends', () => {
    expect(foamReflectance(0.2, 1)).toBeCloseTo(FOAM_REFLECTANCE.fresh, 6);
    expect(foamReflectance(0, 0.2)).toBeCloseTo(FOAM_REFLECTANCE.aged, 6);
    for (const air of [0, 0.001, 0.004, 0.02, 0.05, 0.3]) {
      for (const foam of [0, 0.1, 0.3, 0.7, 0.85, 1, 1.4]) {
        const r = foamReflectance(air, foam);
        expect(r).toBeGreaterThanOrEqual(FOAM_REFLECTANCE.aged - 1e-9);
        expect(r).toBeLessThanOrEqual(FOAM_REFLECTANCE.fresh + 1e-9);
      }
    }
  });

  it('never brightens as the plume empties: aerated foam is never darker than the lace it leaves', () => {
    let previous = 0;
    for (let air = 0; air <= 0.08; air += 0.002) {
      const r = foamReflectance(air, 0.4);
      expect(r).toBeGreaterThanOrEqual(previous - 1e-12);
      previous = r;
    }
    expect(foamReflectance(0.08, 0.4)).toBeGreaterThan(2 * foamReflectance(0, 0.4));
  });

  it('is the cap`s own share, so the shader multiplies 1 on fresh foam and 0.36 on aged', () => {
    expect(foamAlbedoScale(0.2, 1)).toBeCloseTo(1, 9);
    expect(foamAlbedoScale(0, 0.2)).toBeCloseTo(FOAM_REFLECTANCE.aged / FOAM_REFLECTANCE.fresh, 9);
    expect(foamAlbedoScale(0, 0.2)).toBeCloseTo(0.36, 2);
    // The whole change, end to end: aged foam's albedo against today's 0.840.
    expect(FOAM_REFLECTANCE.aged / FOAM_COLOUR_LUMINANCE).toBeLessThan(0.25);
  });

  it('takes its age from the channel the drawing already has, and invents none', () => {
    for (const air of [0, 0.004, 0.01, 0.05, 0.2]) {
      for (const foam of [0, 0.3, 0.8, 0.95, 1]) {
        const youth = foamYouth(air, foam);
        expect(foamReflectance(air, foam))
          .toBeCloseTo(FOAM_REFLECTANCE.aged + (FOAM_REFLECTANCE.fresh - FOAM_REFLECTANCE.aged) * youth, 9);
      }
    }
  });

  it('writes the GLSL twin from the same constants, so the two cannot drift', () => {
    expect(waterFoamAlbedoPars).toContain(`smoothstep( ${YOUTH_AIR[0].toFixed(4)}, ${YOUTH_AIR[1].toFixed(4)}, air )`);
    expect(waterFoamAlbedoPars).toContain(`smoothstep( ${YOUTH_COVER[0].toFixed(4)}, ${YOUTH_COVER[1].toFixed(4)}, foam )`);
    expect(waterFoamAlbedoPars).toContain(`mix( ${(FOAM_REFLECTANCE.aged / FOAM_REFLECTANCE.fresh).toFixed(4)}, 1.0, youth )`);
  });
});

describe('the foam albedo: where it hooks', () => {
  it('ages every foam-white site through the crease, exactly once, in the plain Rich foam and the fresh one', () => {
    for (const foam of [RICH_FOAM, RICH_FOAM_FRESH, richRollerFoam(RICH_FOAM), richRollerFoam(RICH_FOAM_FRESH)]) {
      const out = withFoamAlbedo(foam);
      expect(out.split('waterCrease *= waterFoamAlbedoScale( vWaterAir, vWaterFoam );')).toHaveLength(2);
      // The roller band's own fresh albedo takes the cap alone: a fresh crest is not aged.
      if (foam.includes('waterBandAlbedo')) expect(out).toContain('waterBandAlbedo');
    }
  });

  it('throws rather than silently drawing nothing if the crease ever moves', () => {
    expect(() => withFoamAlbedo('nothing like the Rich foam')).toThrow(/crease once/);
  });

  it('is in the Rich program when the switch is on and nowhere in it when it is off', () => {
    expect(compiled(richSurface().mesh.material).fragment).not.toContain('waterFoamAlbedoScale');
    expect(foamAlbedoProgramKey()).toBe('');
    setFoamAlbedo(true);
    const { fragment } = compiled(richSurface().mesh.material);
    expect(fragment).toContain('float waterFoamAlbedoScale( float air, float foam )');
    expect(fragment).toContain('waterCrease *= waterFoamAlbedoScale( vWaterAir, vWaterFoam );');
    expect(foamAlbedoProgramKey()).toBe('-foam-albedo');
  });

  it('leaves the Rich program byte for byte as it is with the switch off', () => {
    const surface = richSurface();
    const off = compiled(surface.mesh.material);
    setFoamAlbedo(true);
    const on = compiled(surface.mesh.material);
    setFoamAlbedo(false);
    expect(compiled(surface.mesh.material)).toEqual(off);
    expect(on.fragment).not.toBe(off.fragment);
    expect(on.vertex).toBe(off.vertex);
  });
});
