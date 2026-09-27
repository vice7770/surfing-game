import { Color, Group, Mesh, type Material, type Scene, type Vector3 } from 'three';
import { SUIT_COLORS, outfitFor } from '../game/SurferChoice';
import { buildBoardShape } from '../physics/boardShape';
import type { RemoteState } from '../net/RemoteSurfers';
import { surferFor, type PlayerLook } from '../net/protocol';
import { RIDER_SNAPSHOT } from '../wave/SurfZoneRunner';
import { createBoardMesh } from './BoardMesh';
import { BOARD_DESIGNS } from './board/boardDesigns';
import { SurferView } from './character/SurferView';
import { POINT, createRiderVisualState, readRiderSnapshot, type RiderVisualState } from './rig/riderVisualState';

/** The tag floats this far above the head, m. */
const TAG_ABOVE_HEAD = 0.45;
/** With no rider drawn, the tag floats this far above the board, m. */
const TAG_ABOVE_BOARD = 1.2;

interface RemoteView {
  group: Group;
  board: Group;
  surfer: SurferView;
  look: string;
  state: RiderVisualState;
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
  private readonly shape = buildBoardShape();
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
    const group = new Group();
    group.add(board, surfer.group);
    group.visible = false;
    this.root.add(group);
    const pose = new Float64Array(8);
    pose[7] = 1;
    return { group, board, surfer, look: key, state: createRiderVisualState(), rider: new Float64Array(RIDER_SNAPSHOT.length), pose, shown: false };
  }

  private remove(id: number, view: RemoteView): void {
    this.root.remove(view.group);
    disposeMeshes(view.board, true);
    // The skinned body shares its geometry with every surfer on the same model: only its own materials go.
    disposeMeshes(view.surfer.group, false);
    this.views.delete(id);
  }

  /** Draws player `id` as `state` (undefined: nothing to draw) on this water (`surfaceAt`), seen from `camera`. */
  update(id: number, state: RemoteState | undefined, surfaceAt: (x: number, z: number) => number, camera: Vector3): void {
    const view = this.views.get(id);
    if (!view) return;
    view.shown = Boolean(state?.boardPresent);
    view.group.visible = view.shown;
    if (!state || !view.shown) return;
    const { pose, rider } = view;
    pose[0] = state.x;
    pose[1] = surfaceAt(state.x, state.z) + state.lift;
    pose[2] = state.z;
    for (let i = 0; i < 4; i += 1) pose[3 + i] = state.quaternion[i];
    view.board.position.set(pose[0], pose[1], pose[2]);
    view.board.quaternion.set(pose[3], pose[4], pose[5], pose[6]);
    view.surfer.group.visible = state.present;
    if (!state.present) return;
    for (let i = 0; i < 21; i += 1) rider[RIDER_SNAPSHOT.points + i] = pose[i % 3] + state.points[i];
    rider[RIDER_SNAPSHOT.phase] = state.phase;
    rider[RIDER_SNAPSHOT.present] = 1;
    rider[RIDER_SNAPSHOT.heading] = state.heading;
    readRiderSnapshot(rider, pose, view.state);
    view.state.stroking = state.paddling && view.state.phase === 'prone' ? 1 : 0;
    view.surfer.update(view.state, camera);
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
