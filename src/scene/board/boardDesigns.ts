import { Color } from 'three';
import { seededRandom } from '../../wave/random';

/** A board's look: resin colours per surface, rails, stringer, an optional spray fading along the board, and the pad. */
export interface BoardDesign {
  id: string;
  deck: string;
  bottom: string;
  rail: string;
  stringer: string;
  /** A spray of colour fading in from `from` to `to` (fractions of the length from the tail). */
  spray?: { color: string; from: number; to: number };
  pad: string;
}

/** Five unbranded designs. */
export const BOARD_DESIGNS: readonly BoardDesign[] = [
  { id: 'classic', deck: '#f2ecdc', bottom: '#efe7d3', rail: '#e3d8bf', stringer: '#8a6a45', pad: '#1d2328' },
  { id: 'sunset-fade', deck: '#f4efe4', bottom: '#f2b37a', rail: '#e07a55', stringer: '#6d4f33', spray: { color: '#e46b4a', from: 0.55, to: 1 }, pad: '#2a2f33' },
  { id: 'sea-glass', deck: '#dcefe9', bottom: '#9fd3cb', rail: '#6fb7ae', stringer: '#4f3c2a', spray: { color: '#6fb7ae', from: 0.35, to: 0 }, pad: '#244e50' },
  { id: 'midnight', deck: '#e8e6e1', bottom: '#1f2a3a', rail: '#2c3a50', stringer: '#c9b27c', pad: '#111418' },
  { id: 'coral-rail', deck: '#f6f2ea', bottom: '#f6f2ea', rail: '#de7860', stringer: '#7b5a3c', pad: '#de7860' },
];

/** The stringer's half-width as a share of the board's width at that point (a 6 mm stringer across a 46 cm board). */
const STRINGER_HALF = 0.0065;
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * A design's texture for the deck or the bottom, RGBA bytes: u across (0 at
 * the left rail, 1 at the right), v along (row 0 at the tail). The deck and
 * bottom sheets map it with their own UVs.
 */
export function designPixels(design: BoardDesign, surface: 'deck' | 'bottom', width: number, height: number): Uint8Array {
  const pixels = new Uint8Array(width * height * 4);
  const base = new Color(surface === 'deck' ? design.deck : design.bottom);
  const rail = new Color(design.rail);
  const stringer = new Color(design.stringer);
  const spray = design.spray ? new Color(design.spray.color) : undefined;
  const colour = new Color();
  // Never thinner than the pixels either side of the centre line, so it shows at any resolution.
  const stringerHalf = Math.max(STRINGER_HALF, 0.5 / width + 1e-9);
  for (let y = 0; y < height; y += 1) {
    const v = (y + 0.5) / height;
    for (let x = 0; x < width; x += 1) {
      const u = (x + 0.5) / width;
      colour.copy(base);
      if (spray && design.spray) colour.lerp(spray, smoothstep(design.spray.from, design.spray.to, v));
      colour.lerp(rail, smoothstep(0.86, 1, Math.abs(2 * u - 1)));
      if (Math.abs(u - 0.5) < stringerHalf) colour.copy(stringer);
      const i = (y * width + x) * 4;
      pixels[i] = Math.round(colour.r * 255);
      pixels[i + 1] = Math.round(colour.g * 255);
      pixels[i + 2] = Math.round(colour.b * 255);
      pixels[i + 3] = 255;
    }
  }
  return pixels;
}

/** Waxed deck roughness: bumpy 0.55–0.85 where the rider lies and stands (12–72 % of the length), glossy resin 0.12 elsewhere. */
export function waxPixels(width: number, height: number, seed = 7): Uint8Array {
  const random = seededRandom(seed);
  const pixels = new Uint8Array(width * height * 4);
  // Wax builds up in bumps: coarse blobs over a fine grain.
  const cells = 12;
  const coarse = Array.from({ length: (cells + 1) * (cells * 4 + 1) }, () => random());
  const blob = (u: number, v: number) => {
    const gx = u * cells;
    const gy = v * cells * 4;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const fx = gx - x0;
    const fy = gy - y0;
    const at = (x: number, y: number) => coarse[Math.min(cells * 4, y) * (cells + 1) + Math.min(cells, x)];
    return (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy;
  };
  for (let y = 0; y < height; y += 1) {
    const v = (y + 0.5) / height;
    const waxed = smoothstep(0.1, 0.14, v) * (1 - smoothstep(0.7, 0.74, v));
    for (let x = 0; x < width; x += 1) {
      const u = (x + 0.5) / width;
      const wax = 0.55 + 0.3 * (0.7 * blob(u, v) + 0.3 * random());
      const roughness = 0.12 + (wax - 0.12) * waxed;
      const i = (y * width + x) * 4;
      const value = Math.round(roughness * 255);
      pixels[i] = value;
      pixels[i + 1] = value;
      pixels[i + 2] = value;
      pixels[i + 3] = 255;
    }
  }
  return pixels;
}
