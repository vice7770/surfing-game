import { ShaderLib, type WebGLProgramParametersWithUniforms } from 'three';
import { describe, expect, it } from 'vitest';
import type { LoftResult } from '../../wave/barrel/sweptLoft';
import { WaterSurface, type SurfaceSource } from '../WaterSurface';
import { mirrorsBarrelDither, SWEPT_BARREL_DISCARD } from './barrelMaskGlsl';
import { SweptBarrelMesh } from './SweptBarrelMesh';

const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 8, nz: 8 };
const source: SurfaceSource = { grid, time: 0, bedRevision: 0, write: () => {}, writeBed: () => {} };
/** A material's shaders after its `onBeforeCompile`, run on three's own physical shader sources (as waterLooks.test.ts). */
function compiled(material: { onBeforeCompile: (shader: WebGLProgramParametersWithUniforms, renderer: never) => void }) {
  const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader } as unknown as WebGLProgramParametersWithUniforms;
  material.onBeforeCompile(shader, undefined as never);
  return { vertex: shader.vertexShader, fragment: shader.fragmentShader };
}
function oneQuad(): LoftResult {
  return {
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1]), normals: new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]),
    mask: new Float32Array(4).fill(1), lift: new Float32Array(4), indices: new Uint32Array([0, 2, 1, 1, 2, 3]), vertexCount: 4, indexCount: 6, sliceCount: 2,
    sliceFront: new Int32Array(2), sliceSigma: new Float32Array(2), sliceTau: new Float32Array(2), slicePhase: new Uint8Array(2),
    sliceCrestOffset: new Float32Array(2), sliceLife: new Float32Array(2), clamps: 0, clampedLookups: 0, caps: 0,
  };
}

describe('the swept barrel’s mesh', () => {
  it('shades lofted vertices as the water, showing exactly where the water gives way, in both looks', () => {
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    for (const look of ['classic', 'rich'] as const) {
      swept.setLook(look);
      const { vertex, fragment } = compiled(swept.mesh.material);
      expect(vertex).toContain('vec3 objectNormal = vec3( normal );');
      // The curl takes the water's foam only where it lies on the water.
      expect(vertex).toContain('vWaterFoam = ( 1.0 - sweptLift ) * waterFoamAt( position.xz );');
      expect(vertex).toContain('vWaterWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
      expect(fragment).toContain(SWEPT_BARREL_DISCARD);
      expect(mirrorsBarrelDither(fragment)).toBe(true);
      expect(swept.mesh.material.customProgramCacheKey()).toBe(`breakline-swept-barrel-${look}`);
    }
  });

  it('draws a loft’s triangles, and hides for an empty loft or none', () => {
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    swept.update(oneQuad());
    expect(swept.mesh.visible).toBe(true);
    expect(swept.mesh.geometry.drawRange.count).toBe(6);
    expect(Array.from(swept.mesh.geometry.getAttribute('position').array.slice(0, 12))).toEqual([0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1]);
    swept.update({ ...oneQuad(), indexCount: 0, vertexCount: 0 });
    expect(swept.mesh.visible).toBe(false);
    swept.update(undefined);
    expect(swept.mesh.visible).toBe(false);
  });
});
