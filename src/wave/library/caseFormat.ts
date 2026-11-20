/**
 * C2's case file, BRL3 (step 1b, 2026-11-13; docs/research/wave-strategy-alternatives/c2-step1b.md): one Basilisk run's
 * whole breaking wave, from well before the throw to the bore, as `tools/basilisk/analysis/c2_library.py` writes it
 * (`<run>_c2.json.gz`) and `scripts/barrel-library.ts --format brl3` packs it. Read by `WaveLibrary`. Nothing in the
 * running game reads it yet (C2 step 3 wires it).
 *
 *   u32 magic "BRL3" · u32 header length · header (UTF-8 JSON) · padding to 4 · the sections, each padded to 4
 *
 * The sections, in this order, with their lengths from the header's counts (and listed in `header.sections`):
 *   frames    f32 [frames × 128 × 2]            the profile, h0: x forward from the crest at τ = 0, y up from still water
 *   use       u8  [frames]                      1 for an "own" frame, 0 for "refill" (the reader rebuilds it)
 *   path      f32 [frames × PATH_COLUMNS]       the path table (`PATH`), NaN where c2_library.py wrote null
 *   velocity  f16 [frames × 128 × depths × 2]   per point and depth, the water's (u, v), √(g h0), in the run's fixed
 *                                               frame (u toward the shore, v up); NaN where none, and no section at all
 *                                               where the header's `velocityDepths` is empty
 *   qTime     f32 [columns frames]              QOUT: each column frame's τ
 *   qFlow     f32 [columns frames × nx × 2]     QOUT: per bin, the volume per width h and the flux q, h0 and h0 √(g h0)
 *   qTop      f16 [columns frames × nx]         QOUT: per bin, the highest water, h0 (NaN for an empty bin)
 *   qAir      f16 [columns frames × nx]         QOUT: per bin, the air share under the top, 0 to 1
 *   bore      f32 [bore frames × 4]             the bore: τ, its front's x, its first bin, its bin count
 *   boreTop   f16 [Σ bin counts]                the bore's top over its bins, h0
 *   boreAir   f16 [Σ bin counts]                the bore's air share over its bins
 * Everything is little-endian. Lengths are in h0 and times in √(h0/g), as the run's.
 */

export const WAVE_CASE_MAGIC = 0x42524c33; // "BRL3"
export const WAVE_POINTS = 128;
/** The landmarks' indices, as `ProfileLibrary`'s (c2_library.py writes the same). */
export const WAVE_LANDMARK = { back: 0, crest: 32, lip: 64, throat: 88, toe: 112, front: 127 } as const;
/** The path table's columns. */
export const PATH = { tau: 0, crestX: 1, crestY: 2, trough: 3, H: 4, d: 5, Hd: 6, speed: 7, face: 8 } as const;
export const PATH_COLUMNS = 9;

/** The header: every number the sections do not hold. */
export interface WaveCaseHeader {
  format: 'brl3 1';
  id: string;
  run: string;
  level: number;
  /** The finest cell, h0. */
  dx: number;
  /** The run's h0, m (the case is used at any h0: lengths × h0, times × √(h0/g)). */
  h0: number;
  /** The keys: the foot crest over the foot depth (its scout's), the bed's slope, the reef crest's depth over h0. */
  a0: number;
  slope: number;
  reefDepth: number;
  /** The train's period, √(h0/g). */
  period: number;
  /** The run's time when the face went vertical (τ = 0); τ at touchdown. */
  tVertical: number;
  touchdown: number;
  /** τ at the first frame, and between frames. */
  tauStart: number;
  tauStep: number;
  frames: number;
  points: number;
  /** x of the crest at τ = 0 in the run's frame (from its left wall), h0: the frames' origin. */
  origin: number;
  /** The velocity's depths under the surface, h0 (c2_library.py's labels in `velocityLabels`). */
  velocityDepths: number[];
  velocityLabels: string[];
  /** The lip's and throat's shares of the crest-to-toe arc before the throw (c2_library.py's `arc`). */
  arc: { lip: number; throat: number };
  uses: { own: number; refill: number };
  /** c2_library.py's path checks and stats, as written. */
  pathChecks: unknown;
  stats: unknown;
  /** QOUT's grid: its first bin's centre (h0, from `origin`), the bin, the bins, its frames' spacing (√(h0/g)), the mass check. */
  q: { x0: number; dx: number; nx: number; frames: number; every: number; boreFrames: number; boreBins: number; boreSpeed: number | null; mass: unknown } | null;
  /** Each section's name, byte offset from the file's start and byte length (a check for the reader). */
  sections: Array<{ name: string; offset: number; bytes: number }>;
}

export interface WaveCase {
  header: WaveCaseHeader;
  frames: Float32Array;
  use: Uint8Array;
  path: Float32Array;
  velocity: Float32Array;
  qTime: Float32Array;
  qFlow: Float32Array;
  qTop: Float32Array;
  qAir: Float32Array;
  bore: Float32Array;
  boreTop: Float32Array;
  boreAir: Float32Array;
}

// ---- float16 (IEEE binary16), by bits: no Math.pow or Math.log, so the same everywhere.

const f32 = new Float32Array(1);
const u32 = new Uint32Array(f32.buffer);

/** The nearest binary16 to `value` (via binary32, ties to even), as bits. NaN stays NaN; past 65504, ±Infinity. */
export function toHalf(value: number): number {
  f32[0] = value;
  const x = u32[0];
  const sign = (x >>> 16) & 0x8000;
  const exponent = (x >>> 23) & 0xff;
  let mantissa = x & 0x7fffff;
  if (exponent === 0xff) return sign | 0x7c00 | (mantissa !== 0 ? 0x200 : 0);
  const e = exponent - 127 + 15;
  if (e >= 0x1f) return sign | 0x7c00;
  if (e <= 0) {
    if (e < -10) return sign;
    mantissa |= 0x800000;
    const shift = 14 - e;
    const half = 1 << (shift - 1);
    let bits = mantissa >>> shift;
    const rest = mantissa & ((1 << shift) - 1);
    if (rest > half || (rest === half && (bits & 1) === 1)) bits += 1;
    return sign | bits;
  }
  let bits = (e << 10) | (mantissa >>> 13);
  const rest = mantissa & 0x1fff;
  if (rest > 0x1000 || (rest === 0x1000 && (bits & 1) === 1)) bits += 1;
  return sign | bits;
}

let halfTable: Float32Array | undefined;
/** Every binary16's value, exact (a product with a power of two). */
function halves(): Float32Array {
  if (halfTable) return halfTable;
  const table = new Float32Array(65536);
  for (let h = 0; h < 65536; h += 1) {
    const sign = h & 0x8000 ? -1 : 1;
    const e = (h >>> 10) & 0x1f;
    const m = h & 0x3ff;
    let scale = 1;
    if (e === 0x1f) { table[h] = m !== 0 ? Number.NaN : sign * Number.POSITIVE_INFINITY; continue; }
    if (e === 0) {
      for (let k = 0; k < 24; k += 1) scale /= 2;
      table[h] = sign * m * scale;
      continue;
    }
    for (let k = 15; k > e; k -= 1) scale /= 2;
    for (let k = 15; k < e; k += 1) scale *= 2;
    table[h] = sign * (1 + m / 1024) * scale;
  }
  halfTable = table;
  return table;
}

export function fromHalf(bits: number): number {
  return halves()[bits & 0xffff];
}

// ---- The file.

const SECTIONS = ['frames', 'use', 'path', 'velocity', 'qTime', 'qFlow', 'qTop', 'qAir', 'bore', 'boreTop', 'boreAir'] as const;
type SectionName = (typeof SECTIONS)[number];
const KIND: Record<SectionName, 'f32' | 'u8' | 'f16'> = {
  frames: 'f32', use: 'u8', path: 'f32', velocity: 'f16', qTime: 'f32', qFlow: 'f32', qTop: 'f16', qAir: 'f16', bore: 'f32', boreTop: 'f16', boreAir: 'f16',
};
const WIDTH = { f32: 4, u8: 1, f16: 2 } as const;
const pad4 = (n: number) => Math.ceil(n / 4) * 4;

/** Each section's element count, from the header's counts. */
function counts(h: Omit<WaveCaseHeader, 'sections'>): Record<SectionName, number> {
  const q = h.q;
  const nq = q ? q.frames : 0;
  const nx = q ? q.nx : 0;
  return {
    frames: h.frames * h.points * 2,
    use: h.frames,
    path: h.frames * PATH_COLUMNS,
    velocity: h.frames * h.points * h.velocityDepths.length * 2,
    qTime: nq,
    qFlow: nq * nx * 2,
    qTop: nq * nx,
    qAir: nq * nx,
    bore: (q ? q.boreFrames : 0) * 4,
    boreTop: q ? q.boreBins : 0,
    boreAir: q ? q.boreBins : 0,
  };
}

/** The case as BRL3 bytes. The same case gives the same bytes. */
export function encodeWaveCase(c: WaveCase): Uint8Array {
  const { sections: _ignored, ...meta } = c.header;
  const n = counts(meta);
  for (const name of SECTIONS) {
    if (c[name].length !== n[name]) throw new Error(`${meta.id}: section ${name} holds ${c[name].length} values, the header says ${n[name]}`);
  }
  // The header lists the sections' places, so its own length decides where they start: settle it in two passes.
  let sections: WaveCaseHeader['sections'] = [];
  let text = new Uint8Array(0);
  for (let pass = 0; pass < 3; pass += 1) {
    text = new TextEncoder().encode(JSON.stringify({ ...meta, sections }));
    let at = 8 + pad4(text.length);
    const next = SECTIONS.map((name) => {
      const bytes = n[name] * WIDTH[KIND[name]];
      const entry = { name, offset: at, bytes };
      at += pad4(bytes);
      return entry;
    });
    if (JSON.stringify(next) === JSON.stringify(sections)) break;
    sections = next;
  }
  text = new TextEncoder().encode(JSON.stringify({ ...meta, sections }));
  const last = sections[sections.length - 1];
  const out = new Uint8Array(last.offset + pad4(last.bytes));
  const view = new DataView(out.buffer);
  view.setUint32(0, WAVE_CASE_MAGIC, true);
  view.setUint32(4, text.length, true);
  out.set(text, 8);
  if (8 + pad4(text.length) !== sections[0].offset) throw new Error('BRL3: the header did not settle');
  for (const s of sections) {
    const name = s.name as SectionName;
    const values = c[name];
    const kind = KIND[name];
    for (let i = 0; i < values.length; i += 1) {
      if (kind === 'f32') view.setFloat32(s.offset + 4 * i, values[i], true);
      else if (kind === 'u8') view.setUint8(s.offset + i, values[i]);
      else view.setUint16(s.offset + 2 * i, toHalf(values[i]), true);
    }
  }
  return out;
}

/**
 * C2 step 3's game file (`scripts/barrel-library.ts --format brl3 --game`): the case as the game reads it so far, its
 * frames, uses and path to `keepAfter` τ past its touchdown (the slices hand the bore back to the sea by then,
 * `SLICE_LIFE`), without QOUT and the bore (step 5). The same frames, bit for bit.
 *
 * C2 step 4 (c2-step4.md): the velocity comes too, `u` and `v` at the case's two depths, as the float16 the whole file
 * already holds (so the game file's values are the whole case's, bit for bit). `velocity: false` drops it, as step 3's
 * files did.
 */
export function gameCase(c: WaveCase, keepAfter: number, options: { velocity?: boolean } = {}): WaveCase {
  const h = c.header;
  const touchdown = h.touchdown ?? Number.NaN;
  const last = touchdown === touchdown ? Math.min(h.frames, Math.floor((touchdown + keepAfter - h.tauStart) / h.tauStep) + 2) : h.frames;
  const frames = Math.max(2, last);
  const { sections: _sections, ...meta } = h;
  let own = 0;
  for (let k = 0; k < frames; k += 1) if (c.use[k] === 1) own += 1;
  const keepVelocity = options.velocity !== false && h.velocityDepths.length > 0 && c.velocity.length >= frames * h.points * h.velocityDepths.length * 2;
  const nd = keepVelocity ? h.velocityDepths.length : 0;
  const header: WaveCaseHeader = {
    ...meta, frames, velocityDepths: keepVelocity ? [...h.velocityDepths] : [], velocityLabels: keepVelocity ? [...h.velocityLabels] : [],
    uses: { own, refill: frames - own }, q: null, sections: [],
  };
  return {
    header, frames: c.frames.slice(0, frames * h.points * 2), use: c.use.slice(0, frames), path: c.path.slice(0, frames * PATH_COLUMNS),
    velocity: keepVelocity ? c.velocity.slice(0, frames * h.points * nd * 2) : new Float32Array(0),
    qTime: new Float32Array(0), qFlow: new Float32Array(0), qTop: new Float32Array(0), qAir: new Float32Array(0),
    bore: new Float32Array(0), boreTop: new Float32Array(0), boreAir: new Float32Array(0),
  };
}

export function isWaveCase(bytes: Uint8Array): boolean {
  return bytes.byteLength >= 8 && new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true) === WAVE_CASE_MAGIC;
}

/** A BRL3 file's case. Throws on another format or a file whose sections do not match its header. */
export function decodeWaveCase(bytes: Uint8Array): WaveCase {
  if (!isWaveCase(bytes)) throw new Error('Not a BRL3 wave case');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const length = view.getUint32(4, true);
  const header = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + length))) as WaveCaseHeader;
  if (header.format !== 'brl3 1') throw new Error(`BRL3: unknown format ${String(header.format)}`);
  const n = counts(header);
  const out: Partial<WaveCase> = { header };
  let at = 8 + pad4(length);
  for (const name of SECTIONS) {
    const kind = KIND[name];
    const size = n[name] * WIDTH[kind];
    const listed = header.sections.find((s) => s.name === name);
    if (!listed || listed.offset !== at || listed.bytes !== size) throw new Error(`BRL3: section ${name} is not where the header says`);
    if (at + size > bytes.byteLength) throw new Error(`BRL3: section ${name} runs past the file's end`);
    if (kind === 'u8') {
      out[name] = bytes.slice(at, at + size) as never;
    } else {
      const values = new Float32Array(n[name]);
      for (let i = 0; i < values.length; i += 1) values[i] = kind === 'f32' ? view.getFloat32(at + 4 * i, true) : fromHalf(view.getUint16(at + 2 * i, true));
      out[name] = values as never;
    }
    at += pad4(size);
  }
  return out as WaveCase;
}
