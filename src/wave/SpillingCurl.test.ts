import { describe, expect, it } from 'vitest';
import { canyonArmAt } from './Bathymetry';
import { overturn, overturnParameter, overturnSize } from './Overturn';
import {
  CURL_CAPACITY, CURL_FIELD, CURL_STRIDE, SPILLING_CURL, SpillingCurl, curlSize, curlStage, drawnReach, impactTime, reachShare, type CurlGrid,
} from './SpillingCurl';
import { SpillingFront } from './SpillingFront';
import { SurfZoneSimulation } from './SurfZoneSimulation';

/**
 * A 1 m tank, 41 columns (x −20…20) by 61 rows (z −30…30, +z toward the beach), on a 1:30 bed 3 m deep at z = 0, with
 * one crest standing along shore at z = 0: a sech² hump 1 m high, its face toward the beach.
 */
function tank(): CurlGrid & { strength: Float64Array } {
  const nx = 41;
  const nz = 61;
  const xCenters = Float64Array.from({ length: nx }, (_, i) => i - 20);
  const zCenters = Float64Array.from({ length: nz }, (_, i) => i - 30);
  const h = new Float64Array(nx * nz);
  const bed = new Float64Array(nx * nz);
  const strength = new Float64Array(nx * nz);
  for (let iz = 0; iz < nz; iz += 1) {
    const z = zCenters[iz];
    const eta = 1 / Math.cosh(z / 3) ** 2;
    for (let ix = 0; ix < nx; ix += 1) {
      bed[iz * nx + ix] = -(3 - z / 30);
      h[iz * nx + ix] = eta - bed[iz * nx + ix];
      // The solver breaks the face, from just ahead of the crest 8 m toward the beach.
      if (z >= 1 && z <= 8) strength[iz * nx + ix] = 1;
    }
  }
  const sampleCentered = (field: ArrayLike<number>, x: number, z: number) => {
    const ix = Math.min(nx - 2, Math.max(0, Math.floor(x + 20)));
    const iz = Math.min(nz - 2, Math.max(0, Math.floor(z + 30)));
    const tx = Math.min(1, Math.max(0, x + 20 - ix));
    const tz = Math.min(1, Math.max(0, z + 30 - iz));
    const i = iz * nx + ix;
    return (field[i] * (1 - tx) + field[i + 1] * tx) * (1 - tz) + (field[i + nx] * (1 - tx) + field[i + nx + 1] * tx) * tz;
  };
  return { nx, nz, dx: 1, xCenters, zCenters, h, bed, restLevel: 0, strength, sampleCentered };
}

describe('the spilling lip\'s clock and reach', () => {
  it('lands at 0.6 √H s, and draws its white from the landing line down to the face\'s foot 2 s later', () => {
    expect(impactTime(1)).toBeCloseTo(0.6, 9);
    expect(impactTime(1.3)).toBeCloseTo(0.684, 3);
    const reach = { top: 0, bottom: 0 };
    // Before touchdown: nothing anywhere down the face.
    drawnReach(-0.01, 0.8, 5, reach);
    for (const below of [-1, 0, 0.8, 3, 5]) expect(reachShare(below, reach.top, reach.bottom)).toBe(0);
    // At touchdown: a white line where it lands, none at the crest or down at the foot.
    drawnReach(0, 0.8, 5, reach);
    expect(reachShare(0.8, reach.top, reach.bottom)).toBeGreaterThan(0.2);
    expect(reachShare(0, reach.top, reach.bottom)).toBe(0);
    expect(reachShare(2, reach.top, reach.bottom)).toBe(0);
    // Half a second on the void has filled to the crest; the toe is a quarter of the way down.
    drawnReach(0.5, 0.8, 5, reach);
    expect(reachShare(0, reach.top, reach.bottom)).toBe(1);
    expect(reach.bottom).toBeCloseTo(0.8 + (4.2 * 0.5) / 2, 9);
    // The toe reaches the foot 2 s after touchdown, not before.
    drawnReach(1.5, 0.8, 5, reach);
    expect(reachShare(5, reach.top, reach.bottom)).toBe(0);
    drawnReach(SPILLING_CURL.toeSeconds, 0.8, 5, reach);
    expect(reach.bottom).toBeCloseTo(5, 9);
    expect(reachShare(5 - SPILLING_CURL.soft / 2, reach.top, reach.bottom)).toBe(1);
  });

  it('grows its curl from nothing at the front to touchdown, then fills its void and whitens over half a second', () => {
    expect(curlStage(0, 0.6)).toEqual({ grown: 0, filled: 0, white: 0 });
    expect(curlStage(0.3, 0.6).grown).toBeCloseTo(0.5, 9);
    // Green until it lands.
    expect(curlStage(0.59, 0.6).white).toBe(0);
    expect(curlStage(0.85, 0.6)).toEqual({ grown: 1, filled: 0.5, white: 0.5 });
    expect(curlStage(1.1, 0.6).filled).toBe(1);
  });

  it('takes Pick & Feddersen\'s overturn: at 1:30 a 0.20 H² void, 0.88 H by 0.33 H at 47°, landing 0.60 H ahead', () => {
    // The fan face at about 1:30 under the Canyon's H0/h0 of 0.28 (the advisor's figures, 2026-10-11).
    const shape = overturn(overturnParameter(1 / 30, 0.28));
    expect(shape.area).toBeCloseTo(0.2, 2);
    expect(shape.jetArea).toBeCloseTo(0.071, 3);
    expect((shape.tilt * 180) / Math.PI).toBeCloseTo(47, 0);
    const size = curlSize(shape, 1);
    expect(size.length).toBeCloseTo(0.88, 2);
    expect(size.width).toBeCloseTo(0.33, 2);
    expect(size.ahead).toBeCloseTo(0.6, 2);
    // Its lip: the jet over the void's length, under a tenth of the wave (the advisor: about 0.05 H).
    expect(size.thickness).toBeGreaterThan(0.04);
    expect(size.thickness).toBeLessThan(0.1);
  });
});

describe('the spilling lip on a spilling front', () => {
  /** A front peeling from x = −15 at 2 m/s (a 90° peel), its crest broken in every column from there from t = 0. */
  function peel() {
    const grid = tank();
    const front = new SpillingFront(grid, { peelAngleDegrees: 90 });
    const plain = new SpillingFront(grid, { peelAngleDegrees: 90 });
    // The peak at x = −15, clear of the open edges' columns.
    for (let ix = 5; ix < grid.nx; ix += 1) {
      front.observeOnset(ix, 0, 1);
      plain.observeOnset(ix, 0, 1);
    }
    const curl = new SpillingCurl(grid, { breakerDepth: 2, breakerHeight: 1.56, nonlinearity: 0.28 });
    const size = grid.nx * grid.nz;
    const fields = () => ({ out: new Float64Array(size), felt: new Float64Array(size) });
    return { grid, front, plain, curl, mine: fields(), theirs: fields(), drawn: new Float64Array(size) };
  }

  it('draws none ahead of the front or before its curl lands, reaches the face\'s foot 2 s after, and changes nothing felt', () => {
    const { grid, front, plain, curl, mine, theirs, drawn } = peel();
    const { nx, nz, zCenters, strength } = grid;
    const column = (x: number) => x + 20;
    // The deepest row drawn in a column, as a distance down the face from its crest; −∞ with none drawn.
    const deepest = (c: number) => {
      let below = Number.NEGATIVE_INFINITY;
      for (let iz = 0; iz < nz; iz += 1) if (drawn[iz * nx + c] > 0) below = Math.max(below, zCenters[iz] - curl.crest[c]);
      return below;
    };
    const dt = 0.02;
    let checked = 0;
    let footChecked = 0;
    for (let step = 1; step <= 250; step += 1) {
      const time = step * dt;
      front.update(time, dt, 2, strength, mine.out, mine.felt, drawn, curl);
      plain.update(time, dt, 2, strength, theirs.out, theirs.felt);
      curl.update(time, front, undefined, strength);
      // The front's own whitewater and the breaking felt are exactly as without the lip.
      for (let i = 0; i < drawn.length; i += 1) {
        expect(Object.is(mine.out[i], theirs.out[i])).toBe(true);
        expect(Object.is(mine.felt[i], theirs.felt[i])).toBe(true);
        expect(drawn[i]).toBeLessThanOrEqual(mine.out[i]);
      }
      const wave = front.waves[0];
      for (let c = 5; c < nx - 2; c += 1) {
        const reached = wave.reached[c];
        let any = 0;
        for (let iz = 0; iz < nz; iz += 1) any = Math.max(any, drawn[iz * nx + c]);
        // Ahead of the front, and before the column's curl lands, nothing is drawn.
        if (!(reached === reached)) {
          expect(any).toBe(0);
          continue;
        }
        const age = time - reached;
        if (age < curl.impact[c] - dt) {
          expect(any).toBe(0);
          checked += 1;
        }
        // The toe: from the landing line at touchdown (a 1 m row takes it in within a few tenths), down to the face's
        // foot 2 s later, within a row.
        const since = age - curl.impact[c];
        const toeAt = curl.landing[c] + ((curl.foot[c] - curl.landing[c]) * since) / SPILLING_CURL.toeSeconds;
        if (since > 0.2 && since < 0.4) expect(Math.abs(deepest(c) - toeAt)).toBeLessThanOrEqual(1);
        if (Math.abs(since - SPILLING_CURL.toeSeconds) < dt / 2 + 1e-9) {
          expect(Math.abs(deepest(c) - curl.foot[c])).toBeLessThanOrEqual(1);
          footChecked += 1;
        }
        if (since > 0.1 && since < SPILLING_CURL.toeSeconds - 0.5) expect(deepest(c)).toBeLessThan(curl.foot[c] - 0.5);
      }
    }
    expect(checked).toBeGreaterThan(100);
    expect(footChecked).toBeGreaterThan(2);
    // The crest the curl found: the hump's top, its height and touchdown; the foot is the section's toe.
    // x = −10, reached 2.5 s in: 2.5 s old at the end.
    const c = column(-10);
    expect(curl.crest[c]).toBeCloseTo(0, 1);
    expect(curl.height[c]).toBeGreaterThan(0.9);
    expect(curl.impact[c]).toBeCloseTo(impactTime(curl.height[c]), 9);
    expect(curl.foot[c]).toBeGreaterThan(curl.landing[c]);
  });

  it('writes a slice in each column whose curl still stands, and one at the front where it starts from nothing', () => {
    const { grid, front, curl, mine, drawn } = peel();
    const dt = 0.02;
    for (let step = 1; step <= 40; step += 1) {
      const time = step * dt;
      front.update(time, dt, 2, grid.strength, mine.out, mine.felt, drawn, curl);
      curl.update(time, front, undefined, grid.strength);
    }
    const into = new Float32Array(CURL_CAPACITY * CURL_STRIDE);
    const count = curl.writeCurls(into, front, (_x, z) => 1 / Math.cosh(z / 3) ** 2);
    expect(count).toBeGreaterThan(1);
    const field = (s: number, f: number) => into[s * CURL_STRIDE + f];
    const frontX = front.waves[0].frontX;
    let start = 0;
    for (let s = 0; s < count; s += 1) {
      const age = field(s, CURL_FIELD.age);
      const height = field(s, CURL_FIELD.height);
      expect(age).toBeLessThanOrEqual(impactTime(height) + SPILLING_CURL.fillSeconds + 1e-6);
      // Its void stands about a quarter of the wave at full growth, less while it grows or fills.
      expect(field(s, CURL_FIELD.width)).toBeLessThanOrEqual(0.35 * height + 1e-6);
      expect(field(s, CURL_FIELD.white)).toBeCloseTo(curlStage(age, impactTime(height)).white, 5);
      if (field(s, CURL_FIELD.x) === Math.fround(frontX)) {
        start += 1;
        expect(field(s, CURL_FIELD.length)).toBe(0);
      }
    }
    expect(start).toBe(1);
  });
});

describe('the spilling lip at the Canyon', () => {
  it('stands its curl about a quarter of the wave high (0.2–0.35 H) all along the arm', () => {
    const simulation = new SurfZoneSimulation({
      spot: 'canyon', seed: 1, significantHeight: 1.4, peakPeriod: 11, directionDegrees: 0, spreading: 150, tide: 0,
      componentCount: 8, alongShore: 160, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
    }, 'warm');
    const curl = simulation.curl!;
    const { xCenters, nx } = simulation.solver;
    let arm = 0;
    for (let column = 0; column < nx; column += 1) {
      if (!canyonArmAt(xCenters[column])) continue;
      arm += 1;
      for (const height of [0.6, 1, 1.4]) {
        const share = curl.size(column, height).width / height;
        expect(share).toBeGreaterThanOrEqual(0.2);
        expect(share).toBeLessThanOrEqual(0.35);
      }
      // The size is the overturn's (`overturnSize`) for the bed the column's crest climbs, held to the fan face's span.
      expect(curl.size(column, 1).width).toBeCloseTo(overturnSize(curl.shapes[column], 1).width, 12);
    }
    expect(arm).toBeGreaterThan(40);
  });
});
