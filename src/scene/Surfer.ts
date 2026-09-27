import {
  BoxGeometry, CapsuleGeometry, CylinderGeometry, DoubleSide, Group, Matrix4, Mesh,
  MeshStandardMaterial, Quaternion, Shape, ShapeGeometry, SphereGeometry, Vector3,
} from 'three';
import type { BodyPart, DetachedRiderPose } from '../physics/DetachedSurfer';
import { createSurfboardGeometry } from './SurfboardGeometry';

const up = new Vector3(0, 1, 0);
const segmentDirection = new Vector3();
const detachedParts: readonly BodyPart[] = [
  'pelvis', 'torso', 'head', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg',
];

function placeSegment(mesh: Mesh, start: Vector3, end: Vector3): void {
  segmentDirection.copy(end).sub(start);
  const length = segmentDirection.length();
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(up, segmentDirection.multiplyScalar(1 / Math.max(length, 0.001)));
  mesh.scale.y = length;
}

class BentLimb {
  readonly upper: Mesh;
  readonly lower: Mesh;
  readonly joint: Mesh;
  readonly end: Mesh;

  constructor(group: Group, material: MeshStandardMaterial, endMaterial: MeshStandardMaterial,
    upperRadius: number, lowerRadius: number, leg: boolean) {
    this.upper = new Mesh(new CylinderGeometry(upperRadius * 1.12, upperRadius * 0.82, 1, 10), material);
    this.lower = new Mesh(new CylinderGeometry(lowerRadius * 1.15, lowerRadius * 0.82, 1, 10), material);
    this.joint = new Mesh(new SphereGeometry(lowerRadius * 1.28, 10, 8), material);
    this.end = new Mesh(new SphereGeometry(1, 10, 8), endMaterial);
    this.end.scale.set(leg ? 0.09 : 0.055, leg ? 0.045 : 0.065, leg ? 0.17 : 0.07);
    group.add(this.upper, this.lower, this.joint, this.end);
  }

  update(root: Vector3, hinge: Vector3, tip: Vector3): void {
    placeSegment(this.upper, root, hinge);
    placeSegment(this.lower, hinge, tip);
    this.joint.position.copy(hinge);
    this.end.position.copy(tip);
  }
}

/** The simple articulated rider: the fallen surfer's pose, and the physical rider's fallback until its skinned surfer loads (G7). */
export class Surfer {
  readonly group = new Group();
  private readonly board = new Group();
  private readonly rider = new Group();
  private readonly torso: Mesh;
  private readonly chestPanel: Mesh;
  private readonly pelvis: Mesh;
  private readonly neck: Mesh;
  private readonly head = new Group();
  private readonly arms: [BentLimb, BentLimb];
  private readonly legs: [BentLimb, BentLimb];
  private readonly detachedPoints = detachedParts.map(() => new Vector3());
  private readonly detachedRoots = Array.from({ length: 4 }, () => new Vector3());
  private readonly detachedHinges = Array.from({ length: 4 }, () => new Vector3());
  private readonly detachedAxis = new Vector3();
  private readonly detachedOffset = new Vector3();
  private readonly detachedForward = new Vector3();
  private readonly detachedRight = new Vector3();
  private readonly detachedBasis = new Matrix4();
  private readonly detachedBoardInverse = new Quaternion();

  constructor() {
    const boardMaterial = new MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.01 });
    const accent = new MeshStandardMaterial({ color: '#de7860', roughness: 0.68 });
    const pad = new MeshStandardMaterial({ color: '#244e50', roughness: 0.95 });
    const fins = new MeshStandardMaterial({ color: '#183e44', roughness: 0.55, side: DoubleSide });
    const suit = new MeshStandardMaterial({ color: '#17363e', roughness: 0.78 });
    const panel = new MeshStandardMaterial({ color: '#28565b', roughness: 0.75 });
    const skin = new MeshStandardMaterial({ color: '#c98a66', roughness: 0.86 });
    const hairMaterial = new MeshStandardMaterial({ color: '#2a2928', roughness: 0.95 });

    this.board.add(new Mesh(createSurfboardGeometry(), boardMaterial));
    const deckPad = new Mesh(new BoxGeometry(0.35, 0.012, 0.52), pad);
    deckPad.position.set(0, 0.061, -0.78);
    this.board.add(deckPad);
    for (const z of [-0.98, -0.85, -0.72]) {
      const groove = new Mesh(new BoxGeometry(0.32, 0.003, 0.016), accent);
      groove.position.set(0, 0.069, z);
      this.board.add(groove);
    }
    for (const x of [-0.095, 0.095]) {
      const stripe = new Mesh(new BoxGeometry(0.018, 0.006, 0.72), accent);
      stripe.position.set(x, 0.071, 0.57);
      this.board.add(stripe);
    }
    const finShape = new Shape();
    finShape.moveTo(-0.13, 0);
    finShape.lineTo(0.14, 0);
    finShape.quadraticCurveTo(0.035, -0.15, -0.08, -0.19);
    finShape.closePath();
    const finGeometry = new ShapeGeometry(finShape);
    finGeometry.rotateY(Math.PI / 2);
    for (const x of [-0.17, 0, 0.17]) {
      const fin = new Mesh(finGeometry, fins);
      fin.position.set(x, -0.045, x === 0 ? -0.99 : -0.82);
      fin.rotation.z = -x * 0.6;
      this.board.add(fin);
    }

    this.pelvis = new Mesh(new SphereGeometry(1, 14, 10), suit);
    this.pelvis.scale.set(0.19, 0.15, 0.15);
    this.rider.add(this.pelvis);
    this.torso = new Mesh(new CapsuleGeometry(0.18, 0.44, 6, 12), suit);
    this.torso.scale.set(1.08, 1, 0.84);
    this.rider.add(this.torso);
    this.chestPanel = new Mesh(new SphereGeometry(1, 12, 8), panel);
    this.chestPanel.scale.set(0.12, 0.22, 0.025);
    this.rider.add(this.chestPanel);
    this.neck = new Mesh(new CylinderGeometry(0.07, 0.075, 0.12, 10), skin);
    this.rider.add(this.neck);
    const face = new Mesh(new SphereGeometry(1, 16, 12), skin);
    face.scale.set(0.125, 0.16, 0.125);
    this.head.add(face);
    const hair = new Mesh(new SphereGeometry(0.129, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.54), hairMaterial);
    hair.position.y = 0.005;
    this.head.add(hair);
    const nose = new Mesh(new SphereGeometry(0.035, 8, 6), skin);
    nose.position.set(0, -0.014, 0.124);
    nose.scale.z = 0.7;
    this.head.add(nose);
    this.rider.add(this.head);

    this.arms = [
      new BentLimb(this.rider, suit, skin, 0.068, 0.052, false),
      new BentLimb(this.rider, suit, skin, 0.068, 0.052, false),
    ];
    this.legs = [
      new BentLimb(this.rider, suit, pad, 0.095, 0.064, true),
      new BentLimb(this.rider, suit, pad, 0.095, 0.064, true),
    ];
    this.group.add(this.board, this.rider);
  }

  /** Show or hide the silhouette's own board (the physical mode draws its own). */
  setBoardVisible(visible: boolean): void {
    this.board.visible = visible;
  }

  /** Render a detached physical pose without consulting either wave implementation. */
  updateDetached(pose: DetachedRiderPose, boardPosition: Readonly<Vector3>,
    boardOrientation: Readonly<Quaternion>): void {
    this.group.position.copy(boardPosition);
    this.group.quaternion.copy(boardOrientation);
    this.group.updateMatrixWorld(true);
    this.rider.position.set(0, 0, 0);
    this.rider.quaternion.identity();

    for (let index = 0; index < detachedParts.length; index += 1) {
      pose.getPartPosition(detachedParts[index], this.detachedPoints[index]);
      this.group.worldToLocal(this.detachedPoints[index]);
    }
    const points = this.detachedPoints;
    this.pelvis.position.copy(points[0]);
    this.torso.position.copy(points[1]);
    this.detachedAxis.subVectors(points[2], points[0]).normalize();
    this.detachedBoardInverse.copy(boardOrientation).invert();
    this.detachedForward.set(Math.sin(pose.heading), 0, Math.cos(pose.heading))
      .applyQuaternion(this.detachedBoardInverse);
    this.detachedForward.addScaledVector(this.detachedAxis,
      -this.detachedForward.dot(this.detachedAxis));
    if (this.detachedForward.lengthSq() < 1e-6) {
      this.detachedForward.set(Math.abs(this.detachedAxis.z) < 0.9 ? 0 : 1,
        0, Math.abs(this.detachedAxis.z) < 0.9 ? 1 : 0);
      this.detachedForward.addScaledVector(this.detachedAxis,
        -this.detachedForward.dot(this.detachedAxis));
    }
    this.detachedForward.normalize();
    this.detachedRight.crossVectors(this.detachedAxis, this.detachedForward).normalize();
    this.detachedForward.crossVectors(this.detachedRight, this.detachedAxis).normalize();
    this.detachedBasis.makeBasis(this.detachedRight, this.detachedAxis, this.detachedForward);
    this.torso.quaternion.setFromRotationMatrix(this.detachedBasis);
    this.chestPanel.position.copy(points[1]).add(
      this.detachedOffset.set(0, 0, 0.14).applyQuaternion(this.torso.quaternion),
    );
    this.chestPanel.quaternion.copy(this.torso.quaternion);
    this.neck.position.copy(points[1]).lerp(points[2], 0.65);
    this.neck.quaternion.copy(this.torso.quaternion);
    this.head.position.copy(points[2]);
    this.head.quaternion.copy(this.torso.quaternion);

    for (let side = 0; side < 2; side += 1) {
      const sign = side === 0 ? -1 : 1;
      const armRoot = this.detachedRoots[side].copy(points[1]).add(
        this.detachedOffset.set(sign * 0.16, 0.06, 0).applyQuaternion(this.torso.quaternion),
      );
      const armHinge = this.detachedHinges[side].copy(armRoot).lerp(points[3 + side], 0.5);
      this.arms[side].update(armRoot, armHinge, points[3 + side]);

      const legRoot = this.detachedRoots[side + 2].copy(points[0]).add(
        this.detachedOffset.set(sign * 0.1, -0.06, 0).applyQuaternion(this.torso.quaternion),
      );
      const legHinge = this.detachedHinges[side + 2].copy(legRoot).lerp(points[5 + side], 0.5);
      this.legs[side].update(legRoot, legHinge, points[5 + side]);
    }
  }

}
