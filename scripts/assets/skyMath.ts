/** Build-time sky maths: Radiance HDR files, three's equirect directions, and the sun's disc. */
export interface HdrImage {
  width: number;
  height: number;
  /** Linear RGB, row 0 at the top. */
  data: Float32Array;
}

export interface SunEstimate {
  /** Unit direction toward the sun, in three's equirect convention, unrotated. */
  direction: [number, number, number];
  /** The energy moved out of the image: irradiance on a surface facing the sun, per channel. */
  irradiance: [number, number, number];
  pixels: number;
}

const luminance = (d: ArrayLike<number>, i: number) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];

/** Parses a Radiance RGBE file with flat or new-style run-length scanlines (top-down, `-Y h +X w`). */
export function parseHdr(bytes: Uint8Array): HdrImage {
  let offset = 0;
  const line = () => {
    let text = '';
    while (offset < bytes.length && bytes[offset] !== 10) text += String.fromCharCode(bytes[offset++]);
    offset += 1;
    return text;
  };
  if (!line().startsWith('#?')) throw new Error('not a Radiance HDR file');
  for (let header = line(); header !== ''; header = line()) {
    if (header.startsWith('FORMAT=') && header !== 'FORMAT=32-bit_rle_rgbe') throw new Error(`unsupported HDR format ${header}`);
  }
  const size = /^-Y (\d+) \+X (\d+)$/.exec(line());
  if (!size) throw new Error('unsupported HDR orientation');
  const height = Number(size[1]);
  const width = Number(size[2]);
  const data = new Float32Array(width * height * 3);
  const scan = new Uint8Array(width * 4);
  for (let row = 0; row < height; row += 1) {
    const rle = width >= 8 && width < 32768 && bytes[offset] === 2 && bytes[offset + 1] === 2 && (bytes[offset + 2] & 0x80) === 0;
    if (rle) {
      offset += 4;
      for (let channel = 0; channel < 4; channel += 1) {
        for (let x = 0; x < width;) {
          let count = bytes[offset++];
          if (count > 128) {
            count -= 128;
            const value = bytes[offset++];
            while (count-- > 0) scan[(x++) * 4 + channel] = value;
          } else {
            while (count-- > 0) scan[(x++) * 4 + channel] = bytes[offset++];
          }
        }
      }
    } else {
      scan.set(bytes.subarray(offset, offset + width * 4));
      offset += width * 4;
    }
    for (let x = 0; x < width; x += 1) {
      const exponent = scan[x * 4 + 3];
      const scale = exponent === 0 ? 0 : 2 ** (exponent - 136);
      const i = (row * width + x) * 3;
      data[i] = scan[x * 4] * scale;
      data[i + 1] = scan[x * 4 + 1] * scale;
      data[i + 2] = scan[x * 4 + 2] * scale;
    }
  }
  return { width, height, data };
}

/** Writes a flat (not run-length) RGBE file, which three's HDRLoader reads. */
export function encodeHdr(image: HdrImage): Uint8Array {
  const header = new TextEncoder().encode(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${image.height} +X ${image.width}\n`);
  const out = new Uint8Array(header.length + image.width * image.height * 4);
  out.set(header);
  let o = header.length;
  for (let i = 0; i < image.data.length; i += 3) {
    const max = Math.max(image.data[i], image.data[i + 1], image.data[i + 2]);
    if (max < 1e-32) {
      o += 4;
      continue;
    }
    // Mantissas in [128, 256): value = m · 2^(e − 136), rounded to the nearest step.
    const exponent = Math.floor(Math.log2(max)) + 1;
    const scale = 256 / 2 ** exponent;
    out[o] = Math.min(255, Math.round(image.data[i] * scale));
    out[o + 1] = Math.min(255, Math.round(image.data[i + 1] * scale));
    out[o + 2] = Math.min(255, Math.round(image.data[i + 2] * scale));
    out[o + 3] = exponent + 128;
    o += 4;
  }
  return out;
}

/**
 * The world direction at (col, row), measured in pixels from the top-left
 * corner, as three samples an equirect map (`equirectUv`: u = atan(z, x)/2π + ½,
 * v = asin(y)/π + ½, with the image flipped so row 0 is the top).
 */
export function directionAt(col: number, row: number, width: number, height: number): { x: number; y: number; z: number } {
  const u = (col + 0.5) / width;
  const v = 1 - (row + 0.5) / height;
  const latitude = (v - 0.5) * Math.PI;
  const longitude = (u - 0.5) * 2 * Math.PI;
  return { x: Math.cos(longitude) * Math.cos(latitude), y: Math.sin(latitude), z: Math.sin(longitude) * Math.cos(latitude) };
}

/** A pixel's solid angle on the sphere, sr. */
export function pixelSolidAngle(row: number, width: number, height: number): number {
  const top = Math.PI / 2 - (row / height) * Math.PI;
  const bottom = Math.PI / 2 - ((row + 1) / height) * Math.PI;
  return ((2 * Math.PI) / width) * (Math.sin(top) - Math.sin(bottom));
}

/**
 * Finds the sun as the connected region around the brightest pixel that is far
 * brighter than the sky (over 8× the 99th-percentile luminance and 2 % of the
 * peak), replaces it by the sky just around it, and returns the energy moved
 * out as the sun's irradiance on a surface facing it.
 */
export function extractSun(image: HdrImage): { sun: SunEstimate; image: HdrImage } {
  const { width, height } = image;
  const data = image.data.slice();
  const count = width * height;
  const lum = new Float32Array(count);
  let peak = 0;
  let peakIndex = 0;
  for (let p = 0; p < count; p += 1) {
    lum[p] = luminance(data, p * 3);
    if (lum[p] > peak) {
      peak = lum[p];
      peakIndex = p;
    }
  }
  const sorted = Float32Array.from(lum).sort();
  const p99 = sorted[Math.floor(0.99 * (count - 1))];
  const threshold = Math.max(8 * p99, 0.02 * peak);
  if (!(peak > threshold)) return { sun: { direction: [0, 1, 0], irradiance: [0, 0, 0], pixels: 0 }, image: { width, height, data } };

  const inSun = new Uint8Array(count);
  const region: number[] = [];
  const stack = [peakIndex];
  inSun[peakIndex] = 1;
  while (stack.length) {
    const p = stack.pop()!;
    region.push(p);
    const row = Math.floor(p / width);
    const col = p % width;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const r = row + dr;
      if (r < 0 || r >= height) continue;
      const q = r * width + ((col + dc + width) % width);
      if (!inSun[q] && lum[q] > threshold) {
        inSun[q] = 1;
        stack.push(q);
      }
    }
  }

  // The sky just around the disc: every pixel within two of it.
  const fill = [0, 0, 0];
  let ring = 0;
  for (const p of region) {
    const row = Math.floor(p / width);
    const col = p % width;
    for (let dr = -2; dr <= 2; dr += 1) {
      for (let dc = -2; dc <= 2; dc += 1) {
        const r = row + dr;
        if (r < 0 || r >= height) continue;
        const q = r * width + ((col + dc + width) % width);
        if (inSun[q]) continue;
        fill[0] += data[q * 3];
        fill[1] += data[q * 3 + 1];
        fill[2] += data[q * 3 + 2];
        ring += 1;
      }
    }
  }
  if (ring > 0) for (let c = 0; c < 3; c += 1) fill[c] /= ring;
  const fillLuminance = luminance(fill, 0);

  const irradiance: [number, number, number] = [0, 0, 0];
  const centre = { x: 0, y: 0, z: 0 };
  for (const p of region) {
    const row = Math.floor(p / width);
    const omega = pixelSolidAngle(row, width, height);
    const weight = (lum[p] - fillLuminance) * omega;
    const d = directionAt(p % width, row, width, height);
    centre.x += d.x * weight;
    centre.y += d.y * weight;
    centre.z += d.z * weight;
    for (let c = 0; c < 3; c += 1) {
      irradiance[c] += (data[p * 3 + c] - fill[c]) * omega;
      data[p * 3 + c] = fill[c];
    }
  }
  // A red sun in a blue sky can be dimmer than the sky in blue: it adds no negative light.
  for (let c = 0; c < 3; c += 1) irradiance[c] = Math.max(0, irradiance[c]);
  const length = Math.hypot(centre.x, centre.y, centre.z) || 1;
  return {
    sun: { direction: [centre.x / length, centre.y / length, centre.z / length], irradiance, pixels: region.length },
    image: { width, height, data },
  };
}

/** Horizontal irradiance from the sky above the horizon (cosine-weighted luminance). */
export function horizontalIrradiance(image: HdrImage): number {
  let total = 0;
  for (let row = 0; row < image.height / 2; row += 1) {
    const omega = pixelSolidAngle(row, image.width, image.height);
    for (let col = 0; col < image.width; col += 1) {
      const cosine = directionAt(col, row, image.width, image.height).y;
      total += luminance(image.data, (row * image.width + col) * 3) * omega * Math.max(0, cosine);
    }
  }
  return total;
}
