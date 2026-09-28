import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { POINT, createRiderVisualState, type RiderVisualState } from '../scene/rig/riderVisualState';
import { STANCES } from '../scene/rig/stanceMap';
import { STANCE_RECIPES, simulateStance, stanceState } from './ridingPoses';

const at = new Vector3(0, 0.03, 0);
/** A point in the board's frame: across, up from the board's centre, along the nose. */
const onBoard = (state: RiderVisualState, index: number) =>
  state.points[index].clone().sub(state.boardPosition).applyQuaternion(state.boardQuaternion.clone().invert());

describe('every mapped stance, simulated by the real rider', () => {
  it('has a recipe for each stance of the map', () => {
    expect(Object.keys(STANCE_RECIPES).sort()).toEqual(STANCES.map((stance) => stance.id).sort());
  });

  it.each(STANCES.map((stance) => stance.id))('reaches %s for Regular and Goofy', (id) => {
    for (const stance of ['regular', 'goofy'] as const) {
      const { state, reached } = stanceState(id, stance, at, createRiderVisualState());
      expect(reached, `${id}, ${stance}: ended ${state.phase}`).toBe(true);
      expect(state.phase).toBe(STANCE_RECIPES[id].phase);
      for (const point of state.points) expect(Number.isFinite(point.x + point.y + point.z)).toBe(true);
    }
  });

  it('crouches deeper for the drop than in trim, and deepest in Compress', () => {
    const pelvis = (id: string) => onBoard(stanceState(id, 'regular', at, createRiderVisualState()).state, POINT.pelvis).y;
    expect(pelvis('drop')).toBeLessThan(pelvis('trim') - 0.05);
    expect(pelvis('compress-frontside')).toBeLessThan(pelvis('drop'));
  });

  it('carries the hips back for trim back, forward for trim forward', () => {
    const along = (id: string) => onBoard(stanceState(id, 'regular', at, createRiderVisualState()).state, POINT.pelvis).z;
    expect(along('trim-back')).toBeLessThan(along('trim'));
    expect(along('trim-forward')).toBeGreaterThan(along('trim'));
  });

  it('reports a stance the rider fell out of as not reached', () => {
    const { reached, state } = simulateStance({ ...STANCE_RECIPES.trim, separate: 0.3 }, 'regular', at, createRiderVisualState());
    expect(state.phase).toBe('fallen');
    expect(reached).toBe(false);
  });

  it('places the board at the given point, its nose along +z', () => {
    const { state } = stanceState('trim', 'goofy', new Vector3(3, 0.03, -2), createRiderVisualState());
    expect(state.boardPosition.distanceTo(new Vector3(3, 0.03, -2))).toBeLessThan(1e-9);
    const nose = new Vector3(0, 0, 1).applyQuaternion(state.boardQuaternion);
    expect(Math.atan2(nose.x, nose.z)).toBeCloseTo(0, 6);
    expect(state.boardQuaternion).toBeInstanceOf(Quaternion);
  });
});
