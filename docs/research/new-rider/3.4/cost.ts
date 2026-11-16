/**
 * **Step 3.4b: the cost function's two point-mass constants, measured on the plant they are designed on.**
 *
 * Step 3.4a put the body's own inertia into the balance's internal plant and closed with the sentence this probe is
 * for: *"the cost function is now inconsistent with the plant in two named places — `captureRow`'s ω₀ = √(g/L) and
 * `feetReach`'s bank limit `feetReach / L` are both the point-mass body's, on a plant whose bank coordinate now meets
 * seven times the inertia."*
 *
 * This probe is **read-only on the matrices** (the ridden arms are `3.3/plant.ts` with `COST=`). It measures, at every
 * one of the 306 points of the schedule the game reads (17 speeds × 3 depths × 6 rails), on the shipped plant and on
 * the two-body one:
 *
 * 1. **Whether either constant is in the shipped cost function at all**: `DEFAULT_WEIGHTS`'s own keys; the shipped
 *    design against the same design with the round's own fix applied (`captureOmega: 'solved'`), which must be
 *    byte-identical; and the same fix with the two weights ON, which must move every point. P1, as a column.
 * 2. **Five candidate ω₀**, each with its own definition stated:
 *    - `line`   = √(g/h) — what `captureRow` ships (Hof, Gazendam and Sinke 2005, on a point mass).
 *    - `fixed`  = √(m g h / (J + m h²)) — the same body with its own inertia and its **feet held**.
 *    - `solved` = √(C₁₁ · m g h) — the body's own weight `m g h θ` put through the plant's **own** lateral
 *      compliance `C = lateralMass⁻¹`, i.e. with the board free to recoil. This is the quantity 3.4a §7 measured
 *      against the game and the one the bank inertia of §6 reading 3 divides.
 *    - `row`    = √(A[3][2]) — the plant's own whole θ̈ per θ, ankle spring and water included, when it is positive.
 *    - `eig`    = the plant's own largest positive real eigenvalue of the 10×10 `A`, reported with the share of its
 *      own eigenvector that sits on the lean rather than on the board, so it is not read as a lean rate.
 * 3. **The held reading against the mass matrix's own diagonal** — `fixed` must be `√(m g h / M₁₁)` exactly, because
 *    the bank row's inertia with the other three lateral coordinates **held** is what a mass matrix's diagonal
 *    honestly is, and that is the only quantity this probe reads off a diagonal.
 * 4. **The gains**, so the size of the disagreement is in the quantity that reaches the rider: `K` built with the two
 *    weights on and the constants point-mass, against the same with the constants the plant's own.
 *
 * Run from the repository's root:
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.4/cost.ts -o <scratch>/cost.mjs --format esm --platform node
 *   node <scratch>/cost.mjs
 *
 * Env: `OMEGA=line|fixed|solved|row` picks which definition the `plant` cost uses for the gain table (default
 * `solved`); `OUT` writes the raw rows as JSONL.
 */
import { appendFileSync } from 'node:fs';
import {
  COST_FEET_REACH, DEFAULT_WEIGHTS, SCHEDULE_DEPTHS, SCHEDULE_RAILS, SCHEDULE_SPEEDS, STANCE_TABLE,
  bodyInertiaAt, captureRow, continuousPlant, costWeights, design, plantAt, type DesignWeights,
} from '../../../../src/physics/predictiveBalance';
import { eigenvalues, lateralCompliance, lateralMass, type RiderBody, type TwistPlant, type YawPlant } from '../../../../src/physics/rollModel';

const GRAVITY = 9.81;
const OUT = process.env.OUT;

type Cand = 'line' | 'fixed' | 'solved' | 'row' | 'eig';
const CANDS: Cand[] = ['line', 'fixed', 'solved', 'row', 'eig'];

/**
 * The five candidate ω₀ at a plant, rad/s, each from its own stated definition, plus the two reads that say what the
 * plant's own instability is. NaN where a definition has none at this point.
 *
 * `held` is `√(m g h / M₁₁)` — the bank coordinate's inertia **with the other three lateral coordinates held**, which
 * is the one thing a mass matrix's diagonal honestly is, and it must equal `fixed` to machine precision. `eigLean` is
 * the share of the unstable eigenvector's own norm that sits on `(θ, θ̇)` rather than on the board, so that `eig` is
 * not read as a lean rate when it is not one.
 */
function omegas(y: YawPlant, t: TwistPlant, body: RiderBody | undefined):
Record<Cand, number> & { held: number; eigLean: number; eigBoard: number } {
  const m = y.mass;
  const h = y.height;
  const j = body ? body.inertia : 0;
  const b = body ?? { inertia: 0, feetRoll: false };
  const c = lateralCompliance(y, b);
  const solved = c[1][1] * m * GRAVITY * h;
  const mass = lateralMass(y, b);
  const { a } = continuousPlant(y, t);
  const row = a[3][2];
  const vals = eigenvalues(a);
  let eig = Number.NaN;
  for (const v of vals) if (Math.abs(v.im) < 1e-9 && v.re > 0 && (!Number.isFinite(eig) || v.re > eig)) eig = v.re;
  let eigLean = Number.NaN;
  let eigBoard = Number.NaN;
  if (Number.isFinite(eig)) {
    const v = rightVector(a, eig);
    if (v) {
      const norm = Math.hypot(...v);
      eigLean = Math.hypot(v[2], v[3]) / norm;
      eigBoard = Math.hypot(v[0], v[1]) / norm;
    }
  }
  return {
    line: Math.sqrt(GRAVITY / h),
    fixed: Math.sqrt((m * GRAVITY * h) / (j + m * h * h)),
    solved: solved > 0 ? Math.sqrt(solved) : Number.NaN,
    row: row > 0 ? Math.sqrt(row) : Number.NaN,
    eig,
    held: Math.sqrt((m * GRAVITY * h) / mass[1][1]),
    eigLean,
    eigBoard,
  };
}

/** The right eigenvector of `a` at the real eigenvalue `lambda`, by inverse iteration on `a − λ I`. */
function rightVector(a: number[][], lambda: number): number[] | null {
  const n = a.length;
  const shift = lambda * (1 + 1e-7) + (lambda === 0 ? 1e-9 : 0);
  const mat = a.map((r, i) => r.map((x, jj) => x - (i === jj ? shift : 0)));
  let v = new Array<number>(n).fill(1);
  for (let it = 0; it < 80; it += 1) {
    const sol = solveN(mat.map((r) => r.slice()), v.slice());
    const norm = Math.hypot(...sol);
    if (!Number.isFinite(norm) || norm === 0) return null;
    v = sol.map((x) => x / norm);
  }
  return v;
}

function solveN(a: number[][], b: number[]): number[] {
  const n = b.length;
  for (let c = 0; c < n; c += 1) {
    let p = c;
    for (let r = c + 1; r < n; r += 1) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (p !== c) { const tt = a[p]; a[p] = a[c]; a[c] = tt; const u = b[p]; b[p] = b[c]; b[c] = u; }
    const piv = a[c][c];
    if (!Number.isFinite(piv) || Math.abs(piv) < 1e-300) continue;
    for (let r = c + 1; r < n; r += 1) {
      const f = a[r][c] / piv;
      if (f === 0) continue;
      for (let jj = c; jj < n; jj += 1) a[r][jj] -= f * a[c][jj];
      b[r] -= f * b[c];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r -= 1) {
    let s = b[r];
    for (let c = r + 1; c < n; c += 1) s -= a[r][c] * x[c];
    x[r] = Math.abs(a[r][r]) < 1e-300 ? 0 : s / a[r][r];
  }
  return x;
}

const span = (xs: number[]) => {
  const s = xs.filter((x) => Number.isFinite(x)).slice().sort((p, q) => p - q);
  if (s.length === 0) return 'none';
  const med = s[Math.floor(0.5 * s.length)];
  return `${s[0].toFixed(4)}–${s[s.length - 1].toFixed(4)} (${med.toFixed(4)})`;
};

const rows: Record<string, unknown>[] = [];
const out = (line: string) => { console.log(line); if (OUT) appendFileSync(OUT.replace(/\.jsonl$/, '.txt'), `${line}\n`); };

// ---------------------------------------------------------------------------
// 1. Liveness: is either constant in the shipped cost function at all? (P1)
// ---------------------------------------------------------------------------
out('== 1. liveness of the two constants in the SHIPPED design (P1) ==');
out(`DEFAULT_WEIGHTS keys: ${Object.keys(DEFAULT_WEIGHTS).join(', ')}`);
out(`feetReach present: ${'feetReach' in DEFAULT_WEIGHTS}   captureScale present: ${'captureScale' in DEFAULT_WEIGHTS}`);

/** The design's own numbers flattened, so two designs can be compared entry for entry. */
function flat(d: { k: number[][]; l: number[][]; phi: number[][]; gamma: number[][] }): number[] {
  return [...d.k.flat(), ...d.l.flat(), ...d.phi.flat(), ...d.gamma.flat()];
}

let liveWorst = 0;
let liveCount = 0;
let vacuousWorst = Number.POSITIVE_INFINITY;
for (const speed of SCHEDULE_SPEEDS) {
  for (const depth of SCHEDULE_DEPTHS) {
    for (const rail of SCHEDULE_RAILS) {
      const { y, t } = plantAt(speed, depth, { rail });
      const base = flat(design(y, t, DEFAULT_WEIGHTS));
      // (b) The round's own fix on the shipped weights: `captureOmega` reaches `captureRow` only through
      // `captureScale`, which no default sets, so this must be byte-identical.
      const fixed = flat(design(y, t, { ...DEFAULT_WEIGHTS, captureOmega: 'solved' }));
      for (let i = 0; i < base.length; i += 1) liveWorst = Math.max(liveWorst, Math.abs(base[i] - fixed[i]));
      // (c) Non-vacuity: with the two weights ON the same change must move every point.
      const point = flat(design(y, t, { ...DEFAULT_WEIGHTS, ...costWeights('point') }));
      const plant = flat(design(y, t, { ...DEFAULT_WEIGHTS, ...costWeights('plant') }));
      let worst = 0;
      let scale2 = 0;
      for (let i = 0; i < point.length; i += 1) {
        worst = Math.max(worst, Math.abs(point[i] - plant[i]));
        scale2 = Math.max(scale2, Math.abs(point[i]));
      }
      vacuousWorst = Math.min(vacuousWorst, worst / scale2);
      liveCount += 1;
    }
  }
}
out(`(b) the fix on the SHIPPED weights against the shipped design, ${liveCount} schedule points: worst entry ${liveWorst.toExponential(3)}`);
out(`(c) non-vacuity, the same fix with the two weights ON: smallest relative move over the ${liveCount} points ${vacuousWorst.toExponential(3)}`);

// ---------------------------------------------------------------------------
// 2–3. The candidates and the mode test
// ---------------------------------------------------------------------------
out('');
out('== 2. the five candidate ω₀, rad/s, over the 306 schedule points ==');
const perPlant: Record<string, Record<Cand, number[]>> = {};
const perStance: Record<string, Record<Cand, number[]>> = {};
const extra: Record<string, { held: number[]; eigLean: number[]; eigBoard: number[] }> = {};
for (const plant of ['shipped', 'two'] as const) {
  perPlant[plant] = { line: [], fixed: [], solved: [], row: [], eig: [] };
  extra[plant] = { held: [], eigLean: [], eigBoard: [] };
}
for (const speed of SCHEDULE_SPEEDS) {
  for (const depth of SCHEDULE_DEPTHS) {
    for (const rail of SCHEDULE_RAILS) {
      for (const plant of ['shipped', 'two'] as const) {
        const body = plant === 'two' ? true : undefined;
        const { y, t } = plantAt(speed, depth, { rail, ...(body ? { body } : {}) });
        const b = plant === 'two' ? { inertia: bodyInertiaAt(y.mass, depth, y.height) } : undefined;
        const om = omegas(y, t, b);
        for (const c of CANDS) perPlant[plant][c].push(om[c]);
        extra[plant].held.push(Math.abs(om.held - om.fixed));
        extra[plant].eigLean.push(om.eigLean);
        extra[plant].eigBoard.push(om.eigBoard);
        const key = `${plant}|${depth}`;
        if (!perStance[key]) perStance[key] = { line: [], fixed: [], solved: [], row: [], eig: [] };
        for (const c of CANDS) perStance[key][c].push(om[c]);
        rows.push({ plant, speed, depth, rail, height: y.height, inertia: b?.inertia ?? 0, ...om });
      }
    }
  }
}
for (const plant of ['shipped', 'two'] as const) {
  out(`-- ${plant}`);
  for (const c of CANDS) out(`   ω₀ ${c.padEnd(7)} ${span(perPlant[plant][c])}`);
  out(`   the held reading against the mass matrix's own diagonal, |√(m g h / M₁₁) − fixed|: ${span(extra[plant].held)}`);
  out(`   the unstable eigenvector's share on (θ, θ̇) ${span(extra[plant].eigLean)}  on (φ, φ̇) ${span(extra[plant].eigBoard)}`);
}
out('');
out('ratios of the medians, two/shipped and each against the line:');
const med = (xs: number[]) => { const s = xs.filter(Number.isFinite).slice().sort((p, q) => p - q); return s.length ? s[Math.floor(0.5 * s.length)] : Number.NaN; };
for (const c of CANDS) {
  const s = med(perPlant.shipped[c]);
  const tw = med(perPlant.two[c]);
  out(`   ${c.padEnd(7)} shipped ${s.toFixed(4)}  two ${tw.toFixed(4)}  two/shipped ${(tw / s).toFixed(4)}  shipped/line ${(s / med(perPlant.shipped.line)).toFixed(4)}  two/line ${(tw / med(perPlant.two.line)).toFixed(4)}`);
}
out('');
out('by stance depth (the medians over 102 points each):');
for (const key of Object.keys(perStance).sort()) {
  out(`   ${key.padEnd(12)} ${CANDS.map((c) => `${c} ${med(perStance[key][c]).toFixed(3)}`).join('  ')}`);
}

// ---------------------------------------------------------------------------
// 4. The gains, with the two weights ON, constants point-mass against plant's own
// ---------------------------------------------------------------------------
out('');
out('== 4. the gains with the two weights ON: point-mass constants against the plant\'s own ==');
for (const plant of ['shipped', 'two'] as const) {
  const relK: number[] = [];
  const relRate: number[] = [];
  const relAngle: number[] = [];
  for (const speed of SCHEDULE_SPEEDS) {
    for (const depth of SCHEDULE_DEPTHS) {
      for (const rail of SCHEDULE_RAILS) {
        const body = plant === 'two' ? true : undefined;
        const { y, t } = plantAt(speed, depth, { rail, ...(body ? { body } : {}) });
        const w: DesignWeights = { ...DEFAULT_WEIGHTS, ...costWeights('point') };
        const point = design(y, t, w);
        const own = design(y, t, { ...w, captureOmega: 'solved' });
        let num = 0;
        let den = 0;
        for (let i = 0; i < point.k.length; i += 1) {
          for (let j = 0; j < point.k[i].length; j += 1) {
            num += (point.k[i][j] - own.k[i][j]) ** 2;
            den += point.k[i][j] ** 2;
          }
        }
        relK.push(Math.sqrt(num / den));
        relAngle.push(own.k[0][2] / point.k[0][2]);
        relRate.push(own.k[0][3] / point.k[0][3]);
      }
    }
  }
  out(`-- ${plant}: |ΔK|/|K| ${span(relK)}   the ankle's own gain on the bank ${span(relAngle)}   on its rate ${span(relRate)}`);
}

// ---------------------------------------------------------------------------
// 5. The capture row itself, both ways, and the bank limit (P2)
// ---------------------------------------------------------------------------
out('');
out('== 5. the capture row and the bank limit ==');
for (const depth of SCHEDULE_DEPTHS) {
  const { y } = plantAt(7, depth, {});
  const { y: y2 } = plantAt(7, depth, { body: true });
  const r1 = captureRow(y);
  const r2 = captureRow(y2, 9.81, 10, 'solved');
  const r3 = captureRow(y2, 9.81, 10, 'fixed');
  const r0 = captureRow(y, 9.81, 10, 'solved');
  const bankLimit = DEFAULT_WEIGHTS.stateScale[2] * (STANCE_TABLE[0].height / y.height);
  out(`   depth ${depth}  h ${y.height.toFixed(3)}  J ${(y2.body?.inertia ?? 0).toFixed(3)}  share ${((y2.body?.inertia ?? 0) / (y.mass * y.height ** 2)).toFixed(4)}`);
  out(`      captureRow θ coefficient ${r1[2].toFixed(4)} m/rad, the same in all four; θ̇ coefficient, m per rad/s:`
    + ` line ${r1[3].toFixed(4)}  fixed(two-body) ${r3[3].toFixed(4)}  solved(two-body) ${r2[3].toFixed(4)}  solved(shipped) ${r0[3].toFixed(4)}`);
  out(`      the bank limit feetReach/L ${((COST_FEET_REACH / y.height) * (180 / Math.PI)).toFixed(2)}°, the shipped ranking ${(bankLimit * (180 / Math.PI)).toFixed(2)}°`
    + `, and it carries no J: L is the same for a point mass and for a body (P2)`);
}

if (OUT) for (const r of rows) appendFileSync(OUT, `${JSON.stringify(r)}\n`);
out('');
out('done');
