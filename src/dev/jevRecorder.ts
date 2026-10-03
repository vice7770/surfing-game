/**
 * Dev tool (`?inpage&record&pilot=jev`): Jev, TypeSafe's System One model,
 * plays the physical surf zone in the page, through the same pilot as the Node
 * harness (src/dev/jev/pilot.ts, `npm run play:jev`), while the game's own
 * renderer films it frame by frame. The page's looks go to a local bridge
 * (`npm run film:jev`, scripts/jev/jevBridge.ts) that holds the key and calls
 * Jev; each answer lands when its call's latency, measured here, says a
 * player's reaction would have. The film keeps a few seconds of waiting before
 * each wave and is posted as `jev-ride.mp4` once a ride of at least `minRide`
 * seconds (3 by default) has ended, with what Jev saw and said drawn on it.
 *
 *   &spot=canyon&source=practice   the sea (the Node harness's defaults)
 *   &reaction=real|250|0           the reaction (real: each call's own latency)
 *   &hz=10                         looks per second
 *   &minRide=3&maxMinutes=10       the ride to keep, and the most sea to film for one
 */
import { DEFAULT_PHYSICAL_SETTINGS, swellFor, type PhysicalSettings } from '../game/PhysicalMode';
import { RIDER_SNAPSHOT, type RideRequest } from '../wave/SurfZoneRunner';
import { compactAnswers, type Decider, type Questions, type Verdict } from './jev/answers';
import type { Live } from './jev/motor';
import type { Phase } from './jev/observe';
import { JevPilot, type Landing } from './jev/pilot';
import { readSenses } from './jev/senses';
import { advance, breathe } from './devStepping';
import { Clip, prepareCodec, type RecordingHooks } from './rideRecorder';

const params = new URLSearchParams(window.location.search);
const BRIDGE = params.get('receiver') ?? 'http://localhost:5199';
const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 30;
const STEP = 1 / 60;
const STEPS_PER_FRAME = Math.round(1 / (FPS * STEP));
const MIN_RIDE = Number(params.get('minRide') ?? 3);
const MAX_SIM_SECONDS = Number(params.get('maxMinutes') ?? 10) * 60;
const REACTION = params.get('reaction') ?? 'real';
const HZ = Number(params.get('hz') ?? 10);
/** Seconds of calm kept before a wave, of aftermath after the ride, and the longest clip kept waiting for a ride. */
const LEAD = 3;
const AFTER = 2.5;
const LONGEST = 45;

const post = (path: string, body: BodyInit) => fetch(`${BRIDGE}${path}`, { method: 'POST', body }).catch(() => undefined);
const log = (text: string) => post('/log', text);

/** Jev through the bridge; the latency is the page's own round trip, the bridge's hop included. */
const bridge: Decider = {
  async decide(state: unknown, questions: Questions): Promise<Verdict> {
    const started = performance.now();
    try {
      const response = await fetch(`${BRIDGE}/jev`, { method: 'POST', body: JSON.stringify({ state, questions }) });
      const verdict = await response.json() as Verdict;
      return { ...verdict, latencyMs: performance.now() - started };
    } catch (error) {
      return { answers: {}, latencyMs: performance.now() - started, inputTokens: 0, costUsd: 0, error: String(error) };
    }
  },
};

export async function recordJevRide(hooks: RecordingHooks): Promise<void> {
  if (!(await prepareCodec())) return;
  const spot = (params.get('spot') ?? 'canyon') as PhysicalSettings['spot'];
  const source = (params.get('source') ?? 'practice') as PhysicalSettings['source'];
  const settings: PhysicalSettings = { ...DEFAULT_PHYSICAL_SETTINGS, spot, source, compute: 'cpu' };
  const swellHeight = swellFor(settings).significantHeight;
  await log(`Jev film: starting ${spot} (${source}), reaction ${REACTION}, ${HZ} looks/s`);
  await hooks.start(settings);
  hooks.resize(WIDTH, HEIGHT);
  const host = hooks.mode.host!;
  const focus = hooks.mode.focus;
  const composite = document.createElement('canvas');
  composite.width = WIDTH;
  composite.height = HEIGHT;
  const context = composite.getContext('2d')!;

  // The pocket reflex rides with the player on the Practice swell, the game's own default (showsPocketReflex).
  const pilot = new JevPilot(bridge, { reaction: REACTION === 'real' ? 'real' : Number(REACTION), hz: HZ, pocketReflex: source === 'practice' });
  pilot.onLand = ({ look, verdict, lag }: Landing) => {
    void post('/look', JSON.stringify({ t: +simulated.toFixed(3), lag: +lag.toFixed(3), phase: look.obs.phase, state: look.obs.state, answers: compactAnswers(verdict), ms: Math.round(verdict.latencyMs), tok: verdict.inputTokens, error: verdict.error }));
  };
  const status = () => host.snapshot.status;
  const sensesNow = () => {
    const { snapshot } = host;
    const ride = snapshot.status.ride!;
    return readSenses({
      phase: ride.phase, cue: ride.cue, speed: ride.speed, balance: ride.balance, wave: ride.wave,
      heading: snapshot.rider[RIDER_SNAPSHOT.heading], peelDirection: snapshot.status.peel?.direction ?? 0, boardInReach: ride.boardInReach,
      x: snapshot.board[0], z: snapshot.board[2], focusZ: focus.z, heightAt: (x, z) => host.heightAt(x, z), tide: settings.tide, swellHeight,
    });
  };
  const liveNow = (): Live => {
    const ride = status().ride!;
    return { phase: ride.phase, heading: host.snapshot.rider[RIDER_SNAPSHOT.heading], wave: ride.wave, boardInReach: ride.boardInReach };
  };

  let clip = new Clip();
  let clipSeconds = 0;
  let calm = 0;
  let simulated = 0;
  let step = 0;
  let lastPhase: Phase = 'prone';
  let lastCue = false;
  let standing = 0;
  let lastReport = status().ride?.report?.id ?? 0;
  let caught: { duration: number; distance: number; topSpeed: number; end: string } | undefined;
  let after = 0;
  let attempts = 0;
  let banner = '';
  let bannerTime = 0;

  while (simulated < MAX_SIM_SECONDS) {
    const request: RideRequest = await pilot.step(simulated, STEP, sensesNow, liveNow);
    if (request.retry) hooks.retry();
    const { retry: _retry, ...input } = request;
    await advance(hooks, 1, input);
    simulated += STEP;
    step += 1;

    const ride = status().ride!;
    const phase = ride.phase;
    if (ride.cue !== lastCue || phase !== lastPhase) pilot.attend();
    if (phase !== lastPhase) {
      if (phase === 'push') { attempts += 1; banner = 'POP-UP'; bannerTime = 1.2; }
      if (phase === 'standing') { standing = 0; banner = 'STOOD UP'; bannerTime = 1.2; }
      if (phase === 'fallen') { banner = `WIPEOUT · ${ride.separation ?? 'in the water'}`.toUpperCase(); bannerTime = 1.5; }
    }
    if (phase === 'standing') standing += STEP;
    lastPhase = phase;
    lastCue = ride.cue;
    bannerTime -= STEP;

    const report = ride.report;
    if (report && report.id !== lastReport) {
      lastReport = report.id;
      await log(`ride ${report.duration.toFixed(1)} s, ${report.distance.toFixed(0)} m, top ${report.topSpeed.toFixed(1)} m/s, ${report.end} (${(simulated / 60).toFixed(1)} min)`);
      if (!caught && report.duration >= MIN_RIDE) caught = { duration: report.duration, distance: report.distance, topSpeed: report.topSpeed, end: report.end };
    }

    // The clip: restarted after LEAD s of calm (lying down, nothing coming), and when it grows too long without a ride.
    if (!caught) {
      const senses = step % 6 === 0 ? sensesNow() : undefined;
      if (senses) calm = senses.phase === 'prone' && !senses.rising && !senses.cue && (!senses.wave.valid || senses.wave.aheadOfCrest < 0 || senses.wave.aheadOfCrest > 25) ? calm + 6 * STEP : 0;
      if (calm > LEAD || clipSeconds > LONGEST) {
        clip.drop();
        clip = new Clip();
        clipSeconds = 0;
        calm = 0;
      }
    } else {
      after += STEP;
    }

    if (step % STEPS_PER_FRAME === 0) {
      hooks.render(STEPS_PER_FRAME * STEP);
      context.drawImage(hooks.canvas, 0, 0, WIDTH, HEIGHT);
      const label = bannerTime > 0 ? banner : labelFor(phase, ride.cue, pilot, ride.speed, standing, caught);
      drawOverlay(context, spot, source, label, attempts, pilot);
      await clip.add(composite);
      clipSeconds += STEPS_PER_FRAME * STEP;
    }
    if (caught && after > AFTER) {
      await pilot.settle();
      const video = await clip.finish();
      await post('/upload?name=jev-ride.mp4', video);
      await log(`saved a ${caught.duration.toFixed(1)} s ride (${caught.end}) after ${attempts} pop-ups, ${(simulated / 60).toFixed(1)} min simulated, ${clip.frames} frames; ${pilot.landed} looks landed, latency p50 ${median(pilot.latencies).toFixed(0)} ms`);
      await log('done');
      return;
    }
    if (step % 30 === 0) await breathe();
  }
  await log(`no ride of ${MIN_RIDE} s in ${(simulated / 60).toFixed(1)} min (${attempts} pop-ups)`);
  await log('done');
}

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? NaN;

function labelFor(phase: Phase, cue: boolean, pilot: JevPilot, speed: number, standing: number, caught?: { duration: number; end: string }): string {
  if (caught) return `CAUGHT IT · RODE ${caught.duration.toFixed(1)} s · ${caught.end.toUpperCase()}`;
  switch (phase) {
    case 'prone':
    case 'recover':
      if (cue) return 'POP UP NOW';
      return pilot.plan.paddle ? 'PADDLING FOR IT' : 'WAITING FOR A WAVE';
    case 'push':
    case 'landing':
      return 'POP-UP';
    case 'standing':
      return `RIDING ${(speed * 3.6).toFixed(0)} km/h · ${standing.toFixed(1)} s`;
    case 'fallen':
      return 'IN THE WATER';
  }
}

/** The top box: what is happening; the bottom box: what Jev saw at its latest landed look, and what it answered. */
function drawOverlay(context: CanvasRenderingContext2D, spot: string, source: string, label: string, attempts: number, pilot: JevPilot): void {
  const detail = `${spot.toUpperCase()} · ${source === 'practice' ? 'PRACTICE GROUNDSWELL' : source.toUpperCase()} · JEV AT THE CONTROLS · POP-UPS ${attempts}`;
  context.save();
  context.font = '600 22px ui-monospace, Menlo, monospace';
  const width = Math.max(560, context.measureText(label).width + 32);
  context.fillStyle = 'rgba(8, 24, 32, 0.55)';
  context.fillRect(24, 24, width, 74);
  context.fillStyle = '#e8f4f2';
  context.fillText(label, 40, 56);
  context.font = '15px ui-monospace, Menlo, monospace';
  context.fillStyle = 'rgba(232, 244, 242, 0.8)';
  context.fillText(detail, 40, 84);

  const last = pilot.last;
  if (last) {
    const { state } = last.look.obs;
    const sees = Object.entries(state).filter(([key]) => key !== 'you').map(([key, value]) => `${key}: ${value}`);
    const says = Object.entries(compactAnswers(last.verdict)).map(([id, answer]) => `${id} = ${answer.replace('@', '  ')}`);
    const head = `JEV · ${last.verdict.model ?? 'jev'} · ${last.verdict.latencyMs.toFixed(0)} ms · ${last.verdict.inputTokens} tokens · look ${pilot.landed}`;
    const lines = [head, `sees  ${state.you ?? ''}`, ...sees.map((line) => `      ${line}`), `says  ${says.join('   ')}`];
    context.font = '14px ui-monospace, Menlo, monospace';
    const boxWidth = Math.min(WIDTH - 48, Math.max(...lines.map((line) => context.measureText(line).width)) + 32);
    const boxHeight = lines.length * 20 + 20;
    const top = HEIGHT - 24 - boxHeight;
    context.fillStyle = 'rgba(8, 24, 32, 0.6)';
    context.fillRect(24, top, boxWidth, boxHeight);
    lines.forEach((line, index) => {
      context.fillStyle = index === 0 ? '#ffb37a' : index === lines.length - 1 ? '#9fe8c8' : 'rgba(232, 244, 242, 0.9)';
      context.fillText(line, 40, top + 26 + index * 20);
    });
  }
  context.restore();
}
