import { describe, expect, it } from 'vitest';
import { SPILLING_FRONT_DEFAULTS, SpillingFront, seriesSine, type SpillingGrid } from './SpillingFront';

/** A 1 m grid, 41 columns (x −20…20) by 41 rows (z −20…20; +z toward the beach). */
function grid(): SpillingGrid {
  const nx = 41;
  const nz = 41;
  return {
    nx, nz,
    xCenters: Float64Array.from({ length: nx }, (_, i) => i - 20),
    zCenters: Float64Array.from({ length: nz }, (_, i) => i - 20),
  };
}

const column = (g: SpillingGrid, x: number) => Math.round(x - g.xCenters[0]);
const row = (g: SpillingGrid, z: number) => Math.round(z - g.zCenters[0]);

/** Breaking (B = 1) in rows z0…z1 across columns whose x lies in [x0, x1]. */
function breakBand(g: SpillingGrid, strength: Float64Array, x0: number, x1: number, z0: number, z1: number): void {
  for (let iz = row(g, z0); iz <= row(g, z1); iz += 1) {
    for (let ix = column(g, x0); ix <= column(g, x1); ix += 1) strength[iz * g.nx + ix] = 1;
  }
}

function sum(values: Float64Array, g: SpillingGrid, x: number): number {
  let total = 0;
  for (let iz = 0; iz < g.nz; iz += 1) total += values[iz * g.nx + column(g, x)];
  return total;
}

/** Fields for one front; the tests' fronts run at their breaker celerity (a 90° peel: the cap is c_b itself). */
function setup(options: ConstructorParameters<typeof SpillingFront>[1] = {}) {
  const g = grid();
  const front = new SpillingFront(g, { peelAngleDegrees: 90, ...options });
  const size = g.nx * g.nz;
  return { g, front, strength: new Float64Array(size), out: new Float64Array(size) };
}

describe('SpillingFront', () => {
  it('caps the front at c_b / sin α along shore and never lets it pass the solver tip', () => {
    expect(new SpillingFront(grid(), { peelAngleDegrees: 30 }).speedCap(5)).toBeCloseTo(10, 6);
    const { g, front, strength, out } = setup();
    // The solver breaks the whole crest at once (a close-out): onsets in every column at t = 0, from −20 to 20.
    for (let ix = 0; ix < g.nx; ix += 1) front.observeOnset(ix, 0, 0);
    expect(front.waves).toHaveLength(1);
    expect(front.waves[0].tipX).toBe(20);
    breakBand(g, strength, -20, 20, 0, 2);
    // At 2 m/s the front runs 2 m per second from the peak at −20.
    for (let step = 1; step <= 5; step += 1) front.update(step, 1, 2, strength, out);
    expect(front.waves[0].frontX).toBeCloseTo(-10, 6);
    // Far faster: still no further than the solver's tip.
    front.update(6, 1, 1000, strength, out);
    expect(front.waves[0].frontX).toBe(20);
  });

  it('withholds whitewater ahead of the front along the crest and passes it behind', () => {
    const { g, front, strength, out } = setup({ rampSeconds: 0.001 });
    for (let ix = 0; ix < g.nx; ix += 1) front.observeOnset(ix, 10, -2);
    breakBand(g, strength, -20, 20, -2, 2);
    front.update(12, 2, 2, strength, out);
    // The front is at −16: columns behind it keep the solver's whitewater, columns ahead have none.
    expect(front.waves[0].frontX).toBeCloseTo(-16, 6);
    expect(sum(out, g, -18)).toBeGreaterThan(0);
    expect(sum(out, g, -10)).toBe(0);
    expect(sum(out, g, 15)).toBe(0);
    expect(front.gated).toBeGreaterThan(0);
    // The whitewater never exceeds the solver's breaking.
    for (let i = 0; i < out.length; i += 1) expect(out[i]).toBeLessThanOrEqual(strength[i]);
  });

  it('starts the foam as a thin line at the crest and grows it down the face', () => {
    const { g, front, strength, out } = setup({ rampSeconds: 2, lineWidth: 1, growth: 2, lineShare: 0.3 });
    front.observeOnset(column(g, 0), 0, -6);
    // The crest at z = −6 with its face running 8 m down toward the beach (+z).
    breakBand(g, strength, 0, 0, -6, 2);
    front.update(0, 0.01, 2, strength, out);
    const at = (z: number) => out[row(g, z) * g.nx + column(g, 0)];
    expect(at(-6)).toBeCloseTo(0.3, 6);
    expect(at(-5)).toBeGreaterThan(0);
    expect(at(-3)).toBe(0);
    front.update(1, 1, 2, strength, out);
    expect(at(-3)).toBeGreaterThan(0.3);
    expect(at(0)).toBe(0);
    front.update(2.5, 1.5, 2, strength, out);
    expect(at(2)).toBe(1);
  });

  it('gives each new wave its own front and passes older bores inshore of it untouched', () => {
    const { g, front, strength, out } = setup({ rampSeconds: 0.001 });
    // Wave 1 starts breaking at z = −18 across the window and peels from −20.
    for (let ix = 0; ix < g.nx; ix += 1) front.observeOnset(ix, 0, -18);
    for (let t = 1; t <= 30; t += 1) front.update(t, 1, 2, strength, out);
    expect(front.waves[0].frontX).toBe(20);
    // A period later the next wave breaks at the peak: a column already in wave 1 starts wave 2 there.
    front.observeOnset(column(g, -20), 30, -18);
    expect(front.waves).toHaveLength(2);
    expect(front.waves[1].startX).toBe(-20);
    expect(front.waves[1].frontX).toBe(-20);
    // Its neighbours join it, not wave 1.
    for (let x = -19; x <= 20; x += 1) front.observeOnset(column(g, x), 30.2, -18);
    expect(front.waves).toHaveLength(2);
    expect(front.waves[1].tipX).toBe(20);
    // Wave 1's bore is far inshore by now (z 15…17, past wave 2's band); wave 2's crest breaks at z −18…−16.
    breakBand(g, strength, -20, 20, 15, 17);
    breakBand(g, strength, -20, 20, -18, -16);
    front.update(30.5, 0.5, 0.5, strength, out);
    const at = (x: number, z: number) => out[row(g, z) * g.nx + column(g, x)];
    expect(at(10, 16)).toBe(1);
    expect(at(10, -17)).toBe(0);
    expect(at(-20, -17)).toBe(1);
    expect(front.started).toBe(2);
  });

  it('keeps a wave\'s cells its own when another wave starts elsewhere along the crest meanwhile', () => {
    const { g, front, strength, out } = setup({ rampSeconds: 0.001 });
    // The peeling wave breaks from −20 to 0 at once; a second, small break starts at x = 15 a second later.
    for (let x = -20; x <= 0; x += 1) front.observeOnset(column(g, x), 0, 0);
    front.observeOnset(column(g, 15), 1, 0);
    expect(front.waves).toHaveLength(2);
    breakBand(g, strength, -20, 0, 0, 2);
    front.update(1, 1, 2, strength, out);
    expect(front.waves[0].frontX).toBeCloseTo(-18, 6);
    expect(sum(out, g, -5)).toBe(0);
    expect(sum(out, g, -19)).toBeGreaterThan(0);
  });

  it('runs toward −x when the spot peels that way', () => {
    const { g, front, strength, out } = setup({ direction: -1, rampSeconds: 0.001 });
    for (let ix = g.nx - 1; ix >= 0; ix -= 1) front.observeOnset(ix, 0, 0);
    expect(front.waves[0].startX).toBe(20);
    expect(front.waves[0].tipX).toBe(-20);
    breakBand(g, strength, -20, 20, 0, 2);
    front.update(3, 3, 2, strength, out);
    expect(front.waves[0].frontX).toBeCloseTo(14, 6);
    expect(sum(out, g, 18)).toBeGreaterThan(0);
    expect(sum(out, g, 0)).toBe(0);
  });

  /** A wave whose break starts at x = 0 and spreads both ways along its crest (the breaking age's sideways spread). */
  function spreadingWave(options: ConstructorParameters<typeof SpillingFront>[1]) {
    const { g, front, strength, out } = setup({ rampSeconds: 0.001, ...options });
    front.observeOnset(column(g, 0), 0, 0);
    for (let x = 1; x <= 10; x += 1) {
      front.observeOnset(column(g, -x), 0.1 * x, 0);
      front.observeOnset(column(g, x), 0.1 * x, 0);
    }
    breakBand(g, strength, -10, 10, 0, 2);
    for (let t = 1; t <= 20; t += 1) front.update(t, 1, 2, strength, out);
    return { g, front, strength, out };
  }

  // The owner, 2026-10-07: the upcoast haze held back.
  it('withholds the whitewater upcoast of a wave\'s first onset beyond the margin', () => {
    const { g, front, strength, out } = spreadingWave({ upcoastMargin: 5 });
    expect(front.waves).toHaveLength(1);
    expect(front.waves[0].startX).toBe(0);
    expect(front.waves[0].backX).toBe(-10);
    // Upcoast it shows within 5 m of the start and not beyond; downcoast the front has run to the solver's tip.
    expect(sum(out, g, -5)).toBeGreaterThan(0);
    expect(sum(out, g, -6)).toBe(0);
    expect(sum(out, g, -10)).toBe(0);
    expect(sum(out, g, 10)).toBeGreaterThan(0);
    expect(front.gated).toBeGreaterThan(0);
    // The solver's breaking is only read: the whitewater never exceeds it.
    for (let i = 0; i < out.length; i += 1) expect(out[i]).toBeLessThanOrEqual(strength[i]);
  });

  it('leaves the whitewater within the margin upcoast, and all of it downcoast, as without the gate', () => {
    const gated = spreadingWave({ upcoastMargin: 5 });
    const open = spreadingWave({ upcoastMargin: Infinity });
    for (let x = -5; x <= 20; x += 1) expect(sum(gated.out, gated.g, x)).toBe(sum(open.out, open.g, x));
    // Without the gate the whole upcoast spread shows, as before the owner's ruling.
    expect(sum(open.out, open.g, -10)).toBeGreaterThan(0);
  });

  it('counts the gate from the crest\'s first onset when the crest breaks again further along', () => {
    const { g, front, strength, out } = setup({ rampSeconds: 0.001, upcoastMargin: 5 });
    front.observeOnset(column(g, -15), 0, 0);
    for (let t = 1; t <= 3; t += 1) front.update(t, 1, 2, strength, out);
    // Three seconds on, the crest (run 6 m) breaks again 25 m along, and that break spreads back toward the peak.
    front.observeOnset(column(g, 10), 3, 6);
    for (let x = 9; x >= -5; x -= 1) front.observeOnset(column(g, x), 3 + 0.1 * (10 - x), 6);
    expect(front.waves).toHaveLength(2);
    expect(front.waves[1].startX).toBe(10);
    expect(front.waves[1].crestX).toBe(-15);
    breakBand(g, strength, -5, 10, 6, 8);
    for (let t = 4; t <= 20; t += 1) front.update(t, 1, 2, strength, out);
    // Its spread back lies upcoast of its own start but downcoast of the crest's first onset: it shows.
    expect(sum(out, g, -2)).toBeGreaterThan(0);
    expect(sum(out, g, -5)).toBeGreaterThan(0);
  });

  it('leaves the arm behind a later break alone when no older crest\'s run holds it', () => {
    const { g, front, strength, out } = setup({ rampSeconds: 0.001, upcoastMargin: 5 });
    front.observeOnset(column(g, -15), 0, 0);
    for (let t = 1; t <= 3; t += 1) front.update(t, 1, 2, strength, out);
    // A break 25 m along, far seaward of where the first crest has run: its own crest start, at x = 10.
    front.observeOnset(column(g, 10), 3, -19);
    for (let x = 9; x >= -5; x -= 1) front.observeOnset(column(g, x), 3 + 0.1 * (10 - x), -19);
    expect(front.waves[1].crestX).toBe(10);
    breakBand(g, strength, -5, 10, -19, -17);
    for (let t = 4; t <= 20; t += 1) front.update(t, 1, 2, strength, out);
    // The gate counts from the live crests' most upcoast start, −15: the stretch back to x = −5 shows.
    expect(sum(out, g, -2)).toBeGreaterThan(0);
    expect(sum(out, g, -5)).toBeGreaterThan(0);
  });

  it('starts the next crest\'s own count, a period behind, where the last one broke', () => {
    const { g, front, strength, out } = setup({ rampSeconds: 0.001, upcoastMargin: 5 });
    front.observeOnset(column(g, -15), 0, -10);
    for (let t = 1; t <= 11; t += 1) front.update(t, 1, 2, strength, out);
    // A period later the next crest breaks where the first one did; the first crest has run 22 m inshore meanwhile.
    front.observeOnset(column(g, 0), 11, -10);
    // …and the first crest breaks again further along, where it has run.
    front.observeOnset(column(g, 18), 11, 12);
    expect(front.waves.map((wave) => wave.crestX)).toEqual([-15, 0, -15]);
  });

  it('holds the haze back on the +x side when the spot peels toward −x', () => {
    const { g, out } = spreadingWave({ direction: -1, upcoastMargin: 5 });
    expect(sum(out, g, -10)).toBeGreaterThan(0);
    expect(sum(out, g, 5)).toBeGreaterThan(0);
    expect(sum(out, g, 6)).toBe(0);
  });

  it('defaults to the Canyon: left to right seen from the beach, at 55°, its upcoast haze held back', () => {
    expect(SPILLING_FRONT_DEFAULTS.direction).toBe(1);
    expect(SPILLING_FRONT_DEFAULTS.peelAngleDegrees).toBe(55);
    expect(SPILLING_FRONT_DEFAULTS.upcoastMargin).toBe(6);
  });
});

// The Canyon roller lens (S3): what the roller and the rider's water read from the front.
describe('SpillingFront for the roller (S3)', () => {
  it('numbers each wave by the waves started before it', () => {
    const { g, front } = setup();
    front.observeOnset(column(g, -20), 0, 0);
    front.observeOnset(column(g, -19), 0.1, 0);
    front.observeOnset(column(g, -20), 30, 0);
    expect(front.waves.map((wave) => wave.id)).toEqual([0, 1]);
    expect(front.started).toBe(2);
  });

  it('feels the solver\'s breaking behind the front and in cells no wave owns, and none ahead, with no ramp', () => {
    const { g, front, strength, out } = setup({ rampSeconds: 2 });
    const felt = new Float64Array(out.length);
    for (let ix = 0; ix < g.nx; ix += 1) front.observeOnset(ix, 10, -15);
    // The crest's band at z −15…−11 is the wave's (its band ends 20 m inshore of where its crest has run, z 9); a bore
    // far inshore at z 15…17 is outside it (no owner).
    breakBand(g, strength, -20, 20, -15, -11);
    breakBand(g, strength, -20, 20, 15, 17);
    for (let i = 0; i < strength.length; i += 1) if (strength[i] > 0) strength[i] = 0.5 + 0.01 * (i % 7);
    front.update(12, 2, 2, strength, out, felt);
    expect(front.waves[0].frontX).toBeCloseTo(-16, 6);
    const at = (values: Float64Array, x: number, z: number) => values[row(g, z) * g.nx + column(g, x)];
    for (const z of [-15, -13, -11]) {
      // Behind the front: the solver's breaking, unramped (the whitewater is still a thin line there).
      expect(at(felt, -18, z)).toBe(at(strength, -18, z));
      // Ahead of it: none.
      expect(at(felt, -10, z)).toBe(0);
      expect(at(felt, 15, z)).toBe(0);
    }
    expect(at(out, -18, -11)).toBeLessThan(at(strength, -18, -11));
    // The old bore no wave owns keeps the solver's breaking, ahead of the front as behind it.
    for (const x of [-18, 10]) expect(at(felt, x, 16)).toBe(at(strength, x, 16));
    expect(at(felt, 10, 10)).toBe(0);
  });

  it('records each wave\'s crest in every column it owns, reached or not', () => {
    const { g, front, strength, out } = setup({ rampSeconds: 0.001 });
    for (let ix = 0; ix < g.nx; ix += 1) front.observeOnset(ix, 10, -3);
    breakBand(g, strength, -20, 20, -3, 1);
    front.update(12, 2, 2, strength, out);
    // Columns ahead of the front (x > −16) are gated, yet their crest is the wave's first breaking cell.
    expect(front.gated).toBeGreaterThan(0);
    for (const x of [-18, -10, 0, 15]) expect(front.crestAt(0, column(g, x))).toBe(-3);
    // No wave 1, and no breaking in a column: none.
    expect(front.crestAt(1, column(g, 0))).toBeNaN();
    strength.fill(0);
    front.update(12.1, 0.1, 2, strength, out);
    expect(front.crestAt(0, column(g, 0))).toBeNaN();
  });

  it('keeps one crest per wave: an onset beside a wave but a crest away starts its own (S3, the far-crest join)', () => {
    const { g, front, strength, out } = setup();
    for (let ix = 0; ix <= 5; ix += 1) front.observeOnset(ix, 10, -15);
    breakBand(g, strength, -20, -15, -15, -11);
    front.update(10.1, 0.1, 2, strength, out);
    expect(front.crestAt(0, 5)).toBe(-15);
    // Beside the wave's broken extent along shore, but 30 m inshore of its crest: another crest, a new wave.
    front.observeOnset(6, 10.2, 15);
    expect(front.waves.map((wave) => wave.id)).toEqual([0, 1]);
    expect(front.waves[0].joinedAt[6]).toBeNaN();
    // On its crest, 1 m off, the next column joins it: measured from its crest two columns back.
    front.observeOnset(7, 10.3, -14);
    expect(front.waves[0].joinedAt[7]).toBe(10.3);
    expect(front.waves[1].joinedAt[7]).toBeNaN();
  });

  it('keeps one crest per wave before any update too, from where its columns started breaking', () => {
    const { front } = setup();
    front.observeOnset(0, 10, -15);
    front.observeOnset(1, 10, 15);
    front.observeOnset(2, 10, -15);
    expect(front.waves.map((wave) => wave.id)).toEqual([0, 1]);
    expect(Array.from(front.waves[0].joinedAt.subarray(0, 3))).toEqual([10, Number.NaN, 10]);
    expect(Array.from(front.waves[1].joinedAt.subarray(0, 3))).toEqual([Number.NaN, 10, Number.NaN]);
    // With no reach across shore, as before the fix, one wave takes both crests.
    const { front: before } = setup({ crestReach: Infinity });
    for (const [ix, z] of [[0, -15], [1, 15], [2, -15]]) before.observeOnset(ix, 10, z);
    expect(before.waves).toHaveLength(1);
  });

  it('caps the peel with a series sine that matches Math.sin to 1e-12 from 30° to 90°', () => {
    for (let degrees = 30; degrees <= 90; degrees += 0.25) {
      const radians = (degrees * Math.PI) / 180;
      expect(Math.abs(seriesSine(radians) - Math.sin(radians))).toBeLessThan(1e-12);
    }
    expect(seriesSine(Math.PI / 2)).toBeCloseTo(1, 15);
    expect(new SpillingFront(grid(), { peelAngleDegrees: 55 }).speedCap(4.7)).toBeCloseTo(4.7 / Math.sin((55 * Math.PI) / 180), 12);
  });
});
