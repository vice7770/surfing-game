import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WEIGHTS, EQUIVALENT_SPEED_CAP, EQUIVALENT_SPEED_FACTOR, EQUIVALENT_SPEED_RETURN, PredictiveController, SCHEDULE_SPEEDS, SCHEDULE_SPEEDS_FACE, equivalentSpeed, plantAt, scheduledDesign, tableSpeedFor,
} from './predictiveBalance';

// Step 3.5w (`?plantSpeed=face`, docs/research/new-rider/3.5/plant-rows.md §8): the water's tables read at the
// equivalent speed min(12, 1.68 v). Off, every read is the shipped one; on, the water reads v_eq and the kinematics v.
describe('the equivalent speed (plantSpeed)', () => {
  it('maps v to min(12, 1.68 v), and to v itself without the switch', () => {
    expect(EQUIVALENT_SPEED_FACTOR).toBe(1.68);
    expect(equivalentSpeed(3)).toBeCloseTo(5.04, 12);
    expect(equivalentSpeed(4)).toBeCloseTo(6.72, 12);
    expect(equivalentSpeed(8)).toBe(12);
    for (const v of [0, 1.3, 3, 4.25, 6, 9, 14]) {
      expect(tableSpeedFor(v)).toBe(v);
      expect(tableSpeedFor(v, { ...DEFAULT_WEIGHTS })).toBe(v);
      expect(tableSpeedFor(v, { plantSpeed: 'face' })).toBe(equivalentSpeed(v));
    }
    expect(SCHEDULE_SPEEDS_FACE).toEqual([3, 3.5, ...SCHEDULE_SPEEDS]);
    expect(SCHEDULE_SPEEDS[0]).toBe(4);
  });

  it('off: plantAt is the shipped plant bit for bit (no tableSpeed, or tableSpeed equal to the speed)', () => {
    for (const v of [1.2, 3, 4, 4.4, 6.5, 12, 13]) for (const depth of [0, 0.3]) for (const rail of [0, 0.2]) {
      const shipped = plantAt(v, depth, { rail });
      expect(plantAt(v, depth, { rail, tableSpeed: undefined })).toEqual(shipped);
      expect(plantAt(v, depth, { rail, tableSpeed: v })).toEqual(shipped);
    }
  });

  it('on: the water is read at v_eq, the kinematics, the drag and the board inertia at v', () => {
    const v = 4;
    const face = plantAt(v, 0.3, { tableSpeed: equivalentSpeed(v) }).y;
    const atEq = plantAt(equivalentSpeed(v), 0.3).y;
    const atV = plantAt(v, 0.3).y;
    // The roll's three derivatives carry no kinematic term: they are the v_eq row's.
    expect(face.heelRoll).toBe(atEq.heelRoll);
    expect(face.heelSide).toBe(atEq.heelSide);
    expect(face.slipSide).toBe(atEq.slipSide);
    // The kinematic speed, the feet's drag and the board's inertia are the true speed's.
    expect(face.speed).toBe(v);
    expect(face.feetForward).toBe(atV.feetForward);
    expect(face.boardRollInertia).toBe(atV.boardRollInertia);
    expect(face.heelRoll).not.toBe(atV.heelRoll);
  });

  it('on: the controller blends designs built at v_eq, down to 3 m/s, and holds the 3 m/s design below', () => {
    const w = { ...DEFAULT_WEIGHTS, riderBody: 'two' as const, plantSpeed: 'face' as const };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctl = new PredictiveController(w) as any;
    const at3 = scheduledDesign(3, 0.3, 0, w);
    expect(ctl.blend(3, 0.3, 0).k).toEqual(at3.k);
    expect(ctl.blend(2.2, 0.3, 0).k).toEqual(at3.k);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shipped = new PredictiveController({ ...DEFAULT_WEIGHTS, riderBody: 'two' }) as any;
    expect(ctl.blend(4, 0.3, 0).k[0][2]).not.toBe(shipped.blend(4, 0.3, 0).k[0][2]);
    // Off: below 4 the shipped controller holds the 4 m/s design.
    expect(shipped.blend(3, 0.3, 0).k).toEqual(shipped.blend(4, 0.3, 0).k);
  });

  // Step 3.5w phase 3 (`?plantSpeed=taper`, plant-rows.md §9): max(v, min(1.68 v, 7.8)).
  it('taper: face below 7.8 / 1.68, the 7.8 m/s water up to a true 7.8, the speed itself above', () => {
    expect(EQUIVALENT_SPEED_CAP).toBe(7.8);
    // face, unchanged.
    expect(equivalentSpeed(5)).toBeCloseTo(8.4, 12);
    expect(equivalentSpeed(5, 'face')).toBe(equivalentSpeed(5));
    expect(equivalentSpeed(7.5, 'face')).toBe(12);
    // Below the knee, taper is face bit for bit.
    for (const v of [0, 1, 2.5, 3, 3.5, 4, 4.25, 4.5, 4.6]) expect(equivalentSpeed(v, 'taper')).toBe(equivalentSpeed(v, 'face'));
    expect(equivalentSpeed(3, 'taper')).toBeCloseTo(5.04, 12);
    // The plateau.
    for (const v of [7.8 / 1.68, 4.7, 5, 6, 7, 7.5, 7.79]) expect(equivalentSpeed(v, 'taper')).toBe(7.8);
    // Above the cap, the speed itself.
    for (const v of [7.8, 8, 9, 12, 14]) expect(equivalentSpeed(v, 'taper')).toBe(v);
    // Continuous and monotone, and never row '4' or '4.5' from the lowest knot up.
    let last = -Infinity;
    for (let v = 0; v <= 14; v += 0.001) {
      const e = equivalentSpeed(v, 'taper');
      expect(e).toBeGreaterThanOrEqual(last);
      if (last > -Infinity) expect(e - last).toBeLessThan(0.002);
      last = e;
    }
    for (let v = 3; v <= 14; v += 0.01) expect(equivalentSpeed(v, 'taper')).toBeGreaterThan(5);
    for (const v of [1, 4, 6, 9]) expect(tableSpeedFor(v, { plantSpeed: 'taper' })).toBe(equivalentSpeed(v, 'taper'));
  });

  it('taper: the designs are face\'s below the knee, the 7.8 m/s water on the plateau, shipped at and above 7.8', () => {
    const taper = { ...DEFAULT_WEIGHTS, riderBody: 'two' as const, plantSpeed: 'taper' as const };
    const face = { ...DEFAULT_WEIGHTS, riderBody: 'two' as const, plantSpeed: 'face' as const };
    const shipped = { ...DEFAULT_WEIGHTS, riderBody: 'two' as const };
    for (const v of [3, 3.5, 4, 4.5]) expect(scheduledDesign(v, 0.3, 0, taper).k).toEqual(scheduledDesign(v, 0.3, 0, face).k);
    expect(plantAt(6, 0.3, { tableSpeed: equivalentSpeed(6, 'taper') }).y.heelRoll).toBe(plantAt(7.8, 0.3).y.heelRoll);
    for (const v of [8, 9, 12]) expect(scheduledDesign(v, 0.3, 0, taper).k).toEqual(scheduledDesign(v, 0.3, 0, shipped).k);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctl = new PredictiveController(taper) as any;
    expect(ctl.blend(2.2, 0.3, 0).k).toEqual(scheduledDesign(3, 0.3, 0, taper).k);
    expect(ctl.blend(6, 0.3, 0).k[0][2]).not.toBe(scheduledDesign(6, 0.3, 0, shipped).k[0][2]);
  });

  // Step 3.5y (`?plantSpeed=taper6`, return-taper.md): max(v, min(1.68 v, 6)), taper's machinery unchanged.
  it('taper6: face below 6 / 1.68, the 6 m/s water up to a true 6, the speed itself above; face and taper unchanged', () => {
    expect(EQUIVALENT_SPEED_RETURN).toBe(6);
    expect(EQUIVALENT_SPEED_CAP).toBe(7.8);
    // face and taper, unchanged at their own knots and corners.
    expect(equivalentSpeed(3, 'face')).toBeCloseTo(5.04, 12);
    expect(equivalentSpeed(7.5, 'face')).toBe(12);
    expect(equivalentSpeed(5, 'taper')).toBe(7.8);
    expect(equivalentSpeed(4.5, 'taper')).toBeCloseTo(7.56, 12);
    expect(equivalentSpeed(8, 'taper')).toBe(8);
    // Below the knee 6 / 1.68 = 3.5714 m/s, taper6 is face (and taper) bit for bit.
    for (const v of [0, 1, 2.5, 3, 3.25, 3.5, 3.57]) {
      expect(equivalentSpeed(v, 'taper6')).toBe(equivalentSpeed(v, 'face'));
      expect(equivalentSpeed(v, 'taper6')).toBe(equivalentSpeed(v, 'taper'));
    }
    expect(equivalentSpeed(3, 'taper6')).toBeCloseTo(5.04, 12);
    expect(equivalentSpeed(3.5, 'taper6')).toBeCloseTo(5.88, 12);
    // The knee and the 6 m/s water up to a true 6.
    for (const v of [6 / 1.68, 3.6, 4, 4.5, 6 / 1.68 + 1.07, 5, 5.5, 5.99, 6]) expect(equivalentSpeed(v, 'taper6')).toBe(6);
    // Above, the speed itself (where taper still reads its plateau up to 7.8).
    for (const v of [6, 6.5, 7, 7.5, 7.8, 8, 9, 12, 14]) expect(equivalentSpeed(v, 'taper6')).toBe(v);
    expect(equivalentSpeed(7, 'taper')).toBe(7.8);
    // Never stiffer than taper, and never above the 6 m/s row below a true 6.
    for (let v = 0; v <= 14; v += 0.01) {
      expect(equivalentSpeed(v, 'taper6')).toBeLessThanOrEqual(equivalentSpeed(v, 'taper'));
      if (v < 6) expect(equivalentSpeed(v, 'taper6')).toBeLessThanOrEqual(6);
    }
    // Continuous and monotone; from 3 m/s up it never reads row '4' or '4.5'.
    let last = -Infinity;
    for (let v = 0; v <= 14; v += 0.001) {
      const e = equivalentSpeed(v, 'taper6');
      expect(e).toBeGreaterThanOrEqual(last);
      if (last > -Infinity) expect(e - last).toBeLessThan(0.002);
      last = e;
    }
    for (let v = 3; v <= 14; v += 0.01) expect(equivalentSpeed(v, 'taper6')).toBeGreaterThan(5);
    for (const v of [1, 3, 4, 6, 9]) expect(tableSpeedFor(v, { plantSpeed: 'taper6' })).toBe(equivalentSpeed(v, 'taper6'));
  });

  it('taper6: the designs are face\'s at the 3 and 3.5 knots, the 6 m/s water at 4-5.5, shipped at and above 6', () => {
    const taper6 = { ...DEFAULT_WEIGHTS, riderBody: 'two' as const, plantSpeed: 'taper6' as const };
    const taper = { ...DEFAULT_WEIGHTS, riderBody: 'two' as const, plantSpeed: 'taper' as const };
    const face = { ...DEFAULT_WEIGHTS, riderBody: 'two' as const, plantSpeed: 'face' as const };
    const shipped = { ...DEFAULT_WEIGHTS, riderBody: 'two' as const };
    for (const v of [3, 3.5]) {
      expect(scheduledDesign(v, 0.3, 0, taper6).k).toEqual(scheduledDesign(v, 0.3, 0, face).k);
      expect(scheduledDesign(v, 0, 0, taper6).k).toEqual(scheduledDesign(v, 0, 0, taper).k);
    }
    // 4-5.5 m/s: the 6 m/s row's water with the true kinematics, not taper's 6.72-7.8 m/s water.
    for (const v of [4, 4.5, 5, 5.5]) {
      expect(plantAt(v, 0.3, { tableSpeed: equivalentSpeed(v, 'taper6') }).y.heelRoll).toBe(plantAt(6, 0.3).y.heelRoll);
      expect(plantAt(v, 0.3, { tableSpeed: equivalentSpeed(v, 'taper6') }).y.speed).toBe(v);
      expect(scheduledDesign(v, 0.3, 0, taper6).k[0][2]).not.toBe(scheduledDesign(v, 0.3, 0, taper).k[0][2]);
    }
    for (const v of [6, 6.5, 7, 7.5, 8, 9, 12]) expect(scheduledDesign(v, 0.3, 0, taper6).k).toEqual(scheduledDesign(v, 0.3, 0, shipped).k);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctl = new PredictiveController(taper6) as any;
    expect(ctl.blend(2.2, 0.3, 0).k).toEqual(scheduledDesign(3, 0.3, 0, taper6).k);
    expect(ctl.blend(7, 0.3, 0).k).toEqual(scheduledDesign(7, 0.3, 0, shipped).k);
  });
});
