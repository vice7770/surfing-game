import { MADSEN_SORENSEN_B } from '../BoussinesqSolver';

/**
 * WGSL for the stage 2 step on the GPU (plan P6). Every kernel mirrors the CPU
 * reference in `ShallowWaterSolver` and `BoussinesqSolver` line for line, in
 * 32-bit floats. All per-cell fields share one storage buffer, field k at
 * offset k·N, so each kernel binds three buffers: the fields, the per-row and
 * per-column grid, and the sea components for the relaxation zone.
 */
export const FIELD = {
  H: 0, QX: 1, QZ: 2, BED: 3, STILL: 4, MASK: 5, PBAR: 6, QBAR: 7, RATEH: 8, RATEQX: 9, RATEQZ: 10, U: 11, W: 12, ETA: 13,
  XHW: 14, XHE: 15, XETAW: 16, XETAE: 17, XUW: 18, XUE: 19, XWW: 20, XWE: 21,
  ZHS: 22, ZHN: 23, ZETAS: 24, ZETAN: 25, ZWS: 26, ZWN: 27, ZUS: 28, ZUN: 29,
  HALF: 30, SRCX: 31, SRCZ: 32, PREDX: 33, PREDZ: 34, STARTP: 35, STARTQ: 36,
  STRENGTH: 37, AGE: 38, NEXTSTRENGTH: 39, NEXTAGE: 40, NU: 41, VISCX: 42, VISCZ: 43, SHEAR: 44,
  DDX: 45, DDZ: 46, WET: 47, TC: 48, TR: 49, WEIGHT: 50, RISE: 51,
} as const;
export const FIELD_COUNT = 52;

/** Grid buffer layout: x centres (nx), then per row: z centre, dz, below, above, gap. */
export const ROW_STRIDE = 5;
/** Sea component layout: amplitude, kx, kz, speedX, speedZ, phase at the frame's start, omega, unused. */
export const COMPONENT_STRIDE = 8;

/** Params uniform, as 32-bit words (see `writeParams`). */
export const PARAM_WORDS = 32;

const f = (value: number) => (Number.isInteger(value) ? `${value}.0` : `${value}`);

export function boussinesqWgsl(): string {
  const B = MADSEN_SORENSEN_B;
  const ALPHA = B + 1 / 3;
  return /* wgsl */ `
struct Params {
  nx: u32, nz: u32, n: u32, boundary: u32,
  dx: f32, dt: f32, g: f32, dryDepth: f32,
  manning: f32, restLevel: f32, onset: f32, endShare: f32,
  transition: f32, mixing: f32, dispersive: u32, breaks: u32,
  components: u32, zoneFirst: u32, zoneRows: u32, tau: f32,
  pad0: f32, pad1: f32, pad2: f32, pad3: f32,
  pad4: f32, pad5: f32, pad6: f32, pad7: f32,
  pad8: f32, pad9: f32, pad10: f32, pad11: f32,
};

@group(0) @binding(0) var<storage, read_write> F: array<f32>;
@group(0) @binding(1) var<storage, read> G: array<f32>;
@group(0) @binding(2) var<storage, read> S: array<f32>;
@group(0) @binding(3) var<uniform> P: Params;

const WALL: u32 = 0u;
const PERIODIC: u32 = 1u;
const ALPHA: f32 = ${f(ALPHA)};
const BCOEF: f32 = ${f(B)};
const DISPERSIVE_DEPTH: f32 = 0.05;
const SWITCH_RATIO: f32 = 0.8;
const BREAKING_DEPTH: f32 = 0.05;
const MAX_EDDY: f32 = 0.3;

fn at(field: u32, i: u32) -> f32 { return F[field * P.n + i]; }
fn put(field: u32, i: u32, value: f32) { F[field * P.n + i] = value; }
fn xc(ix: u32) -> f32 { return G[ix]; }
fn rowG(iz: u32, k: u32) -> f32 { return G[P.nx + iz * ${ROW_STRIDE}u + k]; }
fn zcen(iz: u32) -> f32 { return rowG(iz, 0u); }
fn dzr(iz: u32) -> f32 { return rowG(iz, 1u); }
fn belowr(iz: u32) -> f32 { return rowG(iz, 2u); }
fn abover(iz: u32) -> f32 { return rowG(iz, 3u); }
fn gapr(iz: u32) -> f32 { return rowG(iz, 4u); }

// A neighbour's value along x with the ghost rule: wrap (periodic), mirror negated when odd (wall), extend (open).
fn nbx(field: u32, ix: i32, iz: u32, odd: bool) -> f32 {
  let nx = i32(P.nx);
  if (ix >= 0 && ix < nx) { return at(field, iz * P.nx + u32(ix)); }
  if (P.boundary == PERIODIC) { return at(field, iz * P.nx + u32((ix + nx) % nx)); }
  let edge = select(u32(nx - 1), 0u, ix < 0);
  let v = at(field, iz * P.nx + edge);
  return select(v, -v, odd && P.boundary == WALL);
}
// Along z, walls at both ends: mirror, negated when odd.
fn nbz(field: u32, ix: u32, iz: i32, odd: bool) -> f32 {
  let nz = i32(P.nz);
  if (iz >= 0 && iz < nz) { return at(field, u32(iz) * P.nx + ix); }
  let edge = select(u32(nz - 1), 0u, iz < 0);
  let v = at(field, edge * P.nx + ix);
  return select(v, -v, odd);
}
fn ddx(field: u32, ix: u32, iz: u32, odd: bool) -> f32 {
  return (nbx(field, i32(ix) + 1, iz, odd) - nbx(field, i32(ix) - 1, iz, odd)) / (2.0 * P.dx);
}
fn ddxx(field: u32, ix: u32, iz: u32, odd: bool) -> f32 {
  return (nbx(field, i32(ix) + 1, iz, odd) - 2.0 * at(field, iz * P.nx + ix) + nbx(field, i32(ix) - 1, iz, odd)) / (P.dx * P.dx);
}
fn ddz(field: u32, ix: u32, iz: u32, odd: bool) -> f32 {
  let m = belowr(iz); let p = abover(iz); let s = m + p;
  return (m / (p * s)) * nbz(field, ix, i32(iz) + 1, odd) - (p / (m * s)) * nbz(field, ix, i32(iz) - 1, odd) + ((p - m) / (p * m)) * at(field, iz * P.nx + ix);
}
fn ddzz(field: u32, ix: u32, iz: u32, odd: bool) -> f32 {
  let m = belowr(iz); let p = abover(iz); let s = m + p;
  let wp = 2.0 / (p * s); let wm = 2.0 / (m * s);
  return wp * nbz(field, ix, i32(iz) + 1, odd) + wm * nbz(field, ix, i32(iz) - 1, odd) - (wp + wm) * at(field, iz * P.nx + ix);
}
// Mixed derivatives as the CPU composes them: ∂x of a z-derivative (z parity inside, x parity outside), and ∂z of an x-derivative.
fn dzAt(field: u32, ix: i32, iz: u32, oddZ: bool, oddX: bool) -> f32 {
  let nx = i32(P.nx);
  if (ix >= 0 && ix < nx) { return ddz(field, u32(ix), iz, oddZ); }
  if (P.boundary == PERIODIC) { return ddz(field, u32((ix + nx) % nx), iz, oddZ); }
  let edge = select(u32(nx - 1), 0u, ix < 0);
  let v = ddz(field, edge, iz, oddZ);
  return select(v, -v, oddX && P.boundary == WALL);
}
fn dxOfDz(field: u32, ix: u32, iz: u32, oddZ: bool, oddX: bool) -> f32 {
  return (dzAt(field, i32(ix) + 1, iz, oddZ, oddX) - dzAt(field, i32(ix) - 1, iz, oddZ, oddX)) / (2.0 * P.dx);
}
fn dxAt(field: u32, ix: u32, iz: i32, oddX: bool, oddZ: bool) -> f32 {
  let nz = i32(P.nz);
  if (iz >= 0 && iz < nz) { return ddx(field, ix, u32(iz), oddX); }
  let edge = select(u32(nz - 1), 0u, iz < 0);
  let v = ddx(field, ix, edge, oddX);
  return select(v, -v, oddZ);
}
fn dzOfDx(field: u32, ix: u32, iz: u32, oddX: bool, oddZ: bool) -> f32 {
  let m = belowr(iz); let p = abover(iz); let s = m + p;
  return (m / (p * s)) * dxAt(field, ix, i32(iz) + 1, oddX, oddZ) - (p / (m * s)) * dxAt(field, ix, i32(iz) - 1, oddX, oddZ) + ((p - m) / (p * m)) * ddx(field, ix, iz, oddX);
}

fn cellOf(id: vec3<u32>) -> u32 { return id.x; }

// Monotonized-central limited slope.
fn limited(back: f32, forward: f32) -> f32 {
  if (back * forward <= 0.0) { return 0.0; }
  let m = min(abs(0.5 * (back + forward)), min(2.0 * abs(back), 2.0 * abs(forward)));
  return select(-m, m, back > 0.0);
}

struct Flux { mass: f32, normal: f32, tangent: f32, left: f32, right: f32 };

// HLL with Audusse hydrostatic reconstruction (ShallowWaterSolver.interfaceFlux).
fn hll(hL: f32, etaL: f32, uL: f32, vL: f32, hR: f32, etaR: f32, uR: f32, vR: f32) -> Flux {
  let g = P.g;
  var out: Flux;
  let bedStar = max(etaL - hL, etaR - hR);
  let hLs = max(0.0, etaL - bedStar);
  let hRs = max(0.0, etaR - bedStar);
  out.left = 0.5 * g * (hL * hL - hLs * hLs);
  out.right = 0.5 * g * (hR * hR - hRs * hRs);
  if (hLs <= 0.0 && hRs <= 0.0) { out.mass = 0.0; out.normal = 0.0; out.tangent = 0.0; return out; }
  let cL = sqrt(g * hLs);
  let cR = sqrt(g * hRs);
  var sL: f32; var sR: f32;
  if (hLs <= 0.0) { sL = uR - 2.0 * cR; sR = uR + cR; }
  else if (hRs <= 0.0) { sL = uL - cL; sR = uL + 2.0 * cL; }
  else { sL = min(uL - cL, uR - cR); sR = max(uL + cL, uR + cR); }
  let massL = hLs * uL; let massR = hRs * uR;
  let normalL = massL * uL + 0.5 * g * hLs * hLs;
  let normalR = massR * uR + 0.5 * g * hRs * hRs;
  let tangentL = massL * vL; let tangentR = massR * vR;
  if (sL >= 0.0) { out.mass = massL; out.normal = normalL; out.tangent = tangentL; return out; }
  if (sR <= 0.0) { out.mass = massR; out.normal = normalR; out.tangent = tangentR; return out; }
  let inv = 1.0 / (sR - sL);
  out.mass = (sR * massL - sL * massR + sL * sR * (hRs - hLs)) * inv;
  out.normal = (sR * normalL - sL * normalR + sL * sR * (massR - massL)) * inv;
  out.tangent = (sR * tangentL - sL * tangentR + sL * sR * (hRs * vR - hLs * vL)) * inv;
  return out;
}

// K1: the step's start: P and Q kept for the predictor's memory, velocities, surface, wet cells.
@compute @workgroup_size(64) fn begin(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = cellOf(id); if (i >= P.n) { return; }
  let h = at(${FIELD.H}u, i);
  let wet = h > P.dryDepth;
  put(${FIELD.STARTP}u, i, at(${FIELD.QX}u, i));
  put(${FIELD.STARTQ}u, i, at(${FIELD.QZ}u, i));
  put(${FIELD.U}u, i, select(0.0, at(${FIELD.QX}u, i) / h, wet));
  put(${FIELD.W}u, i, select(0.0, at(${FIELD.QZ}u, i) / h, wet));
  put(${FIELD.ETA}u, i, h + at(${FIELD.BED}u, i));
  put(${FIELD.WET}u, i, select(0.0, 1.0, h > DISPERSIVE_DEPTH && at(${FIELD.STILL}u, i) > DISPERSIVE_DEPTH));
}

fn wetAt(ix: i32, iz: i32) -> f32 {
  let nx = i32(P.nx); let nz = i32(P.nz);
  var cx = ix; var cz = clamp(iz, 0, nz - 1);
  if (cx < 0) { cx = select(0, cx + nx, P.boundary == PERIODIC); }
  if (cx >= nx) { cx = select(nx - 1, cx - nx, P.boundary == PERIODIC); }
  return at(${FIELD.WET}u, u32(cz) * P.nx + u32(cx));
}

// K2: the dispersive mask (BoussinesqSolver.updateMask): every cell the stencils reach is wet, below the Tonelli–Petti ratio.
@compute @workgroup_size(64) fn mask(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = cellOf(id); if (i >= P.n) { return; }
  let ix = i32(i % P.nx); let iz = i32(i / P.nx);
  var dispersing = at(${FIELD.WET}u, i) > 0.0 && at(${FIELD.H}u, i) - at(${FIELD.STILL}u, i) <= SWITCH_RATIO * at(${FIELD.STILL}u, i);
  for (var k = -2; k <= 2; k++) { dispersing = dispersing && wetAt(ix + k, iz) > 0.0 && wetAt(ix, iz + k) > 0.0; }
  for (var a = -1; a <= 1; a++) { for (var b = -1; b <= 1; b++) { dispersing = dispersing && wetAt(ix + a, iz + b) > 0.0; } }
  put(${FIELD.MASK}u, i, select(0.0, 1.0, dispersing && P.dispersive == 1u));
}

// K3: P̄ and Q̄ (BoussinesqSolver.modifiedFluxes).
@compute @workgroup_size(64) fn modified(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = cellOf(id); if (i >= P.n) { return; }
  let ix = i % P.nx; let iz = i / P.nx;
  let p = at(${FIELD.QX}u, i); let q = at(${FIELD.QZ}u, i);
  if (at(${FIELD.MASK}u, i) <= 0.0) { put(${FIELD.PBAR}u, i, p); put(${FIELD.QBAR}u, i, q); return; }
  let d = at(${FIELD.STILL}u, i); let dx = at(${FIELD.DDX}u, i); let dz = at(${FIELD.DDZ}u, i);
  let pxx = ddxx(${FIELD.QX}u, ix, iz, true);
  let px = ddx(${FIELD.QX}u, ix, iz, true);
  let qy = ddz(${FIELD.QZ}u, ix, iz, true);
  let qxy = dxOfDz(${FIELD.QZ}u, ix, iz, true, false);
  let qx = ddx(${FIELD.QZ}u, ix, iz, false);
  put(${FIELD.PBAR}u, i, p - ALPHA * d * d * (pxx + qxy) - d * dx * (px / 3.0 + qy / 6.0) - d * dz * qx / 6.0);
  let qyy = ddzz(${FIELD.QZ}u, ix, iz, true);
  let pxy = dzOfDx(${FIELD.QX}u, ix, iz, true, false);
  let py = ddz(${FIELD.QX}u, ix, iz, false);
  put(${FIELD.QBAR}u, i, q - ALPHA * d * d * (qyy + pxy) - d * dz * (qy / 3.0 + px / 6.0) - d * dx * py / 6.0);
}

// K4: MC-limited faces advanced half a step by the Hancock predictor (ShallowWaterSolver.predictFaces).
@compute @workgroup_size(64) fn predict(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = cellOf(id); if (i >= P.n) { return; }
  let nx = P.nx; let ix = i % nx; let iz = i / nx;
  let halfDt = 0.5 * P.dt; let g = P.g;
  let periodic = P.boundary == PERIODIC; let wallX = P.boundary == WALL;
  let hasLeft = ix > 0u || periodic; let hasRight = ix < nx - 1u || periodic;
  let left = select(i - ix + nx - 1u, i - 1u, ix > 0u);
  let right = select(i - ix, i + 1u, ix < nx - 1u);
  let hasBelow = iz > 0u; let hasAbove = iz < P.nz - 1u;
  let below = select(i, i - nx, hasBelow); let above = select(i, i + nx, hasAbove);
  let dz = dzr(iz);
  let backScale = select(1.0, dz / gapr(iz - select(0u, 1u, hasBelow)), hasBelow);
  let forwardScale = select(1.0, dz / gapr(iz), hasAbove);
  let invDx = 1.0 / P.dx; let invDz = 1.0 / dz;
  let hi = at(${FIELD.H}u, i);
  let hL = select(hi, at(${FIELD.H}u, left), hasLeft); let hR = select(hi, at(${FIELD.H}u, right), hasRight);
  let hB = select(hi, at(${FIELD.H}u, below), hasBelow); let hA = select(hi, at(${FIELD.H}u, above), hasAbove);
  let ei = at(${FIELD.ETA}u, i);
  if (hi <= 0.0 && hL <= 0.0 && hR <= 0.0 && hB <= 0.0 && hA <= 0.0) {
    put(${FIELD.XHW}u, i, 0.0); put(${FIELD.XHE}u, i, 0.0); put(${FIELD.XETAW}u, i, ei); put(${FIELD.XETAE}u, i, ei);
    put(${FIELD.XUW}u, i, 0.0); put(${FIELD.XUE}u, i, 0.0); put(${FIELD.XWW}u, i, 0.0); put(${FIELD.XWE}u, i, 0.0);
    put(${FIELD.ZHS}u, i, 0.0); put(${FIELD.ZHN}u, i, 0.0); put(${FIELD.ZETAS}u, i, ei); put(${FIELD.ZETAN}u, i, ei);
    put(${FIELD.ZWS}u, i, 0.0); put(${FIELD.ZWN}u, i, 0.0); put(${FIELD.ZUS}u, i, 0.0); put(${FIELD.ZUN}u, i, 0.0);
    return;
  }
  let ui = at(${FIELD.U}u, i); let wi = at(${FIELD.W}u, i);
  let eL = select(ei, at(${FIELD.ETA}u, left), hasLeft); let eR = select(ei, at(${FIELD.ETA}u, right), hasRight);
  let eB = select(ei, at(${FIELD.ETA}u, below), hasBelow); let eA = select(ei, at(${FIELD.ETA}u, above), hasAbove);
  let uL = select(select(ui, -ui, wallX), at(${FIELD.U}u, left), hasLeft); let uR = select(select(ui, -ui, wallX), at(${FIELD.U}u, right), hasRight);
  let wL = select(wi, at(${FIELD.W}u, left), hasLeft); let wR = select(wi, at(${FIELD.W}u, right), hasRight);
  let wB = select(-wi, at(${FIELD.W}u, below), hasBelow); let wA = select(-wi, at(${FIELD.W}u, above), hasAbove);
  let uB = select(ui, at(${FIELD.U}u, below), hasBelow); let uA = select(ui, at(${FIELD.U}u, above), hasAbove);
  let shx = 0.5 * limited(hi - hL, hR - hi);
  let sex = 0.5 * limited(ei - eL, eR - ei);
  let sux = 0.5 * limited(ui - uL, uR - ui);
  let swx = 0.5 * limited(wi - wL, wR - wi);
  let shz = 0.5 * limited((hi - hB) * backScale, (hA - hi) * forwardScale);
  let sez = 0.5 * limited((ei - eB) * backScale, (eA - ei) * forwardScale);
  let swz = 0.5 * limited((wi - wB) * backScale, (wA - wi) * forwardScale);
  let suz = 0.5 * limited((ui - uB) * backScale, (uA - ui) * forwardScale);
  let hW = max(hi - shx, 0.0); let hE = max(hi + shx, 0.0); let hS = max(hi - shz, 0.0); let hN = max(hi + shz, 0.0);
  let uW = ui - sux; let uE = ui + sux; let vW = wi - swx; let vE = wi + swx;
  let wS = wi - swz; let wN = wi + swz; let tS = ui - suz; let tN = ui + suz;
  let etaW = ei - sex; let etaE = ei + sex; let etaS = ei - sez; let etaN = ei + sez;
  let massX = hE * uE - hW * uW;
  let massZ = hN * wN - hS * wS;
  let pressureX = hE * uE * uE + 0.5 * g * hE * hE - hW * uW * uW - 0.5 * g * hW * hW - g * 0.5 * (hW + hE) * ((etaW - hW) - (etaE - hE));
  let pressureZ = hN * wN * wN + 0.5 * g * hN * hN - hS * wS * wS - 0.5 * g * hS * hS - g * 0.5 * (hS + hN) * ((etaS - hS) - (etaN - hN));
  let shearX = hE * uE * vE - hW * uW * vW;
  let shearZ = hN * wN * tN - hS * wS * tS;
  let dH = -halfDt * (massX * invDx + massZ * invDz);
  var dQx = -halfDt * (pressureX * invDx + shearZ * invDz);
  var dQz = -halfDt * (shearX * invDx + pressureZ * invDz);
  if (P.dispersive == 1u) { dQx += halfDt * at(${FIELD.PREDX}u, i); dQz += halfDt * at(${FIELD.PREDZ}u, i); }
  var depth = hW + dH;
  if (depth > P.dryDepth) { put(${FIELD.XUW}u, i, (hW * uW + dQx) / depth); put(${FIELD.XWW}u, i, (hW * vW + dQz) / depth); }
  else { depth = max(depth, 0.0); put(${FIELD.XUW}u, i, 0.0); put(${FIELD.XWW}u, i, 0.0); }
  put(${FIELD.XETAW}u, i, etaW + depth - hW); put(${FIELD.XHW}u, i, depth);
  depth = hE + dH;
  if (depth > P.dryDepth) { put(${FIELD.XUE}u, i, (hE * uE + dQx) / depth); put(${FIELD.XWE}u, i, (hE * vE + dQz) / depth); }
  else { depth = max(depth, 0.0); put(${FIELD.XUE}u, i, 0.0); put(${FIELD.XWE}u, i, 0.0); }
  put(${FIELD.XETAE}u, i, etaE + depth - hE); put(${FIELD.XHE}u, i, depth);
  depth = hS + dH;
  if (depth > P.dryDepth) { put(${FIELD.ZWS}u, i, (hS * wS + dQz) / depth); put(${FIELD.ZUS}u, i, (hS * tS + dQx) / depth); }
  else { depth = max(depth, 0.0); put(${FIELD.ZWS}u, i, 0.0); put(${FIELD.ZUS}u, i, 0.0); }
  put(${FIELD.ZETAS}u, i, etaS + depth - hS); put(${FIELD.ZHS}u, i, depth);
  depth = hN + dH;
  if (depth > P.dryDepth) { put(${FIELD.ZWN}u, i, (hN * wN + dQz) / depth); put(${FIELD.ZUN}u, i, (hN * tN + dQx) / depth); }
  else { depth = max(depth, 0.0); put(${FIELD.ZWN}u, i, 0.0); put(${FIELD.ZUN}u, i, 0.0); }
  put(${FIELD.ZETAN}u, i, etaN + depth - hN); put(${FIELD.ZHN}u, i, depth);
}

// K5: each cell's conservative rates from its four interfaces and the well-balanced bed source (fluxAlongX, fluxAlongZ).
@compute @workgroup_size(64) fn rates(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = cellOf(id); if (i >= P.n) { return; }
  let nx = P.nx; let ix = i % nx; let iz = i / nx; let g = P.g;
  let periodic = P.boundary == PERIODIC; let wall = P.boundary == WALL;
  let invDx = 1.0 / P.dx; let invDz = 1.0 / dzr(iz);
  var rh = 0.0; var rqx = 0.0; var rqz = 0.0;
  // West interface: this cell is its right side.
  if (ix > 0u || periodic) {
    let l = select(i - ix + nx - 1u, i - 1u, ix > 0u);
    if (!(at(${FIELD.XHE}u, l) <= 0.0 && at(${FIELD.XHW}u, i) <= 0.0)) {
      let fl = hll(at(${FIELD.XHE}u, l), at(${FIELD.XETAE}u, l), at(${FIELD.XUE}u, l), at(${FIELD.XWE}u, l), at(${FIELD.XHW}u, i), at(${FIELD.XETAW}u, i), at(${FIELD.XUW}u, i), at(${FIELD.XWW}u, i));
      rh += fl.mass * invDx; rqx += (fl.normal + fl.right) * invDx; rqz += fl.tangent * invDx;
    }
  } else if (at(${FIELD.XHW}u, i) > 0.0) {
    let fl = hll(at(${FIELD.XHW}u, i), at(${FIELD.XETAW}u, i), select(at(${FIELD.XUW}u, i), -at(${FIELD.XUW}u, i), wall), at(${FIELD.XWW}u, i), at(${FIELD.XHW}u, i), at(${FIELD.XETAW}u, i), at(${FIELD.XUW}u, i), at(${FIELD.XWW}u, i));
    rh += fl.mass * invDx; rqx += (fl.normal + fl.right) * invDx; rqz += fl.tangent * invDx;
  }
  // East interface: this cell is its left side.
  if (ix < nx - 1u || periodic) {
    let r = select(i - ix, i + 1u, ix < nx - 1u);
    if (!(at(${FIELD.XHE}u, i) <= 0.0 && at(${FIELD.XHW}u, r) <= 0.0)) {
      let fl = hll(at(${FIELD.XHE}u, i), at(${FIELD.XETAE}u, i), at(${FIELD.XUE}u, i), at(${FIELD.XWE}u, i), at(${FIELD.XHW}u, r), at(${FIELD.XETAW}u, r), at(${FIELD.XUW}u, r), at(${FIELD.XWW}u, r));
      rh -= fl.mass * invDx; rqx -= (fl.normal + fl.left) * invDx; rqz -= fl.tangent * invDx;
    }
  } else if (at(${FIELD.XHE}u, i) > 0.0) {
    let fl = hll(at(${FIELD.XHE}u, i), at(${FIELD.XETAE}u, i), at(${FIELD.XUE}u, i), at(${FIELD.XWE}u, i), at(${FIELD.XHE}u, i), at(${FIELD.XETAE}u, i), select(at(${FIELD.XUE}u, i), -at(${FIELD.XUE}u, i), wall), at(${FIELD.XWE}u, i));
    rh -= fl.mass * invDx; rqx -= (fl.normal + fl.left) * invDx; rqz -= fl.tangent * invDx;
  }
  let dsx = at(${FIELD.XHW}u, i) + at(${FIELD.XHE}u, i);
  if (dsx > 0.0) { rqx += g * 0.5 * dsx * ((at(${FIELD.XETAW}u, i) - at(${FIELD.XHW}u, i)) - (at(${FIELD.XETAE}u, i) - at(${FIELD.XHE}u, i))) * invDx; }
  // South interface (walls at both cross-shore ends).
  if (iz > 0u) {
    let lo = i - nx;
    if (!(at(${FIELD.ZHN}u, lo) <= 0.0 && at(${FIELD.ZHS}u, i) <= 0.0)) {
      let fl = hll(at(${FIELD.ZHN}u, lo), at(${FIELD.ZETAN}u, lo), at(${FIELD.ZWN}u, lo), at(${FIELD.ZUN}u, lo), at(${FIELD.ZHS}u, i), at(${FIELD.ZETAS}u, i), at(${FIELD.ZWS}u, i), at(${FIELD.ZUS}u, i));
      rh += fl.mass * invDz; rqz += (fl.normal + fl.right) * invDz; rqx += fl.tangent * invDz;
    }
  } else if (at(${FIELD.ZHS}u, i) > 0.0) {
    let fl = hll(at(${FIELD.ZHS}u, i), at(${FIELD.ZETAS}u, i), -at(${FIELD.ZWS}u, i), at(${FIELD.ZUS}u, i), at(${FIELD.ZHS}u, i), at(${FIELD.ZETAS}u, i), at(${FIELD.ZWS}u, i), at(${FIELD.ZUS}u, i));
    rh += fl.mass * invDz; rqz += (fl.normal + fl.right) * invDz; rqx += fl.tangent * invDz;
  }
  if (iz < P.nz - 1u) {
    let up = i + nx;
    if (!(at(${FIELD.ZHN}u, i) <= 0.0 && at(${FIELD.ZHS}u, up) <= 0.0)) {
      let fl = hll(at(${FIELD.ZHN}u, i), at(${FIELD.ZETAN}u, i), at(${FIELD.ZWN}u, i), at(${FIELD.ZUN}u, i), at(${FIELD.ZHS}u, up), at(${FIELD.ZETAS}u, up), at(${FIELD.ZWS}u, up), at(${FIELD.ZUS}u, up));
      rh -= fl.mass * invDz; rqz -= (fl.normal + fl.left) * invDz; rqx -= fl.tangent * invDz;
    }
  } else if (at(${FIELD.ZHN}u, i) > 0.0) {
    let fl = hll(at(${FIELD.ZHN}u, i), at(${FIELD.ZETAN}u, i), at(${FIELD.ZWN}u, i), at(${FIELD.ZUN}u, i), at(${FIELD.ZHN}u, i), at(${FIELD.ZETAN}u, i), -at(${FIELD.ZWN}u, i), at(${FIELD.ZUN}u, i));
    rh -= fl.mass * invDz; rqz -= (fl.normal + fl.left) * invDz; rqx -= fl.tangent * invDz;
  }
  let dsz = at(${FIELD.ZHS}u, i) + at(${FIELD.ZHN}u, i);
  if (dsz > 0.0) { rqz += g * 0.5 * dsz * ((at(${FIELD.ZETAS}u, i) - at(${FIELD.ZHS}u, i)) - (at(${FIELD.ZETAN}u, i) - at(${FIELD.ZHN}u, i))) * invDz; }
  put(${FIELD.RATEH}u, i, rh); put(${FIELD.RATEQX}u, i, rqx); put(${FIELD.RATEQZ}u, i, rqz);
  put(${FIELD.HALF}u, i, 0.25 * (at(${FIELD.XETAW}u, i) + at(${FIELD.XETAE}u, i) + at(${FIELD.ZETAS}u, i) + at(${FIELD.ZETAN}u, i)));
}

// K6: the dispersive sources at the half step (BoussinesqSolver.dispersiveSources).
@compute @workgroup_size(64) fn sources(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = cellOf(id); if (i >= P.n) { return; }
  let ix = i % P.nx; let iz = i / P.nx;
  if (at(${FIELD.MASK}u, i) <= 0.0) { put(${FIELD.SRCX}u, i, 0.0); put(${FIELD.SRCZ}u, i, 0.0); return; }
  let d = at(${FIELD.STILL}u, i); let dx = at(${FIELD.DDX}u, i); let dz = at(${FIELD.DDZ}u, i);
  let exx = ddxx(${FIELD.HALF}u, ix, iz, false);
  let ezz = ddzz(${FIELD.HALF}u, ix, iz, false);
  let exz = dxOfDz(${FIELD.HALF}u, ix, iz, false, false);
  // Third derivatives: ∂x of η_xx and η_zz, ∂z of η_zz and η_xx, each from its neighbours' second derivatives.
  let nxl = i32(ix) - 1; let nxr = i32(ix) + 1;
  let exxx = (secondXAt(nxr, iz) - secondXAt(nxl, iz)) / (2.0 * P.dx);
  let exzz = (secondZAtX(nxr, iz) - secondZAtX(nxl, iz)) / (2.0 * P.dx);
  let m = belowr(iz); let p = abover(iz); let s = m + p;
  let ezzz = (m / (p * s)) * secondZAtZ(ix, i32(iz) + 1) - (p / (m * s)) * secondZAtZ(ix, i32(iz) - 1) + ((p - m) / (p * m)) * ezz;
  let exxz = (m / (p * s)) * secondXAtZ(ix, i32(iz) + 1) - (p / (m * s)) * secondXAtZ(ix, i32(iz) - 1) + ((p - m) / (p * m)) * exx;
  let scale = BCOEF * P.g * d * d;
  put(${FIELD.SRCX}u, i, scale * (d * (exxx + exzz) + dx * (2.0 * exx + ezz) + dz * exz));
  put(${FIELD.SRCZ}u, i, scale * (d * (ezzz + exxz) + dz * (2.0 * ezz + exx) + dx * exz));
}
fn secondXAt(ix: i32, iz: u32) -> f32 {
  let nx = i32(P.nx);
  if (ix >= 0 && ix < nx) { return ddxx(${FIELD.HALF}u, u32(ix), iz, false); }
  if (P.boundary == PERIODIC) { return ddxx(${FIELD.HALF}u, u32((ix + nx) % nx), iz, false); }
  return ddxx(${FIELD.HALF}u, select(u32(nx - 1), 0u, ix < 0), iz, false);
}
fn secondZAtX(ix: i32, iz: u32) -> f32 {
  let nx = i32(P.nx);
  if (ix >= 0 && ix < nx) { return ddzz(${FIELD.HALF}u, u32(ix), iz, false); }
  if (P.boundary == PERIODIC) { return ddzz(${FIELD.HALF}u, u32((ix + nx) % nx), iz, false); }
  return ddzz(${FIELD.HALF}u, select(u32(nx - 1), 0u, ix < 0), iz, false);
}
fn secondZAtZ(ix: u32, iz: i32) -> f32 {
  let nz = i32(P.nz);
  return ddzz(${FIELD.HALF}u, ix, u32(clamp(iz, 0, nz - 1)), false);
}
fn secondXAtZ(ix: u32, iz: i32) -> f32 {
  let nz = i32(P.nz);
  return ddxx(${FIELD.HALF}u, ix, u32(clamp(iz, 0, nz - 1)), false);
}

// K7: Kennedy breaking from the step's rise rate (BoussinesqSolver.breakingTerms, first half).
@compute @workgroup_size(64) fn breaking(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = cellOf(id); if (i >= P.n) { return; }
  let nx = P.nx; let ix = i % nx; let iz = i / nx; let g = P.g;
  let depth = at(${FIELD.H}u, i); let rise = at(${FIELD.RATEH}u, i);
  put(${FIELD.RISE}u, i, rise);
  if (P.breaks == 0u || depth <= BREAKING_DEPTH) { put(${FIELD.NEXTSTRENGTH}u, i, 0.0); put(${FIELD.NEXTAGE}u, i, 0.0); put(${FIELD.NU}u, i, 0.0); return; }
  var inherited = select(0.0, at(${FIELD.AGE}u, i), at(${FIELD.STRENGTH}u, i) > 0.0);
  if (ix > 0u && at(${FIELD.STRENGTH}u, i - 1u) > 0.0) { inherited = max(inherited, at(${FIELD.AGE}u, i - 1u)); }
  if (ix < nx - 1u && at(${FIELD.STRENGTH}u, i + 1u) > 0.0) { inherited = max(inherited, at(${FIELD.AGE}u, i + 1u)); }
  if (iz > 0u && at(${FIELD.STRENGTH}u, i - nx) > 0.0) { inherited = max(inherited, at(${FIELD.AGE}u, i - nx)); }
  if (iz < P.nz - 1u && at(${FIELD.STRENGTH}u, i + nx) > 0.0) { inherited = max(inherited, at(${FIELD.AGE}u, i + nx)); }
  let still = max(BREAKING_DEPTH, at(${FIELD.STILL}u, i));
  let ramp = min(1.0, inherited / (P.transition * sqrt(still / g)));
  let threshold = sqrt(g * still) * (P.onset + (P.endShare - P.onset) * ramp);
  let b = min(1.0, max(0.0, rise / threshold - 1.0));
  put(${FIELD.NEXTSTRENGTH}u, i, b);
  put(${FIELD.NEXTAGE}u, i, select(0.0, inherited + P.dt, b > 0.0));
  put(${FIELD.NU}u, i, select(0.0, min(MAX_EDDY * depth * sqrt(g * depth), b * P.mixing * depth * rise), b > 0.0));
}

// K8: commit the breaking state, and the shear ν(P_y + Q_x).
@compute @workgroup_size(64) fn shear(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = cellOf(id); if (i >= P.n) { return; }
  let ix = i % P.nx; let iz = i / P.nx;
  put(${FIELD.STRENGTH}u, i, at(${FIELD.NEXTSTRENGTH}u, i));
  put(${FIELD.AGE}u, i, at(${FIELD.NEXTAGE}u, i));
  put(${FIELD.SHEAR}u, i, at(${FIELD.NU}u, i) * (ddz(${FIELD.QX}u, ix, iz, false) + ddx(${FIELD.QZ}u, ix, iz, false)));
}

// K9: the eddy-viscosity terms (BoussinesqSolver.breakingTerms, second half).
@compute @workgroup_size(64) fn viscous(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = cellOf(id); if (i >= P.n) { return; }
  let nx = P.nx; let ix = i % nx; let iz = i / nx;
  let nu = at(${FIELD.NU}u, i);
  let periodic = P.boundary == PERIODIC;
  let pEdge = select(1.0, -1.0, P.boundary == WALL);
  let hasL = ix > 0u || periodic; let hasR = ix < nx - 1u || periodic;
  let l = select(i - ix + nx - 1u, i - 1u, ix > 0u); let r = select(i - ix, i + 1u, ix < nx - 1u);
  let nuL = select(nu, 0.5 * (nu + at(${FIELD.NU}u, l)), hasL); let nuR = select(nu, 0.5 * (nu + at(${FIELD.NU}u, r)), hasR);
  let pi = at(${FIELD.QX}u, i);
  let pL = select(pEdge * pi, at(${FIELD.QX}u, l), hasL); let pR = select(pEdge * pi, at(${FIELD.QX}u, r), hasR);
  var vx = (nuR * (pR - pi) - nuL * (pi - pL)) / (P.dx * P.dx);
  let m = belowr(iz); let p = abover(iz);
  let hasD = iz > 0u; let hasU = iz < P.nz - 1u;
  let dn = select(i, i - nx, hasD); let upc = select(i, i + nx, hasU);
  let nuD = select(nu, 0.5 * (nu + at(${FIELD.NU}u, dn)), hasD); let nuU = select(nu, 0.5 * (nu + at(${FIELD.NU}u, upc)), hasU);
  let qi = at(${FIELD.QZ}u, i);
  let qD = select(-qi, at(${FIELD.QZ}u, dn), hasD); let qU = select(-qi, at(${FIELD.QZ}u, upc), hasU);
  var vz = (nuU * (qU - qi) / p - nuD * (qi - qD) / m) * (2.0 / (m + p));
  vx += 0.5 * ddz(${FIELD.SHEAR}u, ix, iz, true);
  vz += 0.5 * ddx(${FIELD.SHEAR}u, ix, iz, true);
  put(${FIELD.VISCX}u, i, select(0.0, vx, P.breaks == 1u));
  put(${FIELD.VISCZ}u, i, select(0.0, vz, P.breaks == 1u));
}

// K10: advance h, P̄ and Q̄.
@compute @workgroup_size(64) fn update(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = cellOf(id); if (i >= P.n) { return; }
  let h = max(0.0, at(${FIELD.H}u, i) + P.dt * at(${FIELD.RATEH}u, i));
  put(${FIELD.H}u, i, h);
  let wet = h > P.dryDepth;
  put(${FIELD.PBAR}u, i, select(0.0, at(${FIELD.PBAR}u, i) + P.dt * (at(${FIELD.RATEQX}u, i) + at(${FIELD.SRCX}u, i) + at(${FIELD.VISCX}u, i)), wet));
  put(${FIELD.QBAR}u, i, select(0.0, at(${FIELD.QBAR}u, i) + P.dt * (at(${FIELD.RATEQZ}u, i) + at(${FIELD.SRCZ}u, i) + at(${FIELD.VISCZ}u, i)), wet));
}

// K11: the row systems for P from P̄, one cell per thread: bands a, b, c and the right side, into the dead face fields.
@compute @workgroup_size(64) fn rowTerms(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = cellOf(id); if (i >= P.n) { return; }
  let ix = i % P.nx; let iz = i / P.nx;
  var a = 0.0; var b = 1.0; var c = 0.0; var r = at(${FIELD.PBAR}u, i);
  if (at(${FIELD.MASK}u, i) > 0.0) {
    let d = at(${FIELD.STILL}u, i); let dx = at(${FIELD.DDX}u, i); let dz = at(${FIELD.DDZ}u, i);
    let A = ALPHA * d * d / (P.dx * P.dx);
    let E = (d * dx / 3.0) / (2.0 * P.dx);
    a = -(A - E); b = 1.0 + 2.0 * A; c = -(A + E);
    let qy = ddz(${FIELD.QZ}u, ix, iz, true);
    let qxy = dxOfDz(${FIELD.QZ}u, ix, iz, true, false);
    let qx = ddx(${FIELD.QZ}u, ix, iz, false);
    r += ALPHA * d * d * qxy + d * dx * qy / 6.0 + d * dz * qx / 6.0;
    // Edge ghosts: P odd at a wall, extended at an open edge.
    let edge = select(1.0, -1.0, P.boundary == WALL);
    if (ix == 0u) { b += edge * a; a = 0.0; }
    if (ix == P.nx - 1u) { b += edge * c; c = 0.0; }
  }
  put(${FIELD.XHW}u, i, a); put(${FIELD.XHE}u, i, b); put(${FIELD.XETAW}u, i, c); put(${FIELD.XETAE}u, i, r);
}

// K12: P from P̄, one row per thread (Thomas).
@compute @workgroup_size(64) fn rows(@builtin(global_invocation_id) id: vec3<u32>) {
  let iz = id.x; if (iz >= P.nz) { return; }
  let nx = P.nx; let row = iz * nx;
  var cPrev = 0.0; var rPrev = 0.0;
  for (var ix = 0u; ix < nx; ix++) {
    let i = row + ix;
    let a = select(at(${FIELD.XHW}u, i), 0.0, ix == 0u);
    let denominator = at(${FIELD.XHE}u, i) - a * cPrev;
    cPrev = at(${FIELD.XETAW}u, i) / denominator;
    rPrev = (at(${FIELD.XETAE}u, i) - a * rPrev) / denominator;
    put(${FIELD.TC}u, i, cPrev); put(${FIELD.TR}u, i, rPrev);
  }
  var next = rPrev;
  put(${FIELD.QX}u, row + nx - 1u, next);
  for (var k = i32(nx) - 2; k >= 0; k--) {
    let i = row + u32(k);
    next = at(${FIELD.TR}u, i) - at(${FIELD.TC}u, i) * next;
    put(${FIELD.QX}u, i, next);
  }
}

// K13: the column systems for Q from Q̄ (walls at both cross-shore ends), one cell per thread.
@compute @workgroup_size(64) fn columnTerms(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = cellOf(id); if (i >= P.n) { return; }
  let ix = i % P.nx; let iz = i / P.nx;
  var a = 0.0; var b = 1.0; var c = 0.0; var r = at(${FIELD.QBAR}u, i);
  if (at(${FIELD.MASK}u, i) > 0.0) {
    let m = belowr(iz); let p = abover(iz); let s = m + p;
    let d = at(${FIELD.STILL}u, i); let dx = at(${FIELD.DDX}u, i); let dz = at(${FIELD.DDZ}u, i);
    let A = ALPHA * d * d; let E = d * dz / 3.0;
    a = -(A * (2.0 / (m * s)) + E * (-p / (m * s)));
    b = 1.0 - (A * (-2.0 / (m * p)) + E * ((p - m) / (p * m)));
    c = -(A * (2.0 / (p * s)) + E * (m / (p * s)));
    let px = ddx(${FIELD.QX}u, ix, iz, true);
    let pxy = dzOfDx(${FIELD.QX}u, ix, iz, true, false);
    let py = ddz(${FIELD.QX}u, ix, iz, false);
    r += A * pxy + d * dz * px / 6.0 + d * dx * py / 6.0;
    if (iz == 0u) { b -= a; a = 0.0; }
    if (iz == P.nz - 1u) { b -= c; c = 0.0; }
  }
  put(${FIELD.XUW}u, i, a); put(${FIELD.XUE}u, i, b); put(${FIELD.XWW}u, i, c); put(${FIELD.XWE}u, i, r);
}

// K14: Q from Q̄, one column per thread (Thomas); neighbouring threads read neighbouring cells.
@compute @workgroup_size(64) fn columns(@builtin(global_invocation_id) id: vec3<u32>) {
  let ix = id.x; if (ix >= P.nx) { return; }
  let nx = P.nx;
  var cPrev = 0.0; var rPrev = 0.0;
  for (var iz = 0u; iz < P.nz; iz++) {
    let i = iz * nx + ix;
    let a = select(at(${FIELD.XUW}u, i), 0.0, iz == 0u);
    let denominator = at(${FIELD.XUE}u, i) - a * cPrev;
    cPrev = at(${FIELD.XWW}u, i) / denominator;
    rPrev = (at(${FIELD.XWE}u, i) - a * rPrev) / denominator;
    put(${FIELD.TC}u, i, cPrev); put(${FIELD.TR}u, i, rPrev);
  }
  var next = rPrev;
  put(${FIELD.QZ}u, (P.nz - 1u) * nx + ix, next);
  for (var k = i32(P.nz) - 2; k >= 0; k--) {
    let i = u32(k) * nx + ix;
    next = at(${FIELD.TR}u, i) - at(${FIELD.TC}u, i) * next;
    put(${FIELD.QZ}u, i, next);
  }
}

// K15: dry cells, the predictor's memory, and Manning friction.
@compute @workgroup_size(64) fn finish(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = cellOf(id); if (i >= P.n) { return; }
  let h = at(${FIELD.H}u, i);
  var qx = at(${FIELD.QX}u, i); var qz = at(${FIELD.QZ}u, i);
  if (h > P.dryDepth) {
    if (P.dispersive == 1u) {
      put(${FIELD.PREDX}u, i, (qx - at(${FIELD.STARTP}u, i)) / P.dt - at(${FIELD.RATEQX}u, i));
      put(${FIELD.PREDZ}u, i, (qz - at(${FIELD.STARTQ}u, i)) / P.dt - at(${FIELD.RATEQZ}u, i));
    }
    if (P.manning > 0.0) {
      let speed = sqrt(qx * qx + qz * qz) / h;
      let damping = 1.0 + (P.dt * P.g * P.manning * P.manning * speed) / (h * pow(h, 1.0 / 3.0));
      qx /= damping; qz /= damping;
    }
  } else {
    qx = 0.0; qz = 0.0;
    put(${FIELD.PREDX}u, i, 0.0); put(${FIELD.PREDZ}u, i, 0.0);
  }
  put(${FIELD.QX}u, i, qx); put(${FIELD.QZ}u, i, qz);
}

// K16: the offshore relaxation zone blends toward the linear sea (SeaStateBoundary.target).
@compute @workgroup_size(64) fn relax(@builtin(global_invocation_id) id: vec3<u32>) {
  let local = id.x; if (local >= P.zoneRows * P.nx) { return; }
  let i = P.zoneFirst * P.nx + local;
  let weight = at(${FIELD.WEIGHT}u, i);
  if (weight <= 0.0) { return; }
  let x = xc(i % P.nx); let z = zcen(i / P.nx);
  var eta = 0.0; var qx = 0.0; var qz = 0.0;
  for (var c = 0u; c < P.components; c++) {
    let o = c * ${COMPONENT_STRIDE}u;
    let value = S[o] * cos(S[o + 1u] * x + S[o + 2u] * z + S[o + 5u] - S[o + 6u] * P.tau);
    eta += value; qx += S[o + 3u] * value; qz += S[o + 4u] * value;
  }
  let bed = at(${FIELD.BED}u, i);
  let goal = max(0.0, eta - bed);
  var h = at(${FIELD.H}u, i);
  h += weight * (goal - h);
  put(${FIELD.H}u, i, h);
  let wet = h > P.dryDepth;
  put(${FIELD.QX}u, i, select(0.0, at(${FIELD.QX}u, i) + weight * (qx - at(${FIELD.QX}u, i)), wet));
  put(${FIELD.QZ}u, i, select(0.0, at(${FIELD.QZ}u, i) + weight * (qz - at(${FIELD.QZ}u, i)), wet));
}
`;
}

/** Entry points in the order one substep runs them (the relaxation zone after, as on the CPU). */
export const STEP_KERNELS = ['begin', 'mask', 'modified', 'predict', 'rates', 'sources', 'breaking', 'shear', 'viscous', 'update', 'rowTerms', 'rows', 'columnTerms', 'columns', 'finish', 'relax'] as const;
