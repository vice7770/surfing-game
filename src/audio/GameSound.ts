import type { GameSettings, SettingsStore } from '../game/Settings';
import { LIP_HIT_STRIDE, ROAR_SECTORS, SOUND_EVENT_CAPACITY, STROKE_HIT_STRIDE } from '../wave/SurfZoneRunner';
import { AudioEngine, type ListenerPose } from './AudioEngine';
import { INITIAL_AUDIO_STATE, audible, audioState, shouldRun, type AudioEvent, type AudioState } from './audioState';
import { OneShotShaper, soundTargets, type SoundFrame, type SoundTargets } from './soundMapping';
import { parseManifest } from './soundManifest';

/** Every loop at silence: what the game plays where there is no surf zone to hear (the menu before any sea), so loops fade out. */
const SILENCE: SoundTargets = soundTargets({
  dt: 0, timeScale: 1, paused: false,
  listener: { x: 0, y: 0, z: 0, underwater: false },
  roar: new Float32Array(ROAR_SECTORS * 3),
  lipHits: new Float32Array(SOUND_EVENT_CAPACITY * LIP_HIT_STRIDE), lipHitCount: 0,
  strokeHits: new Float32Array(SOUND_EVENT_CAPACITY * STROKE_HIT_STRIDE), strokeHitCount: 0,
  significantHeight: 0, windSpeed: 0,
});

/**
 * The game's sound (S1): starts the engine at the first click or key, follows
 * the page's visibility and the player's settings, and each frame turns the
 * surf zone's report into sound. Without Web Audio the game runs silently.
 */
export class GameSound {
  private engine?: AudioEngine;
  private state: AudioState;
  private readonly gesture = () => this.dispatch({ type: 'gesture' });
  /** Gathers landings and strokes across frames into crashes and splashes. */
  private readonly shaper = new OneShotShaper();

  constructor(private readonly settings: SettingsStore, private readonly onMuteChange: () => void = () => {}) {
    this.state = {
      ...INITIAL_AUDIO_STATE,
      hidden: typeof document !== 'undefined' && document.hidden,
      muteInBackground: settings.value.audio.muteInBackground,
    };
    window.addEventListener('pointerdown', this.gesture, { capture: true });
    window.addEventListener('keydown', this.gesture, { capture: true });
    document.addEventListener('visibilitychange', () => this.dispatch({ type: 'visibility', hidden: document.hidden }));
    settings.subscribe((value, change) => {
      if (change === 'audio') {
        this.engine?.setVolumes(value.audio);
        this.dispatch({ type: 'muteInBackground', on: value.audio.muteInBackground });
      }
      if (change === 'accessibility') this.engine?.setMono(value.accessibility.monoAudio);
    });
  }

  get muted(): boolean {
    return this.state.muted;
  }

  toggleMute(): void {
    this.dispatch({ type: 'toggleMute' });
    this.onMuteChange();
  }

  /** One frame: the surf zone's report as sound, or every loop fading out where there is none. */
  frame(frame: SoundFrame | undefined, listener: ListenerPose, dt: number): void {
    if (!this.engine || !shouldRun(this.state)) return;
    this.engine.update(frame ? soundTargets(frame, this.shaper) : SILENCE, listener, dt);
  }

  playUi(id: 'click' | 'chime'): void {
    if (this.engine && audible(this.state)) this.engine.playUi(id);
  }

  /** The engine, for the sound check (dev tools). */
  get audioEngine(): AudioEngine | undefined {
    return this.engine;
  }

  private dispatch(event: AudioEvent): void {
    const next = audioState(this.state, event);
    if (next.phase !== 'idle' && !this.engine) this.start(this.settings.value);
    this.state = next;
    if (this.engine) {
      if (shouldRun(next)) this.engine.resume();
      else this.engine.suspend();
      this.engine.setMuted(next.muted);
    }
    if (next.phase !== 'idle') {
      window.removeEventListener('pointerdown', this.gesture, { capture: true });
      window.removeEventListener('keydown', this.gesture, { capture: true });
    }
  }

  private start(settings: GameSettings): void {
    this.engine = AudioEngine.create();
    if (!this.engine) return;
    this.engine.setVolumes(settings.audio);
    this.engine.setMono(settings.accessibility.monoAudio);
    void fetch('assets/audio/sounds.json')
      .then((response) => (response.ok ? response.json() : { sounds: {} }))
      .then((raw) => this.engine?.useManifest(parseManifest(raw)))
      .catch((error) => console.warn('No sound manifest; playing the synthesised sounds.', error));
  }
}
