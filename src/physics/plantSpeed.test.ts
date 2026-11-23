import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WEIGHTS, EQUIVALENT_SPEED_FACTOR, PredictiveController, SCHEDULE_SPEEDS, SCHEDULE_SPEEDS_FACE, equivalentSpeed, plantAt, scheduledDesign, tableSpeedFor,
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
});
