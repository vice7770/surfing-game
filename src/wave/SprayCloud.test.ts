import { describe, expect, it } from 'vitest';
import {
  CLASSIC_SPRAY_CAPACITY, DROP_LAW, FOAM_BALL_VOLUME, LIP_CREST_STRIDE, SPRAY_CAPACITY, SPRAY_PER_AIR, SPRAY_STRIDE, SprayCloud, VEIL_ONSET, VEIL_RADIUS, VEIL_SPLIT, createLipCrests,
  dropDiameter, opticalDepth, relativeWind, splashLaunch, veilRate, veilStrength, writeLipCrests, type LipCrests, type LipImpact, type SprayScene, type StrokeSplash,
} from './SprayCloud';
import { LANDMARK } from './barrel/ProfileLibrary';
import { LOFT, LOFT_SAMPLES } from './barrel/sweptLoft';
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

  it('packs each particle’s kind after its opacity, and its velocity and optical depth after the kind: spray 0, mist 1, foam ball 2', () => {
    // Appended after the kind, so every reader of the older offsets (x, y, z, size, opacity, kind) is unmoved.
    expect(SPRAY_STRIDE).toBe(10);
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

describe('the Classic spray’s particles (the Rich optics added beside them)', () => {
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

  /**
   * FNV-1a over the bits of every live particle's fields `fields` (of x, y, z, size, opacity, kind): what a Classic reader
   * sees, all six; or, for the Rich look, which draws a spray cluster spreading, where the particles are and what they are.
   */
  function readerHash(cloud: SprayCloud, fields: readonly number[]): string {
    const float = new Float32Array(1);
    const bits = new Uint32Array(float.buffer);
    let hash = 0x811c9dc5;
    for (let k = 0; k < cloud.count; k += 1) {
      for (const j of fields) {
        float[0] = cloud.particles[k * SPRAY_STRIDE + j];
        hash = Math.imul(hash ^ bits[0], 0x01000193) >>> 0;
      }
    }
    return `${cloud.count}:${hash.toString(16)}`;
  }

  /**
   * Four seconds of impacts, paddle strokes, a roller, spits, eruptions, bore foam and a changing wind; the hashes taken
   * every 40 steps. Classic runs the offshore winds (its feathering is as it was before the Rich veil); Rich runs
   * winds that never blow offshore.
   */
  function hashes(look: 'classic' | 'rich'): string[] {
    const cloud = new SprayCloud(7);
    cloud.look = look;
    const roller: TubeRoller = { id: 1, x: 5, y: 0.5, z: 20, dirX: 0, dirZ: 1, speed: 4, area: 1.5, width: 1 };
    const spit: TubeSpit = { x: 5, y: 1, z: 20, dirX: 1, dirZ: 0, speed: 6, airRate: 3 };
    const eruption: TubeEruption = { x: 5, y: 1, z: 20, airRate: 2, speed: 3 };
    const stroke: StrokeSplash = { x: 5, y: 0, z: 20, jx: 0, jy: 0, jz: 40, speed: 4 };
    const out: string[] = [];
    for (let frame = 0; frame < 240; frame += 1) {
      const wind = look === 'classic' ? (frame < 90 ? -9 : frame < 150 ? 4 : -3) : (frame < 90 ? 6 : frame < 150 ? 4 : 0);
      const impacts: LipImpact[] = frame % 25 === 0 ? [{ x: 5, z: 20, volume: 0.15, whole: 0.2, kind: frame % 50 === 0 ? 0 : 1, vx: 0.5, vy: -4, vz: 5 }] : [];
      cloud.update(goldenScene(wind, impacts, {
        strokes: frame % 30 === 0 ? [stroke] : undefined, rollers: frame < 100 ? [roller] : undefined,
        spits: frame % 40 === 0 ? [spit] : undefined, eruptions: frame % 60 === 0 ? [eruption] : undefined,
      }), 1 / 60);
      if (frame % 40 === 39) out.push(readerHash(cloud, look === 'classic' ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 5]));
    }
    return out;
  }

  it('flies and draws exactly as before the optics: every particle’s position, size, opacity and kind (hashes taken on the code before)', () => {
    expect(hashes('classic')).toEqual(['234:c32f839d', '295:ab926a38', '281:a9244b0c', '300:a322e1da', '83:7535a966', '160:28044001']);
  });

  it('flies the Rich spray as before too, where it is not blown off a crest by an offshore wind: where every particle is and what it is', () => {
    expect(hashes('rich')).toEqual(['315:13079cf', '376:18735f52', '305:231ec79a', '372:75a66cde', '177:5c0a46e0', '249:4d914ff']);
  });
});

describe('spray drawn by its optical depth (decided 2026-09-29, item 1)', () => {
  const OFFSET = { velocity: 6, tau: 9 } as const;

  it('draws drop sizes from the law, by volume: the count falls as d^-2 below 1 mm and d^-6 above', () => {
    expect(DROP_LAW.knee).toBe(1e-3);
    const n = 200_000;
    const samples = Array.from({ length: n }, (_, i) => dropDiameter((i + 0.5) / n, 0.2e-3, 3e-3));
    // Each volume-weighted sample stands for 1/d³ drops: the count of drops in [lo, hi), per metre of diameter.
    const density = (lo: number, hi: number) => samples.reduce((sum, d) => (d >= lo && d < hi ? sum + 1 / d ** 3 : sum), 0) / (hi - lo);
    const slope = (a: [number, number], b: [number, number]) => Math.log(density(...b) / density(...a)) / Math.log((b[0] + b[1]) / (a[0] + a[1]));
    expect(slope([0.3e-3, 0.4e-3], [0.7e-3, 0.8e-3])).toBeCloseTo(DROP_LAW.below, 1);
    expect(slope([1.2e-3, 1.4e-3], [2.0e-3, 2.2e-3])).toBeCloseTo(DROP_LAW.above, 0);
    expect(samples.reduce((least, d) => Math.min(least, d), Infinity)).toBeGreaterThanOrEqual(0.2e-3);
    expect(samples.reduce((most, d) => Math.max(most, d), 0)).toBeLessThanOrEqual(3e-3);
    // The splash's Sauter diameter, 1 / the mean of 1 / d over equal water, is 0.5–1.1 mm (Erinin et al. 2023).
    const splash = Array.from({ length: n }, (_, i) => dropDiameter((i + 0.5) / n, 0.3e-3, 3e-3));
    const sauter = 1 / (splash.reduce((sum, d) => sum + 1 / d, 0) / n);
    expect(sauter).toBeGreaterThan(0.5e-3);
    expect(sauter).toBeLessThan(1.2e-3);
  });

  it('walks the sizes in order, and stays on one side of the knee when its range does', () => {
    let last = 0;
    for (let i = 0; i < 100; i += 1) {
      const d = dropDiameter(i / 100, 0.1e-3, 0.5e-3);
      expect(d).toBeGreaterThanOrEqual(last);
      expect(d).toBeLessThanOrEqual(0.5e-3);
      last = d;
    }
    for (let i = 0; i < 20; i += 1) expect(dropDiameter(i / 20, 1.5e-3, 3e-3)).toBeGreaterThanOrEqual(1.5e-3);
  });

  it('takes its optical depth as 1.5 w / r (Bohren 1987): a 1 cm sheet torn into 0.5 mm drops is white, spread over 30 times the area translucent', () => {
    expect(opticalDepth(0.01, 0.5e-3)).toBeCloseTo(30, 9);
    expect(opticalDepth(0.01 / 30, 0.5e-3)).toBeCloseTo(1, 9);
  });

  /**
   * Follows the first particle of a kind in an impact's burst high over the water (so none lands), step by step until the
   * first particle of the pool is gone: its age, optical depth and size.
   */
  function follow(kindWanted: number, seed: number): { age: number; tau: number; size: number }[] {
    const cloud = new SprayCloud(seed);
    cloud.update(flatScene(0, [{ ...impact(0.4), y: 60 }]), 1 / 60);
    const index = Array.from({ length: cloud.count }, (_, k) => k).find((k) => cloud.particles[k * SPRAY_STRIDE + 5] === kindWanted)!;
    const count = cloud.count;
    const track: { age: number; tau: number; size: number }[] = [];
    for (let step = 1; step <= 300 && cloud.count === count; step += 1) {
      cloud.update(flatScene(), 1 / 60);
      if (cloud.count !== count) break;
      const o = index * SPRAY_STRIDE;
      track.push({ age: step / 60, tau: cloud.particles[o + OFFSET.tau], size: cloud.particles[o + 3] });
    }
    return track;
  }

  it('is clear when young and densest within a second, then thins as its water falls out, its mist spreading as it goes', () => {
    for (const kind of [0, 1]) {
      const track = follow(kind, 31 + kind);
      expect(track.length).toBeGreaterThan(30);
      const peak = track.reduce((best, step) => (step.tau > best.tau ? step : best));
      // Clear at birth: the first step has a fraction of the peak, and the peak comes within a second or so.
      expect(track[0].tau).toBeLessThan(0.25 * peak.tau);
      expect(peak.age).toBeLessThan(1.5);
      const last = track[track.length - 1];
      expect(last.tau).toBeLessThanOrEqual(peak.tau);
      // Mist spreads as it goes (twice its width over its life), the same water over more of the view.
      if (kind === 1) expect(last.size).toBeGreaterThan(track[0].size);
      for (const step of track) expect(step.tau).toBeGreaterThanOrEqual(0);
    }
  });

  it('keeps a single cluster translucent (τ near 1) so that an impact’s overlapping clusters, not each one, read white', () => {
    const cloud = new SprayCloud(40);
    cloud.update(flatScene(0, [impact(0.3)]), 1 / 60);
    for (let step = 0; step < 15; step += 1) cloud.update(flatScene(), 1 / 60);
    const taus = Array.from({ length: cloud.count }, (_, k) => cloud.particles[k * SPRAY_STRIDE + OFFSET.tau]);
    expect(taus.length).toBeGreaterThan(50);
    const sorted = [...taus].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    expect(median).toBeGreaterThan(0.2);
    expect(median).toBeLessThan(4);
    // Together they are white: the sum over the burst is far past the 15 that makes spray opaque.
    expect(taus.reduce((sum, tau) => sum + tau, 0)).toBeGreaterThan(15);
  });

  it('packs each particle’s velocity, the one it flies with', () => {
    const cloud = new SprayCloud(41);
    cloud.update(flatScene(0, [impact(0.3)]), 1 / 60);
    const count = cloud.count;
    const before = Array.from(cloud.particles.subarray(0, count * SPRAY_STRIDE));
    const dt = 1e-3;
    cloud.update(flatScene(), dt);
    for (let k = 0; k < count; k += 1) {
      const o = k * SPRAY_STRIDE;
      for (let axis = 0; axis < 3; axis += 1) {
        const moved = (cloud.particles[o + axis] - before[o + axis]) / dt;
        const velocity = cloud.particles[o + OFFSET.velocity + axis];
        // The velocity after the step, over a step in which the drag changed it by a few per cent.
        expect(Math.abs(moved - velocity)).toBeLessThan(0.2 + 0.1 * Math.abs(velocity));
      }
    }
    // A mist or a drop goes up and on with its impact, and comes down.
    const up = Array.from({ length: count }, (_, k) => cloud.particles[k * SPRAY_STRIDE + OFFSET.velocity + 1]);
    expect(Math.max(...up)).toBeGreaterThan(1);
  });

  it('gives a foam ball no optical depth of its own: it is lit and drawn as a ball', () => {
    const cloud = new SprayCloud(42);
    const roller: TubeRoller = { id: 1, x: 5, y: 0.5, z: 20, dirX: 0, dirZ: 1, speed: 4, area: 1.5, width: 1 };
    for (let frame = 0; frame < 20; frame += 1) cloud.update({ ...flatScene(), rollers: [roller] }, 1 / 60);
    let balls = 0;
    for (let k = 0; k < cloud.count; k += 1) {
      if (cloud.particles[k * SPRAY_STRIDE + 5] !== 2) continue;
      balls += 1;
      expect(cloud.particles[k * SPRAY_STRIDE + OFFSET.tau]).toBe(0);
    }
    expect(balls).toBeGreaterThan(3);
  });

  it('replays a seed exactly, optics and all', () => {
    const a = new SprayCloud(43, 200);
    const b = new SprayCloud(43, 200);
    for (let frame = 0; frame < 40; frame += 1) {
      a.update(flatScene(2, [impact(0.2)]), 1 / 60);
      b.update(flatScene(2, [impact(0.2)]), 1 / 60);
    }
    expect(Array.from(a.particles.subarray(0, a.count * SPRAY_STRIDE))).toEqual(Array.from(b.particles.subarray(0, b.count * SPRAY_STRIDE)));
  });
});

describe('the offshore veil (decided 2026-09-29, item 4)', () => {
  /** Water `deep` m deep for x under `edge` and `shallow` m beyond, 10 m wide, with a steep shoreward-facing crest 18–20 m out when `crest`. */
  function sea(windSpeed: number, deep: number, shallow = deep, edge = 5, lipCrests?: LipCrests, crest = false): SprayScene {
    const nx = 10;
    const nz = 40;
    const h = new Float64Array(nx * nz);
    for (let row = 0; row < nz; row += 1) for (let column = 0; column < nx; column += 1) h[row * nx + column] = column < edge ? deep : shallow;
    if (crest) for (let row = 18; row <= 20; row += 1) for (let column = 0; column < nx; column += 1) h[row * nx + column] = row === 20 ? deep + 0.9 : deep + 0.9 * (row - 17) / 3;
    return {
      solver: {
        nx, nz, dx: 1, restLevel: 0,
        xCenters: Array.from({ length: nx }, (_, i) => i + 0.5),
        zCenters: Array.from({ length: nz }, (_, i) => i + 0.5),
        dz: new Float64Array(nz).fill(1),
        h, bed: h.map((depth, i) => (crest && i >= 18 * nx && i < 21 * nx ? -deep : -depth)), qx: new Float64Array(nx * nz), qz: new Float64Array(nx * nz),
        cellIndex: (x, z) => Math.min(nz - 1, Math.max(0, Math.floor(z))) * nx + Math.min(nx - 1, Math.max(0, Math.floor(x))),
      },
      foam: { source: new Float64Array(nx * nz) },
      lipImpacts: [],
      windSpeed,
      lipCrests,
    };
  }

  /** `count` drawn crests a metre apart along x from 0.5, `reach` m of crest each, their apexes `y` m up at z = 20.5. */
  function crestsAt(count: number, y = 1.5, reach = 1): LipCrests {
    const crests = createLipCrests(count);
    for (let c = 0; c < count; c += 1) crests.data.set([c + 0.5, y, 20.5, reach], c * LIP_CREST_STRIDE);
    crests.count = count;
    return crests;
  }

  /** Steps a cloud `seconds` long, and says which crests, by their x, a particle was born beside (the new particles of each step). */
  function bornBeside(cloud: SprayCloud, scene: () => SprayScene, seconds: number): { crests: Set<number>; count: number } {
    const crests = new Set<number>();
    let count = 0;
    for (let step = 0; step < Math.round(seconds * 60); step += 1) {
      const before = cloud.count;
      cloud.update(scene(), 1 / 60);
      for (let k = before; k < cloud.count; k += 1) {
        crests.add(Math.round(cloud.particles[k * SPRAY_STRIDE] - 0.5));
        count += 1;
      }
    }
    return { crests, count };
  }

  it('starts on the wind relative to the crest: the offshore wind plus its own speed √(g d)', () => {
    expect(relativeWind(-5, 3)).toBeCloseTo(5 + Math.sqrt(9.81 * 3), 6);
    // A crest running through still air has its own speed as the wind (Veron: “the phase speed of the wave may be sufficient”).
    expect(relativeWind(0, 4)).toBeCloseTo(Math.sqrt(9.81 * 4), 6);
    // An onshore wind blows with the crest, and takes from it.
    expect(relativeWind(3, 4)).toBeCloseTo(Math.sqrt(9.81 * 4) - 3, 6);
    expect(relativeWind(-5, -1)).toBe(5);
  });

  it('has no strength under 7 m/s and all of it from 11, rising between (Veron 2015; Troitskaya et al. 2017)', () => {
    expect(VEIL_ONSET).toEqual({ low: 7, high: 11 });
    expect(veilStrength(6.99)).toBe(0);
    expect(veilStrength(-4)).toBe(0);
    expect(veilStrength(9)).toBeCloseTo(0.5, 9);
    expect(veilStrength(11)).toBe(1);
    expect(veilStrength(14)).toBe(1);
    expect(veilRate(6.99)).toBe(0);
    expect(veilRate(9)).toBeGreaterThan(0);
    expect(veilRate(13)).toBeGreaterThan(veilRate(11));
  });

  it('blows off a crest the wind alone would not: 3 m/s offshore is under the old 4 m/s onset, but with the crest’s 5.3 m/s it is 8.3', () => {
    const veiled = new SprayCloud(60);
    const calm = new SprayCloud(60);
    for (let step = 0; step < 180; step += 1) {
      veiled.update(sea(-3, 2, 2, 10, undefined, true), 1 / 60);
      calm.update(sea(-1, 2, 2, 10, undefined, true), 1 / 60);
    }
    // Over a 2.9 m crest √(g d) is 5.3: 3 + 5.3 is over the onset, 1 + 5.3 = 6.3 is under it.
    expect(veiled.count).toBeGreaterThan(5);
    expect(calm.count).toBe(0);
  });

  it('sheds a veil from the drawn crest of every open slice within a second where the relative wind is over the onset, and from none under it', () => {
    // Padang Padang's sourced offshore wind, 5 m/s (SurfConditions), with 2 m of water under the first five crests (relative 9.4
    // m/s) and 0.3 m under the rest (5 + 1.7 = 6.7 m/s, under the onset).
    const cloud = new SprayCloud(61);
    const { crests, count } = bornBeside(cloud, () => sea(-5, 2, 0.3, 5, crestsAt(10)), 1);
    expect(count).toBeGreaterThan(0);
    expect([...crests].some((c) => c >= 5)).toBe(false);
    expect([0, 1, 2, 3, 4].filter((c) => crests.has(c)).length).toBeGreaterThanOrEqual(3);
  });

  it('comes off at least half of 40 open slices within a second, at Padang Padang’s wind over 3 m of water', () => {
    const cloud = new SprayCloud(62);
    const { crests } = bornBeside(cloud, () => sea(-5, 3, 3, 10, crestsAt(40)), 1);
    expect(crests.size).toBeGreaterThanOrEqual(20);
  });

  it('launches it seaward and up off the crest’s top, and the air up the crest’s face carries it a metre or more above the lip', () => {
    const cloud = new SprayCloud(63);
    const crests = crestsAt(20, 1.5);
    let highest = 0;
    let seaward = 0;
    let rising = 0;
    for (let step = 0; step < 120; step += 1) {
      const before = cloud.count;
      cloud.update(sea(-5, 3, 3, 10, crests), 1 / 60);
      for (let k = before; k < cloud.count; k += 1) {
        // Born seaward (−z) and up, at the crest's top.
        if (cloud.particles[k * SPRAY_STRIDE + 8] < 0) seaward += 1;
        if (cloud.particles[k * SPRAY_STRIDE + 7] > 0) rising += 1;
        expect(cloud.particles[k * SPRAY_STRIDE + 1]).toBeGreaterThanOrEqual(1.5);
        expect(cloud.particles[k * SPRAY_STRIDE + 1]).toBeLessThan(1.7);
      }
      for (let k = 0; k < cloud.count; k += 1) highest = Math.max(highest, cloud.particles[k * SPRAY_STRIDE + 1]);
    }
    expect(seaward).toBeGreaterThan(30);
    expect(rising).toBe(seaward);
    expect(highest).toBeGreaterThan(1.5 + 1);
  });

  it('is mist of 0.1 mm drops, a cluster’s water cut into faint particles: a thirtieth on the drawn lip, a third on the solver’s crests', () => {
    // Faint one by one (τ = 1.5 w / r, Bohren 1987), so that many overlap into a haze and none stands as a puff.
    const medianTau = (cloud: SprayCloud) => {
      const taus: number[] = [];
      for (let k = 0; k < cloud.count; k += 1) {
        expect(cloud.particles[k * SPRAY_STRIDE + 5]).toBe(1);
        taus.push(cloud.particles[k * SPRAY_STRIDE + 9]);
      }
      expect(taus.length).toBeGreaterThan(20);
      return taus.sort((a, b) => a - b)[Math.floor(taus.length / 2)];
    };
    const lip = new SprayCloud(64);
    const crest = new SprayCloud(64);
    for (let step = 0; step < 40; step += 1) {
      lip.update(sea(-5, 3, 3, 10, crestsAt(20)), 1 / 60);
      crest.update(sea(-5, 3, 3, 10, undefined, true), 1 / 60);
    }
    const lipTau = medianTau(lip);
    const crestTau = medianTau(crest);
    expect(VEIL_SPLIT).toEqual({ lip: 30, crest: 3 });
    expect(lipTau).toBeGreaterThan(0.015);
    expect(lipTau).toBeLessThan(0.2);
    expect(crestTau).toBeGreaterThan(0.15);
    expect(crestTau).toBeLessThan(1.2);
    // Ten times the water in each of the crest's, as the lip's is cut ten times finer.
    expect(crestTau / lipTau).toBeGreaterThan(6);
    expect(crestTau / lipTau).toBeLessThan(16);
    expect(VEIL_RADIUS).toBe(1e-4);
  });

  it('sheds from at least half the open slices in any one step, so that the lip is a continuous filament and not a scatter of puffs', () => {
    // 40 crests, half a metre of crest each (a slice's spacing along a front), over 3 m of water at Padang Padang's wind:
    // relative 10.4 m/s.
    let sheds = 0;
    for (let seed = 0; seed < 5; seed += 1) {
      const cloud = new SprayCloud(70 + seed);
      cloud.update(sea(-5, 3, 3, 10, crestsAt(40, 1.5, 0.5)), 1 / 60);
      sheds += new Set(Array.from({ length: cloud.count }, (_, k) => Math.round(cloud.particles[k * SPRAY_STRIDE] - 0.5))).size;
    }
    expect(sheds / 5).toBeGreaterThanOrEqual(20);
  });

  it('leaves the solver’s crest cells to the drawn crest where one is drawn', () => {
    // The face's cells (rows 18–20) would shed on their own; crests drawn over them, with next to no crest of their own, take over.
    const alone = new SprayCloud(65);
    const covered = new SprayCloud(65);
    const drawn = createLipCrests(3);
    for (let c = 0; c < 3; c += 1) drawn.data.set([1.5 + 3 * c, 1.5, 19.5, 0.01], c * LIP_CREST_STRIDE);
    drawn.count = 3;
    for (let step = 0; step < 90; step += 1) {
      alone.update(sea(-5, 2, 2, 10, undefined, true), 1 / 60);
      covered.update(sea(-5, 2, 2, 10, drawn, true), 1 / 60);
    }
    expect(alone.count).toBeGreaterThan(20);
    expect(covered.count).toBeLessThan(0.2 * alone.count);
  });

  it('has a room of its own in the pool, a fifth of it and a tenth off the solver’s crests, and an impact’s spray keeps the rest however much veil there is', () => {
    const drawn = new SprayCloud(66, 100, 0);
    for (let step = 0; step < 240; step += 1) drawn.update(sea(-5, 3, 3, 10, crestsAt(40)), 1 / 60);
    expect(drawn.veilCount).toBe(drawn.count);
    expect(drawn.veilCount).toBeLessThanOrEqual(20);
    expect(drawn.veilCount).toBeGreaterThan(17);
    const before = drawn.count;
    drawn.update({ ...sea(-5, 3, 3, 10, crestsAt(40)), lipImpacts: [{ x: 5, z: 20, volume: 0.4, vx: 0, vy: -5, vz: 5 }] }, 1 / 60);
    expect(drawn.count - before).toBeGreaterThan(50);
    const solver = new SprayCloud(66, 100, 0);
    for (let step = 0; step < 600; step += 1) solver.update(sea(-9, 2, 2, 10, undefined, true), 1 / 60);
    expect(solver.veilCount).toBeLessThanOrEqual(10);
    expect(solver.veilCount).toBeGreaterThan(8);
  });

  it('does not breathe with the impacts: as much veil with spray filling over half the pool as with none', () => {
    const veilAfter = (lipImpacts: LipImpact[]) => {
      const cloud = new SprayCloud(72, 1000, 0);
      for (let step = 0; step < 600; step += 1) cloud.update({ ...sea(-9, 2, 2, 10, undefined, true), lipImpacts }, 1 / 60);
      return { veil: cloud.veilCount, others: cloud.count - cloud.veilCount };
    };
    const quiet = veilAfter([]);
    const busy = veilAfter([{ x: 5, z: 30, volume: 0.22, vx: 0, vy: -2, vz: 2 }]);
    expect(quiet.others).toBe(0);
    expect(busy.others).toBeGreaterThan(500);
    expect(busy.others + busy.veil).toBeLessThan(900);
    expect(quiet.veil).toBeGreaterThan(80);
    expect(Math.abs(busy.veil - quiet.veil)).toBeLessThanOrEqual(0.15 * quiet.veil);
  });

  it('eases off over the last quarter of its room, and serves every cell of the crest alike while it does, not the first it reaches', () => {
    // A pool of 1,000 the veil fills to the 100 it may take off the crests, in a wind that gives the crest all its strength
    // (13.4 m/s relative): once it is full the room it gets back is far less each step than the crest asks for.
    const cloud = new SprayCloud(71, 1000, 0);
    const ages = (cloud as unknown as { age: Float64Array }).age;
    const cells = new Map<number, number>();
    let veil = 0;
    for (let step = 0; step < 900; step += 1) {
      cloud.update(sea(-9, 2, 2, 10, undefined, true), 1 / 60);
      if (step < 300) continue;
      // Born this step: the ones with no age yet.
      for (let k = 0; k < cloud.count; k += 1) {
        if (ages[k] !== 0) continue;
        const cell = Math.floor(cloud.particles[k * SPRAY_STRIDE + 2]) * 10 + Math.floor(cloud.particles[k * SPRAY_STRIDE]);
        cells.set(cell, (cells.get(cell) ?? 0) + 1);
        veil += 1;
      }
    }
    expect(cloud.count).toBeLessThanOrEqual(100);
    expect(cloud.count).toBeGreaterThan(80);
    expect(veil).toBeGreaterThan(100);
    expect(cells.size).toBeGreaterThanOrEqual(8);
    expect(Math.max(...cells.values()) / veil).toBeLessThan(0.25);
  });

  it('is Rich’s alone: Classic keeps feathering as it was, drawn crests or none', () => {
    const plain = new SprayCloud(67);
    const drawn = new SprayCloud(67);
    plain.look = 'classic';
    drawn.look = 'classic';
    for (let step = 0; step < 120; step += 1) {
      plain.update(sea(-9, 2, 2, 10, undefined, true), 1 / 60);
      drawn.update(sea(-9, 2, 2, 10, crestsAt(10), true), 1 / 60);
    }
    expect(plain.count).toBeGreaterThan(10);
    expect(Array.from(drawn.particles.subarray(0, drawn.count * SPRAY_STRIDE))).toEqual(Array.from(plain.particles.subarray(0, plain.count * SPRAY_STRIDE)));
    // And Classic feathers only on the absolute onset: 3 m/s offshore sheds nothing, crest or no crest.
    const quiet = new SprayCloud(68);
    quiet.look = 'classic';
    for (let step = 0; step < 90; step += 1) quiet.update(sea(-3, 2, 2, 10, undefined, true), 1 / 60);
    expect(quiet.count).toBe(0);
  });

  it('sheds nothing in calm air or an onshore wind, and replays a seed exactly', () => {
    for (const wind of [0, 4]) {
      const cloud = new SprayCloud(69);
      for (let step = 0; step < 60; step += 1) cloud.update(sea(wind, 3, 3, 10, crestsAt(20), true), 1 / 60);
      expect(cloud.count).toBe(0);
    }
    const a = new SprayCloud(70);
    const b = new SprayCloud(70);
    for (let step = 0; step < 60; step += 1) {
      a.update(sea(-5, 3, 3, 10, crestsAt(20)), 1 / 60);
      b.update(sea(-5, 3, 3, 10, crestsAt(20)), 1 / 60);
    }
    expect(Array.from(a.particles.subarray(0, a.count * SPRAY_STRIDE))).toEqual(Array.from(b.particles.subarray(0, b.count * SPRAY_STRIDE)));
  });

  it('writes a swept loft’s open slices as drawn crests: where their apexes stand and the crest each stands for', () => {
    const slices = 7;
    const positions = new Float32Array(3 * slices * LOFT_SAMPLES);
    for (let s = 0; s < slices; s += 1) {
      const v = 3 * (s * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.crest);
      positions.set([10 + s, 2 + s / 10, 30 - s], v);
    }
    const loft = {
      positions, sliceCount: slices,
      // before the throw, three open (the middle one only half formed), after touchdown, open on another front.
      slicePhase: Uint8Array.from([0, 1, 1, 1, 2, 1, 1]),
      sliceWeight: Float32Array.from([1, 1, 0.7, 0.3, 1, 1, 0.5]),
      sliceFront: Int32Array.from([0, 0, 0, 0, 0, 1, 1]),
      sliceSigma: Float32Array.from([0, 0.5, 1, 1.5, 2, 0, 0.5]),
    };
    const out = writeLipCrests(loft, createLipCrests(8));
    // Slices 1 and 2 (open and at least half there) and 5 and 6 (open, on their own front).
    expect(out.count).toBe(4);
    const record = (n: number) => Array.from(out.data.subarray(n * LIP_CREST_STRIDE, (n + 1) * LIP_CREST_STRIDE)).map((v) => +v.toFixed(4));
    // Slice 1 has neighbours at σ 0 and 1: half the way to each is 0.5 m of crest.
    expect(record(0)).toEqual([11, 2.1, 29, 0.5]);
    expect(record(1)).toEqual([12, 2.2, 28, 0.5]);
    // Slice 5 starts its front: only the neighbour after it, 0.5 m on, so 0.5 m of crest; slice 6 ends it: the same.
    expect(record(2)).toEqual([15, 2.5, 25, 0.5]);
    expect(record(3)).toEqual([16, 2.6, 24, 0.5]);
    // As many as fit.
    expect(writeLipCrests(loft, createLipCrests(3)).count).toBe(3);
  });
});

describe('the decided 16k spray pool', () => {
  const burst: LipImpact = { x: 5, z: 20, volume: 1, vx: 0, vy: -10, vz: 6 };

  it('is 16,384 places for the Rich look, and Classic keeps the 4,096 it had', () => {
    expect(SPRAY_CAPACITY).toBe(16384);
    expect(CLASSIC_SPRAY_CAPACITY).toBe(4096);
    for (const look of ['classic', 'rich'] as const) {
      const cloud = new SprayCloud(80);
      cloud.look = look;
      for (let step = 0; step < 4; step += 1) cloud.update(flatScene(0, [burst]), 1 / 60);
      // Each such landing is 2,500 particles at the lip splash's rate: the Rich look holds all of four, Classic stops at its pool.
      if (look === 'classic') expect(cloud.count).toBe(CLASSIC_SPRAY_CAPACITY);
      else expect(cloud.count).toBeGreaterThan(2 * CLASSIC_SPRAY_CAPACITY);
    }
  });

  it('never gives the Rich look more than the pool, nor a smaller pool than it was built with', () => {
    const cloud = new SprayCloud(81, 300);
    for (const look of ['classic', 'rich'] as const) {
      cloud.look = look;
      cloud.clear();
      cloud.update(flatScene(0, [burst]), 1 / 60);
      expect(cloud.count).toBe(300);
    }
  });
});
