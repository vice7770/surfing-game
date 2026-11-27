import { scheduledDesign, steadyTurn, steadyTurnAt, zeros, DEFAULT_WEIGHTS } from '/Users/vicentealmeida/Documents/Codex/surfing-game/.claude/worktrees/turn-entry/src/physics/predictiveBalance';
const w: any = { ...DEFAULT_WEIGHTS, riderBody: 'two', plantFloor: 6, stanceDeep: true };
const D = 180 / Math.PI;
function solve(phi: number[][], gamma: number[][], fixed: Record<number, number>, free: number[]) {
  const n = phi.length; const cols = free.length + 2;
  const A: number[][] = [], b: number[] = [];
  for (let i = 0; i < n; i++) { const row = free.map((j) => phi[i][j] - (i === j ? 1 : 0)); row.push(gamma[i][0], gamma[i][1]); A.push(row); let r = 0; for (const [j, v] of Object.entries(fixed)) r -= (phi[i][+j] - (i === +j ? 1 : 0)) * v; b.push(r); }
  // normal equations
  const M = zeros(cols, cols); const y = new Array(cols).fill(0);
  for (let a = 0; a < cols; a++) { for (let c = 0; c < cols; c++) for (let i = 0; i < n; i++) M[a][c] += A[i][a] * A[i][c]; for (let i = 0; i < n; i++) y[a] += A[i][a] * b[i]; }
  // gauss
  for (let c = 0; c < cols; c++) { let p = c; for (let r = c + 1; r < cols; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[p], M[c]] = [M[c], M[p]]; [y[p], y[c]] = [y[c], y[p]]; for (let r = c + 1; r < cols; r++) { const f = M[r][c] / M[c][c]; for (let k = c; k < cols; k++) M[r][k] -= f * M[c][k]; y[r] -= f * y[c]; } }
  const z = new Array(cols).fill(0); for (let r = cols - 1; r >= 0; r--) { let s = y[r]; for (let k = r + 1; k < cols; k++) s -= M[r][k] * z[k]; z[r] = s / M[r][r]; }
  const x = new Array(n).fill(0); for (const [j, v] of Object.entries(fixed)) x[+j] = v; free.forEach((j, c) => (x[j] = z[c]));
  const u = [z[free.length], z[free.length + 1]];
  let res = 0; for (let i = 0; i < n; i++) { let r = -x[i]; for (let j = 0; j < n; j++) r += phi[i][j] * x[j]; r += gamma[i][0] * u[0] + gamma[i][1] * u[1]; res += r * r; }
  return { x, u, res: Math.sqrt(res) };
}
const lean = Math.tan(40 / D);
for (const [v, depth] of [[7.5, 0.3], [7, 0.45], [9.5, 0.3]]) {
  const d = scheduledDesign(v, depth, 0, w), t = scheduledDesign(v, 0, 0, w);
  const tt = steadyTurn(t.phi, t.gamma, lean, 0);
  const base = solve(d.phi, d.gamma, { 1: 0, 2: lean, 3: 0, 6: 0 }, [0, 4, 5, 7, 8, 9]);
  const pin = solve(d.phi, d.gamma, { 0: tt.x[0], 1: 0, 2: lean, 3: 0, 6: 0 }, [4, 5, 7, 8, 9]);
  const tw = solve(d.phi, d.gamma, { 0: tt.x[0], 1: 0, 2: lean, 3: 0 }, [4, 5, 6, 7, 8, 9]);
  const f = (s: any) => `phi ${(s.x[0] * D).toFixed(1)} r ${(s.x[4] * D).toFixed(1)} tw ${s.x[6].toFixed(3)} dl ${s.x[8].toFixed(3)} u ${s.u.map((q: number) => q.toFixed(3))} res ${s.res.toExponential(1)}`;
  console.log(`v ${v} d ${depth}\n  base ${f(base)}\n  pin  ${f(pin)}\n  tw   ${f(tw)}`);
}
