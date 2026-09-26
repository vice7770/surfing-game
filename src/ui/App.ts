import { buttonLabel, keyLabel, type Action } from '../game/Bindings';
import type { Controls } from '../game/Controls';
import { BenchmarkRecorder, adapterName, needsDetection, withPreset } from '../game/Graphics';
import { Logbook } from '../game/Logbook';
import { RideTracker, type RideFrame, type RideResult } from '../game/RideTracker';
import type { SettingsStore } from '../game/Settings';
import { DEFAULT_CONDITIONS, DEFAULT_SPOT, nextBackdropSpot, type SurfConditions } from '../game/SurfConditions';
import type { RideView } from '../scene/SpectatorCamera';
import { DEV_TOOLS } from '../devTools';
import type { SpotName } from '../wave/Bathymetry';
import type { SurfZoneStatus } from '../wave/SurfZoneRunner';
import type { ReadoutRow } from '../wave/SwellReadout';
import { applyAccessibility } from './accessibility';
import { GameSound } from '../audio/GameSound';
import type { ListenerPose } from '../audio/AudioEngine';
import type { SoundFrame } from '../audio/soundMapping';
import { PhysicsReadoutPanel } from './PhysicsReadoutPanel';
import packageJson from '../../package.json';
import { el } from './dom';
import { createLogbookScreen, logbookModel } from './LogbookScreen';
import { createSettingsScreen } from './SettingsScreen';
import { createMainMenu, refreshSoundToggles } from './MainMenu';
import { createSoundCheck } from './SoundCheck';
import { MenuInput } from './MenuInput';
import { createOnlinePauseMenu, createPauseMenu } from './PauseMenu';
import { OnlineHud, PlayersPanel, onlineHudModel, playersModel } from './OnlineHud';
import { roomLink } from '../net/roomCode';
import type { CallId } from '../net/protocol';
import { createRideEndCard, endCardModel } from './RideEndCard';
import { bestTwo, scoreRide } from '../game/waveScore';
import { HintBook, HintCoach, type HintId } from '../game/hints';
import { RideHud, showsBalanceMeter, type HintKeys } from './RideHud';
import { ScreenStack, type ScreenId } from './ScreenStack';
import { EN, t, type StringKey } from './strings';
import { createSurfScreen, type SurfChoice } from './SurfScreen';
import { createSurferCard } from './SurferCard';
import { SurferPreview } from '../scene/character/SurferPreview';
import { oncePerFlight } from './oncePerFlight';
import { webGpuAvailable } from '../game/PhysicalMode';
import { onlineUrl } from '../net/NetClient';
import { OnlineController, type OnlineIntent } from '../net/OnlineController';
import type { OnlinePhase } from '../game/OnlinePlay';
import { DEFAULT_ROOM_SETTINGS, MAX_BOTS, type Refusal } from '../net/protocol';
import { roomCodeFromSearch } from '../net/roomCode';
import { devParam } from '../devTools';
import { createMultiplayerScreen, type MultiplayerState } from './MultiplayerScreen';

/** What the menus ask of the game (implemented by `SurfGame` in main.ts). */
export interface GameHost {
  readonly canvas: HTMLCanvasElement;
  readonly gl: WebGLRenderingContext | WebGL2RenderingContext;
  /** Whether the menu's waves are running (not spinning up, not a still frame). */
  readonly backdropRunning: boolean;
  showBackdrop(spot: SpotName): Promise<boolean>;
  startSurf(spot: SpotName, conditions: SurfConditions, seed: number, camera: RideView | 'overview'): Promise<boolean>;
  readonly rideStatus: SurfZoneStatus['ride'] | undefined;
  readonly rideFrame: RideFrame | undefined;
  readonly viewName: string;
  setPaused(paused: boolean): void;
  cycleView(): void;
  quickRetry(): void;
  /** The Wave Lab's own replay and new wave. */
  replay(): void;
  newWave(): void;
  enterWaveLab(): void;
  setReducedMotion(reduced: boolean): void;
  readonly readout: ReadoutRow[];
  /** Sound (S1): the surf zone's report for this frame, and the camera as the listener. */
  soundFrame(dt: number, paused: boolean): SoundFrame | undefined;
  readonly listenerPose: ListenerPose;
  /** Online (N1): ride a room's sea with the others in it; false when superseded. */
  startOnline(controller: OnlineController, camera: RideView | 'overview'): Promise<boolean>;
  leaveOnline(): void;
  /** Online play's phase and a respawn's countdown, while online. */
  readonly onlineState: { phase: OnlinePhase; behind?: number; respawnIn?: number } | undefined;
}

/** Waiting this long for a room's welcome, ms, the server counts as unreachable. */
const WELCOME_TIMEOUT_MS = 10_000;
/** After the welcome, wait at most this long for the first clock reading, ms. */
const CLOCK_WAIT_MS = 3000;

function localStore(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Frames skipped after the menu's waves start, before the benchmark counts (shaders compile, caches fill). */
const BENCHMARK_WARMUP_FRAMES = 30;

/**
 * The game's screens (plan P8): which one shows, the way back, and the calls into
 * the game. `#app[data-screen]` is the current screen and `#app[data-base]` the
 * scene under it, which the stylesheets key off.
 */
export class App {
  private readonly stack: ScreenStack;
  private readonly root = document.getElementById('app')!;
  private readonly ui = document.getElementById('ui')!;
  private readonly menuInput: MenuInput;
  /** The scene the game shows now: the menu's waves, a ride, or the Wave Lab. */
  private scene?: 'backdrop' | 'ride' | 'wavelab';
  private backdropSpot?: SpotName;
  /** The menu's own waves are up (not the ride or Wave Lab it replaced, still running while they spin up). */
  private backdropReady = false;
  /** Undo for the screen now shown (the Settings screen's store subscription). */
  private disposeScreen?: () => void;
  private readonly adapter: string;
  private benchmark?: BenchmarkRecorder;
  private warmup = 0;
  private notice?: HTMLElement;
  private readonly loading = document.getElementById('loading')!;
  private readonly loadingText = document.getElementById('loading-text');
  private surfChoice: SurfChoice = { spot: DEFAULT_SPOT, conditions: { ...DEFAULT_CONDITIONS } };
  /** The current wave's seed: Replay keeps it, New wave moves on. */
  private seed = 1 + Math.floor(Math.random() * 9999);
  private readonly rideHud: RideHud;
  private readonly tracker = new RideTracker();
  private readonly logbook = new Logbook(localStore());
  private endCard?: HTMLElement;
  /** One-time hints for the riding mechanics (P9). */
  private readonly coach = new HintCoach(new HintBook(localStore()));
  /** This session's wave scores (P9), for the best two; a new spot or conditions start a new session. */
  private sessionScores: number[] = [];
  /** The dev tools' telemetry over a Surf ride: the physical readout and the frame rate, at 4 Hz. */
  private readonly telemetryList = el('dl');
  private readonly telemetry = el('aside', { class: 'ride-telemetry physics-readout' }, this.telemetryList);
  private readonly telemetryPanel = new PhysicsReadoutPanel(this.telemetryList);
  private telemetryClock = 0;
  private fps = 0;
  private rotateHint?: HTMLElement;
  private rotateDismissed = false;
  private readonly sound: GameSound;
  /** Online (N1): the room session while in one, and the Multiplayer screen's state. */
  private online?: OnlineController;
  private multiplayer: MultiplayerState;
  private webGpuAsked = false;
  private readonly onlineHud = new OnlineHud();
  private playersPanel?: PlayersPanel;

  constructor(
    private readonly game: GameHost,
    private readonly controls: Controls,
    readonly settings: SettingsStore,
    options: { startInWaveLab: boolean },
  ) {
    this.stack = new ScreenStack(options.startInWaveLab ? 'wavelab' : 'menu');
    // A room's link (`?room=CODE`) opens Multiplayer with the code filled in (N1).
    const linked = roomCodeFromSearch(globalThis.location?.search ?? '');
    this.multiplayer = { name: settings.value.online.name, code: linked ?? '', settings: { ...DEFAULT_ROOM_SETTINGS }, webGpu: undefined };
    if (linked && !options.startInWaveLab) this.stack.push('multiplayer');
    this.scene = options.startInWaveLab ? 'wavelab' : undefined;
    this.menuInput = new MenuInput({ root: () => this.ui, onBack: () => this.back() });
    this.adapter = adapterName(game.gl);
    this.rideHud = new RideHud(() => this.pause());
    this.setLoadingText('loading.break');
    this.bindTouch();
    this.settings.subscribe((_, change) => {
      if (change === 'accessibility' || change === 'gameplay' || change === 'controls') this.applyAccessibility();
    });
    this.sound = new GameSound(settings, () => refreshSoundToggles(this.ui, this.sound.muted));
    // Dev tools: the sound, for checks in the page and the sound check.
    if (DEV_TOOLS) (globalThis as unknown as { breaklineSound?: GameSound }).breaklineSound = this.sound;
    if (DEV_TOOLS) this.bindSoundCheck();
    // A quiet click for every menu button (S1).
    this.ui.addEventListener('click', (event) => {
      if ((event.target as Element | null)?.closest?.('button')) this.sound.playUi('click');
    });
    // In the menus the ride controls are off, so the mute key is heard here.
    window.addEventListener('keydown', (event) => {
      if (this.controls.enabled || event.repeat || event.defaultPrevented) return;
      const tag = (event.target as Element | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (this.settings.value.controls.bindings.keyboard.mute.includes(event.code)) this.toggleMute();
    });
    this.show();
  }

  /** The Wave Lab's sound check (dev tools): a panel of every sound, opened from its toolbar. */
  private bindSoundCheck(): void {
    const toggle = document.getElementById('sound-check-toggle');
    const lab = document.getElementById('wave-lab');
    if (!toggle || !lab) return;
    let panel: HTMLElement | undefined;
    toggle.addEventListener('click', () => {
      if (panel) {
        panel.remove();
        panel = undefined;
      } else {
        panel = createSoundCheck(() => this.sound.audioEngine);
        lab.append(panel);
      }
      toggle.setAttribute('aria-pressed', String(panel !== undefined));
    });
  }

  /** Sound on or off: M, the gamepad's Back, or a speaker toggle. */
  toggleMute(): void {
    this.sound.toggleMute();
  }

  /** Called by the game once per rendered frame: the gamepad, and the Auto benchmark while the menu's waves run. */
  frame(intervalMs: number, status?: SurfZoneStatus): void {
    this.menuInput.poll();
    const dt = intervalMs / 1000;
    this.sound.frame(this.game.soundFrame(dt, this.stack.stack.includes('pause')), this.game.listenerPose, dt);
    if (intervalMs > 0 && intervalMs < 500) this.fps += (1000 / intervalMs - this.fps) * 0.1;
    if (this.stack.current === 'ride' && this.telemetry.isConnected) {
      this.telemetryClock += intervalMs;
      if (this.telemetryClock >= 250) {
        this.telemetryClock = 0;
        this.telemetryPanel.render([...this.game.readout, { label: 'FRAME RATE', value: `${Math.round(this.fps)} fps` }]);
      }
    }
    if (this.stack.current === 'ride') {
      const { gameplay, seen } = this.settings.value;
      const ride = this.game.rideStatus;
      const hint = this.coach.update(intervalMs / 1000, {
        standing: ride?.phase === 'standing',
        crestBreaking: ride?.wave.valid ? ride.wave.crestBreaking : 0,
        input: this.controls.lastRequest,
      }, (id) => this.hintText(id) !== '');
      this.rideHud.update(ride, gameplay.units, this.hintKeys(), !seen.rideHints,
        showsBalanceMeter(gameplay.balanceMeter, this.online?.room?.conditions.swell ?? this.surfChoice.conditions.swell), hint ? this.hintText(hint) : '');
      this.trackRide();
    }
    const { online } = this;
    if (online && (this.stack.current === 'ride' || this.stack.current === 'pause')) {
      const state = this.game.onlineState;
      this.onlineHud.update(onlineHudModel({
        status: online.status, phase: state?.phase, behind: state?.behind, respawnIn: state?.respawnIn, feed: online.feed,
        units: this.settings.value.gameplay.units, now: performance.now(),
      }));
      if (this.stack.current === 'pause') this.playersPanel?.update(playersModel(online.players(), online.you, online.creator));
    }
    if (!this.benchmark || this.stack.base !== 'menu' || !this.backdropReady || !this.game.backdropRunning) return;
    if (this.warmup < BENCHMARK_WARMUP_FRAMES) {
      this.warmup += 1;
      return;
    }
    this.benchmark.add(intervalMs, status?.stepMs, status?.compute === 'gpu');
    if (this.benchmark.done) this.finishBenchmark();
  }

  /** Forget the detection and benchmark again the next time the menu's waves run (Settings' Re-detect). */
  redetect(): void {
    this.settings.setDetected(undefined);
    this.startBenchmarkIfNeeded();
  }

  get detecting(): boolean {
    return this.benchmark !== undefined;
  }

  /** Esc, Start or the pause button, during a ride or in the Wave Lab. */
  pause(): void {
    if (this.stack.current === 'ride' || this.stack.current === 'wavelab') this.go('pause');
  }

  /** The player paddled out again (R): the ride in progress ends by choice, and the card goes. */
  noteRetry(): void {
    this.tracker.noteRetry();
    this.hideEndCard();
  }

  back(): void {
    if (this.stack.back() !== undefined) this.show();
  }

  go(id: ScreenId): void {
    this.stack.push(id);
    this.show();
  }

  private show(): void {
    const { current, base } = this.stack;
    this.root.dataset.screen = current;
    this.root.dataset.base = base;
    const playing = current === 'ride' || current === 'wavelab';
    this.controls.enabled = playing;
    this.menuInput.active = !playing;
    this.game.setPaused(this.stack.stack.includes('pause'));
    this.applyAccessibility();
    if (base !== 'menu') this.backdropReady = false;
    if (base === 'menu' && this.scene !== 'backdrop') this.openBackdrop();
    // The gradient only stands in for the menu's first waves; a ride or the Wave Lab shows its own scene.
    if (base !== 'menu') this.root.classList.remove('is-scene-pending');
    this.disposeScreen?.();
    this.disposeScreen = undefined;
    this.ui.replaceChildren(...this.render(current));
    if (this.notice) this.ui.append(this.notice);
    if (playing) this.game.canvas.focus({ preventScroll: true });
    else this.menuInput.focusDefault();
  }

  private render(id: ScreenId): Node[] {
    if (id === 'menu') {
      return [createMainMenu({
        surf: () => this.go('surf'),
        multiplayer: () => this.go('multiplayer'),
        waveLab: () => this.enterWaveLab(),
        logbook: () => this.go('logbook'),
        settings: () => this.go('settings'),
      }, { devTools: DEV_TOOLS, version: packageJson.version, sound: { muted: this.sound.muted, toggle: () => this.toggleMute() } })];
    }
    if (id === 'surf') {
      const card = createSurferCard(this.settings.value.surfer, this.surfChoice.conditions.time, {
        change: (patch) => this.settings.setSurfer(patch),
      }, (canvas) => SurferPreview.create(canvas, { reducedMotion: this.settings.value.accessibility.reducedMotion }));
      this.disposeScreen = card.dispose;
      return [createSurfScreen(this.surfChoice, {
        change: (choice) => {
          this.surfChoice = choice;
          card.setTime(choice.conditions.time);
        },
        paddleOut: () => void this.paddleOut(),
        back: () => this.back(),
      }, card.root)];
    }
    if (id === 'multiplayer') {
      this.askWebGpu();
      const card = createSurferCard(this.settings.value.surfer, this.multiplayer.settings.conditions.time, {
        change: (patch) => this.settings.setSurfer(patch),
      }, (canvas) => SurferPreview.create(canvas, { reducedMotion: this.settings.value.accessibility.reducedMotion }));
      this.disposeScreen = card.dispose;
      return [createMultiplayerScreen(this.multiplayer, {
        name: (value) => this.settings.setOnlineName(value),
        create: (settings, name) => {
          this.multiplayer.settings = settings;
          const bots = Math.min(MAX_BOTS, Math.max(0, Math.round(Number(devParam('bots') ?? 0)) || 0));
          void this.goOnline({ create: settings, ...(bots ? { bots } : {}) }, name);
        },
        join: (code, name) => {
          this.multiplayer.code = code;
          void this.goOnline({ join: code }, name);
        },
        back: () => this.back(),
      }, card.root)];
    }
    if (id === 'settings') {
      const screen = createSettingsScreen({
        store: this.settings,
        context: () => ({ devTools: DEV_TOOLS, detecting: this.detecting }),
        onBack: () => this.back(),
        onRedetect: () => this.redetect(),
        onCapture: (capturing) => { this.menuInput.active = !capturing; },
      });
      this.disposeScreen = screen.dispose;
      return [screen.root];
    }
    if (id === 'logbook') {
      return [createLogbookScreen(logbookModel(this.logbook, this.settings.value.gameplay.units, Date.now()), () => this.back())];
    }
    if (id === 'ride') {
      const { gameplay } = this.settings.value;
      return [
        this.rideHud.root,
        ...(this.online ? [this.onlineHud.root] : []),
        ...(DEV_TOOLS && gameplay.showTelemetry ? [this.telemetry] : []),
        ...(this.needsRotateHint() ? [this.rotateHintElement()] : []),
        ...(this.endCard ? [this.endCard] : []),
      ];
    }
    if (id === 'pause' && this.online) {
      const online = this.online;
      this.playersPanel = new PlayersPanel(roomLink(location.origin, online.room!.code), (player) => online.kick(player));
      this.playersPanel.update(playersModel(online.players(), online.you, online.creator));
      return [createOnlinePauseMenu({
        resume: () => this.back(),
        camera: () => {
          this.game.cycleView();
          return this.viewLabel();
        },
        settings: () => this.go('settings'),
        leave: () => this.quitToMenu(),
        sound: { muted: this.sound.muted, toggle: () => this.toggleMute() },
      }, this.viewLabel(), this.playersPanel.root)];
    }
    if (id === 'pause') {
      const inLab = this.stack.base === 'wavelab';
      return [createPauseMenu({
        resume: () => this.back(),
        replay: () => (inLab ? this.resumeWith(() => this.game.replay()) : void this.paddleOut()),
        newWave: () => (inLab ? this.resumeWith(() => this.game.newWave()) : this.nextWave()),
        camera: () => {
          this.game.cycleView();
          return this.viewLabel();
        },
        settings: () => this.go('settings'),
        quit: () => this.quitToMenu(),
        sound: { muted: this.sound.muted, toggle: () => this.toggleMute() },
      }, this.viewLabel())];
    }
    return [];
  }

  private viewLabel(): string {
    const key = `view.${this.game.viewName}`;
    return key in EN ? t(key as StringKey) : this.game.viewName;
  }

  /** Close the pause menu, then act (the Wave Lab's own replay and new wave). */
  private resumeWith(action: () => void): void {
    this.back();
    action();
  }

  private nextWave(): void {
    this.seed = (this.seed % 9999) + 1;
    void this.paddleOut();
  }

  private quitToMenu(): void {
    this.leaveRoom();
    this.hideEndCard();
    this.sessionScores = [];
    this.stack.reset('menu');
    this.show();
  }

  private changeSpot(): void {
    this.hideEndCard();
    this.sessionScores = [];
    this.stack.reset('menu');
    this.stack.push('surf');
    this.show();
  }

  /** Feed the ride tracker; a finished ride is logged and summed up on the end card. */
  private trackRide(): void {
    const frame = this.game.rideFrame;
    if (!frame) return;
    if (frame.phase === 'standing') this.hideEndCard();
    const result = this.tracker.update(frame);
    if (result) this.finishRide(result);
  }

  private finishRide(result: RideResult): void {
    if (this.online) {
      this.finishOnlineRide(result);
      return;
    }
    const { spot, conditions } = this.surfChoice;
    // Scored only when the player asks, and only rides the worker read (P9).
    const score = this.settings.value.gameplay.scoreRides && result.report ? scoreRide(result.report).score : undefined;
    if (score !== undefined) this.sessionScores.push(score);
    const { report: _, timeScale: __, ...summary } = result;
    const records = this.logbook.add({ ...summary, spot, conditions, seed: this.seed, at: Date.now(), ...(score !== undefined ? { score } : {}) });
    if (!this.settings.value.seen.rideHints) this.settings.markSeen('rideHints');
    if (records.length > 0) this.sound.playUi('chime');
    this.hideEndCard();
    const scoring = score !== undefined ? { score, bestTwo: bestTwo(this.sessionScores) } : undefined;
    this.endCard = createRideEndCard(endCardModel(result, records, this.settings.value.gameplay.units, scoring), {
      replay: () => {
        this.game.quickRetry();
        this.noteRetry();
      },
      newWave: () => this.nextWave(),
      changeSpot: () => this.changeSpot(),
      menu: () => this.quitToMenu(),
    }, this.hintKeys().retry);
    if (this.stack.current === 'ride') this.ui.append(this.endCard);
  }

  /**
   * An online ride ends (spec N1): logged as online, announced to the room (the
   * feed shows it to everyone, this player included); no end card, the sea goes on.
   */
  private finishOnlineRide(result: RideResult): void {
    const { online } = this;
    const room = online?.room;
    if (!online || !room) return;
    const { report: _, timeScale: __, ...summary } = result;
    const records = this.logbook.add({ ...summary, spot: room.spot, conditions: room.conditions, seed: room.seed, at: Date.now(), online: true });
    if (records.length > 0) this.sound.playUi('chime');
    if (!this.settings.value.seen.rideHints) this.settings.markSeen('rideHints');
    online.rideFinished(result.distance, result.seconds);
  }

  /** A surf call (N1): shouted to the room while online. */
  call(call: CallId): void {
    if (this.online && (this.stack.current === 'ride' || this.stack.current === 'pause')) this.online.call(call);
  }

  private hideEndCard(): void {
    this.endCard?.remove();
    this.endCard = undefined;
  }

  /** Whether this browser can run a room's shared sea (WebGPU), asked once when Multiplayer first opens. */
  private askWebGpu(): void {
    if (this.webGpuAsked) return;
    this.webGpuAsked = true;
    void webGpuAvailable().then((available) => {
      this.multiplayer = { ...this.multiplayer, webGpu: available };
      if (this.stack.current === 'multiplayer') this.show();
    });
  }

  /** Online (N1): make or join a room behind the loading card, then ride its sea; presses while it loads are ignored. */
  private readonly goOnline = (intent: OnlineIntent, name: string) => this.joinOnce(intent, name);
  private joining = false;

  private async joinOnce(intent: OnlineIntent, name: string): Promise<void> {
    if (this.joining) return;
    this.joining = true;
    try {
      await this.joinRoom(intent, name);
    } finally {
      this.joining = false;
    }
  }

  private async joinRoom(intent: OnlineIntent, name: string): Promise<void> {
    this.settings.setOnlineName(name);
    this.multiplayer = { ...this.multiplayer, name, busy: true, refusal: undefined };
    this.setLoadingText('online.joining');
    this.loading.classList.remove('is-hidden');
    const code = 'join' in intent ? intent.join : undefined;
    const controller = new OnlineController({
      url: onlineUrl(location), name, surfer: this.settings.value.surfer, intent,
      token: code ? this.settings.value.online.tokens[code] : undefined,
    });
    const outcome = await this.welcomed(controller);
    if (outcome !== 'welcomed') {
      controller.close();
      this.failOnline(outcome);
      return;
    }
    const room = controller.room!;
    if (controller.token) this.settings.rememberRoom(room.code, controller.token);
    this.multiplayer = { ...this.multiplayer, code: room.code };
    this.setRoomInUrl(room.code);
    this.setLoadingText('online.handover');
    const started = await this.game.startOnline(controller, this.settings.value.gameplay.defaultCamera);
    this.loading.classList.add('is-hidden');
    this.multiplayer = { ...this.multiplayer, busy: false };
    if (!started) {
      controller.close();
      return;
    }
    this.online = controller;
    // Dev tools: the session, for checks in the page.
    if (DEV_TOOLS) (globalThis as unknown as { breaklineOnline?: OnlineController }).breaklineOnline = controller;
    // Kicked, or turned away on a reconnect: back to Multiplayer with the reason.
    controller.onRefused = (reason) => this.failOnline(reason);
    this.hideEndCard();
    this.tracker.reset();
    this.scene = 'ride';
    this.stack.reset('ride');
    this.show();
  }

  /** The room's welcome and a first reading of the server's clock; a refusal; or nothing from the server for a while. */
  private welcomed(controller: OnlineController): Promise<'welcomed' | Refusal | 'unreachable'> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve('unreachable'), WELCOME_TIMEOUT_MS);
      controller.onRefused = (reason) => {
        clearTimeout(timer);
        resolve(reason);
      };
      controller.onWelcome = () => {
        clearTimeout(timer);
        const since = performance.now();
        const wait = () => {
          if (controller.clockReady || performance.now() - since > CLOCK_WAIT_MS) resolve('welcomed');
          else setTimeout(wait, 50);
        };
        wait();
      };
    });
  }

  /** Back to Multiplayer with why the room turned the player away (or couldn't be reached). */
  private failOnline(reason: Refusal | 'unreachable'): void {
    this.loading.classList.add('is-hidden');
    this.leaveRoom();
    this.multiplayer = { ...this.multiplayer, busy: false, refusal: reason };
    this.hideEndCard();
    this.stack.reset('menu');
    this.stack.push('multiplayer');
    this.show();
  }

  /** Leave the room: the session closes, the other surfers go, and the page's address no longer names the room. */
  private leaveRoom(): void {
    const { online } = this;
    this.online = undefined;
    online?.close();
    this.game.leaveOnline();
    this.setRoomInUrl(undefined);
  }

  /** The page's address carries the room (`?room=CODE`), so it can be copied from the address bar too. */
  private setRoomInUrl(code: string | undefined): void {
    if (typeof history === 'undefined') return;
    const url = new URL(location.href);
    if (code) url.searchParams.set('room', code);
    else url.searchParams.delete('room');
    history.replaceState(history.state, '', url);
  }

  /** Start the chosen session behind the loading card, then ride; repeated presses while it loads are ignored. */
  private readonly paddleOut = oncePerFlight(() => this.startSession());

  private async startSession(): Promise<void> {
    this.setLoadingText('loading.paddleOut');
    this.loading.classList.remove('is-hidden');
    const { spot, conditions } = this.surfChoice;
    const started = await this.game.startSurf(spot, conditions, this.seed, this.settings.value.gameplay.defaultCamera);
    this.loading.classList.add('is-hidden');
    if (!started) return;
    this.hideEndCard();
    this.tracker.reset();
    this.scene = 'ride';
    this.stack.reset('ride');
    this.show();
  }

  private setLoadingText(key: Parameters<typeof t>[0]): void {
    if (this.loadingText) this.loadingText.textContent = t(key);
  }

  /** A riding hint's text (P9), naming the player's keys, pad or touch buttons; empty when the device has no input for it. */
  private hintText(id: HintId): string {
    if (this.touchActive()) {
      if (id === 'lean') return t('hint.lean', { keys: '← →' });
      if (id === 'crouch') return t('hint.crouch', { keys: t('touch.crouch') });
      return '';
    }
    const { bindings } = this.settings.value.controls;
    const pad = this.controls.lastDevice === 'gamepad';
    const label = (action: Action) => (pad ? buttonLabel(bindings.gamepad[action][0]) : keyLabel(bindings.keyboard[action][0]));
    const keys = id === 'lean' ? (pad ? t('hud.stick') : `${label('steerLeft')} ${label('steerRight')}`)
      : id === 'trim' ? (pad ? t('hud.stick') : `${label('trimForward')} ${label('trimBack')}`)
        : label(id);
    return t(`hint.${id}`, { keys });
  }

  /** The keys (or pad buttons) the prompts and hints name, from the player's bindings and last-used device. */
  private hintKeys(): HintKeys {
    // On touch the prompts name the on-screen buttons; paddling out again is the end card's Replay.
    if (this.touchActive()) {
      return { paddle: t('touch.paddle'), popUp: t('touch.popUp'), retry: t('touch.retry'), steer: '', pause: '' };
    }
    const { bindings } = this.settings.value.controls;
    const pad = this.controls.lastDevice === 'gamepad';
    const label = (action: Action) => (pad ? buttonLabel(bindings.gamepad[action][0]) : keyLabel(bindings.keyboard[action][0]));
    return {
      paddle: label('paddle'),
      popUp: label('popUp'),
      retry: label('retry'),
      steer: pad ? t('hud.stick') : `${label('steerLeft')} ${label('steerRight')}`,
      pause: label('pause'),
    };
  }

  /** The touch buttons: labelled from the strings, Pop up wired, shown per the Touch controls setting. */
  private bindTouch(): void {
    const label = (id: string, key: Parameters<typeof t>[0], aria = false) => {
      const button = document.getElementById(id);
      if (!button) return;
      if (aria) button.setAttribute('aria-label', t(key));
      else button.textContent = t(key);
    };
    label('touch-paddle', 'touch.paddle');
    label('touch-popup', 'touch.popUp');
    label('touch-crouch', 'touch.crouch');
    label('touch-left', 'touch.left', true);
    label('touch-right', 'touch.right', true);
    document.getElementById('touch-popup')?.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.controls.requestGetUp();
    });
  }

  private touchActive(): boolean {
    const { touchControls } = this.settings.value.gameplay;
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    return touchControls === 'on' || (touchControls === 'auto' && coarse);
  }

  /** UI scale, reduced motion, high contrast, touch and handedness, from the settings. */
  private applyAccessibility(): void {
    const { accessibility, controls } = this.settings.value;
    applyAccessibility(this.root, accessibility, this.touchActive(), controls.handedness);
    this.game.setReducedMotion(accessibility.reducedMotion);
  }

  /** A ride on a phone held upright suggests turning it sideways, once per visit. */
  private needsRotateHint(): boolean {
    return !this.rotateDismissed && this.touchActive() && window.innerHeight > window.innerWidth;
  }

  private rotateHintElement(): HTMLElement {
    this.rotateHint ??= el('button', {
      class: 'rotate-hint',
      attrs: { type: 'button' },
      text: t('hud.rotate'),
      on: {
        click: () => {
          this.rotateDismissed = true;
          this.rotateHint?.remove();
        },
      },
    });
    return this.rotateHint;
  }

  /** The Wave Lab (dev tools): today's screen with the legacy wave; Esc pauses, and Quit returns to the menu. */
  private enterWaveLab(): void {
    this.scene = 'wavelab';
    this.game.enterWaveLab();
    this.stack.reset('wavelab');
    this.show();
  }

  /**
   * The menu's waves at a new spot. The menu never waits for them: on first launch
   * it stands on a gradient in the brand's colours and the sea fades in once ready.
   */
  private openBackdrop(): void {
    const first = this.scene === undefined;
    this.scene = 'backdrop';
    this.backdropReady = false;
    this.backdropSpot = nextBackdropSpot(this.backdropSpot);
    if (first) this.root.classList.add('is-scene-pending');
    void this.game.showBackdrop(this.backdropSpot).then((shown) => {
      if (!shown) return;
      this.backdropReady = this.stack.base === 'menu';
      this.root.classList.remove('is-scene-pending');
      this.warmup = 0;
      this.startBenchmarkIfNeeded();
    });
  }

  private startBenchmarkIfNeeded(): void {
    const { graphics, detected } = this.settings.value;
    if (!this.benchmark && needsDetection(graphics, detected, this.adapter)) {
      this.benchmark = new BenchmarkRecorder();
      this.warmup = 0;
    }
  }

  private finishBenchmark(): void {
    const result = { ...this.benchmark!.result(), adapter: this.adapter };
    this.benchmark = undefined;
    this.settings.setDetected(result);
    const { graphics } = this.settings.value;
    if (graphics.preset === 'auto') this.settings.update('graphics', withPreset(graphics, 'auto', result));
    if (result.lowPerformance && !this.settings.value.seen.lowPerformanceNotice) this.showLowPerformanceNotice();
  }

  private showLowPerformanceNotice(): void {
    const dismiss = el('button', {
      class: 'strip-button', attrs: { type: 'button' }, dataset: { nav: '' }, text: t('notice.dismiss'),
      on: {
        click: () => {
          this.settings.markSeen('lowPerformanceNotice');
          this.notice?.remove();
          this.notice = undefined;
          this.menuInput.focusDefault();
        },
      },
    });
    this.notice = el('aside', { class: 'notice', attrs: { role: 'status' } },
      el('h2', { text: t('notice.lowPerformance.title') }),
      el('p', { text: t('notice.lowPerformance.body') }),
      dismiss);
    this.ui.append(this.notice);
  }
}
