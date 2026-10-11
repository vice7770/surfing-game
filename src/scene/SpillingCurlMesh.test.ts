import { ShaderLib, type WebGLProgramParametersWithUniforms } from 'three';
import { describe, expect, it } from 'vitest';
import { CURL_CAPACITY, CURL_FIELD, CURL_STRIDE } from '../wave/SpillingCurl';
import { CURL_POINTS, CURL_VERTICES, SpillingCurlMesh, buildCurlRibbon, createCurlRibbon } from './SpillingCurlMesh';
import { RICH_LIP_GLOW, RICH_SHEET_BODY, SWEPT_SHEET_BODY } from './barrel/SweptBarrelMesh';
import { WaterSurface, type SurfaceSource } from './WaterSurface';

const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 8, nz: 8 };
const source: SurfaceSource = { grid, time: 0, bedRevision: 0, write: () => {}, writeBed: () => {} };
function compiled(material: { onBeforeCompile: (shader: WebGLProgramParametersWithUniforms, renderer: never) => void }) {
  const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader } as unknown as WebGLProgramParametersWithUniforms;
  material.onBeforeCompile(shader, undefined as never);
  return { vertex: shader.vertexShader, fragment: shader.fragmentShader };
}

/** A face falling 0.3 m per metre toward the beach (+z) from a crest at z = 0, 1 m above the datum. */
const face = (_x: number, z: number) => 1 - 0.3 * Math.max(0, z);

/** Slices of one wave along x, its curl growing from nothing at the front (largest x) to touchdown, then whitening. */
function slices(widths: number[], wave = 1, whites = widths.map(() => 0)): Float32Array {
  const out = new Float32Array(CURL_CAPACITY * CURL_STRIDE);
  widths.forEach((width, s) => {
    const o = s * CURL_STRIDE;
    out[o + CURL_FIELD.x] = 10 - s;
    out[o + CURL_FIELD.z] = 0;
    out[o + CURL_FIELD.y] = 1;
    out[o + CURL_FIELD.normalX] = 0;
    out[o + CURL_FIELD.normalZ] = 1;
    out[o + CURL_FIELD.length] = width / 0.37;
    out[o + CURL_FIELD.width] = width;
    out[o + CURL_FIELD.tilt] = (47 * Math.PI) / 180;
    out[o + CURL_FIELD.thickness] = 0.07 * (width / 0.33);
    out[o + CURL_FIELD.white] = whites[s];
    out[o + CURL_FIELD.wave] = wave;
    out[o + CURL_FIELD.height] = 1;
  });
  return out;
}

describe('the spilling lip\'s mesh', () => {
  it('lofts each wave\'s slices into one ribbon, within its 1.5k-vertex budget', () => {
    expect(CURL_VERTICES).toBeLessThanOrEqual(1500);
    // Six slices from the front (nothing yet, at x = 10) back: its old end is closed by a slice of nothing.
    const ribbon = buildCurlRibbon(slices([0, 0.1, 0.2, 0.33, 0.2, 0.05]), 6, face, createCurlRibbon());
    expect(ribbon.vertexCount).toBe(7 * CURL_POINTS);
    expect(ribbon.indexCount).toBe(6 * (CURL_POINTS - 1) * 6);
    expect(ribbon.positions[0]).toBe(4.5);
    // Two waves, or one with a gap along shore, make separate ribbons.
    // Two waves, or one with a gap along shore, make separate ribbons, each closed at both ends.
    const two = slices([0.1, 0.2, 0.3]);
    two[1 * CURL_STRIDE + CURL_FIELD.wave] = 2;
    expect(buildCurlRibbon(two, 3, face, createCurlRibbon()).indexCount).toBe(3 * 2 * (CURL_POINTS - 1) * 6);
    const gap = slices([0.1, 0.2]);
    gap[CURL_STRIDE + CURL_FIELD.x] = 7;
    expect(buildCurlRibbon(gap, 2, face, createCurlRibbon()).indexCount).toBe(2 * 2 * (CURL_POINTS - 1) * 6);
  });

  it('stands its lip no more than 0.2 H over the crest, the void under it as high as the face allows, root and tip buried', () => {
    const ribbon = buildCurlRibbon(slices([0.33, 0.33]), 2, face, createCurlRibbon());
    // The first slice after the closing one.
    const height = (v: number) => ribbon.positions[3 * (CURL_POINTS + v) + 1];
    const z = (v: number) => ribbon.positions[3 * (CURL_POINTS + v) + 2];
    expect(height(0)).toBeLessThan(face(0, z(0)));
    // Over the crest's top (1 m), at most 0.2 H (H 1 m here).
    let top = 0;
    for (let k = 0; k < CURL_POINTS; k += 1) top = Math.max(top, height(k) - 1);
    expect(top).toBeLessThanOrEqual(0.2 + 1e-6);
    expect(top).toBeGreaterThan(0.15);
    // The void: the underside over the face, as high as the face's drop allows under the lip, within W.
    let void_ = 0;
    for (let k = 1 + 9 + 2; k < CURL_POINTS - 1; k += 1) void_ = Math.max(void_, height(k) - face(0, z(k)));
    expect(void_).toBeGreaterThan(0.15);
    expect(void_).toBeLessThanOrEqual(0.33);
    // Buried: the root behind the crest, where it lands, the tip's foot and the void's back foot.
    const feet = ribbon.positions.filter((_, i) => i % 3 === 1).slice(CURL_POINTS, 2 * CURL_POINTS).filter((y, k) => y < face(0, z(k)) - 0.01);
    expect(feet.length).toBe(4);
    // It lands about 0.6 H ahead of the crest (L cos θ), its overhang reaching no further than 1.15 times that.
    const landing = (0.33 / 0.37) * Math.cos((47 * Math.PI) / 180);
    expect(z(1 + 9)).toBeCloseTo(landing, 5);
    let ahead = 0;
    for (let k = 0; k < CURL_POINTS; k += 1) ahead = Math.max(ahead, z(k));
    expect(ahead).toBeGreaterThan(landing);
    expect(ahead).toBeLessThanOrEqual(1.15 * landing);
  });

  it('faces every triangle the way its vertices\' normals point, so the sheet is lit on its outer side', () => {
    const ribbon = buildCurlRibbon(slices([0.05, 0.2, 0.33, 0.33, 0.15]), 5, face, createCurlRibbon());
    const p = ribbon.positions;
    const n = ribbon.normals;
    let facing = 0;
    // Away from the closing slices at both ends, where the ribbon pinches to nothing.
    const closing = (v: number) => v < CURL_POINTS || v >= ribbon.vertexCount - CURL_POINTS;
    for (let i = 0; i < ribbon.indexCount; i += 3) {
      if ([ribbon.indices[i], ribbon.indices[i + 1], ribbon.indices[i + 2]].some(closing)) continue;
      const [a, b, c] = [ribbon.indices[i], ribbon.indices[i + 1], ribbon.indices[i + 2]].map((v) => 3 * v);
      const e1 = [p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]];
      const e2 = [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]];
      const cross = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      const area = Math.hypot(cross[0], cross[1], cross[2]);
      if (area < 1e-6) continue;
      const sum = [0, 1, 2].map((k) => n[a + k] + n[b + k] + n[c + k]);
      expect(cross[0] * sum[0] + cross[1] * sum[1] + cross[2] * sum[2]).toBeGreaterThan(0);
      facing += 1;
    }
    expect(facing).toBeGreaterThan(50);
    for (let v = 0; v < ribbon.vertexCount; v += 1) expect(Math.hypot(n[3 * v], n[3 * v + 1], n[3 * v + 2])).toBeCloseTo(1, 6);
  });

  it('stays green and clear while it falls, and whitens from where it lands as its void fills', () => {
    const green = buildCurlRibbon(slices([0.3, 0.33]), 2, face, createCurlRibbon());
    expect(Math.max(...green.foam.subarray(0, green.vertexCount))).toBe(0);
    expect(Math.max(...green.sheetWeight.subarray(0, green.vertexCount))).toBe(1);
    // Lofted along shore in x order: half filled at x = 9 first, then filled at x = 10.
    const white = buildCurlRibbon(slices([0.1, 0.05], 1, [1, 0.5]), 2, face, createCurlRibbon());
    // The tip whitens first; filled, it is white where it lands, its sheet gone (after the closing slice).
    const tip = CURL_POINTS + 1 + 8;
    expect(white.foam[tip]).toBeGreaterThan(0);
    expect(white.foam[tip]).toBeGreaterThan(white.foam[CURL_POINTS + 1]);
    expect(white.foam[CURL_POINTS + tip]).toBe(1);
    expect(white.sheetWeight[CURL_POINTS + tip]).toBe(0);
  });

  it('shades its lip as the swept barrel\'s thin backlit sheet in both looks, on the water\'s uniforms, and hides with none', () => {
    const curl = new SpillingCurlMesh(new WaterSurface(source).materialUniforms);
    for (const look of ['classic', 'rich'] as const) {
      curl.setLook(look);
      const { vertex, fragment } = compiled(curl.mesh.material);
      expect(vertex).toContain('vWaterFoam = curlFoam;');
      expect(fragment).toContain(look === 'rich' ? RICH_SHEET_BODY + RICH_LIP_GLOW : SWEPT_SHEET_BODY);
      expect(curl.mesh.material.customProgramCacheKey()).toBe(`breakline-spilling-curl-${look}`);
    }
    curl.update(slices([0.2, 0.3]), 2, face);
    expect(curl.mesh.visible).toBe(true);
    expect(curl.mesh.geometry.drawRange.count).toBe(3 * (CURL_POINTS - 1) * 6);
    curl.update(slices([]), 0, face);
    expect(curl.mesh.visible).toBe(false);
  });
});
