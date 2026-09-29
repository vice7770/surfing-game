/**
 * How Kennedy breaking's age travels between cells in 2D. Kennedy et al. (2000) lower a breaking cell's onset
 * threshold with "the age of the breaking event", so a bore keeps breaking as it runs: its age has to go with it. Each
 * cell used to take the oldest age of any breaking neighbour, which let an age hop one cell per substep in any
 * direction, along the crest too: a grid speed (60 m/s at 1 m and 1/60 s), so a whole section of crest broke at once
 * wherever it was steep enough for the lowered threshold (Padang Padang's probes: about 90 % of a reef's onsets were
 * inherited, and it peeled at 2–5 times phase matching).
 *
 * A cell now takes the age only from behind its front face (the water-physics advisor's rule A, 2026-09-29): the face's
 * downslope −∇η points the way the wave runs wherever the surface rises (η_t = −c n·∇η; FUNWAVE-TVD's breaker.F takes its
 * direction the same way), so the parents lie up the slope, along its main axis: the cell there and its two diagonals
 * (Celeris WebGPU's Pass_Breaking stencil). Never the cells beside it along the crest. A long straight bore is unchanged,
 * its neighbours all carrying one age; breaking spreads sideways at most one cell per cell the face advances, the
 * wave's own speed. The combination is inferred; its parts are sourced.
 */

/** Below this surface slope a cell has no front face to be behind; float32-safe on the device. */
export const FACE_SLOPE = 1e-4;

/**
 * The breaking age a cell brings into this step: its own when it is breaking, else (or if older) that of its oldest
 * breaking parent behind its front face, the surface sloping up at (slopeX, slopeZ).
 */
export function inheritedAge(
  i: number, ix: number, iz: number, nx: number, nz: number, slopeX: number, slopeZ: number, strength: Float64Array, age: Float64Array,
): number {
  let inherited = strength[i] > 0 ? age[i] : 0;
  if (slopeX * slopeX + slopeZ * slopeZ <= FACE_SLOPE * FACE_SLOPE) return inherited;
  if (Math.abs(slopeX) >= Math.abs(slopeZ)) {
    // Behind is up the slope along x; its diagonals are the rows either side.
    const bx = ix + Math.sign(slopeX);
    if (bx < 0 || bx >= nx) return inherited;
    const j = iz * nx + bx;
    if (strength[j] > 0) inherited = Math.max(inherited, age[j]);
    if (iz > 0 && strength[j - nx] > 0) inherited = Math.max(inherited, age[j - nx]);
    if (iz < nz - 1 && strength[j + nx] > 0) inherited = Math.max(inherited, age[j + nx]);
    return inherited;
  }
  const bz = iz + Math.sign(slopeZ);
  if (bz < 0 || bz >= nz) return inherited;
  const j = bz * nx + ix;
  if (strength[j] > 0) inherited = Math.max(inherited, age[j]);
  if (ix > 0 && strength[j - 1] > 0) inherited = Math.max(inherited, age[j - 1]);
  if (ix < nx - 1 && strength[j + 1] > 0) inherited = Math.max(inherited, age[j + 1]);
  return inherited;
}
