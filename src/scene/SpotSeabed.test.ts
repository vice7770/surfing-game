import { MeshBasicMaterial, MeshStandardMaterial, ShaderLib, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createCausticUniforms } from './CausticMap';
import { DIFFUSE_PATH, DIFFUSE_SKY_REFLECTANCE, SUBMERGED_SAND, SpotSeabed, WATERLINE_RAMP, WET_BAND, bedLight } from './SpotSeabed';
import { SPOT_OPTICS, WATER_IOR, beamAttenuation, diffuseAttenuation, schlickFresnel } from './waterOptics';

const waterUniforms = () => ({
  waterAttenuation: { value: new Vector3(0.3, 0.1, 0.05) },
  waterDiffuseAttenuation: { value: new Vector3(0.2, 0.06, 0.02) },
  waterBedAlbedo: { value: new Vector3(0.08, 0.08, 0.025) },
  waterSunDirection: { value: new Vector3(0, 1, 0) },
});

/** The shaders of a seabed material after its `onBeforeCompile`, run on three's own shader sources for it. */
function compiled(material: { onBeforeCompile: (shader: never, renderer: never) => void }, source: 'basic' | 'physical') {
  const shader = { uniforms: {} as Record<string, unknown>, vertexShader: ShaderLib[source].vertexShader, fragmentShader: ShaderLib[source].fragmentShader };
  material.onBeforeCompile(shader as never, undefined as never);
  return shader;
}

describe('SpotSeabed', () => {
  it('places every vertex on the spot bed', () => {
    const depthAt = (x: number, z: number) => 3 + 0.02 * x - 0.03 * z;
    const seabed = new SpotSeabed();
    seabed.setDepth(depthAt, -40, -120, 80, 150, 5);
    const positions = seabed.mesh.geometry.getAttribute('position');
    const world = new Vector3();
    for (let i = 0; i < positions.count; i += 37) {
      world.fromBufferAttribute(positions, i).add(seabed.mesh.position);
      // Vertex positions are 32-bit floats.
      expect(world.y).toBeCloseTo(-depthAt(world.x, world.z), 5);
    }
    expect(seabed.mesh.visible).toBe(true);
    // Without a map of the bed, it is the spot's bed everywhere.
    const reef = seabed.mesh.geometry.getAttribute('seabedReef');
    expect(reef.count).toBe(positions.count);
    expect(Array.from(reef.array as Float32Array).every((value) => value === 1)).toBe(true);
  });

  it('marks each vertex reef or sand from the spot\'s own map of its bed', () => {
    const seabed = new SpotSeabed();
    // Reef seaward of z = −20, sand inshore of it (a beach face).
    seabed.setDepthOnGrid((_x, z) => -z / 10, [-10, 0, 10], [-40, -30, -20, -10, 0], (_x, z) => z < -20);
    const positions = seabed.mesh.geometry.getAttribute('position');
    const reef = seabed.mesh.geometry.getAttribute('seabedReef');
    for (let i = 0; i < positions.count; i += 1) expect(reef.getX(i)).toBe(positions.getZ(i) < -20 ? 1 : 0);
  });

  it('lights its sand with the caustic map, faded by the water on the way down', () => {
    const seabed = new SpotSeabed();
    const caustics = createCausticUniforms();
    const water = waterUniforms();
    seabed.useCaustics(caustics, water);
    const shader = compiled(seabed.mesh.material, 'basic');
    expect(shader.vertexShader).toContain('vSeabedWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    expect(shader.fragmentShader).toContain('causticLightAt( vSeabedWorld.xz )');
    expect(shader.fragmentShader).toContain('exp( -waterAttenuation');
    expect(shader.uniforms.causticMap).toBe(caustics.causticMap);
    expect(shader.uniforms.waterAttenuation).toBe(water.waterAttenuation);
  });
});

describe('the seabed’s two looks', () => {
  it('paints the bed in Classic and lights it in Rich, and is the painted bed again on return', () => {
    const seabed = new SpotSeabed();
    const painted = seabed.mesh.material;
    expect(painted).toBeInstanceOf(MeshBasicMaterial);
    expect(seabed.look).toBe('classic');
    seabed.setLook('rich');
    const lit = seabed.mesh.material as MeshStandardMaterial;
    expect(lit).toBeInstanceOf(MeshStandardMaterial);
    // A rough Lambertian bed: the sun and sky light it, nothing shines.
    expect(lit.roughness).toBe(1);
    expect(lit.metalness).toBe(0);
    expect(lit.vertexColors).toBe(false);
    expect(lit.fog).toBe(true);
    seabed.setLook('classic');
    expect(seabed.mesh.material).toBe(painted);
    expect((painted as MeshBasicMaterial).vertexColors).toBe(true);
  });

  it('leaves the painted bed’s shader as it was: no lit bed in it, whatever the look it has been through', () => {
    const seabed = new SpotSeabed();
    seabed.useCaustics(createCausticUniforms(), waterUniforms());
    const before = compiled(seabed.mesh.material, 'basic');
    seabed.setLook('rich');
    seabed.setLook('classic');
    const after = compiled(seabed.mesh.material, 'basic');
    expect(after.fragmentShader).toBe(before.fragmentShader);
    expect(after.vertexShader).toBe(before.vertexShader);
    for (const rich of ['seabedWet', 'waterBedAlbedo', 'waterDiffuseAttenuation', 'seabedWaterLevel', 'seabedFromSun']) {
      expect(after.fragmentShader).not.toContain(rich);
    }
    expect(seabed.mesh.material.customProgramCacheKey()).toBe('breakline-spot-seabed-caustics');
  });

  it('colours the Rich bed dry sand above the waterline and the spot’s bed under it, and lights it from the sun and sky through the water', () => {
    const seabed = new SpotSeabed();
    const caustics = createCausticUniforms();
    const water = waterUniforms();
    seabed.useCaustics(caustics, water);
    seabed.setLook('rich');
    seabed.setWaterLevel(0.8);
    const shader = compiled(seabed.mesh.material, 'physical');
    const { fragmentShader, vertexShader } = shader;
    expect(vertexShader).toContain('vSeabedWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    // The material's own colour is the dry sand; the spot's bed albedo, from the water's uniform, takes over under the waterline.
    expect(fragmentShader).toContain(`smoothstep( seabedWaterLevel - ${WET_BAND.toFixed(2)}, seabedWaterLevel + ${WET_BAND.toFixed(2)}, vSeabedWorld.y )`);
    // Under the waterline: the spot's bed where its map says reef, carbonate sand elsewhere (the vertex's mark).
    expect(vertexShader).toContain('attribute float seabedReef;');
    expect(vertexShader).toContain('vSeabedReef = seabedReef;');
    expect(fragmentShader).toContain(`diffuseColor.rgb = mix( diffuseColor.rgb, mix( vec3( ${SUBMERGED_SAND.map((v) => v.toFixed(4)).join(', ')} ), waterBedAlbedo, vSeabedReef ), seabedWet );`);
    // The lights have lit it by then; the water takes its share of them, the caustics on the sun's beam alone and only where it is wet.
    const scaled = fragmentShader.indexOf('reflectedLight.directDiffuse *= seabedFromSun;');
    expect(scaled).toBeGreaterThan(fragmentShader.indexOf('#include <lights_fragment_end>'));
    expect(scaled).toBeGreaterThan(fragmentShader.indexOf('seabedBeam'));
    expect(fragmentShader).toContain('mix( 1.0, causticLightAt( vSeabedWorld.xz ), seabedWet )');
    expect(fragmentShader).toContain('reflectedLight.indirectDiffuse *= seabedFromSky;');
    expect(fragmentShader).toContain('exp( -waterDiffuseAttenuation * seabedDepth / seabedCos )');
    expect(fragmentShader).toContain(`float seabedUnder = clamp( seabedDepth / ${WATERLINE_RAMP.toFixed(2)}, 0.0, 1.0 );`);
    expect(fragmentShader).toContain(`${(1 - DIFFUSE_SKY_REFLECTANCE).toFixed(3)} * exp( -${DIFFUSE_PATH.toFixed(2)} * waterDiffuseAttenuation * seabedDepth )`);
    expect(shader.uniforms.waterBedAlbedo).toBe(water.waterBedAlbedo);
    expect(shader.uniforms.waterDiffuseAttenuation).toBe(water.waterDiffuseAttenuation);
    expect(shader.uniforms.causticMap).toBe(caustics.causticMap);
    expect((shader.uniforms.seabedWaterLevel as { value: number }).value).toBe(0.8);
    // The tide moves the waterline for the program already built.
    seabed.setWaterLevel(-0.4);
    expect((shader.uniforms.seabedWaterLevel as { value: number }).value).toBe(-0.4);
    expect(seabed.mesh.material.customProgramCacheKey()).toBe('breakline-spot-seabed-lit');
  });
});

describe('the water the Rich bed is lit through', () => {
  it('is the Rich look\'s own where the water binds it, and the shared optics otherwise; Classic\'s caustics keep the shared', () => {
    const plain = waterUniforms();
    const rich = { ...plain, richAttenuation: { value: new Vector3(0.4, 0.2, 0.1) }, richDiffuseAttenuation: { value: new Vector3(0.3, 0.1, 0.05) } };
    for (const [water, beam, diffuse] of [[plain, plain.waterAttenuation, plain.waterDiffuseAttenuation], [rich, rich.richAttenuation, rich.richDiffuseAttenuation]] as const) {
      const seabed = new SpotSeabed();
      seabed.useCaustics(createCausticUniforms(), water);
      const painted = compiled(seabed.mesh.material, 'basic');
      expect(painted.uniforms.waterAttenuation).toBe(plain.waterAttenuation);
      seabed.setLook('rich');
      const lit = compiled(seabed.mesh.material, 'physical');
      expect(lit.uniforms.waterAttenuation).toBe(beam);
      expect(lit.uniforms.waterDiffuseAttenuation).toBe(diffuse);
      expect(lit.uniforms.waterBedAlbedo).toBe(plain.waterBedAlbedo);
    }
  });

  it('takes carbonate sand under water off the spot\'s reef, as bright as the Reef\'s bed and far brighter than Padang Padang\'s coral', () => {
    expect(SUBMERGED_SAND).toEqual(SPOT_OPTICS.reef.bedAlbedo);
    for (let i = 0; i < 3; i += 1) expect(SUBMERGED_SAND[i]).toBeGreaterThan(4 * SPOT_OPTICS.padang.bedAlbedo[i]);
  });
});

describe('the light on the Rich bed under water', () => {
  const optics = SPOT_OPTICS.padang;
  const beam = beamAttenuation(optics);
  const diffuse = diffuseAttenuation(optics);

  it('is the same as in air at the waterline, and the water\'s from the ramp\'s depth on', () => {
    const light = bedLight(beam, diffuse, 0, 0.8);
    expect(light.sun).toEqual([1, 1, 1]);
    expect(light.sky).toEqual([1, 1, 1]);
    // Half-way down the ramp, half-way between the air's light and the water's at that depth.
    const half = bedLight(beam, diffuse, WATERLINE_RAMP / 2, 0.8);
    const water = (1 - DIFFUSE_SKY_REFLECTANCE) * Math.exp(-DIFFUSE_PATH * diffuse[1] * WATERLINE_RAMP / 2);
    expect(half.sky[1]).toBeCloseTo(1 + 0.5 * (water - 1), 12);
    const past = bedLight(beam, diffuse, WATERLINE_RAMP, 1);
    expect(past.sky[1]).toBeCloseTo((1 - DIFFUSE_SKY_REFLECTANCE) * Math.exp(-DIFFUSE_PATH * diffuse[1] * WATERLINE_RAMP), 12);
  });

  it('falls with depth, red first, the sun’s beam through the refracted path and the sky’s light through the diffuse one', () => {
    const shallow = bedLight(beam, diffuse, 2, 1);
    const deep = bedLight(beam, diffuse, 10, 1);
    for (let i = 0; i < 3; i += 1) {
      expect(deep.sun[i]).toBeLessThan(shallow.sun[i]);
      expect(deep.sky[i]).toBeLessThan(shallow.sky[i]);
    }
    // Red is gone first: at 10 m Padang Padang's bed keeps far less of its red than its blue.
    expect(deep.sun[0]).toBeLessThan(0.1 * deep.sun[2]);
    expect(deep.sky[0]).toBeLessThan(0.1 * deep.sky[2]);
    // Straight above: (1 − F) e^{−K d} of the sun's light, no caustics (flat water), and e^{−1.2 K d} of the sky's.
    const entering = 1 - schlickFresnel(1);
    expect(shallow.sun[1]).toBeCloseTo(entering * Math.exp(-diffuse[1] * 2), 12);
    expect(shallow.sky[1]).toBeCloseTo((1 - DIFFUSE_SKY_REFLECTANCE) * Math.exp(-DIFFUSE_PATH * diffuse[1] * 2), 12);
  });

  it('puts the caustics on the sun’s beam alone, and keeps the mean: the bed is as bright as under flat water on average', () => {
    const at = (caustic: number) => bedLight(beam, diffuse, 4, 0.9, caustic);
    const [dim, flat, two, bright] = [at(0), at(1), at(2), at(3)];
    for (let i = 0; i < 3; i += 1) {
      // Linear in the pattern's strength, so a pattern of mean 1 leaves the flat light on average.
      expect((dim.sun[i] + two.sun[i]) / 2).toBeCloseTo(flat.sun[i], 12);
      expect(bright.sun[i] - flat.sun[i]).toBeCloseTo(2 * (flat.sun[i] - dim.sun[i]), 12);
      // The sky's light carries none.
      expect(bright.sky[i]).toBe(flat.sky[i]);
      expect(dim.sky[i]).toBe(flat.sky[i]);
    }
    // At depth the beam has gone and the caustics with it: the pattern's contrast shrinks, the scattered light is what is left.
    const range = (depth: number) => bedLight(beam, diffuse, depth, 0.9, 3).sun[1] - bedLight(beam, diffuse, depth, 0.9, 0).sun[1];
    expect(range(10)).toBeLessThan(0.15 * range(0.5));
  });

  it('lets less sun in when it is low: dawn and sunset light the bed less than midday', () => {
    const midday = bedLight(beam, diffuse, 0.5, 1).sun[1];
    const sunset = bedLight(beam, diffuse, 0.5, 0.15).sun[1];
    expect(sunset).toBeLessThan(0.65 * midday);
    // Where the sun is at the Fresnel factor the water's own function gives (Schlick), with the refracted path longer.
    expect(sunset).toBeGreaterThan(0.2 * midday);
  });

  it('takes the sky’s reflectance off a uniform sky as the integral of the Fresnel reflectance, 0.066 for n = 1.333', () => {
    // The unpolarised Fresnel equations, integrated with the cosine weight: 2 ∫ F(θ) sin θ cos θ dθ over the hemisphere.
    const n = WATER_IOR;
    const fresnel = (theta: number) => {
      const sin = Math.sin(theta) / n;
      const cosT = Math.sqrt(1 - sin * sin);
      const cosI = Math.cos(theta);
      const rs = (cosI - n * cosT) / (cosI + n * cosT);
      const rp = (n * cosI - cosT) / (n * cosI + cosT);
      return 0.5 * (rs * rs + rp * rp);
    };
    const steps = 20000;
    let sum = 0;
    for (let k = 0; k < steps; k += 1) {
      const theta = ((k + 0.5) / steps) * (Math.PI / 2);
      sum += fresnel(theta) * Math.sin(theta) * Math.cos(theta) * (Math.PI / 2 / steps);
    }
    expect(2 * sum).toBeCloseTo(DIFFUSE_SKY_REFLECTANCE, 3);
  });
});
