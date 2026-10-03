// Probe (opt-in: PROBE=1 LOG=<file> END=<s> npx vitest run src/wave/probes/poolFlow.probe.test.ts): the dev autopilot
// rides the movement flow (style 'flow': drop, bottom turn, projection, trim, cutback, rebound) on the Wave
// Pool's Medium wave, built as `scripts/lesson-wave.ts` builds it for `--spot pool` (stage 2 on the CPU, the machine's
// one regular wave). It waits beside the A-frame's tip, ALONG m out along one arm, so it rides that arm away from the
// tip; the next attempt waits on the other arm (SIDE=right|left keeps to one: right is +x). Each attempt logs its
// phases (start and end time, the heading turned toward the open face, the speed in and out, the face fraction and the
// distance to the curl in and out, and how it ended) and the ride's end. TRACE=cutback (the default) logs the rider
// at 10 Hz through each cutback and rebound and the 2 s before a fall; TRACE=all through the whole ride; TRACE=none
// never. END is the seconds simulated after the spin-up, CUTBACK the cutback's reach (m), FLOW_FROM the phase the
// flow starts in, BOTTOM_END the heading (degrees from the fall line) where the bottom turn is released, TRIM_ONLY=1
// keeps the rider in the trim once it trims (no further bottom turn or cutback; with FLOW_FROM=trim, from the placement
// on), holding the face's band (PUMP=1 pumps about it), and each ride then logs its time in the trim on the plane and
// off it, the face under it where it first dropped off the plane and how fast the surface rose there, the feet's load
// (its mean and spread) and the surface's rise under the board while it planed, the legs' net work, and the gameplay
// rules' work meanwhile. SEA=<file> starts from a spun-up sea saved there (and saves it there first when missing), so
// repeated runs skip the spin-up.
// The bed is pool.ts's as committed (POOL is not overridden here).
//
// The take-off point (`takeOffPoint`, the breaker depth for the edge's height) lies about 22 m seaward of the tip,
// where nothing breaks, and from there the autopilot missed every wave. So the probe watches the arm's own column for
// where each wave first breaks on the reef (the pool probe's rule), waits WAIT m (5) outside that, and starts each
// attempt as a wave breaks there, so the rider has a whole period to get into place for the next.
//
// The pop-up cue's take-off window (`inTakeOffWindow`) wants the board 2–4 m ahead of the crest; on the pool's 1.1 m
// face a caught paddler rode 0.7–1.5 m ahead of it, at the crest's pace, for 4 s and 20 m, until the wave died in the
// lagoon. POPUP=caught (the default) has the probe press pop-up as a player would once the board has been carried at
// the crest's pace, high on the face, for CAUGHT_FOR; POPUP=cue leaves it to the cue.
//
// Paddled, no wave was ridden (of 13 attempts, 3 stood: off the plane, behind the crest, or on the flat once the
// wave had died), so placed starts skip the paddle as a wave starts breaking on the arm (PLACES). START=trough is the
// one that works for the whole flow: all 20 of its placements stood and rode into it (START=face is for the trim).
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { it } from 'vitest';
import { Autopilot, autopilotView, type FlowPhase, type FlowRecord } from '../../dev/Autopilot';
import { LocalSurfZone } from '../../game/SurfZoneHost';
import { physicalSettingsFor } from '../../game/SurfConditions';
import { POOL, poolCrestZ } from '../pool';
import type { RiderPlacement } from '../../physics/RideSession';
import type { StanceName } from '../../physics/riderPosture';
import { createWaterSample } from '../../physics/SurfWater';
import { SURF_ZONE_STEP, type RideRequest } from '../SurfZoneRunner';
import type { SurfZoneConfig } from '../SurfZoneSimulation';
import { encodeSurfZoneState } from '../surfZoneState';

const log = (text: string) => appendFileSync(process.env.LOG ?? '/dev/stderr', `${text}\n`);
const DEG = 180 / Math.PI;
const wrap = (angle: number) => angle - 2 * Math.PI * Math.round(angle / (2 * Math.PI));
const metres = (value: number) => (Number.isFinite(value) ? value.toFixed(1) : '∞');
/**
 * Caught: carried shoreward at least CAUGHT_SPEED, m/s, and CAUGHT_SHARE of the crest's speed (a crest speed past
 * CREST_SANE, m/s, is the gauge jumping between crests), on the upper half of the face, for CAUGHT_FOR, s. At the
 * take-off window's 0.8 the paddler went at 3.2 m/s under a 4 m/s crest, which passed under it during the 1.2 s pop-up.
 */
const CAUGHT_SPEED = 3;
const CAUGHT_SHARE = 1;
const CREST_SANE = 8;
const CAUGHT_FOR = 0.25;
/**
 * Placed starts, PLACE_AHEAD m along the arm beyond where the wave starts breaking, angled from shoreward toward the
 * open face, at a speed over the water's own flow, m/s:
 * - START=caught: lying 1 m ahead of the crest (where a caught paddler rode) at the autopilot's take-off angle, at
 *   about the crest's pace with the face's water, popping up at once (Surf School's caught start). 1 of 8 rode on
 *   past the pop-up: near the breaking crest the board was thrown up at 0.7–1.4 m/s and rolled 30–80° in the push;
 * - START=trough: standing in the trough ahead of the wave at the speed and angle a drop reached (7 m/s, about 30°
 *   from the fall line), so the flow starts at its bottom turn. The trough is flat, and every placement rode;
 * - START=shoulder: standing up the face heading along it, for the cutback alone (FLOW_FROM=cutback). It does not
 *   work: the board lands rolled 24° across the face and lifts off it (the face's water rises at 1.3 m/s), and the
 *   upright body fell into a 70° bank within 0.5 s, cutting back or riding on unsteered (`settle`, s). Standing on the
 *   face by the break failed the same way (the board flew 0.3 s, rolled 21°; a 66° bank in 0.9 s).
 * - START=face: standing on the face, 2.5 m ahead of the crest (its steep band), heading 50° from the wave's travel
 *   toward the open face at 6 m/s over the water, the board moving along the surface (`followSurface`), for the trim
 *   (FLOW_FROM=trim). Placed as START=shoulder places, the board left the face as the shoulder's did. On Medium every
 *   one of 8 placements rode on, 6.1–9.2 s, on Big 7 of 8; heading 60° from the travel, 2 of 8 fell within 1.2 s, the
 *   body banking to 70°.
 */
const PLACES = {
  caught: { phase: 'prone', face: 1, angle: 35, speed: 3, settle: 0 },
  trough: { phase: 'standing', face: 4.5, angle: 30, speed: 7, settle: 0 },
  shoulder: { phase: 'standing', face: 2, angle: 80, speed: 6.5, settle: 0.5 },
  face: { phase: 'standing', face: 2.5, angle: 50, speed: 6, settle: 0 },
} as const;
const PLACE_AHEAD = Number(process.env.PLACE_AHEAD ?? 8);
/** The trim's load on the feet while planing: its mean and spread (standard deviation), body weights. */
const trimLoad = (trim: { steps: number; load: number; loadSq: number }) => {
  const mean = trim.load / trim.steps;
  return { mean, spread: Math.sqrt(Math.max(0, trim.loadSq / trim.steps - mean * mean)) };
};

it.skipIf(!process.env.PROBE)('rides the movement flow on the Wave Pool', () => {
  // SIZE=small|medium|big: the pool's size (Medium by default, as the lesson-wave script records it).
  const size = process.env.SIZE === 'small' || process.env.SIZE === 'big' ? process.env.SIZE : 'medium';
  const pool = physicalSettingsFor('pool', { swell: size, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' });
  const config: SurfZoneConfig = {
    spot: 'pool', seed: 1, significantHeight: pool.significantHeight, peakPeriod: pool.peakPeriod, directionDegrees: pool.directionDegrees,
    spreading: 1000, tide: 0, windSpeed: 0, componentCount: 1, stage: 2, compute: 'cpu',
  };
  const along = Number(process.env.ALONG ?? 27);
  const sides = process.env.SIDE === 'right' ? [1] : process.env.SIDE === 'left' ? [-1] : [1, -1];
  // STANCE=both alternates Regular and Goofy each attempt (on one arm, frontside and backside); else the stance named.
  const stances: StanceName[] = process.env.STANCE === 'both' ? ['regular', 'goofy'] : [process.env.STANCE === 'goofy' ? 'goofy' : 'regular'];
  let stanceIndex = 0;
  const trace = process.env.TRACE ?? 'cutback';
  const cutbackReach = process.env.CUTBACK ? Number(process.env.CUTBACK) : undefined;
  const end = Number(process.env.END ?? 200);
  let wall = performance.now();
  const saved = process.env.SEA && existsSync(process.env.SEA) ? new Uint8Array(readFileSync(process.env.SEA)) : undefined;
  const host = new LocalSurfZone(saved ? { ...config, spinUpPeriods: 0 } : config, { rider: true, spawnAlong: sides[0] * along, stance: process.env.STANCE === 'goofy' ? 'goofy' : 'regular' }, saved);
  const { runner } = host;
  if (process.env.SEA && !saved) writeFileSync(process.env.SEA, encodeSurfZoneState(runner.simulation.exportState()));
  const session = runner.session!;
  const { rider, board } = session;
  const focus = runner.focus;
  log(`pool ${size}: Hs ${config.significantHeight.toFixed(2)} m, T ${config.peakPeriod} s; take-off point x ${focus.x.toFixed(1)} z ${focus.z.toFixed(1)}; waiting ${along} m along each arm; stance ${rider.stance}; cutback reach ${cutbackReach ?? 'default'}; ${saved ? 'sea from ' + process.env.SEA : 'spin-up'} ${((performance.now() - wall) / 1000).toFixed(0)} s wall`);
  // Where each arm's column first breaks on the reef, the most seaward over the run (the pool probe's rule).
  const { solver } = runner.simulation;
  const strength = (runner.simulation as unknown as { breaking: { strength: Float64Array } }).breaking.strength;
  const breakZ = new Map<number, number>();
  const firstOnset = new Map<number, number>();
  const wasBreaking = new Map<number, boolean>();
  /** Whether a wave starts breaking in the arm's column now. */
  const watchBreak = (arm: number): boolean => {
    const x = arm * along;
    const column = Math.round((x - solver.xCenters[0]) / solver.dx);
    let breaking = false;
    for (let iz = 0; iz < solver.nz; iz += 1) {
      const z = solver.zCenters[iz];
      if (z < poolCrestZ(x) - 50) continue;
      if (z > poolCrestZ(x) + 8) break;
      if (strength[iz * solver.nx + column] > 0.3) {
        if (!breakZ.has(arm)) log(`${runner.simulation.seaTime.toFixed(1)} s: the ${arm > 0 ? 'right' : 'left'} arm breaks at z ${z.toFixed(1)} (x ${x})`);
        breakZ.set(arm, Math.min(z, breakZ.get(arm) ?? Infinity));
        breaking = true;
        break;
      }
    }
    const onset = breaking && !wasBreaking.get(arm);
    wasBreaking.set(arm, breaking);
    return onset;
  };
  // The game's own take-off, where it is on this arm (the pool's riders wait at x 27, where the arm is 1.5 H deep);
  // elsewhere the column's most seaward break. On the steep arms a column crosses the break line along tens of metres
  // of z, and its most seaward break, 28 m outside the take-off, left the paddler there behind every wave.
  const lineup = (arm: number) => (Math.abs(focus.x - arm * along) < 1 ? focus.z : breakZ.get(arm) ?? focus.z);
  /** The crest in the column at x: the highest water near the reef's crest line. */
  const crestAt = (x: number): number => {
    const column = Math.round((x - solver.xCenters[0]) / solver.dx);
    let best = Number.NaN;
    let highest = -Infinity;
    for (let iz = 0; iz < solver.nz; iz += 1) {
      const z = solver.zCenters[iz];
      if (z < poolCrestZ(x) - 50) continue;
      if (z > poolCrestZ(x) + 8) break;
      const i = iz * solver.nx + column;
      const eta = solver.h[i] + solver.bed[i] - solver.restLevel;
      if (eta > highest) [highest, best] = [eta, z];
    }
    return best;
  };
  wall = performance.now();

  const waitOutside = Number(process.env.WAIT ?? 5);
  const popUpRule = process.env.POPUP ?? 'caught';
  const start = process.env.START ?? 'catch';
  const pilot = new Autopilot({
    waitOutside, rise: 0.25 * config.significantHeight, giveUp: 8, style: 'flow',
    ...(cutbackReach ? { cutbackReach } : {}), ...(process.env.FLOW_FROM ? { flowFrom: process.env.FLOW_FROM as FlowPhase } : {}),
    ...(process.env.BOTTOM_END ? { bottomEnd: Number(process.env.BOTTOM_END) } : {}),
    ...(process.env.TRIM_ONLY ? { trimOnly: true } : {}),
    ...(process.env.PUMP ? { pump: process.env.PUMP !== '0' } : {}),
  });
  const idle: RideRequest = { paddle: false, popUp: false, steer: 0, retry: false };
  const forward = new Vector3();
  const left = new Vector3();
  let sideIndex = 0;
  let side = sides[0];
  let retry = false;
  /** Waiting for the next break on the arm to start an attempt, and how long the paddler has been carried. */
  let holding = true;
  let attempt = 0;
  let placedAt = -Infinity;
  const faceSample = createWaterSample();
  let settleSteps = 0;
  let carried = 0;
  let pressed = '';
  /**
   * The flow's trim this attempt: s on the plane and off it, the gameplay rules' work meanwhile, J, and where it first
   * dropped off the plane: when (s into the ride), the face's height there (the gauge, m), its slope under the board
   * and how fast the surface rose under the board there (m/s). While it planed: the steps, the load on the feet summed
   * and squared (body weights: its mean and spread, the up-and-down a pump could flatten), the surface's rise under
   * the board summed (m/s), and the legs' net work (J).
   */
  const pumping = { planing: 0, off: 0, rules: 0, offAt: -1, offFace: 0, offSlope: 0, offRise: 0, steps: 0, load: 0, loadSq: 0, rise: 0, legs: 0 };
  const cleared = { ...pumping };
  let lastRules = 0;
  let lastLegs = 0;
  let lines: { t: number; phase: FlowPhase | ''; text: string }[] = [];
  let catchLines: string[] = [];
  const all: { side: number; frontside: boolean; records: FlowRecord[]; outcome: string; seconds: number; pumping: typeof pumping }[] = [];
  const steps = Math.round(end / SURF_ZONE_STEP);
  for (let step = 0; step < steps; step += 1) {
    const onsets = sides.map((arm) => watchBreak(arm));
    // Each wave is the same one, a period apart: once an arm's first onset is seen, the later ones are timed from it
    // (with steep arms a column can stay breaking from one wave to the next, and its rising edges went missing).
    sides.forEach((arm, i) => {
      if (onsets[i] && !firstOnset.has(arm)) firstOnset.set(arm, runner.simulation.seaTime);
    });
    const first = firstOnset.get(side);
    const due = first !== undefined
      && Math.abs(runner.simulation.seaTime - first - Math.round((runner.simulation.seaTime - first) / POOL.period) * POOL.period) < SURF_ZONE_STEP / 2;
    let place: RiderPlacement | undefined;
    if (holding && due) {
      holding = false;
      if (start === 'caught' || start === 'trough' || start === 'shoulder' || start === 'face') {
        const at = PLACES[start];
        const face = Number(process.env.PLACE_FACE ?? at.face);
        const speed = Number(process.env.PLACE_SPEED ?? at.speed);
        // Ahead of the crest and angled from the wave's own travel there: the arms refract it toward their normal.
        const crestX = side * (along + PLACE_AHEAD);
        const crestZ = crestAt(crestX);
        const sample = runner.water.sampleAt(crestX, runner.water.surfaceAt(crestX, crestZ + 2), crestZ + 2, faceSample);
        const travel = Math.hypot(sample.slopeX, sample.slopeZ) > 0.02 ? Math.atan2(-sample.slopeX, -sample.slopeZ) : 0;
        const x = crestX + face * Math.sin(travel);
        const z = crestZ + face * Math.cos(travel);
        place = {
          x, z, heading: travel + (side * Number(process.env.PLACE_ANGLE ?? at.angle) * Math.PI) / 180, speed, phase: at.phase,
          ...(start === 'face' ? { followSurface: true } : {}),
        };
        placedAt = step;
        settleSteps = Math.round(Number(process.env.PLACE_SETTLE ?? at.settle) / SURF_ZONE_STEP);
        catchLines.push(`  placed ${at.phase} at x ${x.toFixed(1)} z ${z.toFixed(1)}, ${face} m ahead of the crest along the wave's travel (${(travel * DEG).toFixed(0)}°), heading ${(place.heading * DEG).toFixed(0)}°, ${speed} m/s over the water`);
      } else {
        retry = true;
      }
    }
    // Placed: the snapshot shows the placed rider from the next step, when the autopilot goes and the probe pops up.
    const going = placedAt + 1 + settleSteps;
    if (step === going) {
      pilot.reset();
      pilot.go();
    }
    const view = autopilotView(host, lineup(side), 0);
    // The A-frame peels both ways: the arm it waits on is the one it rides.
    const input = holding || (step >= placedAt && step < going) ? { ...idle } : view ? pilot.next({ ...view, peelDirection: side }, SURF_ZONE_STEP) : { ...idle };
    if (step === going && start === 'caught') input.popUp = true;
    const ride = host.snapshot.status.ride;
    if (pilot.state === 'go' && ride?.phase === 'prone' && popUpRule === 'caught') {
      const { wave } = ride;
      const pace = Math.max(CAUGHT_SPEED, CAUGHT_SHARE * Math.min(wave.crestSpeed, CREST_SANE));
      carried = wave.valid && wave.speedShoreward >= pace && wave.faceFraction >= 0.5 && wave.aheadOfCrest > 0 ? carried + SURF_ZONE_STEP : 0;
      if (carried >= CAUGHT_FOR && !pressed) {
        input.popUp = true;
        pressed = `the probe pressed pop-up at ${wave.speedShoreward.toFixed(2)} m/s shoreward, face ${wave.faceFraction.toFixed(2)}, ${wave.aheadOfCrest.toFixed(1)} m ahead of the crest; `;
      }
    }
    // Just placed: the first half second, whatever the autopilot's state.
    if (step - placedAt <= 30 && step % 3 === 0 && ride) {
      forward.set(0, 0, 1).applyQuaternion(board.orientation);
      left.set(1, 0, 0).applyQuaternion(board.orientation);
      catchLines.push(`  +${((step - placedAt) * SURF_ZONE_STEP).toFixed(2)} s ${ride.phase} v ${ride.speed.toFixed(2)} vy ${board.velocity.y.toFixed(2)}`
        + ` above ${(board.lowestPoint() - runner.water.surfaceAt(board.position.x, board.position.z)).toFixed(2)} roll ${(-Math.asin(Math.max(-1, Math.min(1, left.y))) * DEG).toFixed(0)}`
        + ` pitch ${(Math.asin(Math.max(-1, Math.min(1, forward.y))) * DEG).toFixed(0)} bank ${(rider.bank.angle * DEG).toFixed(0)} load ${rider.contact.load.toFixed(2)}`
        + `${rider.inContact ? '' : ' NO CONTACT'}${ride.separation ? ` sep ${ride.separation}` : ''} | face ${ride.wave.valid ? ride.wave.faceFraction.toFixed(2) : '-'} ahead ${ride.wave.aheadOfCrest.toFixed(1)}`);
    }
    // The catch: paddling and the pop-up, kept for an attempt that rode less than 4 s.
    if (pilot.state === 'go' && ride && step % 6 === 0 && trace !== 'none') {
      const { wave } = ride;
      const angle = side * wrap(session.heading - Math.atan2(wave.directionX, wave.directionZ)) * DEG;
      catchLines.push(`  ${ride.phase.padEnd(8)} at x ${board.position.x.toFixed(1)} z ${board.position.z.toFixed(1)} v ${ride.speed.toFixed(2)} shoreward ${wave.speedShoreward.toFixed(2)}`
        + ` angle ${angle.toFixed(0)}° | crest ${wave.crestSpeed.toFixed(2)} m/s face ${wave.valid ? wave.faceFraction.toFixed(2) : '-'} H ${wave.faceHeight.toFixed(2)}`
        + ` ahead ${wave.aheadOfCrest.toFixed(1)} curl ${metres(wave.curlDistance)} brk ${wave.crestBreaking.toFixed(2)}${ride.cue ? ' CUE' : ''}${input.popUp ? ' POP' : ''}`);
    }
    if (pilot.state === 'ride' && ride?.phase === 'standing') {
      const rules = rider.work.assist + rider.work.carry + rider.work.leanOut;
      const legs = rider.work.contact + board.work.rider;
      if (pilot.flowRecords[pilot.flowRecords.length - 1]?.phase === 'trim') {
        const under = runner.water.sampleAt(board.position.x, runner.water.surfaceAt(board.position.x, board.position.z), board.position.z, faceSample);
        if ((rider as unknown as { planing: boolean }).planing) {
          const load = rider.contact.load;
          Object.assign(pumping, {
            planing: pumping.planing + SURF_ZONE_STEP, steps: pumping.steps + 1, load: pumping.load + load, loadSq: pumping.loadSq + load * load, rise: pumping.rise + under.flowY,
          });
        } else {
          pumping.off += SURF_ZONE_STEP;
          if (pumping.offAt < 0 && ride.wave.valid) {
            Object.assign(pumping, { offAt: pilot.rideTime, offFace: ride.wave.faceHeight, offSlope: Math.atan(Math.hypot(under.slopeX, under.slopeZ)) * DEG, offRise: under.flowY });
          }
        }
        pumping.rules += rules - lastRules;
        pumping.legs += legs - lastLegs;
      }
      lastRules = rules;
      lastLegs = legs;
    }
    if (pilot.state === 'ride' && ride?.phase === 'standing' && step % 6 === 0 && trace !== 'none') {
      const { wave } = ride;
      const record = pilot.flowRecords[pilot.flowRecords.length - 1];
      forward.set(0, 0, 1).applyQuaternion(board.orientation);
      left.set(1, 0, 0).applyQuaternion(board.orientation);
      const travel = Math.atan2(wave.directionX, wave.directionZ);
      const angle = side * wrap(session.heading - travel) * DEG;
      const planing = (rider as unknown as { planing: boolean }).planing;
      lines.push({
        t: pilot.rideTime, phase: record?.phase ?? '',
        text: `  ${pilot.rideTime.toFixed(1).padStart(5)} ${(record?.phase ?? '-').padEnd(8)} v ${ride.speed.toFixed(2)} angle ${angle.toFixed(0).padStart(4)}°`
          + ` bank ${(rider.bank.angle * DEG).toFixed(0).padStart(3)} roll ${(-Math.asin(Math.max(-1, Math.min(1, left.y))) * DEG).toFixed(0).padStart(3)}`
          + ` pitch ${(Math.asin(Math.max(-1, Math.min(1, forward.y))) * DEG).toFixed(0).padStart(3)} swing ${(rider.swing.angle * DEG).toFixed(0).padStart(3)}`
          + ` twist ${(rider.twist.angle * DEG).toFixed(0).padStart(3)} leg ${rider.leg.rest.toFixed(2)} load ${rider.contact.load.toFixed(2)}`
          + ` margin ${rider.balanceMargin.toFixed(2)}${planing ? '' : ' OFF-PLANE'} | face ${wave.valid ? wave.faceFraction.toFixed(2) : '-'}`
          + ` H ${wave.faceHeight.toFixed(2)} ahead ${wave.aheadOfCrest.toFixed(1)} curl ${metres(wave.curlDistance)} brk ${wave.crestBreaking.toFixed(2)}`
          + ` along ${wave.speedAlongCrest.toFixed(1)} need ${metres(wave.requiredSpeed)} | in ${[input.steer, input.trim ?? 0, input.crouch ?? 0, input.compress ?? 0, input.rotate ?? Number.NaN].map((v) => (Number.isNaN(v) ? '-' : v.toFixed(1))).join(' ')}`,
      });
    }
    if (pilot.state === 'done') {
      attempt += 1;
      const outcome = pilot.outcome ?? '';
      const records = pilot.flowRecords.map((record) => ({ ...record }));
      const frontside = (rider.stance === 'regular') === (side < 0);
      const popUp = host.snapshot.status.ride?.popUp;
      const caught = `\n  ${pressed}${popUp ? `pop-up ${popUp.outcome} in ${popUp.duration.toFixed(2)} s` : ''}`
        + (catchLines.length && (pilot.rideTime < 4 || start !== 'catch') ? `\n  catch (phase, place, speed, heading from the wave's travel | the wave):\n${catchLines.join('\n')}` : '');
      if (pilot.rideTime > 0) {
        all.push({ side, frontside, records, outcome, seconds: pilot.rideTime, pumping: { ...pumping } });
        log(`\n${(runner.simulation.seaTime).toFixed(1)} s · attempt ${attempt} · ${side > 0 ? 'right +x' : 'left −x'} (${frontside ? 'frontside' : 'backside'}): rode ${pilot.rideTime.toFixed(1)} s, ${outcome}${caught}`);
        for (const record of records) {
          const how = record.completed ? 'done' : record === records[records.length - 1] ? `ENDED (${outcome})` : 'at its limit';
          log(`  ${record.phase.padEnd(8)} ${record.at.toFixed(2).padStart(5)}–${(record.at + record.seconds).toFixed(2).padStart(5)} s`
            + ` ${record.degrees.toFixed(0).padStart(5)}° v ${record.speedIn.toFixed(2)}→${record.speedOut.toFixed(2)}`
            + ` face ${record.faceIn.toFixed(2)}→${record.faceOut.toFixed(2)} curl ${metres(record.curlIn)}→${metres(record.curlOut)} ${how}`);
        }
        if (pumping.planing + pumping.off > 0) {
          const off = pumping.offAt >= 0 ? `, dropping off it at ${pumping.offAt.toFixed(1)} s on a ${pumping.offFace.toFixed(2)} m face sloping ${pumping.offSlope.toFixed(0)}° under the board, rising ${pumping.offRise.toFixed(2)} m/s there` : '';
          const planed = pumping.steps ? `; planing, the feet's load ${trimLoad(pumping).mean.toFixed(2)} body weights (spread ${trimLoad(pumping).spread.toFixed(2)}) and the surface rising ${(pumping.rise / pumping.steps).toFixed(2)} m/s under the board` : '';
          log(`  trim (${process.env.PUMP && process.env.PUMP !== '0' ? 'pumping' : 'holding the band'}): ${pumping.planing.toFixed(1)} s on the plane, ${pumping.off.toFixed(1)} s off it${off}${planed}; the legs' net work ${pumping.legs.toFixed(0)} J; the gameplay rules' work meanwhile ${pumping.rules.toFixed(0)} J`);
        }
        const fell = outcome.startsWith('fell');
        const kept = trace === 'all' ? lines
          : lines.filter((line) => line.phase === 'cutback' || line.phase === 'rebound' || (fell && line.t > pilot.rideTime - 2));
        if (kept.length) log(`  trace (t phase speed angle-from-fall-line bank roll pitch swing twist leg load margin | wave, speed along the crest and needed | steer trim crouch compress rotate):\n${kept.map((line) => line.text).join('\n')}`);
      } else {
        log(`${(runner.simulation.seaTime).toFixed(1)} s · attempt ${attempt} · ${side > 0 ? 'right' : 'left'}: ${outcome}${caught}`);
      }
      lines = [];
      catchLines = [];
      carried = 0;
      pressed = '';
      Object.assign(pumping, cleared);
      lastRules = 0;
      lastLegs = 0;
      pilot.reset();
      sideIndex = (sideIndex + 1) % sides.length;
      side = sides[sideIndex];
      stanceIndex = (stanceIndex + 1) % stances.length;
      holding = true;
    }
    host.advance(1, { ...idle, ...input, retry, ...(retry ? { spawnAt: { x: side * along, z: lineup(side) - 6 } } : {}), ...(place ? { place } : {}), stance: stances[stanceIndex] });
    retry = false;
  }
  log(`\n${end} s simulated in ${((performance.now() - wall) / 1000).toFixed(0)} s wall (${(end / ((performance.now() - wall) / 1000)).toFixed(2)}× real time)`);
  const pumped = all.filter((ride) => ride.pumping.planing + ride.pumping.off > 0);
  if (pumped.length) {
    const on = pumped.map((ride) => ride.pumping.planing).sort((a, b) => a - b);
    const offs = pumped.filter((ride) => ride.pumping.offAt >= 0);
    const range = (pick: (ride: (typeof pumped)[number]) => number, digits: number) => (offs.length
      ? `${Math.min(...offs.map(pick)).toFixed(digits)}–${Math.max(...offs.map(pick)).toFixed(digits)}` : '-');
    const planed = pumped.filter((ride) => ride.pumping.steps > 0);
    const spread = (pick: (ride: (typeof pumped)[number]) => number, digits: number) => (planed.length
      ? `${Math.min(...planed.map(pick)).toFixed(digits)}–${Math.max(...planed.map(pick)).toFixed(digits)}` : '-');
    log(`trim (${process.env.PUMP && process.env.PUMP !== '0' ? 'pumping' : 'holding the band'}): ${pumped.length} rides, on the plane ${on[0].toFixed(1)}–${on[on.length - 1].toFixed(1)} s (median ${on[Math.floor(on.length / 2)].toFixed(1)}), ${pumped.filter((ride) => ride.outcome.startsWith('fell')).length} fell;`
      + ` ${offs.length} dropped off the plane, on a ${range((ride) => ride.pumping.offFace, 2)} m face sloping ${range((ride) => ride.pumping.offSlope, 0)}° under the board, rising ${range((ride) => ride.pumping.offRise, 2)} m/s there;`
      + ` planing, the feet's load spread ${spread((ride) => trimLoad(ride.pumping).spread, 2)} body weights and the surface rising ${spread((ride) => ride.pumping.rise / ride.pumping.steps, 2)} m/s under the board;`
      + ` the legs' net work ${spread((ride) => ride.pumping.legs, 0)} J a ride; the gameplay rules' work in the trim ${pumped.reduce((sum, ride) => sum + ride.pumping.rules, 0).toFixed(0)} J`);
  }
  // The phases over every ride, frontside and backside apart.
  for (const frontside of [true, false]) {
    const rides = all.filter((ride) => ride.frontside === frontside);
    if (!rides.length) continue;
    log(`${frontside ? 'frontside' : 'backside'}: ${rides.length} rides, ${rides.map((ride) => `${ride.seconds.toFixed(1)} s (${ride.outcome})`).join(', ')}`);
    for (const phase of ['drop', 'bottom', 'project', 'trim', 'cutback', 'rebound'] as const) {
      const records = rides.flatMap((ride) => ride.records.filter((record) => record.phase === phase));
      if (!records.length) continue;
      const mean = (pick: (record: FlowRecord) => number) => records.reduce((sum, record) => sum + pick(record), 0) / records.length;
      const ended = rides.filter((ride) => ride.records[ride.records.length - 1]?.phase === phase);
      log(`  ${phase.padEnd(8)} ×${records.length}: ${records.filter((record) => record.completed).length} done, ${ended.filter((ride) => ride.outcome.startsWith('fell')).length} fell in it, `
        + `${ended.filter((ride) => !ride.outcome.startsWith('fell')).length} other ends in it; mean ${mean((record) => record.degrees).toFixed(0)}° in ${mean((record) => record.seconds).toFixed(2)} s, `
        + `v ${mean((record) => record.speedIn).toFixed(2)}→${mean((record) => record.speedOut).toFixed(2)} m/s, face ${mean((record) => record.faceIn).toFixed(2)}→${mean((record) => record.faceOut).toFixed(2)}`);
    }
  }
}, 7_200_000);
