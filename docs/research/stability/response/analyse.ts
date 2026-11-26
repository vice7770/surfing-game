/**
 * **3.6d's analysis** (README §0.4–§0.6), shared by the game's reader (`response.ts`) and the known plant (`known.ts`):
 * the twins' controls, the stage table, the model's responses, the reproduction, the swaps and the 4/8-tick prediction.
 */
import { design, plantAt, type Design, type DesignWeights } from '../../../../src/physics/predictiveBalance';
import {
  ARGS_PRE, H, OI, OUT, SENSE_ROWS, SWING, W_OPEN, baseId, cdiv, closeOn, dft, fitDamped, group, maxRel, median, mix, modelClosed, modelOpen,
  peakOf, perturbation, power, ring, stack, swapActuators, swapMechanics, swapSenses, waveErr, type CtrlOpts, type KBaseRow, type KickRow, type Resp, type TwinSet,
} from './responseLib';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const ROLL = [0, 1, 5, 6];
const YAW = [2, 3, 4, OI.Om];
/** The closings (README §0.6), in the order of the rule: stages, then columns, then blocks and rows. */
export const CLOSINGS: { name: string; build: (Gg: Float64Array[][], Gm: Float64Array[][]) => Float64Array[][] }[] = [
  { name: 'S0 measured', build: (g) => g },
  { name: 'S1 model', build: (_g, m) => m },
  { name: '(i) actuators model', build: (g) => swapActuators(g) },
  { name: '(ii) mechanics model', build: (g, m) => swapMechanics(g, m) },
  { name: '(iii) senses of the board\'s own rates', build: (g) => swapSenses(g) },
  { name: 'ankle column model', build: (g, m) => mix(g, m, (_o, ch) => ch === 0) },
  { name: 'twist column model', build: (g, m) => mix(g, m, (_o, ch) => ch === 1) },
  { name: 'ankle -> roll model', build: (g, m) => mix(g, m, (o, ch) => ch === 0 && ROLL.includes(o)) },
  { name: 'ankle -> yaw model', build: (g, m) => mix(g, m, (o, ch) => ch === 0 && YAW.includes(o)) },
  { name: 'twist -> roll model', build: (g, m) => mix(g, m, (o, ch) => ch === 1 && ROLL.includes(o)) },
  { name: 'twist -> yaw model', build: (g, m) => mix(g, m, (o, ch) => ch === 1 && YAW.includes(o)) },
  { name: 'roll rows model', build: (g, m) => mix(g, m, (o) => ROLL.includes(o)) },
  { name: 'yaw rows model', build: (g, m) => mix(g, m, (o) => YAW.includes(o)) },
];
export const PREDICTIONS: { name: string; opts: CtrlOpts }[] = [
  { name: 'designDelay 4', opts: { designDelay: 4 } }, { name: 'designDelay 8', opts: { designDelay: 8 } },
  { name: 'senseShift -2', opts: { senseShift: -2 } }, { name: 'senseShift +2', opts: { senseShift: 2 } },
];

/** The stage table's entries (README §0.6): name, channel, the measured and the model's transfer at f. */
type Q = (v: Float64Array) => number;
const st = (o: number): Q => (v) => v[o];
const STATES: { name: string; q: Q }[] = [
  { name: 'phi (y0 - y5)', q: (v) => v[0] - v[5] }, { name: 'theta (y0)', q: st(0) }, { name: 'r (y2 - y4)', q: (v) => v[2] - v[4] },
  { name: 'beta', q: st(OI.beta) }, { name: 'theta_t (y3)', q: st(3) }, { name: 'omega_u (y2)', q: st(2) },
];

export interface Result {
  controls: Record<string, unknown>;
  stage: Map<string, Map<string, { gain: number[]; phase: number[] }>>;
  closings: Map<string, Map<string, { fits: Read[]; pow: number[] }>>;
  repro: Map<string, { twin: Read[]; pred: Read[]; predFrozen: Read[]; powT: number[]; powP: number[]; powF: number[]; waveOm: number[]; waveSense: number[]; pass: boolean[] }>;
  model: Map<string, { openErr: number[]; closedErr: number[]; blendGap: number[]; s1VsClosed: number[]; closedTwinVsModel: number[] }>;
  known?: Record<string, number>;
}
/** Amendment 2's read-out: Prony's dominant mode in 1.5–5 Hz (f, ζ, q₂), with the damped sinusoid's f and ζ beside it. */
export interface Read { f: number; zeta: number; q2: number; share: number; fitF: number; fitZeta: number }
export function readout(om: ArrayLike<number>): Read {
  const r = ring(om);
  const fit = fitDamped(om);
  return r ? { f: r.f, zeta: r.zeta, q2: Math.exp((-2 * r.sigma) / r.f), share: r.share, fitF: fit.f, fitZeta: fit.zeta }
    : { f: Number.NaN, zeta: Number.NaN, q2: Number.NaN, share: 0, fitF: fit.f, fitZeta: fit.zeta };
}
const addPow = (acc: number[], p: number[]) => { if (!acc.length) for (const x of p) acc.push(x); else for (let i = 0; i < p.length; i += 1) acc[i] += p[i]; };

export function analyse(kicks: KickRow[], kbases: KBaseRow[], weights: DesignWeights, opts: { closings?: boolean; log?: (s: string) => void } = {}): Result {
  const log = opts.log ?? (() => {});
  const g = group(kicks, kbases);
  const res: Result = { controls: {}, stage: new Map(), closings: new Map(), repro: new Map(), model: new Map() };
  // ---- Controls.
  const scripts = [...new Set(g.sets.map((s) => s.script))].sort();
  const ctl: Record<string, unknown> = {};
  for (const sc of scripts) {
    const zs = [...g.zero.entries()].filter(([b]) => b.endsWith(`:${sc}`));
    const zOk = zs.filter(([, z]) => z.open && z.closed && z.open.maxDiff === 0 && z.closed.maxDiff === 0 && z.open.frameMismatch === 0 && z.closed.frameMismatch === 0).length;
    const ss = g.sets.filter((s) => s.script === sc);
    const by = (mode: string) => ss.filter((s) => s.mode === mode);
    const count = (xs: TwinSet[], f: (s: TwinSet) => boolean) => xs.filter(f).length;
    const linMax = (xs: TwinSet[], k: 'lin60' | 'lin90', pass: (s: TwinSet) => boolean) => {
      const p = xs.filter(pass);
      return { sym: Math.max(0, ...p.map((s) => s.checks[k].sym)), two: Math.max(0, ...p.map((s) => s.checks[k].two)) };
    };
    const arg: Record<string, number> = {};
    for (const s of ss.filter((x) => x.pass90 || x.pass60)) for (const [k, v] of Object.entries(s.checks.argMax)) arg[k] = Math.max(arg[k] ?? 0, v);
    ctl[sc] = {
      basesStanding: zs.length, zeroTwinsBitForBit: zOk,
      ...Object.fromEntries(['open', 'closed'].map((mode) => [mode, {
        sets: by(mode).length, complete: count(by(mode), (s) => s.checks.complete), pre: count(by(mode), (s) => s.checks.pre), held: count(by(mode), (s) => s.checks.held),
        noClamp: count(by(mode), (s) => s.checks.mask), stand60: count(by(mode), (s) => s.checks.stand60), stand90: count(by(mode), (s) => s.checks.stand90),
        // Linearity among the sets that pass everything else and stand.
        lin60Of: count(by(mode), (s) => s.checks.complete && s.checks.pre && s.checks.held && s.checks.mask && s.checks.stand60),
        lin60Pass: count(by(mode), (s) => s.pass60), lin90Of: count(by(mode), (s) => s.checks.complete && s.checks.pre && s.checks.held && s.checks.mask && s.checks.stand90),
        lin90Pass: count(by(mode), (s) => s.pass90),
        linWorstPassing60: linMax(by(mode), 'lin60', (s) => s.pass60), linWorstPassing90: linMax(by(mode), 'lin90', (s) => s.pass90),
        linMedianOf60: { sym: median(by(mode).filter((s) => s.checks.complete && s.checks.mask && s.checks.stand60).map((s) => s.checks.lin60.sym)), two: median(by(mode).filter((s) => s.checks.complete && s.checks.mask && s.checks.stand60).map((s) => s.checks.lin60.two)) },
        maskReasons: Object.fromEntries([1, 2, 4, 8, 16, 32, 64].map((b) => [b, count(by(mode), (s) => s.checks.complete && Object.values(s.rows).some((r) => (((r!.maskA ?? 0) | (r!.maskT ?? 0)) & b) !== 0))])),
      }])),
      argMaxPerUnitKick: arg,
    };
  }
  res.controls = ctl;
  // ---- Per base and kick time.
  const keys = new Map<string, { kb: KBaseRow; open: Partial<Record<'ankle' | 'twist', TwinSet>>; closed: Partial<Record<'ankle' | 'twist', TwinSet>> }>();
  for (const s of g.sets) {
    const k = `${s.base}|${s.at}`;
    const kb = g.kbase.get(k);
    if (!kb || !kb.design) continue;
    let e = keys.get(k);
    if (!e) { e = { kb, open: {}, closed: {} }; keys.set(k, e); }
    e[s.mode][s.channel] = s;
  }
  let done = 0;
  for (const [k, e] of keys) {
    const sc = e.kb.script;
    const d = e.kb.design!;
    const fS = SWING[sc] ?? 2.67;
    const Gm = stack(modelOpen(d.phi, d.gamma, d.c, 0), modelOpen(d.phi, d.gamma, d.c, 1));
    const argAt = (m: number) => {
      const i = Math.max(0, Math.min(e.kb.args.speed.length - 1, ARGS_PRE + m));
      return { speed: e.kb.args.speed[i] as number, depth: e.kb.args.depth[i] as number, rail: e.kb.args.rail[i] as number };
    };
    const frozen = () => argAt(0);
    // The model's own entries.
    const mm = res.model.get(sc) ?? { openErr: [], closedErr: [], blendGap: [], s1VsClosed: [], closedTwinVsModel: [] };
    res.model.set(sc, mm);
    const a0 = frozen();
    const exact = design(plantAt(a0.speed, a0.depth, { rail: a0.rail, body: weights.riderBody === 'two' ? true : undefined, plantFloor: weights.plantFloor, stanceDeep: weights.stanceDeep ?? true }).y, plantAt(a0.speed, a0.depth, { rail: a0.rail, body: weights.riderBody === 'two' ? true : undefined, plantFloor: weights.plantFloor, stanceDeep: weights.stanceDeep ?? true }).t, weights);
    const Ge = stack(modelOpen(exact.phi, exact.gamma, exact.c, 0), modelOpen(exact.phi, exact.gamma, exact.c, 1));
    mm.blendGap.push(Math.max(maxRel(Ge.map((c) => c[0]), Gm.map((c) => c[0]), SENSE_ROWS), maxRel(Ge.map((c) => c[1]), Gm.map((c) => c[1]), SENSE_ROWS)));
    // ---- The stage table, on the open sets passing over 1.0 s.
    for (const ch of ['ankle', 'twist'] as const) {
      const s = e.open[ch];
      if (!s || !s.pass60) continue;
      const c = ch === 'ankle' ? 0 : 1;
      const gg = s.g;
      const gm = Gm.map((col) => col[c]);
      mm.openErr.push(maxRel(gg, gm, SENSE_ROWS));
      const tab = res.stage.get(sc) ?? new Map();
      res.stage.set(sc, tab);
      const put = (name: string, a: { re: number; im: number }, b: { re: number; im: number }) => {
        const r = cdiv(a, b);
        const t = tab.get(name) ?? { gain: [], phase: [] };
        t.gain.push(Math.hypot(r.re, r.im));
        t.phase.push((Math.atan2(r.im, r.re) * 180) / Math.PI);
        tab.set(name, t);
      };
      const act = ch === 'ankle' ? OI.delta : OI.tauA;
      put(`(i) ${ch} command -> ${ch === 'ankle' ? 'delta' : 'tau_a'}`, dft(gg, act, fS), dft(gm, act, fS));
      const hip = dft(gg, OI.hipT, fS);
      const t = tab.get(`(i) ${ch} command -> hip torque (N m per unit; no model state)`) ?? { gain: [], phase: [] };
      t.gain.push(Math.hypot(hip.re, hip.im)); t.phase.push(0);
      tab.set(`(i) ${ch} command -> hip torque (N m per unit; no model state)`, t);
      for (const q of STATES) put(`(ii) ${ch === 'ankle' ? 'delta' : 'tau_a'} -> ${q.name}`, cdiv(dft(gg, q.q, fS), dft(gg, act, fS)), cdiv(dft(gm, q.q, fS), dft(gm, act, fS)));
      put(`(iii) ${ch}: sensed r (y2 - y4) / -Omega`, cdiv(dft(gg, (v) => v[2] - v[4], fS), dft(gg, (v) => -v[OI.Om], fS)), { re: 1, im: 0 });
      put(`(iii) ${ch}: sensed phi-dot (y1 - y6) / p`, cdiv(dft(gg, (v) => v[1] - v[6], fS), dft(gg, (v) => v[OI.p], fS)), { re: 1, im: 0 });
      for (const o of SENSE_ROWS) put(`all: ${ch} command -> ${OUT[o]}`, dft(gg, o, fS), dft(gm, o, fS));
      put(`all: ${ch} command -> Omega`, dft(gg, OI.Om, fS), dft(gm, OI.Om, fS));
    }
    // ---- The model's closed loop against the closed twins (diagnostic), and S1 against closedLoop (a check).
    const CLm = [modelClosed(d, 0), modelClosed(d, 1)];
    for (const ch of ['ankle', 'twist'] as const) {
      const s = e.closed[ch];
      if (s && s.pass90) mm.closedTwinVsModel.push(maxRel(s.g, CLm[ch === 'ankle' ? 0 : 1], SENSE_ROWS));
    }
    if (opts.closings === false) continue;
    const oa = e.open.ankle, ot = e.open.twist;
    if (!oa || !ot || !oa.pass90 || !ot.pass90) continue;
    const Gg = stack(oa.g, ot.g);
    // ---- The closings, the design frozen at the kick tick.
    const cl = res.closings.get(sc) ?? new Map();
    res.closings.set(sc, cl);
    for (const c of CLOSINGS) {
      const G = c.build(Gg, Gm);
      for (const ch of [0, 1] as const) {
        const { y } = closeOn(G, ch, perturbation(weights, frozen));
        const om = y.map((v) => v[OI.Om]);
        const ent = cl.get(c.name) ?? { fits: [], pow: [] };
        ent.fits.push(readout(om));
        addPow(ent.pow, power(om));
        cl.set(c.name, ent);
        if (c.name === 'S1 model') mm.s1VsClosed.push(maxRel(y, CLm[ch], SENSE_ROWS));
      }
    }
    for (const p of PREDICTIONS) {
      for (const ch of [0, 1] as const) {
        const { y } = closeOn(Gg, ch, perturbation(weights, frozen, p.opts));
        const om = y.map((v) => v[OI.Om]);
        const ent = cl.get(`predict ${p.name}`) ?? { fits: [], pow: [] };
        ent.fits.push(readout(om));
        addPow(ent.pow, power(om));
        cl.set(`predict ${p.name}`, ent);
      }
    }
    // ---- The reproduction of the closed twins (A's own speed, depth and rail per tick; and frozen).
    const rp = res.repro.get(sc) ?? { twin: [], pred: [], predFrozen: [], powT: [], powP: [], powF: [], waveOm: [], waveSense: [], pass: [] };
    res.repro.set(sc, rp);
    for (const ch of ['ankle', 'twist'] as const) {
      const s = e.closed[ch];
      if (!s || !s.pass90) continue;
      const c = ch === 'ankle' ? 0 : 1;
      const pr = closeOn(Gg, c, perturbation(weights, argAt)).y;
      const pf = closeOn(Gg, c, perturbation(weights, frozen)).y;
      const twOm = s.g.map((v) => v[OI.Om]);
      const ft = readout(twOm), fp = readout(pr.map((v) => v[OI.Om])), ff = readout(pf.map((v) => v[OI.Om]));
      rp.twin.push(ft); rp.pred.push(fp); rp.predFrozen.push(ff);
      addPow(rp.powT, power(twOm)); addPow(rp.powP, power(pr.map((v) => v[OI.Om]))); addPow(rp.powF, power(pf.map((v) => v[OI.Om])));
      rp.waveOm.push(waveErr(pr, s.g, [OI.Om]));
      rp.waveSense.push(waveErr(pr, s.g, SENSE_ROWS));
      rp.pass.push(Math.abs(fp.f - ft.f) <= 0.15 && Math.abs(fp.q2 - ft.q2) <= 0.25 * Math.abs(ft.q2));
    }
    done += 1;
    if (done % 5 === 0) log(`  ${done} of ${keys.size} base x kick times closed`);
  }
  return res;
}

const f2 = (x: number, n = 2) => (Number.isFinite(x) ? x.toFixed(n) : '—');
const q = (xs: number[], p: number) => { const s = xs.filter(Number.isFinite).sort((a, b) => a - b); if (!s.length) return Number.NaN; const i = (s.length - 1) * p; const lo = Math.floor(i); return s[lo] + (s[Math.min(s.length - 1, lo + 1)] - s[lo]) * (i - lo); };
const LABEL: Record<string, string> = { 'compress:straight': 'Compress', 'none:straight': 'tall', 'crouch:straight': 'tuck' };

export function report(r: Result, q1?: Record<string, Record<string, number>>): string {
  const L: string[] = [];
  L.push('## Controls', '', '```', JSON.stringify(r.controls, null, 1), '```', '');
  for (const [sc, tab] of r.stage) {
    L.push(`## Stage table, ${LABEL[sc] ?? sc} (open twins, 60 ticks, at ${SWING[sc]} Hz; measured / model)`, '');
    L.push('| entry | sets | gain ratio, median [25–75 %] | phase difference, deg, median [25–75 %] | delay Δt, s | same side of 1 / same sign of phase | departs (README §0.6) |');
    L.push('| --- | --- | --- | --- | --- | --- | --- |');
    for (const [name, t] of tab) {
      const gm = median(t.gain), pm = median(t.phase);
      const up = t.gain.filter((x) => x > 1).length, pos = t.phase.filter((x) => x > 0).length, n = t.gain.length;
      const sideG = Math.max(up, n - up) / n, sideP = Math.max(pos, n - pos) / n;
      const dt = -(pm * Math.PI / 180) / (2 * Math.PI * (SWING[sc] ?? 2.67));
      const hip = name.includes('hip torque');
      const departs = hip ? '' : ((gm < 0.75 || gm > 1.33) && sideG >= 0.75) || (Math.abs(pm) > 20 && sideP >= 0.75) ? '**departs**' : 'no';
      L.push(`| ${name} | ${n} | ${hip ? f2(gm, 3) + ' (abs)' : f2(gm)} [${f2(q(t.gain, 0.25))}, ${f2(q(t.gain, 0.75))}] | ${hip ? '' : `${f2(pm, 1)} [${f2(q(t.phase, 0.25), 1)}, ${f2(q(t.phase, 0.75), 1)}]`} | ${hip ? '' : f2(dt, 3)} | ${f2(sideG)} / ${f2(sideP)} | ${departs} |`);
    }
    L.push('');
  }
  for (const [sc, mm] of r.model) {
    L.push(`## The model against the measured, ${LABEL[sc] ?? sc}`, '');
    L.push(`- open loop, max |measured − model| / max |model| on the senses over 1.5 s: median ${f2(median(mm.openErr), 3)} (${mm.openErr.length} sets)`);
    L.push(`- the closed twins against the model's closed loop, the same: median ${f2(median(mm.closedTwinVsModel), 3)} (${mm.closedTwinVsModel.length} sets)`);
    L.push(`- the blend against plantAt at the exact speed, depth and rail (open loop, senses): median ${f2(median(mm.blendGap), 4)}, largest ${f2(Math.max(...mm.blendGap), 4)} (${mm.blendGap.length})`);
    L.push(`- check: S1 (the FIR loop on the model's response) against closedLoop: largest ${mm.s1VsClosed.length ? Math.max(...mm.s1VsClosed).toExponential(2) : '—'}`, '');
  }
  for (const [sc, cl] of r.closings) {
    L.push(`## Closings, ${LABEL[sc] ?? sc} (the design frozen at the kick tick; Ω's response to a unit kick on either channel, 1.5 s)`, '');
    L.push('| closing | responses (with a mode in band) | pooled peak, Hz | Prony f, median | ζ, median [25–75 %] | q₂, median | the fit\'s f / ζ, median (no rule) |');
    L.push('| --- | --- | --- | --- | --- | --- | --- |');
    for (const [name, e] of cl) {
      const z = e.fits.map((x) => x.zeta);
      L.push(`| ${name} | ${e.fits.length} (${e.fits.filter((x) => Number.isFinite(x.f)).length}) | ${f2(peakOf(e.pow))} | ${f2(median(e.fits.map((x) => x.f)))} | ${f2(median(z), 3)} [${f2(q(z, 0.25), 3)}, ${f2(q(z, 0.75), 3)}] | ${f2(median(e.fits.map((x) => x.q2)), 3)} | ${f2(median(e.fits.map((x) => x.fitF)))} / ${f2(median(e.fits.map((x) => x.fitZeta)), 3)} |`);
    }
    L.push('');
    const s0 = cl.get('S0 measured'), s1 = cl.get('S1 model');
    if (s0 && s1) {
      const z0 = median(s0.fits.map((x) => x.zeta)), z1 = median(s1.fits.map((x) => x.zeta));
      L.push(`- the measured response makes the ring (S0 ζ < 0.15, its peak within ±0.3 Hz of ${SWING[sc]}, S1 ζ ≥ 0.25): **${z0 < 0.15 && Math.abs(peakOf(s0.pow) - (SWING[sc] ?? 2.67)) <= 0.3 && z1 >= 0.25 ? 'yes' : 'no'}** (S0 ${f2(z0, 3)}, S1 ${f2(z1, 3)})`);
      for (const [name, e] of cl) {
        if (name.startsWith('S') || name.startsWith('predict')) continue;
        const z = median(e.fits.map((x) => x.zeta));
        const share = (z - z0) / (z1 - z0);
        L.push(`  - ${name}: ζ ${f2(z, 3)}, share of the way from S0 to S1 ${f2(share, 2)}${share >= 0.5 ? ' — **carries the ring**' : ''}`);
      }
      L.push('');
    }
    if (q1?.[sc]) {
      L.push(`Predictions against question 1 (${LABEL[sc] ?? sc}): ` + PREDICTIONS.map((p) => { const e = cl.get(`predict ${p.name}`); const meas = q1[sc][p.name]; return `${p.name} predicted ${e ? f2(peakOf(e.pow)) : '—'} Hz, measured ${f2(meas)}${e && Number.isFinite(meas) ? (Math.abs(peakOf(e.pow) - meas) <= 0.25 ? ' (within ±0.25)' : ' (**outside ±0.25**)') : ''}`; }).join('; '), '');
    }
  }
  for (const [sc, rp] of r.repro) {
    L.push(`## Reproduction of the closed twins, ${LABEL[sc] ?? sc} (Ω, 1.5 s)`, '');
    const pT = peakOf(rp.powT), pP = peakOf(rp.powP), pF = peakOf(rp.powF);
    const qT = median(rp.twin.map((x) => x.q2)), qP = median(rp.pred.map((x) => x.q2)), qF = median(rp.predFrozen.map((x) => x.q2));
    const passN = rp.pass.filter(Boolean).length;
    L.push('| | sets | pooled peak, Hz | Prony f, median | ζ, median | q₂, median | waveform error Ω / senses, median |');
    L.push('| --- | --- | --- | --- | --- | --- | --- |');
    L.push(`| closed twins | ${rp.twin.length} | ${f2(pT)} | ${f2(median(rp.twin.map((x) => x.f)))} | ${f2(median(rp.twin.map((x) => x.zeta)), 3)} | ${f2(qT, 3)} | |`);
    L.push(`| reproduction (A's args per tick) | ${rp.pred.length} | ${f2(pP)} | ${f2(median(rp.pred.map((x) => x.f)))} | ${f2(median(rp.pred.map((x) => x.zeta)), 3)} | ${f2(qP, 3)} | ${f2(median(rp.waveOm), 3)} / ${f2(median(rp.waveSense), 3)} |`);
    L.push(`| reproduction (frozen) | ${rp.predFrozen.length} | ${f2(pF)} | ${f2(median(rp.predFrozen.map((x) => x.f)))} | ${f2(median(rp.predFrozen.map((x) => x.zeta)), 3)} | ${f2(qF, 3)} | |`);
    L.push('', `- reproduces (pooled peak within ±0.15 Hz, median q₂ within ±25 %, ≥ 75 % of sets pass both): **${((Number.isNaN(pP) && Number.isNaN(pT)) || Math.abs(pP - pT) <= 0.15) && Math.abs(qP - qT) <= 0.25 * Math.abs(qT) && passN >= 0.75 * rp.pass.length ? 'yes' : 'no'}** (${passN} of ${rp.pass.length} sets pass)`, '');
  }
  if (r.known) L.push('## Known plant', '', '```', JSON.stringify(r.known, null, 1), '```', '');
  return L.join('\n');
}

export { baseId, H, type KBaseRow, type KickRow, type Resp };
export type { Design, Any };
