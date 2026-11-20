import { Color, ShaderLib, type WebGLProgramParametersWithUniforms } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import {
  BUBBLE_DIAMETER, FOAM_CAP_SCALE, FOAM_COLOUR_HEX, FOAM_COLOUR_LUMINANCE, FOAM_LAYERS, FOAM_REFLECTANCE,
  bubbleAlbedoScale, bubbleLayers, bubbleReflectance, foamAlbedoBubbles, foamAlbedoColour, foamAlbedoPars,
  foamAlbedoProgramKey, foamAlbedoScale, foamReflectance, layerReflectance, setFoamAlbedo, waterFoamAlbedoPars,
  waterFoamBubblePars, withFoamAlbedo,
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

describe('the foam albedo: the bubble layers (step 5j)', () => {
  it('reproduces the two sourced ends of R(N) that were never fitted here', () => {
    // A single bubble layer about 0.10, and the laboratory ceiling past about 25 (whitewater-sources.md).
    expect(layerReflectance(1)).toBeCloseTo(0.0997, 4);
    expect(layerReflectance(25)).toBeCloseTo(0.546, 3);
    expect(layerReflectance(1000)).toBeCloseTo(FOAM_LAYERS.ceiling, 6);
    expect(layerReflectance(0)).toBe(0);
    // R is very nearly linear in N while N is small, which is what lets a cover fraction stand for a part layer.
    expect(layerReflectance(0.5) / layerReflectance(1)).toBeCloseTo(0.52, 2);
    // And it never rises above the sourced ceiling, whatever the fields say.
    for (const n of [0, 0.3, 1, 5, 12, 25, 100, 1e6]) expect(layerReflectance(n)).toBeLessThanOrEqual(FOAM_LAYERS.ceiling);
  });

  it('counts the layers from the fields the drawing carries, and clamps as the plume`s own whiteness does', () => {
    // alpha * h / d_bubble, plus the surface mat as at most one layer.
    expect(bubbleLayers(0.2, 0.5, 2, 0)).toBeCloseTo((0.2 * 0.5) / BUBBLE_DIAMETER, 6);
    expect(bubbleLayers(0, 0, 0, 1)).toBeCloseTo(1, 9);
    expect(bubbleLayers(0, 0, 0, 0.5)).toBeCloseTo(0.5, 9);
    // The plume reaches no deeper than the water (`plumeReach`), so a 2 m plume in 0.3 m of water is 0.3 m of air.
    expect(bubbleLayers(0.1, 2, 0.3, 0)).toBeCloseTo((0.1 * 0.3) / BUBBLE_DIAMETER, 6);
    // Foam above 1 (a Canyon lip's landing writes it) is one layer, not two.
    expect(bubbleLayers(0, 1, 1, 3)).toBeCloseTo(1, 9);
    // Out of range off a sliver triangle's edge, where MSAA shades it: never negative, never a NaN.
    for (const [a, p, d, foam] of [[-0.66, -26, -1, -0.5], [0, -1, 1, 0], [-1, 1, 1, 2]] as const) {
      const n = bubbleLayers(a, p, d, foam);
      expect(Number.isFinite(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
    }
  });

  // NB these are ALBEDOS, not pixels. The drawn lace comes out BRIGHTER under `bubbles` even though its albedo is
  // lower, because the foam's white is mixed over the water by the cover (c2-step5j.md section 5.1).
  it('puts the aged lace`s albedo under step 5i`s aged end and the live plume`s over its fresh one', () => {
    // An aged lace: the air has risen out, so one layer of surface mat is all that is left.
    const lace = bubbleReflectance(0, 0, 1.2, 1);
    expect(lace).toBeCloseTo(0.0997, 4);
    expect(lace).toBeLessThan(FOAM_REFLECTANCE.aged);
    // A live plume: half a metre of 10 %-air water is fifty layers, which is the ceiling.
    const plume = bubbleReflectance(0.1, 0.5, 1.2, 1);
    expect(plume).toBeCloseTo(FOAM_LAYERS.ceiling, 4);
    expect(plume).toBeGreaterThan(FOAM_REFLECTANCE.fresh);
    // The whole range sits inside the sourced chain: 0.03-0.10 aged, 0.55-0.60 the laboratory ceiling.
    for (const air of [0, 0.004, 0.02, 0.13, 0.4]) {
      for (const h of [0, 0.01, 0.1, 0.5, 2]) {
        for (const foam of [0, 0.4, 1]) {
          const r = bubbleReflectance(air, h, 2, foam);
          expect(r).toBeGreaterThanOrEqual(0);
          expect(r).toBeLessThanOrEqual(FOAM_LAYERS.ceiling);
        }
      }
    }
  });

  it('is monotone in every field: more air, a deeper plume or more cover is never darker', () => {
    const base = bubbleReflectance(0.02, 0.2, 1, 0.5);
    expect(bubbleReflectance(0.04, 0.2, 1, 0.5)).toBeGreaterThan(base);
    expect(bubbleReflectance(0.02, 0.4, 1, 0.5)).toBeGreaterThan(base);
    expect(bubbleReflectance(0.02, 0.2, 1, 0.9)).toBeGreaterThan(base);
    let previous = -1;
    for (let air = 0; air <= 0.4; air += 0.005) {
      const r = bubbleReflectance(air, 0.3, 1, 0.8);
      expect(r).toBeGreaterThanOrEqual(previous - 1e-12);
      previous = r;
    }
  });

  it('is the cap`s own share, so the shader passes 1 where the layers reach step 5i`s 0.50', () => {
    expect(bubbleAlbedoScale(0, 0, 1, 1)).toBeCloseTo(0.0997 / FOAM_REFLECTANCE.fresh, 4);
    expect(bubbleAlbedoScale(1, 1, 1, 1)).toBeCloseTo(FOAM_LAYERS.ceiling / FOAM_REFLECTANCE.fresh, 6);
    // 12 layers is where R(N) crosses the cap, so the scale crosses 1 there and nowhere else.
    expect(layerReflectance(12)).toBeCloseTo(FOAM_REFLECTANCE.fresh, 2);
    expect(bubbleAlbedoScale(0.012, 1, 1, 0)).toBeCloseTo(1, 2);
  });

  it('writes the GLSL twin from the same constants, so the two cannot drift', () => {
    expect(waterFoamBubblePars).toContain(`max( 0.0, air ) * reach / ${BUBBLE_DIAMETER.toFixed(4)}`);
    expect(waterFoamBubblePars).toContain(`${(FOAM_LAYERS.ceiling / FOAM_REFLECTANCE.fresh).toFixed(4)} * ( 1.0 - exp( -${FOAM_LAYERS.rate.toFixed(4)} * layers ) )`);
    expect(waterFoamBubblePars).toContain('float reach = max( 0.0, min( plume, depth ) );');
    // Same name as the cap's, so the hook is the one line either way.
    expect(waterFoamBubblePars).toContain('float waterFoamAlbedoScale(');
    expect(waterFoamAlbedoPars).toContain('float waterFoamAlbedoScale(');
  });

  it('is a third value of the same switch, and leaves `on` exactly as step 5i shipped it', () => {
    // One surface, compiled three times: a second instance would carry its own textures' uuids.
    const surface = richSurface();
    setFoamAlbedo('on');
    expect(foamAlbedoBubbles()).toBe(false);
    const capPars = foamAlbedoPars();
    const capKey = foamAlbedoProgramKey();
    const capProgram = compiled(surface.mesh.material);
    const capColour = foamAlbedoColour();
    setFoamAlbedo('bubbles');
    expect(foamAlbedoBubbles()).toBe(true);
    expect(foamAlbedoPars()).toBe(waterFoamBubblePars);
    expect(foamAlbedoProgramKey()).toBe('-foam-albedo-bubbles');
    const bubbleProgram = compiled(surface.mesh.material);
    expect(bubbleProgram.fragment).not.toBe(capProgram.fragment);
    expect(bubbleProgram.vertex).toBe(capProgram.vertex);
    // The uniform is the same 0.50 under both, so no mesh without a layer count of its own moves between them.
    expect(colourLuminance(foamAlbedoColour())).toBeCloseTo(colourLuminance(capColour), 9);
    expect(colourLuminance(foamAlbedoColour())).toBeCloseTo(FOAM_REFLECTANCE.fresh, 4);
    // And back on `on` the program, the pars and the key are what they were, byte for byte.
    setFoamAlbedo('on');
    expect(foamAlbedoPars()).toBe(capPars);
    expect(foamAlbedoPars()).toBe(waterFoamAlbedoPars);
    expect(foamAlbedoProgramKey()).toBe(capKey);
    expect(compiled(surface.mesh.material)).toEqual(capProgram);
  });

  it('hooks on the same crease and hands the layer count the two depth varyings', () => {
    for (const foam of [RICH_FOAM, RICH_FOAM_FRESH, richRollerFoam(RICH_FOAM)]) {
      const out = withFoamAlbedo(foam, true);
      expect(out.split('waterCrease *= waterFoamAlbedoScale( vWaterAir, vWaterFoam, vWaterPlumeDepth, vWaterDepth );')).toHaveLength(2);
      // The varyings it reads are the ones the plume's own whiteness reads, in the same fragment.
      expect(out).toContain('min( vWaterPlumeDepth, vWaterDepth )');
    }
    expect(() => withFoamAlbedo('nothing like the Rich foam', true)).toThrow(/crease once/);
  });

  it('is in the Rich program with `bubbles` and nowhere in it with the switch off', () => {
    const surface = richSurface();
    setFoamAlbedo('bubbles');
    const { fragment } = compiled(surface.mesh.material);
    expect(fragment).toContain('float waterFoamLayers( float air, float plume, float depth, float foam )');
    expect(fragment).toContain('waterCrease *= waterFoamAlbedoScale( vWaterAir, vWaterFoam, vWaterPlumeDepth, vWaterDepth );');
    setFoamAlbedo('off');
    const plain = compiled(surface.mesh.material);
    expect(plain.fragment).not.toContain('waterFoamLayers');
    expect(plain.fragment).not.toContain('waterFoamAlbedoScale');
    expect(foamAlbedoProgramKey()).toBe('');
  });

  it('leaves the Rich program byte for byte as it is with the switch off, through either value', () => {
    const surface = richSurface();
    const off = compiled(surface.mesh.material);
    setFoamAlbedo('bubbles');
    compiled(surface.mesh.material);
    setFoamAlbedo('on');
    compiled(surface.mesh.material);
    setFoamAlbedo('off');
    expect(compiled(surface.mesh.material)).toEqual(off);
  });
});
