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

  /**
   * Move the two rings of dry nodes beside the water in interleaved (height, foam) `data` to the depth extrapolated
   * to them from the nodes already known (wet, or the ring before), edges weighted 1 and corners ½, over `bed` (one
   * elevation per node): the first ring by `innerDepth`, the second at least `DRY_MARGIN` under its bed. Returns how
   * many nodes it moved.
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
    // Which nodes are dry, and the band of rows that holds them (the beach's few rows, in a grid of hundreds).
    let dry = 0;
    let low = nz;
    let high = -1;
    for (let r = 0; r < nz; r += 1) {
      const before = dry;
      for (let k = r * nx; k < (r + 1) * nx; k += 1) {
        const offset = data[2 * k] - bed[k] + DRY_DROP;
        const isDry = offset < DRY_MATCH && offset > -DRY_MATCH;
        state[k] = isDry ? DRY : WET;
        if (isDry) dry += 1;
      }
      if (dry > before) {
        if (r < low) low = r;
        high = r;
      }
    }
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
