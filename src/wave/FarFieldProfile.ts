import { exactWaveNumber, groupSpeed, type WaveNumberFunction } from './dispersion';
import type { SeaState } from './SeaState';

export interface FarFieldOptions {
  /** Line where the tank prescribes the analytic sea (its offshore boundary), m. */
  referenceZ: number;
  /** Shoreward end of the table (beside the tank), m. */
  shoreZ: number;
  /** Seaward end of the table, m. */
  offshoreZ: number;
  /** Samples from shoreZ to referenceZ and from referenceZ to offshoreZ; both include referenceZ. */
  shoreSamples: number;
  offshoreSamples: number;
  /** Still-water depth seaward of referenceZ, where the far field uses Airy dispersion, m. */
  offshoreDepth(z: number): number;
  /** Still-water depth beside the window on its −x and +x sides (≤ 0 on land), m. */
  leftDepth(z: number): number;
  rightDepth(z: number): number;
  /** Depth-limited cap on local Hs as a fraction of depth (McCowan γ). */
  breakerIndex?: number;
}

const MIN_DEPTH = 0.05;

/**
 * Cross-shore WKB tables for the far-field ocean (plan §2.2). From the tank's
 * offshore boundary, where they reproduce its analytic sea exactly, each
 * component's phase integrates kz(z) outward. Seaward it deepens with Airy
 * dispersion; beside the window it follows the edge column's seabed with the
 * sea's own dispersion. Amplitudes conserve cross-shore energy flux, and local
 * Hs is capped at γh, so the side strips show where waves break.
 */
export class FarFieldProfile {
  readonly count: number;
  readonly samples: number;
  readonly shoreSamples: number;
  readonly offshoreSamples: number;
  readonly referenceZ: number;
  readonly shoreZ: number;
  readonly offshoreZ: number;
  /** RGBA texels, (count + 1) wide and 2 × samples tall: (phase, amplitude, kz, cap) per component; the last column holds (depth, 0, 0, 0). */
  readonly table: Float32Array;
  readonly kx: Float32Array;
  readonly omega: Float64Array;

  constructor(sea: SeaState, options: FarFieldOptions) {
    this.count = sea.components.length;
    this.shoreSamples = options.shoreSamples;
    this.offshoreSamples = options.offshoreSamples;
    this.samples = options.shoreSamples + options.offshoreSamples - 1;
    this.referenceZ = options.referenceZ;
    this.shoreZ = options.shoreZ;
    this.offshoreZ = options.offshoreZ;
    this.table = new Float32Array((this.count + 1) * this.samples * 2 * 4);
    this.kx = Float32Array.from(sea.components, (c) => c.kx);
    this.omega = Float64Array.from(sea.components, (c) => c.omega);
    const gamma = options.breakerIndex ?? 0.78;
    for (const side of [0, 1]) {
      this.sweep(sea, side, true, side === 0 ? options.leftDepth : options.rightDepth, sea.waveNumberAt, gamma);
      this.sweep(sea, side, false, options.offshoreDepth, exactWaveNumber, gamma);
    }
  }

  /** Cross-shore position of table row j, m. */
  zAt(j: number): number {
    const reference = this.shoreSamples - 1;
    if (j <= reference) return this.shoreZ + ((this.referenceZ - this.shoreZ) * j) / reference;
    return this.referenceZ + ((this.offshoreZ - this.referenceZ) * (j - reference)) / (this.offshoreSamples - 1);
  }

  /** Fractional table row at z, clamped to the table. */
  rowFor(z: number): number {
    const reference = this.shoreSamples - 1;
    if (z >= this.referenceZ) return Math.min(1, Math.max(0, (this.shoreZ - z) / (this.shoreZ - this.referenceZ))) * reference;
    return reference + Math.min(1, Math.max(0, (this.referenceZ - z) / (this.referenceZ - this.offshoreZ))) * (this.offshoreSamples - 1);
  }

  /** Linear far-field elevation (the shader adds Gerstner sharpening), m. */
  elevation(x: number, z: number, t: number, side: number): number {
    let eta = 0;
    for (let c = 0; c < this.count; c += 1) {
      eta += this.amplitudeAt(c, z, side) * Math.cos(this.kx[c] * x + this.phaseAt(c, z, side) - this.omega[c] * t);
    }
    return eta;
  }

  /** Capped amplitude of component c at z, m. */
  amplitudeAt(c: number, z: number, side: number): number {
    return this.lerp(c, 1, z, side) * this.lerp(c, 3, z, side);
  }

  phaseAt(c: number, z: number, side: number): number {
    return this.lerp(c, 0, z, side);
  }

  depthAt(side: number, z: number): number {
    return this.lerp(this.count, 0, z, side);
  }

  private lerp(column: number, channel: number, z: number, side: number): number {
    const row = this.rowFor(z);
    const j0 = Math.floor(row);
    const j1 = Math.min(j0 + 1, this.samples - 1);
    const t = row - j0;
    const a = this.table[this.texel(side, j0, column) + channel];
    const b = this.table[this.texel(side, j1, column) + channel];
    return a + (b - a) * t;
  }

  private texel(side: number, row: number, column: number): number {
    return ((side * this.samples + row) * (this.count + 1) + column) * 4;
  }

  private sweep(sea: SeaState, side: number, shoreward: boolean, depthAt: (z: number) => number, waveNumberAt: WaveNumberFunction, gamma: number): void {
    const components = sea.components;
    const count = this.count;
    const reference = this.shoreSamples - 1;
    const phase = new Float64Array(count);
    const previousKz = new Float64Array(count);
    const referenceFlux = new Float64Array(count);
    const alive = new Uint8Array(count);
    const amplitude = new Float64Array(count);
    const kz = new Float64Array(count);
    for (let c = 0; c < count; c += 1) {
      const component = components[c];
      const k = waveNumberAt(component.omega, sea.depth);
      phase[c] = component.kz * this.referenceZ + component.phase;
      if (k <= Math.abs(component.kx)) continue;
      previousKz[c] = Math.sqrt(k * k - component.kx * component.kx);
      referenceFlux[c] = groupSpeed(waveNumberAt, component.omega, sea.depth) * (previousKz[c] / k);
      alive[c] = 1;
    }
    let previousZ = this.referenceZ;
    const last = shoreward ? 0 : this.samples - 1;
    const direction = shoreward ? -1 : 1;
    for (let j = reference; ; j += direction) {
      const z = this.zAt(j);
      const depth = depthAt(z);
      let variance = 0;
      for (let c = 0; c < count; c += 1) {
        amplitude[c] = 0;
        kz[c] = 0;
        if (!alive[c] || depth <= MIN_DEPTH) { alive[c] = 0; continue; }
        const component = components[c];
        const k = waveNumberAt(component.omega, depth);
        if (k <= Math.abs(component.kx)) { alive[c] = 0; continue; }
        kz[c] = Math.sqrt(k * k - component.kx * component.kx);
        phase[c] += 0.5 * (previousKz[c] + kz[c]) * (z - previousZ);
        const flux = groupSpeed(waveNumberAt, component.omega, depth) * (kz[c] / k);
        amplitude[c] = component.amplitude * Math.sqrt(referenceFlux[c] / flux);
        variance += 0.5 * amplitude[c] * amplitude[c];
      }
      const hs = 4 * Math.sqrt(variance);
      const cap = depth <= MIN_DEPTH ? 0 : hs > gamma * depth ? (gamma * depth) / hs : 1;
      for (let c = 0; c < count; c += 1) {
        const i = this.texel(side, j, c);
        this.table[i] = phase[c];
        this.table[i + 1] = amplitude[c];
        this.table[i + 2] = kz[c];
        this.table[i + 3] = cap;
        previousKz[c] = kz[c];
      }
      const depthTexel = this.texel(side, j, count);
      this.table[depthTexel] = depth;
      previousZ = z;
      if (j === last) break;
    }
  }
}
