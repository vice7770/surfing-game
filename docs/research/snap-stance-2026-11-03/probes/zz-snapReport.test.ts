import { writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { it } from 'vitest';
import { createBoardSpraySheet } from './boardSpray';
import type { BoardBody } from './BoardBody';
import type { AttachedRider } from './AttachedRider';
import { acrossFace, deg, flat, headingOf, STEP } from './zz-snapLab';

type Setup = ReturnType<typeof acrossFace>;
const sheets = [createBoardSpraySheet(), createBoardSpraySheet()];

/** Run a phase script; returns per-frame records from `from` s. */
function run(setup: Setup, seconds: number, script: (t: number, rider: AttachedRider, board: BoardBody) => void, from = 0) {
  const { board, rider, water, normal } = setup;
  const rows: { t: number; turned: number; rate: number; speed: number; drift: number; fin: number; flux: number; fluxZ: number; vy: number; attached: boolean }[] = [];
  let last = headingOf(board); let turned = 0;
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) {
    const t = i * STEP;
    script(t, rider, board);
    board.step(STEP, water);
    const now = headingOf(board); const d = Math.atan2(Math.sin(now - last), Math.cos(now - last)); last = now;
    if (t + 1e-9 >= from) turned += d;
    const fwd = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
    const fp = fwd.clone().addScaledVector(normal, -fwd.dot(normal)).normalize();
    const vp = board.velocity.clone().addScaledVector(normal, -board.velocity.dot(normal));
    const drift = vp.lengthSq() > 1e-6 ? deg(Math.atan2(fp.clone().cross(vp.clone().normalize()).dot(normal), fp.dot(vp.normalize()))) : 0;
    const arm = new Vector3(0, 0, -board.shape.length / 2 + 0.09).sub(new Vector3(board.shape.centerOfMass.x, board.shape.centerOfMass.y, board.shape.centerOfMass.z)).applyQuaternion(board.orientation);
    const vb = board.velocity.clone().add(new Vector3().crossVectors(board.angularVelocity, arm)).applyQuaternion(board.orientation.clone().invert());
    const count = board.spraySheets(sheets);
    let flux = 0; let fluxZ = 0; let vy = 0;
    for (let k = 0; k < count; k += 1) { flux += sheets[k].flux; fluxZ += sheets[k].flux * sheets[k].boardZ; vy = Math.max(vy, sheets[k].vy); }
    if (t + 1e-9 >= from) rows.push({ t: t + STEP - from, turned: deg(turned), rate: deg(Math.abs(d) / STEP), speed: board.velocity.length(), drift, fin: deg(Math.abs(Math.atan2(vb.x, Math.max(1e-6, vb.z)))), flux, fluxZ: flux > 0 ? fluxZ / flux : NaN, vy, attached: rider.attached });
    if (!rider.attached) break;
  }
  return rows;
}

function measures(rows: ReturnType<typeof run>, speed0: number) {
  const on = rows.filter((r) => r.attached);
  const at = (s: number) => on.find((r) => r.t >= s - 1e-9) ?? on[on.length - 1];
  const t150 = on.find((r) => Math.abs(r.turned) >= 150);
  const t120 = on.find((r) => Math.abs(r.turned) >= 120);
  const fell = rows.find((r) => !r.attached);
  const peakFlux = Math.max(...on.map((r) => r.flux));
  const peakRow = on.find((r) => r.flux === peakFlux);
  return {
    peak: Math.round(Math.max(...on.map((r) => r.rate))), at05: Math.round(at(0.5).turned), at08: Math.round(at(0.8).turned), at1: Math.round(at(1).turned),
    end: Math.round(on[on.length - 1].turned), t120: t120 ? +t120.t.toFixed(2) : null, t150: t150 ? +t150.t.toFixed(2) : null,
    kept08: +(at(0.8).speed / speed0).toFixed(2), kept1: +(at(1).speed / speed0).toFixed(2), least: +(Math.min(...on.map((r) => r.speed)) / speed0).toFixed(2),
    drift: Math.round(Math.max(...on.map((r) => Math.abs(r.drift)))), fin: Math.round(Math.max(...on.map((r) => r.fin))),
    sprayPeak: +peakFlux.toFixed(2), sprayMean: +(on.reduce((a, r) => a + r.flux, 0) / on.length).toFixed(2), sprayZ: peakRow ? +peakRow.fluxZ.toFixed(2) : null, sprayVy: +Math.max(...on.map((r) => r.vy)).toFixed(1),
    fell: fell ? +fell.t.toFixed(2) : null,
  };
}

it('snap report', () => {
  const out: Record<string, unknown>[] = [];
  const add = (name: string, setup: Setup, seconds: number, script: (t: number, rider: AttachedRider) => void, from = 0.2) => {
    let speed0 = 0;
    const rows = run(setup, seconds + from, (t, rider, board) => { if (Math.abs(t - from) < 1e-9) speed0 = board.velocity.length(); script(t, rider); }, from);
    out.push({ case: name, v0: +speed0.toFixed(1), ...measures(rows, speed0) });
  };
  for (const speed of [6.7, 8]) {
    add(`climb 150°, ${speed}: steer`, acrossFace(150, speed), 1.4, (t, r) => { if (t >= 0.2) r.steer = 1; });
    add(`climb 150°, ${speed}: steer + S`, acrossFace(150, speed), 1.4, (t, r) => { if (t >= 0.2) { r.steer = 1; r.trim = -1; } });
    add(`climb 150°, ${speed}: Snap 0.6 s`, acrossFace(150, speed), 1.4, (t, r) => { if (t >= 0.2) { r.steer = 1; r.snap = t < 0.8 ? 1 : 0; } });
    add(`climb 150°, ${speed}: Snap held`, acrossFace(150, speed), 1.4, (t, r) => { if (t >= 0.2) { r.steer = 1; r.snap = 1; } });
  }
  for (const speed of [7, 9]) {
    add(`flat, ${speed}: carve`, flat(speed), 1.4, (t, r) => { if (t >= 0.2) r.steer = 1; });
    add(`flat, ${speed}: Compress`, flat(speed), 1.4, (t, r) => { if (t >= 0.2) { r.steer = 1; r.compress = 1; r.crouch = 0.6; } });
    add(`flat, ${speed}: Snap 0.6 s`, flat(speed), 1.4, (t, r) => { if (t >= 0.2) { r.steer = 1; r.snap = t < 0.8 ? 1 : 0; } });
    add(`flat, ${speed}: Snap held`, flat(speed), 1.4, (t, r) => { if (t >= 0.2) { r.steer = 1; r.snap = 1; } });
  }
  for (const speed of [7, 9]) {
    add(`cutback 80°, ${speed}: steer`, acrossFace(80, speed), 2, (t, r) => { if (t >= 0.2) r.steer = -1; });
    add(`cutback 80°, ${speed}: Snap 0.6 s`, acrossFace(80, speed), 2, (t, r) => { if (t >= 0.2) { r.steer = -1; r.snap = t < 0.8 ? 1 : 0; } });
    add(`cutback 80°, ${speed}: carve 0.4 s, then Snap 0.6 s`, acrossFace(80, speed), 2, (t, r) => { if (t >= 0.2) { r.steer = -1; r.snap = t >= 0.6 && t < 1.2 ? 1 : 0; } });
    add(`cutback 80°, ${speed}: Snap held`, acrossFace(80, speed), 2, (t, r) => { if (t >= 0.2) { r.steer = -1; r.snap = 1; } });
  }
  writeFileSync(process.env.OUT ?? '/dev/null', JSON.stringify(out, null, 1));
});

/** The surfing order: a compressed bottom turn from across the face up to `top`° from the fall line, then the top turn. */
it('surfing order', () => {
  const out: Record<string, unknown>[] = [];
  for (const speed of [8, 9, 10]) {
    for (const mode of ['steer back', 'Snap 0.6 s', 'neutral 0.3 s, Snap 0.6 s', 'Snap 0.6 s, no steer first 0.2 s']) {
      const setup = acrossFace(90, speed);
      const { board, rider, water } = setup;
      for (let i = 0; i < 12; i += 1) board.step(STEP, water);
      const fromFall = () => Math.abs(deg(headingOf(board)));
      rider.steer = -1; rider.compress = 1; rider.crouch = 0.6;
      let bottom = 0; const v0 = board.velocity.length(); let peakBottom = 0; let last = headingOf(board);
      for (let i = 0; i < 180 && rider.attached && fromFall() < 120; i += 1) {
        board.step(STEP, water); bottom += STEP;
        const now = headingOf(board); peakBottom = Math.max(peakBottom, Math.abs(Math.atan2(Math.sin(now - last), Math.cos(now - last))) / STEP); last = now;
      }
      const vTop = board.velocity.length();
      rider.compress = 0; rider.crouch = 0;
      let turned = 0; let peak = 0; let lowest = 180; let fell: number | null = null; let t120: number | null = null; let vMin = Infinity;
      for (let i = 0; i < 150; i += 1) {
        const t = i * STEP;
        const neutral = mode.startsWith('neutral') ? 0.3 : 0;
        rider.steer = mode === 'steer back' ? 1 : t < neutral ? 0 : mode.includes('no steer first') && t < 0.2 ? 0 : 1;
        rider.snap = mode === 'steer back' ? 0 : t >= neutral && t < neutral + 0.6 ? 1 : 0;
        board.step(STEP, water);
        if (!rider.attached) { fell = +(t + STEP).toFixed(2); break; }
        const now = headingOf(board); const d = Math.atan2(Math.sin(now - last), Math.cos(now - last)); last = now; turned += d;
        peak = Math.max(peak, Math.abs(d) / STEP); lowest = Math.min(lowest, fromFall()); vMin = Math.min(vMin, board.velocity.length());
        if (t120 === null && deg(turned) >= 120) t120 = +(t + STEP).toFixed(2);
      }
      out.push({ case: `${speed} m/s: ${mode}`, bottom: `${+bottom.toFixed(2)} s, ${Math.round(deg(peakBottom))}°/s`, kept: +(vTop / v0).toFixed(2), topTurned: Math.round(deg(turned)), peak: Math.round(deg(peak)), lowestFromFall: Math.round(lowest), t120, leastSpeed: +vMin.toFixed(1), fell });
    }
  }
  writeFileSync((process.env.OUT ?? '/dev/null') + '.order.json', JSON.stringify(out, null, 1));
});
