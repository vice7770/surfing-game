import { ShaderLib, Vector3, type WebGLProgramParametersWithUniforms } from 'three';
import { describe, expect, it } from 'vitest';
import { FRONT_FIELD, FRONT_STRIDE } from '../../wave/barrel/frontRecords';
import { LANDMARK, ProfileLibrary } from '../../wave/barrel/ProfileLibrary';
import { LACE_LIFT, LOFT, LOFT_SAMPLES, SweptLoft } from '../../wave/barrel/sweptLoft';
import { tubeCase } from '../../wave/barrel/toyCase';
import { RICH_FOAM } from '../water/richWaterGlsl';
import { CLASSIC_FOAM } from '../waterOptics';
import { WaterSurface, type SurfaceSource } from '../WaterSurface';
import { CHOP_UPRIGHT, FACE_MAP, LACE_CURRENT, SWEPT_FOAM_COORDS, SWEPT_FOAM_RESTORE, SWEPT_LIFTED_BED, SweptBarrelMesh, curlFoam } from './SweptBarrelMesh';

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

  it('gives each vertex its slice’s σ, its arc length and its unroll as face values, 0 for a loft without them', () => {
    const l = loft();
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    swept.update(l);
    const attribute = swept.mesh.geometry.getAttribute('sweptFace');
    expect(attribute.itemSize).toBe(4);
    const face = attribute.array;
    for (const v of [7 * LOFT_SAMPLES + 3, 7 * LOFT_SAMPLES + 60, 12 * LOFT_SAMPLES + 100]) {
      expect(face[4 * v]).toBeCloseTo(l.sliceSigma[Math.floor(v / LOFT_SAMPLES)], 6);
      expect(face[4 * v + 1]).toBeCloseTo(l.arc![v], 6);
      expect(face[4 * v + 3]).toBeCloseTo(l.unroll![v], 6);
    }
    swept.update({ ...l, arc: undefined, unroll: undefined });
    expect(face[4 * (7 * LOFT_SAMPLES + 60) + 1]).toBe(0);
    expect(face[4 * (7 * LOFT_SAMPLES + 60) + 3]).toBe(0);
  });

  it('unrolls the face onto the ground: the arc less the reach along the ray, from the crest behind and the front end ahead, by how far the profile is lifted', () => {
    const l = loft();
    const crest = LOFT.extensionSamples + LANDMARK.crest;
    const last = LOFT_SAMPLES - 1;
    const v = (s: number, j: number) => s * LOFT_SAMPLES + j;
    const reach = (s: number, j: number) => (l.positions[3 * v(s, j)] - l.positions[3 * v(s, crest)]) * l.sliceRayX[s] + (l.positions[3 * v(s, j) + 2] - l.positions[3 * v(s, crest) + 2]) * l.sliceRayZ[s];
    const excess = (s: number, j: number) => {
      const frontExcess = l.arc![v(s, last)] - reach(s, last);
      return j <= crest ? l.arc![v(s, j)] - reach(s, j) : l.arc![v(s, j)] - reach(s, j) - frontExcess;
    };
    const lacing = (lifted: number) => {
      const t = Math.min(1, Math.max(0, (lifted - LACE_LIFT[0]) / (LACE_LIFT[1] - LACE_LIFT[0])));
      return t * t * (3 - 2 * t);
    };
    // Slices from the run's end (the end blend: weights under 1) to its middle.
    const slices = [4, 6, 12];
    expect(l.sliceWeight[slices[0]]).toBeGreaterThan(0);
    expect(l.sliceWeight[slices[0]]).toBeLessThan(0.2);
    expect(l.sliceWeight[slices[1]]).toBeLessThan(0.9);
    expect(l.sliceWeight[slices[2]]).toBe(1);
    for (const s of slices) {
      // Its definition, at every vertex: the excess, from the crest behind it and the front end ahead of it, by the lace's weight on
      // the profile's own lift (1 less its pin: the weight does not move with the slice's, which moves the whole slice).
      for (let j = 0; j < LOFT_SAMPLES; j += 1) {
        expect(l.unroll![v(s, j)]).toBeCloseTo(lacing(l.lift[v(s, j)] / l.sliceWeight[s]) * excess(s, j), 4);
      }
      expect(l.unroll![v(s, crest)]).toBe(0);
      // The rests at either foot are the water's own, whatever the face's length: the back, and the flat ahead of the toe.
      expect(l.unroll![v(s, 0)]).toBeCloseTo(0, 6);
      expect(l.unroll![v(s, last)]).toBeCloseTo(0, 6);
      expect(l.unroll![v(s, last - 1)]).toBeCloseTo(0, 5);
    }
    // The weight is a function of the profile alone: between the crest and the toe, where it is lifted at every weight, the
    // unroll is the whole excess, so it ends at its slice's weight to the ground and not before.
    const toe = LOFT.extensionSamples + LANDMARK.toe;
    for (const s of slices) {
      for (let j = crest; j <= toe; j += 1) expect(l.unroll![v(s, j)]).toBeCloseTo(excess(s, j), 4);
    }
    // The toy tube's lip and face stand steep, so the face lies behind the ground it covers by their extra length, never ahead.
    let deepest = 0;
    for (let j = crest + 1; j < LOFT_SAMPLES; j += 1) {
      expect(l.unroll![v(12, j)]).toBeLessThanOrEqual(1e-5);
      deepest = Math.min(deepest, l.unroll![v(12, j)]);
    }
    expect(deepest).toBeLessThan(-0.5);
    // The contact never measures it.
    const contact = new SweptLoft(new ProfileLibrary([tubeCase(0.3)]), 0.05, { contact: true }).build(tubeRecords(), 21, 0.5, () => 0.5);
    expect(Array.from(contact.unroll!.subarray(0, contact.vertexCount)).every((u) => u === 0)).toBe(true);
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
      // The foam block reads the pixel's xz, moved along the ray by the face's unroll where the profile is lifted (its own
      // weight; the slice's would drag the lace across the slice), with no current where it lies on a face: as its
      // vWaterWorld and vWaterFlow, through the preprocessor, and the resting water's again after it.
      expect(fragment).toContain(SWEPT_FOAM_COORDS);
      expect(SWEPT_FOAM_COORDS).toContain('vec2 sweptFoamUnrolled = vSweptFace.w * vSweptChord.xy;');
      expect(SWEPT_FOAM_COORDS).toContain('vec3 sweptFoamWorld = vec3( vWaterWorld.x + sweptFoamUnrolled.x, vWaterWorld.y, vWaterWorld.z + sweptFoamUnrolled.y );');
      expect(SWEPT_FOAM_COORDS).toContain(`vec2 sweptFoamFlow = vWaterFlow * ( 1.0 - smoothstep( ${LACE_CURRENT[0].toFixed(2)}, ${LACE_CURRENT[1].toFixed(2)}, abs( vSweptFace.w ) ) );`);
      expect(SWEPT_FOAM_COORDS).not.toContain('vSweptLift');
      expect(SWEPT_FOAM_COORDS).toContain('#define vWaterWorld sweptFoamWorld');
      expect(SWEPT_FOAM_COORDS).toContain('#define vWaterFlow sweptFoamFlow');
      expect(SWEPT_FOAM_RESTORE).toContain('#define vWaterWorld sweptShading');
      expect(SWEPT_FOAM_RESTORE).toContain('#define vWaterFlow sweptFlow');
      expect(fragment.indexOf(SWEPT_FOAM_RESTORE)).toBeGreaterThan(fragment.indexOf(SWEPT_FOAM_COORDS));
      expect(fragment).toContain(SWEPT_LIFTED_BED);
      // After the column's own body, caustics and all, and before the sheet's.
      expect(fragment.indexOf(SWEPT_LIFTED_BED)).toBeGreaterThan(fragment.indexOf('causticLightAt( waterBedXZ ) );'));
      expect(fragment.indexOf(SWEPT_LIFTED_BED)).toBeLessThan(fragment.indexOf('float sweptPath = vSweptSheet'));
    }
  });

  it('maps whatever foam block the water has: it comes through whole, between the curl’s coordinates and the resting water’s again', () => {
    // A foam block of another make (a baked life cycle, a layer that adds light, no streak line, no lace call): the curl
    // needs none of the lines the water's block has today, and does not touch them.
    const other = `  vec2 waterFootprint = fwidth( vWaterWorld.xz );
  vec2 waterField = waterFoamField( vWaterWorld.xz, vWaterFlow, vWaterFoam, 0.5, max( waterFootprint.x, waterFootprint.y ) );
  float waterStreakCover = waterStreak( vWaterWorld.xz, vWaterFlow, length( waterSurfaceSlope ), vWaterFoam );
  diffuseColor.rgb = waterBodyGain * waterField.x * vec3( waterStreakCover );`;
    expect(curlFoam(other)).toBe(SWEPT_FOAM_COORDS + other + SWEPT_FOAM_RESTORE);
    for (const foam of [RICH_FOAM, CLASSIC_FOAM]) expect(curlFoam(foam)).toBe(SWEPT_FOAM_COORDS + foam + SWEPT_FOAM_RESTORE);
    // Every define the coordinates make is undone, in order, after the block.
    const defines = (text: string) => text.split('\n').filter((line) => line.startsWith('#')).map((line) => line.trim());
    expect(defines(SWEPT_FOAM_COORDS)).toEqual(['#undef vWaterWorld', '#define vWaterWorld sweptFoamWorld', '#undef vWaterFlow', '#define vWaterFlow sweptFoamFlow']);
    expect(defines(SWEPT_FOAM_RESTORE)).toEqual(['#undef vWaterWorld', '#define vWaterWorld sweptShading', '#undef vWaterFlow', '#define vWaterFlow sweptFlow']);
  });
});
