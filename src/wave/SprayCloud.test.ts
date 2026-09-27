import { describe, expect, it } from 'vitest';
import { FOAM_BALL_VOLUME, SPRAY_PER_AIR, SPRAY_STRIDE, SprayCloud, splashLaunch, type LipImpact, type SprayScene, type StrokeSplash } from './SprayCloud';
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

  it('packs each particle’s kind after its opacity: spray 0, mist 1, foam ball 2', () => {
    expect(SPRAY_STRIDE).toBe(6);
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
