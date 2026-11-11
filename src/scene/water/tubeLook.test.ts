import { describe, expect, it } from 'vitest';
import { waterChopNormal } from '../waterChop';
import { waterBodyFragment } from '../waterOptics';
import { richFarNormal } from './richWaterGlsl';
import { GUARD_VIEW_COS, TUBE_LOOK_MERGE, tubeLookMerge, withNormalGuard, withWallRipple } from './tubeLook';

describe('?tubeLook=merge (ruling 10)', () => {
  it('is on only for `merge`', () => {
    expect(tubeLookMerge('?tubeLook=merge')).toBe(true);
    expect(tubeLookMerge('?tubeLook=Merge ')).toBe(true);
    expect(tubeLookMerge('?tubeLook=on')).toBe(false);
    expect(tubeLookMerge('')).toBe(false);
    expect(TUBE_LOOK_MERGE).toBe(false);
  });

  it('leaves every program as it is without the switch', () => {
    const body = waterBodyFragment(true, true);
    expect(withNormalGuard(body)).toBe(body);
    expect(withNormalGuard(body, false)).toBe(body);
    expect(withWallRipple(waterChopNormal)).toBe(waterChopNormal);
    expect(withWallRipple(richFarNormal, false)).toBe(richFarNormal);
  });

  it('turns a shading normal tipped past the eye back to grazing, and floors the view cosine', () => {
    for (const body of [waterBodyFragment(true, true), waterBodyFragment(false)]) {
      const guarded = withNormalGuard(body, true);
      expect(guarded).not.toBe(body);
      expect(guarded).toContain('waterN = normalize( waterN - min( 0.0, dot( waterN, waterV ) ) * waterV );');
      expect(guarded).toContain(`float waterViewCos = max( dot( waterN, waterV ), ${GUARD_VIEW_COS.toFixed(2)} );`);
      expect(guarded).not.toContain('float waterViewCos = dot( waterN, waterV );');
      // The guard sits after the normal and the view are known and before the body's colour is worked out.
      expect(guarded.indexOf('vec3 waterV')).toBeLessThan(guarded.indexOf('waterN = normalize( waterN - min'));
      expect(guarded.indexOf('float waterViewCos = max')).toBeLessThan(guarded.indexOf('if ( waterViewCos > 0.0 )'));
    }
  });

  it('fades the ripples and chop with the surface\'s tilt, in both chop blocks', () => {
    for (const block of [waterChopNormal, richFarNormal]) {
      const faded = withWallRipple(block, true);
      expect(faded).not.toBe(block);
      expect(faded).toContain('chopNormal = normalize( chopNormal + chopNormal.y * chopNormal.y * vec3( -chopSlope.x, 0.0, -chopSlope.y ) );');
      expect(faded).not.toContain('chopNormal = normalize( chopNormal + vec3( -chopSlope.x, 0.0, -chopSlope.y ) );');
    }
  });

  it('guards a normal the way the shader line does: level with the eye, never past it', () => {
    // The shader's line in numbers: n' = normalize(n - min(0, n·v) v).
    const guard = (n: [number, number, number], v: [number, number, number]): number => {
      const d = Math.min(0, n[0] * v[0] + n[1] * v[1] + n[2] * v[2]);
      const g = [n[0] - d * v[0], n[1] - d * v[1], n[2] - d * v[2]];
      const length = Math.hypot(g[0], g[1], g[2]);
      return (g[0] * v[0] + g[1] * v[1] + g[2] * v[2]) / length;
    };
    const v: [number, number, number] = [0, 0, 1];
    expect(guard([0.6, 0, -0.8], v)).toBeCloseTo(0, 12);
    expect(guard([0.6, 0, 0.8], v)).toBeCloseTo(0.8, 12);
    expect(guard([0, 1, 0], v)).toBeCloseTo(0, 12);
  });
});
