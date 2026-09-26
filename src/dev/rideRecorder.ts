/**
 * Dev tool (`?inpage&record`): an autopilot (`Autopilot`) paddles for waves in
 * the physical surf zone, pops up on the cue and holds a line along the face, while the game's own
 * renderer films it frame by frame into an H.264 MP4 (WebCodecs). Failed
 * attempts are dropped; the first ride of at least MIN_RIDE seconds is posted
 * to a local receiver (RECEIVER, `npm run record:ride`) as `ride.mp4`. It
 * steps the simulation itself, so it runs the same in a hidden page, just not
 * in real time.
 */
import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import { DEFAULT_PHYSICAL_SETTINGS, type PhysicalMode, type PhysicalSettings } from '../game/PhysicalMode';
import { RIDER_SNAPSHOT } from '../wave/SurfZoneRunner';
import { Autopilot } from './Autopilot';

interface RecordingHooks {
  start(settings: PhysicalSettings): Promise<void>;
  step(input: { paddle: boolean; popUp: boolean; steer: number }): void;
  retry(): void;
  render(seconds: number): void;
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

const post = (path: string, body: BodyInit) => fetch(`${RECEIVER}${path}`, { method: 'POST', body }).catch(() => undefined);
const log = (text: string) => post('/log', text);
/** Yield to the event loop without a timer (timers are throttled in hidden pages). */
const breathe = () => new Promise<void>((resolve) => {
  const channel = new MessageChannel();
  channel.port1.onmessage = () => resolve();
  channel.port2.postMessage(0);
});

class Clip {
  private readonly muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: WIDTH, height: HEIGHT }, fastStart: 'in-memory' });
  private readonly encoder: VideoEncoder;
  frames = 0;

  constructor() {
    this.encoder = new VideoEncoder({
      output: (chunk, meta) => this.muxer.addVideoChunk(chunk, meta),
      error: (error) => void log(`encoder error ${error.message}`),
    });
    this.encoder.configure({ codec: 'avc1.640028', width: WIDTH, height: HEIGHT, bitrate: 8_000_000, framerate: FPS });
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

export async function recordRide(hooks: RecordingHooks): Promise<void> {
  const support = await VideoEncoder.isConfigSupported({ codec: 'avc1.640028', width: WIDTH, height: HEIGHT, bitrate: 8_000_000, framerate: FPS });
  if (!support.supported) {
    await log('H.264 encoding is not supported here');
    return;
  }
  const spot = (params.get('spot') ?? 'point') as PhysicalSettings['spot'];
  const source = (params.get('source') ?? 'practice') as PhysicalSettings['source'];
  const settings: PhysicalSettings = { ...DEFAULT_PHYSICAL_SETTINGS, spot, source, compute: 'cpu' };
  await log(`starting ${spot} (${source})`);
  await hooks.start(settings);
  hooks.resize(WIDTH, HEIGHT);
  const host = hooks.mode.host!;
  const composite = document.createElement('canvas');
  composite.width = WIDTH;
  composite.height = HEIGHT;
  const context = composite.getContext('2d')!;
  const rise = 0.25 * (source === 'practice' ? 2 : settings.significantHeight);
  const autopilot = new Autopilot({ waitOutside: WAIT_OUTSIDE, rise, giveUp: GIVE_UP });

  let clip = new Clip();
  let previous = autopilot.state;
  let waited = 0;
  let after = 0;
  let simulated = 0;
  let step = 0;

  while (simulated < MAX_SIM_SECONDS) {
    const { status, board, rider } = host.snapshot;
    const riding = status.ride;
    let input = { paddle: false, popUp: false, steer: 0 };
    if (riding) {
      // Watch behind: the highest water within LOOK m seaward of the board.
      let crest = -Infinity;
      for (let back = 2; back <= LOOK; back += 2) crest = Math.max(crest, host.heightAt(board[0], board[2] - back));
      input = autopilot.next({
        ride: riding,
        peelDirection: status.peel?.direction ?? 0,
        board: { x: board[0], z: board[2], heading: rider[RIDER_SNAPSHOT.heading] },
        focusZ: hooks.mode.focus.z,
        crestBehind: crest - settings.tide,
      }, STEP);
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
        if (autopilot.rideTime >= MIN_RIDE) {
          const video = await clip.finish();
          await post('/upload?name=ride.mp4', video);
          await log(`saved a ${autopilot.rideTime.toFixed(1)} s ride after ${autopilot.attempts} attempts, ${(simulated / 60).toFixed(1)} min simulated, ${clip.frames} frames`);
          return;
        }
        await log(`attempt ${autopilot.attempts}: ${label} (${(simulated / 60).toFixed(1)} min simulated)`);
        clip.drop();
        clip = new Clip();
        hooks.retry();
        autopilot.reset();
        previous = autopilot.state;
        after = 0;
      }
    }
    hooks.step(input);
    simulated += STEP;
    step += 1;
    if (step % STEPS_PER_FRAME === 0) {
      hooks.render(STEPS_PER_FRAME * STEP);
      context.drawImage(hooks.canvas, 0, 0, WIDTH, HEIGHT);
      drawOverlay(context, spot, source, label, autopilot.attempts);
      await clip.add(composite);
    }
    if (step % 30 === 0) await breathe();
  }
  await log(`no ride of ${MIN_RIDE} s in ${autopilot.attempts} attempts`);
}

/** The overlay's line for what the autopilot is doing. */
function labelFor(autopilot: Autopilot, speed: number, poppingUp: boolean): string {
  switch (autopilot.state) {
    case 'position': return 'PADDLING INTO POSITION';
    case 'wait': return 'WAITING FOR A WAVE';
    case 'go': return poppingUp ? 'POP-UP' : 'PADDLING';
    case 'ride': return `RIDING ${(speed * 3.6).toFixed(0)} km/h · ${autopilot.rideTime.toFixed(1)} s`;
    case 'done': return autopilot.rideTime > 0 ? `RODE ${autopilot.rideTime.toFixed(1)} s · ${autopilot.outcome}` : (autopilot.outcome ?? '').toUpperCase();
  }
}

function drawOverlay(context: CanvasRenderingContext2D, spot: string, source: string, label: string, attempt: number): void {
  context.save();
  context.fillStyle = 'rgba(8, 24, 32, 0.55)';
  context.fillRect(24, 24, 560, 74);
  context.fillStyle = '#e8f4f2';
  context.font = '600 22px ui-monospace, Menlo, monospace';
  context.fillText(label, 40, 56);
  context.font = '15px ui-monospace, Menlo, monospace';
  context.fillStyle = 'rgba(232, 244, 242, 0.8)';
  context.fillText(`${spot.toUpperCase()} · ${source === 'practice' ? 'PRACTICE GROUNDSWELL' : source.toUpperCase()} · BOUSSINESQ · AUTOPILOT · ATTEMPT ${attempt}`, 40, 84);
  context.restore();
}
