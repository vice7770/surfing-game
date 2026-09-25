import {
  BoxGeometry, CapsuleGeometry, CylinderGeometry, DoubleSide, Euler, Group, Mesh,
  MeshStandardMaterial, Quaternion, Shape, ShapeGeometry, SphereGeometry, Vector3,
} from 'three';
import type { BoardPhysics } from '../physics/BoardPhysics';
import { createSurfboardGeometry } from './SurfboardGeometry';

type Point = readonly [number, number, number];
const up = new Vector3(0, 1, 0);
const segmentDirection = new Vector3();

function posePoint(out: Vector3, prone: Point, standing: Point, blend: number): void {
  out.set(
    prone[0] + (standing[0] - prone[0]) * blend,
    prone[1] + (standing[1] - prone[1]) * blend,
    prone[2] + (standing[2] - prone[2]) * blend,
  );
}

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

/** Articulated silhouette and state-driven poses; board forces still come from BoardPhysics. */
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
  private readonly joints = Array.from({ length: 12 }, () => new Vector3());
  private poseBlend = 0;
  private fallBlend = 0;

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

  resetPose(): void {
    this.poseBlend = 0;
    this.fallBlend = 0;
  }

  update(physics: BoardPhysics, paddle: boolean, dt: number): void {
    this.group.position.copy(physics.position);
    this.group.rotation.copy(physics.rotation);
    const standing = physics.state === 'catching' || physics.state === 'riding'
      || physics.state === 'complete' || physics.state === 'wipeout';
    this.poseBlend += ((standing ? 1 : 0) - this.poseBlend) * Math.min(1, dt * 7);
    this.fallBlend += ((physics.state === 'wipeout' ? 1 : 0) - this.fallBlend) * Math.min(1, dt * 3);
    const blend = this.poseBlend;
    const lean = physics.riderLean * blend;
    const fallSide = Math.sign(physics.rotation.z || 1);
    const stroke = paddle && !standing ? Math.sin(physics.time * 10) : 0;
    this.rider.position.set(lean * 0.1 + fallSide * this.fallBlend * 0.65,
      (paddle ? 0.012 * Math.sin(physics.time * 12) : 0) - this.fallBlend * 0.16, 0);
    this.rider.rotation.x = -physics.rotation.x * 0.55 * blend - 0.03 * (1 - blend);
    this.rider.rotation.z = -physics.rotation.z * 0.25 * blend + lean * 0.19 + fallSide * this.fallBlend * 1.25;

    this.pelvis.position.set(0, 0.2 + blend * 0.37, -0.35 + blend * 0.25);
    this.torso.position.set(0, 0.28 + blend * 0.57, -0.03);
    this.torso.rotation.x = (Math.PI / 2 - 0.1) * (1 - blend) + 0.12 * blend;
    this.torso.rotation.z = lean * 0.13;
    this.chestPanel.position.set(0, 0.29 + blend * 0.56, 0.14 - blend * 0.008);
    this.chestPanel.rotation.x = this.torso.rotation.x;
    this.neck.position.set(0, 0.32 + blend * 0.75, 0.43 - blend * 0.38);
    this.neck.rotation.x = this.torso.rotation.x * 0.35;
    this.head.position.set(lean * 0.035, 0.39 + blend * 0.81, 0.49 - blend * 0.43);
    this.head.rotation.x = -0.14 * (1 - blend) + 0.05 * blend;

    const j = this.joints;
    posePoint(j[0], [-0.19, 0.28, 0.3], [-0.2, 1.03, 0.05], blend);
    posePoint(j[1], [-0.31, 0.19, 0.46], [-0.45, 0.77, 0.22], blend);
    posePoint(j[2], [-0.37, 0.13, 0.17], [-0.26, 0.62, 0.36], blend);
    j[1].z += stroke * 0.09 * (1 - blend);
    j[2].z += stroke * 0.24 * (1 - blend);
    posePoint(j[3], [0.19, 0.28, 0.3], [0.2, 1.03, 0.05], blend);
    posePoint(j[4], [0.31, 0.19, 0.46], [0.45, 0.79, -0.08], blend);
    posePoint(j[5], [0.37, 0.13, 0.17], [0.48, 0.63, -0.26], blend);
    j[4].z -= stroke * 0.09 * (1 - blend);
    j[5].z -= stroke * 0.24 * (1 - blend);
    this.arms[0].update(j[0], j[1], j[2]);
    this.arms[1].update(j[3], j[4], j[5]);

    posePoint(j[6], [-0.13, 0.2, -0.44], [-0.13, 0.54, -0.15], blend);
    posePoint(j[7], [-0.13, 0.16, -0.73], [-0.22, 0.3, 0.25], blend);
    posePoint(j[8], [-0.13, 0.1, -1.01], [-0.2, 0.1, 0.5], blend);
    posePoint(j[9], [0.13, 0.2, -0.44], [0.13, 0.54, -0.15], blend);
    posePoint(j[10], [0.13, 0.16, -0.73], [0.21, 0.31, -0.39], blend);
    posePoint(j[11], [0.13, 0.1, -1.01], [0.2, 0.1, -0.62], blend);
    this.legs[0].update(j[6], j[7], j[8]);
    this.legs[1].update(j[9], j[10], j[11]);
    if (physics.riderFall.active) {
      const boardInverse = new Quaternion().setFromEuler(physics.rotation).invert();
      const fallRotation = new Quaternion().setFromEuler(new Euler(
        physics.riderFall.rotation.x, 0, physics.riderFall.rotation.z, 'YXZ',
      ));
      const riderOrigin = physics.riderFall.position.clone().sub(
        new Vector3(0, 0.65, 0).applyQuaternion(fallRotation),
      );
      this.rider.position.copy(riderOrigin.sub(physics.position).applyQuaternion(boardInverse));
      this.rider.quaternion.copy(boardInverse.multiply(fallRotation));
    }
  }
}
