import { describe, expect, it } from 'vitest';
import { buildBoardShape } from './boardShape';
import {
  BOARD_SHEET_STRIDE, CURTAIN_CLOCK, createBoardSpraySheet, createHullSprayBuffers, hullSprayLayout, hullSpraySheets, packBoardSheets,
  pileUp, sheetDrops, sprayCurtain, squireGrowth, unpackBoardSheets, type HullSprayBuffers,
} from './boardSpray';

const DEGREE = Math.PI / 180;
const layout = hullSprayLayout(buildBoardShape());

/**
 * The reference board's hull planing on still, flat water at `speed` m/s, rolled `bank` onto its −x rail (its +x side
 * up), trimmed `trim` nose up, its path `drift` off its heading toward +x (the tail skidding the other way), and sunk so
 * its low rail's last station lies `sink` m under the surface; its lift `lift` N.
 */
function hullAt(options: { speed: number; bank?: number; trim?: number; drift?: number; sink?: number; lift?: number }): HullSprayBuffers {
  const { speed, bank = 0, trim = 4 * DEGREE, drift = 0, sink = 0.03, lift = 765 } = options;
  const hull = createHullSprayBuffers(layout.stations, layout.lanes, layout.stationLength);
  // The board's axes: rolled about its length by `bank` (+x side up), then pitched nose up by `trim`.
  const cb = Math.cos(bank); const sb = Math.sin(bank); const ct = Math.cos(trim); const st = Math.sin(trim);
  const az = [0, st, ct];
  const ax = [cb, sb * ct, -sb * st];
  const ay = [-sb, cb * ct, -cb * st];
  hull.axisX.set(ax); hull.axisY.set(ay); hull.axisZ.set(az);
  hull.lift = lift;
  const n = layout.stations * layout.lanes;
  const world = (o: number) => {
    const x = layout.local[o * 3]; const z = layout.local[o * 3 + 2];
    return [ax[0] * x + az[0] * z, ax[1] * x + az[1] * z, ax[2] * x + az[2] * z];
  };
  // Sunk so the low (−x) rail's patch at the last station lies `sink` deep.
  const reference = world(0)[1];
  for (let o = 0; o < n; o += 1) {
    hull.width[o] = layout.width[o];
    hull.across[o] = layout.local[o * 3];
    hull.along[o] = layout.local[o * 3 + 2];
    const [x, y, z] = world(o);
    hull.point.set([x, y - reference - sink, z], o * 3);
    hull.depth[o] = -(y - reference - sink);
    hull.water.set([0, 0, 0], o * 3);
    hull.hull.set([speed * Math.sin(drift), 0, speed * Math.cos(drift)], o * 3);
    hull.sea[o] = 1;
  }
  return hull;
}

const sheetsOf = (hull: HullSprayBuffers) => {
  const out = [createBoardSpraySheet(), createBoardSpraySheet()];
  return out.slice(0, hullSpraySheets(hull, out));
};

describe('the spray off a planing board (board-spray)', () => {
  it('throws a light blister off both rails, sideways and up, when it runs flat and trimmed: nothing backward', () => {
    const sheets = sheetsOf(hullAt({ speed: 10 }));
    expect(sheets).toHaveLength(2);
    const water = sheets.reduce((sum, sheet) => sum + sheet.flux, 0);
    // The momentum the hull turns: ṁ = L tan τ / 2V, 2.7 kg/s at 765 N, 4° and 10 m/s (the advisor's check).
    expect(water).toBeGreaterThan(1);
    expect(water).toBeLessThan(5);
    for (const sheet of sheets) {
      const sideways = Math.abs(sheet.vx);
      // Savitsky & Breslin's side blister at 4°: about 0.25 V sideways at about 47° up, never back along the path.
      expect(sideways).toBeGreaterThan(1.5);
      expect(sideways).toBeLessThan(4);
      expect(sheet.vy / sideways).toBeGreaterThan(0.7);
      expect(sheet.vz).toBeGreaterThan(-0.5);
    }
    expect(Math.sign(sheets[0].vx)).toBe(-Math.sign(sheets[1].vx));
  });

  it('throws a heavier fan off the high (outside) rail when banked into a turn, the more as it drifts', () => {
    const carve = sheetsOf(hullAt({ speed: 12, bank: 33 * DEGREE, drift: 0, sink: 0.04 }));
    const drifting = sheetsOf(hullAt({ speed: 12, bank: 33 * DEGREE, drift: 6 * DEGREE, sink: 0.04 }));
    const flat = sheetsOf(hullAt({ speed: 12 }));
    for (const sheets of [carve, drifting]) {
      expect(sheets).toHaveLength(1);
      // Off the +x (high) side, outward and up.
      expect(sheets[0].vx).toBeGreaterThan(0);
      expect(sheets[0].vy).toBeGreaterThan(0);
    }
    const water = (sheets: ReturnType<typeof sheetsOf>) => sheets.reduce((sum, sheet) => sum + sheet.flux, 0);
    expect(water(carve)).toBeGreaterThan(3 * water(flat));
    // Drift turns the trim into the bank: a faster, higher sheet, and more of it.
    expect(drifting[0].vy).toBeGreaterThan(carve[0].vy);
    expect(water(drifting)).toBeGreaterThan(water(carve));
  });

  it('leaves along the rail between its aftmost and foremost exits, on the board (spray-sheet)', () => {
    const tail = Math.min(...layout.local.filter((_, k) => k % 3 === 2)) - layout.stationLength / 2;
    const nose = Math.max(...layout.local.filter((_, k) => k % 3 === 2)) + layout.stationLength / 2;
    for (const options of [{ speed: 12, bank: 33 * DEGREE, drift: 6 * DEGREE, sink: 0.04 }, { speed: 12, bank: 8 * DEGREE, sink: 0.05 }, { speed: 10 }]) {
      for (const sheet of sheetsOf(hullAt(options))) {
        // The board's along axis is world z (no yaw) here: the root's two ends, in its frame.
        const start = sheet.z;
        const end = sheet.z + sheet.alongZ * sheet.length;
        expect(start).toBeGreaterThanOrEqual(tail - 0.02);
        expect(end).toBeLessThanOrEqual(nose + 0.02);
      }
    }
  });

  it('throws more water the deeper the low rail is loaded (Compress), as Wagner\'s ρ·W·D', () => {
    const light = sheetsOf(hullAt({ speed: 12, bank: 40 * DEGREE, drift: 6 * DEGREE, sink: 0.03 }));
    const loaded = sheetsOf(hullAt({ speed: 12, bank: 40 * DEGREE, drift: 6 * DEGREE, sink: 0.08 }));
    expect(loaded[0].flux).toBeGreaterThan(1.5 * light[0].flux);
  });

  it('throws nothing out of the water or at rest', () => {
    expect(sheetsOf(hullAt({ speed: 10, sink: -0.3 }))).toHaveLength(0);
    expect(sheetsOf(hullAt({ speed: 0, bank: 30 * DEGREE }))).toHaveLength(0);
  });

  it('keeps the pile-up and the drops in their measured ranges', () => {
    expect(pileUp(0)).toBeCloseTo(Math.PI / 2, 6);
    expect(pileUp(30 * DEGREE)).toBeCloseTo(1.42, 6);
    expect(pileUp(45 * DEGREE)).toBeCloseTo(1.245, 6);
    // Carve sheets' 2–5 mm drops fall at 6.5–8.5 m/s, fast sheets' 1–3 mm at 4–6.5, with more mist.
    expect(sheetDrops(4)).toEqual({ fall: 7.5, mist: 0.05 });
    expect(sheetDrops(12).fall).toBeCloseTo(5.25, 6);
    expect(sheetDrops(12).mist).toBeCloseTo(0.22, 6);
  });

  it('packs sheets for a message and back', () => {
    const sheets = sheetsOf(hullAt({ speed: 10 }));
    const packed = packBoardSheets(sheets);
    expect(packed).toHaveLength(sheets.length * BOARD_SHEET_STRIDE);
    const back = unpackBoardSheets(packed);
    for (const [n, sheet] of back.entries()) {
      for (const key of Object.keys(sheet) as (keyof typeof sheet)[]) expect(sheet[key]).toBeCloseTo(sheets[n][key], 4);
    }
  });
});

describe('the spray sheet\'s curtain (spray-sheet)', () => {
  it('grows the sheet\'s flapping at Squire\'s rate: ρ_a U²/√(2σρh) for thin sheets, 0.22·U³ for thick ones', () => {
    expect(squireGrowth(0.002, 4)).toBeCloseTo((1.2 * 16) / Math.sqrt(2 * 0.072 * 1025 * 0.002), 6);
    expect(squireGrowth(0.04, 6)).toBeCloseTo(0.22 * 6 ** 3, -1);
    expect(squireGrowth(0.08, 6)).toBe(squireGrowth(0.04, 6));
  });

  it('is as thick as its water over the rail at its speed across it, and tears after 2.5 e-folds of the flapping', () => {
    // A compressed turn's sheet: 90 kg/s off 0.6 m of rail, 4 m/s across it, 6 m/s through the air.
    const curtain = sprayCurtain(90, 0.6, 4, 6, 7, 0.2, 1);
    expect(curtain.thickness).toBeCloseTo(90 / (1025 * 0.6 * 4), 6);
    expect(curtain.breakup).toBeCloseTo(CURTAIN_CLOCK.foldings / squireGrowth(curtain.thickness, 6), 6);
    expect(curtain.breakup).toBeGreaterThan(0.04);
    expect(curtain.breakup).toBeLessThan(0.06);
    // Its first drops (the wall jet's onset) never after the tear.
    expect(curtain.onset).toBeLessThanOrEqual(curtain.breakup);
    // Slow through the air it holds to the clamp; fast it tears at once (drops off the rail).
    expect(sprayCurtain(90, 0.6, 4, 2, 7, 0.2, 1).breakup).toBe(CURTAIN_CLOCK.longest);
    expect(sprayCurtain(90, 0.6, 4, 14, 14, 0.2, 1).breakup).toBe(0);
  });

  it('draws no curtain for the flat blister, under a millimetre, or still air', () => {
    expect(sprayCurtain(90, 0.6, 4, 6, 7, 0.2, 0.3).breakup).toBe(0);
    expect(sprayCurtain(1, 0.6, 4, 6, 7, 0.2, 1).breakup).toBe(0);
    expect(sprayCurtain(90, 0.6, 4, 0.2, 7, 0.2, 1).breakup).toBe(0);
  });
});
