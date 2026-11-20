// Why the side force per sideslip changes sign past about 15° of rail (ruling 29s): the roll-plant lab's rail sweep
// again, with EVERY perturbation's force split by contributor, and the board's wetted geometry at each rail (draft,
// wetted bottom area, how much of each rail's side face is under water, each fin's immersed span and attack).
// Reads src/ and ../roll-plant/plant.ts; changes nothing. Not part of the suite.
//
//   PART=flip,geom,finlaw   RAILS=0,10,15,20,30,40   SPEEDS=5,7,9   FREEZE=on (hold pitch and height at the trim too)
//
// One JSON line per row ($OUT).
import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { Vector3 } from 'three';
import { DEG, Flat, G, GROUPS, Lab, PARTS, STEP, euler, r, sum, type Hold, type Ledger } from '../roll-plant/plant';
import { wettedShare } from '../../../../src/physics/hullForces';
import { THRUSTER, createFinForce, finForce, liftSlope } from '../../../../src/physics/finForces';

const PART = (process.env.PART ?? 'flip,geom').split(',');
const SPEEDS = (process.env.SPEEDS ?? '5,7,9').split(',').map(Number);
const RAILS = (process.env.RAILS ?? '0,10,15,20,30,40').split(',').map(Number);
const FREEZE = process.env.FREEZE === 'on';
const SETTLE = 2.5;
const DECK = { x: 0, y: 0.07, z: -0.30 };
const water = new Flat();

function emit(line: unknown): void {
  const out = process.env.OUT;
  if (out) appendFileSync(out, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
}

function settled(v: number): Lab {
  const lab = new Lab(water, 'point');
  lab.place(v);
  lab.hold = { speed: v, roll: 0, yawRate: 0, slip: 0 };
  for (let i = 0; i < Math.round(SETTLE / STEP); i += 1) lab.frame();
  return lab;
}

function meanBook(books: Ledger[]): { force: Record<string, Vector3>; moment: Record<string, Vector3>; ramp: { force: Vector3; moment: Vector3 } } {
  const force: Record<string, Vector3> = {};
  const moment: Record<string, Vector3> = {};
  const ramp = { force: new Vector3(), moment: new Vector3() };
  for (const b of books) { ramp.force.addScaledVector(b.ramp.force, 1 / books.length); ramp.moment.addScaledVector(b.ramp.moment, 1 / books.length); }
  for (const p of PARTS) {
    force[p] = new Vector3(); moment[p] = new Vector3();
    for (const b of books) { force[p].add(b.force[p]); moment[p].add(b.moment[p]); }
    force[p].multiplyScalar(1 / books.length); moment[p].multiplyScalar(1 / books.length);
  }
  return { force, moment, ramp };
}

/** The groups split out here: the ledger's own parts, plus the ramp. */
const NAMES = ['all', 'pressure', 'buoyancy', 'friction', 'waterInertia', 'radiation', 'fins', 'rails', 'railL', 'railR', 'finL', 'finR', 'finC', 'pressL', 'pressR'] as const;

/** Yaw moment N (about world up, + toward the board's left), side force Y (along its level left), roll moment K about the deck. */
function split(lab: Lab, book: { force: Record<string, Vector3>; moment: Record<string, Vector3>; ramp?: { force: Vector3; moment: Vector3 } }): Record<string, { N: number; Y: number; K: number; V: number }> {
  const { fwd, left } = lab.axes();
  const levelLeft = left.clone().setY(0).normalize();
  const deck = lab.board.toWorld(DECK, new Vector3());
  const arm = lab.board.centerOfMass.clone().sub(deck);
  const groups: Record<string, readonly string[]> = {
    ...GROUPS, railL: ['railL'], railR: ['railR'], finL: ['finL'], finR: ['finR'], finC: ['finC'], pressL: ['pressL'], pressR: ['pressR'],
  };
  const out: Record<string, { N: number; Y: number; K: number; V: number }> = {};
  for (const name of NAMES) {
    const F = sum(book.force as never, groups[name] as never);
    const M = sum(book.moment as never, groups[name] as never);
    out[name] = { N: M.y, Y: F.dot(levelLeft), K: M.clone().add(arm.clone().cross(F)).dot(fwd), V: F.y };
  }
  if (book.ramp) {
    const { force: F, moment: M } = book.ramp;
    out.ramp = { N: M.y, Y: F.dot(levelLeft), K: M.clone().add(arm.clone().cross(F)).dot(fwd), V: F.y };
  }
  return out;
}

/**
 * How deep the board sits, right now, on flat water (surface y = 0):
 * - `draft`: the lowest bottom patch's depth;
 * - `wetBottom`: the wetted bottom area, each patch's planform area times its wetting share (`wettedShare`);
 * - per rail side, the side face's wetted area and its mean wetted share (the same share the solver uses,
 *   `0.5 + depth/height` over the face's own height), and how deep the deepest rail station's face centre sits;
 * - per fin, the immersed share of its span and the attack angle it sees.
 * Read-only: it samples the board's own foils and patches through `toWorld`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function geometry(lab: Lab): Record<string, number> {
  const b = lab.board as unknown as { foils: { kind: string; local: { x: number; y: number; z: number }; normal: { x: number; y: number; z: number }; area: number; height: number; fin?: typeof THRUSTER[number] }[] };
  const p = new Vector3();
  let draft = -Infinity;
  let wetBottom = 0;
  let planform = 0;
  for (const patch of lab.board.shape.patches) {
    lab.board.toWorld(patch.position, p);
    draft = Math.max(draft, -p.y);
    wetBottom += patch.area * wettedShare(0 - p.y);
    planform += patch.area;
  }
  // The rails. Side +1 is the board's left, −1 its right. The low rail is the right one at a positive roll.
  const rail: Record<number, { area: number; wet: number; total: number; deepest: number; edge: number }> = {
    1: { area: 0, wet: 0, total: 0, deepest: -Infinity, edge: -Infinity },
    [-1]: { area: 0, wet: 0, total: 0, deepest: -Infinity, edge: -Infinity },
  };
  const fins: { immersed: number; attack: number }[] = [];
  const fin = createFinForce();
  const q = lab.board.orientation;
  const inverse = q.clone().invert();
  const v = lab.board.velocity;
  const w = lab.board.angularVelocity;
  const c = lab.board.centerOfMass;
  const up = new Vector3(0, 1, 0).applyQuaternion(lab.board.orientation);
  for (const foil of b.foils) {
    // `foil.local` is relative to the composite centre of mass (as `BoardBody.buildFoils` makes it and `applyFoils`
    // uses it), NOT a shape coordinate: the world point is it rotated, plus the centre of mass.
    p.set(foil.local.x, foil.local.y, foil.local.z).applyQuaternion(lab.board.orientation).add(lab.board.centerOfMass);
    if (foil.kind === 'rail') {
      const side = foil.normal.x > 0 ? 1 : -1;
      const share = Math.min(1, Math.max(0, 0.5 + (0 - p.y) / foil.height));
      rail[side].area += foil.area * share;
      rail[side].total += foil.area;
      rail[side].wet += share;
      rail[side].deepest = Math.max(rail[side].deepest, -p.y);
      // The deck edge at this station: the face's top, half its height above its centre along the board's own up.
      rail[side].edge = Math.max(rail[side].edge, -(p.y + (up.y * foil.height) / 2));
      continue;
    }
    if (!foil.fin) continue;
    const down = up.clone().multiplyScalar(-1);
    const root = p.clone();
    const tip = root.clone().addScaledVector(down, foil.height);
    const low = Math.min(root.y, tip.y);
    const span = Math.abs(root.y - tip.y);
    const immersed = span > 1e-9 ? Math.min(1, Math.max(0, (0 - low) / span)) : 0 > low ? 1 : 0;
    const sh = immersed / 2;
    const at = tip.y < root.y ? tip.clone().lerp(root, sh) : root.clone().lerp(tip, sh);
    const rx = at.x - c.x; const ry = at.y - c.y; const rz = at.z - c.z;
    const rel = new Vector3(v.x + w.y * rz - w.z * ry, v.y + w.z * rx - w.x * rz, v.z + w.x * ry - w.y * rx).applyQuaternion(inverse);
    const out = finForce(foil.fin, rel, immersed, fin);
    fins.push({ immersed, attack: out.attack * DEG });
  }
  const count = b.foils.filter((f) => f.kind === 'rail').length / 2;
  return {
    draft: r(draft, 4)!, wetBottom: r(wetBottom, 4)!, wetBottomShare: r(wetBottom / planform, 3)!,
    railLowArea: r(rail[-1].area, 5)!, railHighArea: r(rail[1].area, 5)!,
    railLowShare: r(rail[-1].wet / count, 3)!, railHighShare: r(rail[1].wet / count, 3)!,
    railTotalArea: r(rail[-1].total, 5)!,
    railLowDeepest: r(rail[-1].deepest, 4)!, railHighDeepest: r(rail[1].deepest, 4)!,
    railLowEdge: r(rail[-1].edge, 4)!, railHighEdge: r(rail[1].edge, 4)!,
    finImmersed: r(fins.reduce((a, f) => a + f.immersed, 0) / Math.max(1, fins.length), 3)!,
    finAttack: r(fins.reduce((a, f) => a + f.attack, 0) / Math.max(1, fins.length), 3)!,
  };
}

/**
 * The rail sweep, exactly as the roll-plant lab's `rail` part does it (same corrected harness: the level sideslip, the
 * roll-rate hold's vertical term a set), but every perturbation's forces are split by contributor, and the board's
 * wetted geometry is read at the base. With FREEZE=on the pitch and the centre of mass's height are held at the trim
 * too, which separates the force law's own answer to a slide from the board's re-trim in pitch and heave.
 */
it('the rail sweep: the derivatives split by contributor, and how deep the board sits', () => {
  if (!PART.includes('flip')) return;
  const TRIM = Number(process.env.TRIM ?? 8);
  const HOLD = Number(process.env.HOLD ?? 0.6);
  const TAIL = Number(process.env.TAIL ?? 0.25);
  const BACK = Number(process.env.BACK ?? 0.8);
  for (const v of SPEEDS) for (const rail of RAILS) {
    const lab = settled(v);
    lab.hold = { speed: v, roll: rail / DEG };
    const reads: ReturnType<Lab['read']>[] = [];
    const levels: number[] = [];
    const heights: number[] = [];
    const books: Ledger[] = [];
    const n = Math.round(TRIM / STEP);
    for (let i = 0; i < n; i += 1) {
      const b = lab.frame();
      if (i >= n - Math.round(2 / STEP)) {
        books.push(b); reads.push(lab.read()); heights.push(lab.board.centerOfMass.y);
        const d = euler(lab.board.orientation).heading - Math.atan2(lab.board.velocity.x, lab.board.velocity.z);
        levels.push(d - 2 * Math.PI * Math.round(d / (2 * Math.PI)));
      }
    }
    const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;
    const spread = (xs: number[]) => Math.max(...xs) - Math.min(...xs);
    const r0 = mean(reads.map((x) => x.yawRate));
    const b0 = mean(levels);
    const pitch0 = mean(reads.map((x) => x.pitch)) / DEG;
    const y0 = mean(heights);
    const trim = {
      roll: rail, yawRate: r(r0, 4), slipDeg: r(b0 * DEG, 3), pitch: r(pitch0 * DEG, 2), draft: r(mean(reads.map((x) => x.draft)), 4),
      heightM: r(y0, 4), yawSpread: r(spread(reads.map((x) => x.yawRate)), 4), pitchSpread: r(spread(reads.map((x) => x.pitch)), 2),
      pull: rail > 0 ? r(Math.abs(v * r0) / (G * Math.tan(rail / DEG)), 3) : null,
    };
    const stalled = !Number.isFinite(r0) || !Number.isFinite(b0) || Math.abs(b0 * DEG) > 20 || Math.abs(mean(reads.map((x) => x.slip))) > 20;
    emit({ part: 'trim', v, rail, freeze: FREEZE, trim, stalled, geom: stalled ? null : geometry(lab) });
    if (stalled) continue;
    const frozen: Hold = FREEZE ? { pitch: pitch0, height: y0 } : {};
    const hold = (h: Hold, seconds = HOLD, tail = TAIL) => {
      lab.hold = { speed: v, roll: rail / DEG, yawRate: r0, slip: b0, ...frozen };
      for (let i = 0; i < Math.round(BACK / STEP); i += 1) lab.frame();
      lab.hold = { speed: v, roll: rail / DEG, yawRate: r0, slip: b0, ...frozen, ...h };
      const bs: Ledger[] = [];
      const m = Math.round(seconds / STEP);
      for (let i = 0; i < m; i += 1) { const b = lab.frame(); if (i >= m - Math.round(tail / STEP)) bs.push(b); }
      return { parts: split(lab, meanBook(bs)), geom: geometry(lab) };
    };
    const diff = (lo: ReturnType<typeof hold>, hi: ReturnType<typeof hold>, d: number) => {
      const out: Record<string, number[]> = {};
      for (const name of [...NAMES, 'ramp']) {
        if (!lo.parts[name] || !hi.parts[name]) continue;
        out[name] = [r((hi.parts[name].N - lo.parts[name].N) / d, 1)!, r((hi.parts[name].Y - lo.parts[name].Y) / d, 1)!, r((hi.parts[name].K - lo.parts[name].K) / d, 1)!, r((hi.parts[name].V - lo.parts[name].V) / d, 1)!];
      }
      return out;
    };
    const RATE_HOLD = Number(process.env.RATE_HOLD ?? 0.25);
    const base = hold({});
    const slipLo = hold({ slip: b0 - 1 / DEG });
    const slipHi = hold({ slip: b0 + 1 / DEG });
    const rollLo = hold({ roll: (rail - 1) / DEG });
    const rollHi = hold({ roll: (rail + 1) / DEG });
    const yawLo = hold({ yawRate: r0 - 0.1 });
    const yawHi = hold({ yawRate: r0 + 0.1 });
    const rateLo = hold({ rollRate: -0.2, rollAxis: DECK }, RATE_HOLD, 0.1);
    const rateHi = hold({ rollRate: 0.2, rollAxis: DECK }, RATE_HOLD, 0.1);
    const again = hold({});
    const flat = (x: ReturnType<typeof hold>) => Object.fromEntries(Object.entries(x.parts).map(([k, p]) => [k, [r(p.N, 1), r(p.Y, 1), r(p.K, 1), r(p.V, 1)]]));
    emit({
      part: 'deriv', v, rail, freeze: FREEZE, trim,
      base: flat(base), drift: [r(again.parts.all.N - base.parts.all.N, 1), r(again.parts.all.Y - base.parts.all.Y, 1), r(again.parts.all.K - base.parts.all.K, 1)],
      baseGeom: base.geom, slipLoGeom: slipLo.geom, slipHiGeom: slipHi.geom,
      slip: diff(slipLo, slipHi, 2 / DEG), roll: diff(rollLo, rollHi, 2 / DEG), yaw: diff(yawLo, yawHi, 0.2), rate: diff(rateLo, rateHi, 0.4),
    });
  }
});

/**
 * The chain, link by link, at each rail: if the sign flip is the board re-trimming in heave and pitch rather than the
 * force law's own answer to a slide, then
 *
 *     dY/dslip (free)  ≈  dY/dslip (frozen)  +  dY/dheight × dheight/dslip  +  dY/dpitch × dpitch/dslip
 *
 * and this measures every term. The heave and pitch links are central differences about the trim with the roll, the
 * slip and the yaw rate held (height ±2 cm, pitch ±1°); the responses `dheight/dslip` and `dpitch/dslip` are measured
 * by holding the slip ±1° off the trim with the pitch and the height FREE for `RESPOND` s (default 4) and reading where
 * the board ends up — long enough to see whether the 0.6 s the derivative uses has settled.
 */
it('the chain: the lift lost to a slide, the sink it makes, and the side force per metre of sink', () => {
  if (!PART.includes('chain')) return;
  const TRIM = Number(process.env.TRIM ?? 8);
  const HOLD = Number(process.env.HOLD ?? 0.6);
  const TAIL = Number(process.env.TAIL ?? 0.25);
  const BACK = Number(process.env.BACK ?? 0.8);
  const RESPOND = Number(process.env.RESPOND ?? 4);
  for (const v of SPEEDS) for (const rail of RAILS) {
    const lab = settled(v);
    lab.hold = { speed: v, roll: rail / DEG };
    const reads: ReturnType<Lab['read']>[] = [];
    const levels: number[] = [];
    const heights: number[] = [];
    const n = Math.round(TRIM / STEP);
    for (let i = 0; i < n; i += 1) {
      lab.frame();
      if (i >= n - Math.round(2 / STEP)) {
        reads.push(lab.read()); heights.push(lab.board.centerOfMass.y);
        const d = euler(lab.board.orientation).heading - Math.atan2(lab.board.velocity.x, lab.board.velocity.z);
        levels.push(d - 2 * Math.PI * Math.round(d / (2 * Math.PI)));
      }
    }
    const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;
    const r0 = mean(reads.map((x) => x.yawRate));
    const b0 = mean(levels);
    const pitch0 = mean(reads.map((x) => x.pitch)) / DEG;
    const y0 = mean(heights);
    if (!Number.isFinite(r0) || Math.abs(b0 * DEG) > 20) { emit({ part: 'chain', v, rail, stalled: true }); continue; }
    const base: Hold = { speed: v, roll: rail / DEG, yawRate: r0, slip: b0 };
    const frozen: Hold = { ...base, pitch: pitch0, height: y0 };
    /** Held with the trim frozen; the mean split and the draft over the tail. */
    const held = (h: Hold) => {
      lab.hold = frozen;
      for (let i = 0; i < Math.round(BACK / STEP); i += 1) lab.frame();
      lab.hold = { ...frozen, ...h };
      const bs: Ledger[] = [];
      const m = Math.round(HOLD / STEP);
      for (let i = 0; i < m; i += 1) { const b = lab.frame(); if (i >= m - Math.round(TAIL / STEP)) bs.push(b); }
      const p = split(lab, meanBook(bs));
      return { Y: p.all.Y, V: p.all.V, N: p.all.N, Yp: p.pressure.Y, Vp: p.pressure.V };
    };
    const d = (lo: ReturnType<typeof held>, hi: ReturnType<typeof held>, step: number) => ({
      Y: r((hi.Y - lo.Y) / step, 1), V: r((hi.V - lo.V) / step, 1), N: r((hi.N - lo.N) / step, 1),
      Yp: r((hi.Yp - lo.Yp) / step, 1), Vp: r((hi.Vp - lo.Vp) / step, 1),
    });
    const perSlip = d(held({ slip: b0 - 1 / DEG }), held({ slip: b0 + 1 / DEG }), 2 / DEG);
    const perHeight = d(held({ height: y0 - 0.02 }), held({ height: y0 + 0.02 }), 0.04);
    const perPitch = d(held({ pitch: pitch0 - 1 / DEG }), held({ pitch: pitch0 + 1 / DEG }), 2 / DEG);
    /** The slip held ±1° off the trim with the pitch and the height FREE: where the board settles, and when. */
    const respond = (slip: number) => {
      lab.hold = base;
      for (let i = 0; i < Math.round(BACK / STEP); i += 1) lab.frame();
      lab.hold = { ...base, slip };
      const hs: number[] = []; const ps: number[] = []; const ys: number[] = [];
      const m = Math.round(RESPOND / STEP);
      const at: Record<string, number[]> = {};
      for (let i = 0; i < m; i += 1) {
        const b = lab.frame();
        hs.push(lab.board.centerOfMass.y); ps.push(lab.read().pitch); ys.push(split(lab, meanBook([b])).all.Y);
        const t = (i + 1) * STEP;
        for (const mark of [0.35, 0.6, 1, 2, 4]) if (Math.abs(t - mark) < STEP / 2) at[`${mark}`] = [r(lab.board.centerOfMass.y - y0, 4)!, r(lab.read().pitch - pitch0 * DEG, 3)!, r(ys[ys.length - 1], 1)!];
      }
      const tailMean = (xs: number[]) => mean(xs.slice(-Math.round(0.5 / STEP)));
      return { height: tailMean(hs), pitch: tailMean(ps) / DEG, Y: tailMean(ys), at };
    };
    const lo = respond(b0 - 1 / DEG);
    const hi = respond(b0 + 1 / DEG);
    const step = 2 / DEG;
    const dHeight = (hi.height - lo.height) / step;
    const dPitch = (hi.pitch - lo.pitch) / step;
    const predicted = perSlip.Y! + perHeight.Y! * dHeight + perPitch.Y! * dPitch;
    emit({
      part: 'chain', v, rail, trim: { pitchDeg: r(pitch0 * DEG, 2), heightM: r(y0, 4), yawRate: r(r0, 4), slipDeg: r(b0 * DEG, 3) },
      perSlipFrozen: perSlip, perHeight, perPitch,
      dHeightPerRad: r(dHeight, 4), dPitchPerRad: r(dPitch, 4), dHeightPerDeg: r(dHeight / DEG, 5), dPitchPerDeg: r((dPitch * DEG) / DEG, 5),
      YfreeSettled: r((hi.Y - lo.Y) / step, 1), predicted: r(predicted, 1),
      loTrace: lo.at, hiTrace: hi.at,
    });
  }
});

/**
 * A 1° step of sideslip at the trim, with the pitch and the heave FREE: the side force and the height against time.
 * This shows where the 0.6 s hold the published derivative uses sits on the heave's own answer.
 */
it('a 1° slip step at the trim: the side force and the height against time', () => {
  if (!PART.includes('trace')) return;
  const TRIM = Number(process.env.TRIM ?? 8);
  for (const v of SPEEDS) for (const rail of RAILS) {
    const lab = settled(v);
    lab.hold = { speed: v, roll: rail / DEG };
    const reads: ReturnType<Lab['read']>[] = [];
    const levels: number[] = [];
    const heights: number[] = [];
    const n = Math.round(TRIM / STEP);
    for (let i = 0; i < n; i += 1) {
      lab.frame();
      if (i >= n - Math.round(2 / STEP)) {
        reads.push(lab.read()); heights.push(lab.board.centerOfMass.y);
        const d = euler(lab.board.orientation).heading - Math.atan2(lab.board.velocity.x, lab.board.velocity.z);
        levels.push(d - 2 * Math.PI * Math.round(d / (2 * Math.PI)));
      }
    }
    const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;
    const r0 = mean(reads.map((x) => x.yawRate));
    const b0 = mean(levels);
    const y0 = mean(heights);
    if (!Number.isFinite(r0) || Math.abs(b0 * DEG) > 20) { emit({ part: 'trace', v, rail, stalled: true }); continue; }
    const base: Hold = { speed: v, roll: rail / DEG, yawRate: r0, slip: b0 };
    const run = (slip: number) => {
      lab.hold = base;
      for (let i = 0; i < Math.round(1 / STEP); i += 1) lab.frame();
      lab.hold = { ...base, slip };
      const out: { t: number; Y: number; dh: number; draft: number }[] = [];
      for (let i = 0; i < Math.round(4 / STEP); i += 1) {
        const b = lab.frame();
        out.push({ t: r((i + 1) * STEP, 3)!, Y: r(split(lab, meanBook([b])).all.Y, 1)!, dh: r(lab.board.centerOfMass.y - y0, 4)!, draft: r(lab.read().draft, 4)! });
      }
      return out;
    };
    const lo = run(b0 - 1 / DEG);
    const hi = run(b0 + 1 / DEG);
    // dY/dslip as a function of how long the step has been held.
    const at = [0.1, 0.25, 0.35, 0.5, 0.6, 0.85, 1, 1.5, 2, 3, 4];
    emit({
      part: 'trace', v, rail,
      YperRad: at.map((t) => { const k = Math.round(t / STEP) - 1; return [t, r((hi[k].Y - lo[k].Y) * DEG / 2, 0)]; }),
      dhPerDeg: at.map((t) => { const k = Math.round(t / STEP) - 1; return [t, r((hi[k].dh - lo[k].dh) / 2, 4)]; }),
    });
  }
});

/**
 * The fin law on its own, with no board: what `finForce` gives per degree of LEVEL sideslip when the fin is heeled.
 * `finForce` works in the board's x–z plane only (it ignores the board-frame vertical speed, `planeForce`), so a heeled
 * fin sees cos(heel) of a level slide across it, and the side force it answers with lies along the board's lateral
 * axis, whose level part is another cos(heel). The prediction is cos²(heel); this measures it.
 */
it('the fin law heeled: side force per degree of level sideslip, against cos²(heel)', () => {
  if (!PART.includes('finlaw')) return;
  const fin = createFinForce();
  for (const v of SPEEDS) for (const heel of [0, 10, 15, 20, 30, 40, 45, 60]) {
    const c = Math.cos(heel / DEG);
    const s = Math.sin(heel / DEG);
    const side = (slipDeg: number) => {
      // Level flow past the board: forward v along its heading, and v·tan(slip) toward its right in the level plane.
      // In the board frame (heeled by `heel` about its long axis), the level-left direction is (cos, −sin, 0) and the
      // vertical is (sin, cos, 0) — a slide to the right is −level-left.
      const across = -v * Math.tan(slipDeg / DEG);
      const rel = { x: across * c, y: -across * s, z: v };
      let Y = 0;
      for (const spec of THRUSTER) {
        const out = finForce(spec, rel, 1, fin);
        // The fin's force lies in the board's x–z plane; its level-left part is x·cos(heel).
        Y += out.force.x * c;
      }
      return Y;
    };
    const per = (side(1) - side(-1)) / 2;
    const at0 = heel === 0 ? per : null;
    emit({ part: 'finlaw', v, heel, YperDeg: r(per, 1), cos2: r(c * c, 4), slope: r(liftSlope((0.115 * 0.115) / 0.0095), 3), at0 });
  }
});
