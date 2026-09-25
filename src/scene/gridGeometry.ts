import { BufferAttribute, BufferGeometry } from 'three';

export interface HoleRect {
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
}

/**
 * Sorted axis coordinates: uniform cells of about `inner` across [holeMin, holeMax],
 * growing by `growth` per cell (up to `coarse`) toward `min` and `max`.
 */
export function gradedAxis(min: number, max: number, holeMin: number, holeMax: number, inner: number, coarse: number, growth = 1.1): number[] {
  const innerCount = Math.max(1, Math.round((holeMax - holeMin) / inner));
  const middle: number[] = [];
  for (let i = 0; i <= innerCount; i += 1) middle.push(i === innerCount ? holeMax : holeMin + ((holeMax - holeMin) * i) / innerCount);
  const upper: number[] = [];
  for (let at = holeMax, spacing = inner; at < max - 1e-9;) {
    spacing = Math.min(coarse, spacing * growth);
    at = Math.min(max, at + spacing);
    upper.push(at);
  }
  const lower: number[] = [];
  for (let at = holeMin, spacing = inner; at > min + 1e-9;) {
    spacing = Math.min(coarse, spacing * growth);
    at = Math.max(min, at - spacing);
    lower.push(at);
  }
  return [...lower.reverse(), ...middle, ...upper];
}

/** A flat grid on the given axes (world coordinates, y = 0), leaving out quads inside `hole`. */
export function buildGridGeometry(xs: number[], zs: number[], hole?: HoleRect): BufferGeometry {
  const positions = new Float32Array(xs.length * zs.length * 3);
  const normals = new Float32Array(xs.length * zs.length * 3);
  for (let iz = 0; iz < zs.length; iz += 1) {
    for (let ix = 0; ix < xs.length; ix += 1) {
      const i = (iz * xs.length + ix) * 3;
      positions[i] = xs[ix];
      positions[i + 2] = zs[iz];
      normals[i + 1] = 1;
    }
  }
  const indices: number[] = [];
  for (let iz = 0; iz < zs.length - 1; iz += 1) {
    for (let ix = 0; ix < xs.length - 1; ix += 1) {
      const cx = 0.5 * (xs[ix] + xs[ix + 1]);
      const cz = 0.5 * (zs[iz] + zs[iz + 1]);
      if (hole && cx > hole.xMin && cx < hole.xMax && cz > hole.zMin && cz < hole.zMax) continue;
      const a = iz * xs.length + ix;
      const b = a + 1;
      const c = a + xs.length;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  return geometry;
}
