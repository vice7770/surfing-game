import { describe, expect, it } from 'vitest';
import { libraryFromBytes } from './barrelLibrary';
import { readBarrelCases } from './nodeBarrelCases';
import { LANDMARK, PROFILE_POINTS, removeLoops, type ProfileLibrary } from './ProfileLibrary';

/**
 * The tube the game draws and feels (the owner, 2026-10-22: "draw tubes from our own simulations, not the thin hand-made
 * shape"; the advisor's T1, docs/superpowers/plans/2026-10-22-padang-foam-and-tube-todo.md). The advisor's probe
 * (docs/research/padang-playtest-2026-10-22/probe) on Padang Padang's cases, foot crest 0.9–3.1 m at 7 m, at 0.5, 0.8 and
 * 0.95 of touchdown, as the drawing holds each case (its last clear frame, `hold: 'contact'`):
 * - the lip's thickness, the median over the roof's points 44–60 of the nearest distance to the underside 68–88;
 * - its tip, the nearest distance between the roof's 56–62 and the underside's 66–74;
 * - the void, the area of the polygon 64–112 closed.
 * Sourced targets: lip 0.1–0.2 H, tip about 0.07 H (Feddersen et al. 2024), void 0.25–0.38 H² (Pick & Feddersen 2026 at
 * 1:19). The level-12 cases' void runs under it (0.08–0.24 H²) until the owed level-13 reruns (T4); the authored
 * bounded-C drew a lip 0.014–0.021 H thick around a void of 0.48–0.69 H².
 */
const segment = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax;
  const dy = by - ay;
  const length = dx * dx + dy * dy;
  const t = length > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length)) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
};
function measure(p: Float32Array) {
  const x = (i: number) => p[2 * i];
  const y = (i: number) => p[2 * i + 1];
  let low = Infinity;
  for (let i = LANDMARK.crest; i < PROFILE_POINTS; i += 1) low = Math.min(low, y(i));
  const H = y(LANDMARK.crest) - low;
  const across: number[] = [];
  for (let i = 44; i <= 60; i += 1) {
    let nearest = Infinity;
    for (let j = 68; j < 88; j += 1) nearest = Math.min(nearest, segment(x(i), y(i), x(j), y(j), x(j + 1), y(j + 1)));
    across.push(nearest);
  }
  across.sort((a, b) => a - b);
  let tip = Infinity;
  for (let i = 56; i <= 62; i += 1) for (let j = 66; j < 74; j += 1) tip = Math.min(tip, segment(x(i), y(i), x(j), y(j), x(j + 1), y(j + 1)));
  let area = x(112) * y(64) - x(64) * y(112);
  for (let i = 64; i < 112; i += 1) area += x(i) * y(i + 1) - x(i + 1) * y(i);
  return { lip: across[across.length >> 1] / H, tip: tip / H, void: Math.abs(area) / 2 / (H * H) };
}
function probe(library: ProfileLibrary) {
  const out = new Float32Array(2 * PROFILE_POINTS);
  const rows: ReturnType<typeof measure>[] = [];
  for (const footHeight of [0.9, 1.4, 2.1, 3.1]) {
    const query = { slope: 1 / 19, footHeight, footDepth: 7 };
    const touchdown = library.profileTimes(query).touchdownSeconds;
    for (const share of [0.5, 0.8, 0.95]) {
      library.profileAt({ ...query, seconds: share * touchdown, hold: 'contact' }, out);
      rows.push(measure(out));
    }
  }
  return rows;
}

describe("the tube's shape at Padang Padang", () => {
  const bytes = readBarrelCases('padang');

  it("draws each case's own Basilisk frames, not the authored bounded-C", () => {
    expect(libraryFromBytes(bytes).options.geometry).toBeUndefined();
  });

  it('has a lip 0.1–0.2 H thick (to 0.23 H on the a20 case mid-flight), a tip near 0.07 H late in flight, and the cases’ own void', () => {
    const rows = probe(libraryFromBytes(bytes));
    for (const row of rows) {
      expect(row.lip).toBeGreaterThanOrEqual(0.1);
      expect(row.lip).toBeLessThanOrEqual(0.23);
      expect(row.tip).toBeGreaterThanOrEqual(0.02);
      expect(row.tip).toBeLessThanOrEqual(0.17);
      expect(row.void).toBeGreaterThanOrEqual(0.08);
      expect(row.void).toBeLessThanOrEqual(0.25);
    }
    // Late in flight (0.8 and 0.95 of touchdown) the tip's median is about the sourced 0.07 H.
    const late = rows.filter((_, k) => k % 3 > 0).map((row) => row.tip).sort((a, b) => a - b);
    expect(late[late.length >> 1]).toBeGreaterThan(0.06);
    expect(late[late.length >> 1]).toBeLessThan(0.13);
  });

  it('is not the authored shape the `?tubeShape=c` A/B draws: a membrane around an enlarged void', () => {
    for (const row of probe(libraryFromBytes(bytes, 'bounded-C'))) {
      expect(row.lip).toBeLessThan(0.03);
      expect(row.void).toBeGreaterThan(0.45);
    }
  });
});

/** Proper crossings between segments of one profile, crest to the front end. */
function crossings(p: Float32Array): number {
  let n = 0;
  const x = (i: number) => p[2 * i];
  const y = (i: number) => p[2 * i + 1];
  const side = (i: number, j: number) => (x(i + 1) - x(i)) * (y(j) - y(i)) - (y(i + 1) - y(i)) * (x(j) - x(i));
  for (let i = LANDMARK.crest; i < PROFILE_POINTS - 1; i += 1) {
    for (let j = i + 2; j < PROFILE_POINTS - 1; j += 1) {
      if (side(i, j) * side(i, j + 1) < 0 && side(j, i) * side(j, i + 1) < 0) n += 1;
    }
  }
  return n;
}

describe('the cases’ small loops (the advisor, 2026-10-22)', () => {
  it('closes a loop to the point where its segments cross, keeping every index', () => {
    // A straight line along x with points 3–5 folded back: segment 2–3, (2, 0) to (3, 1), crosses segment 4–5, (2.5, 1)
    // to (2.5, −1), at (2.5, 0.5).
    const frame = new Float32Array(2 * PROFILE_POINTS);
    for (let i = 0; i < PROFILE_POINTS; i += 1) frame[2 * i] = i;
    frame.set([3, 1, 2.5, 1, 2.5, -1], 6);
    expect(removeLoops(frame)).toBe(2);
    for (const k of [3, 4]) expect([frame[2 * k], frame[2 * k + 1]]).toEqual([2.5, 0.5]);
    expect([frame[4], frame[5], frame[10], frame[11], frame[12]]).toEqual([2, 0, 2.5, -1, 6]);
    expect(removeLoops(frame)).toBe(0);
  });

  it('leaves no crossing in Padang Padang’s drawn profiles, foot 0.5–4 m, from before the throw to the collapse', () => {
    const library = libraryFromBytes(readBarrelCases('padang'));
    expect(library.loopPoints).toBeGreaterThan(0);
    const out = new Float32Array(2 * PROFILE_POINTS);
    let crossed = 0;
    for (let footHeight = 0.5; footHeight <= 4.01; footHeight += 0.25) {
      const query = { slope: 1 / 19, footHeight, footDepth: 7 };
      const times = library.profileTimes(query);
      for (let share = -0.2; share <= 1 + times.collapseSeconds / times.touchdownSeconds; share += 0.02) {
        library.profileAt({ ...query, seconds: share * times.touchdownSeconds, hold: 'contact' }, out);
        crossed += crossings(out);
      }
    }
    expect(crossed).toBe(0);
  });

  it('leaves the bounded-C A/B’s cases as they were', () => {
    const library = libraryFromBytes(readBarrelCases('padang'), 'bounded-C');
    expect(library.loopPoints).toBe(0);
  });
});
