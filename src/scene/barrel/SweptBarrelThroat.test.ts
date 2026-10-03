import { ShaderLib, type WebGLProgramParametersWithUniforms } from 'three';
import { describe, expect, it } from 'vitest';
import { FRONT_FIELD, FRONT_STRIDE } from '../../wave/barrel/frontRecords';
import { LANDMARK, ProfileLibrary } from '../../wave/barrel/ProfileLibrary';
import { LOFT, LOFT_SAMPLES, SweptLoft, THROAT, mouthSkyShare, throatEase } from '../../wave/barrel/sweptLoft';
import { tubeCase } from '../../wave/barrel/toyCase';
import { WaterSurface, type SurfaceSource } from '../WaterSurface';
import { MOUTH_MARGIN, RICH_THROAT, SweptBarrelMesh, lipCrossing } from './SweptBarrelMesh';

const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 8, nz: 8 };
const source: SurfaceSource = { grid, time: 0, bedRevision: 0, write: () => {}, writeBed: () => {} };
function compiled(material: { onBeforeCompile: (shader: WebGLProgramParametersWithUniforms, renderer: never) => void }) {
  const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader } as unknown as WebGLProgramParametersWithUniforms;
  material.onBeforeCompile(shader, undefined as never);
  return { vertex: shader.vertexShader, fragment: shader.fragmentShader };
}
/** The toy tube's front: 21 points along +x at z = −100, at h0 7 m, each at its own τ. */
function records(tau: (k: number) => number): Float32Array {
  const out = new Float32Array(21 * FRONT_STRIDE);
  for (let k = 0; k < 21; k += 1) {
    const o = k * FRONT_STRIDE;
    out[o + FRONT_FIELD.x] = k + 0.5; out[o + FRONT_FIELD.z] = -100; out[o + FRONT_FIELD.front] = 1; out[o + FRONT_FIELD.sigma] = k;
    out[o + FRONT_FIELD.tau] = tau(k); out[o + FRONT_FIELD.footHeight] = 2.1; out[o + FRONT_FIELD.footDepth] = 7; out[o + FRONT_FIELD.throwZ] = -100;
  }
  return out;
}

describe('the throat’s light near the lip and the mouth (look-fix round 1)', () => {
  it('finds where a direction crosses the lip between its tip and its root, by angle', () => {
    const tip: [number, number] = [1, 1];
    const root: [number, number] = [-1, 1];
    expect(lipCrossing(tip, root, tip)).toBeCloseTo(0, 9);
    expect(lipCrossing(tip, root, root)).toBeCloseTo(1, 9);
    expect(lipCrossing(tip, root, [0, 1])).toBeCloseTo(0.5, 9);
    // On the opening's side of the tip the lip is not crossed.
    expect(lipCrossing(tip, root, [1, 0.2])).toBeLessThan(0);
  });

  it('in the Rich look, shades the inner face from the sun and the sky through the lip where each crosses it', () => {
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    swept.setLook('rich');
    const { vertex, fragment } = compiled(swept.mesh.material);
    expect(vertex).toContain('vSweptCrest = sweptCrest;');
    expect(fragment).toContain(RICH_THROAT);
    expect(RICH_THROAT).not.toContain('sweptLeaves');
    expect(RICH_THROAT).toContain('float sweptCrossing = clamp( sweptLipCrossing( sweptTip, sweptRoot, sweptSun ), 0.0, 1.0 );');
    expect(RICH_THROAT).toContain('reflectedLight.directDiffuse *= sweptSunThrough;');
    // The mirrored ray, the same way through the lip.
    expect(RICH_THROAT).toContain('radiance *= mix( vec3( 1.0 ), exp( -waterAttenuation * sweptMirrorSlant ), vSweptThroat.w * ( 1.0 - sweptMouthShare( sweptMirror, sweptTip ) ) );');
    expect(fragment).toContain(`return smoothstep( ${(1 - MOUTH_MARGIN).toFixed(2)}, ${(1 + MOUTH_MARGIN).toFixed(2)},`);
    // Classic draws none of it.
    swept.setLook('classic');
    expect(compiled(swept.mesh.material).fragment).not.toContain('sweptLipCrossing');
  });

  it('gives the mouth its share of the sky, a disk seen from its axis, and eases the dark in from the tube’s end', () => {
    expect(mouthSkyShare(0, 1)).toBeCloseTo(0.5, 9);
    expect(mouthSkyShare(1, 1)).toBeCloseTo(0.5 * (1 - Math.SQRT1_2), 9);
    expect(mouthSkyShare(100, 1)).toBeLessThan(1e-4);
    expect(throatEase(0.5, 0.5)).toBe(0);
    expect(throatEase(0.75, 0.5)).toBeCloseTo(0.5, 9);
    expect(throatEase(1, 0.5)).toBe(1);
  });

  it('measures the lip’s root thickness per slice, and lights a throat brighter toward its mouth, easing in from it', () => {
    // An open tube from σ 10 on: the slices before have no underside yet.
    const loft = new SweptLoft(new ProfileLibrary([tubeCase(0.3)]), 0.05).build(records((k) => (k < 10 ? -0.3 : 0.1)), 21, 0.5, () => 0.5);
    const formed = Array.from({ length: loft.sliceCount }, (_, s) => s).filter((s) => loft.sliceFormed[s] > 0);
    expect(formed.length).toBeGreaterThan(10);
    for (let s = 0; s < loft.sliceCount; s += 1) expect(loft.sliceLipRoot![s] > 0).toBe(loft.sliceFormed[s] > 0);
    const wall = (s: number) => s * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.throat + 8;
    const first = formed[0];
    // The last slice with an underside before the mouth carries no dark; a slice spacing in, all of it.
    expect(loft.throat[4 * wall(first) + 3]).toBe(0);
    const deep = formed.find((s) => loft.sliceMouth[s] > 2 * LOFT.spacing)!;
    expect(loft.throat[4 * wall(deep) + 3]).toBeCloseTo(loft.lift[wall(deep)], 6);
    expect(loft.throat[4 * wall(deep) + 3]).toBeGreaterThan(0);
    // Toward the mouth the inner face sees more sky.
    const near = formed.find((s) => loft.sliceMouth[s] >= LOFT.spacing && loft.throat[4 * wall(s) + 3] > 0)!;
    expect(loft.throat[4 * wall(near)]).toBeGreaterThan(loft.throat[4 * wall(deep)]);
    expect(THROAT.root).toBe(LANDMARK.crest + 4);
  });

  it('copies each slice’s crest and the lip’s root thickness to its vertices, in the Rich look only', () => {
    const loft = new SweptLoft(new ProfileLibrary([tubeCase(0.3)]), 0.05).build(records(() => 0.1), 21, 0.5, () => 0.5);
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    swept.update(loft);
    const crest = swept.mesh.geometry.getAttribute('sweptCrest').array;
    expect(crest.every((v) => v === 0)).toBe(true);
    swept.setLook('rich');
    swept.update(loft);
    const s = 9;
    const at = 3 * (s * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.crest);
    for (const j of [0, 50, 100]) {
      const v = s * LOFT_SAMPLES + j;
      expect(Array.from(crest.slice(4 * v, 4 * v + 4))).toEqual([loft.positions[at], loft.positions[at + 1], loft.positions[at + 2], loft.sliceLipRoot![s]]);
    }
  });
});
