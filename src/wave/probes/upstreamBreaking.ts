// Probe-only experiment (opt-in: INHERIT=upstream): Kennedy breaking whose age is inherited only from upstream.
// BoussinesqSolver.breakingTerms lets a cell take the breaking age of any breaking neighbour, along the crest too, and an
// older age lowers its threshold from 0.65 toward 0.15 √(g h), so breaking can run along a crest faster than the crest
// itself steepens (the onset probe: about 90 % of reef onsets are inherited). Kennedy et al. (2000) and Chen et al. (2000,
// 2D) carry the breaking event with the wave. This swaps the method in memory, in the probe's process only: a copy of
// breakingTerms (BoussinesqSolver.ts) whose inheritance takes a neighbour's age only when that neighbour lies upstream, the
// cell's flux pointing from it within 45°. It changes no shared file; the solver's fix, if any, is its own change.
import { BoussinesqSolver } from '../BoussinesqSolver';
import { PERIODIC, WALL } from '../ShallowWaterSolver';

/** BoussinesqSolver.ts's own BREAKING_DEPTH and MAX_EDDY. */
const BREAKING_DEPTH = 0.05;
const MAX_EDDY = 0.3;
const COS_45 = Math.SQRT1_2;

/**
 * Swap the method in. `upstream` inherits from the neighbour the cell's flux points from, within 45°; `across` inherits
 * from both neighbours on the axis nearer the flux's (the crest's normal, either sign), never the two along the crest;
 * `face1` and `face3` are the water-physics advisor's rule A (2026-09-29): a rising cell inherits only from behind its
 * front face, the face's downslope n = −∇η (FUNWAVE-TVD's direction, breaker.F) picking the neighbour behind along n's
 * main axis (face1), or it and its two diagonals (face3, Celeris's stencil); with no face (|∇η| ≈ 0), nothing.
 * `all` keeps every neighbour, as the solver's own does (to check the copy).
 */
export function inheritOnlyFromUpstream(mode: 'upstream' | 'across' | 'face1' | 'face3' | 'all' = 'upstream'): void {
  const cos = mode === 'all' ? -Infinity : COS_45;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (BoussinesqSolver.prototype as any).breakingTerms = function breakingTerms(this: any, dt: number): void {
    const { viscousX, viscousZ } = this;
    const kennedy = this.kennedy;
    if (!kennedy) {
      viscousX.fill(0);
      viscousZ.fill(0);
      return;
    }
    const { nx, nz, h, rateH, breakingStrength: strength, breakingAge: age, nextStrength, nextAge, riseRate, viscosity: nu, gravity: g, qx: P, qz: Q } = this;
    const onset = kennedy.onset * this.onsetScale;
    const mixing = kennedy.delta * kennedy.delta;
    let peak = 0;
    for (let iz = 0; iz < nz; iz += 1) {
      for (let ix = 0; ix < nx; ix += 1) {
        const i = iz * nx + ix;
        const depth = h[i];
        const rise = rateH[i];
        riseRate[i] = rise;
        if (depth <= BREAKING_DEPTH) {
          nextStrength[i] = 0;
          nextAge[i] = 0;
          nu[i] = 0;
          continue;
        }
        let inherited = strength[i] > 0 ? age[i] : 0;
        const flux = Math.hypot(P[i], Q[i]);
        if ((mode === 'face1' || mode === 'face3') && rise > 0) {
          const eta = (k: number) => h[k] - this.still[k];
          const gx = ((ix < nx - 1 ? eta(i + 1) : eta(i)) - (ix > 0 ? eta(i - 1) : eta(i))) / ((ix > 0 && ix < nx - 1 ? 2 : 1) * this.dx);
          const up = iz < nz - 1 ? eta(i + nx) : eta(i);
          const downEta = iz > 0 ? eta(i - nx) : eta(i);
          const gz = (up - downEta) / ((iz < nz - 1 ? this.above[iz] : 0) + (iz > 0 ? this.below[iz] : 0));
          const faceX = -gx;
          const faceZ = -gz;
          if (Math.hypot(faceX, faceZ) > 1e-6) {
            const parents: number[] = [];
            if (Math.abs(faceX) >= Math.abs(faceZ)) {
              const bx = ix - Math.sign(faceX);
              if (bx >= 0 && bx < nx) {
                parents.push(iz * nx + bx);
                if (mode === 'face3') {
                  if (iz > 0) parents.push((iz - 1) * nx + bx);
                  if (iz < nz - 1) parents.push((iz + 1) * nx + bx);
                }
              }
            } else {
              const bz = iz - Math.sign(faceZ);
              if (bz >= 0 && bz < nz) {
                parents.push(bz * nx + ix);
                if (mode === 'face3') {
                  if (ix > 0) parents.push(bz * nx + ix - 1);
                  if (ix < nx - 1) parents.push(bz * nx + ix + 1);
                }
              }
            }
            for (const j of parents) if (strength[j] > 0) inherited = Math.max(inherited, age[j]);
          }
        } else if (mode !== 'face1' && mode !== 'face3') {
          let px = flux > 0 ? P[i] / flux : 0;
          let pz = flux > 0 ? Q[i] / flux : 0;
          if (mode === 'across') {
            // Sign-free: the axis nearer the flux takes both its neighbours; still water keeps all four.
            const alongX = flux === 0 || Math.abs(px) >= Math.abs(pz);
            const alongZ = flux === 0 || Math.abs(pz) >= Math.abs(px);
            px = alongX ? 1 : 0;
            pz = alongZ ? 1 : 0;
            if (px && ix > 0 && strength[i - 1] > 0) inherited = Math.max(inherited, age[i - 1]);
            if (px && ix < nx - 1 && strength[i + 1] > 0) inherited = Math.max(inherited, age[i + 1]);
            if (pz && iz > 0 && strength[i - nx] > 0) inherited = Math.max(inherited, age[i - nx]);
            if (pz && iz < nz - 1 && strength[i + nx] > 0) inherited = Math.max(inherited, age[i + nx]);
            px = 0;
            pz = 0;
          }
          if (ix > 0 && strength[i - 1] > 0 && px >= cos) inherited = Math.max(inherited, age[i - 1]);
          if (ix < nx - 1 && strength[i + 1] > 0 && -px >= cos) inherited = Math.max(inherited, age[i + 1]);
          if (iz > 0 && strength[i - nx] > 0 && pz >= cos) inherited = Math.max(inherited, age[i - nx]);
          if (iz < nz - 1 && strength[i + nx] > 0 && -pz >= cos) inherited = Math.max(inherited, age[i + nx]);
        }
        const still = Math.max(BREAKING_DEPTH, this.still[i]);
        const ramp = Math.min(1, inherited / (kennedy.transition * Math.sqrt(still / g)));
        const threshold = Math.sqrt(g * still) * (onset + (kennedy.end - onset) * ramp);
        const breaking = Math.min(1, Math.max(0, rise / threshold - 1));
        nextStrength[i] = breaking;
        nextAge[i] = breaking > 0 ? inherited + dt : 0;
        nu[i] = breaking > 0 ? Math.min(MAX_EDDY * depth * Math.sqrt(g * depth), breaking * mixing * depth * rise) : 0;
        if (nu[i] > peak) peak = nu[i];
      }
    }
    strength.set(nextStrength);
    age.set(nextAge);
    this.viscosityPeak = peak;
    if (!(peak > 0)) {
      viscousX.fill(0);
      viscousZ.fill(0);
      return;
    }
    const { below, above, f1, f2, f3 } = this;
    const periodic = this.xBoundary === PERIODIC;
    const pEdge = this.xBoundary === WALL ? -1 : 1;
    const inverse = 1 / (this.dx * this.dx);
    for (let iz = 0; iz < nz; iz += 1) {
      const minus = below[iz];
      const plus = above[iz];
      const across = 2 / (minus + plus);
      const row = iz * nx;
      for (let ix = 0; ix < nx; ix += 1) {
        const i = row + ix;
        const left = ix > 0 ? i - 1 : periodic ? row + nx - 1 : -1;
        const right = ix < nx - 1 ? i + 1 : periodic ? row : -1;
        const nuL = left >= 0 ? 0.5 * (nu[i] + nu[left]) : nu[i];
        const nuR = right >= 0 ? 0.5 * (nu[i] + nu[right]) : nu[i];
        const pL = left >= 0 ? P[left] : pEdge * P[i];
        const pR = right >= 0 ? P[right] : pEdge * P[i];
        viscousX[i] = (nuR * (pR - P[i]) - nuL * (P[i] - pL)) * inverse;
        const down = iz > 0 ? i - nx : -1;
        const up = iz < nz - 1 ? i + nx : -1;
        const nuD = down >= 0 ? 0.5 * (nu[i] + nu[down]) : nu[i];
        const nuU = up >= 0 ? 0.5 * (nu[i] + nu[up]) : nu[i];
        const qD = down >= 0 ? Q[down] : -Q[i];
        const qU = up >= 0 ? Q[up] : -Q[i];
        viscousZ[i] = (nuU * (qU - Q[i]) / plus - nuD * (Q[i] - qD) / minus) * across;
      }
    }
    this.derivativeZ(P, f1, false);
    this.derivativeX(Q, f2, false);
    for (let i = 0; i < f1.length; i += 1) f3[i] = nu[i] * (f1[i] + f2[i]);
    this.derivativeZ(f3, f1, true);
    this.derivativeX(f3, f2, true);
    for (let i = 0; i < f1.length; i += 1) {
      viscousX[i] += 0.5 * f1[i];
      viscousZ[i] += 0.5 * f2[i];
    }
  };
}
