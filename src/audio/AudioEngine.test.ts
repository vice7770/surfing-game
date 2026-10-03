import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LIP_HIT_STRIDE, ROAR_SECTORS, SOUND_EVENT_CAPACITY, STROKE_HIT_STRIDE } from '../wave/SurfZoneRunner';
import { AudioEngine, type ListenerPose } from './AudioEngine';
import { parseManifest } from './soundManifest';
import { soundTargets, type SoundFrame, type SoundTargets } from './soundMapping';

/**
 * A graph-recording stand-in for Web Audio: nodes remember what they connect to, so a test can ask where a
 * source's sound goes (through the muffle? through the air's low-pass?) without a browser.
 */
class Param {
  constructor(public value = 0) {}
  setTargetAtTime(value: number): void {
    this.value = value;
  }
}

class Node {
  readonly outputs: Node[] = [];
  connect<T extends Node>(destination: T): T {
    this.outputs.push(destination);
    return destination;
  }
  disconnect(): void {
    this.outputs.length = 0;
  }
}

class Gain extends Node { readonly gain = new Param(1); }
class Biquad extends Node { type = ''; readonly frequency = new Param(350); readonly Q = new Param(1); }
class Panner extends Node {
  panningModel = ''; distanceModel = ''; refDistance = 1; rolloffFactor = 1; maxDistance = 1;
  readonly positionX = new Param(); readonly positionY = new Param(); readonly positionZ = new Param();
}
class Compressor extends Node {
  readonly threshold = new Param(); readonly knee = new Param(); readonly ratio = new Param(); readonly attack = new Param(); readonly release = new Param();
}
class Source extends Node {
  buffer: unknown;
  loop = false;
  onended: (() => void) | null = null;
  readonly playbackRate = new Param(1);
  started = false;
  start(): void { this.started = true; }
  stop(): void { this.started = false; }
}

class FakeContext {
  readonly sampleRate = 22050;
  currentTime = 1;
  state = 'running';
  readonly destination = Object.assign(new Node(), { channelCountMode: '', channelInterpretation: '', channelCount: 2, maxChannelCount: 2 });
  readonly listener = Object.fromEntries(['positionX', 'positionY', 'positionZ', 'forwardX', 'forwardY', 'forwardZ', 'upX', 'upY', 'upZ'].map((k) => [k, new Param()]));
  readonly gains: Gain[] = [];
  readonly filters: Biquad[] = [];
  readonly sources: Source[] = [];
  readonly panners: Panner[] = [];
  createDynamicsCompressor = () => new Compressor();
  createGain = () => { const n = new Gain(); this.gains.push(n); return n; };
  createBiquadFilter = () => { const n = new Biquad(); this.filters.push(n); return n; };
  createPanner = () => { const n = new Panner(); this.panners.push(n); return n; };
  createBufferSource = () => { const n = new Source(); this.sources.push(n); return n; };
  createBuffer = (_channels: number, length: number, sampleRate: number) => ({
    length, sampleRate, duration: length / sampleRate, copyToChannel: () => undefined,
  });
  decodeAudioData = async (data: ArrayBuffer) => ({ length: data.byteLength, sampleRate: 22050, duration: data.byteLength / 22050 });
  resume = async () => undefined;
  suspend = async () => undefined;
}

/** Every node a source's sound passes on its way to the destination. */
function path(source: unknown, target: unknown): Node[] | undefined {
  const from = source as Node;
  if (from === target) return [from];
  for (const next of from.outputs) {
    const rest = path(next, target);
    if (rest) return [from, ...rest];
  }
  return undefined;
}

const LISTENER: ListenerPose = { x: 0, y: 2, z: 0, forward: { x: 0, y: 0, z: -1 } };

function frame(overrides: Partial<SoundFrame> = {}): SoundFrame {
  return {
    dt: 1 / 60, timeScale: 1, paused: false,
    listener: { x: 0, y: 2, z: 0, underwater: false },
    roar: new Float32Array(ROAR_SECTORS * 3),
    lipHits: new Float32Array(SOUND_EVENT_CAPACITY * LIP_HIT_STRIDE), lipHitCount: 0,
    strokeHits: new Float32Array(SOUND_EVENT_CAPACITY * STROKE_HIT_STRIDE), strokeHitCount: 0,
    significantHeight: 2.4, windSpeed: 0,
    ...overrides,
  };
}

let context: FakeContext;
let engine: AudioEngine;

beforeEach(() => {
  context = new FakeContext();
  vi.stubGlobal('AudioContext', function AudioContext() { return context; });
  engine = AudioEngine.create()!;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** The muffle is the filter the world's buses end in: the first low-pass built. */
const muffle = () => context.filters[0];

describe('AudioEngine routing', () => {
  it('sends the bubbles to Master without passing the muffle, and the world through it', () => {
    const roar = new Float32Array(ROAR_SECTORS * 3);
    roar.set([300, 10, -80], 0);
    engine.update(soundTargets(frame({ listener: { x: 0, y: -1, z: 0, underwater: true }, roar, windSpeed: 8, board: { x: 0, y: 0, z: 0, speed: 8, sideslip: 0 } })), LISTENER, 1 / 60);
    const master = context.destination;
    const bubbles = engine['loops'].get('bubbles')!;
    const roarLoop = engine['loops'].get('roar:0')!;
    const wind = engine['loops'].get('wind')!;
    expect(bubbles && roarLoop && wind).toBeTruthy();
    expect(path(bubbles.source, master)).toBeDefined();
    expect(path(bubbles.source, master)).not.toContain(muffle());
    expect(path(roarLoop.source, master)).toContain(muffle());
    expect(path(wind.source, master)).toContain(muffle());
    const rush = engine['loops'].get('rush')!;
    expect(path(rush.source, master)).toContain(muffle());
  });

  it('keeps the bubbles at the Sea level, wherever the volume is set', () => {
    engine.setVolumes({ master: 1, sea: 0.4, board: 1, ui: 1, muteInBackground: true });
    engine.update(soundTargets(frame({ listener: { x: 0, y: -1, z: 0, underwater: true } })), LISTENER, 1 / 60);
    const dryGain = engine['seaDry'] as unknown as Gain;
    expect(dryGain.gain.value).toBeCloseTo(0.4, 9);
    expect(engine.busLevel('sea')).toBeCloseTo(0.4, 9);
    engine.setBusLevel('sea', 0.7);
    expect(dryGain.gain.value).toBeCloseTo(0.7, 9);
  });

  it('takes the treble off a far roar sector and leaves a near one clear, and not the unplaced loops', () => {
    const roar = new Float32Array(ROAR_SECTORS * 3);
    roar.set([300, 4, -4], 0); // 5.7 m away
    roar.set([300, 200, -250], 3 * 3); // sector 3, 320 m away
    engine.update(soundTargets(frame({ roar })), LISTENER, 1 / 60);
    const near = engine['loops'].get('roar:0')!;
    const far = engine['loops'].get('roar:3')!;
    expect(near.air!.frequency.value).toBe(18000);
    expect(far.air!.frequency.value).toBeLessThan(2500);
    expect(far.air!.frequency.value).toBeGreaterThan(900);
    // The distant surf and the wind are not placed: no panner, no air.
    expect(engine['loops'].get('distant')!.air).toBeUndefined();
    expect(engine['loops'].get('distant')!.panner).toBeUndefined();
    // Moving the camera away dulls the near sector as it moves.
    engine.update(soundTargets(frame({ roar })), { ...LISTENER, z: 400 }, 1 / 60);
    expect(near.air!.frequency.value).toBeLessThan(5000);
  });
});

describe('AudioEngine one-shots', () => {
  const stroke = (work = 60): SoundTargets => soundTargets(frame({
    strokeHits: Float32Array.from([30, -90, work, 0, ...new Array((SOUND_EVENT_CAPACITY - 1) * STROKE_HIT_STRIDE).fill(0)]), strokeHitCount: 1,
  }));

  it('plays a one-shot through the air, then its panner, then the Board bus', () => {
    engine.update(stroke(), LISTENER, 1 / 60);
    const shot = context.sources.find((s) => s.loop === false)!;
    const chain = path(shot, context.destination)!;
    const filters = chain.filter((n): n is Biquad => n instanceof Biquad);
    // The air first (about 95 m away), then the muffle.
    expect(filters).toHaveLength(2);
    expect(filters[0].frequency.value).toBeLessThan(18000);
    expect(filters[1]).toBe(muffle());
    expect(chain.findIndex((n) => n instanceof Panner)).toBeGreaterThan(chain.indexOf(filters[0]));
  });

  it('varies a paddle stroke in pitch and level within the jitter, and holds a plunge steady', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    engine.update(stroke(), LISTENER, 1 / 60);
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    engine.update(stroke(), LISTENER, 1 / 60);
    const shots = context.sources.filter((s) => s.loop === false);
    expect(shots).toHaveLength(2);
    const [low, high] = shots;
    expect(low.playbackRate.value).toBeCloseTo(2 ** (-1.5 / 12), 3);
    expect(high.playbackRate.value).toBeCloseTo(2 ** (1.5 / 12), 3);
    const gainOf = (s: Source) => (path(s, context.destination)!.find((n) => n instanceof Gain) as Gain).gain.value;
    expect(gainOf(high) / gainOf(low)).toBeCloseTo(10 ** (3 / 20), 3);
  });

  it('plays the next recording of a pool each time, never the same one twice running', async () => {
    const files = ['paddle-a.m4a', 'paddle-b.m4a', 'paddle-c.m4a'];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
      ok: true, arrayBuffer: async () => new ArrayBuffer(8 * (files.findIndex((f) => url.endsWith(f)) + 1)),
    })));
    const manifest = parseManifest({
      sounds: {
        paddle: {
          candidates: [{ file: files[0], variants: files.slice(1), source: 'test', author: 'test', licence: 'generated' }],
          chosen: 0, gain: 1,
        },
      },
    });
    await engine.useManifest(manifest);
    const lengths: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      engine.update(stroke(), LISTENER, 1 / 60);
      lengths.push((context.sources.filter((s) => s.loop === false).at(-1)!.buffer as { length: number }).length);
    }
    expect(new Set(lengths)).toEqual(new Set([8, 16, 24]));
    for (let i = 1; i < lengths.length; i += 1) expect(lengths[i]).not.toBe(lengths[i - 1]);
  });
});
