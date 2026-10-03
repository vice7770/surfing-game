import { ShaderLib, type WebGLProgramParametersWithUniforms } from 'three';
import { describe, expect, it } from 'vitest';
import { FRONT_FIELD, FRONT_STRIDE } from '../../wave/barrel/frontRecords';
import { ProfileLibrary } from '../../wave/barrel/ProfileLibrary';
import { SweptLoft } from '../../wave/barrel/sweptLoft';
import { tubeCase } from '../../wave/barrel/toyCase';
import { WaterSurface, type SurfaceSource } from '../WaterSurface';
import { SWEPT_BAND_ALPHA, SWEPT_BARREL_DISCARD } from './barrelMaskGlsl';
import { BAND_OFFSET, SweptBarrelMesh } from './SweptBarrelMesh';

const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 8, nz: 8 };
const source: SurfaceSource = { grid, time: 0, bedRevision: 0, write: () => {}, writeBed: () => {} };
function compiled(material: { onBeforeCompile: (shader: WebGLProgramParametersWithUniforms, renderer: never) => void }) {
  const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader } as unknown as WebGLProgramParametersWithUniforms;
  material.onBeforeCompile(shader, undefined as never);
  return { vertex: shader.vertexShader, fragment: shader.fragmentShader, uniforms: shader.uniforms };
}
function tubeRecords(): Float32Array {
  const records = new Float32Array(21 * FRONT_STRIDE);
  for (let k = 0; k < 21; k += 1) {
    const o = k * FRONT_STRIDE;
    records[o + FRONT_FIELD.x] = k + 0.5; records[o + FRONT_FIELD.z] = -100; records[o + FRONT_FIELD.front] = 1; records[o + FRONT_FIELD.sigma] = k;
    records[o + FRONT_FIELD.tau] = 0.1; records[o + FRONT_FIELD.footHeight] = 2.1; records[o + FRONT_FIELD.footDepth] = 7; records[o + FRONT_FIELD.throwZ] = -100;
  }
  return records;
}

describe('the curl’s band over the water (look-fix round 1)', () => {
  it('is a transparent child of the curl on its own geometry, pulled over the water it rests on, in one pass', () => {
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    const { band } = swept;
    expect(band.parent).toBe(swept.mesh);
    expect(band.geometry).toBe(swept.mesh.geometry);
    expect(band.material.transparent).toBe(true);
    expect(band.material.depthWrite).toBe(false);
    expect(band.material.polygonOffset).toBe(true);
    expect([band.material.polygonOffsetFactor, band.material.polygonOffsetUnits]).toEqual([BAND_OFFSET.factor, BAND_OFFSET.units]);
    expect(BAND_OFFSET).toEqual({ factor: -1, units: -4 });
    expect(band.material.forceSinglePass).toBe(true);
    expect(band.material.defines).toHaveProperty('SWEPT_BAND');
    expect(swept.mesh.material.transparent).toBe(false);
    expect(swept.mesh.material.defines ?? {}).not.toHaveProperty('SWEPT_BAND');
  });

  it('shares the curl’s program, its seam cut by the define, in both looks', () => {
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    for (const look of ['classic', 'rich'] as const) {
      swept.setLook(look);
      const curl = compiled(swept.mesh.material);
      const band = compiled(swept.band.material);
      expect(band.vertex).toBe(curl.vertex);
      expect(band.fragment).toBe(curl.fragment);
      expect(curl.fragment).toContain(`#ifdef SWEPT_BAND\n${SWEPT_BAND_ALPHA}\n#else\n${SWEPT_BARREL_DISCARD}\n#endif`);
      expect(band.uniforms).toHaveProperty('sweptBandOpaque');
      expect(swept.band.material.customProgramCacheKey()).toBe(`breakline-swept-barrel-${look}-band`);
      expect(swept.band.material.roughness).toBe(swept.mesh.material.roughness);
    }
  });

  it('follows the curl’s views, hiding in the region view, and its sheet and winding through the shared geometry', () => {
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    swept.setView('phase');
    expect(swept.band.material.customProgramCacheKey()).toBe('breakline-swept-barrel-classic-view-phase-band');
    expect(swept.band.visible).toBe(true);
    swept.setView('region');
    expect(swept.band.visible).toBe(false);
    swept.setView(undefined);
    expect(swept.band.visible).toBe(true);
    const loft = new SweptLoft(new ProfileLibrary([tubeCase(0.3)]), 0.05).build(tubeRecords(), 21, 0.5, () => 0.5);
    swept.update(loft);
    swept.sheetShown = false;
    swept.update(loft);
    expect(Array.from(swept.band.geometry.getAttribute('sweptSheetWeight').array.slice(0, loft.vertexCount)).every((w) => w === 0)).toBe(true);
    expect(swept.band.geometry.getIndex()).toBe(swept.mesh.geometry.getIndex());
  });

  it('draws opaque for the dev comparison, and frees both materials with the curl', () => {
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    expect(swept.bandOpaque).toBe(false);
    swept.bandOpaque = true;
    expect(compiled(swept.band.material).uniforms.sweptBandOpaque).toEqual({ value: 1 });
    let freed = 0;
    for (const disposable of [swept.mesh.geometry, swept.mesh.material, swept.band.material]) disposable.addEventListener('dispose', () => { freed += 1; });
    swept.dispose();
    expect(freed).toBe(3);
  });
});
