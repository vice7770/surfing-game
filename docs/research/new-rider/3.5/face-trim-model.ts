/**
 * **Step 3.5r, model side only: the face's first-order column, the trims it implies, and the closed loop around them.**
 * Nothing is ridden. The numbers of `face-trim.md` §1, §3, §4 and §7, off the code's own functions (`plantAt`,
 * `continuousPlant`, `heelColumn`, `steadyTurn`, `scheduledDesign`) on the owner's design (`riderBody: 'two'`).
 *
 *     ./node_modules/.bin/rolldown docs/research/new-rider/3.5/face-trim-model.ts -o <s>/ftm.mjs --format esm --platform node
 *     env TILT=12 node <s>/ftm.mjs
 */
import { DEFAULT_WEIGHTS, CONTROL_STEP, add, continuousPlant, discretise, eye, heelColumn, inverse, mul, plantAt, scheduledDesign, steadyTurn } from '../../../../src/physics/predictiveBalance';

const DEG = 180 / Math.PI;
const tilt = Number(process.env.TILT ?? 12) / DEG;
const weights = { ...DEFAULT_WEIGHTS, riderBody: 'two' as const };
const f = (x: number, d = 2) => Number(x.toFixed(d));
const depths = (process.env.DEPTHS ?? '0,0.195').split(',').map(Number);
const speeds = (process.env.SPEEDS ?? '5,6,6.5,7,8').split(',').map(Number);

for (const depth of depths) for (const v of speeds) {
  const { y, t } = plantAt(v, depth, { rail: 0, body: true, stanceDeep: true });
  const { a } = continuousPlant(y, t);
  const n = a.length;
  const heel = heelColumn(y, t);
  const bare = { ...y, heelRoll: 0, heelSide: 0, heelYaw: 0 };
  const b0 = continuousPlant(bare, t).a;
  const side = continuousPlant({ ...bare, heelSide: 1 }, t).a.map((row, i) => row[0] - b0[i][0]);
  const L = (y.mass + y.boardMass) * 9.81;
  const face = heel.map((h, i) => -h + L * side[i]);
  const d = scheduledDesign(v, depth, 0, weights);
  const disc = (col: number[]) => discretise(a, col.map((x) => [x]), CONTROL_STEP).gamma.map((r) => r[0] * tilt);
  const mgh = y.mass * 9.81 * y.height;
  // The family of straight trims (sway, board roll, body bank balanced; the turn 0): three points.
  const point = (psi: number) => {
    const beta = -(y.heelSide * psi + L * tilt) / y.slipSide;
    const tauA = -(y.heelRoll * psi + y.slipRoll * beta);
    const theta = tauA / mgh;
    const phi = tilt + psi;
    return { psi, phi, beta, theta, tauA, rest: theta - phi - tauA / y.ankleStiffness };
  };
  const neutralPsi = (-L * tilt) / (y.heelSide - (y.slipSide * y.heelRoll) / y.slipRoll);
  const pts = { flush: point(0), neutral: point(neutralPsi), level: point(-tilt) };
  // The closed loop (true plant = the model with the face, the shipped gains, a perfect estimate) around a reference.
  const gd = disc(face);
  const cl = add(add(eye(n), d.phi, -1), mul(d.gamma, d.k));
  const loop = (p?: ReturnType<typeof point>) => {
    const xr = new Array<number>(n).fill(0);
    const ur = [0, 0];
    if (p) { xr[0] = p.phi; xr[2] = p.theta; xr[5] = p.beta; xr[8] = p.rest; ur[0] = p.rest; }
    const kx = d.k.map((row) => row.reduce((s, k, j) => s + k * xr[j], 0));
    const rhs = d.gamma.map((row, i) => row[0] * (ur[0] + kx[0]) + row[1] * (ur[1] + kx[1]) + gd[i]);
    const x = mul(inverse(cl), rhs.map((q) => [q])).map((r) => r[0]);
    return { phiDeg: f(x[0] * DEG, 1), bankDeg: f(x[2] * DEG, 1), rDegS: f(x[4] * DEG, 1), slipDeg: f(x[5] * DEG, 1), ankleNm: f(y.ankleStiffness * (x[2] - x[0] - x[8]), 0) };
  };
  const full = steadyTurn(d.phi, d.gamma, 0, 0, gd);
  const show = (p: ReturnType<typeof point>) => ({ railDeg: f(p.psi * DEG, 1), phiDeg: f(p.phi * DEG, 1), slipDeg: f(p.beta * DEG, 1), bankDeg: f(p.theta * DEG, 1), ankleNm: f(p.tauA, 1), restDeg: f(p.rest * DEG, 1) });
  process.stdout.write(`${JSON.stringify({
    depth, v, tiltDeg: f(tilt * DEG, 1), lift: f(L, 0),
    derivs: { Yphi: f(y.heelSide, 1), Kphi: f(y.heelRoll, 1), Ybeta: f(y.slipSide, 1), Kbeta: f(y.slipRoll, 1), Nbeta: f(y.slipYaw, 1) },
    levelBoard: { sideN: f((L - y.heelSide) * tilt, 1), rollNm: f(-y.heelRoll * tilt, 1) },
    column: { face: [1, 3, 4, 5].map((i) => f(face[i], 2)), waterHeel: [1, 3, 4, 5].map((i) => f(-heel[i], 2)) },
    trims: { flush: show(pts.flush), neutral: show(pts.neutral), level: show(pts.level) },
    yawResidual: { neutral: f([pts.neutral].map((p) => { const xr = new Array<number>(n).fill(0); xr[0] = p.phi; xr[2] = p.theta; xr[5] = p.beta; xr[8] = p.rest; return a[4].reduce((s, q, j) => s + q * xr[j], 0) + face[4] * tilt; })[0], 2) },
    fullSteady: { railDeg: f((full.x[0] - tilt) * DEG, 1), rDegS: f(full.x[4] * DEG, 1), slipDeg: f(full.x[5] * DEG, 1), restDeg: f(full.u[0] * DEG, 1) },
    closedLoop: { model: loop(), neutral: loop(pts.neutral), level: loop(pts.level) },
  })}\n`);
}
