import { ShaderLib, type WebGLProgramParametersWithUniforms } from 'three';
import { describe, expect, it } from 'vitest';
import { CURL_CAPACITY, CURL_FIELD, CURL_STRIDE, impactTime } from '../wave/SpillingCurl';
import { CURL_POINTS, CURL_VERTICES, SpillingCurlMesh, buildCurlRibbon, createCurlRibbon, type CurlRibbon } from './SpillingCurlMesh';
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

/** A wave 1 m high: its lip lands 0.6 m ahead, 0.06 m thick, touching down at 0.6 s. */
const H = 1;
const LANDING = 0.6;
const LIP = 0.06;
const IMPACT = impactTime(H);

/** Slices of one wave along x from x = 10 down, each `ages[s]` s old (its white from its age), full size unless `front`. */
function slices(ages: number[], wave = 1): Float32Array {
  const out = new Float32Array(CURL_CAPACITY * CURL_STRIDE);
  ages.forEach((age, s) => {
    const o = s * CURL_STRIDE;
    const front = age === 0;
    out[o + CURL_FIELD.x] = 10 - s;
    out[o + CURL_FIELD.z] = 0;
    out[o + CURL_FIELD.y] = 1;
    out[o + CURL_FIELD.normalZ] = 1;
    out[o + CURL_FIELD.length] = front ? 0 : LANDING;
    out[o + CURL_FIELD.width] = front ? 0 : 0.3;
    out[o + CURL_FIELD.tilt] = (47 * Math.PI) / 180;
    out[o + CURL_FIELD.thickness] = front ? 0 : LIP;
    out[o + CURL_FIELD.white] = Math.min(1, Math.max(0, (age - IMPACT) / 0.5));
    out[o + CURL_FIELD.wave] = wave;
    out[o + CURL_FIELD.height] = H;
    out[o + CURL_FIELD.age] = age;
  });
  return out;
}

/** Point k of lofted slice `slice`: its height and its reach ahead of the crest (z here). */
const at = (ribbon: CurlRibbon, slice: number, k: number) => ({
  y: ribbon.positions[3 * (slice * CURL_POINTS + k) + 1], a: ribbon.positions[3 * (slice * CURL_POINTS + k) + 2],
});
/** The cross-section's landmarks: the peak (the outer surface at the crest), the tip, the underside, the floor. */
const PEAK = 2;
const TIP = 2 + 6;
const UNDERSIDE = [9, 10, 11, 12, 13];
const FLOOR = [15, 16, 17];

describe('the spilling lip\'s mesh', () => {
  it('lofts each wave\'s slices into one ribbon closed at its ends, within its 1.5k-vertex budget', () => {
    expect(CURL_VERTICES).toBeLessThanOrEqual(1500);
    // Six slices from the front (x = 10, nothing yet) back: its old end is closed by a slice of nothing.
    const ribbon = buildCurlRibbon(slices([0, 0.1, 0.25, 0.4, 0.55, 0.7]), 6, face, createCurlRibbon());
    expect(ribbon.vertexCount).toBe(7 * CURL_POINTS);
    expect(ribbon.indexCount).toBe(6 * (CURL_POINTS - 1) * 6);
    expect(ribbon.positions[0]).toBe(4.5);
    // Two waves, or one with a gap along shore, make separate ribbons, each closed at both ends.
    const two = slices([0.3, 0.4, 0.5]);
    two[1 * CURL_STRIDE + CURL_FIELD.wave] = 2;
    expect(buildCurlRibbon(two, 3, face, createCurlRibbon()).indexCount).toBe(3 * 2 * (CURL_POINTS - 1) * 6);
    const gap = slices([0.3, 0.4]);
    gap[CURL_STRIDE + CURL_FIELD.x] = 7;
    expect(buildCurlRibbon(gap, 2, face, createCurlRibbon()).indexCount).toBe(2 * 2 * (CURL_POINTS - 1) * 6);
  });

  it('throws its tip out first, nearly level, falling as t², onto the face where it lands at touchdown', () => {
    // One slice at each age through its flight (each lofted with its closing slices: the slice itself is the middle).
    const flight = [0.25, 0.5, 0.75, 1].map((share) => {
      const ribbon = buildCurlRibbon(slices([share * IMPACT]), 1, face, createCurlRibbon());
      return { share, peak: at(ribbon, 1, PEAK), tip: at(ribbon, 1, TIP) };
    });
    for (const { share, peak, tip } of flight) {
      // The crest sharpens no more than 0.1 H over the crest as drawn (1 m), and its tip reaches out at a steady pace.
      expect(peak.y - 1).toBeLessThanOrEqual(0.1 * H + LIP);
      expect(tip.a).toBeCloseTo(share * LANDING, 1);
    }
    // The drop from the peak grows as the square of the flight: a quarter of the way out it has fallen about a sixteenth
    // (measured from the peak's outer surface to the tip's, half a lip apart, so a little more).
    const drop = (k: number) => flight[k].peak.y - flight[k].tip.y;
    expect(drop(0) / drop(3)).toBeLessThan(0.2);
    expect(drop(1) / drop(3)).toBeGreaterThan(0.15);
    expect(drop(1) / drop(3)).toBeLessThan(0.4);
    // At touchdown it is on the face at the landing (within its thickness).
    expect(Math.abs(flight[3].tip.y - face(0, LANDING))).toBeLessThanOrEqual(LIP);
  });

  it('opens its void late in the flight, its underside and the face under it darkened for the sky the lip hides', () => {
    const shade = (ribbon: CurlRibbon, k: number) => ribbon.flow[3 * (CURL_POINTS + k) + 2];
    const alpha = (ribbon: CurlRibbon, k: number) => ribbon.alpha[CURL_POINTS + k];
    const early = buildCurlRibbon(slices([0.3 * IMPACT]), 1, face, createCurlRibbon());
    const late = buildCurlRibbon(slices([0.95 * IMPACT]), 1, face, createCurlRibbon());
    for (const k of FLOOR) {
      expect(alpha(early, k)).toBe(0);
      expect(alpha(late, k)).toBeGreaterThan(0.5);
      expect(shade(late, k)).toBeGreaterThan(0.4);
      // The floor lies on the face, just over it.
      expect(at(late, 1, k).y - face(0, at(late, 1, k).a)).toBeCloseTo(0.03, 3);
    }
    for (const k of UNDERSIDE) expect(shade(late, k)).toBeGreaterThan(0.2);
    // The outer surface is lit as it is.
    for (let k = PEAK; k <= TIP; k += 1) expect(shade(late, k)).toBe(0);
  });

  it('faces every triangle the way its vertices\' normals point, so the sheet is lit on its outer side', () => {
    const ribbon = buildCurlRibbon(slices([0.1, 0.25, 0.4, 0.5, 0.6]), 5, face, createCurlRibbon());
    const p = ribbon.positions;
    const n = ribbon.normals;
    let facing = 0;
    // Away from the closing slices at the ribbon's old end, where it pinches to nothing.
    const closing = (v: number) => v < CURL_POINTS;
    for (let i = 0; i < ribbon.indexCount; i += 3) {
      if ([ribbon.indices[i], ribbon.indices[i + 1], ribbon.indices[i + 2]].some(closing)) continue;
      const [a, b, c] = [ribbon.indices[i], ribbon.indices[i + 1], ribbon.indices[i + 2]].map((v) => 3 * v);
      const e1 = [p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]];
      const e2 = [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]];
      const cross = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      const area = Math.hypot(cross[0], cross[1], cross[2]);
      if (area < 1e-6) continue;
      const sum = [0, 1, 2].map((k) => n[a + k] + n[b + k] + n[c + k]);
      expect(cross[0] * sum[0] + cross[1] * sum[1] + cross[2] * sum[2]).toBeGreaterThan(-1e-4 * area);
      facing += 1;
    }
    expect(facing).toBeGreaterThan(50);
    for (let v = 0; v < ribbon.vertexCount; v += 1) expect(Math.hypot(n[3 * v], n[3 * v + 1], n[3 * v + 2])).toBeCloseTo(1, 6);
  });

  it('stays clear while it falls, then whitens from its tip, bulks, and fades out into its landing with no closed end', () => {
    const falling = buildCurlRibbon(slices([0.8 * IMPACT]), 1, face, createCurlRibbon());
    expect(Math.max(...falling.foam.subarray(0, falling.vertexCount))).toBe(0);
    expect(Math.max(...falling.sheetWeight.subarray(0, falling.vertexCount))).toBeGreaterThan(0.9);
    // A run from a half-filled column to a filled one, the old end's closing slice first.
    const ribbon = buildCurlRibbon(slices([IMPACT + 0.25, IMPACT + 0.5]), 2, face, createCurlRibbon());
    const alpha = (slice: number, k: number) => ribbon.alpha[slice * CURL_POINTS + k];
    const foam = (slice: number, k: number) => ribbon.foam[slice * CURL_POINTS + k];
    // Lofted in x order: the closing slice (x = 8.5), x = 9 (filled), x = 10 (half filled), its closing slice.
    expect(foam(2, TIP)).toBeGreaterThan(foam(2, PEAK));
    expect(alpha(2, PEAK + 2)).toBeGreaterThan(0);
    expect(alpha(2, PEAK + 2)).toBeLessThan(1);
    for (let k = 0; k < CURL_POINTS; k += 1) {
      expect(alpha(0, k)).toBe(0);
      expect(alpha(1, k)).toBe(0);
    }
    // Collapsing, the lip settles onto the face and bulks.
    expect(ribbon.sheet[2 * CURL_POINTS + TIP]).toBeGreaterThan(LIP);
  });

  it('carries the lip\'s arc and place along it for its streaks and ragged tip, none off the lip', () => {
    const ribbon = buildCurlRibbon(slices([0.9 * IMPACT]), 1, face, createCurlRibbon());
    const flow = (k: number) => [0, 1, 2].map((c) => ribbon.flow[3 * (CURL_POINTS + k) + c]);
    expect(flow(PEAK)[0]).toBe(0);
    expect(flow(TIP)[1]).toBe(1);
    // The arc grows from the peak to the tip, longer than the tip's reach.
    for (let k = PEAK + 1; k < TIP; k += 1) expect(flow(k)[0]).toBeGreaterThan(flow(k - 1)[0]);
    expect(flow(TIP)[0]).toBeGreaterThan(0.85 * LANDING);
    for (const k of FLOOR) expect(flow(k).slice(0, 2)).toEqual([0, 0]);
  });

  it('shades its lip in both looks on the water\'s uniforms, with streaks, a ragged tip and a darkened void, and hides with none', () => {
    const curl = new SpillingCurlMesh(new WaterSurface(source).materialUniforms);
    for (const look of ['classic', 'rich'] as const) {
      curl.setLook(look);
      const { vertex, fragment } = compiled(curl.mesh.material);
      expect(vertex).toContain('vWaterFoam = curlFoam;');
      // The face's own column under it, and no dark rim at its silhouette.
      expect(vertex).toContain('vWaterDepth = max( 0.0, waterHeightAt( position.xz ) - waterBedAt( position.xz ) );');
      expect(fragment).toContain('float waterViewCos = max( 0.3, abs( dot( waterN, waterV ) ) );');
      expect(fragment).toContain('diffuseColor.a *= vCurlAlpha;');
      // The thin backlit sheet (the swept barrel's), on the curl's own foam.
      expect(fragment).toContain('float sweptPath = vSweptSheet');
      expect(fragment).toContain('float curlFoam = clamp( vWaterFoam');
      // Streaks scrolled along the lip, fixed in world x; fingers cut from its tip in world x; the void darkened.
      expect(fragment).toContain('vec2 curlUv = vec2( vWaterWorld.x /');
      expect(fragment).toContain('if ( ( vCurlFlow.y - 0.8 ) / 0.2 > 0.25 + 0.75 * curlCut ) discard;');
      expect(fragment).toContain('outgoingLight *= 1.0 - vCurlFlow.z;');
      expect(curl.mesh.material.customProgramCacheKey()).toBe(`breakline-spilling-curl-${look}`);
    }
    curl.update(slices([0.3, 0.4]), 2, face);
    expect(curl.mesh.visible).toBe(true);
    expect(curl.mesh.geometry.drawRange.count).toBe(3 * (CURL_POINTS - 1) * 6);
    curl.update(slices([]), 0, face);
    expect(curl.mesh.visible).toBe(false);
  });
});
