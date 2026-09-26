import {
  BufferGeometry, DataTexture, ExtrudeGeometry, Float32BufferAttribute, Group, LinearMipmapLinearFilter, Mesh, MeshPhysicalMaterial,
  MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, Shape,
} from 'three';
import { THRUSTER } from '../physics/finForces';
import type { BoardShape } from '../physics/boardShape';
import { BOARD_DESIGNS, designPixels, waxPixels, type BoardDesign } from './board/boardDesigns';
import { finOutline } from './board/finGeometry';

const ROWS = 48;
const COLUMNS = 8;
const DESIGN_SIZE = { width: 256, height: 1024 };
const WAX_SIZE = { width: 128, height: 512 };
/** The traction pad over the tail (fractions of the length) and its inset from the rails, m. */
const PAD = { from: 0.008, to: 0.2, inset: 0.012, thickness: 0.006, groove: 0.0025, grooves: 9, kick: 0.018, kickLength: 0.03 };
const FIN_THICKNESS = 0.006;

function texture(pixels: Uint8Array, width: number, height: number, colour: boolean): DataTexture {
  const map = new DataTexture(pixels, width, height);
  if (colour) map.colorSpace = SRGBColorSpace;
  map.wrapS = RepeatWrapping;
  map.minFilter = LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.anisotropy = 4;
  map.needsUpdate = true;
  return map;
}

/**
 * The physical board as drawn: the same outline, rocker, thickness and rail
 * taper the physics integrates (`buildBoardShape`), with a flat bottom, in a
 * design's resin: a waxed deck, a glossy bottom and rails, a traction pad over
 * the tail and the thruster's fins at the places and sizes their forces use
 * (`THRUSTER`). The group's origin is the board's centre of mass, so a
 * snapshot pose places it directly.
 */
export function createBoardMesh(shape: BoardShape, design: BoardDesign = BOARD_DESIGNS[0]): Group {
  const { width, rocker, thickness } = shape.curves;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const vertex = (x: number, y: number, z: number, u: number, v: number) => {
    positions.push(x, y, z);
    uvs.push(u, v);
    return positions.length / 3 - 1;
  };
  const point = (s: number, u: number, deck: boolean): [number, number, number] => {
    const bottom = rocker(s);
    return [(u * width(s)) / 2, deck ? bottom + thickness(s) * (1 - shape.taper * u * u) : bottom, (s - 0.5) * shape.length];
  };
  const groupStarts: number[] = [];

  // Deck and bottom: one smooth sheet each, rows along the board, columns across; u across, v along.
  for (const deck of [true, false]) {
    groupStarts.push(indices.length);
    const first = positions.length / 3;
    for (let i = 0; i <= ROWS; i += 1) {
      for (let j = 0; j <= COLUMNS; j += 1) vertex(...point(i / ROWS, -1 + (2 * j) / COLUMNS, deck), j / COLUMNS, i / ROWS);
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
  groupStarts.push(indices.length);
  for (const side of [-1, 1]) {
    const first = positions.length / 3;
    for (let i = 0; i <= ROWS; i += 1) {
      vertex(...point(i / ROWS, side, false), 0.5, i / ROWS);
      vertex(...point(i / ROWS, side, true), 0.5, i / ROWS);
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
      vertex(...point(end, u, false), j / COLUMNS, end);
      vertex(...point(end, u, true), j / COLUMNS, end);
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
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  groupStarts.push(indices.length);
  for (let g = 0; g < 3; g += 1) geometry.addGroup(groupStarts[g], groupStarts[g + 1] - groupStarts[g], g);
  geometry.computeVertexNormals();
  const { width: w, height: h } = DESIGN_SIZE;
  const deckMaterial = new MeshPhysicalMaterial({
    map: texture(designPixels(design, 'deck', w, h), w, h, true),
    roughnessMap: texture(waxPixels(WAX_SIZE.width, WAX_SIZE.height), WAX_SIZE.width, WAX_SIZE.height, false),
    roughness: 1, clearcoat: 0.3, clearcoatRoughness: 0.45,
  });
  const bottomMaterial = new MeshPhysicalMaterial({ map: texture(designPixels(design, 'bottom', w, h), w, h, true), roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 });
  const railMaterial = new MeshPhysicalMaterial({ color: design.rail, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 });
  const hull = new Mesh(geometry, [deckMaterial, bottomMaterial, railMaterial]);
  hull.castShadow = true;
  hull.receiveShadow = true;

  const pad = createPad(shape, design);
  const fins = createFins(shape);
  const { x, y, z } = shape.centerOfMass;
  for (const part of [hull, pad, fins]) part.position.set(-x, -y, -z);
  const group = new Group();
  group.add(hull, pad, fins);
  return group;
}

/** The deck's top at fraction s along and u across (−1 at the right rail, +1 at the left). */
function deckTop(shape: BoardShape, s: number, u: number): number {
  return shape.curves.rocker(s) + shape.curves.thickness(s) * (1 - shape.taper * u * u);
}

/** A foam traction pad over the tail: longitudinal grooves and a kick at the tail, inset from the rails. */
function createPad(shape: BoardShape, design: BoardDesign): Mesh {
  const rows = 24;
  const columns = 18;
  const positions: number[] = [];
  const indices: number[] = [];
  const topHeight = (s: number, u: number) => {
    const grooves = PAD.groove * (0.5 + 0.5 * Math.cos(u * Math.PI * PAD.grooves));
    const tail = (s - PAD.from) * shape.length;
    const kick = tail < PAD.kickLength ? PAD.kick * (1 - tail / PAD.kickLength) ** 2 : 0;
    return PAD.thickness + grooves + kick;
  };
  const at = (i: number, j: number, top: boolean): [number, number, number] => {
    const s = PAD.from + ((PAD.to - PAD.from) * i) / rows;
    const half = Math.max(0.01, shape.curves.width(s) / 2 - PAD.inset);
    const across = -1 + (2 * j) / columns;
    const x = across * half;
    const u = x / (shape.curves.width(s) / 2);
    const deck = deckTop(shape, s, u) + 0.0005;
    return [x, top ? deck + topHeight(s, across) : deck, (s - 0.5) * shape.length];
  };
  // The top: a grid over the pad.
  for (let i = 0; i <= rows; i += 1) for (let j = 0; j <= columns; j += 1) positions.push(...at(i, j, true));
  for (let i = 0; i < rows; i += 1) {
    for (let j = 0; j < columns; j += 1) {
      const a = i * (columns + 1) + j;
      const b = a + 1;
      const c = a + columns + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  // The skirt: the pad's edge down to the deck, around its outline.
  const outline: Array<[number, number]> = [];
  for (let j = 0; j <= columns; j += 1) outline.push([0, j]);
  for (let i = 1; i <= rows; i += 1) outline.push([i, columns]);
  for (let j = columns - 1; j >= 0; j -= 1) outline.push([rows, j]);
  for (let i = rows - 1; i >= 1; i -= 1) outline.push([i, 0]);
  const skirt = positions.length / 3;
  for (const [i, j] of outline) positions.push(...at(i, j, true), ...at(i, j, false));
  for (let k = 0; k < outline.length; k += 1) {
    const top = skirt + k * 2;
    const next = skirt + ((k + 1) % outline.length) * 2;
    indices.push(top, top + 1, next, next, top + 1, next + 1);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const pad = new Mesh(geometry, new MeshStandardMaterial({ color: design.pad, roughness: 0.95 }));
  pad.name = 'pad';
  pad.castShadow = true;
  pad.receiveShadow = true;
  return pad;
}

/** The thruster's three fins, each where and as big as `THRUSTER` places it, toed in toward the stringer. */
function createFins(shape: BoardShape): Group {
  const fins = new Group();
  fins.name = 'fins';
  const material = new MeshPhysicalMaterial({ color: '#2b3a40', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
  for (const spec of THRUSTER) {
    const { points } = finOutline(spec);
    const outline = new Shape(points.map(([along, down]) => ({ x: along, y: -down }) as never));
    const geometry = new ExtrudeGeometry(outline, { depth: FIN_THICKNESS, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 2 });
    // The outline's x runs along the board and its extrusion across it: turn it into the board's frame, centred on its root line.
    geometry.rotateY(-Math.PI / 2);
    geometry.translate(FIN_THICKNESS / 2, 0, 0);
    const fin = new Mesh(geometry, material);
    fin.name = spec.name;
    const s = spec.fromTail / shape.length;
    fin.position.set(spec.side * (shape.curves.width(s) / 2 - spec.fromRail), shape.curves.rocker(s), (s - 0.5) * shape.length);
    // Toe-in turns the leading edge toward the stringer.
    fin.rotation.y = -spec.side * spec.toe;
    fin.castShadow = true;
    fins.add(fin);
  }
  return fins;
}
