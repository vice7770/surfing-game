// Snap round 3's measurement probe (not part of the suite): the turn and the fan, headless. Copy it into src/physics/
// with round 2's zz-r2Lab.ts beside it. CASE=flat|climb, OUT=<file.json>, SNAP=old|<default> (the `snapPivot` option),
// MOVES=steer,compress,snap, SPEEDS=..., ACROSS=150, HOLD=0.6, DUR=2 (flat) / 1.6 (climb), RAMP=0.2 (keys) / 0 (pad).
import { writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';
import { createBoardSpraySheet, packBoardSheets } from './boardSpray';
import type { SurfWater } from './SurfWater';
import { FanRing, fallSpeed, throwFan } from '../wave/boardFan';
import { seededRandom } from '../wave/random';
import type { BoardSpraySheet } from '../wave/SprayCloud';
import { DEG, Ramp, STEP, apply, diff, frameOf, input, onWater, type Move, type Rig } from './zz-r2Lab';

const OUT = process.env.OUT ?? '/dev/null';
const CASE = process.env.CASE ?? 'flat';
const HOLD = Number(process.env.HOLD ?? 0.6);
const RAMP = Number(process.env.RAMP ?? 0.2);
const MOVES = (process.env.MOVES ?? 'steer,compress,snap').split(',') as Move[];
const SPEEDS = (process.env.SPEEDS ?? (CASE === 'flat' ? '7,9' : '6.7,8')).split(',').map(Number);
const ACROSS = (process.env.ACROSS ?? '150').split(',').map(Number);
const DUR = Number(process.env.DUR ?? (CASE === 'flat' ? 2 : 1.6));
const SNAP = process.env.SNAP;
const FALL = new Vector3(0, 0, 1);
const G = 9.81;
const STALL = 18;

/** A rig as zz-r2Lab's `onWater`, its rider made with the `snapPivot` option under test. */
function rigOn(water: SurfWater, heading: number, speed: number): Rig {
  const rig = onWater(water, 0, 0, heading, speed);
  if (SNAP === undefined) return rig;
  const board = rig.board as BoardBody;
  const rider = new AttachedRider(board.shape, { phase: 'standing', ...(SNAP === 'old' ? { snapPivot: 'old' } : {}) } as ConstructorParameters<typeof AttachedRider>[1]);
  board.attach(rider);
  return { board, rider, get heading() { const f = new Vector3(0, 0, 1).applyQuaternion(board.orientation); return Math.atan2(f.x, f.z); } };
}

const pct = (values: number[], q: number) => {
  if (values.length === 0) return Number.NaN;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))))];
};
const weightedPct = (pairs: [number, number][], q: number) => {
  if (pairs.length === 0) return Number.NaN;
  const s = [...pairs].sort((a, b) => a[0] - b[0]);
  const total = s.reduce((sum, [, w]) => sum + w, 0);
  let acc = 0;
  for (const [v, w] of s) { acc += w; if (acc >= q * total) return v; }
  return s[s.length - 1][0];
};

function measure(rig: Rig, water: SurfWater, steerSign: number, move: Move) {
  const board = rig.board as BoardBody;
  const ramps = { steer: new Ramp(RAMP), snap: new Ramp(RAMP), compress: new Ramp(RAMP), crouch: new Ramp(RAMP), trim: new Ramp(RAMP) };
  const sheets: BoardSpraySheet[] = [createBoardSpraySheet(), createBoardSpraySheet()];
  const streaks = new FanRing(200_000);
  const mist = new FanRing(20_000);
  const random = seededRandom(7, 11);
  const surface = (x: number, z: number) => water.surfaceAt(x, z);
  let last = rig.heading;
  let fell = Number.NaN;
  let cause = '';
  let turned = 0;
  const rows: Record<string, number>[] = [];
  const drops: { apex: number; t: number }[] = [];
  let kg = 0; let kgAt10 = 0; let tAt10 = 0;
  const azHeading: [number, number][] = []; const azPath: [number, number][] = []; const elev: [number, number][] = []; const azWorld: [number, number][] = [];
  let aftApex = 0; let aftApexAt = Number.NaN; let rootAft = Number.NaN; let meanFrom = Number.NaN; let peakFlux = 0;
  for (let n = 0; n < Math.round(DUR / STEP); n += 1) {
    const t = n * STEP;
    const phase = t < 0.2 ? 'pre' : t < 0.2 + HOLD ? 'move' : 'after';
    const i = input(phase === 'move' ? move : 'none', phase === 'pre' ? 0 : phase === 'after' ? steerSign * Number(process.env.AFTER ?? 1) : steerSign);
    apply(rig, { steer: ramps.steer.update(i.steer, STEP), snap: ramps.snap.update(i.snap ?? 0, STEP), compress: ramps.compress.update(i.compress ?? 0, STEP), crouch: ramps.crouch.update(i.crouch ?? 0, STEP), trim: ramps.trim.update(i.trim ?? 0, STEP) });
    if (process.env.ROT_PLAN && move === 'snap') {
      const [tw, after, until] = process.env.ROT_PLAN.split(',').map(Number);
      (rig.rider as unknown as { rotate: number }).rotate = phase === 'pre' ? Number.NaN : t < 0.2 + tw ? 1 : t < 0.2 + (until ?? 9) ? after : Number.NaN;
    }
    board.step(STEP, water);
    if (!rig.rider.attached) { fell = t + STEP; cause = String(rig.rider.separation); break; }
    const f = frameOf(rig, water, t + STEP, phase, FALL, last);
    if (phase !== 'pre') turned += steerSign * diff(f.heading, last * DEG);
    last = rig.heading;
    // The fan this frame.
    const count = board.spraySheets(sheets, 0, process.env.EXITS === 'old' ? 'old' : undefined);
    const fwd = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
    const hd = Math.atan2(fwd.x, fwd.z);
    const path = Math.atan2(board.velocity.x, board.velocity.z);
    const tail = board.toWorld({ x: 0, y: 0, z: -board.shape.length / 2 }, new Vector3());
    let flux = 0;
    const inThrow = phase !== 'pre' && t + STEP <= 0.2 + HOLD + 0.4 + 1e-9;
    if (inThrow) {
      for (let k = 0; k < count; k += 1) {
        const s = sheets[k];
        if (!(s.flux > 0)) continue;
        flux += s.flux;
        const apex = s.aftVY > 0 ? (s.aftVY * s.aftVY) / (2 * G) : 0;
        if (process.env.DEBUG && s.flux >= 10) console.log('dbg', (t + STEP).toFixed(3), k, s.side, s.flux.toFixed(1), 'apex', apex.toFixed(2), 'x', ((s.x - tail.x) * fwd.x + (s.z - tail.z) * fwd.z).toFixed(2), 'len', s.length.toFixed(2), 'mean', s.fluxMean.toFixed(2), 'lat', ((s.x - tail.x) * fwd.z - (s.z - tail.z) * fwd.x).toFixed(2));
        if (s.flux >= 10 && apex > aftApex) {
          aftApex = apex; aftApexAt = t + STEP;
          rootAft = (s.x - tail.x) * fwd.x + (s.z - tail.z) * fwd.z;
          meanFrom = rootAft + s.fluxMean * s.length;
        }
        const az = Math.atan2(s.vx, s.vz);
        azHeading.push([steerSign * diff(az * DEG, hd * DEG), s.flux]);
        azPath.push([steerSign * diff(az * DEG, path * DEG), s.flux]);
        // Its direction over the ground, unwrapped through the turn: the turn so far plus its angle off the heading.
        azWorld.push([steerSign * diff(az * DEG, hd * DEG) + turned, s.flux]);
        elev.push([Math.atan2(s.vy, Math.hypot(s.vx, s.vz)) * DEG, s.flux]);
      }
      kg += flux * STEP;
      peakFlux = Math.max(peakFlux, flux);
      if (flux >= 10) { kgAt10 += flux * STEP; tAt10 += STEP; }
      // The drawn fan: drops thrown as the page throws them (High share), their apex over the water with the air's drag.
      const before = streaks.head;
      if (count > 0) throwFan(packBoardSheets(sheets.slice(0, count)), count, t, STEP, 1, random, surface, 0, streaks, mist);
      for (let h = before; h !== streaks.head; h = (h + 1) % streaks.limit) {
        const o = h * 12;
        const py = streaks.data[o + 1]; const uy = streaks.data[o + 5]; const tau = streaks.data[o + 7];
        const rise = uy > 0 ? tau * uy - G * tau * tau * Math.log(1 + uy / (G * tau)) : 0;
        drops.push({ apex: py + rise - surface(streaks.data[o], streaks.data[o + 2]), t: t + STEP });
      }
    }
    rows.push({ t: +(t + STEP).toFixed(3), turned: +turned.toFixed(1), rate: steerSign * f.rate, fin: f.fin, roll: f.roll, bank: f.bank, pitch: f.pitch, v: f.speed, front: f.front, flux, drift: diff(f.heading, f.path) });
  }
  void fallSpeed;
  const after = rows.filter((r) => r.t > 0.2);
  const at = (dt: number) => { const r = after.find((x) => x.t >= 0.2 + dt - 1e-9); return r ? r.turned : Number.NaN; };
  // The turn's span: from its onset (the rate into the turn past 1 rad/s after its outward extreme) to where it falls back under 1 rad/s.
  const onsetIndex = after.findIndex((r) => r.rate > 57.3);
  const endIndex = onsetIndex < 0 ? -1 : after.findIndex((r, k) => k > onsetIndex && r.rate < 57.3);
  const span = onsetIndex < 0 ? Number.NaN : ((endIndex < 0 ? after.length : endIndex) - onsetIndex) * STEP;
  const spanTurn = onsetIndex < 0 ? Number.NaN : (endIndex < 0 ? after[after.length - 1].turned : after[endIndex].turned) - after[onsetIndex].turned;
  const fromOnset = (dt: number) => { if (onsetIndex < 0) return Number.NaN; const r = after.find((x) => x.t >= after[onsetIndex].t + dt - 1e-9); return r ? r.turned - after[onsetIndex].turned : Number.NaN; };
  const moveRows = after.filter((r) => r.t <= 0.2 + HOLD + 0.4 + 1e-9);
  const slip = moveRows.filter((r) => r.fin > STALL);
  const firstSlip = moveRows.findIndex((r) => r.fin > STALL);
  const regrip = firstSlip < 0 ? Number.NaN : (() => { const k = moveRows.findIndex((r, j) => j > firstSlip && r.fin < STALL); return k < 0 ? Number.NaN : moveRows[k].t - 0.2; })();
  const v0 = after.length ? after[0].v : Number.NaN;
  const at1 = after.find((x) => x.t >= 1.2 - 1e-9);
  const apexes = drops.map((d) => d.apex);
  return {
    fell: Number.isFinite(fell) ? +fell.toFixed(2) : null, cause,
    turn: {
      at06: +at(0.6).toFixed(0), at08: +at(0.8).toFixed(0), at10: +at(1.0).toFixed(0), end: after.length ? +after[after.length - 1].turned.toFixed(0) : null,
      peak: +Math.max(...after.map((r) => r.rate)).toFixed(0),
      onset: onsetIndex < 0 ? null : +(after[onsetIndex].t - 0.2).toFixed(2), span: +span.toFixed(2), spanTurn: +spanTurn.toFixed(0), spanMean: +((spanTurn / DEG) / span).toFixed(2),
      onset1s: +fromOnset(1).toFixed(0),
      finMax: +Math.max(...moveRows.map((r) => r.fin)).toFixed(0), slipTime: +(slip.length * STEP).toFixed(2), firstSlip: firstSlip < 0 ? null : +(moveRows[firstSlip].t - 0.2).toFixed(2), regrip: Number.isFinite(regrip) ? +regrip.toFixed(2) : null,
      rollInSlip: slip.length ? +Math.min(...slip.map((r) => Math.abs(r.roll))).toFixed(0) : null, rollMax: +Math.max(...moveRows.map((r) => Math.abs(r.roll))).toFixed(0),
      v0: +v0.toFixed(2), kept1: at1 ? +(at1.v / v0).toFixed(2) : null, least: +Math.min(...after.map((r) => r.v)).toFixed(2),
      driftMax: +Math.max(...moveRows.map((r) => Math.abs(r.drift))).toFixed(0), noseMax: +Math.max(...moveRows.map((r) => r.pitch)).toFixed(0),
    },
    fan: {
      kg: +kg.toFixed(1), kgAt10: +kgAt10.toFixed(1), at10s: +tAt10.toFixed(2), peakFlux: +peakFlux.toFixed(0),
      aftApex: +aftApex.toFixed(2), aftApexAt: Number.isFinite(aftApexAt) ? +(aftApexAt - 0.2).toFixed(2) : null, rootAft: +rootAft.toFixed(2), meanFrom: +meanFrom.toFixed(2),
      drawn95: +pct(apexes, 0.95).toFixed(2), drawnMax: +Math.max(0, ...apexes).toFixed(2), drops: drops.length,
      offHeading: +weightedPct(azHeading, 0.5).toFixed(0), offPath: +weightedPct(azPath, 0.5).toFixed(0), elevation: +weightedPct(elev, 0.5).toFixed(0),
      spread: +(weightedPct(azWorld, 0.9) - weightedPct(azWorld, 0.1)).toFixed(0),
    },
    trace: process.env.TRACE ? rows.filter((_, k) => k % 3 === 0).map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, +v.toFixed(2)]))) : undefined,
  };
}

it('turn and fan', () => {
  (globalThis as unknown as { __snapProbe?: Record<string, number> }).__snapProbe = JSON.parse(process.env.PROBE ?? '{}');
  const out: unknown[] = [];
  for (const speed of SPEEDS) for (const across of CASE === 'flat' ? [0] : ACROSS) for (const move of MOVES) {
    const water = CASE === 'flat' ? new PlaneWater() : new PlaneWater({ slopeZ: -Math.tan(15 / DEG) });
    const rig = rigOn(water, CASE === 'flat' ? 0 : -across, speed);
    const steerSign = CASE === 'flat' ? -1 : 1;
    out.push({ case: CASE === 'flat' ? `flat ${speed}: ${move}` : `climb ${across}° ${speed}: ${move}`, ...measure(rig, water, steerSign, move) });
  }
  writeFileSync(OUT, JSON.stringify(out, null, 1));
});
