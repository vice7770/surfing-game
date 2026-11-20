// Step 3.2q: **where the board's yaw comes from**, on the owner's own acceptance test (the same movement as
// `hold.probe.ts`: a compressed turn on the Canyon-matched face to take the wave on the side).
//
// Part 14 left the round's one question: both riders put the board on a big rail (old 54-94 degrees, new 24.6-89.6)
// and the old rider's heading comes round 40.6-91.6 degrees while the new rider's comes round 1.9-31.9. So the lean
// arrives, the rail arrives, and the turn does not follow. This probe answers two things the peaks cannot:
//
//  1. **The yaw ledger** (`BoardBody.yawLedger`, a measurement tool switched on here and nowhere else): who twisted
//     the board about the world's up, substep by substep - hull pressure, the fins, the rail side faces, friction,
//     buoyancy, the water's inertia, and the residual the rider's coupling carries through the feet.
//  2. **The rail and the yaw rate in time**, not as peaks over the run: a peak rail taken in the fall is not a rail
//     the rider ever used, and the roll-plant lab's number to compare against is a *held* rail's steady yaw rate
//     (0.0172-0.0286 rad/s per degree at 5-9 m/s, `../roll-plant/README.md` 3.1).
//
// ASSIST ablates the old rider's two gameplay rules (`COMPRESS_PULL`, `CARVE_CARRY`, `LEAN_OUT_PULL`), which 3.2e
// switched off for the new rider and which the owner's no-hidden-motors rule forbids:
//   all (default, nothing patched) | off (all three zeroed) | nopull | nocarry | noleanout | on (the new rider
//   given the old rider's three, as a diagnostic only - it is a hidden motor and cannot ship).
//
//   OUT=/tmp/y.jsonl RIDER=new PART=test npx vitest run --config docs/research/new-rider/3.2/vitest.probe.config.ts yawsource
//
// PART=test emits one line per run; TRACE=1 also writes every frame to $OUT_TRACE.
import { it } from 'vitest';
import { Vector3 } from 'three';
import type { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';
import { createWaterSample } from '../../../../src/physics/SurfWater';
import { STEP, emit, place, r, state, type Rig } from '../../board-in-water/lab';
import { appendFileSync } from 'node:fs';

const RIDER = process.env.RIDER === 'new' ? 'new' : 'old';
const PARTS = (process.env.PART ?? 'test').split(',');
const EXTRAS = (process.env.EXTRAS ?? '0,1.5,3').split(',').map(Number);
const STEERS = (process.env.STEERS ?? '0.5,1').split(',').map(Number);
const STANCES = (process.env.STANCES ?? 'compress,tall').split(',') as Stance[];
const ASSIST = process.env.ASSIST ?? 'all';
const TRACE = process.env.TRACE === '1';
const ACROSS = Number(process.env.ACROSS ?? 85);
const HOLD = Number(process.env.HOLD ?? 5);
const TURN_LIMIT = Number(process.env.TURN_LIMIT ?? 4);
const DEG = 180 / Math.PI;
type Stance = 'tall' | 'crouch' | 'compress';
const FALL = new Vector3(0, 0, 1);
const CANYON = { depth: 2.6, height: 1.4, slope: 16, speed: 5.7 };

function stance(rig: Rig, s: Stance): void {
  rig.rider!.crouch = s === 'crouch' ? 1 : s === 'compress' ? 0.6 : 0;
  rig.rider!.compress = s === 'compress' ? 1 : 0;
}

/**
 * The ablation. `compressAssist` writes the three gameplay pulls into the rider's own vectors and nothing else reads
 * them before `external` is summed on the next line, so wrapping it is exactly switching a rule off (or, for `on`,
 * letting the new rider run the old rule by lifting its own early return for the length of the call).
 */
function ablate(rider: AttachedRider, mode: string): void {
  if (mode === 'all') return;
  type Inner = { compressAssist(board: BoardBody): void; newRider: boolean; assistForce: Vector3; carryForce: Vector3; leanOutForce: Vector3 };
  const self = rider as unknown as Inner;
  const inner = self.compressAssist.bind(self);
  self.compressAssist = (board: BoardBody) => {
    if (mode === 'on') {
      const was = self.newRider;
      self.newRider = false;
      inner(board);
      self.newRider = was;
      return;
    }
    inner(board);
    if (mode === 'off' || mode === 'nopull') self.assistForce.set(0, 0, 0);
    if (mode === 'off' || mode === 'nocarry') self.carryForce.set(0, 0, 0);
    if (mode === 'off' || mode === 'noleanout') self.leanOutForce.set(0, 0, 0);
  };
}

/** Mean of a list, and its median. */
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : Number.NaN);
const median = (xs: number[]) => {
  if (!xs.length) return Number.NaN;
  const s = [...xs].sort((a, b) => a - b);
  const i = s.length >> 1;
  return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
};

it('where the board yaw comes from, on the owner\'s acceptance test', () => {
  if (!PARTS.includes('test')) return;
  BoardBody.yawLedger = true;
  const sample = createWaterSample();
  for (const st of STANCES) for (const extra of EXTRAS) for (const steer of STEERS) {
    const water = new FaceWater({ depth: CANYON.depth, height: CANYON.height, slope: CANYON.slope, speed: CANYON.speed });
    const atZ = water.crestZ() + 0.75 * water.front;
    const entry = (water.speed - water.sampleAt(0, 10, atZ, sample).flowZ) / Math.cos(45 / DEG) + extra;
    const rig = place(water, atZ, -45, entry, 'standing');
    stance(rig, st);
    ablate(rig.rider!, ASSIST);
    const board = rig.board;
    const fwd = new Vector3();
    const fromFall = () => {
      fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
      return Math.acos(Math.max(-1, Math.min(1, fwd.dot(FALL)))) * DEG;
    };
    // The board's heading and its path's heading in the level plane, unwrapped, so their rates can be differenced.
    const azimuth = () => {
      fwd.set(0, 0, 1).applyQuaternion(board.orientation);
      return Math.atan2(fwd.x, fwd.z) * DEG;
    };
    const pathAzimuth = () => {
      const s = water.sampleAt(board.position.x, board.position.y, board.position.z, sample);
      const vx = board.velocity.x - s.flowX;
      const vz = board.velocity.z - s.flowZ;
      return Math.hypot(vx, vz) > 0.05 ? Math.atan2(vx, vz) * DEG : Number.NaN;
    };
    let phase = 'turn';
    let fell = '';
    let fellAt = Number.NaN;
    let acrossAt = Number.NaN;
    let maxFromFall = fromFall();
    let minFromFall = maxFromFall;
    // The heading the board really rotates: signed from the start, and the whole swing whichever way it went.
    // `maxFromFall` cannot see this, because the angle from the fall line is unsigned and a bottom turn passes
    // *through* the fall line: a board that has swung 120 degrees reads 30 if it stops 30 past the line.
    let netTurn = 0;
    let swung = 0;
    let fellSpeed = Number.NaN;
    let fellRoll = Number.NaN;
    let fellBank = Number.NaN;
    let lastAz = azimuth();
    let lastPath = pathAzimuth();
    // Collected over the turn phase only (the stick over), and only while the board is on a rail worth the name.
    const ratio: number[] = [];
    const rails: number[] = [];
    const yawRates: number[] = [];
    const pathRates: number[] = [];
    const slips: number[] = [];
    const speeds: number[] = [];
    const led: Record<string, number[]> = { pressure: [], fins: [], rails: [], friction: [], buoyancy: [], addedMass: [], radiation: [], rider: [], gyro: [], total: [] };
    const sideways: Record<string, number[]> = { pressure: [], fins: [], rails: [], friction: [], buoyancy: [] };
    // The turn's own force budget, in system weights, across the path (+ toward the inside of the turn): what the turn
    // needs (m v omega), what the lean asks for (tan of the bank, the textbook banked turn), what the water gives (the
    // sum of `sideways`) and what the gameplay rules give with no reaction in the water.
    const needed: number[] = [];
    const asked: number[] = [];
    const ruleSide: number[] = [];
    const ruleAlong: number[] = [];
    rig.rider!.steer = steer;
    for (let i = 0; i < Math.round((TURN_LIMIT + HOLD) / STEP); i += 1) {
      const t = (i + 1) * STEP;
      (water as { advance?: (dt: number) => void }).advance?.(STEP);
      board.step(STEP, water);
      const s = state(rig, water, t);
      const ff = fromFall();
      maxFromFall = Math.max(maxFromFall, ff);
      minFromFall = Math.min(minFromFall, ff);
      const az = azimuth();
      const path = pathAzimuth();
      const wrap = (d: number) => ((d + 540) % 360) - 180;
      const yawRate = wrap(az - lastAz) / STEP;
      netTurn += wrap(az - lastAz);
      swung += Math.abs(wrap(az - lastAz));
      const pathRate = wrap(path - lastPath) / STEP;
      lastAz = az;
      lastPath = path;
      if (phase === 'turn' && Number.isFinite(yawRate)) {
        rails.push(s.roll);
        yawRates.push(yawRate);
        if (Number.isFinite(pathRate)) pathRates.push(pathRate);
        slips.push(s.slip);
        speeds.push(s.speed);
        // The turn per degree of rail, with the sign of the rail taken out: the roll-plant lab's ratio.
        if (Math.abs(s.roll) > 5) ratio.push(Math.abs(yawRate) / Math.abs(s.roll) * Math.sign(yawRate * s.roll));
        // With the turn's own sign taken out, so + drives the turn the stick asked for and − resists it.
        const sgn = Math.sign(yawRate) || 1;
        for (const key of Object.keys(led)) led[key].push(sgn * (board.yaw as unknown as Record<string, number>)[key]);
        // Each water force across the board's own path, in system weights (+ toward the inside of the turn).
        const inside = new Vector3(fwd.z, 0, -fwd.x).normalize().multiplyScalar(Math.sign(pathRate) || 1);
        const alongPath = new Vector3(fwd.x, 0, fwd.z).normalize();
        const weight = (board.mass + rig.rider!.mass) * 9.81;
        for (const key of Object.keys(sideways)) sideways[key].push((board.forces as unknown as Record<string, Vector3>)[key].dot(inside) / weight);
        needed.push((s.speed * Math.abs(pathRate / DEG)) / 9.81);
        asked.push(Math.abs(Math.tan(s.bank / DEG)));
        const rules = (rig.rider as unknown as { assistForce: Vector3; carryForce: Vector3; leanOutForce: Vector3 });
        const rule = new Vector3().copy(rules.assistForce).add(rules.carryForce).add(rules.leanOutForce);
        ruleSide.push(rule.dot(inside) / weight);
        ruleAlong.push(rule.dot(alongPath) / weight);
      }
      if (TRACE && process.env.OUT_TRACE) {
        appendFileSync(process.env.OUT_TRACE, `${JSON.stringify({
          rider: RIDER, assist: ASSIST, stance: st, extra, steer, t: r(t, 3), phase,
          fromFall: r(ff, 2), yawRate: r(yawRate, 2), pathRate: r(pathRate, 2), roll: r(s.roll, 2), slip: r(s.slip, 2),
          speed: r(s.speed, 2), bank: r(s.bank, 2), load: r(s.load, 2),
          // The lean hold's own cap this frame, degrees (step 3.2q; `Infinity` with it off).
          leanHeldDeg: r((rig.rider as unknown as { leanHeld: number }).leanHeld * DEG, 1),
          yaw: Object.fromEntries(Object.entries(board.yaw).map(([k, v]) => [k, r(v as number, 2)])),
        })}\n`);
      }
      if (phase === 'turn' && (ff >= ACROSS || t >= TURN_LIMIT)) {
        phase = 'hold';
        acrossAt = t;
        rig.rider!.steer = 0;
      }
      if (s.fell) { fell = s.fell; fellAt = t; fellSpeed = s.speed; fellRoll = s.roll; fellBank = s.bank; break; }
    }
    emit({
      bar: 'yawsource', rider: RIDER, assist: ASSIST, stance: st, extra, steer,
      reachedAcross: maxFromFall >= ACROSS, turnedDeg: r(maxFromFall - 45, 1),
      netTurnDeg: r(netTurn, 1), swungDeg: r(swung, 1), minFromFallDeg: r(minFromFall, 1), maxFromFallDeg: r(maxFromFall, 1),
      fellSpeedMs: r(fellSpeed, 2), fellRollDeg: r(fellRoll, 1), fellBankDeg: r(fellBank, 1),
      held: !fell, fell, fellAtS: r(fellAt, 2), acrossAtS: r(acrossAt, 2),
      // In the turn phase: the rail the board actually carried, and the turn it made per degree of it.
      railMeanDeg: r(mean(rails.map(Math.abs)), 1), railMedianDeg: r(median(rails.map(Math.abs)), 1), railPeakDeg: r(Math.max(...rails.map(Math.abs)), 1),
      yawRateMedian: r(median(yawRates.map(Math.abs)), 2), yawPerRailMedian: r(median(ratio), 4), yawPerRailMean: r(mean(ratio), 4),
      pathRateMedian: r(median(pathRates.map(Math.abs)), 2), slipMedianDeg: r(median(slips.map(Math.abs)), 2), speedMedianMs: r(median(speeds), 2),
      frames: rails.length,
      yawNm: Object.fromEntries(Object.entries(led).map(([k, v]) => [k, r(mean(v), 2)])),
      sideG: Object.fromEntries(Object.entries(sideways).map(([k, v]) => [k, r(mean(v), 3)])),
      // The budget: the turn the path actually made, what the bank asks for, what the water gave, what the rules gave.
      neededG: r(median(needed), 3), askedG: r(median(asked), 3), waterSideG: r(mean(Object.values(sideways).map((v) => mean(v))) * Object.keys(sideways).length, 3),
      ruleSideG: r(median(ruleSide), 3), ruleAlongG: r(median(ruleAlong), 3),
    });
  }
  BoardBody.yawLedger = false;
});
