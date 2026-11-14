// Step 3.2r: **the load factor the hull actually reaches through the carve, and the speed the carve keeps**, on the
// owner's own acceptance test (the same movement as `yawsource.probe.ts` and `hold.probe.ts`: a turn on the
// Canyon-matched face to take the wave on the side).
//
// Part 15 7 closed with the water-physics advisor's ranked first step: *log the hull's normal force through the carve
// and aim at n = 2.1.* Its reduction of Forsyth et al. 2024 is that a real bottom turn and a real cutback are the same
// manoeuvre at a load factor of 2.1, so omega = n g sin(phi) / v, and a board turning at **constant height** can only
// reach n = 1 / cos(phi) - 64 deg/s at 42 degrees of rail against the measured 109. This probe measures, per frame of
// the turn:
//
//  1. **n**, three ways, all in system weights (board + rider):
//     - `nUp`: every water force on the board projected on the board's own up axis. This is the literal "hull normal
//       force" the advisor asked for, and it is what a rider feels through the feet.
//     - `nPerp`: the magnitude of the water's total force **perpendicular to the path through the water**, which is the
//       aeronautical load factor (lift / weight) and the one `omega = n g sin(phi) / v` is written for.
//     - `nHull`: the hull alone (pressure, buoyancy, added mass, radiation, froth) on the board's up, without the
//       foils or friction, so the bill can be read against the fins.
//  2. **1 / cos(phi)**, the level-flight ceiling at the bank the rider is actually carrying, so the measurement says
//     whether we are below the ceiling (a board that is not even holding its own weight up) or above it (a board that
//     is arresting a drop, like the real thing).
//  3. **the turn the law predicts from the measured n** against the turn the path actually made, which is the test of
//     whether the law describes our board at all.
//  4. **the speed the carve keeps**: speed through the water at 0.5, 1, 1.5 and 2 s of the turn as a fraction of the
//     speed it started with. Forsyth's bottom turns keep 88-95 %; Part 15 10 reports ours keeping about 40.
//  5. **the vertical**: the board's own descent rate and its vertical acceleration, because "arresting a drop" is a
//     statement about those two and not about the bank.
//
//   OUT=/tmp/n.jsonl RIDER=new PART=test npx vitest run --config docs/research/new-rider/3.2/vitest.probe.config.ts load
//
// PART=test emits one line per run; TRACE=1 also writes every frame to $OUT_TRACE.
import { it } from 'vitest';
import { Vector3 } from 'three';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';
import { createWaterSample } from '../../../../src/physics/SurfWater';
import { STEP, emit, place, r, state, type Rig } from '../../board-in-water/lab';
import { appendFileSync } from 'node:fs';

const RIDER = process.env.RIDER === 'new' ? 'new' : 'old';
const PARTS = (process.env.PART ?? 'test').split(',');
const EXTRAS = (process.env.EXTRAS ?? '0,1.5,3').split(',').map(Number);
const STEERS = (process.env.STEERS ?? '0.5,1').split(',').map(Number);
const STANCES = (process.env.STANCES ?? 'compress,tall').split(',') as Stance[];
const TRACE = process.env.TRACE === '1';
const ACROSS = Number(process.env.ACROSS ?? 85);
const HOLD = Number(process.env.HOLD ?? 5);
const TURN_LIMIT = Number(process.env.TURN_LIMIT ?? 4);
const DEG = 180 / Math.PI;
const G = 9.81;
/**
 * The drop. `HEADING` is the heading the board is placed on (−45° is the owner's acceptance test, across the face);
 * `DELAY` holds the stick at zero for that many seconds first, so the board goes down the face and *then* turns, which
 * is the order a real bottom turn happens in. Both default to the acceptance test, so the twelve-run columns above are
 * unchanged. `FACE=h,slope` overrides the test wave's height and face slope (the Canyon-matched 1.4 m / 16° default),
 * because "arresting a drop" is a claim about how much drop the face offers.
 */
const HEADING = Number(process.env.HEADING ?? -45);
const DELAY = Number(process.env.DELAY ?? 0) || 0;
/**
 * The leg stroke, which is the only source of vertical acceleration a gentle face leaves (the advisor's rank 4):
 * `release` enters the turn in Compress and lets the legs extend as the stick goes over (the projection, which is what
 * a surfer drives a bottom turn with); `load` enters tall and compresses under the turn; `off` (the default) holds the
 * stance the run asked for, so the twelve-run columns are unchanged.
 */
const STROKE = process.env.STROKE ?? 'off';
type Stance = 'tall' | 'crouch' | 'compress';
const FALL = new Vector3(0, 0, 1);
const FACE = (process.env.FACE ?? '1.4,16').split(',').map(Number);
const CANYON = { depth: 2.6, height: FACE[0], slope: FACE[1], speed: 5.7 };
/** The water forces the board books; `bed` is in there too but never fires on a face. */
const WATER = ['buoyancy', 'pressure', 'addedMass', 'radiation', 'friction', 'bed', 'fins', 'rails', 'froth'] as const;
/** The hull alone: no foils, no skin friction. */
const HULL = ['buoyancy', 'pressure', 'addedMass', 'radiation', 'froth'] as const;

function stance(rig: Rig, s: Stance): void {
  rig.rider!.crouch = s === 'crouch' ? 1 : s === 'compress' ? 0.6 : 0;
  rig.rider!.compress = s === 'compress' ? 1 : 0;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : Number.NaN);
const median = (xs: number[]) => {
  if (!xs.length) return Number.NaN;
  const s = [...xs].sort((a, b) => a - b);
  const i = s.length >> 1;
  return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
};
const peak = (xs: number[]) => (xs.length ? Math.max(...xs) : Number.NaN);

it('the load factor through the carve, on the owner\'s acceptance test', () => {
  if (!PARTS.includes('test')) return;
  const sample = createWaterSample();
  for (const st of STANCES) for (const extra of EXTRAS) for (const steer of STEERS) {
    const water = new FaceWater({ depth: CANYON.depth, height: CANYON.height, slope: CANYON.slope, speed: CANYON.speed });
    const atZ = water.crestZ() + 0.75 * water.front;
    const entry = (water.speed - water.sampleAt(0, 10, atZ, sample).flowZ) / Math.cos(45 / DEG) + extra;
    const rig = place(water, atZ, HEADING, entry, 'standing');
    stance(rig, STROKE === 'release' ? 'compress' : STROKE === 'load' ? 'tall' : st);
    const board = rig.board;
    const weight = (board.mass + rig.rider!.mass) * G;
    const fwd = new Vector3();
    const up = new Vector3();
    const total = new Vector3();
    const hull = new Vector3();
    const vRel = new Vector3();
    const perp = new Vector3();
    const fromFall = () => {
      fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
      return Math.acos(Math.max(-1, Math.min(1, fwd.dot(FALL)))) * DEG;
    };
    const pathAzimuth = () => {
      const s = water.sampleAt(board.position.x, board.position.y, board.position.z, sample);
      const vx = board.velocity.x - s.flowX;
      const vz = board.velocity.z - s.flowZ;
      return Math.hypot(vx, vz) > 0.05 ? Math.atan2(vx, vz) * DEG : Number.NaN;
    };
    let phase = DELAY > 0 ? 'drop' : 'turn';
    let turnFrom = 0;
    let dropVy = 0;
    let fell = '';
    let fellAt = Number.NaN;
    let fellSpeed = Number.NaN;
    let acrossAt = Number.NaN;
    let maxFromFall = fromFall();
    let lastPath = pathAzimuth();
    let lastVy = board.velocity.y;
    // Over the turn phase (the stick over), frame by frame.
    const nUp: number[] = [];
    const nPerp: number[] = [];
    const nHull: number[] = [];
    const ceiling: number[] = [];
    const nTotals: number[] = [];
    const lifts: number[] = [];
    const phiFs: number[] = [];
    const incidences: number[] = [];
    const areas: number[] = [];
    const banks: number[] = [];
    const rails: number[] = [];
    const speeds: number[] = [];
    const pathRates: number[] = [];
    const lawRates: number[] = [];
    const sinks: number[] = [];
    const vys: number[] = [];
    // The speed through the water at the turn's start and at fixed times into it.
    let speed0 = Number.NaN;
    const at: Record<string, number> = { '0.5': Number.NaN, '1': Number.NaN, '1.5': Number.NaN, '2': Number.NaN };
    rig.rider!.steer = phase === 'drop' ? 0 : steer;
    if (phase === 'turn' && STROKE !== 'off') stance(rig, STROKE === 'release' ? 'tall' : 'compress');
    for (let i = 0; i < Math.round((DELAY + TURN_LIMIT + HOLD) / STEP); i += 1) {
      const t = (i + 1) * STEP;
      (water as { advance?: (dt: number) => void }).advance?.(STEP);
      board.step(STEP, water);
      const s = state(rig, water, t);
      const ff = fromFall();
      maxFromFall = Math.max(maxFromFall, ff);
      const path = pathAzimuth();
      const wrap = (d: number) => ((d + 540) % 360) - 180;
      const pathRate = wrap(path - lastPath) / STEP;
      lastPath = path;
      // The water's whole force on the board, and the hull's share of it.
      total.set(0, 0, 0);
      for (const key of WATER) total.add((board.forces as unknown as Record<string, Vector3>)[key]);
      hull.set(0, 0, 0);
      for (const key of HULL) hull.add((board.forces as unknown as Record<string, Vector3>)[key]);
      up.set(0, 1, 0).applyQuaternion(board.orientation);
      const cen = water.sampleAt(board.position.x, board.position.y, board.position.z, sample);
      vRel.set(board.velocity.x - cen.flowX, board.velocity.y - cen.flowY, board.velocity.z - cen.flowZ);
      const sp = vRel.length();
      // The aeronautical load factor: the water's force with its along-path part taken out, over the weight.
      perp.copy(total);
      if (sp > 0.05) perp.addScaledVector(vRel, -total.dot(vRel) / (sp * sp));
      // The load factor and its own tilt. Both definitions are the advisor's corrections to this probe's first pass
      // (3.2r's consult): phi is the tilt of **the water's resultant** from the world vertical, not the rider's bank
      // (on a 16 degree face a board sitting flat already has its hull force 16 degrees off vertical, so the rider's
      // bank understates phi by up to the face slope); and the vertical that matters is the **system's** centre of
      // mass, the rider being 73 of the 75.5 kg, not the board's own y. Gravity is the only external force besides the
      // water, so the system's vertical acceleration is exactly (F_water.y - W)/M and needs no rider velocity:
      // `liftShare` below is 1 + a_com/g. The identity n cos(phiF) = liftShare then holds by construction, which is
      // the point - it says n can exceed 1/cos(phiF) only by accelerating the system upward.
      const nTotal = total.length() / weight;
      const phiF = nTotal > 1e-6 ? Math.acos(Math.max(-1, Math.min(1, total.y / total.length()))) : 0;
      const liftShare = total.y / weight;
      const phi = phiF;
      const nU = total.dot(up) / weight;
      const nP = perp.length() / weight;
      // Vertical acceleration of the board alone, g (+ up), kept for the record and NOT the system's.
      const sink = (board.velocity.y - lastVy) / STEP / G;
      lastVy = board.velocity.y;
      if (phase === 'drop') dropVy = Math.min(dropVy, board.velocity.y);
      if (phase === 'turn') {
        if (!Number.isFinite(speed0)) { speed0 = sp; turnFrom = t; }
        for (const k of Object.keys(at)) if (!Number.isFinite(at[k]) && t - turnFrom >= Number(k)) at[k] = sp;
        nUp.push(nU);
        nPerp.push(nP);
        nHull.push(hull.dot(up) / weight);
        ceiling.push(1 / Math.max(0.05, Math.cos(phi)));
        nTotals.push(nTotal);
        lifts.push(liftShare);
        phiFs.push(phiF * DEG);
        // The incidence the wetted bottom meets the flow at, and the area it has: the advisor's rank 1. A real 2.1 g
        // cutback runs 11-13 degrees on 0.4-0.5 m2; a force made from a big incidence on a sliver is half brake.
        if (Number.isFinite(s.attack)) incidences.push(Math.abs(s.attack));
        areas.push(s.wetArea);
        banks.push(Math.abs(s.bank));
        rails.push(Math.abs(s.roll));
        speeds.push(sp);
        sinks.push(sink);
        vys.push(board.velocity.y);
        if (Number.isFinite(pathRate)) {
          pathRates.push(Math.abs(pathRate));
          // The law the advisor handed us, fed the n we actually have.
          lawRates.push(sp > 0.3 ? (nP * G * Math.sin(phi)) / sp * DEG : Number.NaN);
        }
      }
      if (TRACE && process.env.OUT_TRACE) {
        appendFileSync(process.env.OUT_TRACE, `${JSON.stringify({
          rider: RIDER, stance: st, extra, steer, t: r(t, 3), phase,
          fromFall: r(ff, 2), pathRate: r(pathRate, 2), roll: r(s.roll, 2), bank: r(s.bank, 2), speed: r(sp, 3),
          nUp: r(nU, 3), nPerp: r(nP, 3), nHull: r(hull.dot(up) / weight, 3), n: r(nTotal, 3), phiF: r(phiF * DEG, 2), liftShare: r(liftShare, 3), ceiling: r(1 / Math.max(0.05, Math.cos(phi)), 3),
          lawRate: r(sp > 0.3 ? (nP * G * Math.sin(phi)) / sp * DEG : Number.NaN, 2),
          vy: r(board.velocity.y, 3), sinkG: r(sink, 3), footLoad: r(s.load, 3),
          wetArea: r(s.wetArea, 4), draft: r(s.draft, 4), pitch: r(s.pitch, 2), attack: r(s.attack, 2),
        })}\n`);
      }
      if (phase === 'drop' && t >= DELAY) {
        phase = 'turn';
        rig.rider!.steer = steer;
        if (STROKE !== 'off') stance(rig, STROKE === 'release' ? 'tall' : 'compress');
      }
      if (phase === 'turn' && (ff >= ACROSS || t >= DELAY + TURN_LIMIT)) {
        phase = 'hold';
        acrossAt = t;
        rig.rider!.steer = 0;
      }
      if (s.fell) { fell = s.fell; fellAt = t; fellSpeed = sp; break; }
    }
    emit({
      bar: 'load', rider: RIDER, stance: st, extra, steer, heading: HEADING, delay: DELAY, stroke: STROKE, face: FACE.join('/'),
      // The drop the board took before the stick went over: the descent rate there is what a turn can arrest.
      dropVyMs: r(dropVy, 3),
      reachedAcross: maxFromFall >= ACROSS, held: !fell, fell, fellAtS: r(fellAt, 2), acrossAtS: r(acrossAt, 2),
      frames: nUp.length,
      // n, the whole point of the probe.
      nUpMedian: r(median(nUp), 3), nUpPeak: r(peak(nUp), 3),
      nPerpMedian: r(median(nPerp), 3), nPerpPeak: r(peak(nPerp), 3),
      // n and its own tilt, the advisor's definitions: `liftShare` is 1 + a_com/g, so it says how much of n is
      // the system accelerating upward rather than just holding itself up at the tilt it has.
      nMedian: r(median(nTotals), 3), nPeak: r(peak(nTotals), 3),
      phiFMedianDeg: r(median(phiFs), 1), phiFPeakDeg: r(peak(phiFs), 1),
      liftShareMedian: r(median(lifts), 3), liftSharePeak: r(peak(lifts), 3),
      // Where the force comes from: incidence on the wetted bottom, and how much of it there is.
      incidenceMedianDeg: r(median(incidences), 1), incidencePeakDeg: r(peak(incidences), 1),
      wetAreaMedian: r(median(areas), 4), wetAreaMin: r(areas.length ? Math.min(...areas) : Number.NaN, 4),
      nHullMedian: r(median(nHull), 3), nHullPeak: r(peak(nHull), 3),
      // The level-flight ceiling at the bank actually carried, and how far over it we are.
      ceilingMedian: r(median(ceiling), 3), ceilingPeak: r(peak(ceiling), 3),
      overCeilingMedian: r(median(nPerp.map((n, k) => n - ceiling[k])), 3),
      bankMedianDeg: r(median(banks), 1), bankPeakDeg: r(peak(banks), 1), railMedianDeg: r(median(rails), 1),
      // The law against the path.
      pathRateMedian: r(median(pathRates), 2), lawRateMedian: r(median(lawRates.filter(Number.isFinite)), 2),
      // The speed the carve keeps.
      speedStartMs: r(speed0, 3), speedMedianMs: r(median(speeds), 3),
      keptAt05: r(at['0.5'] / speed0, 3), keptAt1: r(at['1'] / speed0, 3), keptAt15: r(at['1.5'] / speed0, 3), keptAt2: r(at['2'] / speed0, 3),
      speedAt1Ms: r(at['1'], 3), speedAt2Ms: r(at['2'], 3),
      // The speed at the fall, and the share of the turn's starting speed it is: the figure Part 15 reported as 40 %.
      speedFellMs: r(fellSpeed, 3), keptAtFall: r(fellSpeed / speed0, 3), turnRanS: r(Number.isFinite(fellAt) ? fellAt - turnFrom : Number.NaN, 2),
      // The vertical: is the board arresting a drop at all?
      sinkAccelMedianG: r(median(sinks), 3), sinkAccelPeakG: r(peak(sinks), 3), sinkAccelMeanG: r(mean(sinks), 3),
      vyMinMs: r(vys.length ? Math.min(...vys) : Number.NaN, 3), vyMaxMs: r(peak(vys), 3),
    });
  }
});
