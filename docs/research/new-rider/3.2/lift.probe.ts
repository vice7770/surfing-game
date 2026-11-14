// Step 3.2s: **against roll, who carries the system's weight — and how deep is the buried rail?**
//
// The water-physics advisor's rank 1, stated at the end of Part 16 and restated in its 3.2s consult. The hypothesis
// under test is its own: *the board is held out of the water at high rail by its own standing contact.* The fact that
// prompted it (Part 16 §3 item 5, one traced run): the hull's force on the board's **own up axis** falls from 1.57
// system-weights on 0.356 m² at 50° of roll to **0.19 on 0.231 m²** at 83°, while the water's **world-vertical** force
// stays at 0.96–1.05 W through the carve.
//
// Those two facts are not in conflict, and the probe is built to say so with numbers. `nUp` is a projection on an axis
// that is **nearly horizontal at 83° of roll** (cos 83° = 0.12), so 0.19 W on the board's up is 0.023 W of vertical. The
// question "who carries the weight" is a question about the **world vertical**, and `BoardBody.forces` already books
// every water force by source. So this probe needs **no change under `src/`**: it reads the existing ledger, splits it
// by roll, and closes the board's own vertical momentum balance to get the one row the ledger does not hold — the
// rider's contact.
//
// Per frame of the carve it books, all in system weights (board 2.54 kg + rider 73 kg) and all **world-vertical**:
//
//  1. **every water source**: buoyancy, pressure, added mass, radiation, friction, bed, fins, rails, froth — and their
//     sum, which is `1 + a_com/g` exactly (gravity is the only other external force on the system).
//  2. **the rider's contact on the board**, as the residual of the board's own vertical momentum balance:
//     `F_contact,y = m_board·a_board,y − ΣF_water,y + m_board·g`. **Positive means the contact lifts the board.** In
//     ordinary riding it must sit near **−0.967 W** (the rider's weight pressing down). It going to zero or positive at
//     high rail *is* the advisor's hypothesis, and `PART=closure` checks the residual reads ~0 on a riderless board.
//  3. **each rail separately**: the **buried (low) rail's** bottom edge and deck edge under the surface, and the high
//     rail's, m — so "how deep is the buried rail" is answered per rail and not as a max over both, which is all
//     `lab.ts`'s `state()` offers.
//  4. **the wetted bottom area on each side of the stringer**, the wetted beam it implies (area / wetted length), and
//     the beam the **flat-bottom geometry** says should be wet at the measured rail depth, `d_low / sin φ` (the
//     advisor's w = d / sin φ). Measured beam far **below** geometric is the signature of a board held out of water
//     where the geometry says it should be wet.
//  5. **the roll rate**, and the rail's own immersion rate — the advisor's discriminator between "held out by the
//     contact" and "the roll outran the sinking".
//  6. **the attitude**: incidence on the wetted bottom and pitch, against Forsyth's 42 ± 2° of pitch at 75 ± 3° of rail.
//  7. **the along-path share** of the same ledger, because where the carve's speed goes is the other half of it.
//
// Everything is binned by **|roll| in 10° bands** and pooled over the whole population, which is the advisor's own
// correction to Part 16: its 0.96–1.05 is a per-run *median*, and the hypothesis lives in the high-roll bin alone.
//
//   OUT=/tmp/lift.jsonl RIDER=old npx vitest run --config docs/research/new-rider/3.2/vitest.probe.config.ts lift
//
// PART=bins (the default) emits one line per roll band; PART=runs also emits one line per run; PART=closure runs the
// riderless check. TRACE=1 with OUT_TRACE writes every frame.
import { it } from 'vitest';
import { Vector3 } from 'three';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';
import { createWaterSample } from '../../../../src/physics/SurfWater';
import { STEP, emit, place, r, state, type Rig } from '../../board-in-water/lab';
import { appendFileSync } from 'node:fs';

const RIDER = process.env.RIDER === 'new' ? 'new' : 'old';
const PARTS = (process.env.PART ?? 'bins').split(',');
const EXTRAS = (process.env.EXTRAS ?? '0,1.5,3').split(',').map(Number);
const STEERS = (process.env.STEERS ?? '0.5,1').split(',').map(Number);
const STANCES = (process.env.STANCES ?? 'compress,tall').split(',') as Stance[];
const TRACE = process.env.TRACE === '1';
const ACROSS = Number(process.env.ACROSS ?? 85);
const HOLD = Number(process.env.HOLD ?? 5);
const TURN_LIMIT = Number(process.env.TURN_LIMIT ?? 4);
const HEADING = Number(process.env.HEADING ?? -45);
const DEG = 180 / Math.PI;
const G = 9.81;
const FALL = new Vector3(0, 0, 1);
const FACE = (process.env.FACE ?? '1.4,16').split(',').map(Number);
const CANYON = { depth: 2.6, height: FACE[0], slope: FACE[1], speed: 5.7 };
/** Every water force the board books, by source. `bed` never fires on a face; it is here so the sum is the whole water. */
const WATER = ['buoyancy', 'pressure', 'addedMass', 'radiation', 'friction', 'bed', 'fins', 'rails', 'froth'] as const;
type Source = (typeof WATER)[number];
type Stance = 'tall' | 'crouch' | 'compress';
/** Roll bands, |roll| in degrees: the bin's lower edge. */
const BANDS = [0, 10, 20, 30, 40, 50, 60, 70, 80];

function stance(rig: Rig, s: Stance): void {
  rig.rider!.crouch = s === 'crouch' ? 1 : s === 'compress' ? 0.6 : 0;
  rig.rider!.compress = s === 'compress' ? 1 : 0;
}

const median = (xs: number[]) => {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return Number.NaN;
  const i = s.length >> 1;
  return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
};
const lo = (xs: number[]) => { const s = xs.filter(Number.isFinite); return s.length ? Math.min(...s) : Number.NaN; };
const hi = (xs: number[]) => { const s = xs.filter(Number.isFinite); return s.length ? Math.max(...s) : Number.NaN; };

/** One roll band's pooled frames, over the whole population. */
type Bin = Record<string, number[]> & { runs: Set<string> };
const newBin = (): Bin => ({ runs: new Set<string>() }) as Bin;
const push = (bin: Bin, key: string, v: number) => { (bin[key] ??= []).push(v); };

/**
 * Each rail's edges against the water, and the wetted bottom split across the stringer. The buried rail is the low
 * one: `roll` (lab.ts) is asin(left · n) with `left` the board's +x, so roll > 0 puts the left rail up and the buried
 * rail at x < 0.
 */
function rails(rig: Rig, water: FaceWater, roll: number) {
  const { board } = rig;
  const shape = board.shape;
  const sample = createWaterSample();
  const scratch = new Vector3();
  const lowSide = roll > 0 ? -1 : 1;
  /** How far an edge point lies under the surface sampled over it, m (negative: above it). */
  const depthAt = (x: number, y: number, z: number) => {
    const w = board.toWorld({ x, y, z }, scratch);
    const s = water.sampleAt(w.x, w.y, w.z, sample);
    return (s.surfaceY - w.y) * s.normalY;
  };
  let lowBottom = -Infinity;
  let lowDeck = -Infinity;
  let highBottom = -Infinity;
  let highDeck = -Infinity;
  const stations = [...new Set(shape.patches.map((p) => p.position.z))];
  for (const z of stations) {
    const sf = Math.min(1, Math.max(0, z / shape.length + 0.5));
    const half = shape.curves.width(sf) / 2;
    const y0 = shape.curves.rocker(sf);
    const y1 = y0 + shape.curves.thickness(sf) * (1 - shape.taper);
    lowBottom = Math.max(lowBottom, depthAt(lowSide * half, y0, z));
    lowDeck = Math.max(lowDeck, depthAt(lowSide * half, y1, z));
    highBottom = Math.max(highBottom, depthAt(-lowSide * half, y0, z));
    highDeck = Math.max(highDeck, depthAt(-lowSide * half, y1, z));
  }
  // The wetted bottom, by side of the stringer, and the length it is spread over.
  let wetLow = 0;
  let wetHigh = 0;
  let zMin = Infinity;
  let zMax = -Infinity;
  for (const p of shape.patches) {
    const w = board.toWorld(p.position, scratch);
    const s = water.sampleAt(w.x, w.y, w.z, sample);
    if (!(s.surfaceY - w.y >= 0) || s.outsideDomain) continue;
    if (p.position.x * lowSide > 0) wetLow += p.area; else wetHigh += p.area;
    zMin = Math.min(zMin, p.position.z);
    zMax = Math.max(zMax, p.position.z);
  }
  const stationLength = shape.patches[0].length;
  const wetLength = zMax >= zMin ? zMax - zMin + stationLength : 0;
  const wetArea = wetLow + wetHigh;
  const beam = wetLength > 0 ? wetArea / wetLength : 0;
  // What a flat bottom rolled φ would have wet at the measured rail depth: w = d / sin φ (the advisor), capped at the
  // widest beam the board has.
  const sinPhi = Math.abs(Math.sin(roll / DEG));
  const beamGeo = lowBottom > 0 && sinPhi > 1e-3 ? Math.min(shape.maxWidth, lowBottom / sinPhi) : Number.NaN;
  return { lowBottom, lowDeck, highBottom, highDeck, wetLow, wetHigh, wetArea, wetLength, beam, beamGeo };
}

const bins = new Map<number, Bin>(BANDS.map((b) => [b, newBin()]));
const band = (roll: number) => BANDS[Math.min(BANDS.length - 1, Math.floor(Math.abs(roll) / 10))];

it('who carries the weight against roll, and how deep the buried rail is', () => {
  if (!PARTS.includes('bins') && !PARTS.includes('runs')) return;
  const sample = createWaterSample();
  for (const st of STANCES) for (const extra of EXTRAS) for (const steer of STEERS) {
    const water = new FaceWater({ depth: CANYON.depth, height: CANYON.height, slope: CANYON.slope, speed: CANYON.speed });
    const atZ = water.crestZ() + 0.75 * water.front;
    const entry = (water.speed - water.sampleAt(0, 10, atZ, sample).flowZ) / Math.cos(45 / DEG) + extra;
    const rig = place(water, atZ, HEADING, entry, 'standing');
    stance(rig, st);
    const board = rig.board;
    const weight = (board.mass + rig.rider!.mass) * G;
    const boardWeight = board.mass * G;
    const run = `${RIDER}/${st}/${extra}/${steer}`;
    const fwd = new Vector3();
    const vRel = new Vector3();
    const fromFall = () => {
      fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
      return Math.acos(Math.max(-1, Math.min(1, fwd.dot(FALL)))) * DEG;
    };
    let fell = '';
    let fellAt = Number.NaN;
    let maxFromFall = fromFall();
    let maxRoll = 0;
    let deepestLow = -Infinity;
    let contactUpMin = Infinity;
    let closureWorst = 0;
    let lastRoll = 0;
    let lastLow = Number.NaN;
    let turning = true;
    rig.rider!.steer = steer;
    for (let i = 0; i < Math.round((TURN_LIMIT + HOLD) / STEP); i += 1) {
      const t = (i + 1) * STEP;
      (water as { advance?: (dt: number) => void }).advance?.(STEP);
      const vyBefore = board.velocity.y;
      board.step(STEP, water);
      const s = state(rig, water, t);
      const ff = fromFall();
      maxFromFall = Math.max(maxFromFall, ff);
      // The water, by source, on the world vertical — and the board's own vertical momentum balance, whose residual is
      // the rider's contact. Gravity is not in `forces`, so it is added analytically.
      let waterY = 0;
      const byY: Partial<Record<Source, number>> = {};
      const byAlong: Partial<Record<Source, number>> = {};
      /** Each source's **magnitude**, so the vertical's collapse can be split into the force dying and the cos φ projection. */
      const byMag: Partial<Record<Source, number>> = {};
      const cen = water.sampleAt(board.position.x, board.position.y, board.position.z, sample);
      vRel.set(board.velocity.x - cen.flowX, board.velocity.y - cen.flowY, board.velocity.z - cen.flowZ);
      const sp = vRel.length();
      for (const key of WATER) {
        const f = (board.forces as unknown as Record<Source, Vector3>)[key];
        byY[key] = f.y / weight;
        byMag[key] = f.length() / weight;
        byAlong[key] = sp > 0.05 ? f.dot(vRel) / sp / weight : Number.NaN;
        waterY += f.y;
      }
      const boardAccelY = (board.velocity.y - vyBefore) / STEP;
      const contactUp = (board.mass * boardAccelY - waterY + boardWeight) / weight;
      const g = rails(rig, water, s.roll);
      const rollRate = (Math.abs(s.roll) - Math.abs(lastRoll)) / STEP;
      const lowRate = Number.isFinite(lastLow) ? (g.lowBottom - lastLow) / STEP : Number.NaN;
      lastRoll = s.roll;
      lastLow = g.lowBottom;
      if (turning) {
        maxRoll = Math.max(maxRoll, Math.abs(s.roll));
        deepestLow = Math.max(deepestLow, g.lowBottom);
        contactUpMin = Math.min(contactUpMin, contactUp);
        const bin = bins.get(band(s.roll))!;
        bin.runs.add(run);
        push(bin, 'speed', sp);
        push(bin, 'rollDeg', Math.abs(s.roll));
        push(bin, 'waterUp', waterY / weight);
        push(bin, 'contactUp', contactUp);
        for (const key of WATER) { push(bin, `up_${key}`, byY[key]!); push(bin, `mag_${key}`, byMag[key]!); push(bin, `along_${key}`, byAlong[key]!); }
        push(bin, 'lowBottom', g.lowBottom);
        push(bin, 'lowDeck', g.lowDeck);
        push(bin, 'highBottom', g.highBottom);
        push(bin, 'highDeck', g.highDeck);
        push(bin, 'wetArea', g.wetArea);
        push(bin, 'wetLowShare', g.wetArea > 0 ? g.wetLow / g.wetArea : Number.NaN);
        push(bin, 'beam', g.beam);
        push(bin, 'beamGeo', g.beamGeo);
        push(bin, 'beamDeficit', Number.isFinite(g.beamGeo) ? g.beam - g.beamGeo : Number.NaN);
        push(bin, 'attackDeg', Math.abs(s.attack));
        push(bin, 'pitchDeg', s.pitch);
        push(bin, 'rollRate', rollRate);
        push(bin, 'lowRate', lowRate);
        push(bin, 'footLoad', s.load);
      }
      // The board's own balance must close: m·a = ΣF_water − m·g + F_contact, by construction of F_contact. The number
      // kept here is the share of the step's vertical momentum the *water alone* leaves unexplained, which is what the
      // riderless check (`PART=closure`) reads as ~0.
      closureWorst = Math.max(closureWorst, Math.abs((board.mass * boardAccelY - waterY + boardWeight) / weight));
      if (TRACE && process.env.OUT_TRACE) {
        appendFileSync(process.env.OUT_TRACE, `${JSON.stringify({
          rider: RIDER, stance: st, extra, steer, t: r(t, 3), roll: r(s.roll, 2), bank: r(s.bank, 2), speed: r(sp, 3),
          waterUp: r(waterY / weight, 4), contactUp: r(contactUp, 4),
          ...Object.fromEntries(WATER.map((k) => [`up_${k}`, r(byY[k]!, 4)])),
          ...Object.fromEntries(WATER.map((k) => [`mag_${k}`, r(byMag[k]!, 4)])),
          lowBottom: r(g.lowBottom, 4), lowDeck: r(g.lowDeck, 4), highBottom: r(g.highBottom, 4), highDeck: r(g.highDeck, 4),
          wetArea: r(g.wetArea, 4), wetLow: r(g.wetLow, 4), wetHigh: r(g.wetHigh, 4), beam: r(g.beam, 4), beamGeo: r(g.beamGeo, 4),
          attack: r(s.attack, 2), pitch: r(s.pitch, 2), rollRate: r(rollRate, 1), footLoad: r(s.load, 3),
        })}\n`);
      }
      if (turning && (ff >= ACROSS || t >= TURN_LIMIT)) { turning = false; rig.rider!.steer = 0; }
      if (s.fell) { fell = s.fell; fellAt = t; break; }
    }
    if (PARTS.includes('runs')) {
      emit({
        bar: 'lift-run', rider: RIDER, stance: st, extra, steer,
        reachedAcross: maxFromFall >= ACROSS, held: !fell, fell, fellAtS: r(fellAt, 2),
        // Over the **turn** only: after the fall the loose board sinks, which contaminated these in the first pass.
        maxRollDeg: r(maxRoll, 1), deepestLowRailM: r(deepestLow, 4),
        contactUpMin: r(contactUpMin, 4), closureWorst: r(closureWorst, 4),
      });
    }
  }
  if (!PARTS.includes('bins')) return;
  for (const b of BANDS) {
    const bin = bins.get(b)!;
    if (!bin.speed?.length) continue;
    const col = (k: string) => ({ [`${k}Med`]: r(median(bin[k] ?? []), 4), [`${k}Lo`]: r(lo(bin[k] ?? []), 4), [`${k}Hi`]: r(hi(bin[k] ?? []), 4) });
    emit({
      bar: 'lift', rider: RIDER, rollBand: `${b}-${b + 10}`, frames: bin.speed.length, runs: bin.runs.size,
      ...col('speed'), ...col('rollDeg'),
      // The headline: who carries the weight.
      ...col('waterUp'), ...col('contactUp'),
      ...Object.assign({}, ...WATER.map((k) => ({ [`up_${k}`]: r(median(bin[`up_${k}`] ?? []), 4) }))),
      ...Object.assign({}, ...WATER.map((k) => ({ [`mag_${k}`]: r(median(bin[`mag_${k}`] ?? []), 4) }))),
      ...Object.assign({}, ...WATER.map((k) => ({ [`along_${k}`]: r(median(bin[`along_${k}`] ?? []), 4) }))),
      // The buried rail.
      ...col('lowBottom'), ...col('lowDeck'), ...col('highBottom'), ...col('highDeck'),
      ...col('wetArea'), ...col('wetLowShare'), ...col('beam'), ...col('beamGeo'), ...col('beamDeficit'),
      // The attitude, and the two rates the advisor's discriminator needs.
      ...col('attackDeg'), ...col('pitchDeg'), ...col('rollRate'), ...col('lowRate'), ...col('footLoad'),
    });
  }
});

/**
 * The closure check: the same balance on a **riderless** board, where the contact row must read ~0. It is the probe's
 * own seatbelt — if the residual is not small here, the residual is not the contact.
 */
it('the vertical balance closes on a riderless board', () => {
  if (!PARTS.includes('closure')) return;
  const sample = createWaterSample();
  const water = new FaceWater({ depth: CANYON.depth, height: CANYON.height, slope: CANYON.slope, speed: CANYON.speed });
  const atZ = water.crestZ() + 0.75 * water.front;
  const entry = (water.speed - water.sampleAt(0, 10, atZ, sample).flowZ) / Math.cos(45 / DEG);
  const rig = place(water, atZ, HEADING, entry, 'none');
  const board = rig.board;
  const weight = board.mass * G;
  const worst: number[] = [];
  for (let i = 0; i < Math.round(4 / STEP); i += 1) {
    (water as { advance?: (dt: number) => void }).advance?.(STEP);
    const vyBefore = board.velocity.y;
    board.step(STEP, water);
    let waterY = 0;
    for (const key of WATER) waterY += (board.forces as unknown as Record<Source, Vector3>)[key].y;
    worst.push(Math.abs((board.mass * (board.velocity.y - vyBefore)) / STEP - waterY + weight) / weight);
  }
  emit({ bar: 'lift-closure', frames: worst.length, residualMedianBoardWeights: r(median(worst), 5), residualPeakBoardWeights: r(hi(worst), 5) });
});
