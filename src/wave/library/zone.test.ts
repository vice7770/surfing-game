import { describe, expect, it } from 'vitest';
import { PhysicalSurfWater } from '../../physics/PhysicalSurfWater';
import { createContactHit, SweptContact } from '../barrel/sweptContact';
import { LOFT_SAMPLES } from '../barrel/sweptLoft';
import { ShallowWaterSolver, uniformEdges } from '../ShallowWaterSolver';
import { decodeSurfZoneState, encodeSurfZoneState, type SurfZoneState } from '../surfZoneState';
import { PATH, PATH_COLUMNS, WAVE_POINTS, gameCase, type WaveCase, type WaveCaseHeader } from './caseFormat';
import { buildLanes, fitLine, laneSlope, LANE, type RawHandover } from './Handover';
import { CURVE, CURVE_STRIDE, LibraryLoft } from './libraryLoft';
import { MeanLevel } from './meanLevel';
import { SliceField } from './SliceField';
import { WaveLibrary } from './WaveLibrary';
import { ZoneSurface } from './zoneSurface';

const FLOATS = 2 * WAVE_POINTS;

/**
 * A synthetic case on a platform with a toe: its crest moves at 1 h0 per √(h0/g) from τ −8 to +2 (step 0.05), on the
 * platform (d = 1) until τ −5, then shoaling (d = 1 + 0.1 (τ + 5)... down to 0.7 at the throw), its H/d flat on the
 * platform and rising past the toe; a smooth hump around its crest.
 */
function toeCase(a0 = 0.25, id = 'toe'): WaveCase {
  const tauStart = -8;
  const tauStep = 0.05;
  const count = 201;
  const frames = new Float32Array(count * FLOATS);
  const path = new Float32Array(count * PATH_COLUMNS);
  for (let k = 0; k < count; k += 1) {
    const tau = tauStart + k * tauStep;
    const d = tau < -5 ? 1 : Math.max(0.7, 1 - 0.06 * (tau + 5));
    const hd = tau < -5 ? a0 : a0 + 0.08 * (tau + 5);
    const height = hd * d;
    for (let i = 0; i < WAVE_POINTS; i += 1) {
      const x = (i - 32) * 0.04;
      frames[k * FLOATS + 2 * i] = tau + x;
      frames[k * FLOATS + 2 * i + 1] = height * Math.exp(-(x * x) / 0.5);
    }
    const row = k * PATH_COLUMNS;
    path[row + PATH.tau] = tau;
    path[row + PATH.crestX] = tau;
    path[row + PATH.crestY] = height;
    path[row + PATH.trough] = 0;
    path[row + PATH.H] = height;
    path[row + PATH.d] = d;
    path[row + PATH.Hd] = hd;
    path[row + PATH.speed] = 1;
    path[row + PATH.face] = 20;
  }
  const header: WaveCaseHeader = {
    format: 'brl3 1', id, run: id, level: 12, dx: 0.015625, h0: 5, a0, slope: 0.068, reefDepth: 0.2, period: 14.7, tVertical: 20,
    touchdown: 1.2, tauStart, tauStep, frames: count, points: WAVE_POINTS, origin: 0, velocityDepths: [], velocityLabels: [],
    arc: { lip: 0.6, throat: 0.62 }, uses: { own: count, refill: 0 }, pathChecks: {}, stats: {}, q: null, sections: [],
  };
  const empty = new Float32Array(0);
  return { header, frames, use: new Uint8Array(count).fill(1), path, velocity: empty, qTime: empty, qFlow: empty, qTop: empty, qAir: empty, bore: empty, boreTop: empty, boreAir: empty };
}

/** A straight reef: a 5 m platform to z = 0, then a 1:10 face along +z to 1 m. */
const reefDepth = (_x: number, z: number) => (z < 0 ? 5 : Math.max(1, 5 - 0.1 * z));

describe('MeanLevel', () => {
  it('is a boxcar over one period: a still sea reads its level, a whole sine none; it survives a round trip', () => {
    const still = new MeanLevel(2, 10, 0.25);
    for (let t = 0; t < 12; t += 0.25) still.read(t, (k) => 0.1 * (k + 1));
    expect(still.at(0)).toBeCloseTo(0.1, 12);
    expect(still.at(1)).toBeCloseTo(0.2, 12);
    const wave = new MeanLevel(1, 10, 0.25);
    for (let t = 0; t < 30; t += 0.25) wave.read(t, () => Math.sin((2 * Math.PI * t) / 10));
    expect(Math.abs(wave.at(0))).toBeLessThan(1e-9);
    const copy = new MeanLevel(1, 10, 0.25);
    copy.importState(JSON.parse(JSON.stringify(wave.exportState())));
    expect(copy.at(0)).toBe(wave.at(0));
  });
});

describe('the hand-over (ruling 31)', () => {
  it("fits along the lanes without passing a one-sided window's own values", () => {
    const lanes = buildLanes(reefDepth, 0, -50, -5, 5, 5);
    const raws: RawHandover[] = [0, 1, 2].map((k) => ({ lane: k, t: 10 + 0.3 * k, past: 0, height: 1, H: 1.5, sinceToe: 0, atToe: true }));
    // Far to one side: a line would run past 10.6; the fit is held at the window's values.
    const t = fitLine(raws, lanes, 8, LANE.clockRadius, (r) => r.t);
    expect(t).toBeLessThanOrEqual(10.6 + 1e-12);
    expect(t).toBeGreaterThanOrEqual(10);
  });

  it('lays straight lanes over a straight reef: along its slope, never crossing, its toe and throw on the contours', () => {
    const lanes = buildLanes(reefDepth, 0, -50, -10, 10, 5);
    expect(lanes.count).toBeGreaterThan(30);
    for (let k = 0; k < lanes.count; k += 1) {
      expect(lanes.rayZ[k]).toBeCloseTo(1, 6);
      // The toe 0.05 m under the platform (z 0.5), the throw where it is 2.2 m (z 28).
      const toeZ = lanes.baseZ[k] + lanes.toe[k] * lanes.rayZ[k];
      const throwZ = lanes.baseZ[k] + lanes.throwAt[k] * lanes.rayZ[k];
      expect(toeZ).toBeGreaterThan(0);
      expect(toeZ).toBeLessThan(1);
      expect(throwZ).toBeCloseTo(28, 0);
      expect(laneSlope(lanes, k, lanes.toe[k])).toBeCloseTo(0.1, 2);
      if (k > 0) expect(lanes.sigma[k] - lanes.sigma[k - 1]).toBeCloseTo(LANE.spacing, 6);
    }
    // The field's ends fade in over `END_TAPER`.
    expect(lanes.end[0]).toBe(0);
    expect(lanes.end[Math.floor(lanes.count / 2)]).toBe(1);
  });

  it("takes each case's clock from its own toe on the platform, and moves to the H/d match smoothly", () => {
    const library = new WaveLibrary([toeCase(0.25)]);
    const { matcher } = library;
    expect(matcher.toeTau[0]).toBeCloseTo(-5 + 0.002 / 0.06, 6);
    const base = { heightOverDepth: 0.25 + 0.08 * 2, period: 14.7, slope: 0.068, reefDepth: 0.2, depth: 4.6, time: 0 };
    const byHd = matcher.match(base).cases[0].tauH;
    const atToe = matcher.match({ ...base, toe: { since: 0.5, share: 1 } }).cases[0].tauH;
    const half = matcher.match({ ...base, toe: { since: 0.5, share: 0.5 } }).cases[0].tauH;
    expect(byHd).toBeCloseTo(-3, 1);
    expect(atToe).toBeCloseTo(matcher.toeTau[0] + 0.5, 9);
    expect(half).toBeCloseTo(0.5 * (byHd + atToe), 9);
  });
});

describe("the overturn's loft (LibraryLoft)", () => {
  /** One curve record on lane `lane`: a flat curve at `y` from s 0 to 12.7, lifted over [from, to]. */
  function record(out: Float32Array, n: number, lane: number, y: (s: number) => number, lift: number, from = 4, to = 8): void {
    const o = n * CURVE_STRIDE;
    out[o + CURVE.lane] = lane;
    out[o + CURVE.wave] = 0;
    out[o + CURVE.lift] = lift;
    out[o + CURVE.from] = from;
    out[o + CURVE.to] = to;
    out[o + CURVE.tau] = -1;
    out[o + CURVE.touchdown] = 1;
    out[o + CURVE.h0] = 5;
    out[o + CURVE.baseX] = lane * 0.5;
    out[o + CURVE.baseZ] = 0;
    out[o + CURVE.rayX] = 0;
    out[o + CURVE.rayZ] = 1;
    out[o + CURVE.sigma] = lane * 0.5;
    out[o + CURVE.mask] = lift > 0 ? 1 : 0;
    for (let i = 0; i < WAVE_POINTS; i += 1) {
      const s = i * 0.1;
      out[o + CURVE.points + 2 * i] = s;
      out[o + CURVE.points + 2 * i + 1] = y(s);
    }
  }

  it('lies on the water where it does not lift, stands on its curve where it does, and joins neighbouring lanes', () => {
    const curves = new Float32Array(3 * CURVE_STRIDE);
    record(curves, 0, 10, () => 1, 0);
    record(curves, 1, 11, () => 1, 1);
    record(curves, 2, 12, () => 1, 0);
    const water = 0.25;
    const loft = new LibraryLoft(10).build(curves, 3, () => water);
    expect(loft.sliceCount).toBe(3);
    expect(loft.sliceJoined[0]).toBe(1);
    expect(loft.sliceJoined[1]).toBe(1);
    expect(loft.indexCount).toBe(2 * 6 * (LOFT_SAMPLES - 1));
    const y = (slice: number, i: number) => loft.positions[3 * (slice * LOFT_SAMPLES + 3 + i) + 1];
    // Unlifted slices, and the lifted one far outside its span: on the water. Inside its span: on its curve.
    expect(y(0, 60)).toBe(water);
    expect(y(1, 10)).toBe(water);
    expect(y(1, 60)).toBe(1);
    expect(loft.mask[1 * LOFT_SAMPLES + 3 + 60]).toBe(1);
    expect(loft.mask[0 * LOFT_SAMPLES + 3 + 60]).toBe(0);
    // A flat water's normals point up.
    expect(loft.normals[3 * (LOFT_SAMPLES + 3 + 10) + 1]).toBeCloseTo(1, 9);
  });

  it("is felt as it is drawn: a contact over it answers its own crossing", () => {
    const curves = new Float32Array(2 * CURVE_STRIDE);
    record(curves, 0, 10, () => 1, 1, 0, 12.7);
    record(curves, 1, 11, () => 1, 1, 0, 12.7);
    const loft = new LibraryLoft(10);
    loft.build(curves, 2, () => 0);
    const contact = SweptContact.forLoft(() => loft.result);
    contact.update(new Float32Array(0), 0, 0, () => 0);
    const hit = createContactHit();
    expect(contact.query(5.2, 0.5, 6, hit)).toBe(true);
    expect(hit.inWater).toBe(true);
    expect(hit.surfaceY).toBeCloseTo(1, 6);
    expect(contact.floorAt(5.2, 6)).toBeCloseTo(1, 6);
    expect(contact.query(5.2, 0.5, 40, hit)).toBe(false);
  });
});

describe('the zone surface (ZoneSurface) and its slices (SliceField)', () => {
  function zone() {
    const solver = new ShallowWaterSolver({ nx: 40, xMin: -20, dx: 1, zEdges: uniformEdges(-60, 40, 100), xBoundary: 'open' }, (x, z) => reefDepth(x, z));
    const lanes = buildLanes((x, z) => solver.restLevel - solver.sampleCentered(solver.bed, x, z), 0, -55, -8, 8, 5);
    const library = new WaveLibrary([toeCase(0.25, 'a'), toeCase(0.35, 'b')]);
    const field = new SliceField(library, lanes, 10.5);
    const grid = { xMin: -20, zMin: -60, spacing: 1, nx: 41, nz: 101 };
    const surface = new ZoneSurface(field, lanes, grid);
    return { solver, lanes, library, field, surface, grid };
  }

  it("leaves every node the sea's where no slice is", () => {
    const { surface, grid } = zone();
    surface.update(0, () => 0);
    for (let n = 0; n < grid.nx * grid.nz; n += 1) expect(surface.at(n, 0.123)).toBe(0.123);
  });

  it("writes a whole slice's own heights into the nodes on its lane, and nothing far from its frame", () => {
    const { lanes, library, field, surface, grid } = zone();
    const k = Math.floor(lanes.count / 2);
    const state = { heightOverDepth: 0.3, period: 14.7, slope: 0.068, reefDepth: 0.2, depth: 4.8, time: 0 };
    const slice = library.slice(state);
    field.byLane[k].push({
      id: 0, wave: 0, lane: k, tH: 0, s: lanes.toe[k] + 5, H: 1.5, height: 1, mean: 0, slice, state, end: 1, blendFrom: -10, throwAt: 10,
      touchdown: 1, goFrom: 100, goneAt: 101, seaS: Number.NaN, seaT: Number.NaN, tipS: Number.NaN, tipY: Number.NaN, tipT: Number.NaN, tipAlong: 0, tipUp: 0,
      toeShare: 1, own: true,
    });
    surface.update(0, () => 0);
    // At the slice's crest on its lane: the case's crest (the nodes interpolate across the lane's neighbour, 0.5 m away).
    const crest = new Float64Array(2);
    library.crestAt(slice, 0, crest);
    const s = lanes.toe[k] + 5 + crest[0];
    const x = lanes.baseX[k] + s * lanes.rayX[k];
    const z = lanes.baseZ[k] + s * lanes.rayZ[k];
    const node = surface.nodeAt(Math.round(x), Math.round(z));
    expect(surface.weight[node]).toBeGreaterThan(0);
    // Far behind the frame: the sea's.
    const far = surface.nodeAt(Math.round(x), Math.round(z) - 30);
    expect(surface.at(far, 0.5)).toBe(0.5);
    void grid;
  });

  it('carries its slices through a state round trip', () => {
    const { lanes, field, library } = zone();
    const k = 3;
    const state = { heightOverDepth: 0.3, period: 14.7, slope: 0.068, reefDepth: 0.2, depth: 4.8, time: 2 };
    field.byLane[k].push({
      id: 7, wave: 1, lane: k, tH: 2, s: lanes.toe[k], H: 1.5, height: 1, mean: 0.01, slice: library.slice(state), state, end: 1, blendFrom: 2.6,
      throwAt: 9, touchdown: 1, goFrom: 13, goneAt: 14.2, seaS: Number.NaN, seaT: Number.NaN, tipS: Number.NaN, tipY: Number.NaN, tipT: Number.NaN,
      tipAlong: 0, tipUp: 0, toeShare: 1, own: true,
    });
    const exported = field.exportState();
    const sea: SurfZoneState = { nx: 1, nz: 1, solverTime: 0, seaTimeOffset: 0, arrays: {}, counters: { lipLaunches: 0, lipVolume: 0, lipJets: 0, lipRollers: 0 }, lip: {} as never, library: exported };
    const back = decodeSurfZoneState(encodeSurfZoneState(sea)).library!;
    const copy = zone().field;
    copy.importState(back);
    const [restored] = [...copy.slices()];
    expect(restored.id).toBe(7);
    expect(restored.slice.tauH[0]).toBe(field.byLane[k][0].slice.tauH[0]);
    expect(Number.isNaN(restored.seaS)).toBe(true);
  });
});

describe("the felt water's zone (PhysicalSurfWater.zone)", () => {
  it("feels the zone's node heights, and only them", () => {
    const solver = new ShallowWaterSolver({ nx: 20, xMin: -10, dx: 1, zEdges: uniformEdges(-10, 10, 20), xBoundary: 'open' }, () => 3);
    const plain = new PhysicalSurfWater(solver, { peakPeriod: 10 });
    const lifted = new PhysicalSurfWater(solver, {
      peakPeriod: 10, zone: { nodeAt: () => 0, at: (_node, sea) => sea + 0.4, weightAt: () => 1 },
    });
    expect(lifted.plainSurfaceAt(0.3, 0.7)).toBeCloseTo(plain.plainSurfaceAt(0.3, 0.7) + 0.4, 12);
    const none = new PhysicalSurfWater(solver, { peakPeriod: 10, zone: { nodeAt: () => -1, at: (_node, sea) => sea + 0.4, weightAt: () => 0 } });
    expect(none.plainSurfaceAt(0.3, 0.7)).toBe(plain.plainSurfaceAt(0.3, 0.7));
  });
});

describe("the game's case files (gameCase)", () => {
  it('keeps the frames to touchdown + keepAfter, bit for bit, with no velocity or columns', () => {
    const c = toeCase();
    const game = gameCase(c, 0.5);
    const last = Math.floor((1.2 + 0.5 + 8) / 0.05) + 2;
    expect(game.header.frames).toBe(last);
    expect(game.frames.length).toBe(last * FLOATS);
    expect(Array.from(game.frames.subarray(0, 10 * FLOATS))).toEqual(Array.from(c.frames.subarray(0, 10 * FLOATS)));
    expect(game.velocity.length).toBe(0);
    expect(game.header.q).toBeNull();
    expect(game.header.uses.own + game.header.uses.refill).toBe(last);
  });
});
