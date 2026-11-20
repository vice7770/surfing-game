/**
 * **Step 3.5o, model side: the reference the balance tracks, across the bottom of its speed table.**
 *
 * `sharp-steer.ts` found the wave-1 correction is driven by the controller's own REFERENCE: `PredictiveController.tick`
 * solves the blended model's steady turn for the lean asked (`steadyTurn`, `turn: 'tan'`), and on wave 1 that steady
 * turn asks for a sideslip of 0.6 rad once the speed through the water falls under 4.5 m/s. This file reads that
 * reference off the controller itself — the same `blend`, the same `steadyTurn`, the owner's weights
 * (`DEFAULT_WEIGHTS` + `riderBody: 'two'`, exactly what `AttachedRider`'s constructor builds for his address) — on a
 * grid of speed × lean × depth × rail, with nothing integrated and nothing ridden. **MEASUREMENT ONLY.**
 *
 *     ./node_modules/.bin/rolldown docs/research/new-rider/3.5/sharp-steer-ref.ts -o <s>/ref.mjs --format esm --platform node
 *     node <s>/ref.mjs > <s>/ref.jsonl
 *
 * `FLOOR=4.5` reads the same grid with `plantFloor: 4.5` (step 3.4m's switch) for the counterfactual.
 */
import { DEFAULT_WEIGHTS, PredictiveController, steadyTurn, railPull, railLimit } from '../../../../src/physics/predictiveBalance';

const DEG = 180 / Math.PI;
const FLOOR = process.env.FLOOR ? Number(process.env.FLOOR) : undefined;
const weights = { ...DEFAULT_WEIGHTS, riderBody: 'two' as const, ...(FLOOR !== undefined ? { plantFloor: FLOOR } : {}) };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctl = new PredictiveController(weights, 'tan') as any;
const MAX_BANK = (70 * Math.PI) / 180;
const RAIL_CAP = (12 * Math.PI) / 180;
const N = ['phi', 'phid', 'th', 'thd', 'r', 'beta', 'twA', 'wU', 'dlt', 'tauA'];

/** `predictiveBank`'s own schedule rail for a lean asked at a speed (two passes, then the cap). */
function schedRail(lean: number, speed: number): number {
  let rail = Math.abs(lean);
  for (let k = 0; k < 2; k += 1) rail = Math.atan(Math.tan(Math.min(MAX_BANK, Math.abs(lean))) / railPull(speed, rail));
  return Math.min(RAIL_CAP, rail);
}

const speeds = [3.6, 3.8, 3.9, 4.0, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8, 5.0, 5.5, 6.0, 7.0];
const leans = [0, 5, 10, 15, 18, 20, 21, 22, 25, 30, 35, 40];
const depths = (process.env.DEPTHS ?? '0,0.1,0.2').split(',').map(Number);
for (const depth of depths) {
  for (const v of speeds) {
    for (const leanDeg of leans) {
      const lean = leanDeg / DEG;
      const rail = schedRail(lean, v);
      const d = ctl.blend(v, depth, rail);
      // The tick's own reference (model signs: the model's bank is the lean's negative, `-this.leanAsked`).
      const bankAsked = -lean;
      let ref = steadyTurn(d.phi, d.gamma, bankAsked, 0);
      if (Math.abs(bankAsked) > 1e-6) {
        const t = steadyTurn(d.phi, d.gamma, Math.tan(bankAsked), 0);
        const f = bankAsked / Math.tan(bankAsked);
        ref = { x: t.x.map((x, i) => (i === 0 || i === 2 || i === 8 ? x * f : x)), u: [t.u[0] * f, t.u[1]] };
      }
      const x: Record<string, number> = {};
      N.forEach((name, i) => { x[name] = Number(ref.x[i].toFixed(5)); });
      process.stdout.write(`${JSON.stringify({
        floor: FLOOR ?? null, depth, v, leanDeg, railDeg: Number((rail * DEG).toFixed(3)), railLimitDeg: Number((railLimit(v) * DEG).toFixed(2)),
        refU: Number((ref.u[0] * DEG).toFixed(3)), betaDeg: Number((ref.x[5] * DEG).toFixed(3)), phiDeg: Number((ref.x[0] * DEG).toFixed(3)),
        r: Number(ref.x[4].toFixed(4)), dltDeg: Number((ref.x[8] * DEG).toFixed(3)),
        kBeta: Number(d.k[0][5].toFixed(4)), kTh: Number(d.k[0][2].toFixed(4)), kPhi: Number(d.k[0][0].toFixed(4)), kR: Number(d.k[0][4].toFixed(4)),
        x,
      })}\n`);
    }
  }
}
