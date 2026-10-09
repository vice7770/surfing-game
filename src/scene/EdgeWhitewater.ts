import { BufferAttribute, BufferGeometry, Group, Mesh, Points, type Material } from 'three';
import { EDGE_BAND } from './water/edgeBandGlsl';

/** A drawn whitewater source (the lip sheet, the spray): in world coordinates, as the tank's water is. */
export type WhitewaterSource = Mesh<BufferGeometry, Material | Material[]> | Points<BufferGeometry, Material | Material[]>;

/**
 * The source's primitives within `reach` of a side edge, on the tank's side of it (`inward` +1 for the −x edge, −1 for
 * the +x edge): its triangles (or, for points, its points) whose every vertex lies there, as an index into its vertices.
 * Only what its draw range draws is kept.
 */
export function edgeIndex(geometry: BufferGeometry, points: boolean, edge: number, inward: 1 | -1, reach: number): Uint32Array {
  const position = geometry.getAttribute('position');
  if (!position) return new Uint32Array(0);
  const near = (vertex: number) => {
    const d = (position.getX(vertex) - edge) * inward;
    return d >= 0 && d <= reach;
  };
  const index = geometry.getIndex();
  const total = index ? index.count : position.count;
  const start = Math.max(0, geometry.drawRange.start);
  const end = Math.min(total, start + (Number.isFinite(geometry.drawRange.count) ? geometry.drawRange.count : total));
  const kept: number[] = [];
  const at = (k: number) => (index ? index.getX(k) : k);
  if (points) {
    for (let k = start; k < end; k += 1) if (near(at(k))) kept.push(at(k));
  } else {
    for (let k = start; k + 2 < end; k += 3) {
      const a = at(k);
      const b = at(k + 1);
      const c = at(k + 2);
      if (near(a) && near(b) && near(c)) kept.push(a, b, c);
    }
  }
  return Uint32Array.from(kept);
}

interface Copy {
  source: WhitewaterSource;
  inward: 1 | -1;
  object: WhitewaterSource;
}

/**
 * The tank's whitewater past its side edges (the edge band): the lip sheets and the spray drawn again, reflected across
 * each side edge, as the band draws the tank's water there. Each copy shares its source's vertices and material and
 * draws only what lies within the band's mirror (`EDGE_BAND.pure`) of that edge, so a mirrored lip covers the mirrored
 * tube it throws, and nothing floats over the water where the band hands over to the far ocean.
 */
export class EdgeWhitewater {
  readonly group = new Group();
  private readonly copies: Copy[] = [];

  constructor(sources: readonly WhitewaterSource[]) {
    this.group.name = 'edge-whitewater';
    for (const source of sources) {
      for (const inward of [1, -1] as const) {
        const geometry = new BufferGeometry();
        const object = source instanceof Points ? new Points(geometry, source.material) : new Mesh(geometry, source.material);
        object.frustumCulled = false;
        object.visible = false;
        object.renderOrder = source.renderOrder;
        // The source's per-draw state (the spray's point size from the camera) holds for its copies.
        object.onBeforeRender = (...args) => source.onBeforeRender(...args);
        this.group.add(object);
        this.copies.push({ source, inward, object });
      }
    }
  }

  /**
   * Draw the copies for the tank's side edges `layout` (none without one), after their sources have taken this
   * snapshot: each takes its source's material and vertices, and the primitives within `reach` of its edge.
   */
  update(layout: { xMin: number; xMax: number } | undefined, reach: number = EDGE_BAND.pure): void {
    for (const { source, inward, object } of this.copies) {
      if (!layout || !source.visible) {
        object.visible = false;
        continue;
      }
      const edge = inward === 1 ? layout.xMin : layout.xMax;
      const geometry = object.geometry;
      const from = source.geometry;
      for (const name of Object.keys(geometry.attributes)) if (!from.getAttribute(name)) geometry.deleteAttribute(name);
      for (const [name, attribute] of Object.entries(from.attributes)) {
        if (geometry.getAttribute(name) !== attribute) geometry.setAttribute(name, attribute);
      }
      const index = edgeIndex(from, source instanceof Points, edge, inward, reach);
      geometry.setIndex(new BufferAttribute(index, 1));
      object.material = source.material;
      object.castShadow = source.castShadow;
      // Reflected across the edge: x → 2·edge − x (three turns the faces and normals of a mirrored object).
      object.position.set(2 * edge, 0, 0);
      object.scale.set(-1, 1, 1);
      object.visible = index.length > 0;
    }
  }

  dispose(): void {
    for (const { object } of this.copies) object.geometry.dispose();
  }
}
