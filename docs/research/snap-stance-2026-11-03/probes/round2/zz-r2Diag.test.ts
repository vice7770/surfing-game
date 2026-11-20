// Snap round 2's diagnosis probes (not part of the suite). CASE=load|flat|two, OUT=<file.json>.
import { writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { it } from 'vitest';
import { PlaneWater } from './PlaneWater';
import type { SurfWater } from './SurfWater';
import { FaceWater } from './testing/FaceWater';
import { DEG, Ramp, STEP, apply, diff, frameOf, input, onWater, r, summarise, type Frame, type Move, type Rig } from './zz-r2Lab';

const CASE = process.env.CASE ?? 'two';
const OUT = process.env.OUT ?? '/dev/null';
const RAMP = Number(process.env.RAMP ?? 0.2);
const FALL = new Vector3(0, 0, 1);
type Water = SurfWater & { advance?: (dt: number) => void; faceFraction?: (z: number) => number };

/** Steps `seconds`; `plan` gives each step's move and steer, ramped as keys are (RAMP s). */
function run(rig: Rig, water: Water, seconds: number, plan: (t: number) => { move: Move; steer: number; phase: string }, every = 1) {
  const frames: Frame[] = [];
  let last = rig.heading;
  let fell = Number.NaN;
  let cause = '';
  const ramps = { steer: new Ramp(RAMP), snap: new Ramp(RAMP), compress: new Ramp(RAMP), crouch: new Ramp(RAMP), trim: new Ramp(RAMP) };
  for (let n = 0; n < Math.round(seconds / STEP); n += 1) {
    const t = n * STEP;
    const p = plan(t);
    const i = input(p.move, p.steer);
    apply(rig, { steer: ramps.steer.update(i.steer, STEP), snap: ramps.snap.update(i.snap ?? 0, STEP), compress: ramps.compress.update(i.compress ?? 0, STEP), crouch: ramps.crouch.update(i.crouch ?? 0, STEP), trim: ramps.trim.update(i.trim ?? 0, STEP) });
    water.advance?.(STEP);
    rig.board.step(STEP, water);
    if (!rig.rider.attached) { fell = t + STEP; cause = String(rig.rider.separation); break; }
    const f = frameOf(rig, water, t + STEP, p.phase, FALL, last, water.faceFraction?.(rig.board.position.z));
    last = rig.heading;
    if (n % every === 0) frames.push(f);
  }
  return { frames, fell, cause };
}

const compact = (f: Frame) => ({
  t: r(f.t, 2), ph: f.phase, hd: r(f.heading), path: r(f.path), body: r(f.bodyPath), upper: r(f.upper), drift: r(diff(f.heading, f.path)), rate: r(f.rate), v: r(f.speed, 1),
  ff: r(f.fromFall), bank: r(f.bank), ref: r(f.bankRef), roll: r(f.roll), pitch: r(f.pitch), rest: r(f.rest, 2), drop: r(f.drop, 2), front: r(f.front, 2), fin: r(f.fin), tw: r(f.twist), sw: r(f.swing), pl: f.planing ? 1 : 0, fr: r(f.fraction, 2),
});

it('probe', () => {
  const out: unknown[] = [];
  if (CASE === 'load') {
    // Straight on flat water at 8 m/s: each stance taken at 0.2 s and held.
    for (const move of ['none', 'crouch', 'compress', 'snap'] as const) {
      const water = new PlaneWater() as Water;
      const rig = onWater(water, 0, 0, 0, 8);
      const frames: Frame[] = [];
      let last = rig.heading;
      const ramp = new Ramp(RAMP);
      for (let n = 0; n < 72; n += 1) {
        const t = n * STEP;
        const on = ramp.update(t < 0.2 ? 0 : 1, STEP);
        apply(rig, { steer: 0, crouch: move === 'crouch' ? on : move === 'compress' ? 0.6 * on : 0, compress: move === 'compress' ? on : 0, snap: move === 'snap' ? on : 0 });
        rig.board.step(STEP, water);
        frames.push(frameOf(rig, water, t + STEP, move, FALL, last));
        last = rig.heading;
      }
      const pick = frames.filter((f) => f.t >= 0.2 - 1e-9 && Math.abs((f.t - 0.2) * 20 - Math.round((f.t - 0.2) * 20)) < 1e-6);
      out.push({ move, rows: pick.map((f) => ({ t: r(f.t - 0.2, 2), rest: r(f.rest, 3), drop: r(f.drop, 3), front: r(f.front, 2), pitch: r(f.pitch, 1), v: r(f.speed, 2) })) });
    }
  } else if (CASE === 'flat') {
    // The owner's way on flat water: the stance and a full steer together (held HOLD s, the steer held on), against Compress and the steer alone.
    const HOLD = Number(process.env.HOLD ?? 0.6);
    for (const move of ['steer', 'compress', 'snap'] as const) {
      for (const speed of [7, 9]) {
        const water = new PlaneWater() as Water;
        const rig = onWater(water, 0, 0, 0, speed);
        const res = run(rig, water, 2, (t) => (t < 0.2 ? { move: 'none', steer: 0, phase: 'pre' } : t < 0.2 + HOLD ? { move, steer: -1, phase: 'move' } : { move: 'none', steer: -Number(process.env.AFTER_STEER ?? 1), phase: 'after' }));
        const s = summarise(move, res.frames.filter((f) => f.phase === 'move'));
        const all = summarise(move, res.frames.filter((f) => f.phase !== 'pre'));
        out.push({ case: `flat ${speed}: ${move} ${HOLD} s`, move: s, whole: { turned: r(all.turned), bodyTurned: r(all.bodyTurned), kept: r(all.kept, 2) }, fell: r(res.fell, 2), cause: res.cause, trace: process.env.TRACE ? res.frames.filter((_, i) => i % 3 === 0).map(compact) : undefined });
      }
    }
  } else if (CASE === 'climb') {
    // Round 1's snap start: climbing the static 15° face 150° from its fall line (and 120°), the stance with a full steer back down for HOLD s, the steer held on.
    const HOLD = Number(process.env.HOLD ?? 0.6);
    for (const across of [150, 120]) for (const speed of [6.7, 8]) for (const move of ['steer', 'compress', 'snap'] as const) {
      const water = new PlaneWater({ slopeZ: -Math.tan(15 / DEG) }) as Water;
      const rig = onWater(water, 0, 0, -across, speed);
      const res = run(rig, water, 1.6, (t) => (t < 0.2 ? { move: 'none', steer: 0, phase: 'pre' } : t < 0.2 + HOLD ? { move, steer: 1, phase: 'move' } : { move: 'none', steer: 1, phase: 'after' }));
      const moving = res.frames.filter((f) => f.phase !== 'pre');
      let turned = 0; let t150 = Number.NaN; let at1 = Number.NaN; let peak = 0; let minV = Infinity; let drift = 0;
      for (let i = 1; i < moving.length; i += 1) {
        turned += diff(moving[i].heading, moving[i - 1].heading);
        peak = Math.max(peak, moving[i].rate);
        minV = Math.min(minV, moving[i].speed);
        drift = Math.max(drift, Math.abs(diff(moving[i].heading, moving[i].path)));
        if (Number.isNaN(t150) && turned >= 150) t150 = moving[i].t - 0.2;
        if (Number.isNaN(at1) && moving[i].t - 0.2 >= 1 - 1e-9) at1 = turned;
      }
      out.push({ case: `climb ${across}° ${speed}: ${move}`, at1: r(at1), end: r(turned), t150: r(t150, 2), peak: r(peak), kept: r(moving[moving.length - 1].speed / moving[0].speed, 2), least: r(minV, 1), drift: r(drift), fell: r(res.fell, 2), cause: res.cause, trace: process.env.TRACE ? res.frames.filter((_, i) => i % 3 === 0).map(compact) : undefined });
    }
  } else if (CASE === 'two') {
    const UP = Number(process.env.UP ?? 150);
    const DOWN = Number(process.env.DOWN ?? 45);
    const HOLD1 = Number(process.env.HOLD1 ?? 0.8);
    const HOLD2 = Number(process.env.HOLD2 ?? 0.8);
    const GAP = Number(process.env.GAP ?? 0.15);
    const TOP = Number(process.env.TOP ?? 0.85);
    const CLIMB = Number(process.env.CLIMB ?? 0);
    const CLIMB_TO = Number(process.env.CLIMB_TO ?? 0);
    const pairs: [Move, Move][] = (process.env.PAIRS ?? 'steer:steer,compress:compress,compress:S,snap:snap').split(',').map((p) => p.split(':') as [Move, Move]);
    const waters: { name: string; make: () => { water: Water; x: number; z: number; heading: number; speed: number } }[] = [];
    // The static 15° plane (round 1's): along it at 90° from the fall line toward −x (frontside for a regular foot).
    for (const speed of [8, 9, 10]) waters.push({ name: `plane 15° ${speed}`, make: () => ({ water: new PlaneWater({ slopeZ: -Math.tan(15 / DEG) }) as Water, x: 0, z: 0, heading: -90, speed }) });
    // A moving face (FaceWater): 1.2 m at 20°, its crest running at √(g (d + H)) = 5.6 m/s; low on it (a quarter up), heading 45° from the fall line toward −x.
    for (const speed of [7, 8, 9]) {
      waters.push({ name: `face 1.2 m ${speed}`, make: () => { const w = new FaceWater({ depth: 2, height: 1.2, slope: 20 }); return { water: w as Water, x: 0, z: w.crestZ() + 0.75 * w.front, heading: -45, speed }; } });
    }
    // The Wave Pool's size (0.85 m, 14°, 4.7 m/s).
    for (const speed of [7, 8]) {
      waters.push({ name: `face 0.85 m ${speed}`, make: () => { const w = new FaceWater({ depth: 2, height: 0.85, slope: 14, speed: 4.7 }); return { water: w as Water, x: 0, z: w.crestZ() + 0.75 * w.front, heading: -45, speed }; } });
    }
    const only = process.env.WATER;
    for (const w of waters) {
      if (only && !only.split('|').some((o) => w.name.startsWith(o))) continue;
      for (const [a, b] of pairs) {
        const { water, x, z, heading, speed } = w.make();
        const rig = onWater(water, x, z, heading, speed);
        let phase = 'pre'; let t0 = 0;
        const fromFall = () => { const f = new Vector3(0, 0, 1).applyQuaternion(rig.board.orientation).setY(0).normalize(); return Math.acos(Math.max(-1, Math.min(1, f.dot(FALL)))) * DEG; };
        const high = () => (water.faceFraction ? water.faceFraction(rig.board.position.z) >= TOP : false);
        const high2 = () => (water.faceFraction ? water.faceFraction(rig.board.position.z) >= CLIMB_TO : true);
        const res = run(rig, water, 4.5, (t) => {
          if (phase === 'pre' && t >= 0.2) { phase = 'm1'; t0 = t; }
          if (phase === 'm1' && (fromFall() >= UP || high() || t - t0 >= HOLD1)) { phase = 'gap'; t0 = t; }
          if (phase === 'gap' && (CLIMB_TO > 0 ? (high2() || fromFall() >= UP || t - t0 >= 1.5) && t - t0 >= GAP : t - t0 >= GAP)) { phase = 'm2'; t0 = t; }
          if (phase === 'm2' && (fromFall() <= DOWN || t - t0 >= HOLD2)) { phase = 'after'; t0 = t; }
          if (phase === 'after' && t - t0 > 1.5) phase = 'done';
          return phase === 'm1' ? { move: a, steer: -1, phase } : phase === 'm2' ? { move: b, steer: 1, phase } : phase === 'gap' ? { move: 'none', steer: -CLIMB, phase } : { move: 'none', steer: 0, phase };
        });
        const m1 = summarise('m1', res.frames.filter((f) => f.phase === 'm1'));
        const m2 = summarise('m2', res.frames.filter((f) => f.phase === 'm2'));
        const highest = Math.max(0, ...res.frames.filter((f) => f.phase === 'm1' || f.phase === 'gap').map((f) => f.fromFall));
        const lowest = Math.min(180, ...res.frames.filter((f) => f.phase === 'm2' || f.phase === 'after').map((f) => f.fromFall));
        const show = (m: ReturnType<typeof summarise>) => ({ turned: r(m.turned), time: r(m.time, 2), peak: r(m.peak), mean: r(m.mean), kept: r(m.kept, 2), body: r(m.bodyTurned), drift: r(m.drift), lead: r(m.upperLead), depth: r(m.depth, 2), drop: r(m.drop, 2), front: r(m.front, 2), pitch: r(m.pitch), bank: r(m.bank), fin: r(m.fin) });
        const lastF = res.frames[res.frames.length - 1];
        out.push({ case: `${w.name}: ${a} → ${b}`, m1: show(m1), highest: r(highest), m2: show(m2), lowest: r(lowest), fell: r(res.fell, 2), cause: res.cause, at: lastF ? compact(lastF) : null, trace: process.env.TRACE ? res.frames.filter((_, i) => i % 3 === 0).map(compact) : undefined });
      }
    }
  }
  writeFileSync(OUT, JSON.stringify(out, null, 1));
});
