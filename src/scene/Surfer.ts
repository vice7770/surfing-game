import {
  CapsuleGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  CylinderGeometry,
} from 'three';
import type { BoardPhysics } from '../physics/BoardPhysics';

export class Surfer {
  readonly group = new Group();
  private readonly board = new Group();
  private readonly boardMesh: Mesh;
  private readonly rider = new Group();
  private readonly torso: Mesh;
  private readonly head: Mesh;
  private readonly arms: Mesh[] = [];
  private readonly legs: Mesh[] = [];

  constructor() {
    const boardMaterial = new MeshStandardMaterial({ color: '#f7f0db', roughness: 0.34, metalness: 0.02 });
    const railMaterial = new MeshStandardMaterial({ color: '#ef7456', roughness: 0.4 });
    const suitMaterial = new MeshStandardMaterial({ color: '#102b35', roughness: 0.75 });
    const skinMaterial = new MeshStandardMaterial({ color: '#d79567', roughness: 0.8 });

    const boardGeometry = new CapsuleGeometry(0.2, 2.15, 5, 14);
    boardGeometry.rotateX(Math.PI / 2);
    boardGeometry.scale(1, 0.16, 1);
    this.boardMesh = new Mesh(boardGeometry, boardMaterial);
    this.boardMesh.position.y = 0.02;
    this.board.add(this.boardMesh);

    const stripe = new Mesh(new CylinderGeometry(0.022, 0.022, 1.8, 8), railMaterial);
    stripe.rotation.x = Math.PI / 2;
    stripe.position.set(0, 0.035, 0);
    this.board.add(stripe);

    this.torso = new Mesh(new CapsuleGeometry(0.13, 0.48, 4, 8), suitMaterial);
    this.torso.position.set(0, 0.56, -0.06);
    this.torso.rotation.x = Math.PI / 2.8;
    this.rider.add(this.torso);
    this.head = new Mesh(new SphereGeometry(0.13, 12, 10), skinMaterial);
    this.head.position.set(0, 0.94, 0.04);
    this.rider.add(this.head);
    const arm = new Mesh(new CylinderGeometry(0.045, 0.06, 0.54, 8), suitMaterial);
    arm.position.set(-0.23, 0.52, 0.1);
    arm.rotation.z = -0.75;
    arm.rotation.x = -0.38;
    this.rider.add(arm);
    this.arms.push(arm);
    const otherArm = arm.clone();
    otherArm.position.x = 0.23;
    otherArm.rotation.z = 0.75;
    this.rider.add(otherArm);
    this.arms.push(otherArm);
    const leg = new Mesh(new CylinderGeometry(0.06, 0.045, 0.52, 8), suitMaterial);
    leg.position.set(-0.11, 0.28, -0.23);
    leg.rotation.x = -0.45;
    this.rider.add(leg);
    this.legs.push(leg);
    const otherLeg = leg.clone();
    otherLeg.position.x = 0.11;
    this.rider.add(otherLeg);
    this.legs.push(otherLeg);

    this.group.add(this.board, this.rider);
  }

  update(physics: BoardPhysics, paddle: boolean): void {
    this.group.position.copy(physics.position);
    this.group.rotation.copy(physics.rotation);
    const standing = physics.state === 'catching' || physics.state === 'riding' || physics.state === 'complete';
    const blend = standing ? 1 : 0;
    this.rider.position.y = (paddle ? 0.02 * Math.sin(physics.time * 13) : 0) + blend * 0.025;
    this.rider.rotation.x = paddle && !standing ? -0.12 : 0;

    // Pop from prone into a low, balanced surf stance as soon as the wave is caught.
    this.torso.position.set(0, 0.56 + blend * 0.03, -0.06);
    this.torso.rotation.x = (Math.PI / 2.8) * (1 - blend) + 0.12 * blend;
    this.head.position.set(0, 0.94 + blend * 0.13, 0.04);
    this.arms[0].position.set(-0.23 - blend * 0.05, 0.52 + blend * 0.1, 0.1);
    this.arms[0].rotation.set(-0.38 * (1 - blend), 0, -0.75 + blend * 0.25);
    this.arms[1].position.set(0.23 + blend * 0.05, 0.52 + blend * 0.1, 0.1);
    this.arms[1].rotation.set(-0.38 * (1 - blend), 0, 0.75 - blend * 0.25);
    this.legs[0].position.set(-0.13, 0.28, -0.23 + blend * 0.12);
    this.legs[0].rotation.x = -0.45 * (1 - blend) + 0.18 * blend;
    this.legs[1].position.set(0.13, 0.28, -0.23 - blend * 0.12);
    this.legs[1].rotation.x = -0.45 * (1 - blend) - 0.18 * blend;
  }
}
