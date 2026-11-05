import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BoardBody } from '../../physics/BoardBody';
import { createPatchForce, patchForce } from '../../physics/hullForces';
import { PhysicalSurfWater, WALL_WATER, wallWaterFlow } from '../../physics/PhysicalSurfWater';
import { createWaterSample, type SurfWater, type WaterSample } from '../../physics/SurfWater';
import { ShallowWaterSolver, uniformEdges } from '../ShallowWaterSolver';
import type { FrontPoint } from './BreakingFront';
import { ANCHOR_CONTINUITY, ANCHOR_TRACK, FaceAnchor, readNoise, trackAnchor, trackGains, TROUGH, tubeFaceOf, type AnchorTrack, type TroughWave, type TubeFace } from './faceAnchor';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { ProfileLibrary } from './ProfileLibrary';
import { advanceClocks, throwContourDistance, type OnsetTiming } from './sliceClock';
import { createContactHit, SweptContact } from './sweptContact';
import { SweptLoft } from './sweptLoft';
import { lipCase } from './toyCase';

/**
 * Ruling 3 (pool-tube-track, 2026-11-05; the water-physics advisor's docs/research/pool-tube-contact-2026-11-05/
 * advisor-ruling-3.md): the smooth wall (the solver's trough within half a wavelength, the α–β tracker, its rate the wall
 * water's, the blend across the solver's surface), the water's acceleration on the added mass in the wall water, no retire
 * of contour-thrown lips, the buoyancy along the true normal past the clamp, and the drop rule. Each piece's switch.
 */
const face = (over: Partial<TubeFace>): TubeFace => ({
  anchor: false, union: false, lag: false, clockRate: 2, thrownEnds: false, continuity: false, distance: false, contour: false, wallFlow: false,
  contact: false, cap: false, merge: false, guard: false, track: false, inertia: false, retire: false, buoy: false, drop: false, ...over,
});

describe('ruling 3: the switches', () => {
  it('turns each piece off by its own switch, all five old the build before it, each with what it builds on', () => {
    const all = tubeFaceOf(true, {})!;
    expect(all).toMatchObject({ track: true, inertia: true, retire: true, buoy: true, drop: true });
    expect(tubeFaceOf(true, { tubeTrack: 'old' })).toEqual({ ...all, track: false });
    expect(tubeFaceOf(true, { tubeInertia: 'old' })).toEqual({ ...all, inertia: false });
    expect(tubeFaceOf(true, { tubeRetire: 'old' })).toEqual({ ...all, retire: false });
    expect(tubeFaceOf(true, { tubeBuoy: 'old' })).toEqual({ ...all, buoy: false });
    expect(tubeFaceOf(true, { tubeDrop: 'old' })).toEqual({ ...all, drop: false });
    const before = { ...all, track: false, inertia: false, retire: false, buoy: false, drop: false };
    expect(tubeFaceOf(true, { tubeTrack: 'old', tubeInertia: 'old', tubeRetire: 'old', tubeBuoy: 'old', tubeDrop: 'old' })).toEqual(before);
    // The tracker with the continuity; the inertia and the buoyancy with the wall water; no retire with the contour throw.
    expect(tubeFaceOf(true, { tubeAnchor: 'old' })).toMatchObject({ track: false });
    expect(tubeFaceOf(true, { wallFlow: 'old' })).toMatchObject({ inertia: false, buoy: false, track: true });
    expect(tubeFaceOf(true, { tubeThrow: 'break' })).toMatchObject({ retire: false });
    expect(tubeFaceOf(true, { tubeFrom: 'piece' })).toMatchObject({ track: false, inertia: false, retire: false, buoy: false, drop: false });
    expect(tubeFaceOf(false, {})).toBeUndefined();
  });
});

describe('ruling 3: the smooth wall', () => {
  it('takes Kalata\'s α–β gains from the tracking index', () => {
    const out = new Float64Array(2);
    for (const [w, v] of [[0.3, 0.01], [0.5, 0.01], [1, 0.005]]) {
      const dt = 1 / 60;
      trackGains(dt, out, w, v);
      const [alpha, beta] = out;
      const lambda = (w * dt * dt) / v;
      // The steady-state Kalman filter's relations: λ² = β²/(1 − α), and β = 2(2 − α) − 4√(1 − α).
      expect(beta * beta / (1 - alpha)).toBeCloseTo(lambda * lambda, 12);
      expect(beta).toBeCloseTo(2 * (2 - alpha) - 4 * Math.sqrt(1 - alpha), 12);
      expect(alpha).toBeGreaterThan(0);
      expect(alpha).toBeLessThan(1);
    }
    expect(ANCHOR_TRACK.sigmaW).toBeGreaterThanOrEqual(0.3);
    expect(ANCHOR_TRACK.sigmaW).toBeLessThanOrEqual(1);
  });

  /** A point stepping 1 m rows along its ray while W, its case's crest's place, moves at `speed` with noise `noise` (m). */
  function run(speed: number, noise: number, steps: number, outlier?: number) {
    const dt = 1 / 60;
    const track: AnchorTrack = {};
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const kept: number[] = [];
    const rates: number[] = [];
    for (let n = 0; n < steps; n += 1) {
      const time = n * dt;
      const truth = 2 + speed * time;
      // The point is its crest cell's centre: it steps 1 m rows behind the wave.
      const s = Math.floor(truth - 1.5);
      const gauss = (random() + random() + random() + random() - 2) * Math.sqrt(3);
      const read = truth - s + noise * gauss + (n === outlier ? 0.5 : 0);
      const shift = trackAnchor(track, read, time, 5, 0, s, 0, 1);
      kept.push(s + shift);
      rates.push(track.anchorRate!);
    }
    return { kept, rates, track };
  }

  it('tracks W through the point\'s row steps, its jitter far under the read\'s and its rate the wave\'s', () => {
    const { kept, rates } = run(5.5, 0.01, 600);
    const dt = 1 / 60;
    const jitter: number[] = [];
    for (let n = 302; n < kept.length; n += 1) jitter.push(Math.abs(kept[n] - 2 * kept[n - 1] + kept[n - 2]));
    jitter.sort((a, b) => a - b);
    // The read's own second difference is about √6 σ_v = 0.025 m; the track's p99 within the advisor's 0.005–0.008 m.
    expect(jitter[Math.floor(0.99 * jitter.length)]).toBeLessThan(0.008);
    expect(rates.at(-1)!).toBeGreaterThan(5.3);
    expect(rates.at(-1)!).toBeLessThan(5.7);
    // In place: within a few read noises of the truth.
    expect(Math.abs(kept.at(-1)! - (2 + 5.5 * 599 * dt))).toBeLessThan(0.03);
  });

  it('holds a reading outside the gate as a miss, W running on at its rate, and takes the reads again after the hold', () => {
    const quiet = run(5, 0, 200);
    const jumped = run(5, 0, 200, 150);
    const dt = 1 / 60;
    // A 0.5 m jump in one read is outside (0.45 C + 0.3) Δt: held, W on at its rate.
    expect(Math.abs(jumped.kept[150] - quiet.kept[150])).toBeLessThan(1e-9);
    expect(jumped.kept[150] - jumped.kept[149]).toBeCloseTo(5 * dt, 6);
    // A reading off for longer than the hold is taken again (the track never locks out).
    const track: AnchorTrack = {};
    for (let n = 0; n < 10; n += 1) trackAnchor(track, 2, n * dt, 5, 0, 5 * n * dt, 0, 1);
    const outcomes: string[] = [];
    let shift = 0;
    for (let n = 10; n < 10 + Math.ceil(ANCHOR_CONTINUITY.hold / dt) + 600; n += 1) {
      shift = trackAnchor(track, 3, n * dt, 5, 0, 5 * n * dt, 0, 1);
      outcomes.push(track.anchorLast!);
    }
    expect(outcomes.slice(0, Math.floor(ANCHOR_CONTINUITY.hold / dt)).every((o) => o === 'gated')).toBe(true);
    expect(outcomes).toContain('reacquired');
    // Taken again until the reads fall inside the gate, then kept; the track settles on the new place smoothly.
    expect(outcomes.at(-1)).toBe('kept');
    expect(shift).toBeCloseTo(3, 1);
  });

  it('runs a miss on at the tracked rate, never back to the crest anchor once faced', () => {
    const dt = 1 / 60;
    const track: AnchorTrack = {};
    expect(trackAnchor(track, Number.NaN, 0, 5, 0, 0, 0, 1)).toBeNaN();
    expect(track.anchorLast).toBe('crest');
    // Faced: eased from the crest anchor, at the wave's advance.
    trackAnchor(track, 1, dt, 5, 0, 0, 0, 1);
    expect(track.anchorLast).toBe('eased');
    expect(track.anchorRate).toBe(5);
    const before = track.anchorShift!;
    const shift = trackAnchor(track, Number.NaN, 2 * dt, 5, 0, 0.3, 0, 1);
    expect(track.anchorLast).toBe('held');
    expect(shift).toBeCloseTo(before + 5 * dt - 0.3, 12);
    // The read's noise grows as the face flattens past `steep`.
    expect(readNoise(0.5)).toBe(ANCHOR_TRACK.sigmaV);
    expect(readNoise(ANCHOR_TRACK.steep / 2)).toBeCloseTo(2 * ANCHOR_TRACK.sigmaV, 12);
    expect(readNoise(Number.NaN)).toBeCloseTo(10 * ANCHOR_TRACK.sigmaV, 12);
  });

  /** A smooth wave along +z: crest at z = c, its front falling to a trough 15 m ahead, its back rising behind. */
  const wave = (c: number) => (_x: number, z: number) => {
    const u = z - c;
    if (u < -15) return 0;
    if (u < 0) return 1.2 * 0.5 * (1 + Math.cos((Math.PI * u) / 15));
    if (u < 15) return -0.3 + 1.5 * 0.5 * (1 + Math.cos((Math.PI * u) / 15));
    return -0.3;
  };

  it('reads the solver\'s trough within half a wavelength of its crest, so its crossing moves with the wave, not the point', () => {
    const anchor = new FaceAnchor(new ProfileLibrary([lipCase(0.3, 0.04)]), 0.05);
    const read = (anchor as unknown as { solverCrossing(x: number, z: number, nx: number, nz: number, h: number, f: (x: number, z: number) => number, w?: TroughWave, reach?: number): number }).solverCrossing.bind(anchor);
    const sea: TroughWave = { period: 10, depthAt: () => 1.6 };
    const placesNew: number[] = [];
    const placesOld: number[] = [];
    for (let k = 0; k < 120; k += 1) {
      const c = 0.05 * k;
      // The point: its crest cell's centre, stepping 1 m rows.
      const point = Math.round(c);
      placesNew.push(point + read(0, point, 0, 1, 1.2, wave(c), sea) - c);
      placesOld.push(point + read(0, point, 0, 1, 1.2, wave(c)) - c);
    }
    // In the wave's frame the crossing stands still with the new read, to within the parabola's and the reads' interpolation.
    const spread = (v: number[]) => Math.max(...v) - Math.min(...v);
    expect(spread(placesNew)).toBeLessThan(0.02);
    // The old read's trough is its window's end (3 H ahead of the point), so its crossing moves with the point's rows.
    expect(spread(placesOld)).toBeGreaterThan(5 * spread(placesNew));
    // The 0.3 level of the true crest (1.2 m) over the true trough (−0.3 m): 0.15 m, at z = c + 15/π acos(...).
    const exact = (15 / Math.PI) * Math.acos(2 * ((0.15 + 0.3) / 1.5) - 1);
    expect(placesNew[0]).toBeCloseTo(exact, 1);
    expect(TROUGH.coarse).toBe(1);
    // No further than the case's own profile reaches ahead of its crest (its trough measured alike): at 6 m, the level is
    // 0.3 of the crest over the water 6 m ahead (box-averaged over ±0.5 m), so the crossing stands higher up the face.
    const capped = read(0, 0, 0, 1, 1.2, wave(0), sea, 6);
    const lowAt = (u: number) => (wave(0)(0, u - 0.5) + wave(0)(0, u) + wave(0)(0, u + 0.5)) / 3;
    const level = lowAt(6) + 0.3 * (1.2 - lowAt(6));
    expect(wave(0)(0, capped)).toBeCloseTo(level, 2);
    expect(capped).toBeLessThan(placesNew[0]);
  });
});

describe('ruling 3: the wall water', () => {
  it('blends into the solver\'s flow by the wall\'s height over the solver\'s surface (`share`)', () => {
    const base = createContactHit();
    Object.assign(base, {
      normalX: 0, normalY: 0.3, normalZ: 0.95, tangentX: 1, tangentZ: 0, wallAlong: 6, wallUp: 3, wallLow: 0, wallTop: 2, wallSpeed: 6,
      wallB: 1, wallWeight: 1,
    });
    const solver = { flowX: 0.2, flowY: 0.4, flowZ: 1.5 };
    const at = (share?: number) => {
      const out = { ...solver };
      if (share === undefined) wallWaterFlow(out, 1, base);
      else wallWaterFlow(out, 1, base, share);
      return out;
    };
    const full = at();
    expect(at(1)).toEqual(full);
    expect(at(0)).toEqual(solver);
    expect(WALL_WATER.facing).toEqual([0.5, 0.8]);
    const half = at(0.5);
    for (const key of ['flowX', 'flowY', 'flowZ'] as const) expect(half[key]).toBeCloseTo(0.5 * (solver[key] + full[key]), 12);
    expect(WALL_WATER.blend).toBe(0.25);
  });

  const STILL = 0.5;
  const H0 = 7;
  function records(n: number, tau: number): Float32Array {
    const out = new Float32Array(n * FRONT_STRIDE);
    for (let k = 0; k < n; k += 1) {
      const o = k * FRONT_STRIDE;
      out[o + FRONT_FIELD.x] = k + 0.5; out[o + FRONT_FIELD.z] = -100; out[o + FRONT_FIELD.front] = 1; out[o + FRONT_FIELD.sigma] = k;
      out[o + FRONT_FIELD.tau] = tau; out[o + FRONT_FIELD.footHeight] = 2.1; out[o + FRONT_FIELD.footDepth] = H0;
      out[o + FRONT_FIELD.throwZ] = tau >= 0 ? -100 : Number.NaN;
      for (const f of [FRONT_FIELD.pace, FRONT_FIELD.anchor, FRONT_FIELD.crestSpeed, FRONT_FIELD.tauRate]) out[o + f] = Number.NaN;
    }
    return out;
  }
  const waters = () => {
    const solver = new ShallowWaterSolver({ nx: 48, xMin: -12, dx: 1, zEdges: uniformEdges(-130, -70, 60) }, () => H0, { waterLevel: STILL });
    for (let i = 0; i < solver.qz.length; i += 1) solver.qz[i] = 1.2 * solver.h[i];
    const contact = new SweptContact(new ProfileLibrary([lipCase(0.3, 0.04)]), 0.05, { face: face({ union: true, wallFlow: true, contact: true }) });
    contact.update(records(21, -0.3), 21, STILL, () => STILL);
    const options = { peakPeriod: 18, nodeSpacing: 2, swept: contact, sweptUnion: true, sweptWall: true, sweptNearest: true };
    return {
      contact,
      old: new PhysicalSurfWater(solver, options),
      blended: new PhysicalSurfWater(solver, { ...options, sweptBlend: true }),
      marked: new PhysicalSurfWater(solver, { ...options, sweptInertia: true, sweptBuoy: true }),
      solverFlow: new PhysicalSurfWater(solver, { ...options, sweptWall: false }),
    };
  };

  it('gives the wall water whole where the wall stands 0.25 m or more over the solver\'s surface, and the solver\'s flow where it meets it', () => {
    const { contact, old, blended, solverFlow } = waters();
    const a = createWaterSample();
    const b = createWaterSample();
    const c = createWaterSample();
    const hit = createContactHit();
    let whole = 0;
    let between = 0;
    for (let z = -104; z <= -96; z += 0.05) {
      for (let y = STILL - 0.5; y <= STILL + 3; y += 0.05) {
        old.sampleAt(10.25, y, z, a);
        const wall = (old as unknown as { inWall: boolean }).inWall;
        blended.sampleAt(10.25, y, z, b);
        contact.query(10.25, y, z, hit);
        const height = hit.surfaceY - STILL;
        if (!wall || height >= WALL_WATER.blend || !(hit.wallWeight > 0)) {
          // Outside the wall, or where it stands a band or more over the solver's surface: as before.
          expect(b.flowZ).toBe(a.flowZ);
          expect(b.flowY).toBe(a.flowY);
          if (wall && hit.wallWeight > 0) whole += 1;
        } else {
          // Between the solver's and the wall water's, the nearer the solver's the thinner the wall.
          solverFlow.sampleAt(10.25, y, z, c);
          for (const key of ['flowX', 'flowY', 'flowZ'] as const) {
            expect(Math.min(c[key], a[key]) - 1e-9).toBeLessThanOrEqual(b[key]);
            expect(b[key]).toBeLessThanOrEqual(Math.max(c[key], a[key]) + 1e-9);
          }
          between += 1;
        }
      }
    }
    expect(whole).toBeGreaterThan(20);
    expect(between).toBeGreaterThan(0);
  });

  it('marks the wall water alone for the hull (`wallWater`, `buoyancyNormal`), and nothing without the switches', () => {
    const { contact, old, marked } = waters();
    const a = createWaterSample();
    const b = createWaterSample();
    const hit = createContactHit();
    let wall = 0;
    let steep = 0;
    for (let z = -104; z <= -96; z += 0.1) {
      for (let y = STILL - 0.5; y <= STILL + 3; y += 0.1) {
        marked.sampleAt(10.25, y, z, b);
        old.sampleAt(10.25, y, z, a);
        expect(a.wallWater).toBeUndefined();
        expect(a.buoyancyNormal).toBeUndefined();
        const inWall = (marked as unknown as { inWall: boolean }).inWall;
        expect(b.wallWater === true).toBe(inWall);
        if (inWall) wall += 1;
        if (b.buoyancyNormal !== undefined) {
          expect(inWall).toBe(true);
          expect(b.normalY).toBeLessThan(0.5);
          expect(b.buoyancyNormal).toBe(2);
          steep += 1;
        }
        // The flow and surface are the same: the marks change nothing else.
        expect(b.flowZ).toBe(a.flowZ);
        expect(b.surfaceY).toBe(a.surfaceY);
        contact.query(10.25, y, z, hit);
      }
    }
    expect(wall).toBeGreaterThan(20);
    expect(steep).toBeGreaterThan(0);
  });
});

describe('ruling 3: the water\'s acceleration on the added mass, in the wall water', () => {
  /** A flat sea whose surface rises from rest at `a` m/s² (its water with it), in the wall water or not. */
  const rising = (a: number, wall: boolean) => {
    let time = 0;
    let offset = 0;
    const at = () => time + offset;
    const water: SurfWater & { advance(dt: number): void } = {
      sampleAt(_x: number, y: number, _z: number, out: WaterSample): WaterSample {
        const t = at();
        out.surfaceY = 0.5 * a * t * t;
        out.wet = true;
        out.outsideDomain = false;
        out.waterDepth = 10;
        out.stillDepth = 10;
        out.bedY = -10;
        out.slopeX = 0;
        out.slopeZ = 0;
        out.normalX = 0;
        out.normalY = 1;
        out.normalZ = 0;
        out.flowX = 0;
        out.flowY = y <= out.surfaceY ? a * t : 0;
        out.flowZ = 0;
        out.regime = 'profile';
        out.breaking = 0;
        out.wallWater = wall ? true : undefined;
        return out;
      },
      surfaceAt: () => 0.5 * a * at() * at(),
      addReaction: () => {},
      setSampleTime: (o: number) => {
        offset = o;
      },
      advance(dt: number) {
        time += dt;
      },
    };
    return water;
  };

  const settle = () => {
    const board = new BoardBody();
    const water = rising(0, false);
    board.place(new Vector3(0, board.shape.centerOfMass.y - 0.005, 0), new Quaternion(), new Vector3());
    for (let n = 0; n < 240; n += 1) board.step(1 / 60, water);
    return board;
  };

  it('carries a board up with its water where the water accelerates, and only in the wall water', () => {
    const depthAfter = (wall: boolean) => {
      const board = settle();
      const start = board.position.y - board.shape.centerOfMass.y;
      const water = rising(9.81, wall);
      for (let n = 0; n < 24; n += 1) {
        water.advance(1 / 60);
        board.step(1 / 60, water);
      }
      // How much deeper its bottom lies under the surface than at rest, m.
      return water.surfaceAt(0, 0) - (board.position.y - board.shape.centerOfMass.y) + start;
    };
    const without = depthAfter(false);
    const withIt = depthAfter(true);
    // The advisor's 1D heave model: 0.33 m buried over 0.4 s at 1 g without the term; with it the board stays near its draft.
    expect(without).toBeGreaterThan(0.1);
    expect(withIt).toBeLessThan(0.5 * without);
  });

  it('smooths the water\'s acceleration over about three steps and caps it at 5 g', () => {
    const board = new BoardBody();
    const inertia = (board as unknown as { wallInertia(k: number, s: WaterSample, h: number, ux: number, uy: number, uz: number): number }).wallInertia.bind(board);
    const sample = createWaterSample();
    const h = 1 / 240;
    for (const a of [9.81, 20 * 9.81]) {
      const fresh = new BoardBody();
      const f = (fresh as unknown as { wallInertia(k: number, s: WaterSample, h: number, ux: number, uy: number, uz: number): number }).wallInertia.bind(fresh);
      let got = 0;
      for (let n = 0; n < 240; n += 1) {
        sample.flowY = a * n * h;
        got = f(0, sample, h, 0, 1, 0);
      }
      expect(got).toBeCloseTo(Math.min(a, 5 * 9.81), 6);
    }
    // A step change of 1 m/s is spread over the smoothing: the first substep takes h/τ of it.
    sample.flowY = 0;
    inertia(1, sample, h, 0, 1, 0);
    sample.flowY = 1;
    expect(inertia(1, sample, h, 0, 1, 0)).toBeCloseTo((1 / h) * (h / (3 / 60)), 9);
  });
});

describe('ruling 3: the buoyancy along the true normal past the clamp', () => {
  it('pushes along the sample\'s normal at the clamp\'s size with `buoyancyNormal`, and as before without it', () => {
    const patch = { position: { x: 0, y: -0.02, z: 0 }, normal: { x: 0, y: -1, z: 0 }, area: 0.1, thickness: 0.05 };
    const relative = { x: 0, y: 0, z: 0 };
    const sample = createWaterSample();
    Object.assign(sample, { surfaceY: 0.1, wet: true, normalX: 0, normalY: -0.6, normalZ: 0.8, slopeX: 0, slopeZ: -Math.sqrt(3) });
    const before = patchForce(patch, sample, relative, 1, createPatchForce());
    const support = before.buoyancy.y;
    expect(before.buoyancy.z).toBeCloseTo(support * Math.sqrt(3), 9);
    const along = patchForce(patch, { ...sample, buoyancyNormal: 2 }, relative, 1, createPatchForce());
    // Under an overhang (n_y < 0): down and out, 2ρgV along the normal.
    expect(along.buoyancy.y).toBeCloseTo(2 * support * -0.6, 9);
    expect(along.buoyancy.z).toBeCloseTo(2 * support * 0.8, 9);
    expect(Math.hypot(along.buoyancy.x, along.buoyancy.y, along.buoyancy.z)).toBeCloseTo(2 * support, 9);
  });
});

describe('ruling 3: no retire of contour-thrown lips', () => {
  const still = (_x: number, z: number) => 3 - z / 10;
  const timing = (contour: boolean, keepThrown: boolean, open?: number): OnsetTiming => ({
    h0: 4.4, band: [3.8, 3.2], joinDepth: () => 2.5, throwDepth: () => 2, lagged: true, earliest: -1.7, thrownRate: 1.25,
    distance: {
      to: (x, z, dx, dz, depth) => throwContourDistance(still, x, z, dx, dz, depth), contour,
      ...(keepThrown ? { keepThrown } : {}), ...(open === undefined ? {} : { openTime: () => open }),
    },
  });
  const thrown = (): FrontPoint => ({
    id: 0, front: 0, column: 0, sigma: 0, x: 0, z: 12, b: Number.NaN, height: 0.8, joined: 0, depth: 2.5, throwDepth: 2, crestDepth: 1.8,
    thrown: 0, throwZ: 10, footHeight: 0.84, footDepth: 4.4, broke: 0, tau: 0.001, seen: 0, fresh: null, dirX: 0, dirZ: 1, crestSpeed: 5,
    formation: 1, unbroken: true,
  });

  it('keeps an unbroken point thrown at its contour at full weight to its touchdown; `?tubeThrow=break` and the guard retire it', () => {
    const dt = 1 / 60;
    const kept = thrown();
    const old = thrown();
    const guarded = thrown();
    let time = 0;
    while (kept.tau < 1.2) {
      time += dt;
      advanceClocks([kept], time, timing(true, true), dt);
      advanceClocks([old], time, timing(true, false), dt);
      advanceClocks([guarded], time, timing(true, true, 0.74), dt);
    }
    expect(kept.retire ?? 0).toBe(0);
    expect(old.retire).toBe(1);
    expect(guarded.retire).toBe(1);
  });
});

describe('ruling 3: the drop rule', () => {
  const STILL = 0.5;
  /** Two fronts along +x, overlapping over x 7–10 a little apart in z, each at its own clock and fade (tubeFollowUp.test.ts's). */
  function records(tauA: number, tauB: number, fadeA = 0, fadeB = 0): Float32Array {
    const out = new Float32Array(20 * FRONT_STRIDE);
    for (let k = 0; k < 20; k += 1) {
      const o = k * FRONT_STRIDE;
      const b = k >= 10;
      out[o + FRONT_FIELD.x] = b ? k - 3 + 0.5 : k + 0.5;
      out[o + FRONT_FIELD.z] = b ? -99.6 : -100;
      out[o + FRONT_FIELD.front] = b ? 2 : 1;
      out[o + FRONT_FIELD.sigma] = b ? k - 10 : k;
      out[o + FRONT_FIELD.tau] = b ? tauB : tauA;
      out[o + FRONT_FIELD.footHeight] = 2.1;
      out[o + FRONT_FIELD.footDepth] = 7;
      out[o + FRONT_FIELD.throwZ] = -100;
      out[o + FRONT_FIELD.fade] = b ? fadeB : fadeA;
      for (const f of [FRONT_FIELD.pace, FRONT_FIELD.anchor, FRONT_FIELD.crestSpeed, FRONT_FIELD.tauRate]) out[o + f] = Number.NaN;
    }
    return out;
  }
  const library = () => new ProfileLibrary([lipCase(0.3, 0.04)]);
  const build = (drop: boolean, merge: boolean, ...args: [number, number, number?, number?]) =>
    new SweptLoft(library(), 0.05, { contact: true, face: face({ merge, drop }) }).build(records(...args), 20, STILL, () => STILL);
  const joined = (r: ReturnType<typeof build>, front: number) => {
    let n = 0;
    for (let s = 0; s < r.sliceCount; s += 1) if (r.sliceFront[s] === front && r.sliceJoined[s] === 1) n += 1;
    return n;
  };

  it('drops the lighter of two overlapping strips whatever its phase or front (`TubeFace.drop`); `?tubeDrop=old` as before', () => {
    for (const merge of [false, true]) {
      // Both thrown: the lighter gives way, a tie the later front, as before.
      for (const args of [[0.3, 0.1], [0.1, 0.3], [0.3, 0.3], [0.3, 0.3, 0.8, 0], [0.3, 0.3, 0, 0.8]] as [number, number, number?, number?][]) {
        const rule = build(true, merge, ...args);
        const old = build(false, merge, ...args);
        expect(rule.overlaps + rule.overlapsKept).toBeGreaterThan(0);
        expect([...rule.sliceJoined.subarray(0, rule.sliceCount)]).toEqual([...old.sliceJoined.subarray(0, old.sliceCount)]);
        if (merge) expect(rule.overlapsOpenHeavy).toBe(0);
      }
      // An earlier front not yet thrown (weight up to 0.55) over a later thrown one faded to 0.2: before, the unthrown gave
      // way whatever its weight; now the lighter, the thrown one, does.
      const rule = build(true, merge, -0.05, 0.3, 0, 0.8);
      const old = build(false, merge, -0.05, 0.3, 0, 0.8);
      expect(joined(rule, 1)).toBeGreaterThan(joined(old, 1));
      expect(joined(rule, 2)).toBeLessThan(joined(old, 2));
    }
  });
});

describe('ruling 3: the case surface\'s own normal speed', () => {
  it('is the surface\'s displacement along its normal to the next frame, whatever its points\' slide along it', () => {
    const loft = new SweptLoft(new ProfileLibrary([lipCase(0.3, 0.04)]), 0.05, { contact: true, face: face({ track: true }) });
    const inner = loft as unknown as { wallProfile: Float32Array; wallStep: number; normalSpeed(p: Float32Array, i: number): number; normalScratch: Float64Array };
    const n = inner.wallProfile.length / 2;
    const profile = new Float32Array(2 * n);
    // A circle of radius 2 growing at 3 m/s: its points slide along it by a tenth of their spacing between the frames.
    const dt = 0.02;
    inner.wallStep = dt;
    for (let k = 0; k < n; k += 1) {
      const a = (Math.PI * k) / (n - 1);
      const b = (Math.PI * (k + 0.1)) / (n - 1);
      profile[2 * k] = 2 * Math.cos(a);
      profile[2 * k + 1] = 2 * Math.sin(a);
      inner.wallProfile[2 * k] = (2 + 3 * dt) * Math.cos(b);
      inner.wallProfile[2 * k + 1] = (2 + 3 * dt) * Math.sin(b);
    }
    for (const i of [10, 40, 64, 90]) {
      const speed = inner.normalSpeed(profile, i);
      // Its normal is the radius, either way; the speed along it, 3 m/s outward.
      const [nx, ny] = inner.normalScratch;
      const outward = nx * profile[2 * i] + ny * profile[2 * i + 1] > 0 ? 1 : -1;
      expect(outward * speed).toBeCloseTo(3, 1);
    }
  });
});
