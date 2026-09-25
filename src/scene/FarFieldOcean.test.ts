import { ShaderLib } from 'three';
import { describe, expect, it } from 'vitest';
import { shallowWaterWaveNumber } from '../wave/dispersion';
import { FarFieldProfile } from '../wave/FarFieldProfile';
import { SeaState } from '../wave/SeaState';
import { FarFieldOcean } from './FarFieldOcean';
import { buildGridGeometry, gradedAxis } from './gridGeometry';

const hole = { xMin: -80, xMax: 80, zMin: -330, zMax: 30 };

describe('FarFieldOcean geometry', () => {
  it('grades an axis from fine cells across the tank to coarse cells far away', () => {
    const axis = gradedAxis(-1500, 1500, hole.xMin, hole.xMax, 4, 40);
    expect(axis[0]).toBe(-1500);
    expect(axis[axis.length - 1]).toBe(1500);
    expect(axis).toContain(hole.xMin);
    expect(axis).toContain(hole.xMax);
    let largest = 0;
    for (let i = 1; i < axis.length; i += 1) {
      const spacing = axis[i] - axis[i - 1];
      expect(spacing).toBeGreaterThan(0);
      largest = Math.max(largest, spacing);
      if (axis[i] <= hole.xMax && axis[i - 1] >= hole.xMin) expect(spacing).toBeCloseTo(4, 9);
    }
    expect(largest).toBeLessThanOrEqual(40 + 1e-9);
    expect(gradedAxis(-900, 30, -330, 30, 3, 40).at(-1)).toBe(30);
  });

  it('leaves the tank rectangle empty and surrounds it on every side', () => {
    const xs = gradedAxis(-600, 600, hole.xMin, hole.xMax, 4, 40);
    const zs = gradedAxis(-1500, 30, hole.zMin, hole.zMax, 3, 40);
    const geometry = buildGridGeometry(xs, zs, hole);
    const positions = geometry.getAttribute('position');
    const index = geometry.getIndex()!;
    expect(positions.count).toBe(xs.length * zs.length);
    const sides = { left: false, right: false, offshore: false };
    for (let t = 0; t < index.count; t += 3) {
      let cx = 0;
      let cz = 0;
      for (let k = 0; k < 3; k += 1) {
        cx += positions.getX(index.getX(t + k)) / 3;
        cz += positions.getZ(index.getX(t + k)) / 3;
      }
      expect(cx > hole.xMin && cx < hole.xMax && cz > hole.zMin && cz < hole.zMax).toBe(false);
      if (cx < hole.xMin && cz > hole.zMin) sides.left = true;
      if (cx > hole.xMax && cz > hole.zMin) sides.right = true;
      if (cz < hole.zMin && cx > hole.xMin && cx < hole.xMax) sides.offshore = true;
    }
    expect(sides).toEqual({ left: true, right: true, offshore: true });
  });
});

describe('FarFieldOcean', () => {
  it('uploads the profile and advances each component phase with the sea clock', () => {
    const sea = SeaState.fromSpectrum(
      { significantHeight: 1, peakPeriod: 10, direction: 0.1, spreading: 12, componentCount: 12, depth: 5 }, 3, shallowWaterWaveNumber,
    );
    const profile = new FarFieldProfile(sea, {
      referenceZ: -330, shoreZ: 30, offshoreZ: -1500, shoreSamples: 61, offshoreSamples: 121,
      offshoreDepth: () => 5, leftDepth: () => 5, rightDepth: () => 5,
    });
    const ocean = new FarFieldOcean();
    ocean.setProfile(profile, hole, { x: 0, z: -60 }, { extent: 1500 });
    expect(ocean.mesh.visible).toBe(true);
    expect(ocean.textureSize).toEqual({ width: 13, height: 2 * profile.samples });
    ocean.update(1234.5);
    const temporal = ocean.temporalPhases;
    for (let c = 0; c < profile.count; c += 1) {
      const expected = (profile.omega[c] * 1234.5) % (2 * Math.PI);
      expect(temporal[c]).toBeCloseTo(expected, 5);
    }
  });

  it('shades the far field with the tank water optics', () => {
    const ocean = new FarFieldOcean();
    const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader };
    ocean.mesh.material.onBeforeCompile(shader as never, undefined as never);
    for (const chunk of ['beginnormal_vertex', 'begin_vertex']) expect(shader.vertexShader).not.toContain(`#include <${chunk}>`);
    expect(shader.vertexShader).toContain('vWaterDepth = max( 0.0, farDepth + farHeight )');
    expect(shader.fragmentShader).not.toContain('#include <color_fragment>');
    expect(shader.fragmentShader).toContain('waterBodyReflectance( vWaterDepth');
    expect(shader.fragmentShader).not.toContain('waterCrestThickness');
    expect(shader.vertexShader).toContain('vWaterFlow = vec2( 0.0 )');
    expect(shader.fragmentShader).toContain('waterFoamCover( vWaterWorld.xz, vWaterFlow, vWaterFoam, waterTime )');
    expect(Object.keys(shader.uniforms)).toEqual(expect.arrayContaining(['waterAttenuation', 'waterSunDirection', 'farTable']));
    expect(ocean.mesh.material.ior).toBeCloseTo(1.333, 6);
    expect(ocean.mesh.material.clearcoat).toBe(0);
  });
});
