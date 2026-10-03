/**
 * The Rich foam's life cycle, baked once (foam-and-whitewater.md item 2, decided 2026-09-29; the recipe is
 * foam-lifecycle.md §3, option A). Foam is a floater: it cannot follow water that sinks, so surface turbulence
 * (upwellings are sources, downwellings sinks) gathers it into lines and opens holes of every size between them,
 * and the lines outlive the eddies that made them. A dense raft therefore opens into holes, then lace, then threads.
 * Two stages of that cycle are kept: early (dense, with holes) and late (lace and threads).
 *
 * The baker lets a uniform raft of floating foam be carried by a periodic kinematic simulation of a compressible surface
 * flow, reads its density at two ages, and stores each as a Gaussianised rank (Heitz & Neyret 2018: every texel's rank
 * among all texels, through the inverse normal CDF). A shader that blends such textures in Gaussian space and thresholds
 * at Φ⁻¹(1 − F) covers exactly the fraction F of the surface, whatever F is, and the covered part is always the densest.
 *
 * - **The flow** is u = ∇⊥ψ + ∇φ as random Fourier modes (kinematic simulation, Fung et al. 1992), the two potentials'
 *   spectra equal in shape, so the surface compressibility C = ⟨(∇·u)²⟩/⟨(∇u)²⟩ is the share of energy in the
 *   compressive part: 0.49 ± 0.02 measured at the surface of a stirred tank (Larkin et al. 2009; Boffetta et al. 2004
 *   found 0.45, Gutiérrez & Aumaître about 0.5). Each mode is an Ornstein–Uhlenbeck process with the correlation time
 *   of an eddy of its size, τ ∝ (k³E)^(-1/2) ∝ k^(-2/3) in the inertial range (Fung et al.; Boffetta et al.: the flow's
 *   finite time correlation is required for the clustering).
 * - **The foam** starts uniform, so its density at a point is the area, in the start, of the fluid that has come to it:
 *   the density of a conserved scalar carried by the flow is the Jacobian of the flow map run backward. Each cell of
 *   an Eulerian grid is traced back through the stored flow, and its mass is the area of the quad its corners came
 *   from. Nothing is interpolated between time steps, so a ridge is as thin as the grid and a hole exactly empty. (A
 *   semi-Lagrangian solver would smear every ridge over 0.3 m, the note's prototype. A lattice of foam carried forward
 *   folds over itself: its cells' areas summed to 3 times the tile after 1.5 turnovers and 12 times after 3.5, at 192²
 *   points, and to more with more, and its patches drew every ridge as straight chords.)
 *   The traced map folds too, in cells squeezed ridge-ward, once the stretch outgrows the cell: its positive areas sum
 *   to 2.6 times the foam there is after 1.5 turnovers and 11 times after 3. So only the density's rank is used, never
 *   its size, and the rank is checked against the answer by force: a million floating particles carried by the same
 *   flow gather where the traced density says, with a Spearman rank correlation of 0.92 after 1.5 turnovers and 0.85
 *   after 3, both smoothed over two cells (the test repeats it with fewer particles).
 *
 * The density is the mass of each cell, so a ridge thinner than a cell is drawn by how much of its length each cell
 * holds: along a slanting ridge that rises and falls cell by cell, beads. The trace is as fine as the texture, and its
 * density blurred over two of its cells, the least that removes the beads (at one they show): lines 2–4 cm wide. (At
 * half the texture's resolution, the blur that hid them drew every line some 12 cm wide, and a little foam drew blobs.)
 *
 * Provisional, until measured from footage (foam-lifecycle.md §9): the spectrum's shape and peak (4 box wavelengths
 * across the tile; the flow's integral scale, measured on it, is 0.40 m on the 12 m tile, so the tile is 30 L_int: the
 * note asks for at least 16), its speed (one component's root-mean-square velocity 0.81 m a unit of the bake's time, so a
 * unit is about two eddy turnovers L_int/u', measured), the unsteadiness λ, and the two stages' ages, 1.5 and 3 units,
 * about 3 and 6 turnovers (Boffetta et al. see clusters at about 3 of theirs; the note's table has opening cells at 1–2,
 * lace at 2–5 and streaks beyond 5).
 */

export const FOAM_BAKE = {
  /** Texels per side of each stage's texture. */
  size: 1024,
  /** Samples of the backward flow map per side, as many as the texture's texels (the density is raised to `size` if fewer). */
  trace: 1024,
  /** Velocity grid per side, 8 or more points to the shortest wavelength. */
  grid: 128,
  /** Highest wavenumber of the flow, in tile wavelengths: two octaves past the peak, at the grid's 8 points a wavelength. [provisional] */
  maxMode: 16,
  peak: 4,
  /**
   * One component's root-mean-square velocity, tile lengths a unit of time (1.7 / 8π, kept from the first bake). The
   * integral scale this spectrum gives is 0.0336 tiles (measured, the test), so a unit of time is two turnovers. [provisional]
   */
  speed: 0.0676408,
  /** Surface compressibility (Larkin et al. 2009: 0.49 ± 0.02). */
  compressibility: 0.49,
  /** Unsteadiness λ of Fung et al. 1992 (0.5–1 in the note): the correlation time is (k³E)^(-1/2)/λ. [provisional] */
  unsteadiness: 1,
  /** Time steps a unit of time; the backward map is advanced by the midpoint rule. */
  stepsPerTurnover: 16,
  /** The two stages' ages, units of time since the raft was uniform (about 3 and 6 turnovers). [provisional] */
  early: 1.5,
  late: 3,
  /**
   * The Gaussian blur on the traced density, trace cells: the least that removes the beads a ridge thinner than a cell
   * draws (see the file's note). [provisional] And on the raised density, texels: none while the trace is the texture's size.
   */
  smooth: 2,
  blur: 0,
  /**
   * The wide blur that ranks the empty interior of a hole by its depth, in texels of a `depthGrid`² grid: σ = 24 × 12 m /
   * 128, 2.25 m, about a hole's width (the bake's holes run 0.5–3 m), so holes close from their edges in. [provisional]
   */
  depthBlur: 24,
  depthGrid: 128,
  seed: 0x5eed1e55,
} as const;

export type FoamBakeParameters = { -readonly [K in keyof typeof FOAM_BAKE]: number };

/** What `bakeFoamCycle` makes: each stage as 8-bit Gaussian ranks over ±`FOAM_RANGE` σ, `size` × `size`, rows from z = 0. */
export interface FoamBake {
  size: number;
  early: Uint8Array;
  late: Uint8Array;
  /** The flow's compressibility as drawn: the compressive share of its energy. */
  compressibility: number;
  /** The correlation of the two stages' Gaussian values, which blending them in Gaussian space must allow for. */
  correlation: number;
}

/** The Gaussian ranks are stored over ±4σ as bytes: byte = 127.5 (1 + G/4). */
export const FOAM_RANGE = 4;

/** mulberry32: a 32-bit generator in integer arithmetic, so a seed gives every engine the same stream. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussians(random: () => number): () => number {
  let spare: number | undefined;
  return () => {
    if (spare !== undefined) {
      const value = spare;
      spare = undefined;
      return value;
    }
    const radius = Math.sqrt(-2 * Math.log(1 - random()));
    const angle = 2 * Math.PI * random();
    spare = radius * Math.sin(angle);
    return radius * Math.cos(angle);
  };
}

/** The inverse normal CDF (Acklam's rational approximation, relative error 1.2e-9). */
export function inverseNormal(p: number): number {
  if (!(p > 0)) return -Infinity;
  if (!(p < 1)) return Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const low = 0.02425;
  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - low) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/** In-place radix-2 FFT of `n` points (a power of two) at `offset` with `stride`, the inverse without its 1/n. */
function fft(re: Float64Array, im: Float64Array, offset: number, stride: number, n: number, cos: Float64Array, sin: Float64Array, reverse: Uint16Array): void {
  for (let i = 0; i < n; i += 1) {
    const j = reverse[i];
    if (j > i) {
      const a = offset + i * stride;
      const b = offset + j * stride;
      const tr = re[a];
      const ti = im[a];
      re[a] = re[b];
      im[a] = im[b];
      re[b] = tr;
      im[b] = ti;
    }
  }
  for (let size = 2; size <= n; size *= 2) {
    const half = size / 2;
    const step = n / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k += 1) {
        // exp(+i 2π k / size): the inverse transform.
        const wr = cos[k * step];
        const wi = sin[k * step];
        const a = offset + (start + k) * stride;
        const b = offset + (start + k + half) * stride;
        const xr = re[b] * wr - im[b] * wi;
        const xi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - xr;
        im[b] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
      }
    }
  }
}

/**
 * The surface flow: random Fourier modes of a compressive part (along the wavevector) and a solenoidal part (across
 * it), each an Ornstein–Uhlenbeck process, synthesised onto a periodic grid by one inverse FFT a step. Lengths are
 * tile fractions and times units of the bake's time, in which one component's root-mean-square velocity is `speed`.
 */
export class SurfaceFlow {
  readonly n: number;
  /** The velocity, (n + 1)² padded with the wrap so a bilinear lookup needs no modulo. */
  readonly ux: Float64Array;
  readonly uy: Float64Array;
  private readonly modes: number;
  private readonly mi: Int16Array;
  private readonly ni: Int16Array;
  private readonly sigmaCompressive: Float64Array;
  private readonly sigmaSolenoidal: Float64Array;
  private readonly decay: Float64Array;
  private readonly state: Float64Array;
  private readonly gauss: () => number;
  private readonly re: Float64Array;
  private readonly im: Float64Array;
  private readonly cos: Float64Array;
  private readonly sin: Float64Array;
  private readonly reverse: Uint16Array;
  /** The compressibility of the modes as drawn: the compressive share of the energy. */
  compressibility = 0;

  constructor(parameters: FoamBakeParameters, readonly dt: number) {
    const n = parameters.grid;
    this.n = n;
    this.ux = new Float64Array((n + 1) * (n + 1));
    this.uy = new Float64Array((n + 1) * (n + 1));
    this.re = new Float64Array(n * n);
    this.im = new Float64Array(n * n);
    this.cos = new Float64Array(n / 2);
    this.sin = new Float64Array(n / 2);
    for (let k = 0; k < n / 2; k += 1) {
      this.cos[k] = Math.cos((2 * Math.PI * k) / n);
      this.sin[k] = Math.sin((2 * Math.PI * k) / n);
    }
    this.reverse = new Uint16Array(n);
    const bits = Math.log2(n);
    for (let i = 0; i < n; i += 1) {
      let r = 0;
      for (let b = 0; b < bits; b += 1) r |= ((i >> b) & 1) << (bits - 1 - b);
      this.reverse[i] = r;
    }
    // The modes in the half plane (m > 0, or m = 0 and n > 0); each also stands for its conjugate.
    const list: [number, number][] = [];
    const max = parameters.maxMode;
    for (let m = 0; m <= max; m += 1) {
      for (let q = -max; q <= max; q += 1) {
        if (m === 0 && q <= 0) continue;
        if (m * m + q * q <= max * max) list.push([m, q]);
      }
    }
    this.modes = list.length;
    this.mi = new Int16Array(this.modes);
    this.ni = new Int16Array(this.modes);
    this.sigmaCompressive = new Float64Array(this.modes);
    this.sigmaSolenoidal = new Float64Array(this.modes);
    this.decay = new Float64Array(this.modes);
    this.state = new Float64Array(this.modes * 4);
    this.gauss = gaussians(mulberry32(parameters.seed));
    // Variance per mode of E(κ)/(2πκ) with E = κ⁴/(1 + (κ/κ_p)^(4 + 5/3)): κ⁴ rising, κ^(-5/3) falling (Kolmogorov).
    const shape = (kappa: number) => (kappa ** 3) / (1 + (kappa / parameters.peak) ** (17 / 3));
    let total = 0;
    list.forEach(([m, q]) => { total += 2 * shape(Math.hypot(m, q)); });
    // One component's rms is `speed` tile lengths a unit of time.
    const scale = (2 * parameters.speed * parameters.speed) / total;
    let compressive = 0;
    let all = 0;
    list.forEach(([m, q], index) => {
      const kappa = Math.hypot(m, q);
      this.mi[index] = m;
      this.ni[index] = q;
      const variance = scale * shape(kappa);
      this.sigmaCompressive[index] = Math.sqrt((parameters.compressibility * variance) / 2);
      this.sigmaSolenoidal[index] = Math.sqrt(((1 - parameters.compressibility) * variance) / 2);
      // An eddy of this size turns over in (k³E)^(-1/2)/λ, which falls as κ^(-2/3); the peak's is 1/λ turnovers.
      const correlation = (kappa / parameters.peak) ** (-2 / 3) / parameters.unsteadiness;
      this.decay[index] = Math.exp(-dt / correlation);
      for (let c = 0; c < 4; c += 1) {
        const sigma = c < 2 ? this.sigmaCompressive[index] : this.sigmaSolenoidal[index];
        const value = sigma * this.gauss();
        this.state[index * 4 + c] = value;
        if (c < 2) compressive += value * value; else all += value * value;
      }
    });
    this.compressibility = compressive / (compressive + all);
    this.synthesise();
  }

  /** Advances every mode by one step of its Ornstein–Uhlenbeck process, and the velocity grid with them. */
  step(): void {
    for (let index = 0; index < this.modes; index += 1) {
      const rho = this.decay[index];
      const kick = Math.sqrt(1 - rho * rho);
      for (let c = 0; c < 4; c += 1) {
        const sigma = c < 2 ? this.sigmaCompressive[index] : this.sigmaSolenoidal[index];
        const at = index * 4 + c;
        this.state[at] = rho * this.state[at] + kick * sigma * this.gauss();
      }
    }
    this.synthesise();
  }

  private synthesise(): void {
    const { n, re, im } = this;
    re.fill(0);
    im.fill(0);
    for (let index = 0; index < this.modes; index += 1) {
      const m = this.mi[index];
      const q = this.ni[index];
      const kappa = Math.hypot(m, q);
      const ex = m / kappa;
      const ey = q / kappa;
      // û = b ê∥ + a ê⊥, ê∥ = (m, q)/κ, ê⊥ = (−q, m)/κ; the field is w = u_x + i u_y.
      const bRe = this.state[index * 4];
      const bIm = this.state[index * 4 + 1];
      const aRe = this.state[index * 4 + 2];
      const aIm = this.state[index * 4 + 3];
      const uxRe = bRe * ex - aRe * ey;
      const uxIm = bIm * ex - aIm * ey;
      const uyRe = bRe * ey + aRe * ex;
      const uyIm = bIm * ey + aIm * ex;
      // ŵ(k) = û_x + i û_y; ŵ(−k) = conj(û_x) + i conj(û_y), since u is real.
      const at = ((q + n) % n) * n + m;
      re[at] += uxRe - uyIm;
      im[at] += uxIm + uyRe;
      const mirror = ((n - q) % n) * n + ((n - m) % n);
      re[mirror] += uxRe + uyIm;
      im[mirror] += -uxIm + uyRe;
    }
    for (let row = 0; row < n; row += 1) fft(re, im, row * n, 1, n, this.cos, this.sin, this.reverse);
    for (let column = 0; column < n; column += 1) fft(re, im, column, n, n, this.cos, this.sin, this.reverse);
    const stride = n + 1;
    for (let row = 0; row < n; row += 1) {
      for (let column = 0; column < n; column += 1) {
        this.ux[row * stride + column] = re[row * n + column];
        this.uy[row * stride + column] = im[row * n + column];
      }
      this.ux[row * stride + n] = this.ux[row * stride];
      this.uy[row * stride + n] = this.uy[row * stride];
    }
    for (let column = 0; column <= n; column += 1) {
      this.ux[n * stride + column] = this.ux[column];
      this.uy[n * stride + column] = this.uy[column];
    }
  }
}

/** The flow's velocity at each step, in grid cells per step, padded as `SurfaceFlow`'s: what the backward trace walks. */
export function flowHistory(flow: SurfaceFlow, steps: number): { ux: Float32Array[]; uy: Float32Array[] } {
  const scale = flow.dt * flow.n;
  const ux: Float32Array[] = [];
  const uy: Float32Array[] = [];
  for (let step = 0; step < steps; step += 1) {
    flow.step();
    const x = new Float32Array(flow.ux.length);
    const y = new Float32Array(flow.uy.length);
    for (let k = 0; k < x.length; k += 1) {
      x[k] = flow.ux[k] * scale;
      y[k] = flow.uy[k] * scale;
    }
    ux.push(x);
    uy.push(y);
  }
  return { ux, uy };
}

/**
 * Traces every cell corner of an `n`² grid back through the first `steps` steps of the flow by the midpoint rule.
 * Returns where each came from, as displacements from where it is, in velocity-grid cells.
 */
export function traceBack(history: { ux: Float32Array[]; uy: Float32Array[] }, g: number, n: number, steps: number): { dx: Float64Array; dy: Float64Array } {
  const dx = new Float64Array(n * n);
  const dy = new Float64Array(n * n);
  const stride = g + 1;
  const mask = g - 1;
  const ratio = g / n;
  const wrap = 1 / g;
  for (let step = steps; step >= 1; step -= 1) {
    const ux = history.ux[step - 1];
    const uy = history.uy[step - 1];
    for (let j = 0; j < n; j += 1) {
      const y0 = j * ratio;
      for (let i = 0; i < n; i += 1) {
        const k = j * n + i;
        let x = i * ratio + dx[k];
        let y = y0 + dy[k];
        x -= Math.floor(x * wrap) * g;
        y -= Math.floor(y * wrap) * g;
        let ix = x | 0;
        let iy = y | 0;
        let tx = x - ix;
        let ty = y - iy;
        let m = (iy & mask) * stride + (ix & mask);
        let w00 = (1 - tx) * (1 - ty);
        let w10 = tx * (1 - ty);
        let w01 = (1 - tx) * ty;
        let w11 = tx * ty;
        const vx = w00 * ux[m] + w10 * ux[m + 1] + w01 * ux[m + stride] + w11 * ux[m + stride + 1];
        const vy = w00 * uy[m] + w10 * uy[m + 1] + w01 * uy[m + stride] + w11 * uy[m + stride + 1];
        x -= 0.5 * vx;
        y -= 0.5 * vy;
        x -= Math.floor(x * wrap) * g;
        y -= Math.floor(y * wrap) * g;
        ix = x | 0;
        iy = y | 0;
        tx = x - ix;
        ty = y - iy;
        m = (iy & mask) * stride + (ix & mask);
        w00 = (1 - tx) * (1 - ty);
        w10 = tx * (1 - ty);
        w01 = (1 - tx) * ty;
        w11 = tx * ty;
        dx[k] -= w00 * ux[m] + w10 * ux[m + 1] + w01 * ux[m + stride] + w11 * ux[m + stride + 1];
        dy[k] -= w00 * uy[m] + w10 * uy[m + 1] + w01 * uy[m + stride] + w11 * uy[m + stride + 1];
      }
    }
  }
  return { dx, dy };
}

/**
 * The foam's density (mean 1) in each cell of the `n`² grid: the area, in the uniform start, of the quad that the cell's
 * corners came from. Folds in the sampled map count as nothing.
 */
export function cellDensity(dx: Float64Array, dy: Float64Array, g: number, n: number): Float32Array {
  const density = new Float32Array(n * n);
  const ratio = g / n;
  // Areas come out in velocity-grid cells squared; the tile is g².
  const scale = (n * n) / (g * g);
  for (let j = 0; j < n; j += 1) {
    const j1 = (j + 1) % n;
    for (let i = 0; i < n; i += 1) {
      const i1 = (i + 1) % n;
      const a = j * n + i;
      const b = j * n + i1;
      const c = j1 * n + i;
      const d = j1 * n + i1;
      const x00 = i * ratio + dx[a];
      const y00 = j * ratio + dy[a];
      const x10 = (i + 1) * ratio + dx[b];
      const y10 = j * ratio + dy[b];
      const x01 = i * ratio + dx[c];
      const y01 = (j + 1) * ratio + dy[c];
      const x11 = (i + 1) * ratio + dx[d];
      const y11 = (j + 1) * ratio + dy[d];
      const area = 0.5 * ((x00 * y10 - x10 * y00) + (x10 * y11 - x11 * y10) + (x11 * y01 - x01 * y11) + (x01 * y00 - x00 * y01));
      density[a] = Math.max(0, area) * scale;
    }
  }
  return density;
}

/** A periodic `n`² field raised to `size`² by cell-centred bilinear interpolation (both powers of two). */
function raise(field: Float32Array, n: number, size: number): Float32Array {
  const out = new Float32Array(size * size);
  const ratio = size / n;
  const mask = n - 1;
  for (let y = 0; y < size; y += 1) {
    const v = (y + 0.5) / ratio - 0.5;
    const v0 = Math.floor(v);
    const fv = v - v0;
    const row0 = (v0 & mask) * n;
    const row1 = ((v0 + 1) & mask) * n;
    for (let x = 0; x < size; x += 1) {
      const u = (x + 0.5) / ratio - 0.5;
      const u0 = Math.floor(u);
      const fu = u - u0;
      const c0 = u0 & mask;
      const c1 = (u0 + 1) & mask;
      out[y * size + x] = (1 - fv) * ((1 - fu) * field[row0 + c0] + fu * field[row0 + c1]) + fv * ((1 - fu) * field[row1 + c0] + fu * field[row1 + c1]);
    }
  }
  return out;
}

/** A separable periodic Gaussian blur of sigma `sigma` (grid units), in place. */
export function blur(field: Float32Array, size: number, sigma: number): void {
  const radius = Math.max(1, Math.ceil(3 * sigma));
  const weights = new Float32Array(2 * radius + 1);
  let sum = 0;
  for (let k = -radius; k <= radius; k += 1) {
    weights[k + radius] = Math.exp(-(k * k) / (2 * sigma * sigma));
    sum += weights[k + radius];
  }
  for (let k = 0; k < weights.length; k += 1) weights[k] /= sum;
  const mask = size - 1;
  const line = new Float32Array(size);
  for (let row = 0; row < size; row += 1) {
    const base = row * size;
    for (let x = 0; x < size; x += 1) {
      let value = 0;
      for (let k = -radius; k <= radius; k += 1) value += weights[k + radius] * field[base + ((x + k) & mask)];
      line[x] = value;
    }
    field.set(line, base);
  }
  for (let column = 0; column < size; column += 1) {
    for (let y = 0; y < size; y += 1) {
      let value = 0;
      for (let k = -radius; k <= radius; k += 1) value += weights[k + radius] * field[((y + k) & mask) * size + column];
      line[y] = value;
    }
    for (let y = 0; y < size; y += 1) field[y * size + column] = line[y];
  }
}

/**
 * How deep a texel lies in a hole: the foam's density smoothed over metres, read from a coarse grid. Empty water has
 * no density to rank it by, so ties break the way a hole opens, from its middle outward.
 */
export function depthField(density: Float32Array, size: number, grid: number, sigma: number): Float32Array {
  const ratio = size / grid;
  const coarse = new Float32Array(grid * grid);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) coarse[Math.floor(y / ratio) * grid + Math.floor(x / ratio)] += density[y * size + x] / (ratio * ratio);
  }
  blur(coarse, grid, sigma);
  return raise(coarse, grid, size);
}

/** Each texel's rank among all of them, through the inverse normal CDF, as bytes over ±`FOAM_RANGE` σ. */
export function gaussianRanks(key: Float32Array): Uint8Array {
  const count = key.length;
  const bins = 8192;
  const logs = new Float32Array(count);
  let low = Infinity;
  let high = -Infinity;
  for (let k = 0; k < count; k += 1) {
    const value = Math.log(Math.max(key[k], 1e-30));
    logs[k] = value;
    if (value < low) low = value;
    if (value > high) high = value;
  }
  const span = Math.max(1e-9, high - low);
  const histogram = new Float64Array(bins + 1);
  for (let k = 0; k < count; k += 1) histogram[Math.min(bins - 1, Math.floor(((logs[k] - low) / span) * bins)) + 1] += 1;
  for (let b = 1; b <= bins; b += 1) histogram[b] += histogram[b - 1];
  // The quantile at each bin's lower edge, so a rank costs a lookup and a blend.
  const table = new Float32Array(bins + 1);
  for (let b = 0; b <= bins; b += 1) table[b] = inverseNormal(Math.min(1 - 0.5 / count, Math.max(0.5 / count, histogram[b] / count)));
  const out = new Uint8Array(count);
  for (let k = 0; k < count; k += 1) {
    const position = ((logs[k] - low) / span) * bins;
    const b = Math.min(bins - 1, Math.floor(position));
    const f = position - b;
    // Inside the bin the rank is taken as linear in the log key between its ends.
    const gaussian = table[b] + (table[b + 1] - table[b]) * f;
    out[k] = Math.round(Math.min(255, Math.max(0, 127.5 * (1 + gaussian / FOAM_RANGE))));
  }
  return out;
}

/** Bakes the two stages of the foam life cycle (see the file's note). */
export function bakeFoamCycle(overrides: Partial<FoamBakeParameters> = {}): FoamBake {
  const parameters: FoamBakeParameters = { ...FOAM_BAKE, ...overrides };
  const flow = new SurfaceFlow(parameters, 1 / parameters.stepsPerTurnover);
  const earlySteps = Math.round(parameters.early * parameters.stepsPerTurnover);
  const lateSteps = Math.round(parameters.late * parameters.stepsPerTurnover);
  const history = flowHistory(flow, lateSteps);
  const { size, trace } = parameters;
  const stage = (steps: number): Uint8Array => {
    const { dx, dy } = traceBack(history, parameters.grid, trace, steps);
    const coarse = cellDensity(dx, dy, parameters.grid, trace);
    if (parameters.smooth > 0) blur(coarse, trace, parameters.smooth);
    const density = trace === size ? coarse : raise(coarse, trace, size);
    if (parameters.blur > 0) blur(density, size, parameters.blur);
    const depth = depthField(density, size, parameters.depthGrid, parameters.depthBlur);
    const key = new Float32Array(density.length);
    for (let k = 0; k < key.length; k += 1) key[k] = density[k] + 1e-3 * depth[k];
    return gaussianRanks(key);
  };
  const early = stage(earlySteps);
  const late = stage(lateSteps);
  let sum = 0;
  let sumLate = 0;
  let both = 0;
  let squareEarly = 0;
  let squareLate = 0;
  for (let k = 0; k < early.length; k += 1) {
    const e = (early[k] / 127.5 - 1) * FOAM_RANGE;
    const l = (late[k] / 127.5 - 1) * FOAM_RANGE;
    sum += e;
    sumLate += l;
    both += e * l;
    squareEarly += e * e;
    squareLate += l * l;
  }
  const count = early.length;
  const correlation = (both / count - (sum / count) * (sumLate / count)) / Math.sqrt((squareEarly / count - (sum / count) ** 2) * (squareLate / count - (sumLate / count) ** 2));
  return { size, early, late, compressibility: flow.compressibility, correlation };
}
