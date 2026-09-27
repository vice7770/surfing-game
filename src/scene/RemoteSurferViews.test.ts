import { Group, Scene, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RIDER_PHASES } from '../wave/SurfZoneRunner';
import { createRemoteState, type RemoteState } from '../net/RemoteSurfers';
import { SkinnedSurfer } from './character/SkinnedSurfer';
import { fakeGltfScene } from './character/testSurferScene';
import { RemoteSurferViews } from './RemoteSurferViews';

const look = { body: 'surfer2', outfit: 'vest', color: 'coral', board: 'classic' };

function riding(x: number, z: number): RemoteState {
  const state = createRemoteState();
  Object.assign(state, { x, z, lift: 0.08, quaternion: [0, 0, 0, 1], phase: RIDER_PHASES.indexOf('prone'), present: true, boardPresent: true, heading: 0 });
  for (let i = 0; i < 7; i += 1) {
    state.points[i * 3] = 0;
    state.points[i * 3 + 1] = 0.2 + i * 0.05;
    state.points[i * 3 + 2] = -0.6 + i * 0.2;
  }
  return state;
}

describe('RemoteSurferViews', () => {
  let load: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    load = vi.spyOn(SkinnedSurfer, 'load').mockImplementation(async () => SkinnedSurfer.fromScene(fakeGltfScene()));
  });
  afterEach(() => vi.restoreAllMocks());

  it('adds a view per player and removes those who left', () => {
    const scene = new Scene();
    const views = new RemoteSurferViews(scene);
    views.sync([{ id: 1, look }, { id: 2, look }]);
    expect(views.root.children).toHaveLength(2);
    expect(scene.children).toContain(views.root);
    expect(load).toHaveBeenCalledWith('assets/surfers/surfer2.glb', Infinity);
    views.sync([{ id: 2, look }]);
    expect(views.root.children).toHaveLength(1);
  });

  it('floats a remote board on this player\'s water, at its lift above it', () => {
    const views = new RemoteSurferViews(new Scene());
    views.sync([{ id: 1, look }]);
    views.update(1, riding(10, -90), () => 0.5, new Vector3(0, 5, -120));
    const view = views.root.children[0] as Group;
    expect(view.visible).toBe(true);
    const board = views.boardOf(1)!;
    expect(board.position.x).toBeCloseTo(10, 6);
    expect(board.position.y).toBeCloseTo(0.58, 6);
    expect(board.position.z).toBeCloseTo(-90, 6);
    const head = new Vector3();
    expect(views.tagAnchor(1, head)).toBe(true);
    expect(head.y).toBeGreaterThan(0.58);
  });

  // Part B: remote surfers pose from their own motion, read from their poses over the room's sea time.
  it('reads a remote surfer’s turn from its poses, and starts over after it was not drawn', () => {
    const views = new RemoteSurferViews(new Scene());
    views.sync([{ id: 1, look }]);
    for (let t = 0; t <= 0.5 + 1e-9; t += 1 / 60) {
      const state = riding(5 * Math.sin(t), 5 * Math.cos(t));
      state.heading = t;
      views.update(1, state, () => 0, new Vector3(), 10 + t);
    }
    expect(views.riderStateOf(1)!.yawRate).toBeGreaterThan(0.9);
    views.update(1, undefined, () => 0, new Vector3(), 11);
    const back = riding(0, 0);
    back.heading = 2;
    views.update(1, back, () => 0, new Vector3(), 12);
    expect(views.riderStateOf(1)!.yawRate).toBe(0);
  });

  it('hides a player with nothing to draw, and shows the board alone with no rider', () => {
    const views = new RemoteSurferViews(new Scene());
    views.sync([{ id: 1, look }]);
    views.update(1, undefined, () => 0, new Vector3());
    expect(views.root.children[0].visible).toBe(false);
    expect(views.tagAnchor(1, new Vector3())).toBe(false);
    const state = riding(0, -80);
    state.present = false;
    views.update(1, state, () => 0, new Vector3());
    expect(views.root.children[0].visible).toBe(true);
    expect(views.surferOf(1)!.group.visible).toBe(false);
  });
});
