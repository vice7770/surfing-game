/**
 * Dev tool (`?inpage&record`): an autopilot paddles for waves in the physical
 * surf zone, pops up on the cue and rides straight, while the game's own
 * renderer films it frame by frame into an H.264 MP4 (WebCodecs). Failed
 * attempts are dropped; the first ride of at least MIN_RIDE seconds is posted
 * to a local receiver (RECEIVER, `npm run record:ride`) as `ride.mp4`. It
 * steps the simulation itself, so it runs the same in a hidden page, just not
 * in real time.
 */
import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import { DEFAULT_PHYSICAL_SETTINGS, type PhysicalMode, type PhysicalSettings } from '../game/PhysicalMode';

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

  let clip = new Clip();
  let state = 'position' as 'position' | 'wait' | 'go' | 'after';
  let clock = 0;
  let waited = 0;
  let stood = false;
  let ride = 0;
  let stalled = 0;
  let attempts = 0;
  let popped = false;
  let label = 'PADDLING INTO POSITION';
  let simulated = 0;
  let step = 0;

  const endAttempt = (why: string) => {
    state = 'after';
    clock = 0;
    label = stood ? `RODE ${ride.toFixed(1)} s · ${why}` : why.toUpperCase();
  };

  while (simulated < MAX_SIM_SECONDS) {
    const { status } = host.snapshot;
    const board = host.snapshot.board;
    const riding = status.ride;
    const input = { paddle: false, popUp: false, steer: 0 };
    if (state === 'position' && riding) {
      // From the relaunch point, paddle in to just outside the break line, then wait there.
      if (hooks.mode.focus.z - board[2] > WAIT_OUTSIDE && riding.phase === 'prone') {
        input.paddle = true;
      } else {
        state = 'wait';
        waited = 0;
        label = 'WAITING FOR A WAVE';
        clip.drop();
        clip = new Clip();
      }
    } else if (state === 'wait' && riding) {
      let crest = -Infinity;
      for (let back = 2; back <= LOOK; back += 2) crest = Math.max(crest, host.heightAt(board[0], board[2] - back));
      waited += STEP;
      if (crest - settings.tide > rise) {
        state = 'go';
        clock = 0;
        stood = false;
        popped = false;
        ride = 0;
        stalled = 0;
        attempts += 1;
        label = 'PADDLING';
      } else if (waited > LEAD) {
        // Keep only the last few seconds of waiting before the wave.
        clip.drop();
        clip = new Clip();
        waited = 0;
      }
    } else if (state === 'go' && riding) {
      clock += STEP;
      if (riding.separation || riding.phase === 'fallen' || riding.phase === 'recover') {
        endAttempt(riding.separation ? `fell · ${riding.separation}` : 'no stand');
      } else if (riding.phase === 'prone') {
        input.paddle = true;
        if (riding.cue && !popped) {
          input.popUp = true;
          input.paddle = false;
          popped = true;
          label = 'POP-UP';
        } else if (clock > GIVE_UP) {
          endAttempt('missed the wave');
        }
      } else {
        if (riding.popUp.outcome === 'stood') stood = true;
        if (stood) {
          ride += STEP;
          stalled = riding.speed < 1.5 ? stalled + STEP : 0;
          label = `RIDING ${riding.speed.toFixed(1)} m/s · ${ride.toFixed(1)} s`;
          if (stalled > 1) endAttempt('the wave left');
        }
      }
    } else if (state === 'after') {
      clock += STEP;
      if (clock > AFTER) {
        if (stood && ride >= MIN_RIDE) {
          const video = await clip.finish();
          await post('/upload?name=ride.mp4', video);
          await log(`saved a ${ride.toFixed(1)} s ride after ${attempts} attempts, ${(simulated / 60).toFixed(1)} min simulated, ${clip.frames} frames`);
          return;
        }
        await log(`attempt ${attempts}: ${label} (${(simulated / 60).toFixed(1)} min simulated)`);
        clip.drop();
        clip = new Clip();
        hooks.retry();
        state = 'position';
        label = 'PADDLING INTO POSITION';
      }
    }
    hooks.step(input);
    simulated += STEP;
    step += 1;
    if (step % STEPS_PER_FRAME === 0) {
      hooks.render(STEPS_PER_FRAME * STEP);
      context.drawImage(hooks.canvas, 0, 0, WIDTH, HEIGHT);
      drawOverlay(context, spot, source, label, attempts);
      await clip.add(composite);
    }
    if (step % 30 === 0) await breathe();
  }
  await log(`no ride of ${MIN_RIDE} s in ${attempts} attempts`);
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
