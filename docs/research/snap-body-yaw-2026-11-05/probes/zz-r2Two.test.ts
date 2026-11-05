import { writeFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';
import { createWaterSample, type SurfWater } from './SurfWater';

const STEP = 1 / 60;
const DEG = 180 / Math.PI;
const HOLD1 = Number(process.env.HOLD1 ?? 1.0);
const HOLD2 = Number(process.env.HOLD2 ?? 1.0);
const GAP = Number(process.env.GAP ?? 0.15);
const UP = Number(process.env.UP ?? 150);
const DOWN = Number(process.env.DOWN ?? 45);
const TRACE = process.env.TRACE;
const TRACE_LINES: string[] = ['t\tphase\tfromFall\trate\tspeed\tbank\tpitch\tfront\tleg\ttwist\tload'];
type Move = 'steer' | 'S' | 'compress' | 'snap';

/** A board on the water's surface at (x, z), heading `across`° from the face's fall line toward −x, at `speed` through the water. */
function onWater(water: SurfWater, x: number, z: number, across: number, speed: number) {
  const s = water.sampleAt(x, 10, z, createWaterSample());
  const normal = new Vector3(s.normalX, s.normalY, s.normalZ).normalize();
  const downhill = new Vector3(normal.x, 0, normal.z);
  const fallH = downhill.lengthSq() > 1e-9 ? downhill.normalize() : new Vector3(0, 0, 1);
  const fall = fallH.clone().addScaledVector(normal, -fallH.dot(normal)).normalize();
  const side = new Vector3().crossVectors(normal, fall).normalize();
  const yaw = across / DEG;
  const forward = fall.clone().multiplyScalar(Math.cos(yaw)).addScaledVector(side, -Math.sin(yaw)).normalize();
  const left = new Vector3().crossVectors(normal, forward).normalize();
  const board = new BoardBody();
  const flow = new Vector3(s.flowX, s.flowY, s.flowZ);
  board.place(new Vector3(x, s.surfaceY, z).addScaledVector(normal, board.shape.centerOfMass.y), new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)), forward.clone().multiplyScalar(speed).add(flow));
  const rider = new AttachedRider(board.shape, { phase: 'standing', ...(process.env.BODYYAW === 'on' ? { bodyYaw: 'on' as const } : {}) });
  board.attach(rider);
  return { board, rider, fallH };
}

function twoMoves(water: SurfWater & { advance?: (dt: number) => void }, at: { x: number; z: number }, speed: number, move1: Move, move2: Move) {
  const { board, rider, fallH } = onWater(water, at.x, at.z, 90, speed);
  const sample = createWaterSample();
  const through = () => { water.sampleAt(board.position.x, board.position.y, board.position.z, sample); return Math.hypot(board.velocity.x - sample.flowX, board.velocity.z - sample.flowZ); };
  const fromFall = () => { const f = new Vector3(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize(); return Math.acos(Math.max(-1, Math.min(1, f.dot(fallH)))) * DEG; };
  const heading = () => { const f = new Vector3(0, 0, 1).applyQuaternion(board.orientation); return Math.atan2(f.x, f.z); };
  const set = (kind: Move | 'none', steer: number) => {
    rider.steer = steer; rider.snap = kind === 'snap' ? 1 : 0; rider.compress = kind === 'compress' ? 1 : 0; rider.crouch = kind === 'compress' ? 0.6 : 0; rider.trim = kind === 'S' ? -1 : 0;
  };
  for (let n = 0; n < 12; n += 1) { water.advance?.(STEP); board.step(STEP, water); }
  const rec = (name: string) => ({ name, time: NaN, turned: 0, peak: 0, v0: through(), v1: NaN, body: 0, depth: 0 });
  const moves: ReturnType<typeof rec>[] = [];
  let phase: 'm1' | 'gap' | 'm2' | 'after' = 'm1'; let t0 = 0; let t = 0; let last = heading(); let fell = NaN; let cause = ''; let atFall = '';
  let cur = rec('m1'); moves.push(cur);
  let lowest = 180; let highest = 0;
  for (let n = 0; n < 5 / STEP; n += 1) {
    if (phase === 'm1') { set(move1, -1); if (fromFall() >= UP || t - t0 >= HOLD1) { cur.time = t - t0; cur.v1 = through(); phase = 'gap'; t0 = t; } }
    if (phase === 'gap') { set('none', 0); if (t - t0 >= GAP) { phase = 'm2'; t0 = t; cur = rec('m2'); moves.push(cur); } }
    if (phase === 'm2') { set(move2, 1); if (fromFall() <= DOWN || t - t0 >= HOLD2) { cur.time = t - t0; cur.v1 = through(); phase = 'after'; t0 = t; } }
    if (phase === 'after') { set('none', 0); if (t - t0 > 1.5) break; }
    water.advance?.(STEP);
    board.step(STEP, water);
    t += STEP;
    if (!rider.attached) { fell = t; cause = String(rider.separation); atFall = `${phase}, bank ${Math.round(rider.bank.angle * DEG)}°, ${through().toFixed(1)} m/s, ${Math.round(fromFall())}° from the fall line`; break; }
    const now = heading(); const d = Math.atan2(Math.sin(now - last), Math.cos(now - last)); last = now;
    if (phase === 'm1' || phase === 'm2') { cur.turned += d * DEG; cur.peak = Math.max(cur.peak, Math.abs(d / STEP) * DEG); cur.depth = Math.max(cur.depth, -rider.leg.rest); cur.body = Math.max(cur.body, Math.abs(rider.twist.angle) * DEG); }
    if (phase === 'm1' || phase === 'gap') highest = Math.max(highest, fromFall());
    if (TRACE && n % 3 === 0) TRACE_LINES.push([t.toFixed(2), phase, Math.round(fromFall()), Math.round(d / STEP * DEG), through().toFixed(1), Math.round(rider.bank.angle * DEG), Math.round(Math.asin(new Vector3(0, 0, 1).applyQuaternion(board.orientation).y) * DEG), rider.contact.frontShare.toFixed(2), rider.leg.rest.toFixed(2), Math.round(rider.twist.angle * DEG), rider.contact.load.toFixed(2)].join('\t'));
    if (phase === 'm2' || phase === 'after') lowest = Math.min(lowest, fromFall());
  }
  const f = (x: number, d = 2) => (Number.isFinite(x) ? +x.toFixed(d) : null);
  const show = (m?: ReturnType<typeof rec>) => (m ? `${Math.round(m.turned)}° in ${f(m.time) ?? '—'} s, peak ${Math.round(m.peak)}°/s, kept ${f(m.v1 / m.v0) ?? '—'}, shoulders ${Math.round(m.body)}°, legs ${f(m.depth)} m` : '—');
  return { up: show(moves[0]), highest: Math.round(highest), down: show(moves[1]), lowest: Math.round(lowest), fell: f(fell), cause, atFall };
}

it('two moves from across the face', () => {
  if (TRACE) {
    const [speed, a, b] = TRACE.split(',');
    twoMoves(new PlaneWater({ slopeZ: -Math.tan(15 / DEG) }), { x: 0, z: 0 }, Number(speed), a as Move, b as Move);
    writeFileSync(process.env.OUT ?? '/dev/null', TRACE_LINES.join('\n'));
    return;
  }
  const out: Record<string, unknown>[] = [];
  const pairs: [Move, Move][] = [['steer', 'S'], ['compress', 'S'], ['compress', 'snap'], ['snap', 'snap']];
  for (const speed of [8, 9, 10]) for (const [a, b] of pairs) out.push({ case: `plane 15°, ${speed}: ${a} → ${b}`, ...twoMoves(new PlaneWater({ slopeZ: -Math.tan(15 / DEG) }), { x: 0, z: 0 }, speed, a, b) });
  // The moving face (the pinned tests' FACE_FLOW): the face's water running 1.5 m/s up it.
  const slope = 15 / DEG;
  const up = new Vector3(0, -Math.sin(slope), Math.cos(slope)).multiplyScalar(-1.5);
  for (const speed of [8, 9]) for (const [a, b] of pairs) out.push({ case: `moving 15°, ${speed}: ${a} → ${b}`, ...twoMoves(new PlaneWater({ slopeZ: -Math.tan(slope), flow: { x: up.x, y: up.y, z: up.z } }), { x: 0, z: 0 }, speed, a, b) });
  writeFileSync(process.env.OUT ?? '/dev/null', JSON.stringify(out, null, 1));
});
