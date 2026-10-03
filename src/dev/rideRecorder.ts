/**
 * Dev tool (`?inpage&record`): an autopilot (`Autopilot`) paddles for waves in
 * the physical surf zone, pops up on the cue and rides S-turns up and down the face (`&style=line`:
 * holds a line along it; `&style=flow`: rides the movement flow, bottom turn, projection, trim, cutback), while the game's own
 * renderer films it frame by frame into an H.264 MP4 (WebCodecs). Failed
 * attempts are dropped; the first ride of at least MIN_RIDE seconds is posted
 * to a local receiver (RECEIVER, `npm run record:ride`) as `ride.mp4`. It
 * steps the simulation itself, so it runs the same in a hidden page, just not
 * in real time. `&compute=gpu` (or `auto`) steps the sea in the game's worker,
 * on the GPU tier as an M4 player's does (`&components=` fixes its sea;
 * otherwise the graphics preset picks it, `?graphics=` in main.ts); the
 * default, `cpu`, steps it in the page as before.
 *
 * On the Wave Pool (`&spot=pool`) the paddled catch is hardly ever ridden, so `&start=trough` (in the trough ahead of a
 * breaking wave, for the flow from its bottom turn) or `&start=face` (on the face, for the trim) puts the standing rider
 * in place instead, as the pool flow probe does (`poolStart.ts`; the CPU tier). `&size=small|medium|big` picks the
 * pool's size as the Surf screen does, `&arm=left` its left arm (the right is the game's take-off), `&pump=1` has the
 * flow's trim pump, `&trimOnly=1` keeps it in the trim, `&flowFrom=trim` starts the flow in a phase, and
 * `&view=front|behind|side` the camera.
 */
import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import { PerspectiveCamera, Vector3 } from 'three';
import { DEFAULT_PHYSICAL_SETTINGS, type PhysicalMode, type PhysicalSettings } from '../game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../game/SurfConditions';
import type { RiderPlacement } from '../physics/RideSession';
import { SEA_COMPONENTS, type SurfZoneConfig } from '../wave/SurfZoneSimulation';
import { LIP_STRIDE } from '../wave/SurfZoneRunner';
import { Autopilot, autopilotView, type FlowPhase, type FlowRecord, type TurnRecord } from './Autopilot';
import { advance, breathe } from './devStepping';
import { PoolStart, type PoolStartKind } from './poolStart';

export interface RecordingHooks {
  start(settings: PhysicalSettings, overrides?: Partial<SurfZoneConfig>): Promise<void>;
  step(input: { paddle: boolean; popUp: boolean; steer: number }): void;
  retry(): void;
  /** Render a frame, from `camera` when given, else the mode's own view. */
  render(seconds: number, camera?: PerspectiveCamera): void;
  resize(width: number, height: number): void;
  mode: PhysicalMode;
  canvas: HTMLCanvasElement;
}

const params = new URLSearchParams(window.location.search);
const RECEIVER = params.get('receiver') ?? 'http://localhost:5199';
const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 30;
const STEP = 1 / 60;
/** Physics steps per filmed frame. */
const STEPS_PER_FRAME = Math.round(1 / (FPS * STEP));
const MIN_RIDE = Number(params.get('minRide') ?? 5);
/** A crest this far above still water within LOOK m behind the board starts a paddle, as in the catch report. */
const LOOK = 16;
const GIVE_UP = 8;
/** Where the autopilot waits, m outside the break line: the catch report's riders stood from 4–8 m out. */
const WAIT_OUTSIDE = Number(params.get('outside') ?? 5);
/** Seconds of waiting kept before an attempt, and of aftermath after it. */
const LEAD = 4;
const AFTER = 2.5;
const MAX_SIM_SECONDS = Number(params.get('maxMinutes') ?? 20) * 60;
const STYLE = params.get('style') === 'line' ? 'line' : params.get('style') === 'flow' ? 'flow' : 'turns';
/** `start=trough|face`: on the Wave Pool, put the standing rider in place for each attempt instead of paddling (`poolStart.ts`). */
const START: PoolStartKind | undefined = params.get('start') === 'trough' || params.get('start') === 'face' ? (params.get('start') as PoolStartKind) : undefined;
/** `arm=left`: the pool's left arm, the right (the game's take-off) by default. */
const ARM = params.get('arm') === 'left' ? -1 : 1;
/** `size=small|medium|big`: the Wave Pool's size, as the Surf screen picks it (the practice swell, its Medium, by default). */
const SIZE = ['small', 'medium', 'big'].includes(params.get('size') ?? '') ? (params.get('size') as SwellSize) : undefined;
/**
 * `pump=1`: the flow's trim pumps about the face's band, else it holds the band. `trimOnly=1`: once trimming it stays in the
 * trim (no bottom turn or cutback from it). `flowFrom=`: the phase the flow starts in.
 */
const PUMP = params.get('pump') === '1';
const TRIM_ONLY = params.get('trimOnly') === '1';
const FLOW_FROM = ['drop', 'bottom', 'project', 'trim', 'cutback', 'rebound'].includes(params.get('flowFrom') ?? '') ? (params.get('flowFrom') as FlowPhase) : undefined;
/** `view=front|behind|side`: the following camera (the game's front view by default). */
const VIEW = ['front', 'behind', 'side'].includes(params.get('view') ?? '') ? (params.get('view') as 'front' | 'behind' | 'side') : undefined;
/**
 * `need=bottom`: keep only a ride with a bottom turn in it (and at least MIN_RIDE s long): one that reached its end,
 * heading up the face, or with `&turn=D`, one that turned at least D degrees. Riding the flow (`&style=flow`) any of its
 * phases can be asked for, such as `need=cutback`.
 */
const NEED = params.get('need');
const NEED_TURN = params.has('turn') ? Number(params.get('turn')) : undefined;
/** `turnLimit=S`: the longest the autopilot holds a turn, s (1.5 by default). */
const TURN_LIMIT = Number(params.get('turnLimit')) || undefined;
/** `bitrate=B`: the film's bits a second (8 Mbit/s by default). */
const BITRATE = Number(params.get('bitrate') ?? 8_000_000);
/** `watch=S`: film S s of lips flying near the take-off, from beside them, instead of a ride (`waves.mp4`). */
const WATCH = Number(params.get('watch') ?? 0);
/** The watching camera looks along the crest into the tube it follows, from this far along it and this far inshore, m. */
const WATCH_SIDE = Number(params.get('side') ?? 7);
const WATCH_SHOREWARD = Number(params.get('shoreward') ?? 1.5);
/** It follows the newest throws within `reach` m of the take-off (25 by default), and the strips within this far along the crest of them, m. */
const WATCH_REACH = Number(params.get('reach') ?? 25);
const WATCH_SECTION = 6;
/** The swell to film, overriding the source's (`hs`, `tp` and `dir` in m, s and degrees; `spread` on the Wave Lab's 0–1 slider). */
const SWELL_OVERRIDES = Object.fromEntries(([['hs', 'significantHeight'], ['tp', 'peakPeriod'], ['dir', 'directionDegrees'], ['spread', 'spread']] as const)
  .filter(([key]) => params.has(key)).map(([key, field]) => [field, Number(params.get(key))]));

const post = (path: string, body: BodyInit) => fetch(`${RECEIVER}${path}`, { method: 'POST', body }).catch(() => undefined);
const log = (text: string) => post('/log', text);
/** `&compute=gpu|auto`: the sea steps in the game's worker, on its GPU tier (main.ts leaves `inpage` for it); `cpu` in the page. */
const COMPUTE = params.get('compute') === 'gpu' ? 'gpu' : params.get('compute') === 'auto' ? 'auto' : 'cpu';
const COMPONENTS = Number(params.get('components')) || undefined;

/** H.264, or VP9 where the browser has no H.264 encoder (Chromium on Linux): chosen once in `recordRide`. */
const CODECS = { avc: 'avc1.640028', vp9: 'vp09.00.40.08' } as const;
let codec: keyof typeof CODECS = 'avc';

export class Clip {
  private readonly muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec, width: WIDTH, height: HEIGHT }, fastStart: 'in-memory' });
  private readonly encoder: VideoEncoder;
  frames = 0;

  constructor() {
    this.encoder = new VideoEncoder({
      output: (chunk, meta) => this.muxer.addVideoChunk(chunk, meta),
      error: (error) => void log(`encoder error ${error.message}`),
    });
    this.encoder.configure({ codec: CODECS[codec], width: WIDTH, height: HEIGHT, bitrate: BITRATE, framerate: FPS });
  }

  async add(canvas: HTMLCanvasElement): Promise<void> {
    const frame = new VideoFrame(canvas, { timestamp: Math.round((this.frames * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    this.encoder.encode(frame, { keyFrame: this.frames % (2 * FPS) === 0 });
    frame.close();
    this.frames += 1;
    while (this.encoder.encodeQueueSize > 8) await breathe();
  }

  async finish(): Promise<ArrayBuffer> {
    await this.encoder.flush();
    this.muxer.finalize();
    return this.muxer.target.buffer;
  }

  drop(): void {
    if (this.encoder.state !== 'closed') this.encoder.close();
  }
}

/** H.264 when the browser encodes it, else VP9; false (and logged) when it encodes neither. */
export async function prepareCodec(): Promise<boolean> {
  const supported = async (name: keyof typeof CODECS) =>
    (await VideoEncoder.isConfigSupported({ codec: CODECS[name], width: WIDTH, height: HEIGHT, bitrate: 8_000_000, framerate: FPS })).supported;
  if (!(await supported('avc'))) {
    if (!(await supported('vp9'))) {
      await log('neither H.264 nor VP9 encoding is supported here');
      return false;
    }
    codec = 'vp9';
    await log('no H.264 encoder here: filming VP9 in the MP4');
  }
  return true;
}

export async function recordRide(hooks: RecordingHooks): Promise<void> {
  if (!(await prepareCodec())) return;
  const spot = (params.get('spot') ?? 'point') as PhysicalSettings['spot'];
  const source = (params.get('source') ?? 'practice') as PhysicalSettings['source'];
  const compute = COMPUTE === 'cpu' ? 'cpu' : 'auto';
  const settings: PhysicalSettings = SIZE && spot === 'pool'
    ? { ...physicalSettingsFor('pool', { swell: SIZE, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute }), ...SWELL_OVERRIDES }
    : { ...DEFAULT_PHYSICAL_SETTINGS, spot, source, compute, ...SWELL_OVERRIDES };
  await log(`starting ${spot} (${settings.source}${SIZE && spot === 'pool' ? `, ${SIZE}` : ''})`);
  await hooks.start(settings, COMPONENTS ? { componentCount: COMPONENTS } : undefined);
  hooks.resize(WIDTH, HEIGHT);
  if (VIEW) hooks.mode.setRideView(VIEW);
  const host = hooks.mode.host!;
  const composite = document.createElement('canvas');
  composite.width = WIDTH;
  composite.height = HEIGHT;
  const context = composite.getContext('2d')!;
  if (WATCH > 0) {
    await filmBreaks(hooks, context, spot, source);
    return;
  }
  const rise = 0.25 * (source === 'practice' ? 2 : settings.significantHeight);
  const autopilot = new Autopilot({
    waitOutside: WAIT_OUTSIDE, rise, giveUp: GIVE_UP, style: STYLE, ...(TURN_LIMIT ? { turnLimit: TURN_LIMIT } : {}),
    ...(PUMP ? { pump: true } : {}), ...(TRIM_ONLY ? { trimOnly: true } : {}), ...(FLOW_FROM ? { flowFrom: FLOW_FROM } : {}),
  });
  // A placed start: the rider waits on the lineup for a wave to break in the arm's column, then is put in place.
  const placed = START ? PoolStart.at(host, ARM) : undefined;
  if (START && !placed) {
    await log(`start=${START} needs spot=pool stepped in the page (the CPU tier: no &compute=gpu)`);
    return;
  }
  let holding = placed !== undefined;
  let placedStep = -Infinity;

  let clip = new Clip();
  let previous = autopilot.state;
  let waited = 0;
  let after = 0;
  let simulated = 0;
  let step = 0;

  while (simulated < MAX_SIM_SECONDS) {
    const riding = host.snapshot.status.ride;
    let input = { paddle: false, popUp: false, steer: 0 };
    // Watch behind: the highest water within LOOK m seaward of the board.
    const view = autopilotView(host, hooks.mode.focus.z, settings.tide, LOOK);
    if (placed && START) {
      // Idle on the lineup until a wave is due; the step after the rider is put in place, the attempt begins.
      if (holding && placed.due()) {
        holding = false;
        placedStep = step;
        const placement = placed.placement(START);
        hooks.mode.place(placement);
        hooks.mode.camera.setView(hooks.mode.camera.view);
        clip.drop();
        clip = new Clip();
        await log(`${START} start at ${host.snapshot.status.seaTime.toFixed(1)} s sea time: ${placementLine(placement)}`);
      } else if (step === placedStep + 1) {
        autopilot.reset();
        autopilot.go();
      }
      // The A-frame peels both ways: the arm the rider is put on is the one it rides.
      if (!holding && step > placedStep && view) input = autopilot.next({ ...view, peelDirection: ARM }, STEP);
    } else if (view) {
      input = autopilot.next(view, STEP);
    }
    const { state } = autopilot;
    if (state === 'wait' && previous !== 'wait') {
      // Film only the last few seconds of waiting before a wave.
      clip.drop();
      clip = new Clip();
      waited = 0;
    }
    if (state === 'wait') {
      waited += STEP;
      if (waited > LEAD) {
        clip.drop();
        clip = new Clip();
        waited = 0;
      }
    }
    previous = state;
    const label = labelFor(autopilot, riding?.speed ?? 0, input.popUp);
    if (state === 'done') {
      after += STEP;
      if (after > AFTER) {
        const needed = STYLE === 'flow'
          ? !NEED || autopilot.flowRecords.some((phase) => phase.phase === NEED && (NEED_TURN === undefined ? phase.completed : Math.abs(phase.degrees) >= NEED_TURN))
          : NEED !== 'bottom' || autopilot.turnRecords.some((turn) => turn.kind === 'bottom'
            && (NEED_TURN === undefined ? turn.completed : turn.degrees >= NEED_TURN));
        if (autopilot.rideTime >= MIN_RIDE && needed) {
          const video = await clip.finish();
          await post('/upload?name=ride.mp4', video);
          await log(`saved a ${autopilot.rideTime.toFixed(1)} s ride after ${autopilot.attempts} attempts, ${(simulated / 60).toFixed(1)} min simulated, ${clip.frames} frames`);
          await log(`${rideLines(autopilot, clip.frames / FPS - autopilot.rideTime - AFTER)}`);
          return;
        }
        await log(`attempt ${autopilot.attempts}: ${label} (${(simulated / 60).toFixed(1)} min simulated); ${rideLines(autopilot, clip.frames / FPS - autopilot.rideTime - AFTER)}`);
        clip.drop();
        clip = new Clip();
        hooks.retry();
        autopilot.reset();
        previous = autopilot.state;
        after = 0;
        holding = placed !== undefined;
      }
    }
    await advance(hooks, 1, input);
    simulated += STEP;
    step += 1;
    // A placed start films from the moment the rider is in place, not while it waits.
    if (step % STEPS_PER_FRAME === 0 && !holding) {
      hooks.render(STEPS_PER_FRAME * STEP);
      context.drawImage(hooks.canvas, 0, 0, WIDTH, HEIGHT);
      drawOverlay(context, spot, spot === 'pool' ? SIZE ?? 'medium' : source, label, autopilot.attempts, START ? `AUTOPILOT · ${START.toUpperCase()} START · ATTEMPT ${autopilot.attempts}` : undefined);
      await clip.add(composite);
    }
    if (step % 30 === 0) await breathe();
  }
  await log(`no ride of ${MIN_RIDE} s in ${autopilot.attempts} attempts`);
}

/** A placement for the log: where, which way and how fast. */
function placementLine(placement: RiderPlacement): string {
  return `x ${placement.x.toFixed(1)} z ${placement.z.toFixed(1)}, heading ${((placement.heading * 180) / Math.PI).toFixed(0)}°, ${placement.speed} m/s over the water`;
}

/**
 * What the ride did, for the log: the turns ridden (style `turns`), or the flow's phases (style `flow`), with the film
 * standing `lead` s into it (`ffmpeg -ss` takes the film's own time).
 */
function rideLines(autopilot: Autopilot, lead: number): string {
  return STYLE === 'flow'
    ? `flow (the film stands at ${lead.toFixed(1)} s; times are the film's): ${flowLines(autopilot.flowRecords, lead)}`
    : `turns (the film starts ${lead.toFixed(1)} s before standing): ${turnLines(autopilot.turnRecords)}`;
}

/** The flow's phases ridden, one line each: when in the film, which, how long and far, and the speed and face kept. */
function flowLines(phases: readonly FlowRecord[], lead: number): string {
  if (!phases.length) return 'none';
  return phases.map((phase) => `${phase.phase} at ${(lead + phase.at).toFixed(2)} s: ${phase.degrees.toFixed(0)}° in ${phase.seconds.toFixed(2)} s, `
    + `${(phase.speedIn * 3.6).toFixed(0)} → ${(phase.speedOut * 3.6).toFixed(0)} km/h, face ${phase.faceIn.toFixed(2)} → ${phase.faceOut.toFixed(2)}${phase.completed ? '' : ', unfinished'}`).join('; ');
}

/** The turns ridden, one line each: when, which, how far and long, and the speed kept. */
function turnLines(turns: readonly TurnRecord[]): string {
  if (!turns.length) return 'none';
  return turns.map((turn) => `${turn.kind} at ${turn.at.toFixed(2)} s: ${turn.degrees.toFixed(0)}° in ${turn.seconds.toFixed(2)} s, `
    + `${(turn.speedIn * 3.6).toFixed(0)} → ${(turn.speedOut * 3.6).toFixed(0)} km/h (${(turn.speedOut / Math.max(1e-6, turn.speedIn)).toFixed(2)})${turn.completed ? '' : ', unfinished'}`).join('; ');
}

/** The overlay's line for what the autopilot is doing. */
function labelFor(autopilot: Autopilot, speed: number, poppingUp: boolean): string {
  switch (autopilot.state) {
    case 'position': return 'PADDLING INTO POSITION';
    case 'wait': return 'WAITING FOR A WAVE';
    case 'go': return poppingUp ? 'POP-UP' : 'PADDLING';
    case 'ride': return `RIDING ${(speed * 3.6).toFixed(0)} km/h · ${autopilot.rideTime.toFixed(1)} s${autopilot.phase ? ` · ${autopilot.phase}` : ''}`;
    case 'done': return autopilot.rideTime > 0 ? `RODE ${autopilot.rideTime.toFixed(1)} s · ${autopilot.outcome}` : (autopilot.outcome ?? '').toUpperCase();
  }
}

/**
 * Film the break from beside its flying lip: every moment a lip flies within
 * `reach` of the take-off, and a second after, until WATCH s are filmed (the
 * quiet spells between sets are left out). The camera stands on the shoulder,
 * ahead of the peel, looking back along the crest into the tube.
 */
async function filmBreaks(hooks: RecordingHooks, context: CanvasRenderingContext2D, spot: string, source: string): Promise<void> {
  const host = hooks.mode.host!;
  const camera = new PerspectiveCamera(45, WIDTH / HEIGHT, 0.1, 3000);
  const aim = new Vector3(hooks.mode.focus.x, 0.5, hooks.mode.focus.z);
  const lip = new Vector3();
  const clip = new Clip();
  let simulated = 0;
  let step = 0;
  let filmed = 0;
  let sinceLip = Infinity;
  let side = 1;
  let lastX = Number.NaN;
  const idle = { paddle: false, popUp: false, steer: 0 };
  while (simulated < MAX_SIM_SECONDS && filmed < WATCH) {
    await advance(hooks, STEPS_PER_FRAME, idle);
    simulated += STEPS_PER_FRAME * STEP;
    step += STEPS_PER_FRAME;
    if (step % 30 === 0) await breathe();
    const { snapshot } = host;
    // The section around the newest throw near the take-off.
    let newest = -Infinity;
    let newestX = 0;
    for (let k = 0; k < snapshot.lipCount; k += 1) {
      const o = k * LIP_STRIDE;
      if (Math.abs(snapshot.lip[o] - hooks.mode.focus.x) < WATCH_REACH && snapshot.lip[o + 5] > newest) {
        newest = snapshot.lip[o + 5];
        newestX = snapshot.lip[o];
      }
    }
    let count = 0;
    lip.set(0, 0, 0);
    for (let k = 0; k < snapshot.lipCount; k += 1) {
      const o = k * LIP_STRIDE;
      if (snapshot.lip[o + 5] < newest - 0.5 || Math.abs(snapshot.lip[o] - newestX) > WATCH_SECTION) continue;
      lip.x += snapshot.lip[o];
      lip.y += snapshot.lip[o + 1];
      lip.z += snapshot.lip[o + 2];
      count += 1;
    }
    if (count > 0) {
      lip.divideScalar(count);
      if (sinceLip > 1) aim.copy(lip);
      else aim.lerp(lip, 1 - Math.exp(-3 * STEPS_PER_FRAME * STEP));
      // The peel runs toward the newer throws: the camera stands ahead of it.
      if (sinceLip <= 1 && Math.abs(newestX - lastX) > 0.5) side = Math.sign(newestX - lastX);
      lastX = newestX;
      sinceLip = 0;
    } else {
      sinceLip += STEPS_PER_FRAME * STEP;
    }
    if (sinceLip > 1) continue;
    const x = aim.x + side * WATCH_SIDE;
    const z = aim.z + WATCH_SHOREWARD;
    camera.position.set(x, Math.max(host.heightAt(x, z) + 0.4, aim.y), z);
    camera.lookAt(aim);
    hooks.render(STEPS_PER_FRAME * STEP, camera);
    context.drawImage(hooks.canvas, 0, 0, WIDTH, HEIGHT);
    drawOverlay(context, spot, source, `THE LIP THROWS · ${(simulated / 60).toFixed(1)} MIN IN`, 0, `WATCHING THE BREAK · ${tier(hooks)}`);
    await clip.add(context.canvas);
    filmed += STEPS_PER_FRAME * STEP;
  }
  if (filmed === 0) {
    await log(`no wave threw a lip in ${(simulated / 60).toFixed(1)} min`);
    return;
  }
  const video = await clip.finish();
  await post('/upload?name=waves.mp4', video);
  await log(`saved ${clip.frames} frames of breaking waves over ${(simulated / 60).toFixed(1)} min simulated, ${tier(hooks)}`);
}

/** Which tier steps the sea, and on how many components: asked for the GPU and given the CPU (no WebGPU) says so. */
function tier(hooks: RecordingHooks): string {
  const stepped = hooks.mode.host?.snapshot.status.compute ?? 'cpu';
  return `${stepped.toUpperCase()} ${hooks.mode.config?.componentCount ?? SEA_COMPONENTS}${COMPUTE === 'gpu' && stepped !== 'gpu' ? ' (ASKED FOR GPU)' : ''}`;
}

function drawOverlay(context: CanvasRenderingContext2D, spot: string, source: string, label: string, attempt: number, activity = `AUTOPILOT · ATTEMPT ${attempt}`): void {
  const detail = `${spot.toUpperCase()} · ${source === 'practice' ? 'PRACTICE GROUNDSWELL' : source.toUpperCase()} · BOUSSINESQ · ${activity}`;
  context.save();
  // The box grows to its lines (the watching film's detail names its tier; a ride's label names its turn), never
  // narrower than it was.
  context.font = '15px ui-monospace, Menlo, monospace';
  const detailWidth = context.measureText(detail).width;
  context.font = '600 22px ui-monospace, Menlo, monospace';
  const width = Math.max(560, detailWidth + 32, context.measureText(label).width + 32);
  context.fillStyle = 'rgba(8, 24, 32, 0.55)';
  context.fillRect(24, 24, width, 74);
  context.fillStyle = '#e8f4f2';
  context.font = '600 22px ui-monospace, Menlo, monospace';
  context.fillText(label, 40, 56);
  context.font = '15px ui-monospace, Menlo, monospace';
  context.fillStyle = 'rgba(232, 244, 242, 0.8)';
  context.fillText(detail, 40, 84);
  context.restore();
}
