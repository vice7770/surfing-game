// The catch model (canyon-wave-r2, 2026-10-22; no riders): a point-mass paddler on the solver's own waves along the
// take-off column (`catch-probe.ts`), from each start, for each wave passing it.
// - The paddler: 80 kg, prone drag k u_r² with k = 45 N at 1.7 m/s (`AttachedRider`'s prone body and board), the sprint
//   paddle's thrust T0 (1 − u_r / 4.5) fitted to settle at 2.1 m/s on flat water (the hand peaks near 4.5 m/s against the
//   board), u_r the board's speed against the water at the surface: the depth-averaged velocity times the game's Airy
//   gain there (`horizontalProfileGain`: kh / tanh kh at the peak period, at most 1.5, none where breaking); the
//   surface's fall along +z over 1 m adds g S. It waits at rest and sprints from `lead` s before the wave's crest reaches the start.
// - Caught: the take-off window (`takeOffCue.ts`): crest speed ≥ 3 m/s, the board at least 0.8 of it and 3 m/s, at least
//   half-way up the face, min(2, 1.1 H)–min(4, 2.2 H) ahead of the crest. Broke on: the crest breaks (strength > 0.3
//   within ±2 m of it) while the board is still within reach of it and not caught. Missed: the crest passes the board.
// - Per start, the waves (zero up-crossings of η at the start) and the sets (their top third by height): caught with the
//   best lead (a skilled paddler's timing, 0.5–6 s) and at a fixed lead (`--lead`, 2 s: the sets' usual best); broke on; the board's top speed; and the
//   waves starting to break seaward of the start (each wave's most seaward onset in the column, x ± 4 m); and the sets'
//   steepest front over 1 m as they pass the start, p50 / p90.
// Run: node catch-model.mjs <probe.json>[,<probe.json>…] [--starts 0,3,6,…] [--lead 2] [--json out.json]
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const runs = args[0].split(',').map((file) => JSON.parse(readFileSync(file, 'utf8')));
const STARTS = (opt('starts') ?? '0,3,6,9,11,14,17,20,25').split(',').map(Number);
const LEADS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];
const FIXED_LEAD = Number(opt('lead') ?? 2);
const G = 9.81;
const MASS = 80;
const DRAG = 45 / 1.7 ** 2;
const HAND = 4.5;
const SPRINT = 2.1;
const THRUST = (DRAG * SPRINT ** 2) / (1 - SPRINT / HAND);
const thrust = (ur) => Math.min(THRUST, THRUST * Math.max(0, 1 - ur / HAND));

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : Number.NaN; };
const quantile = (xs, q) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : Number.NaN; };

/** k h at the peak period over still depth h (linear dispersion, Newton). */
function kh(period, h) {
  const omega = (2 * Math.PI) / period;
  let k = omega / Math.sqrt(G * Math.max(0.05, h));
  for (let n = 0; n < 30; n += 1) {
    const t = Math.tanh(k * h);
    const f = G * k * t - omega * omega;
    k -= f / (G * t + G * k * h * (1 - t * t));
  }
  return k * h;
}

function model(run) {
  const { zs, eta, flow, breaking, times } = run;
  const gainAt = run.depths.map((h) => { const x = kh(run.tp, h); return Math.min(1.5, x / Math.tanh(x)); });
  const dt = times[1] - times[0];
  const z0 = zs[0];
  const dzc = zs[1] - zs[0];
  const at = (field, f, z) => {
    const u = (z - z0) / dzc;
    const k = Math.min(zs.length - 2, Math.max(0, Math.floor(u)));
    const t = Math.min(1, Math.max(0, u - k));
    return field[f][k] * (1 - t) + field[f][k + 1] * t;
  };
  const crestNear = (f, guess, reach) => {
    let best = -1; let hi = -Infinity;
    for (let k = 1; k < zs.length - 1; k += 1) {
      if (Math.abs(zs[k] - guess) > reach) continue;
      if (eta[f][k] > hi && eta[f][k] >= eta[f][k - 1] && eta[f][k] >= eta[f][k + 1]) { hi = eta[f][k]; best = k; }
    }
    if (best < 0) return undefined;
    const a = eta[f][best - 1]; const b = eta[f][best]; const c = eta[f][best + 1];
    const den = a - 2 * b + c;
    const off = den < 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / den)) : 0;
    return { z: zs[best] + off * dzc, eta: b };
  };
  const troughAhead = (f, zc) => {
    let lo = Infinity;
    for (let k = 0; k < zs.length; k += 1) if (zs[k] >= zc && zs[k] <= zc + 25) lo = Math.min(lo, eta[f][k]);
    return lo;
  };
  const breakingNear = (f, zc) => {
    let b = 0;
    for (let k = 0; k < zs.length; k += 1) if (Math.abs(zs[k] - zc) <= 2) b = Math.max(b, breaking[f][k]);
    return b;
  };
  // One attempt: sprint from rest at frame f0, from zStart, for the crest found near zGuess.
  const attempt = (f0, zStart, zGuess) => {
    let crest = crestNear(f0, zGuess, 12);
    if (!crest) return { outcome: 'none', top: 0 };
    const track = [crest.z];
    let z = zStart; let u = 0; let top = 0;
    for (let f = f0; f < Math.min(times.length - 1, f0 + Math.round(12 / dt)); f += 1) {
      for (let s = 0; s < 4; s += 1) {
        const h = dt / 4;
        const gain = at({ 0: gainAt }, 0, z);
        const w = at(flow, f, z) * (1 + (gain - 1) * (1 - Math.min(1, at(breaking, f, z))));
        const slope = -(at(eta, f, z + 0.5) - at(eta, f, z - 0.5));
        const ur = u - w;
        u += ((thrust(ur) - DRAG * ur * Math.abs(ur)) / MASS + G * slope) * h;
        z += u * h;
      }
      top = Math.max(top, u);
      const next = crestNear(f + 1, crest.z + 0.4, 2.5);
      if (!next) return { outcome: 'lost', top };
      crest = next;
      track.push(crest.z);
      const back = Math.min(track.length - 1, 7);
      const c = (track[track.length - 1] - track[track.length - 1 - back]) / (back * dt);
      const trough = troughAhead(f + 1, crest.z);
      const H = crest.eta - trough;
      const ahead = z - crest.z;
      const fraction = H > 0 ? (at(eta, f + 1, z) - trough) / H : 0;
      if (z > zs[zs.length - 2]) return { outcome: 'missed', top };
      if (ahead < 0) return { outcome: 'missed', top };
      const lo = Math.min(2, 1.1 * H); const hi = Math.min(4, 2.2 * H);
      if (track.length > 4 && c >= 3 && u >= Math.max(0.8 * c, 3) && fraction >= 0.5 && ahead >= lo && ahead <= hi) {
        return { outcome: 'caught', top, white: breakingNear(f + 1, crest.z) > 0.3, depth: at({ 0: run.depths }, 0, z), z };
      }
      if (breakingNear(f + 1, crest.z) > 0.3 && ahead <= hi + 2) return { outcome: 'broke', top };
    }
    return { outcome: 'missed', top };
  };
  const results = {};
  for (const out of STARTS) {
    const zStart = run.takeOff.z - out;
    const e = eta.map((row) => at({ 0: row }, 0, zStart));
    const mean = e.reduce((a, b) => a + b, 0) / e.length;
    const ups = [];
    for (let f = 1; f < e.length; f += 1) if (e[f - 1] < mean && e[f] >= mean) ups.push(f);
    const waves = [];
    for (let w = 0; w + 1 < ups.length; w += 1) {
      let hi = -Infinity; let lo = Infinity; let fc = ups[w];
      for (let f = ups[w]; f < ups[w + 1]; f += 1) { if (e[f] > hi) { hi = e[f]; fc = f; } lo = Math.min(lo, e[f]); }
      const c = Math.sqrt(G * (run.depths[Math.round((zStart - z0) / dzc)] + 0.5 * (hi - lo)));
      // The face as it passes the start: its steepest front slope over 1 m before the crest (big-start's analyze.mjs).
      let face = 0;
      for (let f = Math.max(0, fc - Math.round((0.5 * run.tp) / dt)); f <= fc; f += 1) face = Math.max(face, -(at(eta, f, zStart + 0.5) - at(eta, f, zStart - 0.5)));
      const tries = {};
      for (const lead of LEADS) {
        const f0 = fc - Math.round(lead / dt);
        if (f0 < 0) continue;
        tries[lead] = attempt(f0, zStart, zStart - c * lead);
      }
      if (!Object.keys(tries).length) continue;
      waves.push({ seed: run.seed, t: times[fc], H: hi - lo, face: (Math.atan(face) * 180) / Math.PI, tries });
    }
    results[out] = waves;
  }
  return results;
}

// Each wave's most seaward onset in the column (onsets under 0.35 Tp apart are one wave), as big-start's analyze.mjs.
function starts(run) {
  const groups = [];
  for (const o of [...run.onsets].sort((a, b) => a.t - b.t)) {
    const last = groups[groups.length - 1];
    if (last && o.t - last.t1 < 0.35 * run.tp) { last.t1 = o.t; last.z = Math.min(last.z, o.z); } else groups.push({ t1: o.t, z: o.z });
  }
  return groups.map((g) => g.z - run.takeOff.z);
}

const all = runs.map(model);
const breaks = runs.flatMap(starts);
const r0 = runs[0];
console.log(`catch model: ${r0.size} Hs ${r0.hs} Tp ${r0.tp}; seeds ${runs.map((r) => r.seed).join(', ')}; column x ${r0.x}; take-off z ${r0.takeOff.z}; `
  + `paddler ${MASS} kg, sprint ${SPRINT} m/s (thrust ${THRUST.toFixed(0)} N at rest), drag ${DRAG.toFixed(1)} u²`);
console.log(`waves breaking in the column: ${breaks.length}; first onset median ${median(breaks).toFixed(1)} m inside the take-off, one in ten ${(-quantile(breaks, 0.1)).toFixed(1)} m seaward of it`);
console.log(' out  depth | waves: n  caught(best) caught@lead broke  top u p50 | sets: n  caught(best) caught@lead broke  top u p50/p90  best lead  face p50/p90 | break seaward of the start');
const table = [];
for (const out of STARTS) {
  const waves = all.flatMap((r) => r[out]);
  const sets = [...waves].sort((a, b) => b.H - a.H).slice(0, Math.max(1, Math.ceil(waves.length / 3)));
  const best = (w) => {
    const list = Object.entries(w.tries);
    const caught = list.filter(([, t]) => t.outcome === 'caught');
    if (caught.length) return { outcome: 'caught', lead: Number(caught[0][0]), top: Math.max(...list.map(([, t]) => t.top)) };
    const broke = list.some(([, t]) => t.outcome === 'broke');
    return { outcome: broke ? 'broke' : 'missed', top: Math.max(...list.map(([, t]) => t.top)) };
  };
  const share = (list, fn) => `${String(list.filter(fn).length).padStart(2)} (${((100 * list.filter(fn).length) / Math.max(1, list.length)).toFixed(0).padStart(3)} %)`;
  const fixed = (w) => w.tries[FIXED_LEAD]?.outcome;
  const depth = r0.depths[Math.round((r0.takeOff.z - out - r0.zs[0]) / (r0.zs[1] - r0.zs[0]))];
  const seaward = breaks.filter((dz) => dz < -out).length;
  const row = {
    out, depth, waves: waves.length, sets: sets.length,
    wavesCaught: waves.filter((w) => best(w).outcome === 'caught').length, setsCaught: sets.filter((w) => best(w).outcome === 'caught').length,
    setsCaughtFixed: sets.filter((w) => fixed(w) === 'caught').length, setsBroke: sets.filter((w) => best(w).outcome === 'broke').length,
    setsTop: median(sets.map((w) => best(w).top)), breaksSeaward: seaward, breaks: breaks.length,
  };
  table.push(row);
  console.log(`${String(out).padStart(4)} ${depth.toFixed(2)} | ${String(waves.length).padStart(3)} ${share(waves, (w) => best(w).outcome === 'caught')} ${share(waves, (w) => fixed(w) === 'caught')} `
    + `${share(waves, (w) => best(w).outcome === 'broke')} ${median(waves.map((w) => best(w).top)).toFixed(2)} | ${String(sets.length).padStart(3)} `
    + `${share(sets, (w) => best(w).outcome === 'caught')} ${share(sets, (w) => fixed(w) === 'caught')} ${share(sets, (w) => best(w).outcome === 'broke')} `
    + `${median(sets.map((w) => best(w).top)).toFixed(2)}/${quantile(sets.map((w) => best(w).top), 0.9).toFixed(2)}  ${median(sets.map((w) => best(w).lead).filter(Number.isFinite)).toFixed(1)} s  `
    + `${median(sets.map((w) => w.face)).toFixed(1)}°/${quantile(sets.map((w) => w.face), 0.9).toFixed(1)}° | `
    + `${seaward} of ${breaks.length}`);
}
if (opt('json')) writeFileSync(opt('json'), JSON.stringify(table));
