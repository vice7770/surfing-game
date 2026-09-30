import { BoxGeometry, Color, Group, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';

/** The pool's outline in the world, m: its side walls at x = xMin and xMax, the machine's wall at zBack, and the deck's edge at zFront. */
export interface PoolBounds {
  xMin: number;
  xMax: number;
  zBack: number;
  zFront: number;
  /** The deck's height above the still water, m. */
  deck: number;
  /** How deep the walls reach below the still water, m. */
  floor: number;
}

/** The deck's concrete ring around the pool, m wide; the ground runs on beyond it. */
const DECK_WIDTH = 30;
/** The ground beyond the deck reaches this far, m: past the far field's view. */
const GROUND_REACH = 1500;
/** The wave machine's hall behind its wall: depth across the pool's width, height, m. */
const HALL = { depth: 24, height: 9, overhang: 6 };
/** Louvres along the hall's pool side: how many, and the band they fill from its base, as shares of its height. */
const LOUVRES = { count: 7, from: 0.35, to: 0.9 };

/**
 * The Wave Pool's surroundings (the movement-flow spec): concrete walls down to the pool floor along its sides
 * and at the machine's end, a deck around it, the ground beyond, and one plain hall for the wave machine with its
 * louvres facing the water, as in the user's clip. No crowd or props. Drawn only: the solver's side edges absorb the
 * waves, as a real pool is built to.
 */
export class PoolScenery {
  readonly group = new Group();
  private readonly concrete = new MeshStandardMaterial({ color: new Color('#cfcac0'), roughness: 0.9 });
  private readonly wall = new MeshStandardMaterial({ color: new Color('#bfc7c6'), roughness: 0.85 });
  private readonly ground = new MeshStandardMaterial({ color: new Color('#8f9a74'), roughness: 1 });
  private readonly hall = new MeshStandardMaterial({ color: new Color('#e8e1d2'), roughness: 0.8 });
  private readonly louvre = new MeshStandardMaterial({ color: new Color('#7d8586'), roughness: 0.6 });

  constructor() {
    this.group.visible = false;
    this.group.name = 'pool-scenery';
  }

  /** Build the walls, deck, ground and hall around `bounds`, and show them. */
  show(bounds: PoolBounds): void {
    this.clear();
    const { xMin, xMax, zBack, zFront, deck, floor } = bounds;
    const width = xMax - xMin;
    const length = zFront - zBack;
    const midX = (xMin + xMax) / 2;
    const midZ = (zBack + zFront) / 2;
    const wallHeight = deck + floor;
    const wallY = deck - wallHeight / 2;
    // The walls: 0.4 m thick, from the pool floor to the deck, just outside the water.
    this.box(this.wall, 0.4, wallHeight, length, xMin - 0.2, wallY, midZ);
    this.box(this.wall, 0.4, wallHeight, length, xMax + 0.2, wallY, midZ);
    this.box(this.wall, width + 0.8, wallHeight, 0.4, midX, wallY, zBack - 0.2);
    // The deck's ring, and the ground past it, both a little under the deck so the coping reads as an edge.
    const outer = { xMin: xMin - DECK_WIDTH, xMax: xMax + DECK_WIDTH, zBack: zBack - HALL.depth - DECK_WIDTH, zFront: zFront + DECK_WIDTH };
    this.slab(this.concrete, outer.xMin, xMin - 0.4, outer.zBack, outer.zFront, deck);
    this.slab(this.concrete, xMax + 0.4, outer.xMax, outer.zBack, outer.zFront, deck);
    this.slab(this.concrete, xMin - 0.4, xMax + 0.4, outer.zBack, zBack - 0.4, deck);
    this.slab(this.concrete, xMin - 0.4, xMax + 0.4, zFront, outer.zFront, deck);
    this.slab(this.ground, -GROUND_REACH, outer.xMin, -GROUND_REACH, GROUND_REACH, deck - 0.05);
    this.slab(this.ground, outer.xMax, GROUND_REACH, -GROUND_REACH, GROUND_REACH, deck - 0.05);
    this.slab(this.ground, outer.xMin, outer.xMax, -GROUND_REACH, outer.zBack, deck - 0.05);
    this.slab(this.ground, outer.xMin, outer.xMax, outer.zFront, GROUND_REACH, deck - 0.05);
    // The machine's hall behind its wall, overhanging the deck a little, its louvres facing the water.
    const hallWidth = width + 2 * HALL.overhang;
    const hallZ = zBack - 0.4 - HALL.depth / 2;
    this.box(this.hall, hallWidth, HALL.height, HALL.depth, midX, deck + HALL.height / 2, hallZ);
    const face = zBack - 0.35;
    for (let k = 0; k < LOUVRES.count; k += 1) {
      const y = deck + HALL.height * (LOUVRES.from + ((LOUVRES.to - LOUVRES.from) * (k + 0.5)) / LOUVRES.count);
      this.box(this.louvre, hallWidth - 2, 0.18, 0.5, midX, y, face);
    }
    this.group.visible = true;
  }

  hide(): void {
    this.clear();
    this.group.visible = false;
  }

  private box(material: MeshStandardMaterial, sx: number, sy: number, sz: number, x: number, y: number, z: number): void {
    const mesh = new Mesh(new BoxGeometry(sx, sy, sz), material);
    mesh.position.set(x, y, z);
    this.group.add(mesh);
  }

  /** A level slab at height y over x0…x1 × z0…z1. */
  private slab(material: MeshStandardMaterial, x0: number, x1: number, z0: number, z1: number, y: number): void {
    if (x1 <= x0 || z1 <= z0) return;
    const mesh = new Mesh(new PlaneGeometry(x1 - x0, z1 - z0), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    this.group.add(mesh);
  }

  private clear(): void {
    for (const child of [...this.group.children]) {
      this.group.remove(child);
      (child as Mesh).geometry.dispose();
    }
  }
}
