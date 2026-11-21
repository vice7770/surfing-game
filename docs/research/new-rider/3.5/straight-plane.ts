/**
 * **Step 3.5p, the control: the test wave's face tilt alone, on a still plane of water.**
 *
 * `straight-fall.ts` follows the ride on the test wave. This file takes the wave away and keeps one thing of it: the
 * plane the board rides on. `PlaneWater` (`src/physics/PlaneWater.ts`) is a still sheet whose surface falls toward +z
 * by `SLOPE` (degrees, the fall line); the board is placed as the test wave places it (`RideSession.place`: on the
 * surface, flush with it, at `SPEED` m/s along `HEADING` degrees from +z toward +x, standing, posture 'plumb'). At the
 * test wave's own heading (54°) a 14.6° plane tilts 12° across the heading (rising toward the board's left) and falls
 * 8.7° along it, which is the test wave's face under the board at its start (`test-wave-probe.ts`: "face 14.6°, rising
 * 12.1° toward the board's left", deck pitch −8.0°). `ACROSS=0` keeps the along fall and removes the tilt across:
 * the plane then falls 8.7° straight along the heading (a terminal glide; the same push along the board).
 *
 * The rider is built from the owner's address through the game's own switch parsing (`surfZoneConfigFor`) and the
 * 3.5o field list (`sharp-steer.ts` `RIDER_KEYS`), and the host's build is printed back (the predictor's weights).
 *
 *     ./node_modules/.bin/rolldown docs/research/new-rider/3.5/straight-plane.ts -o <s>/sp.mjs --format esm --platform node
 *     env RIDER=new ACROSS=1 OUT=<s>/plane.jsonl node <s>/sp.mjs
 *
 * Env: `RIDER` new|old; `EXTRA` more switches; `SPEED` (7.7); `HEADING` (54); `SLOPE` (14.6, the plane's fall); `ACROSS`
 * 1|0; `HEADINGS`/`SPEEDS` comma lists for a grid (default the one cell); `SECONDS` (6); `OUT`.
 */
import { appendFileSync } from 'node:fs';
import { Quaternion, Vector3 } from 'three';
import { physicalSettingsFor } from '../../../../src/game/SurfConditions';
import { surfZoneConfigFor } from '../../../../src/game/PhysicalMode';
import type { AttachedRider } from '../../../../src/physics/AttachedRider';
import { PlaneWater } from '../../../../src/physics/PlaneWater';
import { RideSession } from '../../../../src/physics/RideSession';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const DEG = 180 / Math.PI;
const env = process.env;
const OWNER = '?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on';
const OLD = '?canyonWaves=true';
const RIDER = env.RIDER ?? 'new';
const search = `${RIDER === 'new' ? OWNER : OLD}${env.EXTRA ?? ''}`;
const SECONDS = Number(env.SECONDS ?? 6);
const SLOPE = Number(env.SLOPE ?? 14.6);
const ACROSS = env.ACROSS !== '0';
const headings = (env.HEADINGS ?? env.HEADING ?? '54').split(',').map(Number);
const speeds = (env.SPEEDS ?? env.SPEED ?? '7.7').split(',').map(Number);
const OUT = env.OUT;
const STEP = 1 / 60;
const r = (x: number | undefined | null, n = 4): number | null => (typeof x === 'number' && Number.isFinite(x) ? Number(x.toFixed(n)) : null);
const emit = (line: unknown): void => {
  if (OUT) appendFileSync(OUT, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
};

const RIDER_KEYS = [
  'stroke', 'swim', 'extension', 'duckBody', 'snap', 'snapQuick', 'snapPivot', 'snapRecentre', 'snapDepth', 'snapStamp',
  'agile', 'legDrive', 'hull', 'railSuction', 'compressPull', 'carveFlex', 'snapLegs', 'snapCross', 'legPower', 'rider',
  'feltFrame', 'kneeRoom', 'stanceReach', 'ankleLimit', 'ankleRange', 'bankClamp', 'bodyBank', 'askCap', 'stanceDeep',
  'deepen', 'armCarry', 'trunk', 'buoyFrame', 'waterHeel', 'mountAgree', 'riderBody', 'riderCost', 'plantFloor',
  'deckHollow', 'snapUpturn', 'swing',
] as const;
(globalThis as { location?: { search: string } }).location = { search };
const settings = physicalSettingsFor('canyon', { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' });
const config = surfZoneConfigFor(settings, 2, false) as unknown as Record<string, unknown>;
const options: Record<string, unknown> = {};
for (const key of RIDER_KEYS) if (config[key] !== undefined) options[key] = config[key];

emit({ kind: 'control', search, rider: RIDER, seconds: SECONDS, slope: SLOPE, across: ACROSS ? 1 : 0, headings, speeds, options });
for (const headingDeg of headings) for (const speed of speeds) {
  const heading = (headingDeg * Math.PI) / 180;
  // The plane: its fall line toward +z, or (ACROSS=0) along the heading, by the along part of the same slope.
  const s = Math.tan((SLOPE * Math.PI) / 180);
  const along = s * Math.cos(heading);
  const water = ACROSS ? new PlaneWater({ slopeZ: -s, depth: 3 }) : new PlaneWater({ slopeX: -along * Math.sin(heading), slopeZ: -along * Math.cos(heading), depth: 3 });
  const session = new RideSession(options as ConstructorParameters<typeof RideSession>[0]);
  const rider = session.rider as AttachedRider;
  const board = session.board;
  session.place({ x: 0, z: 0, heading, speed, phase: 'standing', followSurface: true, posture: 'plumb' }, water);
  const cell = `${headingDeg}|${speed}`;
  const w = (rider as Any).predictor?.weights;
  emit({ kind: 'built', cell, plantFloor: w?.plantFloor ?? null, riderBody: w?.riderBody ?? null, newRider: (rider as Any).newRider, predictive: (rider as Any).predictive, deckFelt: (rider as Any).deckFelt });
  let fell = Number.NaN;
  for (let step = 0; step < Math.round(SECONDS / STEP); step += 1) {
    const t = (step + 1) * STEP;
    session.step(STEP, water, { paddle: false, popUp: false, steer: 0 });
    const self = rider as Any;
    const q = board.orientation as Quaternion;
    const left = new Vector3(1, 0, 0).applyQuaternion(q);
    const fwd = new Vector3(0, 0, 1).applyQuaternion(q);
    const up = new Vector3(0, 1, 0).applyQuaternion(q);
    const hq = self.heading as Quaternion;
    const side = new Vector3(1, 0, 0).applyQuaternion(hq);
    const roll = Math.atan2(up.dot(side), up.y);
    const waterUp = self.waterUp as Vector3;
    const tilt = Math.atan2(waterUp.dot(side), waterUp.y);
    const st = rider.human.state;
    emit({
      kind: 'frame', cell, t: r(t, 5), attached: rider.attached ? 1 : 0, sep: session.separation ?? null,
      speedThrough: r(self.leanProbe.speedThrough), heading: r(Math.atan2(fwd.x, fwd.z) * DEG, 3), course: r(Math.atan2(board.velocity.x, board.velocity.z) * DEG, 3),
      roll: r(roll * DEG), faceTilt: r(tilt * DEG), rail: r((roll - tilt) * DEG), pitch: r(Math.asin(Math.max(-1, Math.min(1, fwd.y))) * DEG),
      yawRate: r(board.angularVelocity.dot(up) * DEG, 3), slip: r(Math.atan2(board.velocity.dot(left), board.velocity.dot(fwd)) * DEG, 3),
      bank: r(self.bank.angle * DEG), ankle: r((self.bank.angle - roll) * DEG), rest: r(self.ankleRest * DEG), heldRaw: r(self.heldAnkleRaw * DEG),
      ankleT: r(self.ankleTorque, 3), swingT: r(self.swingTorque, 3), twA: r(self.twistBody?.angle * DEG, 3), twActive: r(self.twistBody?.active, 3),
      legRest: r(self.leg?.rest, 4), cpX: r(st.across, 5), cpZ: r(st.along, 5), past: r(st.past, 5), limit: self.limit,
      bias: r(self.predictor?.bias?.[0] * DEG, 3), biasTwist: r(self.predictor?.bias?.[1], 3),
    });
    if (!rider.attached) { fell = t; break; }
  }
  emit({ kind: 'summary', cell, fell: r(fell, 5), censored: Number.isNaN(fell) ? 1 : 0, seconds: SECONDS, sep: session.separation ?? null });
}
