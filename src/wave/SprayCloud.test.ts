import { describe, expect, it } from 'vitest';
import {
  COLUMN_CELL, COLUMN_EVERY, DROP_LAW, FOAM_BALL_VOLUME, SPRAY_PER_AIR, SPRAY_STRIDE, STREAK_EXPOSURE, SprayCloud, dropDiameter, opticalDepth, splashLaunch, type LipImpact,
  type SprayScene, type StrokeSplash,
} from './SprayCloud';
import { SPLASH_UP, type TubeEruption, type TubeRoller, type TubeSpit } from './PlungingLip';

/** Flat water 2 m deep over 10 m × 40 m (1 m cells), still, with no bores; `crest` raises a steep shoreward-facing step. */
function flatScene(windSpeed = 0, lipImpacts: LipImpact[] = [], crest = false): SprayScene {
  const nx = 10;
  const nz = 40;
  const h = new Float64Array(nx * nz).fill(2);
  if (crest) {
    for (let row = 18; row <= 20; row += 1) for (let column = 0; column < nx; column += 1) h[row * nx + column] = row === 20 ? 2.9 : 2 + 0.9 * (row - 17) / 3;
  }
  const bed = new Float64Array(nx * nz).fill(-2);
  return {
    solver: {
      nx, nz, dx: 1, restLevel: 0,
      xCenters: Array.from({ length: nx }, (_, i) => i + 0.5),
      zCenters: Array.from({ length: nz }, (_, i) => i + 0.5),
      dz: new Float64Array(nz).fill(1),
      h, bed, qx: new Float64Array(nx * nz), qz: new Float64Array(nx * nz),
      cellIndex: (x, z) => Math.min(nz - 1, Math.max(0, Math.floor(z))) * nx + Math.min(nx - 1, Math.max(0, Math.floor(x))),
    },
    foam: { source: new Float64Array(nx * nz) },
    lipImpacts,
    windSpeed,
  };
}

const impact = (volume: number, speed = 5): LipImpact => ({ x: 5, z: 20, volume, vx: 0, vy: -speed, vz: speed });

function meanVelocityZ(cloud: SprayCloud, scene: SprayScene, seconds: number): number {
  const start = new Float64Array(cloud.count);
  for (let k = 0; k < cloud.count; k += 1) start[k] = cloud.particles[k * SPRAY_STRIDE + 2];
  const count = cloud.count;
  cloud.update({ ...scene, lipImpacts: [] }, seconds);
  let drift = 0;
  for (let k = 0; k < Math.min(count, cloud.count); k += 1) drift += cloud.particles[k * SPRAY_STRIDE + 2] - start[k];
  return drift / Math.max(1, Math.min(count, cloud.count)) / seconds;
}

describe('paddle splashes', () => {
  // A hand pulling back beside the rail: the water pushes it forward (+z), so the splash flies back (−z).
  const stroke = (jz: number, speed = 5): StrokeSplash => ({ x: 5, y: 0, z: 20, jx: 0, jy: 0, jz, speed });

  it('throws drops in proportion to the work the stroke does on the water', () => {
    const hard = new SprayCloud(4);
    hard.update({ ...flatScene(), strokes: [stroke(60)] }, 1 / 60);
    // 60 N·s at 5 m/s is 300 J: 15 particles at the lip splash's rate.
    expect(Math.abs(hard.count - 15)).toBeLessThanOrEqual(1);
    const none = new SprayCloud(4);
    none.update({ ...flatScene(), strokes: [stroke(0)] }, 1 / 60);
    expect(none.count).toBe(0);
  });

  it('throws them up and back, away from the push on the hand', () => {
    const cloud = new SprayCloud(5);
    cloud.update({ ...flatScene(), strokes: [stroke(60)] }, 1 / 60);
    const start = Array.from({ length: cloud.count }, (_, k) => [cloud.particles[k * SPRAY_STRIDE + 1], cloud.particles[k * SPRAY_STRIDE + 2]]);
    cloud.update(flatScene(), 0.05);
    let rise = 0;
    let back = 0;
    start.forEach(([y, z], k) => {
      rise += cloud.particles[k * SPRAY_STRIDE + 1] - y;
      back += z - cloud.particles[k * SPRAY_STRIDE + 2];
    });
    expect(rise).toBeGreaterThan(0);
    expect(back).toBeGreaterThan(0);
  });
});

describe('spray and mist', () => {
  it('throws a lip impact’s drops at the splash-up’s speeds (G9), with a fifth either way of variety', () => {
    for (const random of [0, 0.25, 0.5, 0.75, 0.999]) {
      const { up, forward } = splashLaunch(6, random);
      expect(up / (SPLASH_UP.vertical * 6)).toBeGreaterThanOrEqual(0.8 - 1e-12);
      expect(up / (SPLASH_UP.vertical * 6)).toBeLessThanOrEqual(1.2);
      expect(forward / SPLASH_UP.horizontal).toBeGreaterThanOrEqual(0.8 - 1e-12);
      expect(forward / SPLASH_UP.horizontal).toBeLessThanOrEqual(1.2);
    }
  });

  it('keeps Classic’s impact spray as it was before G9: from the jet’s whole water, 30–80 % up and 20–60 % on, none from splash-ups', () => {
    // A jet parcel of 0.3 m³ landed, 0.21 m³ of it staying (its splash-up took the rest), at (0, −4, 6) m/s.
    const jet: LipImpact = { x: 5, z: 20, volume: 0.21, whole: 0.3, kind: 0, vx: 0, vy: -4, vz: 6 };
    const speed = Math.hypot(4, 6);
    const classic = new SprayCloud(22);
    classic.look = 'classic';
    classic.update(flatScene(0, [jet]), 1 / 60);
    // As many drops as the whole parcel's energy gives.
    expect(Math.abs(classic.count - 0.5 * 1025 * 0.3 * speed * speed * 0.05)).toBeLessThanOrEqual(1);
    const start = Array.from(classic.particles.subarray(0, classic.count * SPRAY_STRIDE));
    const count = classic.count;
    const dt = 1e-4;
    classic.update(flatScene(), dt);
    for (let k = 0; k < count; k += 1) {
      const up = (classic.particles[k * SPRAY_STRIDE + 1] - start[k * SPRAY_STRIDE + 1]) / dt;
      // Up at 30–80 % of the impact speed (drag and gravity take a little over the step).
      expect(up / speed).toBeGreaterThan(0.25);
      expect(up / speed).toBeLessThan(0.81);
    }
    // A splash-up's landing throws no Classic spray.
    const splashUp = new SprayCloud(23);
    splashUp.look = 'classic';
    splashUp.update(flatScene(0, [{ x: 5, z: 20, volume: 0.09, whole: 0.09, kind: 1, vx: 0, vy: -3, vz: 4 }]), 1 / 60);
    expect(splashUp.count).toBe(0);
  });

  it('throws a lip impact’s drops up as fast as its splash-up sheet goes, from the downward impact speed (G9)', () => {
    // Coming down at 4 m/s while moving on at 6: the sheet leaves up at ζ_v × 4, and so do its drops.
    const cloud = new SprayCloud(21);
    cloud.update(flatScene(0, [{ x: 5, z: 20, volume: 0.3, vx: 0, vy: -4, vz: 6 }]), 1 / 60);
    const start = Array.from(cloud.particles.subarray(0, cloud.count * SPRAY_STRIDE));
    const count = cloud.count;
    expect(count).toBeGreaterThan(50);
    const dt = 1e-4;
    cloud.update(flatScene(), dt);
    let up = 0;
    for (let k = 0; k < count; k += 1) up += (cloud.particles[k * SPRAY_STRIDE + 1] - start[k * SPRAY_STRIDE + 1]) / dt / count;
    expect(up / (SPLASH_UP.vertical * 4)).toBeGreaterThan(0.85);
    expect(up / (SPLASH_UP.vertical * 4)).toBeLessThan(1.15);
  });

  it('splashes drops up from a lip impact in proportion to its energy, which fall back into the water', () => {
    const small = new SprayCloud(3);
    small.update(flatScene(0, [impact(0.05)]), 1 / 60);
    const large = new SprayCloud(3);
    large.update(flatScene(0, [impact(0.2)]), 1 / 60);
    expect(small.count).toBeGreaterThan(5);
    expect(large.count).toBeGreaterThan(3 * small.count);
    let highest = 0;
    for (let frame = 0; frame < 300 && large.count > 0; frame += 1) {
      large.update(flatScene(), 1 / 60);
      for (let k = 0; k < large.count; k += 1) highest = Math.max(highest, large.particles[k * SPRAY_STRIDE + 1]);
    }
    expect(highest).toBeGreaterThan(0.3);
    expect(large.count).toBe(0);
  });

  it('carries drops downwind', () => {
    const calm = new SprayCloud(9);
    calm.update(flatScene(0, [impact(0.2)]), 1 / 60);
    const blown = new SprayCloud(9);
    blown.update(flatScene(8, [impact(0.2)]), 1 / 60);
    expect(meanVelocityZ(blown, flatScene(8), 0.2)).toBeGreaterThan(meanVelocityZ(calm, flatScene(0), 0.2) + 0.5);
  });

  it('feathers mist seaward off a steep crest in offshore wind, and not in calm air', () => {
    const offshore = new SprayCloud(5);
    const calm = new SprayCloud(5);
    for (let frame = 0; frame < 120; frame += 1) {
      offshore.update(flatScene(-9, [], true), 1 / 60);
      calm.update(flatScene(0, [], true), 1 / 60);
    }
    expect(calm.count).toBe(0);
    expect(offshore.count).toBeGreaterThan(10);
    expect(meanVelocityZ(offshore, flatScene(-9, [], true), 0.1)).toBeLessThan(-1);
  });

  it('stays within its pool and replays a seed exactly', () => {
    const a = new SprayCloud(11, 64);
    const b = new SprayCloud(11, 64);
    for (let frame = 0; frame < 30; frame += 1) {
      a.update(flatScene(3, [impact(0.4)]), 1 / 60);
      b.update(flatScene(3, [impact(0.4)]), 1 / 60);
    }
    expect(a.count).toBeLessThanOrEqual(64);
    expect(Array.from(a.particles.subarray(0, a.count * SPRAY_STRIDE))).toEqual(Array.from(b.particles.subarray(0, b.count * SPRAY_STRIDE)));
  });
});

describe('the foam ball (G9)', () => {
  const roller = (z = 20): TubeRoller => ({ id: 1, x: 5, y: 0.5, z, dirX: 0, dirZ: 1, speed: 4, area: 1.5, width: 1 });
  const foamBalls = (cloud: SprayCloud) => Array.from({ length: cloud.count }, (_, k) => k).filter((k) => cloud.particles[k * SPRAY_STRIDE + 5] === 2);

  it('keeps about A·w / v_s foam-ball sprites alive in a roller, each half a metre to 0.8 m across', () => {
    const cloud = new SprayCloud(8);
    for (let frame = 0; frame < 30; frame += 1) cloud.update({ ...flatScene(), rollers: [roller()] }, 1 / 60);
    const balls = foamBalls(cloud);
    expect(Math.abs(balls.length - 1.5 / FOAM_BALL_VOLUME)).toBeLessThanOrEqual(1);
    for (const k of balls) {
      expect(cloud.particles[k * SPRAY_STRIDE + 3]).toBeGreaterThanOrEqual(0.5);
      expect(cloud.particles[k * SPRAY_STRIDE + 3]).toBeLessThanOrEqual(0.8);
    }
  });

  it('holds them in its cross-section, riding with the crest and tumbling at its speed over its radius', () => {
    const cloud = new SprayCloud(9);
    const first = roller();
    cloud.update({ ...flatScene(), rollers: [first] }, 1 / 60);
    const radius = Math.sqrt(first.area / Math.PI);
    const angle = (k: number, at: TubeRoller) => Math.atan2(cloud.particles[k * SPRAY_STRIDE + 1] - at.y, cloud.particles[k * SPRAY_STRIDE + 2] - at.z);
    const balls = foamBalls(cloud);
    expect(balls.length).toBeGreaterThan(5);
    const before = balls.map((k) => angle(k, first));
    const next = roller(first.z + first.speed / 60);
    cloud.update({ ...flatScene(), rollers: [next] }, 1 / 60);
    expect(foamBalls(cloud)).toEqual(balls);
    balls.forEach((k, n) => {
      const along = cloud.particles[k * SPRAY_STRIDE + 2] - next.z;
      const up = cloud.particles[k * SPRAY_STRIDE + 1] - next.y;
      expect(Math.hypot(along, up)).toBeLessThanOrEqual(radius + 1e-5);
      expect(Math.abs(cloud.particles[k * SPRAY_STRIDE] - next.x)).toBeLessThanOrEqual(next.width / 2 + 1e-5);
      if (Math.hypot(along, up) < 0.2) return;
      // Its top rolls forward, the way the crest goes.
      const turn = Math.atan2(Math.sin(angle(k, next) - before[n]), Math.cos(angle(k, next) - before[n]));
      expect(turn).toBeCloseTo(-(next.speed / radius) / 60, 4);
    });
  });

  it('lets them drift on for a second once the roller is gone', () => {
    const cloud = new SprayCloud(10);
    for (let frame = 0; frame < 10; frame += 1) cloud.update({ ...flatScene(), rollers: [roller()] }, 1 / 60);
    const balls = foamBalls(cloud).length;
    expect(balls).toBeGreaterThan(0);
    for (let frame = 0; frame < 54; frame += 1) cloud.update(flatScene(), 1 / 60);
    expect(foamBalls(cloud).length).toBe(balls);
    for (let frame = 0; frame < 12; frame += 1) cloud.update(flatScene(), 1 / 60);
    expect(foamBalls(cloud).length).toBe(0);
  });

  it('packs a foam ball opaque while its roller holds it, its coverage its own (Rich draws it by its depth), and fading over the second it lingers', () => {
    const cloud = new SprayCloud(11);
    for (let frame = 0; frame < 10; frame += 1) cloud.update({ ...flatScene(), rollers: [roller()] }, 1 / 60);
    // The opacity Rich draws it with is the last float (`SPRAY_STRIDE`); the 0.9 before the kind is Classic's, which draws none.
    const held = foamBalls(cloud).map((k) => cloud.particles[(k + 1) * SPRAY_STRIDE - 1]);
    expect(held.length).toBeGreaterThan(0);
    for (const opacity of held) expect(opacity).toBe(1);
    for (const k of foamBalls(cloud)) expect(cloud.particles[k * SPRAY_STRIDE + 4]).toBeCloseTo(0.9, 6);
    for (let frame = 0; frame < 30; frame += 1) cloud.update(flatScene(), 1 / 60);
    for (const k of foamBalls(cloud)) expect(cloud.particles[(k + 1) * SPRAY_STRIDE - 1]).toBeCloseTo(0.5, 1);
    for (const k of foamBalls(cloud)) expect(cloud.particles[k * SPRAY_STRIDE + 4]).toBeCloseTo(0.45, 1);
  });

  it('gives a closing tube’s whitewater its own room, so the spray keeps its whole pool and the foam ball its own', () => {
    // 40 places for spray and mist, 30 for the tube's whitewater (drawn in Rich only).
    const cloud = new SprayCloud(12, 40, 30);
    const spit: TubeSpit = { x: 5, y: 1, z: 20, dirX: 1, dirZ: 0, speed: 6, airRate: 12 };
    cloud.update({ ...flatScene(0, [impact(0.4)]), spits: [spit], rollers: [roller()] }, 1 / 60);
    const kinds = Array.from({ length: cloud.count }, (_, k) => cloud.particles[k * SPRAY_STRIDE + 5]);
    expect(kinds.filter((kind) => kind < 2).length).toBe(40);
    expect(foamBalls(cloud).length).toBe(Math.round(1.5 / FOAM_BALL_VOLUME));
    expect(kinds.filter((kind) => kind >= 2).length).toBeLessThanOrEqual(30);
    expect(cloud.whitewaterCount).toBe(kinds.filter((kind) => kind >= 2).length);
  });

  it('marks a spit’s and an eruption’s drops as the tube’s own: spray 3, mist 4', () => {
    const cloud = new SprayCloud(13);
    const spit: TubeSpit = { x: 5, y: 1, z: 20, dirX: 1, dirZ: 0, speed: 6, airRate: 3 };
    cloud.update({ ...flatScene(), spits: [spit], eruptions: [{ x: 5, y: 1, z: 20, airRate: 2, speed: 3 }] }, 0.5);
    const kinds = new Set(Array.from({ length: cloud.count }, (_, k) => cloud.particles[k * SPRAY_STRIDE + 5]));
    expect([...kinds].sort()).toEqual([3, 4]);
  });

  it('packs each particle’s kind after its opacity: spray 0, mist 1, foam ball 2, and what the Rich look draws it by after the kind', () => {
    // Appended after the kind, so every reader of the older offsets (x, y, z, size, opacity, kind) is unmoved.
    expect(SPRAY_STRIDE).toBe(14);
    const cloud = new SprayCloud(3);
    cloud.update({ ...flatScene(0, [impact(0.2)]), rollers: [roller()] }, 1 / 60);
    const kinds = new Set(Array.from({ length: cloud.count }, (_, k) => cloud.particles[k * SPRAY_STRIDE + 5]));
    expect([...kinds].sort()).toEqual([0, 1, 2]);
  });
});

describe('the spit and the eruption (G9)', () => {
  /** The particles' mean velocity over a step so short the drag has barely acted. */
  function launchVelocity(cloud: SprayCloud): { x: number; y: number; z: number } {
    const start = Array.from(cloud.particles.subarray(0, cloud.count * SPRAY_STRIDE));
    const count = cloud.count;
    const dt = 1e-4;
    cloud.update(flatScene(), dt);
    const mean = { x: 0, y: 0, z: 0 };
    for (let k = 0; k < count; k += 1) {
      mean.x += (cloud.particles[k * SPRAY_STRIDE] - start[k * SPRAY_STRIDE]) / dt / count;
      mean.y += (cloud.particles[k * SPRAY_STRIDE + 1] - start[k * SPRAY_STRIDE + 1]) / dt / count;
      mean.z += (cloud.particles[k * SPRAY_STRIDE + 2] - start[k * SPRAY_STRIDE + 2]) / dt / count;
    }
    return mean;
  }

  it('blows a spit’s spray and mist out of the mouth at its speed, s_a particles per m³ of air', () => {
    const spit: TubeSpit = { x: 5, y: 1, z: 20, dirX: 1, dirZ: 0, speed: 6, airRate: 3 };
    const cloud = new SprayCloud(6);
    cloud.update({ ...flatScene(), spits: [spit] }, 0.5);
    // 3 m³/s for half a second is 1.5 m³ of air.
    expect(cloud.count).toBe(1.5 * SPRAY_PER_AIR);
    const velocity = launchVelocity(cloud);
    expect(velocity.x / spit.speed).toBeGreaterThan(0.85);
    expect(velocity.x / spit.speed).toBeLessThan(1.15);
    expect(Math.abs(velocity.z)).toBeLessThan(0.1 * spit.speed);
  });

  it('bursts an eruption’s spray and mist straight up', () => {
    const eruption: TubeEruption = { x: 5, y: 1, z: 20, airRate: 2, speed: 3 };
    const cloud = new SprayCloud(7);
    cloud.update({ ...flatScene(), eruptions: [eruption] }, 0.5);
    expect(cloud.count).toBe(SPRAY_PER_AIR);
    const velocity = launchVelocity(cloud);
    expect(velocity.y / eruption.speed).toBeGreaterThan(0.85);
    expect(velocity.y / eruption.speed).toBeLessThan(1.15);
    expect(Math.hypot(velocity.x, velocity.z)).toBeLessThan(0.1 * eruption.speed);
  });
});

describe('a swept barrel’s landing spray (Padang Padang, Part B, PR 5)', () => {
  it('rises from the landing’s own height in both looks, not from the water under the drawn curl; every other landing as before', () => {
    for (const look of ['rich', 'classic'] as const) {
      // The landing lies half a metre under the solver's surface there (the hump under the drawn tube).
      const swept = new SprayCloud(3);
      swept.look = look;
      swept.update(flatScene(0, [{ ...impact(0.05), y: -0.5 }]), 1 / 60);
      expect(swept.count).toBeGreaterThan(0);
      for (let k = 0; k < swept.count; k += 1) expect(swept.particles[k * SPRAY_STRIDE + 1]).toBeCloseTo(-0.45, 6);
      const plain = new SprayCloud(3);
      plain.look = look;
      plain.update(flatScene(0, [impact(0.05)]), 1 / 60);
      for (let k = 0; k < plain.count; k += 1) expect(plain.particles[k * SPRAY_STRIDE + 1]).toBeCloseTo(0.05, 6);
    }
  });
});

describe('the spray’s flight, unchanged by how Rich draws it (spray item 1)', () => {
  /** A steep crest facing the shore over 2 m of water, with bore foam behind it and the flow a little onshore. */
  function goldenScene(windSpeed: number, lipImpacts: LipImpact[], extras: Partial<SprayScene> = {}): SprayScene {
    const nx = 10;
    const nz = 40;
    const h = new Float64Array(nx * nz).fill(2);
    for (let row = 18; row <= 20; row += 1) for (let column = 0; column < nx; column += 1) h[row * nx + column] = row === 20 ? 2.9 : 2 + 0.9 * (row - 17) / 3;
    const source = new Float64Array(nx * nz);
    for (let column = 2; column < 6; column += 1) source[22 * nx + column] = 1.5;
    return {
      solver: {
        nx, nz, dx: 1, restLevel: 0,
        xCenters: Array.from({ length: nx }, (_, i) => i + 0.5),
        zCenters: Array.from({ length: nz }, (_, i) => i + 0.5),
        dz: new Float64Array(nz).fill(1),
        h, bed: new Float64Array(nx * nz).fill(-2), qx: new Float64Array(nx * nz).fill(0.3), qz: new Float64Array(nx * nz).fill(0.5),
        cellIndex: (x, z) => Math.min(nz - 1, Math.max(0, Math.floor(z))) * nx + Math.min(nx - 1, Math.max(0, Math.floor(x))),
      },
      foam: { source }, lipImpacts, windSpeed, ...extras,
    };
  }

  /** FNV-1a over the bits of the fields `fields` of every live particle of a kind under `below`: their count and hash. */
  function readerHash(cloud: SprayCloud, fields: readonly number[], below: number): string {
    const float = new Float32Array(1);
    const bits = new Uint32Array(float.buffer);
    let hash = 0x811c9dc5;
    let count = 0;
    for (let k = 0; k < cloud.count; k += 1) {
      if (!(cloud.particles[k * SPRAY_STRIDE + 5] < below)) continue;
      count += 1;
      for (const j of fields) {
        float[0] = cloud.particles[k * SPRAY_STRIDE + j];
        hash = Math.imul(hash ^ bits[0], 0x01000193) >>> 0;
      }
    }
    return `${count}:${hash.toString(16)}`;
  }

  /** Four seconds of impacts, paddle strokes, a roller, spits, eruptions, bore foam and a changing wind; hashes every 40 steps. */
  function hashes(look: 'classic' | 'rich', fields: readonly number[], wind: (frame: number) => number, below = 99): string[] {
    const cloud = new SprayCloud(7);
    cloud.look = look;
    const roller: TubeRoller = { id: 1, x: 5, y: 0.5, z: 20, dirX: 0, dirZ: 1, speed: 4, area: 1.5, width: 1 };
    const spit: TubeSpit = { x: 5, y: 1, z: 20, dirX: 1, dirZ: 0, speed: 6, airRate: 3 };
    const eruption: TubeEruption = { x: 5, y: 1, z: 20, airRate: 2, speed: 3 };
    const stroke: StrokeSplash = { x: 5, y: 0, z: 20, jx: 0, jy: 0, jz: 40, speed: 4 };
    const out: string[] = [];
    for (let frame = 0; frame < 240; frame += 1) {
      const impacts: LipImpact[] = frame % 25 === 0 ? [{ x: 5, z: 20, volume: 0.15, whole: 0.2, kind: frame % 50 === 0 ? 0 : 1, vx: 0.5, vy: -4, vz: 5 }] : [];
      cloud.update(goldenScene(wind(frame), impacts, {
        strokes: frame % 30 === 0 ? [stroke] : undefined, rollers: frame < 100 ? [roller] : undefined,
        spits: frame % 40 === 0 ? [spit] : undefined, eruptions: frame % 60 === 0 ? [eruption] : undefined,
      }), 1 / 60);
      if (frame % 40 === 39) out.push(readerHash(cloud, fields, below));
    }
    return out;
  }
  const offshore = (frame: number) => (frame < 90 ? -9 : frame < 150 ? 4 : -3);
  const onshore = (frame: number) => (frame < 90 ? 6 : frame < 150 ? 4 : 0);

  it('flies Classic’s particles exactly as before, and packs those it draws (spray and mist) exactly as before (hashes taken on the code before)', () => {
    // What Classic draws: position, size, opacity and kind.
    expect(hashes('classic', [0, 1, 2, 3, 4, 5], offshore, 2)).toEqual(['220:ee5b13b8', '277:5fb34cf8', '264:df1ff4c0', '286:396cf692', '80:ca84f111', '157:52cb3f28']);
    expect(hashes('classic', [0, 1, 2, 3, 4, 5], onshore, 2)).toEqual(['192:6802e591', '214:404ec71c', '229:56c1a856', '289:1c4a14ab', '87:1e3cede7', '128:17339b96']);
    // And where every particle flies, the tube's whitewater too.
    expect(hashes('classic', [0, 1, 2, 5], offshore)).toEqual(['234:5185c920', '295:3bff07a4', '281:94283463', '300:92f7453b', '83:fcb31be5', '160:db250492']);
  });

  it('flies Rich’s particles exactly as before too: where each is and what it is (hashes taken on the code before)', () => {
    expect(hashes('rich', [0, 1, 2, 5], onshore)).toEqual(['315:13079cf', '376:18735f52', '305:231ec79a', '372:75a66cde', '177:5c0a46e0', '249:4d914ff']);
    expect(hashes('rich', [0, 1, 2, 5], offshore)).toEqual(['303:2840290a', '417:2e24f577', '254:4cdad4d5', '342:1e28e219', '177:4c8daa61', '291:ce2ca607']);
  });
});

describe('spray drawn by its optical depth (decided 2026-09-29, spray item 1)', () => {
  const at = { streak: 6, tau: 9, column: 10, glass: 11, width: 12, opacity: 13 } as const;
  const roller = (): TubeRoller => ({ id: 1, x: 5, y: 0.5, z: 20, dirX: 0, dirZ: 1, speed: 4, area: 1.5, width: 1 });
  const foamBalls = (cloud: SprayCloud) => Array.from({ length: cloud.count }, (_, k) => k).filter((k) => cloud.particles[k * SPRAY_STRIDE + 5] === 2);

  it('draws drop sizes from the law, by volume: the count falls as d^-2 below 1 mm and d^-6 above', () => {
    expect(DROP_LAW).toEqual({ knee: 1e-3, below: -2, above: -6 });
    const n = 200_000;
    const samples = Array.from({ length: n }, (_, i) => dropDiameter((i + 0.5) / n, 0.2e-3, 3e-3));
    // Each volume-weighted sample stands for 1/d³ drops: the count in [lo, hi), per metre of diameter.
    const density = (lo: number, hi: number) => samples.reduce((sum, d) => (d >= lo && d < hi ? sum + 1 / d ** 3 : sum), 0) / (hi - lo);
    const slope = (a: [number, number], b: [number, number]) => Math.log(density(...b) / density(...a)) / Math.log((b[0] + b[1]) / (a[0] + a[1]));
    expect(slope([0.3e-3, 0.4e-3], [0.7e-3, 0.8e-3])).toBeCloseTo(DROP_LAW.below, 1);
    expect(slope([1.2e-3, 1.4e-3], [2.0e-3, 2.2e-3])).toBeCloseTo(DROP_LAW.above, 0);
    expect(Math.min(...samples.slice(0, 10))).toBeGreaterThanOrEqual(0.2e-3);
    expect(samples[n - 1]).toBeLessThanOrEqual(3e-3);
    for (let i = 1; i < n; i += 997) expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
  });

  it('takes its optical depth as 1.5 w / r (Bohren 1987): a 1 cm sheet torn into 0.5 mm drops is white, spread over 30 times the area translucent', () => {
    expect(opticalDepth(0.01, 0.5e-3)).toBeCloseTo(30, 9);
    expect(opticalDepth(0.01 / 30, 0.5e-3)).toBeCloseTo(1, 9);
  });

  /** One impact's burst high over the water (so none lands), and each step after it up to `steps`. */
  function burst(seed: number, steps: number, look: 'classic' | 'rich' = 'rich'): SprayCloud[] {
    const cloud = new SprayCloud(seed);
    cloud.look = look;
    const frames: SprayCloud[] = [];
    cloud.update(flatScene(0, [{ ...impact(0.4), y: 60 }]), 1 / 60);
    const copy = () => Object.assign(Object.create(SprayCloud.prototype) as SprayCloud, { count: cloud.count, particles: cloud.particles.slice() });
    frames.push(copy());
    for (let step = 1; step < steps; step += 1) {
      cloud.update(flatScene(), 1 / 60);
      frames.push(copy());
    }
    return frames;
  }
  const field = (cloud: SprayCloud, k: number, offset: number) => cloud.particles[k * SPRAY_STRIDE + offset];

  it('is clear water when young, its sheets torn into drops within a few tenths of a second, then thinning as it spreads', () => {
    const frames = burst(31, 90);
    const first = frames[0];
    const spray = Array.from({ length: first.count }, (_, k) => k).filter((k) => field(first, k, 5) === 0);
    expect(spray.length).toBeGreaterThan(20);
    const glass = spray.map((k) => field(first, k, at.glass)).sort((a, b) => a - b);
    expect(glass[Math.floor(glass.length / 2)]).toBeGreaterThan(0.5);
    for (const k of spray) {
      // Born as sheets: clear, covering much of its disc, its drops' optical depth still small.
      expect(field(first, k, at.glass)).toBeGreaterThan(0.2);
      expect(field(first, k, at.tau)).toBeLessThan(0.3 * field(frames[6], k, at.tau));
    }
    const k = spray[0];
    const taus = frames.map((frame) => field(frame, k, at.tau));
    const peak = taus.indexOf(Math.max(...taus));
    expect(peak / 60).toBeLessThan(0.5);
    expect(field(frames[30], k, at.glass)).toBeLessThan(0.01);
    expect(taus[89]).toBeLessThan(0.5 * taus[peak]);
  });

  it('widens as its drops fly apart at the spread of their launch, till the air has taken their speeds', () => {
    // Under a spray drop's shortest life (1.8 s), so every one of the burst is still there, where it was in the pool.
    const frames = burst(32, 101);
    expect(frames[100].count).toBe(frames[0].count);
    for (let k = 0; k < frames[0].count; k += 1) {
      if (field(frames[0], k, 5) !== 0) continue;
      // A lip impact's drops leave with an even spread of 1.5 m/s across, and the air takes it over v_t / g: 0.31 s
      // for drops falling at 3 m/s, 0.71 s at 7 m/s. So their cluster widens by 1.5 × that at most.
      const grown = (frame: number) => field(frames[frame], k, at.width) - field(frames[0], k, at.width);
      expect(grown(6)).toBeGreaterThan(0.6 * 1.5 * (6 / 60));
      expect(grown(6)).toBeLessThanOrEqual(1.5 * (6 / 60) + 1e-6);
      expect(grown(100)).toBeGreaterThan(grown(50));
      expect(grown(100)).toBeLessThan(1.5 * 0.72);
      expect(grown(100) - grown(50)).toBeLessThan(grown(50) - grown(0));
    }
  });

  it('is see-through one cluster at a time, and white where an impact’s clusters crowd: the spray round each is far denser than itself', () => {
    const frames = burst(33, 8);
    const frame = frames[6];
    const own: number[] = [];
    const round: number[] = [];
    for (let k = 0; k < frame.count; k += 1) {
      if (field(frame, k, 5) !== 0) continue;
      own.push(field(frame, k, at.tau));
      round.push(field(frame, k, at.column));
    }
    own.sort((a, b) => a - b);
    round.sort((a, b) => a - b);
    expect(own[Math.floor(own.length / 2)]).toBeLessThan(4);
    expect(round[Math.floor(round.length * 0.9)]).toBeGreaterThan(15);
    expect(round[Math.floor(round.length / 2)]).toBeGreaterThan(3 * own[Math.floor(own.length / 2)]);
  });

  it('gathers the spray round a cluster as its drops’ cross-section, 1.5 V / r, over the cell’s face', () => {
    // One cluster alone (a pool of one): the spray round it is its own, read trilinearly from the cells about it.
    const cloud = new SprayCloud(34, 1, 0);
    cloud.update(flatScene(0, [{ ...impact(0.4), y: 60 }]), 1 / 60);
    for (let step = 0; step < 6; step += 1) cloud.update(flatScene(), 1 / 60);
    expect(cloud.count).toBe(1);
    const width = field(cloud, 0, at.width);
    const crossSection = (field(cloud, 0, at.tau) * Math.PI * width * width) / 4;
    expect(field(cloud, 0, at.column)).toBeGreaterThan(0.125 * (crossSection / COLUMN_CELL ** 2));
    expect(field(cloud, 0, at.column)).toBeLessThanOrEqual((crossSection / COLUMN_CELL ** 2) * (1 + 1e-6));
  });

  it('streaks each cluster over the way it travels while the eye takes it in, a frame at 60 Hz', () => {
    expect(STREAK_EXPOSURE).toBeCloseTo(1 / 60, 12);
    const cloud = new SprayCloud(35);
    cloud.update(flatScene(0, [impact(0.3)]), 1 / 60);
    const before = Array.from(cloud.particles.subarray(0, cloud.count * SPRAY_STRIDE));
    const count = cloud.count;
    const dt = 1e-3;
    cloud.update(flatScene(), dt);
    for (let k = 0; k < Math.min(count, cloud.count); k += 1) {
      for (let axis = 0; axis < 3; axis += 1) {
        const velocity = (cloud.particles[k * SPRAY_STRIDE + axis] - before[k * SPRAY_STRIDE + axis]) / dt;
        expect(Math.abs(field(cloud, k, at.streak + axis) / STREAK_EXPOSURE - velocity)).toBeLessThan(0.2 + 0.1 * Math.abs(velocity));
      }
    }
  });

  it('writes what Rich draws by in Classic too, so a switch to Rich draws the spray at once', () => {
    const cloud = new SprayCloud(36);
    cloud.look = 'classic';
    cloud.update(flatScene(0, [{ ...impact(0.4), y: 60 }]), 1 / 60);
    for (let step = 0; step < 6; step += 1) cloud.update(flatScene(), 1 / 60);
    const classic = cloud.particles.slice(0, cloud.count * SPRAY_STRIDE);
    cloud.look = 'rich';
    cloud.update(flatScene(), 1e-9);
    for (let k = 0; k < cloud.count; k += 1) {
      for (const offset of [at.tau, at.glass]) {
        expect(classic[k * SPRAY_STRIDE + offset]).toBeGreaterThan(0);
        expect(classic[k * SPRAY_STRIDE + offset]).toBeCloseTo(field(cloud, k, offset), 4);
      }
      // The spray round a cluster is read every few steps, so Classic's may be a few steps old.
      expect(classic[k * SPRAY_STRIDE + at.column]).toBeGreaterThan(0);
    }
  });

  it('packs Classic’s size and opacity in the first six floats whichever look the cloud is packed for, and Rich’s width and opacity after the rest', () => {
    const spit: TubeSpit = { x: 5, y: 1, z: 20, dirX: 1, dirZ: 0, speed: 6, airRate: 3 };
    const packed = (look: 'classic' | 'rich') => {
      const cloud = new SprayCloud(37);
      cloud.look = look;
      cloud.update({ ...flatScene(), spits: [spit], rollers: [roller()] }, 0.3);
      for (let step = 0; step < 12; step += 1) cloud.update({ ...flatScene(), rollers: [roller()] }, 1 / 60);
      return cloud;
    };
    const classic = packed('classic');
    const rich = packed('rich');
    expect(rich.count).toBe(classic.count);
    expect(classic.count).toBeGreaterThan(20);
    // The same spray in either look, field for field: a switch of look needs no new snapshot.
    expect(Array.from(rich.particles.subarray(0, rich.count * SPRAY_STRIDE))).toEqual(Array.from(classic.particles.subarray(0, classic.count * SPRAY_STRIDE)));
    for (let k = 0; k < rich.count; k += 1) {
      const kind = field(rich, k, 5);
      if (kind === 2) {
        // A ball holds its roller's size in both pairs and its opacity, Classic's with the 0.9 it always had, in both.
        expect(field(rich, k, 3)).toBeCloseTo(field(rich, k, at.width), 6);
        expect(field(rich, k, 4)).toBeCloseTo(0.9 * field(rich, k, at.opacity), 6);
        continue;
      }
      // Classic's: mist at most a quarter opaque, drops at most four fifths, fading as they age; Rich draws by optical depth, in full.
      expect(field(rich, k, 4)).toBeLessThanOrEqual((kind === 1 || kind === 4 ? 0.25 : 0.8) + 1e-6);
      expect(field(rich, k, at.opacity)).toBe(1);
      // Rich's width is as wide as its drops have spread (mist at its launch size or wider), Classic's the size it was born with, mist growing.
      expect(field(rich, k, at.width)).toBeGreaterThanOrEqual(field(rich, k, 3) / (kind === 1 || kind === 4 ? 2 : 1) - 1e-6);
    }
  });

  it('reads the spray round each cluster every few steps, and a newborn one’s at once', () => {
    expect(COLUMN_EVERY).toBe(4);
    const cloud = new SprayCloud(39);
    cloud.update(flatScene(0, [{ ...impact(0.4), y: 60 }]), 1 / 60);
    for (let step = 0; step < 3; step += 1) cloud.update(flatScene(), 1 / 60);
    // A second burst where the first's drops are: its newborn clusters read the spray round them at once.
    const old = cloud.count;
    cloud.update(flatScene(0, [{ ...impact(0.4), y: 60 }]), 1 / 60);
    expect(cloud.count).toBeGreaterThan(old);
    for (let k = old; k < cloud.count; k += 1) expect(field(cloud, k, at.column)).toBeGreaterThan(0);
    const before = Array.from({ length: cloud.count }, (_, k) => field(cloud, k, at.column));
    cloud.update(flatScene(), 1 / 60);
    // A quarter of them have read it again a step on; the rest keep what they read.
    const changed = before.filter((value, k) => field(cloud, k, at.column) !== value).length;
    expect(changed / before.length).toBeGreaterThan(0.15);
    expect(changed / before.length).toBeLessThan(0.35);
  });

  it('gives a foam ball no optical depth of its own: it is drawn as a ball', () => {
    const cloud = new SprayCloud(37);
    for (let frame = 0; frame < 20; frame += 1) cloud.update({ ...flatScene(), rollers: [roller()] }, 1 / 60);
    const balls = foamBalls(cloud);
    expect(balls.length).toBeGreaterThan(3);
    for (const k of balls) for (const offset of [at.tau, at.column, at.glass]) expect(field(cloud, k, offset)).toBe(0);
  });

  it('replays a seed exactly, optics and all', () => {
    const a = new SprayCloud(38, 200);
    const b = new SprayCloud(38, 200);
    for (let frame = 0; frame < 40; frame += 1) {
      a.update(flatScene(2, [impact(0.2)]), 1 / 60);
      b.update(flatScene(2, [impact(0.2)]), 1 / 60);
    }
    expect(Array.from(a.particles.subarray(0, a.count * SPRAY_STRIDE))).toEqual(Array.from(b.particles.subarray(0, b.count * SPRAY_STRIDE)));
  });
});
