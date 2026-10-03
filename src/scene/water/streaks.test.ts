import { describe, expect, it } from 'vitest';
import { foamQuantile, sampleFoamField, waterChurnPars } from './churnTexture';
import {
  STREAK_ANCHOR, STREAK_COVER, STREAK_EDGE_SLOPE, STREAK_STRETCH, STREAK_TILE, streakAnchors, streakCover, streakFrame, streakMask, streakReach, waterStreakPars,
} from './streaks';

/** A strip across a uniform current, as a mask of the lines: `across` samples `step` m apart, `rows` rows 0.1 m apart along it. */
function strip(flow: [number, number], across = 3000, step = 0.02, rows = 40): { mask: Uint8Array; across: number; rows: number; cover: number } {
  const speed = Math.hypot(flow[0], flow[1]);
  const along = [flow[0] / speed, flow[1] / speed];
  const mask = new Uint8Array(across * rows);
  let sum = 0;
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < across; i += 1) {
      const x = 7.3 - along[1] * i * step + along[0] * j * 0.1;
      const z = -3.1 + along[0] * i * step + along[1] * j * 0.1;
      const cover = streakCover(x, z, () => flow, 3.1, 0.8, 0.3);
      sum += cover;
      mask[j * across + i] = cover >= 0.5 ? 1 : 0;
    }
  }
  return { mask, across, rows, cover: sum / (across * rows) };
}

/** The mask's autocorrelation `lag` samples across the current. */
function acrossCorrelation({ mask, across, rows }: { mask: Uint8Array; across: number; rows: number }, lag: number): number {
  let a = 0;
  let b = 0;
  let both = 0;
  let count = 0;
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i + lag < across; i += 1) {
      const u = mask[j * across + i];
      const v = mask[j * across + i + lag];
      a += u;
      b += v;
      both += u * v;
      count += 1;
    }
  }
  const [ma, mb] = [a / count, b / count];
  return (both / count - ma * mb) / Math.sqrt(ma * (1 - ma) * mb * (1 - mb));
}

describe('face streaks', () => {
  it('stretch the lace along the current: a step along it moves the pattern 1/STRETCH as far as a step across', () => {
    const [a0, b0] = streakFrame(0, 0, 1, 0);
    const [aAlong, bAlong] = streakFrame(1, 0, 1, 0);
    const [aAcross, bAcross] = streakFrame(0, 1, 1, 0);
    expect(Math.hypot(aAlong - a0, bAlong - b0)).toBeCloseTo(1 / STREAK_STRETCH, 9);
    expect(Math.hypot(aAcross - a0, bAcross - b0)).toBeCloseTo(1, 9);
  });

  it('run along +z on still water', () => {
    const [a0, b0] = streakFrame(0, 0, 0, 0);
    const [aAlong, bAlong] = streakFrame(0, 1, 0, 0);
    expect(Math.hypot(aAlong - a0, bAlong - b0)).toBeCloseTo(1 / STREAK_STRETCH, 9);
  });

  it('appear only on steep faces with foam about', () => {
    expect(streakMask(0.05, 0.5)).toBe(0);
    expect(streakMask(0.8, 0)).toBe(0);
    expect(streakMask(0.8, 0.3)).toBeGreaterThan(0.5);
    expect(streakMask(0.9, 0.3)).toBeGreaterThanOrEqual(streakMask(0.6, 0.3));
  });

  it('show at the thin foam the physics leaves on its steep faces (0.045 at the 90th percentile)', () => {
    expect(streakMask(0.6, 0.045)).toBeGreaterThan(0.5);
    expect(streakMask(0.6, 0.004)).toBe(0);
  });

  it('hold still when the current turns: a 1° turn moves the lines well under their spacing, even 100 m from the origin', () => {
    // The lines' own spacing across the current, from the mask: the distance between one line's start and the next's.
    const { mask, across } = strip([0, 1], 3000, 0.02, 1);
    const starts: number[] = [];
    for (let i = 1; i < across; i += 1) if (mask[i] && !mask[i - 1]) starts.push(i);
    const spacing = ((starts[starts.length - 1] - starts[0]) / (starts.length - 1)) * 0.02;
    expect(spacing).toBeGreaterThan(0.2);
    const [x, z] = [70.3, -71.2];
    const turn = Math.PI / 180;
    for (const anchor of streakAnchors(x, z)) {
      const [a0, b0] = streakFrame(x, z, 0.2, 1, anchor.x, anchor.z);
      const [a1, b1] = streakFrame(x, z, 0.2 * Math.cos(turn) - Math.sin(turn), 0.2 * Math.sin(turn) + Math.cos(turn), anchor.x, anchor.z);
      expect(Math.hypot(a1 - a0, b1 - b0) / spacing).toBeLessThan(0.3);
    }
    // Turned about the world's origin instead, the same turn would move them several spacings.
    const [o0, p0] = streakFrame(x, z, 0.2, 1);
    const [o1, p1] = streakFrame(x, z, 0.2 * Math.cos(turn) - Math.sin(turn), 0.2 * Math.sin(turn) + Math.cos(turn));
    expect(Math.hypot(o1 - o0, p1 - p0) / spacing).toBeGreaterThan(2);
  });

  it('weigh the three anchors of the triangle around a point to sum to 1, smoothly across its edges, each its own lines', () => {
    for (const [x, z] of [[0.1, 0.2], [70.3, -71.2], [-13, 44.9], [STREAK_ANCHOR * 3.5, -STREAK_ANCHOR * 2.5]]) {
      const anchors = streakAnchors(x, z);
      expect(anchors).toHaveLength(3);
      expect(anchors.reduce((sum, anchor) => sum + anchor.weight, 0)).toBeCloseTo(1, 12);
      // Each anchor is a lattice corner within an edge of the point, and no two share a hash.
      for (const anchor of anchors) expect(Math.hypot(anchor.x - x, anchor.z - z)).toBeLessThanOrEqual(STREAK_ANCHOR + 1e-9);
      expect(new Set(anchors.map((anchor) => anchor.hash.join(','))).size).toBe(3);
    }
    // Either side of a triangle's edge, the anchors both triangles share carry the same weight.
    const weightOf = (x: number, z: number, ax: number, az: number) =>
      streakAnchors(x, z).find((anchor) => Math.abs(anchor.x - ax) < 1e-9 && Math.abs(anchor.z - az) < 1e-9)?.weight ?? 0;
    // The edge from the corner (1, 0) to (0, 1) of the lattice's first cell, at its middle.
    const [edgeX, edgeZ] = [0.75 * STREAK_ANCHOR, 0.4330127019 * STREAK_ANCHOR];
    const normal = [0.8660254038, 0.5];
    for (const [ax, az] of [[STREAK_ANCHOR, 0], [0.5 * STREAK_ANCHOR, 0.8660254038 * STREAK_ANCHOR]]) {
      const inside = weightOf(edgeX - 1e-6 * normal[0], edgeZ - 1e-6 * normal[1], ax, az);
      const outside = weightOf(edgeX + 1e-6 * normal[0], edgeZ + 1e-6 * normal[1], ax, az);
      expect(inside).toBeGreaterThan(0.3);
      expect(inside).toBeCloseTo(outside, 4);
    }
  });

  it('has a GLSL twin', () => {
    expect(waterStreakPars).toContain('float waterStreak( vec2 p, vec2 flow, float steepness, float foam )');
  });
});

describe('face streaks from the foam field’s late stage', () => {
  const flowAt = (): [number, number] => [0.1, 0.9];
  const steep = 0.8;
  const foam = 0.3;

  it('draw about a tenth of a steep, foamy face as line, and none where the face is flat or has no foam', () => {
    let sum = 0;
    let count = 0;
    for (let z = 2; z < 32; z += 0.2) {
      for (let x = 2; x < 32; x += 0.2) {
        sum += streakCover(x, z, flowAt, 3.1, steep, foam);
        count += 1;
      }
    }
    expect(Math.abs(sum / count - STREAK_COVER)).toBeLessThan(0.03);
    expect(streakCover(5, 5, flowAt, 3.1, 0.05, foam)).toBe(0);
    expect(streakCover(5, 5, flowAt, 3.1, steep, 0)).toBe(0);
  });

  it('keep the flow’s stretch: the lines are the late stage drawn STREAK_STRETCH times longer along the current than across it', () => {
    // Along +z, a step of STRETCH times a step across it changes the lines alike.
    const across = 0.025;
    const along = across * STREAK_STRETCH;
    let acrossBoth = 0;
    let alongBoth = 0;
    let first = 0;
    let acrossSecond = 0;
    let alongSecond = 0;
    let count = 0;
    const still = (): [number, number] => [0, 1];
    for (let z = 2; z < 28; z += 0.19) {
      for (let x = 2; x < 28; x += 0.19) {
        const a = streakCover(x, z, still, 3.1, steep, foam) >= 0.5 ? 1 : 0;
        const b = streakCover(x + across, z, still, 3.1, steep, foam) >= 0.5 ? 1 : 0;
        const c = streakCover(x, z + along, still, 3.1, steep, foam) >= 0.5 ? 1 : 0;
        acrossBoth += a * b;
        alongBoth += a * c;
        first += a;
        acrossSecond += b;
        alongSecond += c;
        count += 1;
      }
    }
    const cover = first / count;
    const correlation = (both: number, second: number) => (both / count - cover * (second / count)) / (cover * (1 - cover));
    // The same likeness a step across and STRETCH times that along; across the whole step, it would be much less.
    expect(Math.abs(correlation(acrossBoth, acrossSecond) - correlation(alongBoth, alongSecond))).toBeLessThan(0.12);
    expect(correlation(acrossBoth, acrossSecond)).toBeGreaterThan(0.2);
  });

  it('take their edge from the late stage’s gradient: the slope is half its median at a threshold crossing', () => {
    const h = 0.004;
    const threshold = foamQuantile(1 - STREAK_COVER);
    const gradients: number[] = [];
    for (let j = 0; j < 300; j += 1) {
      for (let i = 0; i < 300; i += 1) {
        const u = (i * 0.0173) / STREAK_TILE;
        const v = (j * 0.0191) / STREAK_TILE;
        const g = sampleFoamField(u, v, 3);
        if (Math.abs(g - threshold) > 0.15) continue;
        gradients.push((Math.abs(sampleFoamField(u + h / STREAK_TILE, v, 3) - g) + Math.abs(sampleFoamField(u, v + h / STREAK_TILE, 3) - g)) / h);
      }
    }
    gradients.sort((a, b) => a - b);
    const median = gradients[gradients.length >> 1];
    expect(Math.abs(STREAK_EDGE_SLOPE - 0.5 * median) / (0.5 * median)).toBeLessThan(0.25);
  });

  it('never repeat: across any current, the lines’ autocorrelation stays under 0.3 at every lag from 3 to 20 m, and cover a tenth', () => {
    // Along an axis, the two anchors either side of the current once read the same texels (correlation 1 at 6 m); a 3 m tile
    // read plainly repeated every 3 m. Each anchor now turns and shifts its own, and none repeats across its 6 m.
    for (const flow of [[0, 1], [1, 0], [0.6, 0.8], [0.95, 0.31]] as [number, number][]) {
      const lines = strip(flow);
      expect(Math.abs(lines.cover - STREAK_COVER)).toBeLessThan(0.015);
      for (const metres of [3, 4, 6, 8, 12, 16, 20]) expect(Math.abs(acrossCorrelation(lines, Math.round(metres / 0.02)))).toBeLessThan(0.3);
    }
  });

  it('run along the current where they are drawn, even where the anchors’ currents differ, so they never cross in a hatch', () => {
    // A current turning 0.25 rad a metre across x (86 degrees over an anchor's 6 m). In windows of 1.5 m, the lines'
    // direction (across the strongest gradient of the mask's structure tensor) against the current there: turned to each
    // anchor's own current instead, the lines of neighbouring anchors cross, and the mean angle was 19 degrees.
    const flowAt = (x: number): [number, number] => [Math.sin(0.25 * x), Math.cos(0.25 * x)];
    let angle = 0;
    let windows = 0;
    for (let px = 2; px < 40; px += 3.4) {
      for (let pz = 3; pz < 40; pz += 4.6) {
        const n = 60;
        const step = 0.025;
        const mask = new Float32Array(n * n);
        for (let j = 0; j < n; j += 1) for (let i = 0; i < n; i += 1) mask[j * n + i] = streakCover(px + i * step, pz + j * step, (x) => flowAt(x), 3.1, 0.8, 0.3) >= 0.5 ? 1 : 0;
        let sxx = 0;
        let szz = 0;
        let sxz = 0;
        for (let j = 1; j < n - 1; j += 1) {
          for (let i = 1; i < n - 1; i += 1) {
            const gx = mask[j * n + i + 1] - mask[j * n + i - 1];
            const gz = mask[(j + 1) * n + i] - mask[(j - 1) * n + i];
            sxx += gx * gx;
            szz += gz * gz;
            sxz += gx * gz;
          }
        }
        if (sxx + szz < 1) continue;
        const theta = 0.5 * Math.atan2(2 * sxz, sxx - szz);
        const [fx, fz] = flowAt(px + 0.75);
        angle += (Math.acos(Math.min(1, Math.abs(-Math.sin(theta) * fx + Math.cos(theta) * fz))) * 180) / Math.PI;
        windows += 1;
      }
    }
    expect(windows).toBeGreaterThan(80);
    expect(angle / windows).toBeLessThan(15);
  });

  it('stay sharp where they run away from a grazing eye: their edge spans the pixel across them, not its longest side', () => {
    // A current along +z and a pixel 1 cm across and 20 cm deep, the eye low and looking along z: the lines run along the
    // view, so across them the pixel spans 1 cm; along them 20 cm, a seventh of that in the stretched field.
    expect(streakReach(0, 1, 0.01, 0.2)).toBeCloseTo(0.2 / STREAK_STRETCH, 12);
    // Lines across the view soften by the pixel's depth.
    expect(streakReach(1, 0, 0.01, 0.2)).toBeCloseTo(0.2, 12);
    // A square pixel: across any current, between its side and its diagonal.
    for (const [x, z] of [[0, 1], [0.6, 0.8], [1, 0]]) {
      expect(streakReach(x, z, 0.05, 0.05)).toBeGreaterThanOrEqual(0.05 - 1e-12);
      expect(streakReach(x, z, 0.05, 0.05)).toBeLessThanOrEqual(0.05 * Math.SQRT2 + 1e-12);
    }
    expect(waterStreakPars).toContain('float reach = max( abs( along.y ) * footprint.x + abs( along.x ) * footprint.y, ( abs( along.x ) * footprint.x + abs( along.y ) * footprint.y ) / STREAK_STRETCH );');
  });

  it('are combined by their union, each anchor’s phase thresholded for its weight, and defined where the churn map is', () => {
    // A component that weighs w is drawn where it passes the value leaving (1 - F)^w of it below: six of them cover F.
    expect(waterStreakPars).toContain(`float keep = log( ${(1 - STREAK_COVER).toFixed(4)} );`);
    expect(waterStreakPars).toContain('waterFoamQuantile( exp( weight * w * keep ) )');
    expect(waterStreakPars).toContain('return smoothstep( -width, width, best ) * mask;');
    expect(waterStreakPars).not.toContain('sqrt( squares )');
    expect(waterStreakPars).toContain('float waterStreakField( vec2 frame, vec2 dx, vec2 dy, uvec2 h );');
    expect(waterStreakPars).toContain('uvec2 h = waterFoamPcg( uvec2( ivec2( corner ) + STREAK_SALT ) );');
    expect(waterStreakPars).not.toContain('waterFoamTile');
    expect(waterChurnPars).toContain('float waterStreakField( vec2 frame, vec2 dx, vec2 dy, uvec2 h ) {');
    expect(/^[\x09\x0a\x20-\x7e]*$/.test(waterStreakPars)).toBe(true);
  });
});
