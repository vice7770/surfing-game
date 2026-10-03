import { PlaneGeometry, ShaderLib, type WebGLProgramParametersWithUniforms } from 'three';
import { describe, expect, it } from 'vitest';
import { FRONT_FIELD, FRONT_STRIDE } from '../../wave/barrel/frontRecords';
import { ProfileLibrary } from '../../wave/barrel/ProfileLibrary';
import { LOFT_SAMPLES, NO_CHORD, SweptLoft, polylineChords } from '../../wave/barrel/sweptLoft';
import { tubeCase } from '../../wave/barrel/toyCase';
import { waterChurnPars } from '../water/churnTexture';
import { richPatchFragmentPars } from '../water/richPatch';
import { RICH_FOAM, richAerationFragmentPars, richFragmentPars, richNormalFragment, richReflectionPars, waterCubicPars } from '../water/richWaterGlsl';
import { waterRipplePars } from '../water/rippleTexture';
import { waterSpecularPars } from '../water/specular';
import { waterStreakPars } from '../water/streaks';
import { waterTubePars } from '../water/tubeCarve';
import { waterChopNormal } from '../waterChop';
import { CLASSIC_FOAM } from '../waterOptics';
import { WaterSurface, waterFragmentPars, type SurfaceSource } from '../WaterSurface';
import { REST_NORMAL, RICH_FRAY, SWEPT_CHORD_LIGHT, SweptBarrelMesh, waterTriangle } from './SweptBarrelMesh';

const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 8, nz: 8 };
/** The water's lace in both looks' foam blocks, which the curl maps on its face where lifted. */
const FOAM_COVER_CALL = 'waterFoamCover( vWaterWorld.xz, vWaterFlow, vWaterFoam, waterTime, max( waterFootprint.x, waterFootprint.y ) )';
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

describe('the curl where it rests on the water (look-fix round 1)', () => {
  it('takes the water’s own normal, foam, air and crest light as far as it rests, in both looks', () => {
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    for (const look of ['classic', 'rich'] as const) {
      swept.setLook(look);
      const { vertex, fragment } = compiled(swept.mesh.material);
      expect(vertex).toContain(`vSweptRest = 1.0 - smoothstep( 0.0, ${REST_NORMAL.toFixed(2)}, sweptLift );`);
      expect(vertex).toContain('vSweptWaterNormal = sweptWaterNormalAt( position.xz );');
      expect(vertex).toContain('objectNormal = normalize( mix( objectNormal, vSweptWaterNormal, vSweptRest ) );');
      // The water's crest light by 1 − the lift; the lifted curl's over its own chords.
      expect(fragment).toContain('totalEmissiveRadiance += 0.350000 * ( 1.0 - vSweptLift ) * ( 1.0 - vWaterFoam ) * waterBehind');
      expect(fragment).toContain('waterCrestThickness( vWaterWorld, vec3( waterToSun.x, 0.0, waterToSun.y ) )');
      expect(fragment).toContain(SWEPT_CHORD_LIGHT);
      expect(fragment).toContain('max( 0.0, vSweptLift - vSweptSheetWeight )');
      // The side of the water the eye is on, where it rests, is the water's: in front of its tangent plane, or above it.
      expect(fragment).toContain('if ( vSweptRest > 0.5 ) faceDirection = dot( cameraPosition - vWaterWorld,');
      expect(fragment).toContain(' >= 0.0 || cameraPosition.y >= vWaterWorld.y ? 1.0 : -1.0;');
      // The water's own surface, foam and current where it rests, standing for its varyings from the pars on.
      for (const define of ['#define vWaterWorld sweptShading', '#define vWaterFoam sweptFoam', '#define vWaterFlow sweptFlow']) {
        expect(fragment.indexOf(define)).toBeGreaterThan(fragment.indexOf('varying vec3 vWaterWorld;'));
        expect(fragment.indexOf(define)).toBeLessThan(fragment.indexOf('void main()'));
      }
      expect(fragment).toContain('sweptShading = vWaterWorld + vSweptRest * sweptReach * sweptRay;');
      // Read before the seam's cut, so the curl and the water read the mask at the same point of a pixel.
      expect(fragment.indexOf('sweptShading = vWaterWorld + vSweptRest')).toBeLessThan(fragment.indexOf('waterBarrelMaskAt( vWaterWorld.xz ) < 0.999'));
    }
  });

  it('in the Rich look, shades it with the water’s own Rich chunks, declared in the water’s order', () => {
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    swept.setLook('rich');
    const { vertex, fragment } = compiled(swept.mesh.material);
    expect(vertex).toContain('vWaterAir = ( 1.0 - sweptLift ) * waterAerationAt( position.xz ).x;');
    // The water's own foam, its lace on the curl's own map where lifted (the face's), and the lip's fray after its streaks.
    const foam = RICH_FOAM.replace(FOAM_COVER_CALL, 'sweptFoamCover( waterFootprint )');
    const streaks = foam.split('\n').find((line) => line.includes('waterStreak('))!;
    expect(fragment).toContain(foam.replace(streaks, streaks + RICH_FRAY));
    // The water's relief, from its own normal chunk: the chop, the ripples on the current, the churn's clumps.
    const relief = richNormalFragment({ ripples: true, churn: true });
    for (const line of ['waterSlope += waterChop * chopFade * waterChopSlope( vWaterWorld.xz, waterTime );', 'waterSlope += waterRippleSlopeAt( vWaterWorld.xz, vWaterFlow );', 'waterSlope += waterFreshNormal * waterChurnSlope( vWaterWorld.xz, vWaterFlow );']) {
      expect(relief).toContain(line);
      expect(fragment).toContain(line);
    }
    let at = -1;
    // As the water's own Rich program has it, its crest light marching through the carved surface (WaterSurface).
    const carved = waterFragmentPars.replace('float gap = waterHeightAt( p.xz ) - p.y;', 'float gap = waterCarve( p.xz, waterHeightAt( p.xz ) ) - p.y;');
    for (const pars of [carved, waterCubicPars, waterTubePars, richFragmentPars, richAerationFragmentPars, waterRipplePars, waterSpecularPars, waterStreakPars, waterChurnPars, richReflectionPars, richPatchFragmentPars]) {
      const next = fragment.indexOf(pars, at + 1);
      expect(next, pars.slice(0, 120)).toBeGreaterThan(at);
      at = next;
    }
    // The ripples' foam gain reads the water's foam where the curl rests: the defines come before its function.
    expect(fragment.indexOf('#define vWaterFoam sweptFoam')).toBeLessThan(fragment.indexOf('vec2 waterRippleSlopeAt('));
  });

  it('in the Classic look, shades it with the water’s own Classic chunks and its own triangles', () => {
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    const { fragment } = compiled(swept.mesh.material);
    expect(fragment).toContain(CLASSIC_FOAM.replace(FOAM_COVER_CALL, 'sweptFoamCover( waterFootprint )'));
    // The water's chop, faded where the curl stands up.
    expect(fragment).toContain(waterChopNormal.replace('#include <normal_fragment_begin>\n', '').split('vec2 chopSlope = ')[0]);
    expect(fragment).toContain('vec3 chopNormal = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );');
    expect(fragment).toContain('sweptWaterTriangleNormal = sweptW.x * sweptNodeNormal( sweptA ) + sweptW.y * sweptNodeNormal( sweptB ) + sweptW.z * sweptNodeNormal( sweptC );');
  });

  it('finds the water mesh’s own triangle and weights under a point, as three’s PlaneGeometry triangulates its cells', () => {
    const [nx, nz] = [6, 5];
    const plane = new PlaneGeometry(nx - 1, nz - 1, nx - 1, nz - 1);
    plane.rotateX(-Math.PI / 2);
    const p = plane.getAttribute('position');
    const index = plane.getIndex()!;
    // Node (i, k) of the grid at x = i, z = k: the mesh is centred on the grid (WaterSurface's createGeometry).
    const node = (v: number): [number, number] => [Math.round(p.getX(v) + (nx - 1) / 2), Math.round(p.getZ(v) + (nz - 1) / 2)];
    for (let n = 0; n < 400; n += 1) {
      const [x, z] = [0.01 + ((n * 0.6180339) % 1) * (nx - 1.02), 0.01 + ((n * 0.4142135) % 1) * (nz - 1.02)];
      // The geometry's triangle holding (x, z), and its weights.
      let found: { nodes: [number, number][]; weights: number[] } | undefined;
      for (let t = 0; t < index.count && !found; t += 3) {
        const [a, b, c] = [index.getX(t), index.getX(t + 1), index.getX(t + 2)].map(node);
        const area = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
        const wb = ((x - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (z - a[1])) / area;
        const wc = ((b[0] - a[0]) * (z - a[1]) - (x - a[0]) * (b[1] - a[1])) / area;
        if (wb >= -1e-9 && wc >= -1e-9 && 1 - wb - wc >= -1e-9) found = { nodes: [a, b, c], weights: [1 - wb - wc, wb, wc] };
      }
      const twin = waterTriangle(x, z);
      // The same three nodes with the same weights, in whatever order the geometry lists them.
      const weightOf = (tri: { nodes: [number, number][]; weights: number[] }, key: string) => tri.weights[tri.nodes.findIndex(([i, k]) => `${i},${k}` === key)];
      for (const [i, k] of twin.nodes) expect(weightOf(found!, `${i},${k}`)).toBeCloseTo(weightOf(twin, `${i},${k}`), 9);
    }
  });

  it('copies each slice’s ray and the chords through it to its vertices, and none for a loft without them', () => {
    const loft = new SweptLoft(new ProfileLibrary([tubeCase(0.3)]), 0.05).build(tubeRecords(), 21, 0.5, () => 0.5);
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    swept.update(loft);
    const chord = swept.mesh.geometry.getAttribute('sweptChord').array;
    const s = 7;
    for (const j of [0, 40, 100, LOFT_SAMPLES - 1]) {
      const v = s * LOFT_SAMPLES + j;
      expect(Array.from(chord.slice(4 * v, 4 * v + 4))).toEqual([loft.sliceRayX[s], loft.sliceRayZ[s], loft.chord![2 * v], loft.chord![2 * v + 1]]);
    }
    swept.update({ ...loft, chord: undefined });
    expect(Array.from(chord.slice(4 * 40 + 2, 4 * 40 + 4))).toEqual([NO_CHORD, NO_CHORD]);
  });

  it('measures the chords on each slice as drawn, where it is lifted', () => {
    const loft = new SweptLoft(new ProfileLibrary([tubeCase(0.3)]), 0.05).build(tubeRecords(), 21, 0.5, () => 0.5);
    const s = Array.from(loft.sliceSigma.subarray(0, loft.sliceCount)).findIndex((sigma) => Math.abs(sigma - 10) < 1e-4);
    const drawn = new Float32Array(2 * LOFT_SAMPLES);
    for (let j = 0; j < LOFT_SAMPLES; j += 1) {
      const v = 3 * (s * LOFT_SAMPLES + j);
      const o = 3 * (s * LOFT_SAMPLES);
      drawn[2 * j] = (loft.positions[v] - loft.positions[o]) * loft.sliceRayX[s] + (loft.positions[v + 2] - loft.positions[o + 2]) * loft.sliceRayZ[s];
      drawn[2 * j + 1] = loft.positions[v + 1];
    }
    const chords = new Float32Array(2 * LOFT_SAMPLES);
    polylineChords(drawn, LOFT_SAMPLES, chords);
    let lifted = 0;
    for (let j = 0; j < LOFT_SAMPLES; j += 1) {
      const v = s * LOFT_SAMPLES + j;
      if (loft.lift[v] > 0) {
        lifted += 1;
        expect(loft.chord![2 * v]).toBeCloseTo(chords[2 * j], 4);
        expect(loft.chord![2 * v + 1]).toBeCloseTo(chords[2 * j + 1], 4);
      } else {
        expect([loft.chord![2 * v], loft.chord![2 * v + 1]]).toEqual([NO_CHORD, NO_CHORD]);
      }
    }
    expect(lifted).toBeGreaterThan(50);
    // The back takes the water ahead of it, toward the face; the face the water behind it.
    expect(Array.from({ length: LOFT_SAMPLES }, (_, j) => loft.chord![2 * (s * LOFT_SAMPLES + j)]).some((c) => c < NO_CHORD)).toBe(true);
  });
});
