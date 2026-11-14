// The owner's own acceptance test (2026-11-13, through the coordinator): **a compressed turn to take the wave on the
// side must never fall.** In his words: "No surfer falls from turning to get the wave on the side while compressed, he
// might fall in high speeds or if he tries to cut the wave but never like that."
//
// So this is not a bar I invented and it is not a count out of eight. It is one movement, the safest thing a surfer
// does, and the rule is that it holds. It also gives the shape the owner asked for: **the fall rate must rise with
// speed**, because he is stable at low speed and loses the turn as the speed comes up. A flat failure across speed is
// wrong in shape as well as in level.
//
// The movement, per run: placed in trim on the **Canyon-matched wave face** (`FaceWater`, the same wave the turn-pair
// probe uses: 1.4 m, 2.6 m deep, 16 degrees, running at 5.7 m/s), 0.75 face lengths ahead of the crest and heading 45
// degrees off the fall line at the wave's own pace plus `extra`,
// Compress held, then the stick put over to `steer` until the board has turned `TURN` degrees — "the wave on the
// side" — and then **centred and held** for `HOLD` s while Compress stays on. A run passes if the rider is still up
// at the end. Nothing is asked of him after the turn: he has taken the wave on the side and is riding it.
//
//   OUT=/tmp/h.jsonl RIDER=new PART=hold npx vitest run --config docs/research/new-rider/3.2/vitest.probe.config.ts hold
//
// SPEEDS (5,6,7,9,12), STEERS (0.5,1), TURN (50 degrees), HOLD (5 s), STANCES (compress,tall).
// BALANCE='{"leanRate":1.4,"railCap":12}' sweeps the new surfer's dials without touching game code.
// **A plane cannot carry this test, and the first cut of it was wrong.** On `Slope` the stick centred leaves nothing
// to hold a line: the board keeps turning until it points up the slope, slows and drops the rider. That version failed
// the OLD rider 4 of 20 - the rider the owner calls "closer to reality and enjoyable" - so it was measuring the
// plane's geometry, not the movement. The face has a fall line and a trim direction, so "the wave on the side" means
// something. The old rider's score on this version is reported beside the new one, as the test's own calibration.
import { it } from 'vitest';
import { Vector3 } from 'three';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';
import { createWaterSample } from '../../../../src/physics/SurfWater';
import { STEP, emit, place, r, state, type Rig } from '../../board-in-water/lab';

const RIDER = process.env.RIDER === 'new' ? 'new' : 'old';
const PARTS = (process.env.PART ?? 'hold').split(',');
/** Extra speed through the water over the wave's own pace along a 45 degree line, m/s. */
const EXTRAS = (process.env.EXTRAS ?? '0,1.5,3').split(',').map(Number);
const STEERS = (process.env.STEERS ?? '0.5,1').split(',').map(Number);
const STANCES = (process.env.STANCES ?? 'compress,tall').split(',') as Stance[];
const HEIGHTS = (process.env.HEIGHTS ?? '1.4').split(',').map(Number);
/** How far off the fall line counts as "the wave on the side", degrees. */
const ACROSS = Number(process.env.ACROSS ?? 85);
/** How long he must then stay up with the stick centred, s. */
const HOLD = Number(process.env.HOLD ?? 5);
/** The turn's own time limit, s: a rider who never comes round is not held for ever. */
const TURN_LIMIT = Number(process.env.TURN_LIMIT ?? 4);
const DEG = 180 / Math.PI;
type Stance = 'tall' | 'crouch' | 'compress';
const FALL = new Vector3(0, 0, 1);
/** The Canyon's arm wave, as the turn-pair probe matches it (`docs/research/turn-pair-2026-11-10`). */
const CANYON: Record<string, { depth: number; slope: number; speed: number }> = {
  '1.4': { depth: 2.6, slope: 16, speed: 5.7 }, '1.95': { depth: 3.7, slope: 16, speed: 6.8 },
};

function stance(rig: Rig, s: Stance): void {
  rig.rider!.crouch = s === 'crouch' ? 1 : s === 'compress' ? 0.6 : 0;
  rig.rider!.compress = s === 'compress' ? 1 : 0;
}

it("the owner's acceptance test: a compressed turn to take the wave on the side must hold", () => {
  if (!PARTS.includes('hold')) return;
  const sample = createWaterSample();
  for (const h of HEIGHTS) for (const st of STANCES) for (const extra of EXTRAS) for (const steer of STEERS) {
    const m = CANYON[String(h)];
    const water = new FaceWater({ depth: m.depth, height: h, slope: m.slope, speed: m.speed });
    const atZ = water.crestZ() + 0.75 * water.front;
    const entry = (water.speed - water.sampleAt(0, 10, atZ, sample).flowZ) / Math.cos(45 / DEG) + extra;
    const rig = place(water, atZ, -45, entry, 'standing');
    stance(rig, st);
    // The board's heading from the fall line: 0 straight down the face, 90 across it.
    const fromFall = () => {
      const f = new Vector3(0, 0, 1).applyQuaternion(rig.board.orientation).setY(0).normalize();
      return Math.acos(Math.max(-1, Math.min(1, f.dot(FALL)))) * DEG;
    };
    let phase = 'turn';
    let fell = '';
    let fellAt = Number.NaN;
    let acrossAt = Number.NaN;
    let peakRail = 0;
    let peakBank = 0;
    let speedAcross = Number.NaN;
    let maxFromFall = fromFall();
    // The rail the bite is read against (`AttachedRider.prepareBank`): the board's roll about its heading, taken from
    // the WATER's surface under the board rather than the world's level. RAIL_BITE is 48 degrees of this.
    const side = new Vector3();
    const boardUp = new Vector3();
    const waterUp = new Vector3();
    const railNow = () => {
      const f = new Vector3(0, 0, 1).applyQuaternion(rig.board.orientation).setY(0).normalize();
      side.set(-f.z, 0, f.x);
      boardUp.set(0, 1, 0).applyQuaternion(rig.board.orientation);
      const w = water.sampleAt(rig.board.position.x, rig.board.position.y, rig.board.position.z, sample);
      waterUp.set(w.normalX, w.normalY, w.normalZ).normalize();
      return Math.atan2(boardUp.dot(side), boardUp.y) - Math.atan2(waterUp.dot(side), waterUp.y);
    };
    let peakRailWater = 0;
    let pastBiteFor = 0;
    rig.rider!.steer = steer;
    for (let i = 0; i < Math.round((TURN_LIMIT + HOLD) / STEP); i += 1) {
      const t = (i + 1) * STEP;
      (water as { advance?: (dt: number) => void }).advance?.(STEP);
      rig.board.step(STEP, water);
      const s = state(rig, water, t);
      peakRail = Math.max(peakRail, Math.abs(s.roll));
      const rw = Math.abs(railNow()) * DEG;
      peakRailWater = Math.max(peakRailWater, rw);
      if (rw > 48) pastBiteFor += STEP;
      peakBank = Math.max(peakBank, Math.abs(rig.rider!.bank.angle * DEG));
      const ff = fromFall();
      maxFromFall = Math.max(maxFromFall, ff);
      if (phase === 'turn' && (ff >= ACROSS || t >= TURN_LIMIT)) {
        phase = 'hold';
        acrossAt = t;
        speedAcross = s.speed;
        rig.rider!.steer = 0;
      }
      if (process.env.TRACE === '1' && h === HEIGHTS[0] && st === STANCES[0] && extra === EXTRAS[0] && steer === STEERS[0]
        && [0.1, 0.2, 0.3, 0.4, 0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.8, 2.1, 2.5, 3, 3.5].some((mk) => Math.abs(t - mk) < STEP / 2)) {
        // The rail the bite is read against, the rest the balance sent, and what the reference asked for.
        const q = rig.rider as unknown as {
          railAhead: number; schedRail: number; ankleRest: number; heldAnkleRaw: number; leanAsked: number;
          bankReference: number; bank: { angle: number }; contact: { load: number };
        };
        emit({
          bar: 'holdTrace', rider: RIDER, t: r(t, 3), fromFall: r(ff, 1), rollWorld: r(s.roll, 1),
          railAhead: r(q.railAhead * DEG, 1), schedRail: r(q.schedRail * DEG, 1),
          ankleRest: r(q.ankleRest * DEG, 2), rawRest: r((q.heldAnkleRaw ?? 0) * DEG, 2),
          leanAsked: r(q.leanAsked * DEG, 1), bankRef: r(q.bankReference * DEG, 1), bank: r(q.bank.angle * DEG, 1),
          load: r(q.contact.load, 2), v: r(s.speed, 2),
        });
      }
      if (s.fell) { fell = s.fell; fellAt = t; break; }
    }
    emit({
      bar: 'hold', rider: RIDER, height: h, stance: st, extra, steer,
      entryMs: r(entry, 2), reachedAcross: maxFromFall >= ACROSS, maxFromFallDeg: r(maxFromFall, 1),
      acrossAtS: r(acrossAt, 2), speedAcrossMs: r(speedAcross, 2),
      peakRailDeg: r(peakRail, 1), peakRailWaterDeg: r(peakRailWater, 1), pastBiteS: r(pastBiteFor, 2), peakBankDeg: r(peakBank, 1),
      held: !fell, fellIn: fell ? phase : '', fell, fellAtS: r(fellAt, 2),
      lean: r((rig.rider as unknown as { leanPace?: number }).leanPace ?? 0, 2),
      railCapDeg: r(((rig.rider as unknown as { railCap?: number }).railCap ?? 0) * DEG, 1),
    });
  }
});
