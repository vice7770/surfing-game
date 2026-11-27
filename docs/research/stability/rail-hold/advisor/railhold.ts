// 3.6k advisor probe (scratch, not in the repo): the roll-plant lab with a candidate rail law added as the rails' force,
// through a runtime wrap of BoardBody.applyFoils on the instance (no src edit). Laws:
//   none   - the shipped board (4-5 mm bluff rail faces, RAIL_PRESSURE 1)
//   bluff  - the same bluff law on a face of the volume-consistent rail thickness (0.383 t(s), up to 26 mm)
//   chine  - TN 4187's leading-chine-edge law on that face: p = Ce(alpha) 1/2 rho |u|^2, Ce = CMAX ramp((alpha-AON)/DA)
// Parts: trim (yaw, slip free; roll held), kick (slip kick at the trim, yaw free), settled (dY/dslip, 4 s holds).
import { appendFileSync } from 'node:fs';
import { DEG, Flat, G, GROUPS, Lab, STEP, euler, r, sum, type Hold, type Ledger } from '/Users/vicentealmeida/Documents/Codex/surfing-game/.claude/worktrees/rail-hold/docs/research/new-rider/roll-plant/plant';

const env = process.env;
const LAWS = (env.LAWS ?? 'none').split(',');
const PARTS = (env.PARTS ?? 'trim').split(',');
const SPEEDS = (env.SPEEDS ?? '7').split(',').map(Number);
const RAILS = (env.RAILS ?? '0,20,40').split(',').map(Number);
const TRIM = Number(env.TRIM ?? 8);
const HOLD = Number(env.HOLD ?? 4);
const BACK = Number(env.BACK ?? 0.8);
const OUT = env.OUT;
const RHO = 1025;
const A_LIN = 0.617; // linear taper holding the same volume: rail at u=1 is (1 - 0.617) t(s)
const DECK = { x: 0, y: 0.07, z: -0.30 };
const water = new Flat();

function emit(line: unknown): void {
  const s = `${JSON.stringify(line)}\n`;
  if (OUT) appendFileSync(OUT, s); else process.stdout.write(s);
}

interface Law { name: string; kind: 'none' | 'bluff' | 'chine' | 'keel'; scale: number; cmax: number; da: number; aon: number; c: number }
function lawOf(name: string): Law {
  // name forms: none | bluff[:scale] | chine:aonDeg[:cmax[:daDeg[:scale]]]
  const [kind, a, b, c, d] = name.split(':');
  if (kind === 'none') return { name, kind: 'none', scale: 1, cmax: 0, da: 0, aon: 0, c: 1 };
  if (kind === 'bluff') return { name, kind: 'bluff', scale: Number(a ?? 1), cmax: 0, da: 0, aon: 0, c: 1 };
  if (kind === 'keel') return { name, kind: 'keel', aon: Number(a ?? 0) / DEG, cmax: Number(b ?? 1.3), da: Number(c ?? 5) / DEG, scale: Number(d ?? 1), c: 1 };
  return { name, kind: 'chine', aon: Number(a ?? 0) / DEG, cmax: Number(b ?? 1.3), da: Number(c ?? 5) / DEG, scale: Number(d ?? 1), c: 1 };
}

interface Face { side: number; x: number; y0: number; z: number; t: number; len: number }

/** Install the law on a lab: zero the shipped rail faces and add the law's force into the rails' slot and the ledger. */
const AMN = env.AMN === '1';
function installAmn(lab: Lab): void {
  // DIAGNOSTIC: each wetted patch's added mass along its own normal (with a sway part when heeled) instead of along the
  // water-surface normal with the |n.nu| projection: system += m/proj a_n a_n^T - m a_nu a_nu^T.
  const b = lab.board as any;
  const orig = b.applyFoils.bind(b);
  const an = new Float64Array(6); const av = new Float64Array(6);
  b.applyFoils = (h: number, wtr: unknown, system: Float64Array) => {
    orig(h, wtr, system);
    for (let k = 0; k < b.count; k += 1) {
      const m = b.addedMass[k]; if (!(m > 0)) continue;
      const rx = b.arm[k * 3], ry = b.arm[k * 3 + 1], rz = b.arm[k * 3 + 2];
      const nx = b.normal[k * 3], ny = b.normal[k * 3 + 1], nz = b.normal[k * 3 + 2];
      const ux = b.surfaceNormal[k * 3], uy = b.surfaceNormal[k * 3 + 1], uz = b.surfaceNormal[k * 3 + 2];
      const proj = Math.abs(nx * ux + ny * uy + nz * uz); if (!(proj > 0.2)) continue;
      an[0] = nx; an[1] = ny; an[2] = nz; an[3] = ry * nz - rz * ny; an[4] = rz * nx - rx * nz; an[5] = rx * ny - ry * nx;
      av[0] = ux; av[1] = uy; av[2] = uz; av[3] = ry * uz - rz * uy; av[4] = rz * ux - rx * uz; av[5] = rx * uy - ry * ux;
      const mn = m / proj;
      for (let i = 0; i < 6; i += 1) for (let j = 0; j < 6; j += 1) system[i * 6 + j] += mn * an[i] * an[j] - m * av[i] * av[j];
    }
  };
}
function install(lab: Lab, law: Law): { faces: Face[]; stats: { area: number; F: number; n: number } } {
  if (AMN) installAmn(lab);
  const b = lab.board as any;
  const taper: number = b.shape.taper;
  const faces: Face[] = [];
  const stats = { area: 0, F: 0, n: 0 };
  if (law.kind === 'none') return { faces, stats };
  for (const foil of b.foils) {
    if (foil.kind !== 'rail') continue;
    const thick = foil.height / (1 - taper);
    faces.push({ side: Math.sign(foil.normal.x), x: foil.local.x, y0: foil.local.y - foil.height / 2, z: foil.local.z, t: thick * (1 - A_LIN) * law.scale, len: foil.area / foil.height });
    foil.area = 0; // the shipped bluff face off; the law below is the whole rail face
  }
  const orig = b.applyFoils.bind(b);
  const q = b.orientation; const c = b.centerOfMass; const v = b.velocity; const w = b.angularVelocity;
  const P = v.clone(); const T = v.clone(); const N = v.clone();
  b.applyFoils = (h: number, wtr: unknown, system: Float64Array) => {
    orig(h, wtr, system);
    const ft: Float64Array = b.foilTotals;
    stats.area = 0; stats.F = 0;
    for (const f of faces) {
      // bottom and top of the face (board frame, rel. to CoM), at the station
      P.set(f.x, f.y0, f.z).applyQuaternion(q).add(c);
      T.set(f.x, f.y0 + f.t, f.z).applyQuaternion(q).add(c);
      const db = -P.y; const dt = -T.y; // depths below the flat surface (y = 0)
      let wet = 0;
      if (db > 0 && dt > 0) wet = 1; else if (db > 0) wet = db / (db - dt); else if (dt > 0) wet = dt / (dt - db);
      if (!(wet > 0)) continue;
      // wetted centre: from the lower end, half the wetted share
      const lowIsBottom = db >= dt;
      const yc = lowIsBottom ? f.y0 + (wet * f.t) / 2 : f.y0 + f.t - (wet * f.t) / 2;
      P.set(f.x, yc, f.z).applyQuaternion(q);
      const rx = P.x, ry = P.y, rz = P.z;
      const ux = v.x + w.y * rz - w.z * ry; const uy = v.y + w.z * rx - w.x * rz; const uz = v.z + w.x * ry - w.y * rx;
      N.set(f.side, 0, 0).applyQuaternion(q);
      const into = ux * N.x + uy * N.y + uz * N.z;
      const sp = Math.hypot(ux, uy, uz);
      if (!(sp > 0)) continue;
      const A = wet * f.t * f.len;
      let pn = 0; // pressure along -N (pushing the face back out of the water)
      if (law.kind === 'bluff') { if (into > 0) pn = 0.5 * RHO * law.c * sp * into; }
      else if (law.kind === 'keel') {
        // both branches: pressure when the face leads past aon, suction (negative pn) when it trails; linear over da, capped at cmax
        const alpha = Math.asin(Math.max(-1, Math.min(1, into / sp)));
        const x = Math.max(-1, Math.min(1, (alpha - law.aon) / law.da));
        pn = law.cmax * x * 0.5 * RHO * sp * sp;
      } else {
        const alpha = Math.asin(Math.max(-1, Math.min(1, into / sp)));
        const x = Math.max(0, Math.min(1, (alpha - law.aon) / law.da));
        const ramp = x * x * (3 - 2 * x);
        pn = law.cmax * ramp * 0.5 * RHO * sp * sp;
      }
      if (pn === 0) continue;
      const fx = -pn * A * N.x; const fy = -pn * A * N.y; const fz = -pn * A * N.z;
      ft[6] += fx; ft[7] += fy; ft[8] += fz;
      ft[9] += ry * fz - rz * fy; ft[10] += rz * fx - rx * fz; ft[11] += rx * fy - ry * fx;
      const part = f.side > 0 ? 'railL' : 'railR';
      const book = (lab as any).book as Ledger;
      book.force[part].x += fx * h; book.force[part].y += fy * h; book.force[part].z += fz * h;
      book.moment[part].x += (ry * fz - rz * fy) * h; book.moment[part].y += (rz * fx - rx * fz) * h; book.moment[part].z += (rx * fy - ry * fx) * h;
      stats.area += A; stats.F += pn * A; stats.n += 1;
    }
  };
  return { faces, stats };
}

function newLab(v: number, law: Law): { lab: Lab; stats: { area: number; F: number; n: number }; faces: Face[] } {
  const lab = new Lab(water, 'point');
  const { stats, faces } = install(lab, law);
  lab.place(v);
  lab.hold = { speed: v, roll: 0, yawRate: 0, slip: 0 };
  for (let i = 0; i < Math.round(2.5 / STEP); i += 1) lab.frame();
  return { lab, stats, faces };
}

/** [N about CoM, Y level-left, K about deck along fwd, M about deck nose-up, Z up] from a ledger. */
function gforce(lab: Lab, book: Ledger, parts: readonly string[] = GROUPS.all as readonly string[]): number[] {
  const { fwd, left } = lab.axes();
  const levelLeft = left.clone().setY(0).normalize();
  const deck = lab.board.toWorld(DECK, lab.board.velocity.clone());
  const arm = lab.board.centerOfMass.clone().sub(deck);
  const F = sum(book.force, parts as any);
  const about = sum(book.moment, parts as any);
  const atDeck = about.clone().add(arm.clone().cross(F));
  return [about.y, F.dot(levelLeft), atDeck.dot(fwd), -atDeck.dot(left), F.y];
}

const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / Math.max(1, xs.length);
const spread = (xs: number[]) => (xs.length ? Math.max(...xs) - Math.min(...xs) : 0);
function slipOf(lab: Lab): number {
  const d = euler(lab.board.orientation).heading - Math.atan2(lab.board.velocity.x, lab.board.velocity.z);
  return d - 2 * Math.PI * Math.round(d / (2 * Math.PI));
}

interface TrimPoint { r0: number; b0: number; pitch0: number; y0: number; out: Record<string, unknown> }
const RAMP = Number(env.RAMP ?? 0); // roll rate, deg/s, to reach the rail (0: a step, as rail-dig)
function trimAt(lab: Lab, v: number, rail: number, stats: { area: number; F: number }): TrimPoint | null {
  if (RAMP > 0) {
    const m = Math.ceil(rail / RAMP / STEP);
    for (let i = 1; i <= m; i += 1) { lab.hold = { speed: v, roll: Math.min(rail, RAMP * i * STEP) / DEG }; lab.frame(); }
  }
  lab.hold = { speed: v, roll: rail / DEG };
  const n = Math.round(TRIM / STEP);
  const yaw: number[] = []; const slip: number[] = []; const pitch: number[] = []; const hgt: number[] = []; const draft: number[] = [];
  const K: number[] = []; const Kr: number[] = []; const Yr: number[] = []; const Zr: number[] = []; const area: number[] = []; const Frail: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const book = lab.frame();
    if (i >= n - Math.round(2 / STEP)) {
      const rd = lab.read();
      yaw.push(rd.yawRate); pitch.push(rd.pitch); hgt.push(lab.board.centerOfMass.y); draft.push(rd.draft); slip.push(slipOf(lab));
      K.push(gforce(lab, book)[2]);
      const gr = gforce(lab, book, ['railL', 'railR']);
      Kr.push(gr[2]); Yr.push(gr[1]); Zr.push(gr[4]); area.push(stats.area); Frail.push(stats.F);
    }
  }
  const r0 = mean(yaw); const b0 = mean(slip);
  if (!Number.isFinite(r0) || !Number.isFinite(b0) || Math.abs(b0 * DEG) > 25 || mean(draft) > 1) return null;
  const out = {
    yawRate: r(r0, 4), degPerSecPerDeg: rail > 0 ? r((Math.abs(r0) * DEG) / rail, 3) : null, slipDeg: r(b0 * DEG, 2),
    G: rail > 0 ? r(Math.abs(v * r0) / (G * Math.tan(rail / DEG)), 3) : null, latAccel: r(Math.abs(v * r0), 3),
    pitch: r(mean(pitch), 2), draft: r(mean(draft), 4), yawSpread: r(spread(yaw), 4), slipSpreadDeg: r(spread(slip) * DEG, 2),
    Kdeck: r(mean(K), 1), railK: r(mean(Kr), 1), railY: r(mean(Yr), 1), railZ: r(mean(Zr), 1), railArea: r(mean(area), 5), railF: r(mean(Frail), 1),
  };
  return { r0, b0, pitch0: mean(pitch) / DEG, y0: mean(hgt), out };
}

/** Slip kick at the trim with yaw and slip free (roll held): the slip's departure from trim over time. */
function kick(lab: Lab, v: number, rail: number, tp: TrimPoint, dDeg: number): Record<string, unknown> {
  lab.hold = { speed: v, roll: rail / DEG };
  for (let i = 0; i < Math.round(1 / STEP); i += 1) lab.frame();
  const before = slipOf(lab); const r1 = lab.read().yawRate;
  // rotate the velocity by dDeg about world up (the path turns; the heading stays): +d = path to the board's right = toward the low rail at + rail
  const vv = lab.board.velocity; const ang = -dDeg / DEG; const cs = Math.cos(ang), sn = Math.sin(ang);
  const vx = vv.x * cs + vv.z * sn; const vz = -vv.x * sn + vv.z * cs; vv.x = vx; vv.z = vz;
  const marks = [0.1, 0.25, 0.5, 1, 1.5, 2, 3];
  const res: [number, number, number][] = [];
  let peak = 0;
  for (let i = 0; i < Math.round(3 / STEP); i += 1) {
    lab.frame();
    const t = (i + 1) * STEP;
    const ds = (slipOf(lab) - tp.b0) * DEG;
    if (Math.abs(ds) > Math.abs(peak)) peak = ds;
    for (const m of marks) if (Math.abs(t - m) < STEP / 2) res.push([m, r(ds, 2)!, r(lab.read().yawRate - tp.r0, 3)!]);
  }
  return { kickDeg: dDeg, slipBeforeDeg: r((before - tp.b0) * DEG, 2), yawBefore: r(r1 - tp.r0, 3), peakDeg: r(peak, 2), trace: res };
}

function settledYb(lab: Lab, v: number, rail: number, tp: TrimPoint): Record<string, unknown> {
  const base: Hold = { speed: v, roll: rail / DEG, yawRate: tp.r0, slip: tp.b0 };
  const run = (d: number) => {
    lab.hold = base;
    for (let i = 0; i < Math.round(BACK / STEP); i += 1) lab.frame();
    lab.hold = { ...base, slip: tp.b0 + d / DEG };
    const tr: number[][] = []; const rails: number[][] = [];
    for (let i = 0; i < Math.round(HOLD / STEP); i += 1) { const bk = lab.frame(); tr.push(gforce(lab, bk)); rails.push(gforce(lab, bk, ['railL', 'railR'])); }
    return { tr, rails };
  };
  const lo = run(-1); const hi = run(1);
  const at = (t: number, width: number, which: 'tr' | 'rails' = 'tr') => {
    const e = Math.round(t / STEP); const s = Math.max(0, e - Math.round(width / STEP));
    const m = (rows: number[][]) => { const o = [0, 0, 0, 0, 0]; for (let i = s; i < e; i += 1) for (let k = 0; k < 5; k += 1) o[k] += rows[i][k] / (e - s); return o; };
    const a = m(lo[which]); const b = m(hi[which]);
    return b.map((x, k) => r(((x - a[k]) * DEG) / 2, 1)!);
  };
  return { per: at(HOLD, 1), ladder: [0.35, 0.6, 1, 2, 3, 4].filter((t) => t <= HOLD).map((t) => [t, ...at(t, 0.25)]), rails: at(HOLD, 1, 'rails') };
}

const t0 = Date.now();
for (const lawName of LAWS) {
  const law = lawOf(lawName);
  for (const v of SPEEDS) for (const rail of RAILS) {
    const { lab, stats, faces } = newLab(v, law);
    const tp = trimAt(lab, v, rail, stats);
    const line: Record<string, unknown> = { law: lawName, v, rail, trim: tp ? tp.out : null, stalled: !tp };
    if (rail === RAILS[0] && v === SPEEDS[0]) line.faces = faces.length ? { n: faces.length, tMaxMm: r(Math.max(...faces.map((f) => f.t)) * 1000, 1), areaSide: r(faces.filter((f) => f.side > 0).reduce((a, f) => a + f.t * f.len, 0), 5) } : null;
    if (tp && PARTS.includes('kick')) line.kick = [kick(lab, v, rail, tp, 2), kick(lab, v, rail, tp, -2)];
    if (tp && PARTS.includes('settled')) line.settled = settledYb(lab, v, rail, tp);
    line.sec = r((Date.now() - t0) / 1000, 1);
    emit(line);
  }
}
