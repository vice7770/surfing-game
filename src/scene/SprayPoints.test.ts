import { Camera, Color, CubeUVReflectionMapping, Euler, Matrix3, Matrix4, PerspectiveCamera, Scene, Texture, Vector2, Vector3, Vector4, type WebGLRenderer } from 'three';
import { describe, expect, it } from 'vitest';
import skyManifest from '../../public/assets/skies/skies.json';
import { SPRAY_STRIDE } from '../wave/SprayCloud';
import { REFERENCE_LIGHT, skyExposure, type SkyEntry } from './PhotoSky';
import { SprayPoints, cubeUVDefines, skyIrradiance } from './SprayPoints';
import { FOAM_BALL } from './water/mist';

const skies = skyManifest.skies as unknown as SkyEntry[];

/** What the scene is lit with under a photographed sky (main.ts: the sun's colour times its intensity), and the sky's own share. */
function lighting(entry: SkyEntry) {
  const exposure = skyExposure(entry);
  return { height: entry.sun.direction[1], radiance: exposure.sunColor.clone().multiplyScalar(exposure.sun), sky: exposure.environment * entry.skyIrradiance };
}

/** Draws the spray once from a camera at `eye`, as the renderer would (its onBeforeRender), in `scene`. */
function drawFrom(spray: SprayPoints, eye: Vector3, scene = new Scene()): void {
  const camera = new PerspectiveCamera(55, 16 / 9, 0.1, 3000);
  camera.position.copy(eye);
  camera.updateMatrixWorld();
  const renderer = { getDrawingBufferSize: (target: Vector2) => target.set(1280, 720) } as unknown as WebGLRenderer;
  spray.mesh.onBeforeRender(renderer, scene, camera as Camera, spray.mesh.geometry, spray.mesh.material, null as never);
}

/** Particles at (x, 1, z) for each z, of the given kinds (foam balls 0.6 m wide, the rest 0.1 m). */
function cloud(zs: number[], kinds: number[], xs = zs.map(() => 0)): Float32Array {
  const particles = new Float32Array(zs.length * SPRAY_STRIDE);
  zs.forEach((z, k) => particles.set([xs[k], 1, z, kinds[k] === 2 ? 0.6 : 0.1, 1, kinds[k]], k * SPRAY_STRIDE));
  return particles;
}

describe('the sky the Rich spray is lit by', () => {
  it('is, before the photographed sky is up, what each committed sky would leave once its sun has brought its share: the sky the photo measured', () => {
    expect(skies.map((entry) => entry.timeOfDay).sort()).toEqual(['dawn', 'midday', 'sunset']);
    for (const entry of skies) {
      const { height, radiance, sky } = lighting(entry);
      expect(skyIrradiance(height, radiance)).toBeCloseTo(sky, 9);
    }
  });

  it('keeps a tenth of the level light when the sun the scene is told of brings more than all of it (the painted sky), and is all of it with the sun down', () => {
    expect(skyIrradiance(0.7, new Color(30, 30, 30))).toBeCloseTo(0.1 * REFERENCE_LIGHT * (0.4 + 0.6 * Math.sqrt(0.7)), 9);
    expect(skyIrradiance(-0.2, new Color(3, 3, 3))).toBeCloseTo(0.4 * REFERENCE_LIGHT, 9);
  });

  it('reaches the Rich spray’s uniforms with the sun, and takes the water’s foam colour from the water', () => {
    const spray = new SprayPoints();
    spray.setLook('rich');
    for (const entry of skies) {
      const { radiance, sky } = lighting(entry);
      spray.setSun(new Vector3(...entry.sun.direction).multiplyScalar(3), radiance);
      const { uniforms } = spray.mesh.material;
      expect((uniforms.spraySunDirection.value as Vector3).length()).toBeCloseTo(1, 9);
      expect(uniforms.spraySkyIrradiance.value).toBeCloseTo(sky, 9);
    }
    const foam = { value: new Color(0.1, 0.2, 0.3) };
    spray.useWater({ waterSurface: { value: null }, waterGrid: { value: null }, waterGridSize: { value: null }, waterFoamColor: foam } as never);
    expect(spray.mesh.material.uniforms.waterFoamColor).toBe(foam);
  });

  it('samples a PMREM environment as three does its own (generateCubeUVSize), and nothing else', () => {
    const pmrem = new Texture();
    pmrem.mapping = CubeUVReflectionMapping;
    (pmrem as unknown as { image: { width: number; height: number } }).image = { width: 768, height: 256 };
    expect(cubeUVDefines(pmrem)).toEqual({ ENVMAP_TYPE_CUBE_UV: '', CUBEUV_TEXEL_WIDTH: String(1 / 336), CUBEUV_TEXEL_HEIGHT: String(1 / 256), CUBEUV_MAX_MIP: '6.0' });
    expect(cubeUVDefines(new Texture())).toBeUndefined();
    expect(cubeUVDefines(null)).toBeUndefined();
  });

  it('lights the Rich spray with the scene’s photographed sky, turned as three turns it, and Classic with none', () => {
    const spray = new SprayPoints();
    const scene = new Scene();
    const pmrem = new Texture();
    pmrem.mapping = CubeUVReflectionMapping;
    (pmrem as unknown as { image: { width: number; height: number } }).image = { width: 768, height: 256 };
    scene.environment = pmrem;
    scene.environmentIntensity = 0.6;
    scene.environmentRotation.set(0, 0.7, 0);
    drawFrom(spray, new Vector3(), scene);
    expect(spray.mesh.material.defines).toEqual({});
    spray.setLook('rich');
    drawFrom(spray, new Vector3(), scene);
    const { uniforms, defines } = spray.mesh.material;
    expect(defines.ENVMAP_TYPE_CUBE_UV).toBe('');
    expect(uniforms.sprayEnvironment.value).toBe(pmrem);
    expect(uniforms.sprayEnvironmentIntensity.value).toBe(0.6);
    const expected = new Matrix3().setFromMatrix4(new Matrix4().makeRotationFromEuler(new Euler(0, 0.7, 0))).transpose();
    expect((uniforms.sprayEnvironmentRotation.value as Matrix3).elements).toEqual(expected.elements);
    expect(spray.mesh.material.vertexShader).toContain('vSky = spraySky();');
    // Without a photographed sky, the sky recovered from the sun.
    scene.environment = null;
    drawFrom(spray, new Vector3(), scene);
    expect(spray.mesh.material.defines).toEqual({});
    spray.setLook('classic');
    expect(spray.mesh.material.defines).toEqual({});
  });
});

describe('the foam balls’ shadows (G9)', () => {
  it('hands the Rich ball shader every foam ball, centre and radius', () => {
    const spray = new SprayPoints();
    spray.setLook('rich');
    spray.update({ particles: cloud([5, 30, 12, 2], [2, 0, 2, 1]), count: 4 });
    drawFrom(spray, new Vector3());
    const { uniforms } = spray.mesh.material;
    expect(uniforms.sprayBallCount.value).toBe(2);
    const balls = (uniforms.sprayBalls.value as Vector4[]).slice(0, 2).map((ball) => ball.toArray());
    expect(balls).toEqual([[0, 1, 5, Math.fround(0.6) / 2], [0, 1, 12, Math.fround(0.6) / 2]]);
  });

  it('takes the nearest balls to the eye when there are more than it can take', () => {
    const n = FOAM_BALL.shadows + 10;
    const zs = Array.from({ length: n }, (_, k) => n - k);
    const spray = new SprayPoints();
    spray.setLook('rich');
    spray.update({ particles: cloud(zs, zs.map(() => 2)), count: n });
    drawFrom(spray, new Vector3(0, 1, 0));
    const { uniforms } = spray.mesh.material;
    expect(uniforms.sprayBallCount.value).toBe(FOAM_BALL.shadows);
    const taken = (uniforms.sprayBalls.value as Vector4[]).map((ball) => ball.z);
    expect(Math.max(...taken)).toBe(FOAM_BALL.shadows);
  });
});

describe('the Rich draw order', () => {
  const order = (spray: SprayPoints) => {
    const index = spray.mesh.geometry.getIndex();
    return index ? Array.from(index.array.slice(0, spray.mesh.geometry.drawRange.count)) : [];
  };

  it('draws Rich sprites from the farthest to the nearest, so a foam ball hides what is behind it and not what is in front', () => {
    const spray = new SprayPoints();
    spray.setLook('rich');
    spray.update({ particles: cloud([5, 30, 12, 2, 20], [0, 2, 2, 1, 0]), count: 5 });
    drawFrom(spray, new Vector3(0, 1, 0));
    expect(order(spray)).toEqual([1, 4, 2, 0, 3]);
    // From the other side, the other way round.
    drawFrom(spray, new Vector3(0, 1, 40));
    expect(order(spray)).toEqual([3, 0, 2, 4, 1]);
    // The buffers themselves stay in the pool's order.
    expect(Array.from(spray.mesh.geometry.getAttribute('kind').array.slice(0, 5))).toEqual([0, 2, 2, 1, 0]);
  });

  it('tells apart sprites a few centimetres apart at a few metres', () => {
    const spray = new SprayPoints();
    spray.setLook('rich');
    spray.update({ particles: cloud([3.0, 3.1, 2.9], [2, 2, 2]), count: 3 });
    drawFrom(spray, new Vector3(0, 1, 0));
    expect(order(spray)).toEqual([1, 0, 2]);
  });

  it('leaves Classic in the pool’s order, unindexed, as it always drew', () => {
    const spray = new SprayPoints();
    spray.update({ particles: cloud([5, 30, 2], [0, 0, 1]), count: 3 });
    drawFrom(spray, new Vector3(0, 1, 0));
    expect(spray.mesh.geometry.getIndex()).toBeNull();
    spray.setLook('rich');
    expect(spray.mesh.geometry.getIndex()).not.toBeNull();
    spray.setLook('classic');
    expect(spray.mesh.geometry.getIndex()).toBeNull();
  });
});
