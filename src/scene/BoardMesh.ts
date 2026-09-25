import { BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial } from 'three';
import type { BoardShape } from '../physics/boardShape';

const ROWS = 48;
const COLUMNS = 8;
const DECK = new Color('#f2e8d4');
const BOTTOM = new Color('#d0e0d8');
const RAIL = new Color('#d97962');

/**
 * The physical board as drawn: the same outline, rocker, thickness and rail
 * taper the physics integrates (`buildBoardShape`), with a flat bottom. The
 * group's origin is the board's centre of mass, so a snapshot pose places it
 * directly. Fins arrive with their forces (P4e).
 */
export function createBoardMesh(shape: BoardShape): Group {
  const { width, rocker, thickness } = shape.curves;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const vertex = (x: number, y: number, z: number, color: Color) => {
    positions.push(x, y, z);
    colors.push(color.r, color.g, color.b);
    return positions.length / 3 - 1;
  };
  const point = (s: number, u: number, deck: boolean): [number, number, number] => {
    const bottom = rocker(s);
    return [(u * width(s)) / 2, deck ? bottom + thickness(s) * (1 - shape.taper * u * u) : bottom, (s - 0.5) * shape.length];
  };

  // Deck and bottom: one smooth sheet each, rows along the board, columns across.
  for (const deck of [true, false]) {
    const first = positions.length / 3;
    for (let i = 0; i <= ROWS; i += 1) {
      for (let j = 0; j <= COLUMNS; j += 1) vertex(...point(i / ROWS, -1 + (2 * j) / COLUMNS, deck), deck ? DECK : BOTTOM);
    }
    for (let i = 0; i < ROWS; i += 1) {
      for (let j = 0; j < COLUMNS; j += 1) {
        const a = first + i * (COLUMNS + 1) + j;
        const b = a + 1;
        const c = a + COLUMNS + 1;
        const d = c + 1;
        if (deck) indices.push(a, c, b, b, c, d);
        else indices.push(a, b, c, b, d, c);
      }
    }
  }
  // Rails join each edge of the deck to the bottom.
  for (const side of [-1, 1]) {
    const first = positions.length / 3;
    for (let i = 0; i <= ROWS; i += 1) {
      vertex(...point(i / ROWS, side, false), RAIL);
      vertex(...point(i / ROWS, side, true), RAIL);
    }
    for (let i = 0; i < ROWS; i += 1) {
      const bottom = first + i * 2;
      const deck = bottom + 1;
      const nextBottom = bottom + 2;
      const nextDeck = bottom + 3;
      if (side > 0) indices.push(bottom, deck, nextBottom, nextBottom, deck, nextDeck);
      else indices.push(bottom, nextBottom, deck, deck, nextBottom, nextDeck);
    }
  }
  // End caps close the tail and the (nearly pointed) nose.
  for (const end of [0, 1]) {
    const first = positions.length / 3;
    for (let j = 0; j <= COLUMNS; j += 1) {
      const u = -1 + (2 * j) / COLUMNS;
      vertex(...point(end, u, false), RAIL);
      vertex(...point(end, u, true), RAIL);
    }
    for (let j = 0; j < COLUMNS; j += 1) {
      const bottom = first + j * 2;
      const deck = bottom + 1;
      const nextBottom = bottom + 2;
      const nextDeck = bottom + 3;
      if (end === 0) indices.push(bottom, deck, nextBottom, nextBottom, deck, nextDeck);
      else indices.push(bottom, nextBottom, deck, deck, nextBottom, nextDeck);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new Mesh(geometry, new MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.01 }));
  const { x, y, z } = shape.centerOfMass;
  mesh.position.set(-x, -y, -z);
  const group = new Group();
  group.add(mesh);
  return group;
}
