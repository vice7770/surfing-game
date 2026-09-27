import { BufferAttribute, BufferGeometry, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { LEASH } from '../../physics/Leash';

/** Samples along the cord, the vertices round it, and its radius, m (a 7 mm urethane cord). */
const SAMPLES = 13;
const SIDES = 5;
const RADIUS = 0.0035;
/** A snapped cord hangs this long from the plug, m. */
const STUB = 0.3;

/** How the cord is drawn this frame: snapped, and the hand pulling it in (reeling), if any. */
export interface LeashDraw {
  snapped: boolean;
  hand?: Vector3;
}

/**
 * The leash drawn (the wipeout spec; G7's "drawn once the physics has it"): a
 * thin tube from the ankle (or the hand reeling it in) to the tail plug. Slack,
 * it sags as a parabola as deep as a cord of its length can hang between its
 * ends; taut it runs straight; snapped, a short stub hangs from the plug. The
 * shape is drawn, not simulated: the physics' leash is a straight tether.
 */
export class LeashCord {
  readonly object: Mesh<BufferGeometry, MeshStandardMaterial>;
  /** The cord's centreline this frame, ankle (or hand) to plug. */
  readonly points: Vector3[] = Array.from({ length: SAMPLES }, () => new Vector3());
  private readonly positions = new Float32Array(SAMPLES * SIDES * 3);
  private readonly tangent = new Vector3();
  private readonly side = new Vector3();
  private readonly normal = new Vector3();
  private readonly ring = new Vector3();

  constructor() {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(this.positions, 3));
    const index: number[] = [];
    for (let i = 0; i < SAMPLES - 1; i += 1) {
      for (let j = 0; j < SIDES; j += 1) {
        const a = i * SIDES + j;
        const b = i * SIDES + ((j + 1) % SIDES);
        index.push(a, a + SIDES, b, b, a + SIDES, b + SIDES);
      }
    }
    geometry.setIndex(index);
    this.object = new Mesh(geometry, new MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.45, metalness: 0 }));
    this.object.name = 'leash';
    this.object.frustumCulled = false;
  }

  update(ankle: Vector3, plug: Vector3, draw: LeashDraw): void {
    const { points } = this;
    if (draw.snapped) {
      for (let i = 0; i < SAMPLES; i += 1) points[i].copy(plug).setY(plug.y - (STUB * (SAMPLES - 1 - i)) / (SAMPLES - 1));
    } else {
      const from = draw.hand ?? ankle;
      const distance = from.distanceTo(plug);
      const sag = distance < LEASH.length ? Math.sqrt(LEASH.length * LEASH.length - distance * distance) / 2 : 0;
      for (let i = 0; i < SAMPLES; i += 1) {
        const s = i / (SAMPLES - 1);
        points[i].lerpVectors(from, plug, s);
        points[i].y -= sag * 4 * s * (1 - s);
      }
    }
    this.buildTube();
  }

  /** A ring of SIDES vertices round each sample, across the cord's direction there. */
  private buildTube(): void {
    const { points, positions, tangent, side, normal, ring } = this;
    for (let i = 0; i < SAMPLES; i += 1) {
      tangent.subVectors(points[Math.min(SAMPLES - 1, i + 1)], points[Math.max(0, i - 1)]);
      if (tangent.lengthSq() < 1e-12) tangent.set(0, 1, 0);
      tangent.normalize();
      side.set(0, 1, 0).cross(tangent);
      if (side.lengthSq() < 1e-8) side.set(1, 0, 0).cross(tangent);
      side.normalize();
      normal.crossVectors(tangent, side);
      for (let j = 0; j < SIDES; j += 1) {
        const angle = (2 * Math.PI * j) / SIDES;
        ring.copy(points[i]).addScaledVector(side, RADIUS * Math.cos(angle)).addScaledVector(normal, RADIUS * Math.sin(angle));
        ring.toArray(positions, (i * SIDES + j) * 3);
      }
    }
    const geometry = this.object.geometry;
    geometry.getAttribute('position').needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  }
}
