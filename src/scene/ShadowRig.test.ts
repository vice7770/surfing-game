import { DirectionalLight, Mesh, MeshStandardMaterial, PlaneGeometry, Quaternion, Scene, ShaderChunk, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { SHADOW_LEVELS, ShadowRig, parseShadowLevel, snapToTexel, usePcss } from './ShadowRig';

/** Just what ShadowRig reads and writes on the renderer. */
function fakeRenderer() {
  return { shadowMap: { enabled: false, type: 0, needsUpdate: false } };
}

describe('shadow rig', () => {
  it('reads the level from the URL, defaulting to surfaces', () => {
    expect(SHADOW_LEVELS).toEqual(['blob', 'rider', 'surfaces', 'soft']);
    expect(parseShadowLevel('?physical&shadows=soft')).toBe('soft');
    expect(parseShadowLevel('?shadows=nonsense')).toBe('surfaces');
    expect(parseShadowLevel('')).toBe('surfaces');
  });

  it('moves the shadow frustum in whole texels so the shadow does not shimmer', () => {
    const q = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -0.6);
    const a = snapToTexel(new Vector3(10.001, 0, 5.002), q, 4, 2048, new Vector3());
    const b = snapToTexel(new Vector3(10.0012, 0, 5.0021), q, 4, 2048, new Vector3());
    // Across the light (light-space x and y) both land on the same texel; along it nothing needs snapping.
    const across = (v: Vector3) => v.clone().applyQuaternion(q.clone().invert());
    expect(Math.abs(across(a).x - across(b).x)).toBeLessThan(1e-9);
    expect(Math.abs(across(a).y - across(b).y)).toBeLessThan(1e-9);
    expect(a.distanceTo(new Vector3(10.001, 0, 5.002))).toBeLessThan((8 / 2048) * Math.SQRT2);
  });

  it('turns the shadow map, the blob and the receiving surfaces on per level', () => {
    const renderer = fakeRenderer();
    const light = new DirectionalLight();
    const water = new Mesh(new PlaneGeometry(), new MeshStandardMaterial());
    const rig = new ShadowRig(renderer as never, light, new Scene());
    rig.setLevel('blob', { surfaces: [water] });
    expect(renderer.shadowMap.enabled).toBe(false);
    expect(rig.blob.visible).toBe(true);
    expect(water.receiveShadow).toBe(false);
    rig.setLevel('rider', { surfaces: [water] });
    expect(renderer.shadowMap.enabled).toBe(true);
    expect(light.castShadow).toBe(true);
    expect(rig.blob.visible).toBe(false);
    expect(water.receiveShadow).toBe(false);
    rig.setLevel('surfaces', { surfaces: [water] });
    expect(water.receiveShadow).toBe(true);
    expect(light.shadow.mapSize.x).toBe(2048);
  });

  it('patches PCSS into three’s basic shadow path and restores it', () => {
    const original = ShaderChunk.shadowmap_pars_fragment;
    expect(usePcss(true)).toBe(true);
    expect(ShaderChunk.shadowmap_pars_fragment).toContain('PCSS_SAMPLES');
    // The basic path's getShadow is replaced, not added: still exactly two sampler2D versions (VSM, then PCSS).
    expect(ShaderChunk.shadowmap_pars_fragment.split('float getShadow( sampler2D shadowMap').length - 1).toBe(2);
    expect(ShaderChunk.shadowmap_pars_fragment.lastIndexOf('pcssDisk')).toBeGreaterThan(ShaderChunk.shadowmap_pars_fragment.lastIndexOf('float getShadow( sampler2D shadowMap'));
    expect(usePcss(false)).toBe(true);
    expect(ShaderChunk.shadowmap_pars_fragment).toBe(original);
  });

  it('keeps the light shining along the sun onto the rider it follows', () => {
    const light = new DirectionalLight();
    const rig = new ShadowRig(fakeRenderer() as never, light, new Scene());
    const sun = new Vector3(0.3, 0.8, -0.5).normalize();
    const focus = new Vector3(120, 0.3, -400);
    rig.follow(focus, sun, 0.1);
    const along = light.position.clone().sub(light.target.position).normalize();
    expect(along.distanceTo(sun)).toBeLessThan(1e-6);
    expect(light.target.position.distanceTo(focus)).toBeLessThan(0.01);
    expect(rig.blob.position.y).toBeCloseTo(0.12, 6);
  });
});
