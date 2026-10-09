/**
 * The waterline (the shoreline fix, 2026-10-09). The surf zone writes a dry render node 5 cm under its bed
 * (`SurfZoneSimulation.writeUniformSurface`, which `PhysicalSurfWater` mirrors), so the sand mesh hides the water there.
 * The drawn water then met the sand along the wet nodes' staircase: where the shore runs across the grid, its edge
 * stepped a node at a time, in metre-long teeth. For drawing only, the two rings of dry nodes beside the water take the
 * depth the water's run of depth reaches there (2 d_j − d_i along each line in, or a neighbour's level where the line
 * holds one known node), so the drawn depth falls through zero between the nodes where the shore really is, and the
 * drawn edge follows that line, not the nodes'. Under the sand the sand hides it as before; the physics keeps its own
 * heights.
 */

/** How far under its bed the surf zone writes a dry node, m (`writeUniformSurface`'s convention). */
export const DRY_DROP = 0.05;
/** The surf zone's dry threshold, m: water thinner than this is dry (`SurfZoneSimulation`'s WET). */
export const DRY_DEPTH = 0.01;
/**
 * The least the outer ring keeps under its bed, m, so the water never lies flush along the sand, where the two would
 * fight over the depth buffer.
 */
export const DRY_MARGIN = 0.01;
/** A node within this of `bed − DRY_DROP` is dry; a wet node stands at least `DRY_DEPTH` over its bed, m. */
const DRY_MATCH = 1e-3;
/**
 * Between full scans, `fill` classifies only the rows of the last band of dry rows and this many either side: a
 * waterline moves a small part of a row a snapshot. Dry rows reaching the window's edge send it to a full scan.
 */
const SCAN_MARGIN = 4;
/** Every this many snapshots `fill` scans every row, for dry ground appearing away from the beach (a reef in a trough). */
export const FULL_SCAN_EVERY = 16;

const WET = 0;
const DRY = 1;
const QUEUED = 2;
const FILLED = 3;

/**
 * The first ring's drawn depth from the depth extrapolated to it, m. Up to the dry threshold it is the extrapolation
 * itself: the surf zone keeps such water dry, but the shore crosses beside the node. Beyond it the extrapolation no
 * longer describes a dry node (a reef's step, a wall), so it folds back, continuously, under the bed.
 */
export function innerDepth(extrapolated: number): number {
  return extrapolated <= DRY_DEPTH ? extrapolated : Math.max(-DRY_MARGIN, 2 * DRY_DEPTH - extrapolated);
}

/** Reused state for `fill`, sized to the grid on first use. */
export class ShorelineFill {
  private state = new Uint8Array(0);
  private near = new Uint8Array(0);
  private ring = new Int32Array(0);
  private next = new Int32Array(0);
  private depths = new Float32Array(0);
  /** The last band of rows holding dry nodes (none: -1), on this grid, and the snapshots since the last full scan. */
  private bandLow = -1;
  private bandHigh = -1;
  private grid = { nx: 0, nz: 0 };
  private sinceFull = 0;
  /** The last full scan found no dry node (a walled pool, a sea with no shore): nothing to do until the next one. */
  private shoreless = false;

  /** Scan every row on the next `fill` (a new sea). */
  reset(): void {
    this.bandLow = -1;
    this.bandHigh = -1;
    this.shoreless = false;
  }

  /**
   * Move the two rings of dry nodes beside the water in interleaved (height, foam) `data` to the depth extrapolated
   * to them from the nodes already known (wet, or the ring before), edges weighted 1 and corners ½, over `bed` (one
   * elevation per node): the first ring by `innerDepth`, the second at least `DRY_MARGIN` under its bed. Returns how
   * many nodes it moved. It scans the last band of dry rows and their margin, and every row every `FULL_SCAN_EVERY`
   * snapshots or whenever the band may have left that window.
   */
  fill(data: Float32Array, bed: Float32Array, nx: number, nz: number): number {
    const count = nx * nz;
    if (this.state.length < count) {
      this.state = new Uint8Array(count);
      this.near = new Uint8Array(count);
      this.ring = new Int32Array(count);
      this.next = new Int32Array(count);
      this.depths = new Float32Array(count);
    }
    const { state, near } = this;
    if (this.grid.nx !== nx || this.grid.nz !== nz) {
      this.grid = { nx, nz };
      this.reset();
    }
    if (this.shoreless && this.sinceFull < FULL_SCAN_EVERY - 1) {
      this.sinceFull += 1;
      return 0;
    }
    // Which nodes are dry, and the band of rows that holds them (the beach's few rows, in a grid of hundreds): over the
    // last band's window, unless that cannot be trusted.
    let first = 0;
    let last = nz - 1;
    let partial = this.bandLow >= 0 && this.sinceFull < FULL_SCAN_EVERY - 1;
    if (partial) {
      first = Math.max(0, this.bandLow - SCAN_MARGIN);
      last = Math.min(nz - 1, this.bandHigh + SCAN_MARGIN);
    }
    let found = this.classify(data, bed, nx, first, last);
    // The rings read two rows beyond the band: a band at the window's edge may run on past it, or have moved out.
    if (partial && (found.dry === 0 || (found.low < first + 3 && first > 0) || (found.high > last - 3 && last < nz - 1))) {
      partial = false;
      found = this.classify(data, bed, nx, 0, nz - 1);
    }
    this.sinceFull = partial ? this.sinceFull + 1 : 0;
    const { dry, low, high } = found;
    this.bandLow = dry > 0 ? low : -1;
    this.bandHigh = dry > 0 ? high : -1;
    this.shoreless = dry === 0;
    if (dry === 0 || dry === count) return 0;
    // The first ring: the dry nodes with a wet node among their 8 neighbours, through each row's wet nodes widened by
    // a column either side (`near`), over the band and a row beyond it.
    const top = Math.max(0, low - 1);
    const bottom = Math.min(nz - 1, high + 1);
    for (let r = top; r <= bottom; r += 1) {
      const start = r * nx;
      for (let c = 0; c < nx; c += 1) {
        const k = start + c;
        near[k] = state[k] === WET || (c > 0 && state[k - 1] === WET) || (c + 1 < nx && state[k + 1] === WET) ? 1 : 0;
      }
    }
    let size = 0;
    for (let r = low; r <= high; r += 1) {
      for (let k = r * nx; k < (r + 1) * nx; k += 1) {
        if (state[k] !== DRY || !(near[k] || (r > 0 && near[k - nx]) || (r + 1 < nz && near[k + nx]))) continue;
        this.ring[size] = k;
        size += 1;
      }
    }
    for (let k = 0; k < size; k += 1) state[this.ring[k]] = QUEUED;
    let moved = 0;
    for (let pass = 0; pass < 2 && size > 0; pass += 1) {
      const { ring, depths } = this;
      // Each node of a ring takes its depth from the nodes known before the ring, so the order within it never matters.
      for (let n = 0; n < size; n += 1) {
        const extrapolated = this.extrapolate(ring[n], data, bed, nx, nz);
        depths[n] = pass === 0 ? innerDepth(extrapolated) : Math.min(-DRY_MARGIN, extrapolated);
      }
      for (let n = 0; n < size; n += 1) {
        data[2 * ring[n]] = bed[ring[n]] + depths[n];
        state[ring[n]] = FILLED;
      }
      moved += size;
      if (pass === 1) break;
      // The second ring: the dry nodes beside the first.
      let nextSize = 0;
      for (let n = 0; n < size; n += 1) {
        const k = ring[n];
        const c = k % nx;
        const r = (k - c) / nx;
        for (let dr = -1; dr <= 1; dr += 1) {
          for (let dc = -1; dc <= 1; dc += 1) {
            const rr = r + dr;
            const cc = c + dc;
            if (rr < 0 || rr >= nz || cc < 0 || cc >= nx) continue;
            const j = rr * nx + cc;
            if (state[j] !== DRY) continue;
            state[j] = QUEUED;
            this.next[nextSize] = j;
            nextSize += 1;
          }
        }
      }
      [this.ring, this.next] = [this.next, this.ring];
      size = nextSize;
    }
    return moved;
  }

  /** Mark rows `first`–`last` wet or dry; how many are dry, and the first and last rows holding any. */
  private classify(data: Float32Array, bed: Float32Array, nx: number, first: number, last: number): { dry: number; low: number; high: number } {
    const { state } = this;
    let dry = 0;
    let low = -1;
    let high = -1;
    for (let r = first; r <= last; r += 1) {
      let rowDry = 0;
      const end = (r + 1) * nx;
      for (let k = r * nx; k < end; k += 1) {
        const offset = data[2 * k] - bed[k] + DRY_DROP;
        const isDry = offset < DRY_MATCH && offset > -DRY_MATCH ? DRY : WET;
        state[k] = isDry;
        rowDry += isDry;
      }
      if (rowDry > 0) {
        dry += rowDry;
        if (low < 0) low = r;
        high = r;
      }
    }
    return { dry, low, high };
  }

  /** The depth at node k from each known 8-neighbour j: 2 d_j − d_i with the known node i beyond it, else j's level. */
  private extrapolate(k: number, data: Float32Array, bed: Float32Array, nx: number, nz: number): number {
    const { state } = this;
    const c = k % nx;
    const r = (k - c) / nx;
    let sum = 0;
    let weight = 0;
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        const rj = r + dr;
        const cj = c + dc;
        if ((dr === 0 && dc === 0) || rj < 0 || rj >= nz || cj < 0 || cj >= nx) continue;
        const j = rj * nx + cj;
        if (state[j] !== WET && state[j] !== FILLED) continue;
        const ri = rj + dr;
        const ci = cj + dc;
        const i = ri * nx + ci;
        const inLine = ri >= 0 && ri < nz && ci >= 0 && ci < nx && (state[i] === WET || state[i] === FILLED);
        const depthJ = data[2 * j] - bed[j];
        const depthK = inLine ? 2 * depthJ - (data[2 * i] - bed[i]) : data[2 * j] - bed[k];
        const w = dr === 0 || dc === 0 ? 1 : 0.5;
        sum += w * depthK;
        weight += w;
      }
    }
    return sum / weight;
  }
}

/**
 * How long wet sand takes to dry, s: the e-folding time of its darkness once the swash has left it (a rendering choice,
 * long enough to keep the swash zone dark between sets, as a beach is below its last high runup).
 */
export const WET_SAND_DRYING = 40;
/** How often the memory folds in the water, in sea time, s: a swash covers its sand for longer than this. */
export const WET_SAND_STEP = 0.1;
/** A jump in sea time longer than this, s (or backward), is a new sea: the memory starts afresh. */
const WET_SAND_GAP = 5;
/**
 * How much of its colour saturated sand loses: water around the grains lets more light into them, to be absorbed, so
 * wet sand is markedly darker than dry (Twomey, Bohren & Mergenthaler 1986, Applied Optics 25, 431). Here it keeps 0.6
 * (a rendering choice).
 */
export const WET_SAND_DARKENING = 0.4;
/** Sand under this much drawn water or more is the sea's bed, not the beach: it keeps the water's look, m. */
export const WET_SAND_SUBMERGED = 0.1;

/**
 * Which sand the water wetted lately (the shoreline fix): 1 where the drawn water covers a node now, falling as
 * e^{−t/WET_SAND_DRYING} once it has left, kept per render node and packed to bytes for a linear-filtered texture.
 * The bytes are 0 under more than `WET_SAND_SUBMERGED` of water, so the seabed looks only at its beach.
 */
export class WetSandMemory {
  memory = new Float32Array(0);
  bytes = new Uint8Array(0);
  private time = Number.NaN;

  /** Forget the sand's past (a new sea, or a new grid of `count` nodes). */
  reset(count = this.memory.length): void {
    if (this.memory.length !== count) {
      this.memory = new Float32Array(count);
      this.bytes = new Uint8Array(count);
    } else {
      this.memory.fill(0);
      this.bytes.fill(0);
    }
    this.time = Number.NaN;
  }

  /**
   * Fold in the water as drawn at sea `time` (interleaved (height, foam) `data` over `bed`): a node whose surface stands
   * over its bed is wet now. Returns whether `bytes` changed (at most once every `WET_SAND_STEP` of sea time).
   */
  update(data: Float32Array, bed: Float32Array, time: number): boolean {
    const count = bed.length;
    if (this.memory.length !== count) this.reset(count);
    const elapsed = time - this.time;
    if (elapsed >= 0 && elapsed < WET_SAND_STEP) return false;
    const fade = elapsed >= 0 && elapsed <= WET_SAND_GAP ? Math.exp(-elapsed / WET_SAND_DRYING) : 0;
    const { memory, bytes } = this;
    for (let k = 0; k < count; k += 1) {
      const depth = data[2 * k] - bed[k];
      const wet = depth > 0 ? 1 : memory[k] * fade;
      memory[k] = wet;
      bytes[k] = depth > WET_SAND_SUBMERGED ? 0 : (wet * 255 + 0.5) | 0;
    }
    this.time = time;
    return true;
  }
}

/** Seabed GLSL pars for the wet sand: the memory's texture on the water's grid. Needs `waterHeightPars` before it. */
export const wetSandPars = /* glsl */ `
uniform sampler2D waterWetSand;
`;

/**
 * Seabed GLSL after its colour (`vSeabedWorld`, `diffuseColor`): the sand the swash wetted lately, darker, wherever it
 * stands above the drawn water (under it, it is the sea's bed, seen from below as before).
 */
export const wetSandFragment = /* glsl */ `
{
  float wetSand = texture2D( waterWetSand, ( ( vSeabedWorld.xz - waterGrid.xy ) / waterGrid.z + 0.5 ) / waterGridSize ).r;
  if ( wetSand > 0.0 && vSeabedWorld.y > waterHeightAt( vSeabedWorld.xz ) - ${WET_SAND_SUBMERGED.toFixed(2)} ) {
    diffuseColor.rgb *= 1.0 - ${WET_SAND_DARKENING.toFixed(2)} * wetSand;
  }
}
`;
