import { Group, Scene, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RIDER_PHASES, RIDER_SNAPSHOT } from '../wave/SurfZoneRunner';
import { createRemoteState, type RemoteState } from '../net/RemoteSurfers';
import { SkinnedSurfer } from './character/SkinnedSurfer';
import { fakeGltfScene } from './character/testSurferScene';
import { REMOTE_HEAD_UNDER, REMOTE_HOLD, RemoteSurferViews, remoteBoardPose, remoteRiderState } from './RemoteSurferViews';
import { createRiderVisualState } from './rig/riderVisualState';

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
    // Back within a metre of where it was last drawn, so only the gap (not a jump) can start the motion over.
    const back = riding(5 * Math.sin(0.5) + 0.5, 5 * Math.cos(0.5));
    back.heading = 2;
    views.update(1, back, () => 0, new Vector3(), 11.02);
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

  // The phase 5 physics plan, item 2.11: another player's swimmer holds its breath with its head under this player's own
  // sea (no wire bit), so it turns its head to breathe only once up.
  it('reads a remote swimmer\'s head under water from this player\'s own sea', () => {
    const state = createRemoteState();
    Object.assign(state, { x: 3, z: -4, lift: 0, present: true, boardPresent: true, phase: RIDER_PHASES.indexOf('fallen') });
    // A swell's slope: the surface 0.4 m higher 2 m along +x.
    const surfaceAt = (x: number) => 0.2 * (x - 3);
    const board = remoteBoardPose(state, surfaceAt, new Float64Array(8));
    const rider = new Float64Array(RIDER_SNAPSHOT.length);
    const head = (x: number, y: number, fallen = true) => {
      state.points.fill(0);
      state.phase = RIDER_PHASES.indexOf(fallen ? 'fallen' : 'prone');
      state.points[6] = x;
      state.points[7] = y;
      return remoteRiderState(state, board, rider, createRiderVisualState(), surfaceAt).swim.under;
    };
    expect(head(0, -0.3)).toBe(true);
    expect(head(0, -REMOTE_HEAD_UNDER + 0.01)).toBe(false);
    expect(head(0, 0.2)).toBe(false);
    // Where the swell stands higher, the same head is under.
    expect(head(1, -0.05)).toBe(true);
    expect(head(0, -0.3, false)).toBe(false);
    // With no sea to read (as before), never.
    state.phase = RIDER_PHASES.indexOf('fallen');
    state.points[7] = -0.3;
    expect(remoteRiderState(state, board, rider, createRiderVisualState()).swim.under).toBe(false);
    // The views read it on this player's water.
    const views = new RemoteSurferViews(new Scene());
    views.sync([{ id: 1, look }]);
    views.update(1, state, surfaceAt, new Vector3());
    expect(views.riderStateOf(1)!.swim.under).toBe(true);
  });

  // The animation-realism plan's phase 4 (wire flag 128): another player's reel and climb.
  it('draws a recovering swimmer holding the board by it, and reeling the leash in off it; neither without the flag', () => {
    const state = createRemoteState();
    Object.assign(state, { x: 0, z: 0, lift: 0, present: true, boardPresent: true, phase: RIDER_PHASES.indexOf('fallen') });
    const board = remoteBoardPose(state, () => 0, new Float64Array(8));
    const rider = new Float64Array(RIDER_SNAPSHOT.length);
    const at = (chestX: number, recovering: boolean) => {
      state.points.fill(0);
      // The chest point (the torso) `chestX` m off the board's centre, across it.
      state.points[3] = chestX;
      state.recovering = recovering;
      return remoteRiderState(state, board, rider, createRiderVisualState());
    };
    const holding = at(0.25 + REMOTE_HOLD / 2, true);
    expect(holding.swim.holding).toBe(true);
    expect(holding.leash.reeling).toBe(false);
    const reeling = at(2, true);
    expect(reeling.swim.holding).toBe(false);
    expect(reeling.leash.reeling).toBe(true);
    const neither = at(0.4, false);
    expect(neither.swim.holding).toBe(false);
    expect(neither.leash.reeling).toBe(false);
    // A snapped leash reels nothing.
    state.leashSnapped = true;
    expect(at(2, true).leash.reeling).toBe(false);
  });
});
