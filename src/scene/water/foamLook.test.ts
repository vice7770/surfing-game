import { ShaderLib, type Material, type WebGLProgramParametersWithUniforms } from 'three';
import { describe, expect, it } from 'vitest';
import {
  BAND_WRAP_KEPT, DENSE_CHURN, GLOW_DENSE, LACE_SCALE, LACE_STRETCH, LACE_WARP, bandVolumeLight, churnFreshness, foamLookMode, foamLookProgramKey, laceStretch, laceWarp,
  setFoamLook, thinGlow, waterChurnFreshGlsl, waterLaceWarpGlsl, withDenseChurn, withFoamLight,
} from './foamLook';
import { freshFoamCover, setFoamFresh, foamFreshMode, waterFoamFreshPars } from './foamFreshness';
import { FOAM_CELL, foamCover } from '../foamPattern';
import { WaterSurface, type SurfaceSource } from '../WaterSurface';
import { ROLLER_SLOTS, ROLLER_STRIDE } from '../../wave/SpillingRoller';
import { BAND_VOLUME } from './rollerGlsl';

/** The metre-square cover of aged foam (value 0.3) around (x, z), High's lace (no streaks), with the look or without. */
function boxCover(x: number, z: number, lace: boolean): number {
  let sum = 0;
  for (let j = 0; j < 4; j += 1) for (let i = 0; i < 4; i += 1) sum += freshFoamCover(x + i * 0.25, z + j * 0.25, 0, 0, 0.3, 0, 0.7, 0, false, lace);
  return sum / 16;
}

describe('the foam look: the lace (item 3)', () => {
  it('warps the network smoothly, never folding it, its cells from about two thirds to nearly twice their size', () => {
    let smallest = Infinity;
    let largest = 0;
    const e = 0.01;
    for (let z = -300; z < 300; z += 1.7) {
      for (let x = -150; x < 150; x += 1.3) {
        const [ax, az] = laceWarp(x, z);
        const [bx, bz] = laceWarp(x + e, z);
        const [cx, cz] = laceWarp(x, z + e);
        // The warp's Jacobian: the area a cell is read over, per its area in the world.
        const det = ((bx - ax) * (cz - az) - (bz - az) * (cx - ax)) / (e * e);
        smallest = Math.min(smallest, det);
        largest = Math.max(largest, det);
        expect(Math.hypot(ax - x, az - z)).toBeLessThanOrEqual(LACE_WARP.amplitude * Math.SQRT2 + 1e-9);
      }
    }
    expect(smallest).toBeGreaterThan(0.3);
    expect(smallest).toBeLessThan(0.75);
    expect(largest).toBeGreaterThan(1.3);
    expect(largest).toBeLessThan(2.2);
  });

  it('draws young foam at a fine footprint as the lace always was, read through the warp and the stretch', () => {
    // On still water both flow-map phases read the same point: the old lace there.
    for (const [x, z, foam, time] of [[3.1, 4.2, 0.4, 1.2], [-12.7, 88.3, 0.85, 0.3], [40.2, -7.9, 0.15, 1.9]]) {
      const [wx, wz] = laceWarp(x, z);
      const [sx, sz] = laceStretch(wx, wz);
      expect(freshFoamCover(x, z, 0, 0, foam, 1, time, 0, false, true)).toBeCloseTo(foamCover(sx, sz, 0, 0, foam, time), 10);
    }
    expect(LACE_STRETCH).toBeGreaterThan(1);
  });

  it('draws the lace in smaller cells, fading to its mean as much nearer', () => {
    expect(LACE_SCALE).toBeLessThan(1);
    expect(LACE_SCALE * FOAM_CELL).toBeGreaterThan(0.4);
    // The mean at a footprint of a lace cell, not of the network's own.
    const footprint = LACE_SCALE * FOAM_CELL;
    expect(freshFoamCover(3.1, 4.2, 0.5, 0, 0.4, 1, 1.2, footprint, false, true)).toBeCloseTo(0.4, 12);
  });

  it('gathers High\'s aged lace into its round patches, where it was one even network', () => {
    // The metre squares' spread: aged lace without the look is even (the patches' mean); with it, patchy.
    const spread = (lace: boolean) => {
      const values: number[] = [];
      for (let z = 100; z < 160; z += 2.3) for (let x = 40; x < 100; x += 2.1) values.push(boxCover(x, z, lace));
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      return { mean, sd: Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length) };
    };
    const before = spread(false);
    const after = spread(true);
    expect(after.sd).toBeGreaterThan(2 * before.sd);
    // About the same cover on the whole.
    expect(Math.abs(after.mean - before.mean)).toBeLessThan(0.05);
  });

  it('fades to the same mean in the distance', () => {
    expect(freshFoamCover(3.1, 4.2, 0.5, 0, 0.4, 0, 1.2, 10 * FOAM_CELL, false, true)).toBe(freshFoamCover(3.1, 4.2, 0.5, 0, 0.4, 0, 1.2, 10 * FOAM_CELL, false, false));
  });

  it('adds no texture read, varying or uniform to the lace', () => {
    const reads = (glsl: string) => glsl.split('texture(').length - 1;
    expect(reads(waterFoamFreshPars(false, true))).toBe(reads(waterFoamFreshPars(false, false)));
    expect(reads(waterFoamFreshPars(true, true))).toBe(reads(waterFoamFreshPars(true, false)));
    for (const glsl of [waterLaceWarpGlsl, waterChurnFreshGlsl, waterFoamFreshPars(false, true)]) expect(glsl).not.toMatch(/\b(varying|uniform|in|out)\s/);
    // Without the look, the lace's GLSL is today's.
    expect(waterFoamFreshPars(false, false)).not.toContain('waterLaceWarp');
    expect(waterFoamFreshPars(false, true)).toContain('float streak = tile.g;');
    expect(waterFoamFreshPars(true, true)).toContain('float streak = 0.5;');
  });
});

describe('the foam look: dense foam and the light through it (item 4b)', () => {
  it('churns foam held dense whatever its air, and fresh foam as before', () => {
    expect(churnFreshness(0, 0.5)).toBe(0);
    expect(churnFreshness(0, DENSE_CHURN[1])).toBe(1);
    expect(churnFreshness(0.7, 0)).toBe(0.7);
    expect(churnFreshness(0.2, 0.9)).toBeGreaterThan(0.2);
  });

  it('keeps the backlit glow on thin fresh foam and a quarter of it on a dense mat', () => {
    expect(thinGlow(0.3)).toBe(1);
    expect(thinGlow(1)).toBe(GLOW_DENSE);
    expect(thinGlow(1.3)).toBe(GLOW_DENSE);
  });

  it('caps the band\'s wrapped sun down the face at the light its surface or level water takes, not at its crest', () => {
    // Sunset (the sun 5° up): a face turned from the sun took half its beam; down the face now what level water beside
    // it takes, at the crest as before.
    const sunset = Math.sin((5 * Math.PI) / 180);
    const old = (nDotL: number) => Math.max(0, (nDotL + 1) / 2) - Math.max(0, nDotL);
    expect(bandVolumeLight(-0.1, sunset, 0, 0)).toBeCloseTo(sunset, 12);
    expect(bandVolumeLight(-0.1, sunset, 0, 0)).toBeLessThan(0.2 * old(-0.1));
    expect(bandVolumeLight(-0.1, sunset, 1)).toBeCloseTo(old(-0.1), 12);
    expect(bandVolumeLight(-0.1, sunset, 0.5, 0)).toBeGreaterThan(bandVolumeLight(-0.1, sunset, 0, 0));
    // A sunlit face (front light) takes the sun directly, with only the kept share of the wrap on top (the owner's
    // "halfway warmer"): its relief's shading mostly whole.
    expect(bandVolumeLight(0.35, sunset, 1, 0)).toBe(0);
    expect(bandVolumeLight(0.35, sunset, 1)).toBeCloseTo(BAND_WRAP_KEPT * old(0.35), 12);
    expect(BAND_WRAP_KEPT).toBeGreaterThan(0.25);
    expect(BAND_WRAP_KEPT).toBeLessThan(0.75);
    // Never darker than three's own light on it, and as before where the wrap stays under the water's light.
    for (const nDotL of [-0.9, -0.3, 0, 0.2, 0.6, 1]) {
      for (const fresh of [0, 0.5, 1]) expect(bandVolumeLight(nDotL, sunset, fresh)).toBeGreaterThanOrEqual(0);
      expect(bandVolumeLight(nDotL, 0.85)).toBeCloseTo(old(nDotL), 12);
    }
  });

  it('rewrites the Rich fragment\'s lines once each, or refuses', () => {
    const fragment = `float waterFresh = waterFreshness( vWaterAir ) * waterFoamPattern;
  float waterFreshNormal = waterFreshness( vWaterAir ) * waterFoamPattern;
  totalEmissiveRadiance += 0.18 * waterFresh * ( 1.0 - waterChurn.x ) * pow( x, 6.0 ) * waterSunRadiance;
${BAND_VOLUME}`;
    const dense = withDenseChurn(fragment);
    expect(dense).not.toContain('waterFreshness( vWaterAir )');
    expect(dense.split('waterChurnFresh( vWaterAir, vWaterFoam )')).toHaveLength(3);
    const lit = withFoamLight(dense);
    // The glow keeps the air's freshness, not the dense foam's.
    expect(lit).toContain('totalEmissiveRadiance += 0.18 * waterFreshness( vWaterAir ) * waterFoamPattern');
    expect(lit).toContain('smoothstep( 0.7000, 1.0000, vWaterFoam )');
    expect(lit).toContain('max( max( 0.0, waterBandSun ), waterSunDirection.y ) ), max( 0.0, ( waterBandSun + 1.0 ) / 2.0 ), max( 0.5500, waterRollerFresh * waterRollerFresh');
    expect(withFoamLight(dense, 0)).toContain('max( 0.0000, waterRollerFresh * waterRollerFresh');
    expect(lit).toContain('smoothstep( 0.0000, 0.3000, waterBandSun )');
    expect(() => withDenseChurn('nothing')).toThrow();
    expect(() => withFoamLight('nothing')).toThrow();
  });
});

/** A material's shaders after its `onBeforeCompile`, on three's physical sources. */
function programOf(material: Material): string {
  const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader };
  material.onBeforeCompile(shader as unknown as WebGLProgramParametersWithUniforms, undefined as never);
  return `${shader.vertexShader}\n${shader.fragmentShader}`;
}

describe('the foam look switch', () => {
  const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 8, nz: 8 };
  const plain: SurfaceSource = { grid, time: 0, bedRevision: 0, write: () => {}, writeBed: () => {} };
  const cubic: SurfaceSource = { ...plain, cubic: true, writeAeration: () => {}, writeFlow: () => {} };
  const roller: SurfaceSource = {
    ...cubic, rollerColumns: 4, rollerColumn0: 0.5, rollerColumnWidth: 1,
    writeRoller: (into) => { into.fill(0, 0, ROLLER_SLOTS * 4 * ROLLER_STRIDE); return 4; },
  };

  it('leaves Classic as it was, and off compiles today\'s Rich program; on changes Rich alone, by its key', () => {
    const was = { ...foamLookMode };
    const fresh = { ...foamFreshMode };
    try {
      for (const streaks of [false, true]) {
        setFoamFresh({ on: true, streaks });
        for (const source of [plain, cubic, roller]) {
          const water = new WaterSurface(source);
          const programs = (on: boolean) => {
            setFoamLook({ on, lace: true, dense: true, light: true });
            water.setLook('classic');
            const classic = { text: programOf(water.mesh.material), key: water.mesh.material.customProgramCacheKey() };
            water.setLook('rich');
            return { classic, rich: { text: programOf(water.mesh.material), key: water.mesh.material.customProgramCacheKey() } };
          };
          const on = programs(true);
          const off = programs(false);
          expect(on.classic).toEqual(off.classic);
          if (!source.cubic) {
            expect(on.rich).toEqual(off.rich);
            continue;
          }
          expect(on.rich.key).not.toBe(off.rich.key);
          expect(on.rich.text).toContain('waterLaceWarp(');
          expect(on.rich.text).toContain('waterChurnFresh( vWaterAir, vWaterFoam )');
          for (const word of ['waterLaceWarp', 'waterChurnFresh', 'LACE_STRETCH']) expect(off.rich.text).not.toContain(word);
          // Each part alone has its own key.
          setFoamLook({ on: true, lace: true, dense: false, light: false });
          water.setLook('rich');
          expect(foamLookProgramKey()).toBe('-foam-look-lace');
          expect(programOf(water.mesh.material)).not.toContain('waterChurnFresh');
        }
      }
    } finally {
      setFoamLook(was);
      setFoamFresh(fresh);
    }
  });
});
