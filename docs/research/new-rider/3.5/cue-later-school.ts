/**
 * **Step 3.5u: when the Surf School's pop-up prompt shows, `?cueLater` off and on.** MEASUREMENT ONLY.
 *
 * The school's own recorded pool wave (`LESSON_WAVES`, `public/lessons/pool-s2-*.sea`), built as `main.ts`'s
 * `enterSchool` builds it (`surfZoneConfigFor` over `lessonConfig`, on the CPU), the rider placed at a lesson's start:
 *  * `LESSON=popUp` — the `caught` start (the lesson teaches the pop-up alone);
 *  * `LESSON=catch` — the `waiting` start (paddle, then pop up).
 * `PADDLE=1` paddles (and the rider sprints on its own cue) until the pop; `POP=1` pops at the ride status's cue (the
 * prompt the player is shown), `POP=0` never pops and logs both cues until `SECONDS`. One run per process.
 *
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/cue-later-school.ts -o <s>/school-raw.mjs --format esm --platform node
 *   printf "globalThis.location = { search: '' };\n" > <s>/school.mjs && cat <s>/school-raw.mjs >> <s>/school.mjs
 *   env LESSON=catch PADDLE=1 POP=1 EXTRA='&cueLater=on' node <s>/school.mjs
 */
import { readFileSync } from 'node:fs';
import { DEFAULT_PHYSICAL_SETTINGS, surfZoneConfigFor, type PhysicalSettings } from '../../../../src/game/PhysicalMode';
import { LocalSurfZone } from '../../../../src/game/SurfZoneHost';
import { lessonConfig, startPlacement, schoolWave } from '../../../../src/game/school/lessonWave';
import { LESSON_WAVES } from '../../../../src/game/school/lessonWaves';
import { createWaterSample } from '../../../../src/physics/SurfWater';
import { speedThroughWater } from '../../../../src/physics/takeOffCue';
import { decompress } from '../../../../src/wave/surfZoneState';
import { SURF_ZONE_STEP } from '../../../../src/wave/SurfZoneRunner';

const OWNER = '?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on';
const LESSON = process.env.LESSON ?? 'popUp';
const PADDLE = process.env.PADDLE === '1';
const POP = process.env.POP !== '0';
const SECONDS = Number(process.env.SECONDS ?? 10);
const EXTRA = process.env.EXTRA ?? '';
const r = (x: number | undefined, n = 3): number | null => (x === undefined || !Number.isFinite(x) ? null : Number(x.toFixed(n)));

async function main(): Promise<void> {
  (globalThis as { location?: { search: string } }).location = { search: `${OWNER}${EXTRA}` };
  const wave = schoolWave(LESSON_WAVES);
  const start = LESSON === 'catch' ? 'waiting' : 'caught';
  const settings: PhysicalSettings = {
    ...DEFAULT_PHYSICAL_SETTINGS, spot: wave.config.spot, stage: wave.stage, compute: 'cpu', source: 'practice', tide: wave.config.tide, windSpeed: wave.config.windSpeed,
  };
  const config = { ...surfZoneConfigFor(settings, wave.config.seed, false, lessonConfig(wave)), compute: 'cpu' as const };
  const sea = await decompress(new Uint8Array(readFileSync(`public/${wave.assets[start]}`)), true);
  const host = new LocalSurfZone(config, { rider: true }, sea);
  const placement = startPlacement(wave, start);
  const sample = createWaterSample();
  const out: Record<string, unknown> = { lesson: LESSON, start, paddle: PADDLE, pops: POP, cueLater: config.cueLater ?? null, rider: config.rider ?? null, spot: config.spot };
  let todayAt: number | undefined, playerAt: number | undefined, popAt: number | undefined, standAt: number | undefined, fellAt: number | undefined;
  let lit = 0, todayLit = 0;
  const vAt: Record<string, number | null> = {};
  const total = Math.round(SECONDS / SURF_ZONE_STEP);
  for (let step = 0; step < total; step += 1) {
    const t = step * SURF_ZONE_STEP;
    const runner = host.runner;
    const ride = step === 0 ? undefined : runner.status().ride;
    const prone = ride ? ride.phase === 'prone' : true;
    const today = step > 0 && runner.cue;
    const player = ride?.cue ?? false;
    const vW = speedThroughWater(runner.session!.board, runner.water, sample);
    if (today) { todayLit += SURF_ZONE_STEP; if (todayAt === undefined) { todayAt = t; vAt.today = r(vW); } }
    if (player) { lit += SURF_ZONE_STEP; if (playerAt === undefined) { playerAt = t; vAt.player = r(vW); } }
    const pop = POP && popAt === undefined && player;
    if (pop) popAt = t;
    host.advance(1, { paddle: PADDLE && prone && popAt === undefined, popUp: pop, steer: 0, retry: false, ...(step === 0 ? { place: placement } : {}) });
    const after = runner.status().ride!;
    if (after.phase === 'standing' && standAt === undefined) { standAt = t + SURF_ZONE_STEP; vAt.stand = r(speedThroughWater(runner.session!.board, runner.water, sample)); }
    if (after.phase === 'fallen' && fellAt === undefined) fellAt = t + SURF_ZONE_STEP;
    if (fellAt !== undefined || (standAt !== undefined && t - standAt > 3)) break;
  }
  Object.assign(out, {
    todayCue: r(todayAt), playerCue: r(playerAt), todayLitFor: r(todayLit), playerLitFor: r(lit), vW: vAt,
    pop: r(popAt), stand: r(standAt), fell: r(fellAt), fellAfterStand: fellAt !== undefined && standAt !== undefined ? r(fellAt - standAt) : null,
  });
  process.stdout.write(`${JSON.stringify(out)}\n`);
}
void main();
