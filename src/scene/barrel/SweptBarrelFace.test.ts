import { ShaderLib, Vector3, type WebGLProgramParametersWithUniforms } from 'three';
import { describe, expect, it } from 'vitest';
import { FRONT_FIELD, FRONT_STRIDE } from '../../wave/barrel/frontRecords';
import { LANDMARK, ProfileLibrary } from '../../wave/barrel/ProfileLibrary';
import { LOFT, LOFT_SAMPLES, SweptLoft } from '../../wave/barrel/sweptLoft';
import { tubeCase } from '../../wave/barrel/toyCase';
import { WaterSurface, type SurfaceSource } from '../WaterSurface';
import { CHOP_UPRIGHT, FACE_MAP, SWEPT_LIFTED_BED, SweptBarrelMesh } from './SweptBarrelMesh';

const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 8, nz: 8 };
const source: SurfaceSource = { grid, time: 0, bedRevision: 0, write: () => {}, writeBed: () => {} };
function compiled(material: { onBeforeCompile: (shader: WebGLProgramParametersWithUniforms, renderer: never) => void }) {
  const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader } as unknown as WebGLProgramParametersWithUniforms;
  material.onBeforeCompile(shader, undefined as never);
  return { vertex: shader.vertexShader, fragment: shader.fragmentShader };
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
const loft = () => new SweptLoft(new ProfileLibrary([tubeCase(0.3)]), 0.05).build(tubeRecords(), 21, 0.5, () => 0.5);

describe('the curl’s face coordinates and relief (look-fix round 1)', () => {
  it('measures each vertex’s arc length along its slice as drawn, 0 at the crest, growing toward the front', () => {
    const l = loft();
    const s = 7;
    const point = (j: number) => new Vector3().fromArray(l.positions, 3 * (s * LOFT_SAMPLES + j));
    const crest = LOFT.extensionSamples + LANDMARK.crest;
    expect(l.arc![s * LOFT_SAMPLES + crest]).toBe(0);
    let arc = 0;
    for (let j = crest + 1; j < LOFT_SAMPLES; j += 1) {
      arc += point(j).distanceTo(point(j - 1));
      expect(l.arc![s * LOFT_SAMPLES + j]).toBeCloseTo(arc, 4);
    }
    arc = 0;
    for (let j = crest - 1; j >= 0; j -= 1) {
      arc -= point(j).distanceTo(point(j + 1));
      expect(l.arc![s * LOFT_SAMPLES + j]).toBeCloseTo(arc, 4);
    }
    // The contact never measures it.
    const contact = new SweptLoft(new ProfileLibrary([tubeCase(0.3)]), 0.05, { contact: true }).build(tubeRecords(), 21, 0.5, () => 0.5);
    expect(Array.from(contact.arc!.subarray(0, contact.vertexCount)).every((a) => a === 0)).toBe(true);
  });

  it('gives each vertex its slice’s σ and its arc length as face coordinates, 0 for a loft without them', () => {
    const l = loft();
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    swept.update(l);
    const face = swept.mesh.geometry.getAttribute('sweptFace').array;
    for (const v of [7 * LOFT_SAMPLES + 3, 7 * LOFT_SAMPLES + 60, 12 * LOFT_SAMPLES + 100]) {
      expect(face[2 * v]).toBeCloseTo(l.sliceSigma[Math.floor(v / LOFT_SAMPLES)], 6);
      expect(face[2 * v + 1]).toBeCloseTo(l.arc![v], 6);
    }
    swept.update({ ...l, arc: undefined });
    expect(face[2 * (7 * LOFT_SAMPLES + 60) + 1]).toBe(0);
  });

  it('in the Rich look, tilts the lifted curl by the ripples at its face coordinates, in the frame of the crest and the profile', () => {
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    swept.setLook('rich');
    const { vertex, fragment } = compiled(swept.mesh.material);
    expect(vertex).toContain('vSweptFace = sweptFace;');
    expect(fragment).toContain('vec2 sweptFaceRippleAt( vec2 p ) {');
    expect(fragment).toContain('vec3 sweptT = normalize( vec3( vSweptChord.y, 0.0, -vSweptChord.x ) );');
    expect(fragment).toContain('vec3 sweptP = cross( sweptT, sweptOut );');
    expect(fragment).toContain('vec3 sweptFaceRelief = normalize( sweptOut - sweptFaceSlope.x * sweptT - sweptFaceSlope.y * sweptP');
    expect(fragment).toContain(`float sweptMapped = smoothstep( ${FACE_MAP[0].toFixed(1)}, ${FACE_MAP[1].toFixed(1)}, vSweptLift );`);
    expect(fragment).toContain(`smoothstep( ${CHOP_UPRIGHT[0].toFixed(1)}, ${CHOP_UPRIGHT[1].toFixed(1)}, sweptOut.y )`);
    expect(fragment).toContain('vec3 waterWorldNormal = normalize( mix( sweptWorldRelief, sweptFaceRelief, sweptMapped ) ) * faceDirection;');
  });

  it('frames the face so its profile direction runs along the arc: ahead on the rests, down the lip’s outer face', () => {
    // T = (ray z, 0, −ray x), along increasing σ; P = T × n.
    const ray = new Vector3(0.6, 0, 0.8);
    const T = new Vector3(ray.z, 0, -ray.x);
    const P = (n: Vector3) => new Vector3().crossVectors(T, n).normalize();
    expect(P(new Vector3(0, 1, 0)).dot(ray)).toBeCloseTo(1, 6);
    // The lip's outer face, leaning out over the trough: its normal up and ahead; the arc runs ahead and down it.
    const outer = new Vector3().addScaledVector(ray, 0.6).add(new Vector3(0, 0.8, 0)).normalize();
    const along = P(outer);
    expect(along.dot(ray)).toBeGreaterThan(0);
    expect(along.y).toBeLessThan(0);
  });

  it('in the Classic look, fades the wind chop where the curl stands up', () => {
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    const { fragment } = compiled(swept.mesh.material);
    expect(fragment).toContain(`vec2 chopSlope = waterChop * chopFade * waterChopSlope( vWaterWorld.xz, waterTime ) * smoothstep( ${CHOP_UPRIGHT[0].toFixed(1)}, ${CHOP_UPRIGHT[1].toFixed(1)}, ( vec4( normal * faceDirection, 0.0 ) * viewMatrix ).y );`);
    expect(fragment).not.toContain('sweptFaceRippleAt');
  });

  it('maps the lace on its face where lifted, and lights no caustic focus there, in both looks', () => {
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    for (const look of ['classic', 'rich'] as const) {
      swept.setLook(look);
      const { fragment } = compiled(swept.mesh.material);
      expect(fragment).toContain('mix( vWaterFoam, sweptFoamCover( waterFootprint ), waterFoamPattern );');
      expect(fragment).toContain('float face = waterFoamCover( vSweptFace, vec2( 0.0 ), vWaterFoam, waterTime, max( faceFootprint.x, faceFootprint.y ) );');
      expect(fragment).toContain(SWEPT_LIFTED_BED);
      // After the column's own body, caustics and all, and before the sheet's.
      expect(fragment.indexOf(SWEPT_LIFTED_BED)).toBeGreaterThan(fragment.indexOf('causticLightAt( waterBedXZ ) );'));
      expect(fragment.indexOf(SWEPT_LIFTED_BED)).toBeLessThan(fragment.indexOf('float sweptPath = vSweptSheet'));
    }
  });
});
