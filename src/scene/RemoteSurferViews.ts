import { Color, Group, Mesh, Quaternion, Vector3, type Material, type Scene } from 'three';
import { SUIT_COLORS, outfitFor } from '../game/SurferChoice';
import { buildBoardShape } from '../physics/boardShape';
import type { RemoteState } from '../net/RemoteSurfers';
import { surferFor, type PlayerLook } from '../net/protocol';
import { deckHeight } from '../physics/riderPosture';
import { LEASH_BITS, RIDER_PHASES, RIDER_SNAPSHOT, SWIM_BITS } from '../wave/SurfZoneRunner';
import { createBoardMesh } from './BoardMesh';
import { BOARD_DESIGNS } from './board/boardDesigns';
import { LeashCord } from './board/LeashCord';
import { SurferView } from './character/SurferView';
import { RiderMotion } from './rig/riderMotion';
import { POINT, createRiderVisualState, readRiderSnapshot, type RiderVisualState } from './rig/riderVisualState';

const SHAPE = buildBoardShape();
/** The tail plug in the board's frame, from its centre of mass (the pose's position), where the physics places it. */
const PLUG = (() => {
  const z = -SHAPE.length / 2 + 0.05;
  const c = SHAPE.centerOfMass;
  return new Vector3(-c.x, deckHeight(SHAPE, z) - c.y, z - c.z);
})();
const turn = new Quaternion();
const plugAt = new Vector3();

/** A remote pose's board pose (position, then quaternion x y z w, then 1) on this water, its height from `surfaceAt` (spec N1). */
export function remoteBoardPose(state: RemoteState, surfaceAt: (x: number, z: number) => number, out: Float64Array): Float64Array {
  out[0] = state.x;
  out[1] = surfaceAt(state.x, state.z) + state.lift;
  out[2] = state.z;
  for (let i = 0; i < 4; i += 1) out[3 + i] = state.quaternion[i];
  out[7] = 1;
  return out;
}

/**
 * The drawn rider of a remote pose on its board pose (`board`, from
 * `remoteBoardPose`): the snapshot's rider array rebuilt in `rider` from what
 * the pose carries, and read into `out` (spec N1; the body film's remote drawer
 * uses the same). What is not sent is drawn as at rest: the breath is full.
 */
export function remoteRiderState(state: RemoteState, board: Float64Array, rider: Float64Array, out: RiderVisualState): RiderVisualState {
  for (let i = 0; i < 21; i += 1) rider[RIDER_SNAPSHOT.points + i] = board[i % 3] + state.points[i];
  rider[RIDER_SNAPSHOT.phase] = state.phase;
  rider[RIDER_SNAPSHOT.present] = 1;
  rider[RIDER_SNAPSHOT.heading] = state.heading;
  // The wipeout spec: the duck-dive, the leash's plug and bits, and the swimmer, from the pose's flags.
  const fallen = state.phase === RIDER_PHASES.indexOf('fallen');
  rider[RIDER_SNAPSHOT.duck] = state.ducking ? 1 : 0;
  // Another player's breath is not sent: drawn as full.
  rider[RIDER_SNAPSHOT.breath] = 1;
  turn.set(board[3], board[4], board[5], board[6]);
  plugAt.copy(PLUG).applyQuaternion(turn);
  plugAt.x += board[0];
  plugAt.y += board[1];
  plugAt.z += board[2];
  plugAt.toArray(rider, RIDER_SNAPSHOT.plug);
  rider[RIDER_SNAPSHOT.leash] = state.leashSnapped ? LEASH_BITS.snapped : LEASH_BITS.worn;
  rider[RIDER_SNAPSHOT.swim] = fallen ? (state.diving ? SWIM_BITS.diving : state.paddling ? SWIM_BITS.stroking : 0) : 0;
  readRiderSnapshot(rider, board, out);
  out.stroking = state.paddling && out.phase === 'prone' ? 1 : 0;
  return out;
}

/** The tag floats this far above the head, m. */
const TAG_ABOVE_HEAD = 0.45;
/** With no rider drawn, the tag floats this far above the board, m. */
const TAG_ABOVE_BOARD = 1.2;

interface RemoteView {
  group: Group;
  board: Group;
  surfer: SurferView;
  /** The rider's leash, from the back (right, regular) foot to the tail plug. */
  leash: LeashCord;
  look: string;
  state: RiderVisualState;
  /** How the remote board moves, read from its poses (Part B). */
  motion: RiderMotion;
  /** A snapshot's rider and board arrays, rebuilt from the remote pose. */
  rider: Float64Array;
  pose: Float64Array;
  shown: boolean;
}

function disposeMeshes(root: Group, geometries: boolean): void {
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    if (geometries) object.geometry.dispose();
    for (const material of ([] as Material[]).concat(object.material)) material.dispose();
  });
}

/**
 * The other players' surfers (spec N1): each in their chosen body, outfit and
 * board, their board floated on this player's own water at the height it rode
 * above its owner's, and the rider drawn around it from the seven points.
 */
export class RemoteSurferViews {
  readonly root = new Group();
  private readonly views = new Map<number, RemoteView>();
  private readonly shape = SHAPE;
  private detail?: { lodDistance: number; textureCap: number };

  constructor(scene: Scene) {
    this.root.name = 'remote-surfers';
    scene.add(this.root);
  }

  /** Makes views for new players, redresses changed ones, and drops those who left. */
  sync(players: readonly { id: number; look: PlayerLook }[]): void {
    const present = new Set(players.map((player) => player.id));
    for (const [id, view] of this.views) {
      if (!present.has(id)) this.remove(id, view);
    }
    for (const { id, look } of players) {
      const key = JSON.stringify(look);
      const existing = this.views.get(id);
      if (existing?.look === key) continue;
      if (existing) this.remove(id, existing);
      this.views.set(id, this.create(look, key));
    }
  }

  private create(look: PlayerLook, key: string): RemoteView {
    const choice = surferFor(look);
    const design = BOARD_DESIGNS.find((candidate) => candidate.id === choice.board) ?? BOARD_DESIGNS[0];
    const board = createBoardMesh(this.shape, design);
    const surfer = new SurferView();
    if (this.detail) surfer.setDetail(this.detail.lodDistance, this.detail.textureCap);
    surfer.dress(outfitFor(choice), { accent: new Color(SUIT_COLORS[choice.color]) });
    void surfer.load(choice.body);
    const leash = new LeashCord();
    const group = new Group();
    group.add(board, surfer.group, leash.object);
    group.visible = false;
    this.root.add(group);
    const pose = new Float64Array(8);
    pose[7] = 1;
    return {
      group, board, surfer, leash, look: key, state: createRiderVisualState(), motion: new RiderMotion(), rider: new Float64Array(RIDER_SNAPSHOT.length), pose, shown: false,
    };
  }

  private remove(id: number, view: RemoteView): void {
    this.root.remove(view.group);
    disposeMeshes(view.board, true);
    // The skinned body shares its geometry with every surfer on the same model: only its own materials go.
    disposeMeshes(view.surfer.group, false);
    this.views.delete(id);
  }

  /**
   * Draws player `id` as `state` (undefined: nothing to draw) on this water (`surfaceAt`), seen from `camera`, at
   * the room's sea `time`, s, which times the rider's motion.
   */
  update(id: number, state: RemoteState | undefined, surfaceAt: (x: number, z: number) => number, camera: Vector3, time = Number.NaN): void {
    const view = this.views.get(id);
    if (!view) return;
    view.shown = Boolean(state?.boardPresent);
    view.group.visible = view.shown;
    if (!state || !view.shown) {
      view.motion.reset();
      return;
    }
    const { pose, rider } = view;
    remoteBoardPose(state, surfaceAt, pose);
    view.board.position.set(pose[0], pose[1], pose[2]);
    view.board.quaternion.set(pose[3], pose[4], pose[5], pose[6]);
    view.surfer.group.visible = state.present;
    view.leash.object.visible = state.present;
    if (!state.present) {
      view.motion.reset();
      return;
    }
    remoteRiderState(state, pose, rider, view.state);
    view.motion.update(view.state, time);
    view.state.clock = performance.now() / 1000;
    view.surfer.update(view.state, camera);
    view.leash.update(view.state.points[POINT.rightFoot], view.state.leash.plug, { snapped: view.state.leash.snapped });
  }

  /** Player `id`'s drawn rider state, if it has a view. */
  riderStateOf(id: number): RiderVisualState | undefined {
    return this.views.get(id)?.state;
  }

  /** Where player `id`'s name tag floats: above the head, or above a riderless board; false when not drawn. */
  tagAnchor(id: number, out: Vector3): boolean {
    const view = this.views.get(id);
    if (!view?.shown) return false;
    if (view.surfer.group.visible) {
      out.copy(view.state.points[POINT.head]);
      out.y += TAG_ABOVE_HEAD;
    } else {
      out.copy(view.board.position);
      out.y += TAG_ABOVE_BOARD;
    }
    return true;
  }

  /** The graphics preset's level of detail, for every remote surfer. */
  setDetail(lodDistance: number, textureCap: number): void {
    this.detail = { lodDistance, textureCap };
    for (const view of this.views.values()) view.surfer.setDetail(lodDistance, textureCap);
  }

  setVisible(visible: boolean): void {
    this.root.visible = visible;
  }

  boardOf(id: number): Group | undefined {
    return this.views.get(id)?.board;
  }

  surferOf(id: number): SurferView | undefined {
    return this.views.get(id)?.surfer;
  }

  dispose(): void {
    for (const [id, view] of this.views) this.remove(id, view);
    this.root.removeFromParent();
  }
}
