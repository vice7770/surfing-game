/**
 * **3.6f's model-side unit reads** (README §0.5 Q3): the balance's own plant (`plantAt`, his options, as the shipped
 * design builds it: 3.6e's `shippedPlant`) and its instantaneous lateral compliance (`lateralCompliance`, the inverse
 * of `twoBody`'s mass matrix over [φ̈, θ̈, ṙ, a_y]): the yaw acceleration per unit yaw moment on the board, and per unit
 * side force at the feet's station, as inertias; beside them the same with the board's own side mass made very large
 * (the board's sway held: what 3.6e's −(I_r + m x_f²) assumes), and the H-form partial −(I_r + m x_f²) itself.
 *
 *   node <s>/model.mjs   (bundled as the other scripts)
 */
import { lateralCompliance, lateralMass } from '../../../../src/physics/rollModel';
import { shippedPlant } from '../board-fit/fitLib';

const DEPTHS: [string, number][] = [['tall', 0], ['Compress', 0.3], ['tuck', 0.45]];
const SPEEDS = [6, 8, 9.3, 10.5];
const f = (x: number, n = 3) => x.toFixed(n);
const out: string[] = ['| stance | V m/s | I_z = board + legs (model) | m x_f² | H-form partial I_z + m x_f² | instantaneous, unit yaw moment | instantaneous, board sway held (m_b × 10⁶) | side force at x_f: ṙ per N·s → inertia-equivalent x_f / ṙ |', '| --- | --- | --- | --- | --- | --- | --- | --- |'];
const rows: unknown[] = [];
const noJ: string[] = ['| stance | V m/s | J kg·m² | h m | m J / (J + m h²) kg | instantaneous yaw inertia, with J → without | board sway held, with J → without | ṙ per unit side impulse at x_f (rad/s per N·s), with J → without |', '| --- | --- | --- | --- | --- | --- | --- | --- |'];
for (const [name, depth] of DEPTHS) for (const v of SPEEDS) {
  const { y } = shippedPlant(v, depth, 0);
  const iz = y.boardYawInertia + y.riderYawInertia;
  const c = lateralCompliance(y, y.body);
  const held = { ...y, boardMass: y.boardMass * 1e6 };
  const ch = lateralCompliance(held, y.body);
  // A unit side force at the feet's station (the deck, z_d over the centre of mass, x_f along): the generalised forces
  // [K: z_d, bank: 0, N: x_f, Y: 1] (`twoBody`'s v_f), the yaw acceleration their sum.
  const side = c[2][0] * y.deckHeight + c[2][2] * y.feetStation + c[2][3];
  const mxf2 = y.mass * y.feetStation * y.feetStation;
  const M = lateralMass(y, y.body);
  out.push(`| ${name} | ${v} | ${f(iz)} | ${f(mxf2)} | ${f(iz + mxf2)} | ${f(1 / c[2][2])} | ${f(1 / ch[2][2])} | ${f(y.feetStation / side)} |`);
  // Amendment 4 (exploratory): the same with the body's own rotational inertia J removed (`twoBody`'s control).
  const nb = { ...(y.body ?? { inertia: 0 }), inertia: 0 };
  const c0 = lateralCompliance(y, nb), ch0 = lateralCompliance(held, nb);
  const side0 = c0[2][0] * y.deckHeight + c0[2][2] * y.feetStation + c0[2][3];
  const J = y.body?.inertia ?? 0, meff = (y.mass * J) / (J + y.mass * y.height * y.height);
  noJ.push(`| ${name} | ${v} | ${f(J)} | ${f(y.height)} | ${f(meff, 1)} | ${f(1 / c[2][2])} → ${f(1 / c0[2][2])} | ${f(1 / ch[2][2])} → ${f(1 / ch0[2][2])} | ${f(side, 4)} → ${f(side0, 4)} |`);
  rows.push({ name, v, depth, iz, boardYaw: y.boardYawInertia, lower: y.riderYawInertia, mxf2, inst: 1 / c[2][2], held: 1 / ch[2][2], side, boardMass: y.boardMass, J: y.body?.inertia, h: y.height, M });
}
console.log(out.join('\n'));
console.log('');
console.log(noJ.join('\n'));
console.log(JSON.stringify(rows));
