import { Box3, Mesh, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { buildBoardShape } from '../physics/boardShape';
import { createBoardMesh } from './BoardMesh';
import { BOARD_DESIGNS } from './board/boardDesigns';

describe('physical board mesh', () => {
  const shape = buildBoardShape();
  const group = createBoardMesh(shape);

  it('draws the physical hull at its size, placed about the board’s centre of mass', () => {
    const box = new Box3().setFromObject(group.children[0]);
    const size = box.getSize(new Vector3());
    expect(size.z).toBeCloseTo(shape.length, 6);
    expect(size.x).toBeCloseTo(shape.maxWidth, 2);
    expect(size.x).toBeLessThanOrEqual(shape.maxWidth + 1e-9);
    // The lowest bottom point is at y = 0 in the shape frame, so the centre of mass sits that far above it.
    expect(box.min.y).toBeCloseTo(-shape.centerOfMass.y, 4);
    expect(box.min.z).toBeCloseTo(-shape.length / 2 - shape.centerOfMass.z, 6);
  });

  it('closes the hull with outward faces', () => {
    const mesh = group.children[0] as Mesh;
    const geometry = mesh.geometry;
    const position = geometry.getAttribute('position');
    const index = geometry.getIndex()!;
    const a = new Vector3();
    const b = new Vector3();
    const c = new Vector3();
    const centre = new Vector3(0, shape.curves.rocker(0.5) + shape.curves.thickness(0.5) / 2, 0);
    let outward = 0;
    let faces = 0;
    for (let i = 0; i < index.count; i += 3) {
      a.fromBufferAttribute(position, index.getX(i));
      b.fromBufferAttribute(position, index.getX(i + 1));
      c.fromBufferAttribute(position, index.getX(i + 2));
      const normal = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
      if (normal.lengthSq() < 1e-14) continue;
      faces += 1;
      const middle = a.clone().add(b).add(c).divideScalar(3);
      if (normal.dot(middle.sub(centre)) > 0) outward += 1;
    }
    expect(faces).toBeGreaterThan(500);
    expect(outward / faces).toBeGreaterThan(0.99);
  });

  it('maps the hull for its designs: deck, bottom and rails in their own material groups', () => {
    const hull = group.children[0] as Mesh;
    expect(hull.geometry.getAttribute('uv')).toBeDefined();
    expect(hull.geometry.groups).toHaveLength(3);
    expect(Array.isArray(hull.material) && hull.material.length).toBe(3);
  });

  it('draws three fins under the tail, as deep as the physics fins, left fin on the left (+x)', () => {
    const fins = group.getObjectByName('fins')!;
    expect(fins.children).toHaveLength(3);
    const box = new Box3().setFromObject(fins);
    const tail = -shape.length / 2 - shape.centerOfMass.z;
    expect(box.max.z).toBeLessThan(tail + 0.4);
    expect(box.min.y).toBeLessThan(-shape.centerOfMass.y - 0.08);
    const left = fins.getObjectByName('left')!;
    expect(left.position.x).toBeGreaterThan(0.1);
  });

  it('lays a traction pad over the tail, on the deck', () => {
    const pad = group.getObjectByName('pad') as Mesh;
    const box = new Box3().setFromObject(pad);
    const tail = -shape.length / 2 - shape.centerOfMass.z;
    expect(box.min.z).toBeGreaterThan(tail - 1e-6);
    expect(box.max.z).toBeLessThan(tail + 0.42);
    expect(box.min.y).toBeGreaterThan(-shape.centerOfMass.y + shape.curves.rocker(0.1));
    expect(box.max.x).toBeLessThan(shape.maxWidth / 2);
  });

  it('dresses the board in any of the designs', () => {
    for (const design of BOARD_DESIGNS) expect(() => createBoardMesh(shape, design)).not.toThrow();
  });
});
