import { ShaderLib, type WebGLProgramParametersWithUniforms } from 'three';
import { describe, expect, it } from 'vitest';
import { FRONT_FIELD, FRONT_STRIDE } from '../../wave/barrel/frontRecords';
import { ProfileLibrary } from '../../wave/barrel/ProfileLibrary';
import { LOFT, LOFT_SAMPLES, SweptLoft, type LoftResult } from '../../wave/barrel/sweptLoft';
import { tubeCase } from '../../wave/barrel/toyCase';
import { WaterSurface, type SurfaceSource } from '../WaterSurface';
import { mirrorsBarrelDither, SWEPT_BARREL_DISCARD } from './barrelMaskGlsl';
import { SWEPT_SHEET_BODY, SweptBarrelMesh, WALL_POINT, sweptViewColours } from './SweptBarrelMesh';

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
    mask: new Float32Array(4).fill(1), lift: new Float32Array(4), sheet: new Float32Array(4), sheetWeight: new Float32Array(4), sheetBack: new Float32Array(4), indices: new Uint32Array([0, 2, 1, 1, 2, 3]), vertexCount: 4, indexCount: 6, sliceCount: 2,
    sliceFront: new Int32Array(2), sliceSigma: new Float32Array(2), sliceTau: new Float32Array(2), slicePhase: new Uint8Array(2),
    sliceCrestOffset: new Float32Array(2), sliceLife: new Float32Array(2), sliceCollapse: new Float32Array(2), sliceFade: new Float32Array(2).fill(1),
    sliceTipGap: new Float32Array(2), tipGap: 0, clamps: 0, clampedLookups: 0, caps: 0, overlaps: 0, overlapsOpen: 0, overlapOpenWeight: 0,
    sliceJoined: new Uint8Array([1, 0]), sliceRayX: new Float32Array(2), sliceRayZ: new Float32Array(2).fill(1), sliceWeight: new Float32Array(2).fill(1),
    sliceOverturned: new Uint8Array(2), sliceTipAlong: new Float32Array(2), sliceTipUp: new Float32Array(2), sliceAnchorVX: new Float32Array(2),
    sliceAnchorVZ: new Float32Array(2),
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

  it('shades the lip as a thin sheet lit from behind, in both looks, where the loft weighs it (tube-colour-fix.md)', () => {
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    for (const look of ['classic', 'rich'] as const) {
      swept.setLook(look);
      const { vertex, fragment } = compiled(swept.mesh.material);
      expect(vertex).toContain('attribute float sweptSheet;');
      expect(vertex).toContain('vSweptSheet = sweptSheet;');
      expect(vertex).toContain('vSweptSheetWeight = sweptSheetWeight;');
      expect(fragment).toContain('varying float vSweptSheetWeight;');
      expect(fragment).toContain(SWEPT_SHEET_BODY);
      // Two-flux over the view's path through the sheet, and the light behind it through the same path.
      expect(fragment).toContain('waterBody = mix( waterBody, waterDeepReflectance * ( 1.0 - sweptReach * sweptReach ), vSweptSheetWeight );');
      expect(fragment).toContain('float sweptPath = vSweptSheet / max( 0.2, waterRefractedCosine( waterViewCos ) );');
      // No bed is seen through a lip: the column, caustics and all, is weighed once by 1 − the sheet's weight.
      expect(fragment).toContain('causticLightAt( waterBedXZ ) );');
      expect(fragment).not.toContain('mix( 1.0, causticLightAt');
      // Behind the sheet, the sky as far as its far side sees it through the opening, else the cavity's wall; the sun
      // over its own path through the sheet.
      expect(vertex).toContain('vSweptSheetBack = sweptSheetBack;');
      // Behind the far side that sees no opening, the back wall as drawn: its column body at its depth, under its own light.
      expect(vertex).toContain('vSweptWallDepth = max( 0.0, sweptWall.y - waterBedAt( sweptWall.xz ) );');
      expect(fragment).toContain('vec3 sweptWall = waterBodyGain * waterBodyReflectance( vSweptWallDepth, max( 0.05, dot( sweptWallN, waterV ) ), sweptWallSun ) * sweptWallLight;');
      expect(fragment).toContain('vec3 sweptBack = vSweptSheetBack * sweptSky + ( 1.0 - vSweptSheetBack ) * sweptWall;');
      expect(fragment).toContain('float sweptSunPath = vSweptSheet / max( 0.2, abs( dot( waterN, waterSunDirection ) ) );');
      // The height field's crest-light march never runs on the curl.
      expect(fragment).not.toContain('waterCrestThickness( vWaterWorld');
      // The sheet's own lines come after the column's body, inside its lit branch, before the foam.
      expect(fragment.indexOf(SWEPT_SHEET_BODY)).toBeGreaterThan(fragment.indexOf('waterBody = waterBodyReflectanceLit('));
      expect(fragment.indexOf(SWEPT_SHEET_BODY)).toBeLessThan(fragment.indexOf('float waterCover'));
    }
  });

  it('copies the loft’s sheet and its weight, and draws the lip as the column again when the sheet is off (dev)', () => {
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    const loft = {
      ...oneQuad(), sheet: new Float32Array([0.1, 0.2, 0.3, 0.4]), sheetWeight: new Float32Array([0, 0.5, 1, 1]), sheetBack: new Float32Array([0, 0.25, 0.5, 1]),
    };
    swept.update(loft);
    const attribute = (name: string) => Array.from(swept.mesh.geometry.getAttribute(name).array.slice(0, 4));
    expect(attribute('sweptSheet').map((v) => +v.toFixed(3))).toEqual([0.1, 0.2, 0.3, 0.4]);
    expect(attribute('sweptSheetWeight')).toEqual([0, 0.5, 1, 1]);
    expect(attribute('sweptSheetBack')).toEqual([0, 0.25, 0.5, 1]);
    swept.sheetShown = false;
    swept.update(loft);
    expect(attribute('sweptSheetWeight')).toEqual([0, 0, 0, 0]);
  });

  it('gives every vertex of a slice its back wall’s place and normal, a third of the way down from the throat', () => {
    const records = new Float32Array(21 * FRONT_STRIDE);
    for (let k = 0; k < 21; k += 1) {
      const o = k * FRONT_STRIDE;
      records[o + FRONT_FIELD.x] = k + 0.5; records[o + FRONT_FIELD.z] = -100; records[o + FRONT_FIELD.front] = 1; records[o + FRONT_FIELD.sigma] = k;
      records[o + FRONT_FIELD.tau] = 0.1; records[o + FRONT_FIELD.footHeight] = 2.1; records[o + FRONT_FIELD.footDepth] = 7; records[o + FRONT_FIELD.throwZ] = -100;
    }
    const loft = new SweptLoft(new ProfileLibrary([tubeCase(0.3)]), 0.05).build(records, 21, 0.5, () => 0.5);
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    swept.update(loft);
    const wall = swept.mesh.geometry.getAttribute('sweptWall').array;
    const normal = swept.mesh.geometry.getAttribute('sweptWallNormal').array;
    const slice = 7;
    const from = 3 * (slice * LOFT_SAMPLES + LOFT.extensionSamples + WALL_POINT);
    for (const j of [0, 40, LOFT_SAMPLES - 1]) {
      const o = 3 * (slice * LOFT_SAMPLES + j);
      expect(Array.from(wall.slice(o, o + 3))).toEqual(Array.from(loft.positions.slice(from, from + 3)));
      expect(Array.from(normal.slice(o, o + 3))).toEqual(Array.from(loft.normals.slice(from, from + 3)));
    }
  });

  it('draws a dev view only when asked, in its own program, and back to the water’s', () => {
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    const plain = compiled(swept.mesh.material);
    expect(plain.vertex).not.toContain('sweptView');
    expect(swept.mesh.geometry.getAttribute('sweptView')).toBeUndefined();
    swept.setView('phase');
    expect(swept.mesh.material.customProgramCacheKey()).toBe('breakline-swept-barrel-classic-view-phase');
    const viewed = compiled(swept.mesh.material);
    expect(viewed.vertex).toContain('vSweptView = sweptView;');
    expect(viewed.fragment).toContain('gl_FragColor = vec4( vSweptView');
    swept.setView(undefined);
    expect(swept.mesh.material.customProgramCacheKey()).toBe('breakline-swept-barrel-classic');
    expect(compiled(swept.mesh.material)).toEqual(plain);
  });

  it('colours the dev views by phase, and the region view by the lip, the back wall and the rest', () => {
    const loft = { ...oneQuad(), lift: new Float32Array([1, 1, 0, 1]), slicePhase: new Uint8Array([2, 0]) };
    const out = new Float32Array(12);
    sweptViewColours('phase', loft, out);
    // After touchdown red; resting on the water, dimmed to 0.3 of it.
    expect(Array.from(out.slice(0, 3))).toEqual([1, 0.15, 0.1].map((c) => Math.fround(c)));
    expect(out[6]).toBeCloseTo(0.3, 6);
    const regions = { ...loft, sheetWeight: new Float32Array([1, 0, 0, 0]) };
    sweptViewColours('region', regions, out);
    expect(Array.from(out.slice(0, 3))).toEqual([1, 0, 0]);
    expect(Array.from(out.slice(3, 6))).toEqual([0, 1, 0]);
  });

  it('draws each triangle facing the way the loft’s normals point, so a double-sided material keeps them', () => {
    // A double-sided material turns a back face's normal round: a curl wound inward was shaded as the water's inside.
    const records = new Float32Array(21 * FRONT_STRIDE);
    for (let k = 0; k < 21; k += 1) {
      const o = k * FRONT_STRIDE;
      records[o + FRONT_FIELD.x] = k + 0.5; records[o + FRONT_FIELD.z] = -100; records[o + FRONT_FIELD.front] = 1; records[o + FRONT_FIELD.sigma] = k;
      records[o + FRONT_FIELD.tau] = 0.1; records[o + FRONT_FIELD.footHeight] = 2.1; records[o + FRONT_FIELD.footDepth] = 7; records[o + FRONT_FIELD.throwZ] = -100;
    }
    const loft = new SweptLoft(new ProfileLibrary([tubeCase(0.3)]), 0.05).build(records, 21, 0.5, () => 0.5);
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    const facing = () => {
      swept.update(loft);
      const index = swept.mesh.geometry.getIndex()!.array;
      const p = loft.positions;
      let out = 0;
      let inward = 0;
      for (let t = 0; t < swept.mesh.geometry.drawRange.count; t += 3) {
        const [a, b, c] = [index[t], index[t + 1], index[t + 2]];
        const e1 = [0, 1, 2].map((k) => p[3 * b + k] - p[3 * a + k]);
        const e2 = [0, 1, 2].map((k) => p[3 * c + k] - p[3 * a + k]);
        const g = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
        if (Math.hypot(...g) < 1e-9) continue;
        const n = [0, 1, 2].map((k) => loft.normals[3 * a + k] + loft.normals[3 * b + k] + loft.normals[3 * c + k]);
        if (g[0] * n[0] + g[1] * n[1] + g[2] * n[2] > 0) out += 1;
        else inward += 1;
      }
      return { out, inward };
    };
    const drawn = facing();
    expect(drawn.out).toBeGreaterThan(1000);
    // Every cell, the folds' too: those keep the loft's order, so the material turns their leaning normals back out.
    expect(drawn.inward).toBe(0);
    swept.facesOut = false;
    const loftOwn = facing();
    expect(loftOwn.out / loftOwn.inward).toBeLessThan(0.01);
  });
});
