import { ShaderLib, type WebGLProgramParametersWithUniforms } from 'three';
import { describe, expect, it } from 'vitest';
import { FRONT_FIELD, FRONT_STRIDE } from '../../wave/barrel/frontRecords';
import { LANDMARK, ProfileLibrary } from '../../wave/barrel/ProfileLibrary';
import { FRAY, LOFT, LOFT_SAMPLES, NO_CHORD, SweptLoft, frayShare, frayWhiteness } from '../../wave/barrel/sweptLoft';
import { tubeCase } from '../../wave/barrel/toyCase';
import { RICH_FOAM, RICH_REFLECTION } from '../water/richWaterGlsl';
import { beamAttenuation, diffuseAttenuation, schlickFresnel, SPOT_OPTICS } from '../waterOptics';
import { WaterSurface, type SurfaceSource } from '../WaterSurface';
import {
  LIP_GLOW_PATH, NORMAL_GUARD, RICH_FRAY, RICH_LIP_BACK, RICH_LIP_GLOW, RICH_SEA_MIRROR, RICH_THROAT, SWEPT_CHORD_LIGHT, SWEPT_NORMAL_GUARD, SWEPT_SHEET_BODY, SweptBarrelMesh,
  curlFoam, scatteredPass,
} from './SweptBarrelMesh';

const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 8, nz: 8 };
const source: SurfaceSource = { grid, time: 0, bedRevision: 0, write: () => {}, writeBed: () => {} };
function compiled(material: { onBeforeCompile: (shader: WebGLProgramParametersWithUniforms, renderer: never) => void }) {
  const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader } as unknown as WebGLProgramParametersWithUniforms;
  material.onBeforeCompile(shader, undefined as never);
  return { vertex: shader.vertexShader, fragment: shader.fragmentShader };
}
/** The toy tube's front: 21 points along +x at z = −100, at h0 7 m, each at τ 0.1 (an open tube). */
function tubeRecords(): Float32Array {
  const records = new Float32Array(21 * FRONT_STRIDE);
  for (let k = 0; k < 21; k += 1) {
    const o = k * FRONT_STRIDE;
    records[o + FRONT_FIELD.x] = k + 0.5; records[o + FRONT_FIELD.z] = -100; records[o + FRONT_FIELD.front] = 1; records[o + FRONT_FIELD.sigma] = k;
    records[o + FRONT_FIELD.tau] = 0.1; records[o + FRONT_FIELD.footHeight] = 2.1; records[o + FRONT_FIELD.footDepth] = 7; records[o + FRONT_FIELD.throwZ] = -100;
  }
  return records;
}
const E = LOFT.extensionSamples;

describe('the lip’s light, its mirror and its fraying tip (look-fix round 1)', () => {
  it('lengthens the light behind the lip as the glow’s, within the sourced 5–20, so a thin lip already loses its red', () => {
    expect(LIP_GLOW_PATH).toBeGreaterThanOrEqual(5);
    expect(LIP_GLOW_PATH).toBeLessThanOrEqual(20);
    const path = scatteredPass('vSweptSheet');
    expect(path).toBe(`exp( -waterDiffuseAttenuation * ${LIP_GLOW_PATH.toFixed(1)} * vSweptSheet )`);
    expect(RICH_LIP_GLOW).toContain(path);
    // The back light crosses the lip on that path, in place of the unscattered beam's.
    expect(RICH_LIP_BACK).toContain(`( ${path} - sweptReach ) * sweptBack * RECIPROCAL_PI;`);
    // 5 cm of lip: the beam kept red and green alike (white-blue); the lengthened path takes the red's share below 0.8.
    const through = (t: number, k: number, a: readonly number[]) => a.map((c) => Math.exp(-c * k * t));
    const water = diffuseAttenuation(SPOT_OPTICS.padang);
    const beam = through(0.05, 1, beamAttenuation(SPOT_OPTICS.padang));
    const lip = through(0.05, LIP_GLOW_PATH, water);
    expect(beam[0] / beam[1]).toBeGreaterThan(0.95);
    expect(lip[0] / lip[1]).toBeLessThan(0.8);
    // Toward the root, thicker, the red goes first and the green after it: the lip deepens to green-blue.
    const root = through(0.5, LIP_GLOW_PATH, water);
    expect(root[0] / root[1]).toBeLessThan(lip[0] / lip[1]);
    expect(root[1] / root[2]).toBeLessThan(lip[1] / lip[2]);
  });

  it('in the Rich look, adds the back light after the glow, mirrors the sea below the horizon, and frays the tip; Classic none of it', () => {
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    swept.setLook('rich');
    const { fragment } = compiled(swept.mesh.material);
    expect(fragment).toContain(RICH_LIP_BACK);
    expect(fragment.indexOf(RICH_LIP_BACK)).toBeGreaterThan(fragment.indexOf(RICH_LIP_GLOW));
    // The sea's own mirror, once the reflection is scaled and before the throat darkens it.
    expect(fragment).toContain(RICH_SEA_MIRROR);
    expect(fragment.indexOf(RICH_SEA_MIRROR)).toBeGreaterThan(fragment.indexOf('radiance *= waterReflection;'));
    expect(fragment.indexOf(RICH_SEA_MIRROR)).toBeLessThan(fragment.indexOf(RICH_THROAT));
    expect(RICH_REFLECTION).toContain('radiance *= waterReflection;');
    // The fray whitens what the foam block made of the pixel, as a layer of its own right after it (not a line in it).
    expect(fragment).toContain(curlFoam(RICH_FOAM) + RICH_FRAY);
    swept.setLook('classic');
    const classic = compiled(swept.mesh.material).fragment;
    for (const chunk of [RICH_LIP_BACK, RICH_SEA_MIRROR, RICH_FRAY]) expect(classic).not.toContain(chunk);
  });

  it('meets the sky at the horizon: the sea’s mirror is the sky above it where its Fresnel term is 1', () => {
    expect(RICH_SEA_MIRROR).toContain('if ( sweptMirrorWorld.y < 0.0 ) {');
    expect(RICH_SEA_MIRROR).toContain('radiance = waterReflection * mix( sweptSea, sweptSkyAbove, waterFresnel( -sweptMirrorWorld.y ) );');
    // The water's Fresnel twin: 1 at a grazing mirror, the sea's own body by a steep one.
    expect(schlickFresnel(0)).toBe(1);
    expect(schlickFresnel(1)).toBeLessThan(0.03);
    // Its upwelling: the water's own body over the bed under the curl, lit by the sky above and the sun, over π.
    expect(RICH_SEA_MIRROR).toContain('waterBodyGain * waterBodyReflectance( vSweptSeaDepth, -sweptMirrorWorld.y, max( 0.0, waterSunDirection.y ) ) * sweptSeaLight * RECIPROCAL_PI');
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    swept.setLook('rich');
    expect(compiled(swept.mesh.material).vertex).toContain('vSweptSeaDepth = max( 0.0, waterCarvedCubic( position.xz ).x - waterBedAt( position.xz ) );');
  });

  it('turns no normal on the curl from the eye, in both looks, after its relief and before its light', () => {
    expect(NORMAL_GUARD).toBe(0.05);
    expect(SWEPT_NORMAL_GUARD).toContain('if ( sweptFacing < 0.05 ) normal = normalize( normal + ( 0.05 - sweptFacing ) * sweptEye );');
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    for (const look of ['classic', 'rich'] as const) {
      swept.setLook(look);
      const { fragment } = compiled(swept.mesh.material);
      expect(fragment).toContain(SWEPT_NORMAL_GUARD);
      expect(fragment.indexOf(SWEPT_NORMAL_GUARD)).toBeLessThan(fragment.indexOf('vec3 waterN = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );'));
    }
    // The guard's own arithmetic: a normal across the view comes back to face the eye by the margin.
    const eye = [0, 0, 1];
    const n = [1, 0, -0.2].map((c) => c / Math.hypot(1, 0.2));
    const facing = n[2];
    const guarded = n.map((c, i) => c + (NORMAL_GUARD - facing) * eye[i]);
    const length = Math.hypot(...guarded);
    expect(guarded[2] / length).toBeGreaterThan(0);
  });

  it('whitens the lip as a layer of drops does: see-through near an optical depth of 1, white only well past 15', () => {
    // τ = 1.5 · share · W / r with r 1 mm: τ 1 for 0.67 mm of water, τ 15 for 10 mm.
    expect(frayWhiteness(1, (1 * FRAY.drop) / FRAY.depth)).toBeLessThan(0.07);
    expect(frayWhiteness(1, (15 * FRAY.drop) / FRAY.depth)).toBeGreaterThan(0.45);
    expect(frayWhiteness(1, (15 * FRAY.drop) / FRAY.depth)).toBeLessThan(0.55);
    expect(frayWhiteness(1, 0.1)).toBeGreaterThan(0.9);
    expect(frayWhiteness(0, 0.1)).toBe(0);
    // The shader's twin.
    expect(RICH_FRAY).toContain(`float sweptFrayTransport = ${(1 - FRAY.asymmetry).toFixed(2)} * ${FRAY.depth.toFixed(1)} * vSweptFace.z * vSweptSheet / ${FRAY.drop.toFixed(3)};`);
    expect(RICH_FRAY).toContain('float sweptFrayCover = sweptFrayTransport / ( 2.0 + sweptFrayTransport );');
    // Over whatever the foam block left, in the foam's colour and matte; it reads and writes none of the block's own values.
    expect(RICH_FRAY).toContain('diffuseColor.rgb = mix( diffuseColor.rgb, waterFoamColor, sweptFrayCover );');
    expect(RICH_FRAY).toContain('roughnessFactor = mix( roughnessFactor, 0.7, sweptFrayCover );');
    expect(RICH_FRAY).not.toContain('waterCover');
  });

  it('frays all of the sheet at the tip and none a share of the lip back, on open slices with an underside, drawn lofts only', () => {
    expect(frayShare(1, 1)).toBe(1);
    expect(frayShare(1 - FRAY.reach, 1)).toBeCloseTo(0, 9);
    expect(frayShare(1 - FRAY.reach / 2, 1)).toBeCloseTo(0.5, 9);
    expect(frayShare(0.5, 0)).toBe(0);
    const loft = new SweptLoft(new ProfileLibrary([tubeCase(0.3)]), 0.05).build(tubeRecords(), 21, 0.5, () => 0.5);
    const open = Array.from({ length: loft.sliceCount }, (_, s) => s).filter((s) => loft.sliceFormed[s] > 0 && loft.slicePhase[s] === 1);
    expect(open.length).toBeGreaterThan(5);
    for (const s of open) {
      const at = (i: number) => loft.fray![s * LOFT_SAMPLES + E + i];
      expect(at(LANDMARK.lip)).toBeCloseTo(1, 6);
      expect(at(LANDMARK.crest)).toBe(0);
      expect(at(LANDMARK.throat)).toBe(0);
      expect(at(LANDMARK.toe)).toBe(0);
    }
    for (let s = 0; s < loft.sliceCount; s += 1) {
      if (open.includes(s)) continue;
      for (let j = 0; j < LOFT_SAMPLES; j += 1) expect(loft.fray![s * LOFT_SAMPLES + j]).toBe(0);
    }
    // The mesh carries it as the face's third value.
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    swept.update(loft);
    const face = swept.mesh.geometry.getAttribute('sweptFace');
    expect(face.itemSize).toBe(4);
    const v = open[0] * LOFT_SAMPLES + E + LANDMARK.lip;
    expect(face.array[4 * v + 2]).toBeCloseTo(1, 6);
    // The contact never frays.
    const contact = new SweptLoft(new ProfileLibrary([tubeCase(0.3)]), 0.05, { contact: true }).build(tubeRecords(), 21, 0.5, () => 0.5);
    expect(Array.from(contact.fray!.subarray(0, contact.vertexCount)).every((f) => f === 0)).toBe(true);
  });
});

describe('the light that crosses the curl’s water toward the eye (look-fix round 2)', () => {
  it('passes e^(−K k d) on the water’s bound diffuse attenuation: the sheet’s crest light and the lifted back’s chord light, in both looks', () => {
    // The sheet's forward crest light, on its slant path through the sheet.
    expect(SWEPT_SHEET_BODY).toContain(`waterSunRadiance * ${scatteredPass('sweptSunPath')} );`);
    expect(SWEPT_SHEET_BODY).not.toContain('exp( -waterAttenuation * sweptSunPath )');
    // The chord light on the lifted back, on its horizontal chord over the sun's cosine; no fade at the march's 6 m reach
    // (the absorption ends the light), and a line that crosses no water, or more than the march reads, gives none.
    expect(SWEPT_CHORD_LIGHT).toContain('float sweptChordPath = sweptChordWater / max( 0.2, abs( sweptAlong ) );');
    expect(SWEPT_CHORD_LIGHT).toContain(`waterSunRadiance * ${scatteredPass('sweptChordPath')};`);
    expect(SWEPT_CHORD_LIGHT).not.toMatch(/smoothstep|waterAttenuation/);
    expect(SWEPT_CHORD_LIGHT).toContain(`if ( sweptChordWater < ${(NO_CHORD - 0.01).toFixed(2)} ) {`);
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    for (const look of ['classic', 'rich'] as const) {
      swept.setLook(look);
      const { fragment } = compiled(swept.mesh.material);
      expect(fragment).toContain(SWEPT_SHEET_BODY);
      expect(fragment).toContain(SWEPT_CHORD_LIGHT);
      expect(fragment).toContain('uniform vec3 waterDiffuseAttenuation;');
    }
    // The glow and the back light, Rich's: the bound uniform in place of pure water's constant.
    expect(RICH_LIP_GLOW).toContain(scatteredPass('vSweptSheet'));
    expect(RICH_LIP_BACK).toContain(scatteredPass('vSweptSheet'));
    expect(`${RICH_LIP_GLOW}${RICH_LIP_BACK}`).not.toContain('vec3(');
  });

  it('keeps the throat’s sun shadow on the unscattered beam: there the beam is what casts it', () => {
    expect(RICH_THROAT).toContain('exp( -waterAttenuation * sweptSlant )');
    expect(RICH_THROAT).toContain('exp( -waterAttenuation * sweptMirrorSlant )');
    expect(RICH_THROAT).not.toContain('waterDiffuseAttenuation');
  });

  it('is aqua at the lip’s thin tip and teal-green toward its root at midday, gold-tipped at sunset: never a flat fill', () => {
    // Padang's water as the look draws it (K, m⁻¹); the lip's slant path t / |n·L| at least t / 0.2.
    const K = diffuseAttenuation(SPOT_OPTICS.padang);
    const keeps = (path: number) => K.map((c) => Math.exp(-c * LIP_GLOW_PATH * path));
    const luminance = (rgb: readonly number[]) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    const lit = (path: number, sun: readonly number[]) => keeps(path).map((c, i) => c * sun[i]);
    const [tip, root] = [0.05, 0.3];
    // Midday, the sun overhead: the light crossing the lip along its normal (the back light's path).
    const white = [1, 1, 1];
    const [aTip, aRoot] = [lit(tip, white), lit(root, white)];
    expect(luminance(aTip) / luminance(aRoot)).toBeGreaterThanOrEqual(1.3);
    expect(aTip[0] / aTip[1]).toBeLessThan(0.8);
    expect(aRoot[0] / aRoot[1]).toBeLessThan(aTip[0] / aTip[1]);
    expect(aRoot[1]).toBeGreaterThan(aRoot[2] * 0.5);
    // Sunset: the sun's gold crosses the lip on a slant (its cosine to the lip's normal 0.4): gold at the thin edge, green a
    // hand's breadth in, the red gone by the root; the beam e^{−c d} passes the same lip as one flat colour.
    const gold = [1, 0.6, 0.12];
    const slant = (t: number) => t / 0.4;
    const [edge, mid] = [0.01, 0.1];
    const [bEdge, bMid, bRoot] = [lit(slant(edge), gold), lit(slant(mid), gold), lit(slant(root), gold)];
    expect(bEdge[0] / bEdge[1]).toBeGreaterThan(1);
    expect(bMid[0] / bMid[1]).toBeLessThan(0.5);
    expect(bRoot[0] / bRoot[1]).toBeLessThan(0.1);
    expect(luminance(bEdge) / luminance(bRoot)).toBeGreaterThanOrEqual(1.3);
    const c = beamAttenuation(SPOT_OPTICS.padang);
    const flat = (t: number) => c.map((a, i) => Math.exp(-a * slant(t)) * gold[i]);
    expect(luminance(flat(edge)) / luminance(flat(root))).toBeLessThan(1.3);
  });

  it('leaves a lifted back lit gold at its crest and green a hand’s breadth in: over a metre or two of chord the red and green go', () => {
    const K = diffuseAttenuation(SPOT_OPTICS.padang);
    const keeps = (chord: number, cosine: number) => K.map((a) => Math.exp(-a * LIP_GLOW_PATH * (chord / Math.max(0.2, cosine))));
    // At the crest's edge (no chord) the sun's colour comes through whole; a metre of chord along the sun (cosine 0.5):
    // no red, a little green; two metres: nothing but the blue's edge.
    expect(keeps(0, 0.5)).toEqual([1, 1, 1]);
    const [one, two] = [keeps(1, 0.5), keeps(2, 0.5)];
    expect(one[0]).toBeLessThan(1e-3);
    expect(one[1]).toBeLessThan(0.1);
    expect(two[1]).toBeLessThan(1e-2);
    // The beam e^{−c d} would pass 30 % of the green through those two metres and light the back one flat colour.
    const c = beamAttenuation(SPOT_OPTICS.padang);
    expect(Math.exp(-c[1] * (2 / 0.5))).toBeGreaterThan(0.1);
  });
});
