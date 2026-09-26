import type { AudioSettings } from '../game/Settings';
import { SoundBank } from './SoundBank';
import type { LoopId, OneShotId, SoundTargets } from './soundMapping';
import type { SoundManifest } from './soundManifest';

/** The camera as the listener: where it is and which way it looks. */
export interface ListenerPose {
  x: number;
  y: number;
  z: number;
  forward: { x: number; y: number; z: number };
}

type Bus = 'sea' | 'board' | 'ui';
const LOOP_BUS: Record<LoopId, Bus> = { roar: 'sea', distant: 'sea', wind: 'sea', bubbles: 'sea', rush: 'board', rail: 'board' };
const ONE_SHOT_BUS: Record<OneShotId, Bus> = { lipJet: 'sea', lipRoller: 'sea', paddle: 'board', popUp: 'board', plunge: 'board' };

/** Seconds for a level, rate or place to settle on a new target. */
const RAMP = 0.08;
/** The muffle filter's cutoff, clear and fully muffled, Hz. */
const CLEAR_HZ = 18000;
const MUFFLED_HZ = 400;
/** A loop silent this long, s, is stopped until it is heard again. */
const SILENT_STOP = 2;
const AUDIBLE = 0.001;

interface Loop {
  buffer: AudioBuffer;
  source: AudioBufferSourceNode;
  gain: GainNode;
  panner?: PannerNode;
  silentFor: number;
}

/**
 * Plays the sound targets through Web Audio (S1). Each source → its panner
 * (positional sounds) → its bus (Sea, Board and rider, Interface); the world's
 * buses pass a muffle low-pass; all meet at Master, then a mute gain. Loops keep
 * their source nodes and glide to each frame's targets; one-shots start new
 * sources. Browser only: its decisions live in `soundTargets` and `audioState`.
 */
export class AudioEngine {
  private readonly master: GainNode;
  private readonly mute: GainNode;
  private readonly muffle: BiquadFilterNode;
  private readonly buses: Record<Bus, GainNode>;
  private readonly loops = new Map<string, Loop>();
  private bank: SoundBank;

  static create(): AudioEngine | undefined {
    const Context = globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return undefined;
    // Safari 16.4+: an ambient session, so the iPhone's silent switch mutes the game.
    const session = (globalThis.navigator as unknown as { audioSession?: { type: string } } | undefined)?.audioSession;
    if (session) session.type = 'ambient';
    return new AudioEngine(new Context());
  }

  private constructor(readonly context: AudioContext) {
    const c = context;
    // A limiter before the output, so a burst of lip impacts cannot clip.
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    limiter.connect(c.destination);
    this.mute = c.createGain();
    this.mute.connect(limiter);
    this.master = c.createGain();
    this.master.connect(this.mute);
    this.muffle = c.createBiquadFilter();
    this.muffle.type = 'lowpass';
    this.muffle.frequency.value = CLEAR_HZ;
    this.muffle.connect(this.master);
    this.buses = { sea: c.createGain(), board: c.createGain(), ui: c.createGain() };
    this.buses.sea.connect(this.muffle);
    this.buses.board.connect(this.muffle);
    this.buses.ui.connect(this.master);
    this.bank = new SoundBank(c, { sounds: {} });
  }

  /** Load the recordings a manifest names; until each arrives, its synthesised sound plays. */
  useManifest(manifest: SoundManifest): Promise<void> {
    this.bank = new SoundBank(this.context, manifest);
    return this.bank.ready;
  }

  get soundBank(): SoundBank {
    return this.bank;
  }

  resume(): void {
    if (this.context.state !== 'running') void this.context.resume();
  }

  suspend(): void {
    if (this.context.state === 'running') void this.context.suspend();
  }

  setMuted(muted: boolean): void {
    this.mute.gain.setTargetAtTime(muted ? 0 : 1, this.context.currentTime, RAMP);
  }

  setVolumes(audio: AudioSettings): void {
    const now = this.context.currentTime;
    this.master.gain.setTargetAtTime(audio.master, now, RAMP);
    this.buses.sea.gain.setTargetAtTime(audio.sea, now, RAMP);
    this.buses.board.gain.setTargetAtTime(audio.board, now, RAMP);
    this.buses.ui.gain.setTargetAtTime(audio.ui, now, RAMP);
  }

  /** Mono: the output is folded down to one channel, so positional sound reaches a single ear whole. */
  setMono(mono: boolean): void {
    const destination = this.context.destination;
    destination.channelCountMode = 'explicit';
    destination.channelInterpretation = 'speakers';
    destination.channelCount = mono ? 1 : Math.min(2, destination.maxChannelCount || 2);
  }

  /** The current level of a bus, for checks in the page. */
  busLevel(bus: Bus | 'master'): number {
    return bus === 'master' ? this.master.gain.value : this.buses[bus].gain.value;
  }

  /** The sound check (dev tools): play a buffer once, unplaced, at a gain. */
  audition(buffer: AudioBuffer, gain: number): void {
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const level = this.context.createGain();
    level.gain.value = gain;
    source.connect(level).connect(this.buses.ui);
    source.onended = () => level.disconnect();
    source.start();
    // A loop is auditioned for four seconds.
    if (buffer.duration > 4) source.stop(this.context.currentTime + 4);
  }

  /** The sound check: set one bus's level directly, without touching the saved settings. */
  setBusLevel(bus: Bus | 'master', level: number): void {
    const node = bus === 'master' ? this.master : this.buses[bus];
    node.gain.setTargetAtTime(level, this.context.currentTime, RAMP);
  }

  playUi(id: 'click' | 'chime'): void {
    const source = this.context.createBufferSource();
    source.buffer = this.bank.buffer(id);
    const gain = this.context.createGain();
    gain.gain.value = this.bank.gain(id) * (id === 'click' ? 0.35 : 0.6);
    source.connect(gain).connect(this.buses.ui);
    source.onended = () => gain.disconnect();
    source.start();
  }

  update(targets: SoundTargets, listener: ListenerPose, dt: number): void {
    const c = this.context;
    if (c.state !== 'running') return;
    const now = c.currentTime;
    this.placeListener(listener, now);
    this.muffle.frequency.setTargetAtTime(CLEAR_HZ * (MUFFLED_HZ / CLEAR_HZ) ** targets.muffle, now, RAMP * 2);
    for (const target of targets.loops) {
      let loop = this.loops.get(target.key);
      const buffer = this.bank.buffer(target.id);
      if (!loop || loop.buffer !== buffer) {
        if (target.gain < AUDIBLE) continue;
        if (loop) this.stopLoop(target.key, loop);
        loop = this.startLoop(target.id, buffer, target.position !== undefined);
        this.loops.set(target.key, loop);
      }
      const level = target.gain * this.bank.gain(target.id);
      loop.gain.gain.setTargetAtTime(level, now, RAMP);
      loop.source.playbackRate.setTargetAtTime(target.rate * targets.playbackRate, now, RAMP);
      if (loop.panner && target.position) this.place(loop.panner, target.position, now);
      loop.silentFor = level < AUDIBLE ? loop.silentFor + dt : 0;
      if (loop.silentFor > SILENT_STOP) this.stopLoop(target.key, loop);
    }
    for (const shot of targets.oneShots) {
      const source = c.createBufferSource();
      source.buffer = this.bank.buffer(shot.id);
      source.playbackRate.value = shot.rate * targets.playbackRate;
      const gain = c.createGain();
      gain.gain.value = shot.gain * this.bank.gain(shot.id);
      const panner = this.panner();
      this.place(panner, shot.position, now, true);
      source.connect(gain).connect(panner).connect(this.buses[ONE_SHOT_BUS[shot.id]]);
      source.onended = () => {
        gain.disconnect();
        panner.disconnect();
      };
      source.start();
    }
  }

  private startLoop(id: LoopId, buffer: AudioBuffer, positional: boolean): Loop {
    const c = this.context;
    const source = c.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = c.createGain();
    gain.gain.value = 0;
    const panner = positional ? this.panner() : undefined;
    source.connect(gain);
    if (panner) gain.connect(panner).connect(this.buses[LOOP_BUS[id]]);
    else gain.connect(this.buses[LOOP_BUS[id]]);
    // Loops of one sound start at different points, so the roar's sectors never sound in phase.
    source.start(0, Math.random() * buffer.duration);
    return { buffer, source, gain, panner, silentFor: 0 };
  }

  private stopLoop(key: string, loop: Loop): void {
    loop.source.stop();
    loop.source.disconnect();
    loop.gain.disconnect();
    loop.panner?.disconnect();
    this.loops.delete(key);
  }

  private panner(): PannerNode {
    const panner = this.context.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 8;
    panner.rolloffFactor = 1;
    panner.maxDistance = 2000;
    return panner;
  }

  private place(panner: PannerNode, at: { x: number; y: number; z: number }, now: number, jump = false): void {
    if (panner.positionX) {
      if (jump) {
        panner.positionX.value = at.x;
        panner.positionY.value = at.y;
        panner.positionZ.value = at.z;
      } else {
        panner.positionX.setTargetAtTime(at.x, now, RAMP);
        panner.positionY.setTargetAtTime(at.y, now, RAMP);
        panner.positionZ.setTargetAtTime(at.z, now, RAMP);
      }
    } else {
      panner.setPosition(at.x, at.y, at.z);
    }
  }

  private placeListener(pose: ListenerPose, now: number): void {
    const listener = this.context.listener;
    if (listener.positionX) {
      listener.positionX.setTargetAtTime(pose.x, now, RAMP / 2);
      listener.positionY.setTargetAtTime(pose.y, now, RAMP / 2);
      listener.positionZ.setTargetAtTime(pose.z, now, RAMP / 2);
      listener.forwardX.setTargetAtTime(pose.forward.x, now, RAMP / 2);
      listener.forwardY.setTargetAtTime(pose.forward.y, now, RAMP / 2);
      listener.forwardZ.setTargetAtTime(pose.forward.z, now, RAMP / 2);
      listener.upX.value = 0;
      listener.upY.value = 1;
      listener.upZ.value = 0;
    } else {
      listener.setPosition(pose.x, pose.y, pose.z);
      listener.setOrientation(pose.forward.x, pose.forward.y, pose.forward.z, 0, 1, 0);
    }
  }
}

