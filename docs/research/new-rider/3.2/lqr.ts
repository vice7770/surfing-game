// Step 3.2c (ruling 29g, item 4): a small dense LQR for the probes. The continuous algebraic Riccati equation
// AᵀP + PA − P B R⁻¹ Bᵀ P + Q = 0 by the matrix sign function of the Hamiltonian (Roberts 1971; Gardiner and Laub
// 1986, Int J Control 44:823): W = sign(H), then [W12; W22 + I] P = −[W11 + I; W21] in least squares. The residual is
// returned so a probe can check it. Model only; nothing here runs in the game.

export type Mat = number[][];

export const zeros = (r: number, c: number): Mat => Array.from({ length: r }, () => new Array<number>(c).fill(0));
export const eye = (n: number): Mat => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
export const transpose = (a: Mat): Mat => a[0].map((_, j) => a.map((row) => row[j]));
export function mul(a: Mat, b: Mat): Mat {
  const out = zeros(a.length, b[0].length);
  for (let i = 0; i < a.length; i += 1) for (let k = 0; k < b.length; k += 1) {
    const v = a[i][k];
    if (v === 0) continue;
    for (let j = 0; j < b[0].length; j += 1) out[i][j] += v * b[k][j];
  }
  return out;
}
export const add = (a: Mat, b: Mat, s = 1): Mat => a.map((row, i) => row.map((v, j) => v + s * b[i][j]));
export const scale = (a: Mat, s: number): Mat => a.map((row) => row.map((v) => v * s));
const norm1 = (a: Mat) => a.reduce((s, row) => s + row.reduce((t, v) => t + Math.abs(v), 0), 0);

/** The inverse and the log of |det| by Gauss–Jordan with partial pivoting. */
export function inverse(a: Mat): { inv: Mat; logDet: number } {
  const n = a.length;
  const m = a.map((row, i) => [...row, ...eye(n)[i]]);
  let logDet = 0;
  for (let c = 0; c < n; c += 1) {
    let p = c;
    for (let r = c + 1; r < n; r += 1) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (m[p][c] === 0) throw new Error('singular');
    [m[c], m[p]] = [m[p], m[c]];
    const d = m[c][c];
    logDet += Math.log(Math.abs(d));
    for (let j = 0; j < 2 * n; j += 1) m[c][j] /= d;
    for (let r = 0; r < n; r += 1) {
      if (r === c) continue;
      const f = m[r][c];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j += 1) m[r][j] -= f * m[c][j];
    }
  }
  return { inv: m.map((row) => row.slice(n)), logDet };
}

/** The stabilising solution P of the CARE and the gain K = R⁻¹ Bᵀ P (u = −K x); `residual` is ‖Riccati‖₁ / ‖Q‖₁. */
export function lqr(a: Mat, b: Mat, q: Mat, r: Mat): { p: Mat; k: Mat; residual: number } {
  const n = a.length;
  const ri = inverse(r).inv;
  const s = mul(mul(b, ri), transpose(b));
  const h = zeros(2 * n, 2 * n);
  for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) {
    h[i][j] = a[i][j];
    h[i][n + j] = -s[i][j];
    h[n + i][j] = -q[i][j];
    h[n + i][n + j] = -a[j][i];
  }
  let z = h;
  for (let it = 0; it < 200; it += 1) {
    const { inv, logDet } = inverse(z);
    const c = Math.exp(logDet / (2 * n));
    const next = add(scale(z, 0.5 / c), scale(inv, 0.5 * c));
    const change = norm1(add(next, z, -1));
    z = next;
    if (change < 1e-12 * norm1(z)) break;
  }
  const m = zeros(2 * n, n);
  const rhs = zeros(2 * n, n);
  for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) {
    m[i][j] = z[i][n + j];
    m[n + i][j] = z[n + i][n + j] + (i === j ? 1 : 0);
    rhs[i][j] = -(z[i][j] + (i === j ? 1 : 0));
    rhs[n + i][j] = -z[n + i][j];
  }
  const mt = transpose(m);
  let p = mul(inverse(mul(mt, m)).inv, mul(mt, rhs));
  p = p.map((row, i) => row.map((v, j) => (v + p[j][i]) / 2));
  const k = mul(mul(ri, transpose(b)), p);
  const ric = add(add(add(mul(transpose(a), p), mul(p, a)), mul(mul(p, s), p), -1), q);
  return { p, k, residual: norm1(ric) / Math.max(1e-300, norm1(q)) };
}
