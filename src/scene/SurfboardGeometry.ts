import { BufferGeometry, Color, Float32BufferAttribute } from 'three';

/** A shortboard deck, tapered rails, thin tail, and lifted nose in local board coordinates. */
export function createSurfboardGeometry(): BufferGeometry {
  const lengthSegments = 24;
  const widthSections = [-1, -0.5, 0, 0.5, 1];
  const vertices: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const deckColor = new Color('#f2e8d4');
  const railColor = new Color('#d97962');
  const noseColor = new Color('#83b7ad');
  const undersideColor = new Color('#d0e0d8');
  const color = new Color();
  const rowSize = widthSections.length;
  const layerSize = (lengthSegments + 1) * rowSize;

  for (const deck of [true, false]) {
    for (let row = 0; row <= lengthSegments; row += 1) {
      const t = row / lengthSegments;
      const z = (t - 0.5) * 2.65;
      const roundedOutline = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * t - 1), 2.7)), 0.65);
      const outline = Math.max(0.04, roundedOutline, 0.55 * Math.pow(1 - t, 8));
      const width = (0.29 + 0.03 * t) * outline;
      const rocker = 0.11 * Math.pow(Math.abs(2 * t - 1), 3) + (t > 0.7 ? 0.065 * Math.pow((t - 0.7) / 0.3, 2) : 0);
      for (const section of widthSections) {
        const edge = Math.abs(section);
        const y = rocker + (deck ? 0.045 - 0.04 * edge * edge : -0.07 + 0.045 * edge * edge);
        vertices.push(section * width, y, z);
        color.copy(deck ? deckColor : undersideColor);
        color.lerp(railColor, Math.pow(edge, 8) * (deck ? 0.72 : 0.45));
        if (deck) color.lerp(noseColor, Math.max(0, (t - 0.84) / 0.16) * 0.4);
        colors.push(color.r, color.g, color.b);
      }
    }
  }

  for (let row = 0; row < lengthSegments; row += 1) {
    for (let col = 0; col < rowSize - 1; col += 1) {
      const a = row * rowSize + col;
      const b = a + 1;
      const c = a + rowSize;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
      indices.push(layerSize + a, layerSize + b, layerSize + c,
        layerSize + b, layerSize + d, layerSize + c);
    }
    for (const col of [0, rowSize - 1]) {
      const a = row * rowSize + col;
      const c = a + rowSize;
      if (col === 0) indices.push(a, layerSize + a, c, c, layerSize + a, layerSize + c);
      else indices.push(a, c, layerSize + a, c, layerSize + c, layerSize + a);
    }
  }
  for (let col = 0; col < rowSize - 1; col += 1) {
    const tail = col;
    const nose = lengthSegments * rowSize + col;
    indices.push(tail, tail + 1, layerSize + tail,
      tail + 1, layerSize + tail + 1, layerSize + tail);
    indices.push(nose, layerSize + nose, nose + 1,
      nose + 1, layerSize + nose, layerSize + nose + 1);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
