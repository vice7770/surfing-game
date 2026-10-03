import { DataTexture, LinearFilter, LinearMipmapLinearFilter, RGBAFormat, RepeatWrapping, UnsignedByteType } from 'three';
import { smoothstep } from '../../wave/Bathymetry';
import { FOAM_ALBEDO, FOAM_DENSE, FOAM_LAYER_SCALE, foamLayerReflectance, pcg2d } from '../foamPattern';
import { FOAM_BAKE, FOAM_LAYER_RANKS, FOAM_RANGE, bakeFoamCycle } from './foamBake';

/** The churn tile's size, m: a few clumps of fresh whitewater across a metre or two each. */
export const CHURN_TILE = 6;
/** The churn is made on this many samples a side, then raised to the texture's size. */
const CHURN_SIZE = 256;
/** Feature cells across the tile in the first octave; the second has twice as many. */
const CELLS = 8;

const wrap = (value: number, period: number) => ((value % period) + period) % period;

/** Distance, in cells, to the nearest of one jittered feature point per cell, repeating every `period` cells. */
function nearest(x: number, z: number, period: number, salt: number): number {
  const cx = Math.floor(x);
  const cz = Math.floor(z);
  let best = 8;
  for (let j = -1; j <= 1; j += 1) {
    for (let i = -1; i <= 1; i += 1) {
      const [hx, hz] = pcg2d(wrap(cx + i, period) + salt, wrap(cz + j, period));
      best = Math.min(best, Math.hypot(x - (cx + i + hx / 4294967295), z - (cz + j + hz / 4294967295)));
    }
  }
  return best;
}

// Domes 0.8 cell wide: about four fifths covered, the rest creases (0.55 left half the tile open).
const dome = (distance: number) => 1 - smoothstep(0, 0.8, distance);

/**
 * Fresh whitewater at tile coordinates (u, v) in [0, 1]: domed clumps round
 * jittered points (a cauliflower Worley pattern, two octaves) and the creases
 * between them. `height` is 0–1; `density` is how covered the point is.
 */
export function churnSample(u: number, v: number): { density: number; height: number } {
  const height = (dome(nearest(u * CELLS, v * CELLS, CELLS, 0)) + 0.35 * dome(nearest(u * 2 * CELLS, v * 2 * CELLS, 2 * CELLS, 7919))) / 1.35;
  return { density: smoothstep(0.1, 0.35, height), height };
}

/** How much fresh churn replaces the lace, from the void fraction the breaking drove in (G9): none once the air has risen out. */
export function freshness(voidFraction: number): number {
  return smoothstep(FRESH_AIR[0], FRESH_AIR[1], voidFraction);
}

/** The void fraction over which churn takes over from the lace: measured peaks under breakers are near 0.2 (whitewater-sources.md). */
const FRESH_AIR = [0.02, 0.15] as const;

/**
 * How much of the foam is drawn as fresh churn (RICH_FOAM's `waterChurnShare`): dense fresh foam, so both the air the
 * breaking drove in still in the water (`freshness`) and the foam on top of it still dense (the foam value over
 * `FOAM_DENSE`, as churn was drawn before G9). With the air alone, a trough the plume had drifted under drew the churn's
 * clumps at a fraction of their strength over thin foam, as cream blobs on bare water.
 */
export function churnShare(voidFraction: number, foam: number): number {
  return freshness(voidFraction) * smoothstep(FOAM_DENSE[0], FOAM_DENSE[1], foam);
}

// --- The foam's life cycle (foam-and-whitewater.md item 2): two stages, early and late, baked once by `foamBake`. ---

/** The texture's side, texels: churn in red and green, the foam's early and late stages in blue and alpha. */
export const CHURN_TEXTURE_SIZE = FOAM_BAKE.size;
/** The large and small octaves of the foam, m a tile (foam-and-whitewater.md item 2: about 12 m and 3 m): holes and lace of a few metres, and of a few decimetres. */
export const FOAM_OCTAVES = { large: 12, small: 3 } as const;
/**
 * The octaves' weights, summing in squares to 1 so the blend stays a unit Gaussian: in the ratio of the variance a k^(-5/3)
 * spectrum (Obukhov 1949, Corrsin 1951, for a scalar the turbulence stirs) puts in two bands four times apart in
 * wavenumber, 4^(-2/3), so the small octave carries the eddies below the bake's flow (its smallest are 0.75 m on the 12 m
 * tile) in their share. [provisional: foam is a floater on a compressible surface, not a passive scalar] It frays the
 * edges and threads of the large octave's patches and opens small holes in them; at the first bake's weight of 0.2 their
 * outlines were smooth, cut-out shapes.
 */
export const FOAM_WEIGHTS = { large: 1 / Math.sqrt(1 + 4 ** (-2 / 3)), small: 4 ** (-1 / 3) / Math.sqrt(1 + 4 ** (-2 / 3)) } as const;
/**
 * The correlation of the early and late stages' Gaussian values (`FoamBake.correlation`; the test checks it): the two
 * are the same fluid at two ages, but they are related only weakly. Their union (`foamFieldValue`) covers the foam's
 * share exactly when its components are independent; at this correlation it covers within a percent of it (the test).
 */
export const FOAM_STAGE_CORRELATION = 0.12;
/** Hex tiling hides the tile (Mikkelsen 2022, after Heitz & Neyret 2018); the weights of a triangle's three corners are cubed, to keep the blend zones narrow. [provisional] */
export const FOAM_HEX_POWER = 3;
/** Past this footprint, m, the foam gives way to its mean, as it did with Classic's lace; the tile has few fine texels left to show. [provisional] */
export const FOAM_FADE = [0.12, 0.6] as const;
/**
 * The half-width of a covered edge, in sigma of the Gaussian field: half of what the field changes across a pixel (the
 * shader reads it off the derivatives; the edge is as soft as the pixel is large), and at least this, so an edge seen
 * from very close is a ramp and never a hard step: about 3 mm at the field's median gradient across lace's edges (14
 * sigma a metre, measured on the bake), finer than its 2-4 cm threads. [provisional]
 */
export const FOAM_EDGE = 0.04;
/**
 * The foam's density by its Gaussian rank in each stage, log2 of a share of the mean, at the ranks `FOAM_LAYER_RANKS`
 * (-4 to 4 sigma every quarter): `foamLayerTable` of the bake, with floating particles carried by its flow, 2048 a side,
 * pasted here so the shader can carry them as constants (the test measures them afresh). A patch's edge, where a
 * component passes its threshold t, is a single layer of bubbles, and N = 2^(T(G) - T(t)) layers lie at G inside it
 * (foam-lifecycle.md, sections 3.2 and 5): a thread is thin at its edges and thick along its spine, a knot where threads
 * meet thicker still, and the middle of a hole that dense foam is closing a single layer at its deepest.
 */
export const FOAM_LAYER_LOG2 = {
  early: [-10, -10, -10, -10, -10, -9.96, -9.53, -9.53, -9.53, -9.53, -9.52, -8.87, -8.22, -7.57, -6.81, -5.91, -4.88, -3.67, -2.39, -1.21, 0.04, 1.12, 1.94, 2.59, 3.09, 3.7, 4.25, 4.93, 5.66, 6.1, 6.74, 7.73, 8.79],
  late: [-10, -10, -10, -10, -10, -9.95, -9.95, -9.9, -9.87, -9.87, -9.85, -9.85, -9.85, -9.75, -9.75, -9.61, -8.07, -5.37, -2.85, -0.95, 0.19, 1.09, 2.03, 2.8, 3.4, 3.98, 4.43, 5.08, 5.08, 5.08, 5.08, 5.08, 6.13],
} as const;
/** Where the second octave's texture is shifted, tile fractions, so it never samples the first's own point. */
const OCTAVE_SHIFT = [0.371, 0.629] as const;
/** The seeds of the two octaves' and two phases' hex lattices. */
const SALTS = { large: [0, 7919], small: [104729, 15485863] } as const;

/** The churn's density and height in red and green at the texture's size, raised from its 256² tile; blue and alpha left 0. */
function churnBytes(): Uint8Array {
  const size = CHURN_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);
  const coarse = new Float32Array(CHURN_SIZE * CHURN_SIZE * 2);
  for (let j = 0; j < CHURN_SIZE; j += 1) {
    for (let i = 0; i < CHURN_SIZE; i += 1) {
      const { density, height } = churnSample((i + 0.5) / CHURN_SIZE, (j + 0.5) / CHURN_SIZE);
      coarse[(j * CHURN_SIZE + i) * 2] = Math.round(density * 255);
      coarse[(j * CHURN_SIZE + i) * 2 + 1] = Math.round(height * 255);
    }
  }
  // Cell-centred bilinear, which is what the GPU's own filtering of the 256² tile gave.
  const ratio = size / CHURN_SIZE;
  for (let y = 0; y < size; y += 1) {
    const v = (y + 0.5) / ratio - 0.5;
    const v0 = Math.floor(v);
    const fv = v - v0;
    const row0 = wrap(v0, CHURN_SIZE) * CHURN_SIZE;
    const row1 = wrap(v0 + 1, CHURN_SIZE) * CHURN_SIZE;
    for (let x = 0; x < size; x += 1) {
      const u = (x + 0.5) / ratio - 0.5;
      const u0 = Math.floor(u);
      const fu = u - u0;
      const c0 = wrap(u0, CHURN_SIZE);
      const c1 = wrap(u0 + 1, CHURN_SIZE);
      for (let channel = 0; channel < 2; channel += 1) {
        const top = (1 - fu) * coarse[(row0 + c0) * 2 + channel] + fu * coarse[(row0 + c1) * 2 + channel];
        const bottom = (1 - fu) * coarse[(row1 + c0) * 2 + channel] + fu * coarse[(row1 + c1) * 2 + channel];
        data[(y * size + x) * 4 + channel] = Math.round((1 - fv) * top + fv * bottom);
      }
    }
  }
  return data;
}

/**
 * The texture's bytes, made afresh: the churn, and the foam's two stages from `bakeFoamCycle`, which takes a second or
 * two. What the bake's worker (`foamBakeWorker`) makes and hands back.
 */
export function churnTextureBytes(): Uint8Array {
  const data = churnBytes();
  const foam = bakeFoamCycle();
  for (let k = 0; k < CHURN_TEXTURE_SIZE * CHURN_TEXTURE_SIZE; k += 1) {
    data[k * 4 + 2] = foam.early[k];
    data[k * 4 + 3] = foam.late[k];
  }
  return data;
}

/** The finished bytes, once made: by the bake's worker, or here where there is none. */
let bytes: Uint8Array | undefined;
/** While the worker bakes: the churn, its height standing in for the foam's two stages. */
let interim: Uint8Array | undefined;
/** Whether a worker is baking the bytes now. */
let baking = false;

/** Whether the texture's finished bytes have been made: by the bake's worker, or by a read of them where there is none. */
export function churnTextureBaked(): boolean {
  return bytes !== undefined;
}

/**
 * The texture's bytes, made here when first read if no worker has made them (tests, and browsers without workers): a
 * program that never draws the Rich foam never pays for them.
 */
export function churnTextureData(): Uint8Array {
  bytes ??= churnTextureBytes();
  return bytes;
}

/** The part of a `Worker` the bake uses; tests stand in a fake. */
export interface FoamBakeWorker {
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  postMessage(message: unknown): void;
  terminate(): void;
}

/** A module worker running `foamBakeWorker`, in a page that can start one. */
function bakeWorker(): FoamBakeWorker | undefined {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return undefined;
  return new Worker(new URL('./foamBakeWorker.ts', import.meta.url), { type: 'module' }) as unknown as FoamBakeWorker;
}

/**
 * Bakes the foam's life cycle once, off the main thread, from the moment the texture is made (at load, with the water):
 * the bake takes a second or two, which on the main thread was a stall at the first Rich frame, and again whenever a
 * session switched to Rich. Until it lands, the texture holds the churn, its height standing in for the foam's stages;
 * then the finished bytes are uploaded in their place. Without a worker, or if it fails, the next upload bakes here.
 */
export function startFoamBake(create: () => FoamBakeWorker | undefined = bakeWorker): void {
  if (bytes || baking) return;
  const worker = create();
  if (!worker) return;
  baking = true;
  const finish = (data?: Uint8Array) => {
    baking = false;
    interim = undefined;
    worker.terminate();
    if (data) bytes ??= data;
    if (texture) texture.needsUpdate = true;
  };
  worker.onmessage = (event) => {
    const data = event.data;
    finish(data instanceof Uint8Array && data.length === CHURN_TEXTURE_SIZE * CHURN_TEXTURE_SIZE * 4 ? data : undefined);
  };
  worker.onerror = () => finish();
  worker.postMessage('bake');
}

/** What the GPU reads: the finished bytes, the interim churn while a worker bakes them, or (no worker) a bake here. */
function textureBytes(): Uint8Array {
  if (bytes) return bytes;
  if (!baking) return churnTextureData();
  if (!interim) {
    interim = churnBytes();
    for (let k = 0; k < CHURN_TEXTURE_SIZE * CHURN_TEXTURE_SIZE; k += 1) {
      interim[k * 4 + 2] = interim[k * 4 + 1];
      interim[k * 4 + 3] = interim[k * 4 + 1];
    }
  }
  return interim;
}

let texture: DataTexture | undefined;

/**
 * RGBA8, 1024², mipmapped and repeating, cached: red and green are the fresh churn's density and height, blue and
 * alpha the foam's early and late stages as Gaussian ranks. Making it starts the foam's bake (`startFoamBake`); its
 * bytes are read when the GPU first uploads it.
 */
export function churnTexture(): DataTexture {
  if (texture) return texture;
  texture = new DataTexture(new Uint8Array(4), 1, 1, RGBAFormat, UnsignedByteType);
  const image = {
    width: CHURN_TEXTURE_SIZE,
    height: CHURN_TEXTURE_SIZE,
    get data(): Uint8Array {
      return textureBytes();
    },
  };
  texture.image = image as unknown as typeof texture.image;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  // A surfer's eye is a metre or two over the water, so a pixel is much longer along the view than across it: read plain, the
  // foam's threads smear to the long side. 4, as the board's map; 8 costs about 30% more where the foam is, for little more.
  texture.anisotropy = 4;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  startFoamBake();
  return texture;
}

/** How tall the churn's clumps stand, m, for the normal's relief where the foam is fresh. */
export const CHURN_RELIEF = 0.06;

// --- CPU mirrors of the foam field's GLSL, for the tests: the same texels, hashes and blends, without derivatives. ---

/** One byte channel (2 = early, 3 = late) of the texture at (u, v) tiles: bilinear and repeating, as the GPU reads mip 0, in σ. */
export function sampleFoamField(u: number, v: number, channel: 2 | 3): number {
  const data = churnTextureData();
  const size = CHURN_TEXTURE_SIZE;
  const x = u * size - 0.5;
  const y = v * size - 0.5;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const at = (i: number, j: number) => data[(wrap(j, size) * size + wrap(i, size)) * 4 + channel];
  const top = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx;
  const bottom = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx;
  const byte = top * (1 - fy) + bottom * fy;
  return (byte / 127.5 - 1) * FOAM_RANGE;
}

const UINT = 4294967296;

/**
 * One byte channel of the texture at (u, v) tiles, turned and shifted by a hash (hx, hz) as each hex corner and each streak
 * anchor reads it: turned by the hash of the hash (swapped, each half xor 0x9e3779b9), shifted by the hash over 2^32.
 */
export function foamTurnedSample(u: number, v: number, hx: number, hz: number, channel: 2 | 3): number {
  const [angle] = pcg2d((hz ^ 0x9e3779b9) >>> 0, (hx ^ 0x9e3779b9) >>> 0);
  const turn = (2 * Math.PI * angle) / UINT;
  const c = Math.cos(turn);
  const s = Math.sin(turn);
  return sampleFoamField(c * u - s * v + hx / UINT, s * u + c * v + hz / UINT, channel);
}

/** The corners of the triangle of the lattice of edge 1 (skewed coordinates, as `waterFoamHex`) holding (qx, qz), and their barycentric weights. */
export function hexCorners(qx: number, qz: number): { corner: [number, number]; weight: number }[] {
  const sx = qx - qz * 0.5773502692;
  const sz = qz * 1.1547005384;
  const cx = Math.floor(sx);
  const cz = Math.floor(sz);
  const fx = sx - cx;
  const fz = sz - cz;
  const up = fx + fz >= 1 ? 1 : 0;
  const corners: [number, number][] = [[cx + up, cz + up], [cx + 1, cz], [cx, cz + 1]];
  const raw = up ? [fx + fz - 1, 1 - fz, 1 - fx] : [1 - fx - fz, fx, fz];
  return corners.map((corner, index) => ({ corner, weight: raw[index] }));
}

/** The hex-tiled Gaussian pair (early, late) at tile coordinates (qx, qz): the three corners of the triangle holding it, each a random turn and shift of the texture, blended in squares. */
export function foamHexGauss(qx: number, qz: number, salt: number): [number, number] {
  const corners = hexCorners(qx, qz);
  const cubed = corners.map(({ weight }) => weight ** FOAM_HEX_POWER);
  const total = cubed[0] + cubed[1] + cubed[2];
  let early = 0;
  let late = 0;
  let squares = 0;
  corners.forEach(({ corner: [vx, vz] }, index) => {
    const weight = cubed[index] / total;
    const [hx, hz] = pcg2d((vx + 1024 + salt) >>> 0, (vz + 1024 + salt) >>> 0);
    early += weight * foamTurnedSample(qx, qz, hx, hz, 2);
    late += weight * foamTurnedSample(qx, qz, hx, hz, 3);
    squares += weight * weight;
  });
  const norm = 1 / Math.sqrt(squares);
  return [early * norm, late * norm];
}

/**
 * Where the two flow-map phases sit and how they weigh, as the shader's: positions carried back by the current, and
 * weights that cross-fade on a triangle at every current, so each phase weighs nothing at the moment it wraps back to its
 * start (Neyret 2003; Vlachos 2010). Nothing here depends on how fast the current is but the positions, which are
 * linear in it: a weight or an offset that changed with the speed would jump a phase's whole pattern in one frame, at its
 * wrap in a slow current (a gate that kept still water on one phase did, every 2 s below 0.2 m/s) or whenever the current
 * turns (the wave's own orbital flow turns twice a period). In still water the two phases are two patterns trading
 * places, at the rate they do in moving water.
 */
export function foamPhases(flowX: number, flowZ: number, time: number, period: number): { a: [number, number]; b: [number, number]; weightA: number } {
  const a = time / period - Math.floor(time / period);
  const b = a + 0.5 - Math.floor(a + 0.5);
  return { a: [-flowX * a * period, -flowZ * a * period], b: [-flowX * b * period, -flowZ * b * period], weightA: 1 - Math.abs(2 * a - 1) };
}

/** The foam's Gaussian pair (early, late) of each flow-map phase at world (x, z), m, with the phase's weight: two octaves, each hex-tiled. */
export function foamPhaseGauss(x: number, z: number, flowX: number, flowZ: number, time: number, period = 2): { weight: number; early: number; late: number }[] {
  const { a, b, weightA } = foamPhases(flowX, flowZ, time, period);
  const phase = (offset: [number, number], index: number, weight: number) => {
    const large = foamHexGauss((x + offset[0]) / FOAM_OCTAVES.large, (z + offset[1]) / FOAM_OCTAVES.large, SALTS.large[index]);
    const small = foamHexGauss((x + offset[0]) / FOAM_OCTAVES.small + OCTAVE_SHIFT[0], (z + offset[1]) / FOAM_OCTAVES.small + OCTAVE_SHIFT[1], SALTS.small[index]);
    return { weight, early: FOAM_WEIGHTS.large * large[0] + FOAM_WEIGHTS.small * small[0], late: FOAM_WEIGHTS.large * large[1] + FOAM_WEIGHTS.small * small[1] };
  };
  const phases = [phase(a, 0, weightA)];
  if (1 - weightA > 0) phases.push(phase(b, 1, 1 - weightA));
  return phases;
}

/** Φ⁻¹(p), Abramowitz & Stegun 26.2.23 (error under 4.5e-4): what the shader thresholds a unit Gaussian at, to cover 1 − p of it. */
export function foamQuantile(p: number): number {
  const q = Math.min(1 - 1e-5, Math.max(1e-5, p));
  const tail = Math.min(q, 1 - q);
  const t = Math.sqrt(-2 * Math.log(tail));
  const x = t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);
  return q < 0.5 ? -x : x;
}

/** The densest foam the field draws as a pattern: at 1 every component's threshold would be minus infinity. */
const FOAM_MOST = 0.99999;
/** A component's weight below which it is left out: its threshold would sit past the texture's 4 sigma. */
const FOAM_LEAST = 1e-4;

/** log2 of the foam's density at Gaussian rank `g` in a stage (`FOAM_LAYER_LOG2`), linear between its quarter-sigma ranks. */
export function foamLayerLog2(g: number, stage: 'early' | 'late'): number {
  const table = FOAM_LAYER_LOG2[stage];
  const s = Math.min(table.length - 1 - 1e-6, Math.max(0, (g - FOAM_LAYER_RANKS[0]) * 4));
  const k = Math.floor(s);
  return table[k] + (table[k + 1] - table[k]) * (s - k);
}

/**
 * The foam field at world (x, z): by how much the foam's components pass their own thresholds, at most, in sigma
 * (`value`), and how many bubble layers the thickest of them lays there (`layers`, 1 at its edge). Each component, one
 * flow-map phase at one stage, is a unit Gaussian; one that weighs w (the phase's weight times the stage's, 1 - age early
 * and age late) is covered where it passes the value t that leaves (1 - F)^w of it below, so the union of all of them
 * covers F of the surface, as they are independent (the stages correlate 0.12), and it lays 2^(T(G) - T(t)) layers there
 * (`FOAM_LAYER_LOG2`). The foam is covered where `value` is positive. Blended linearly instead, two independent webs of
 * thin lines threshold to beads and blobs half of every flow period; the union keeps each a web of lines, only thinner
 * where it weighs less.
 */
export function foamFieldAt(x: number, z: number, flowX: number, flowZ: number, foam: number, age: number, time: number): { value: number; layers: number } {
  const keep = Math.log(1 - Math.min(FOAM_MOST, foam));
  let value = -8;
  let layers = 0;
  for (const { weight, early, late } of foamPhaseGauss(x, z, flowX, flowZ, time)) {
    for (const [g, share, stage] of [[early, 1 - age, 'early'], [late, age, 'late']] as const) {
      const w = weight * share;
      if (!(w > FOAM_LEAST)) continue;
      const threshold = foamQuantile(Math.exp(w * keep));
      value = Math.max(value, g - threshold);
      layers = Math.max(layers, 2 ** (foamLayerLog2(g, stage) - foamLayerLog2(threshold, stage)));
    }
  }
  return { value, layers };
}

/** The foam field at world (x, z), in sigma: `foamFieldAt`'s value, positive where the foam covers. */
export function foamFieldValue(x: number, z: number, flowX: number, flowZ: number, foam: number, age: number, time: number): number {
  return foamFieldAt(x, z, flowX, flowZ, foam, age, time).value;
}

/**
 * The share of the surface the foam covers at world (x, z): where `foamFieldValue` is positive, so that a share F of the
 * surface is covered. `age` 0 is early, 1 late. `footprint`, m, is the pixel's size: the edge is as soft as the field
 * changes across it (read off finite differences, as the GPU's derivatives are), and the pattern fades to F where the
 * pixel spans more than it can show.
 */
export function foamFieldCover(x: number, z: number, flowX: number, flowZ: number, foam: number, age: number, time: number, footprint = 0): number {
  if (!(foam > 0.001)) return 0;
  const at = (px: number, pz: number) => foamFieldValue(px, pz, flowX, flowZ, foam, age, time);
  const value = at(x, z);
  let width = FOAM_EDGE;
  if (footprint > 0) width = Math.min(1, Math.max(FOAM_EDGE, 0.5 * (Math.abs(at(x + footprint, z) - value) + Math.abs(at(x, z + footprint) - value))));
  const cover = smoothstep(-width, width, value);
  const fade = smoothstep(FOAM_FADE[0], FOAM_FADE[1], footprint);
  return cover + (foam - cover) * fade;
}

/** The foam values at which `FOAM_MEAN_REFLECTANCE` is tabulated: 0 to 1 every sixteenth. */
const FOAM_MEAN_LEVELS = 16;

/**
 * The mean reflectance of the covered foam in each stage at foam values 0, 1/16, ..., 1: R(N) averaged over the part of a
 * unit Gaussian that passes the threshold for F, with N = 2^(T(G) - T(t)) (one component, the stage's table). What a pixel
 * that spans more than the pattern can show draws (foam-lifecycle.md section 5: the far field's mean is F times the mean
 * covered albedo, from the bake).
 */
export const FOAM_MEAN_REFLECTANCE = (() => {
  const table = (stage: 'early' | 'late') => Array.from({ length: FOAM_MEAN_LEVELS + 1 }, (_, k) => {
    const foam = Math.min(FOAM_MOST, Math.max(1e-3, k / FOAM_MEAN_LEVELS));
    const threshold = foamQuantile(1 - foam);
    const base = foamLayerLog2(threshold, stage);
    let sum = 0;
    let weight = 0;
    for (let g = Math.max(threshold, -6); g < 6; g += 0.005) {
      const density = Math.exp(-0.5 * g * g);
      sum += density * foamLayerReflectance(Math.max(1, 2 ** (foamLayerLog2(g, stage) - base)));
      weight += density;
    }
    return weight > 0 ? sum / weight : FOAM_ALBEDO.streak;
  });
  return { early: table('early'), late: table('late') };
})();

/** The mean reflectance of covered foam at foam value `foam` and age `age` (`FOAM_MEAN_REFLECTANCE`, the stages mixed by age). */
export function foamMeanReflectance(foam: number, age: number): number {
  const s = Math.min(1, Math.max(0, foam)) * FOAM_MEAN_LEVELS;
  const k = Math.min(FOAM_MEAN_LEVELS - 1, Math.floor(s));
  const at = (table: readonly number[]) => table[k] + (table[k + 1] - table[k]) * (s - k);
  return at(FOAM_MEAN_REFLECTANCE.early) * (1 - age) + at(FOAM_MEAN_REFLECTANCE.late) * age;
}

/**
 * The reflectance of the foam where it covers at world (x, z): R(N) of the bubble layers the thickest component lays
 * there (`foamFieldAt`), 0.10 at a patch's edge, rising to 0.55 where it is many layers deep; where a pixel spans more than
 * the pattern can show, the mean over the covered foam (`foamMeanReflectance`).
 */
export function foamFieldReflectance(x: number, z: number, flowX: number, flowZ: number, foam: number, age: number, time: number, footprint = 0): number {
  const reflectance = foamLayerReflectance(Math.max(1, foamFieldAt(x, z, flowX, flowZ, foam, age, time).layers));
  const fade = smoothstep(FOAM_FADE[0], FOAM_FADE[1], footprint);
  return reflectance + (foamMeanReflectance(foam, age) - reflectance) * fade;
}

/**
 * GLSL: the foam's life cycle as a field of coverage and reflectance (`waterFoamField`), in `waterChurnMap`'s blue and
 * alpha, and the sampler. The field is `foamFieldAt` in GLSL: for each flow-map phase, two octaves sampled hex-tiled and
 * summed, at both stages; the four components, weighed by phase and age, united before any threshold, each thresholded
 * for its weight, and the bubble layers each lays by the bake's density (`FOAM_LAYER_LOG2`). Needs `foamPatternPars` and `waterTime` first. Every Rich water program carries it (`richFragmentPars`), the
 * tank's, the far ocean's and the curl's, so each draws its foam from it; it defines itself once whatever includes it
 * again (`waterChurnPars` does, for the tank).
 */
export const waterFoamFieldPars = /* glsl */ `
#ifndef WATER_FOAM_FIELD
#define WATER_FOAM_FIELD
uniform sampler2D waterChurnMap;
const float FOAM_TILE_LARGE = ${FOAM_OCTAVES.large.toFixed(3)};
const float FOAM_TILE_SMALL = ${FOAM_OCTAVES.small.toFixed(3)};
const float FOAM_RANGE = ${FOAM_RANGE.toFixed(3)};
uvec2 waterFoamPcg( uvec2 v ) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * 1664525u; v.y += v.x * 1664525u;
  v ^= v >> 16u;
  v.x += v.y * 1664525u; v.y += v.x * 1664525u;
  v ^= v >> 16u;
  return v;
}
// The foam's (early, late) Gaussian pair at q, in tiles: the three corners of the triangle of edge 1 that holds it, each
// a random turn and shift of the texture, blended in squares so the result is a unit Gaussian again (Heitz & Neyret 2018).
vec2 waterFoamHex( vec2 q, vec2 dx, vec2 dy, uint salt ) {
  vec2 s = vec2( q.x - q.y * 0.5773502692, q.y * 1.1547005384 );
  vec2 cell = floor( s );
  vec2 f = s - cell;
  float up = step( 1.0, f.x + f.y );
  vec3 w = mix( vec3( 1.0 - f.x - f.y, f.x, f.y ), vec3( f.x + f.y - 1.0, 1.0 - f.y, 1.0 - f.x ), up );
  w = w * w * w;
  w /= w.x + w.y + w.z;
  vec2 g = vec2( 0.0 );
  for ( int k = 0; k < 3; k ++ ) {
    vec2 corner = cell + ( k == 0 ? vec2( up ) : ( k == 1 ? vec2( 1.0, 0.0 ) : vec2( 0.0, 1.0 ) ) );
    uvec2 h = waterFoamPcg( uvec2( ivec2( corner ) + 1024 ) + salt );
    float turn = 6.2831853 * float( waterFoamPcg( h.yx ^ 0x9e3779b9u ).x ) / 4294967296.0;
    mat2 r = mat2( cos( turn ), sin( turn ), -sin( turn ), cos( turn ) );
    vec2 texel = textureGrad( waterChurnMap, r * q + vec2( h ) / 4294967296.0, r * dx, r * dy ).ba;
    g += ( k == 0 ? w.x : ( k == 1 ? w.y : w.z ) ) * ( 2.0 * texel - 1.0 ) * FOAM_RANGE;
  }
  return g / sqrt( dot( w, w ) );
}
// Both octaves of one flow-map phase at p, m; dpdx and dpdy are the world position's derivatives, taken before any branch.
vec2 waterFoamPhase( vec2 p, vec2 dpdx, vec2 dpdy, uint saltLarge, uint saltSmall ) {
  vec2 q = p / FOAM_TILE_LARGE;
  vec2 r = p / FOAM_TILE_SMALL + vec2( ${OCTAVE_SHIFT[0].toFixed(3)}, ${OCTAVE_SHIFT[1].toFixed(3)} );
  return ${FOAM_WEIGHTS.large.toFixed(7)} * waterFoamHex( q, dpdx / FOAM_TILE_LARGE, dpdy / FOAM_TILE_LARGE, saltLarge ) + ${FOAM_WEIGHTS.small.toFixed(7)} * waterFoamHex( r, dpdx / FOAM_TILE_SMALL, dpdy / FOAM_TILE_SMALL, saltSmall );
}
// Abramowitz & Stegun 26.2.23: the Gaussian value below which a share p of it lies.
float waterFoamQuantile( float p ) {
  p = clamp( p, 1e-5, 1.0 - 1e-5 );
  float t = sqrt( -2.0 * log( min( p, 1.0 - p ) ) );
  float x = t - ( 2.515517 + 0.802853 * t + 0.010328 * t * t ) / ( 1.0 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t );
  return p < 0.5 ? -x : x;
}
// The foam's density by rank, log2 (FOAM_LAYER_LOG2): early in .x, late in .y, linear between quarter-sigma ranks.
const float FOAM_LAYER_EARLY[${FOAM_LAYER_RANKS.length}] = float[${FOAM_LAYER_RANKS.length}]( ${FOAM_LAYER_LOG2.early.map((v) => v.toFixed(2)).join(', ')} );
const float FOAM_LAYER_LATE[${FOAM_LAYER_RANKS.length}] = float[${FOAM_LAYER_RANKS.length}]( ${FOAM_LAYER_LOG2.late.map((v) => v.toFixed(2)).join(', ')} );
vec2 waterFoamLog2( vec2 g ) {
  vec2 s = clamp( ( g - ${FOAM_LAYER_RANKS[0].toFixed(1)} ) * 4.0, 0.0, ${(FOAM_LAYER_RANKS.length - 1 - 1e-3).toFixed(3)} );
  ivec2 k = ivec2( s );
  vec2 f = s - vec2( k );
  return vec2( mix( FOAM_LAYER_EARLY[ k.x ], FOAM_LAYER_EARLY[ k.x + 1 ], f.x ), mix( FOAM_LAYER_LATE[ k.y ], FOAM_LAYER_LATE[ k.y + 1 ], f.y ) );
}
// One flow-map phase's stages g (early, late), weighing w, against their own thresholds: by how much the one that passes
// its own most does, and the most bubble layers any of them lays there (1 at its edge). keep is the log of the share of the
// surface the foam leaves open.
vec2 waterFoamPass( vec2 g, vec2 w, float keep ) {
  vec2 t = vec2( waterFoamQuantile( exp( w.x * keep ) ), waterFoamQuantile( exp( w.y * keep ) ) );
  vec2 layers = exp2( waterFoamLog2( g ) - waterFoamLog2( t ) );
  vec2 best = vec2( -8.0, 0.0 );
  if ( w.x > ${FOAM_LEAST.toExponential(0)} ) best = vec2( g.x - t.x, layers.x );
  if ( w.y > ${FOAM_LEAST.toExponential(0)} ) best = max( best, vec2( g.y - t.y, layers.y ) );
  return best;
}
// The foam field at p (foamFieldAt): in x, by how much the components pass their thresholds, in sigma, each flow-map phase
// at each stage a unit Gaussian, weighed by the phase and the age, covered where it leaves (1 - foam)^weight of itself
// below, so their union covers foam of the surface; in y, the bubble layers the thickest of them lays there.
vec2 waterFoamUnion( vec2 p, vec2 dpdx, vec2 dpdy, vec2 flow, float foam, float age ) {
  float a = fract( waterTime / FOAM_FLOW_PERIOD );
  float b = fract( a + 0.5 );
  // Each phase weighs nothing as it wraps, at every current (foamPhases).
  float wa = 1.0 - abs( 2.0 * a - 1.0 );
  float wb = 1.0 - wa;
  float keep = log( 1.0 - min( foam, ${FOAM_MOST} ) );
  vec2 stages = vec2( 1.0 - age, age );
  vec2 best = waterFoamPass( waterFoamPhase( p - flow * a * FOAM_FLOW_PERIOD, dpdx, dpdy, ${SALTS.large[0]}u, ${SALTS.small[0]}u ), wa * stages, keep );
  if ( wb > 0.0 ) best = max( best, waterFoamPass( waterFoamPhase( p - flow * b * FOAM_FLOW_PERIOD, dpdx, dpdy, ${SALTS.large[1]}u, ${SALTS.small[1]}u ), wb * stages, keep ) );
  return best;
}
// The mean reflectance of covered foam by foam value (FOAM_MEAN_REFLECTANCE), the stages mixed by age.
const float FOAM_MEAN_EARLY[${FOAM_MEAN_LEVELS + 1}] = float[${FOAM_MEAN_LEVELS + 1}]( ${FOAM_MEAN_REFLECTANCE.early.map((v) => v.toFixed(4)).join(', ')} );
const float FOAM_MEAN_LATE[${FOAM_MEAN_LEVELS + 1}] = float[${FOAM_MEAN_LEVELS + 1}]( ${FOAM_MEAN_REFLECTANCE.late.map((v) => v.toFixed(4)).join(', ')} );
float waterFoamMean( float foam, float age ) {
  float s = clamp( foam, 0.0, 1.0 ) * ${FOAM_MEAN_LEVELS.toFixed(1)};
  int k = min( ${FOAM_MEAN_LEVELS - 1}, int( s ) );
  float f = s - float( k );
  return mix( mix( FOAM_MEAN_EARLY[ k ], FOAM_MEAN_EARLY[ k + 1 ], f ), mix( FOAM_MEAN_LATE[ k ], FOAM_MEAN_LATE[ k + 1 ], f ), age );
}
// The foam at p as (share of the surface covered, reflectance where it covers): covered where the field passes 0, the edge
// as soft as the field changes across the pixel (half its fwidth); R(N) of the layers there, a single layer's 0.10 at the
// edge (foamFieldReflectance). Both give way to the foam's mean where a pixel (footprint, m) spans more than they can show.
// The branches are taken by a whole 2 x 2 quad together, so that fwidth reads real neighbours: a pixel with no foam may
// only return early when the foam at its neighbours, which its derivatives bound, is gone as well, and a pixel may return
// the mean at once only when the smallest footprint in its quad is past the fade.
vec2 waterFoamField( vec2 p, vec2 flow, float foam, float age, float footprint ) {
  vec2 dpdx = dFdx( p );
  vec2 dpdy = dFdy( p );
  float reach = foam + abs( dFdx( foam ) ) + abs( dFdy( foam ) );
  float least = footprint - abs( dFdx( footprint ) ) - abs( dFdy( footprint ) );
  if ( reach <= 0.001 ) return vec2( 0.0, ${FOAM_ALBEDO.streak.toFixed(3)} );
  if ( least >= ${FOAM_FADE[1].toFixed(3)} ) return vec2( foam, waterFoamMean( foam, age ) );
  vec2 field = waterFoamUnion( p, dpdx, dpdy, flow, foam, age );
  float width = clamp( 0.5 * fwidth( field.x ), ${FOAM_EDGE.toFixed(3)}, 1.0 );
  float reflectance = ${FOAM_ALBEDO.fresh.toFixed(3)} * ( 1.0 - exp( -max( field.y, 1.0 ) / ${FOAM_LAYER_SCALE.toFixed(1)} ) );
  float fade = smoothstep( ${FOAM_FADE[0].toFixed(3)}, ${FOAM_FADE[1].toFixed(3)}, footprint );
  return mix( vec2( smoothstep( -width, width, field.x ), reflectance ), vec2( foam, waterFoamMean( foam, age ) ), fade );
}
#endif
`;

/**
 * GLSL: the churn's (density, height) at p, carried by the current in the lace's two flow-map phases, and its relief as
 * a slope for the normal; the foam field (`waterFoamFieldPars`); and the streaks' sample of its late stage. Needs
 * `foamPatternPars` and `waterTime`.
 */
export const waterChurnPars = /* glsl */ `
${waterFoamFieldPars}
const float CHURN_TILE = ${CHURN_TILE.toFixed(3)};
const float CHURN_RELIEF = ${CHURN_RELIEF.toFixed(3)};
float waterFreshness( float voidFraction ) { return smoothstep( ${FRESH_AIR[0].toFixed(3)}, ${FRESH_AIR[1].toFixed(3)}, voidFraction ); }
vec2 waterChurnTap( vec2 p ) { return texture( waterChurnMap, p / CHURN_TILE ).rg; }
vec2 waterChurnAt( vec2 p, vec2 flow ) {
  float a = fract( waterTime / FOAM_FLOW_PERIOD );
  float b = fract( a + 0.5 );
  float w = 1.0 - abs( 2.0 * a - 1.0 );
  return w * waterChurnTap( p - flow * a * FOAM_FLOW_PERIOD )
    + ( 1.0 - w ) * waterChurnTap( p - flow * b * FOAM_FLOW_PERIOD + vec2( 2.9, 1.7 ) );
}
vec2 waterChurnSlope( vec2 p, vec2 flow ) {
  const float e = CHURN_TILE / ${CHURN_SIZE.toFixed(1)};
  float h = waterChurnAt( p, flow ).y;
  return CHURN_RELIEF * vec2( waterChurnAt( p + vec2( e, 0.0 ), flow ).y - h, waterChurnAt( p + vec2( 0.0, e ), flow ).y - h ) / e;
}

// The streaks' sample of the late stage at frame (tiles), in sigma, turned and shifted by an anchor's hash h as a hex corner's
// sample is (declared in waterStreakPars, which the water's program lists first).
float waterStreakField( vec2 frame, vec2 dx, vec2 dy, uvec2 h ) {
  float turn = 6.2831853 * float( waterFoamPcg( h.yx ^ 0x9e3779b9u ).x ) / 4294967296.0;
  mat2 r = mat2( cos( turn ), sin( turn ), -sin( turn ), cos( turn ) );
  return ( 2.0 * textureGrad( waterChurnMap, r * frame + vec2( h ) / 4294967296.0, r * dx, r * dy ).a - 1.0 ) * FOAM_RANGE;
}
`;
