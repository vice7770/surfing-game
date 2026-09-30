import { buttonLabel, keyLabel, type Action } from '../game/Bindings';
import type { Controls } from '../game/Controls';
import type { SteamControllerDriver } from '../game/steam/SteamControllerDriver';
import { stickOf } from '../game/Sticks';
import { BenchmarkRecorder, adapterName, needsDetection, withPreset } from '../game/Graphics';
import { Logbook } from '../game/Logbook';
import { RideTracker, type RideFrame, type RideResult } from '../game/RideTracker';
import type { SettingsStore } from '../game/Settings';
import { DEFAULT_CONDITIONS, DEFAULT_SPOT, nextBackdropSpot, surfForecastText, type SurfConditions } from '../game/SurfConditions';
import { surferHeight } from '../game/SurferChoice';
import type { SurfReading } from '../wave/SurfMeter';
import { describeSurf, type SurfWords } from './surfHeight';
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
import { createMainMenu, refreshSoundToggles, steamStrip } from './MainMenu';
import { MenuInput } from './MenuInput';
import { createLabPauseMenu, createLessonPauseMenu, createOnlinePauseMenu, createPauseMenu } from './PauseMenu';
import { LessonFlow, type FlowState } from '../game/school/lessonFlow';
import { LESSONS, lessonById, type Lesson } from '../game/school/lessons';
import { SchoolProgress } from '../game/school/schoolProgress';
import { createSchoolScreen } from './SchoolScreen';
import { createHowTo, createLessonCard, createPassCard } from './LessonCard';
import { lessonCardModel, lessonHud, schoolListModel, type ActionLabel } from './schoolModel';
import { createSoundCheck } from './SoundCheck';
import { createWaveLabScreen, type WaveLabScreen } from './WaveLabScreen';
import { LabStore, type WaveLabSettings } from '../game/waveLab/labSettings';
import type { FlyInput, JumpPoint } from '../game/waveLab/FlyInput';
import type { LabClock } from '../game/waveLab/labClock';
import type { WaveInfo } from '../game/waveLab/waveInfo';
import type { WaterLook } from '../scene/water/waterLook';
import type { Units } from './units';
import type { LessonStart } from '../game/school/lessonWave';
import type { FlowFrame } from '../game/school/lessonFlow';
import { OnlineHud, PlayersPanel, onlineHudModel, playersModel } from './OnlineHud';
import { roomLink } from '../net/roomCode';
import type { CallId } from '../net/protocol';
import { createRideEndCard, endCardModel } from './RideEndCard';
import { bestTwo, scoreRide } from '../game/waveScore';
import { HintBook, HintCoach, offersHint, type HintId } from '../game/hints';
import { RideHud, showsBalanceMeter, showsBreathMeter, type HintKeys } from './RideHud';
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

/** The Wave Lab as the menus drive it (spec L1; implemented in main.ts). */
export interface LabHost {
  /** Build the lab's sea (no rider) and fly over it; false when superseded. */
  enter(settings: WaveLabSettings): Promise<boolean>;
  /** Rebuild the sea with new settings (or a new seed), keeping the camera where it is. */
  apply(settings: WaveLabSettings, newSea: boolean): Promise<boolean>;
  setLight(sun: { sunHeight: number; sunDirection: number }): void;
  setWaterLook(look: WaterLook): void;
  leave(): void;
  readonly input: FlyInput;
  readonly clock: LabClock;
  readonly following: boolean;
  toggleFollow(): boolean;
  jump(point: JumpPoint): void;
  info(units: Units, words?: Omit<SurfWords, 'units'>): WaveInfo | undefined;
  /** The dev tools' physics readout. */
  readonly readout: ReadoutRow[];
  /** H or X (hide the interface) and Esc or Start (the pause menu), as the lab's input reports them. */
  onAction?: (action: 'hide' | 'menu') => void;
}

/** The Surf School as the menus drive it (spec L2; implemented in main.ts). */
export interface SchoolHost {
  /**
   * Build the lesson sea from its recording for `start`, the rider placed, in `camera`; false when superseded;
   * throws when the wave will not load. `freePractice` rides with the pocket reflex as its setting says; a lesson never does.
   */
  enter(start: LessonStart, camera: RideView, freePractice: boolean): Promise<boolean>;
  /** The same wave again from `start`'s recording, the rider placed. */
  restart(start: LessonStart): Promise<void>;
  /** Slow motion at 0.5× (a pause-menu toggle). */
  setSlowMotion(on: boolean): void;
  /** The next lesson's view. */
  setView(view: RideView): void;
  readonly slowMotion: boolean;
  /** This frame of the attempt, as the lesson's goal and flow read it; none without a rider. */
  frame(): FlowFrame | undefined;
  /** The recording is not yet the reference wave (a dev note). */
  readonly provisional: boolean;
  leave(): void;
}

/** What the menus ask of the game (implemented by `SurfGame` in main.ts). */
export interface GameHost {
  readonly lab: LabHost;
  readonly school: SchoolHost;
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
  /** The loading card covers the whole screen: nothing drawn or stepped would show (the next sea spins up alone). */
  setCovered(covered: boolean): void;
  cycleView(): void;
  quickRetry(): void;
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
  /** The scene the game shows now: the menu's waves, a ride, the Wave Lab, a lesson, or the dev tools' bare stage. */
  private scene?: 'backdrop' | 'ride' | 'wavelab' | 'lesson' | 'stage';
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
  /** The running sea's measured surf, for the pause card (the wave-sizes spec). */
  private surf?: SurfReading;
  /** The current wave's seed: Replay keeps it, New wave moves on. */
  private seed = 1 + Math.floor(Math.random() * 9999);
  private readonly rideHud: RideHud;
  private readonly tracker = new RideTracker();
  private readonly logbook = new Logbook(localStore());
  private endCard?: HTMLElement;
  /** One-time hints for the riding mechanics (P9). */
  private readonly hintBook = new HintBook(localStore());
  private readonly coach = new HintCoach(this.hintBook);
  /**
   * The Surf School (L2): lessons passed; the lesson (or Free Practice) under way
   * and its start; what covers the wave (the card, the pass card or How to…);
   * whether the sea still stands where it was placed; and why a lesson wave would
   * not load.
   */
  private readonly schoolProgress = new SchoolProgress(localStore());
  private lessonFlow?: LessonFlow;
  private lessonStart: LessonStart = 'pocket';
  private lessonOverlay?: 'card' | 'pass' | 'howto';
  private lessonFresh = false;
  private schoolError?: string;
  private schoolBusy = false;
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
  /** The 2026 Steam Controller over WebHID (spec C1), when the game has one. */
  private readonly steam?: SteamControllerDriver;
  /** Online (N1): the room session while in one, and the Multiplayer screen's state. */
  private online?: OnlineController;
  private multiplayer: MultiplayerState;
  private webGpuAsked = false;
  private readonly onlineHud = new OnlineHud();
  private playersPanel?: PlayersPanel;
  /** The Wave Lab (L1): its applied settings, kept in the browser, the draft being edited, and its screen. */
  private readonly labStore = new LabStore(localStore());
  private labDraft?: WaveLabSettings;
  private labScreen?: WaveLabScreen;
  private labUiHidden = false;
  private labClock = 0;
  private labRebuilding = false;

  constructor(
    private readonly game: GameHost,
    private readonly controls: Controls,
    readonly settings: SettingsStore,
    /** Where the page opens: the menu, a Surf ride (`?physical`, `?demo`), or the bare stage (`?record`, `?waterSheet`); and the Steam Controller (C1). */
    options: { start: 'menu' | 'ride' | 'stage'; steam?: SteamControllerDriver },
  ) {
    this.stack = new ScreenStack(options.start === 'stage' ? 'stage' : 'menu');
    // A room's link (`?room=CODE`) opens Multiplayer with the code filled in (N1).
    const linked = roomCodeFromSearch(globalThis.location?.search ?? '');
    this.multiplayer = { name: settings.value.online.name, code: linked ?? '', settings: { ...DEFAULT_ROOM_SETTINGS }, webGpu: undefined };
    if (linked && options.start === 'menu') this.stack.push('multiplayer');
    this.scene = options.start === 'stage' ? 'stage' : undefined;
    this.menuInput = new MenuInput({ root: () => this.ui, onBack: () => this.back() });
    this.adapter = adapterName(game.gl);
    this.rideHud = new RideHud(() => this.pause());
    this.setLoadingText('loading.break');
    this.bindTouch();
    this.settings.subscribe((_, change) => {
      if (change === 'accessibility' || change === 'gameplay' || change === 'controls') this.applyAccessibility();
    });
    this.sound = new GameSound(settings, () => refreshSoundToggles(this.ui, this.sound.muted));
    game.lab.onAction = (action) => {
      if (action === 'menu') this.pause();
      else this.toggleLabUi();
    };
    // Dev tools: the sound, for checks in the page and the sound check.
    if (DEV_TOOLS) (globalThis as unknown as { breaklineSound?: GameSound }).breaklineSound = this.sound;
    // Dev tools: the school's flow and frames, for checks in the page.
    if (DEV_TOOLS) (globalThis as unknown as { breaklineSchool?: unknown }).breaklineSchool = {
      flow: () => this.lessonFlow, frame: () => this.game.school.frame(), ride: () => this.game.rideStatus,
    };
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
    this.steam = options.steam;
    this.steam?.onChange(() => this.steamChanged());
    this.show();
    if (options.start === 'ride') void this.paddleOut();
  }

  /** A Steam Controller came or went (spec C1): once one has connected, the menu's Connect button goes for good. */
  private steamChanged(): void {
    if (this.steam?.status !== 'connected' || this.settings.value.seen.steamController) return;
    this.settings.markSeen('steamController');
    if (this.stack.current === 'menu') this.show();
  }

  /** Sound on or off: M, the gamepad's Back, or a speaker toggle. */
  toggleMute(): void {
    this.sound.toggleMute();
  }

  /** Called by the game once per rendered frame: the gamepad, and the Auto benchmark while the menu's waves run. */
  frame(intervalMs: number, status?: SurfZoneStatus): void {
    this.menuInput.poll();
    this.surf = status?.surf;
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
    if (this.stack.current === 'wavelab' && this.labScreen) {
      this.labClock += intervalMs;
      if (this.labClock >= 250) {
        this.labClock = 0;
        this.labScreen.update(this.labView());
      }
    }
    if (this.stack.current === 'lesson' && this.lessonFlow) this.lessonFrame(dt);
    if (this.stack.current === 'ride') {
      const { gameplay, seen } = this.settings.value;
      const ride = this.game.rideStatus;
      // The touch buttons show for the rider's phase: paddle lying down, Crouch and Compress standing.
      this.root.dataset.phase = ride?.phase ?? '';
      // Broken water coming at the rider: a breaking crest seaward of it (the wipeout spec's duck-dive hint).
      const coming = ride?.wave.valid && ride.wave.crestBreaking > 0.3 && ride.wave.aheadOfCrest > 0 ? ride.wave.aheadOfCrest : Infinity;
      const hint = this.coach.update(intervalMs / 1000, {
        standing: ride?.phase === 'standing',
        crestBreaking: ride?.wave.valid ? ride.wave.crestBreaking : 0,
        input: this.controls.lastRequest,
        phase: ride?.phase,
        whitewaterAhead: coming,
        leashIntact: ride ? !ride.leash.snapped : false,
        boardInReach: ride?.boardInReach ?? false,
      }, (id) => this.hintText(id) !== '' && offersHint(id, this.online?.room?.conditions.swell ?? this.surfChoice.conditions.swell));
      this.rideHud.update(ride, gameplay.units, this.hintKeys(), !seen.rideHints,
        showsBalanceMeter(gameplay.balanceMeter, this.online?.room?.conditions.swell ?? this.surfChoice.conditions.swell), hint ? this.hintText(hint) : '', undefined,
        showsBreathMeter(gameplay.breathMeter, this.online?.room?.conditions.swell ?? this.surfChoice.conditions.swell));
      this.rideHud.updateStance(this.controls.lastRequest, ride?.phase === 'standing', gameplay.stanceReadout);
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

  /** Esc, Start or the pause button, during a ride, a lesson or in the Wave Lab. */
  pause(): void {
    const { current } = this.stack;
    if (current === 'ride' || current === 'wavelab' || (current === 'lesson' && !this.lessonOverlay)) this.go('pause');
  }

  /** R: in the Surf School the same wave again; in Surf, paddle out again. */
  retry(): void {
    if (this.stack.base === 'lesson') {
      if (!this.lessonOverlay && this.lessonFlow?.retry()) void this.restartAttempt();
      return;
    }
    this.game.quickRetry();
    this.noteRetry();
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
    // A lesson rides when nothing covers its wave; its card and pass card hold the sea still.
    const lessonRiding = current === 'lesson' && !this.lessonOverlay;
    const playing = current === 'ride' || current === 'wavelab' || current === 'stage' || lessonRiding;
    // The ride's keys drive a rider; the Wave Lab flies its camera with its own input.
    this.controls.enabled = current === 'ride' || lessonRiding;
    this.game.lab.input.enabled = current === 'wavelab';
    this.menuInput.active = !playing;
    this.game.setPaused(this.stack.stack.includes('pause') || (current === 'lesson' && !lessonRiding));
    this.applyAccessibility();
    if (base !== 'menu') this.backdropReady = false;
    if (base === 'menu' && this.scene !== 'backdrop') this.openBackdrop();
    // The gradient only stands in for the menu's waves; a ride or the Wave Lab shows its own scene.
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
      const strip = this.steam ? steamStrip(this.steam.status, this.settings.value.seen.steamController) : undefined;
      return [createMainMenu({
        surf: () => this.go('surf'),
        multiplayer: () => this.go('multiplayer'),
        school: () => this.go('school'),
        waveLab: () => void this.enterWaveLab(),
        logbook: () => this.go('logbook'),
        settings: () => this.go('settings'),
      }, {
        version: packageJson.version, schoolStarted: this.schoolProgress.started, sound: { muted: this.sound.muted, toggle: () => this.toggleMute() },
        ...(strip ? { steam: { label: t(strip.label), disabled: strip.disabled, connect: () => void this.steam?.request() } } : {}),
      })];
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
      }, card.root, (choice) => surfForecastText(choice, this.surfWords()))];
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
        context: () => ({ devTools: DEV_TOOLS, detecting: this.detecting, steam: this.steam?.status ?? 'unsupported', padKind: this.controls.lastPadKind }),
        onSteamConnect: () => void this.steam?.request(),
        ...(this.steam ? { external: (listener: () => void) => this.steam!.onChange(listener) } : {}),
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
    if (id === 'school') {
      return [createSchoolScreen(schoolListModel(this.schoolProgress, LESSONS), {
        lesson: (lessonId) => void this.openLesson(lessonById(lessonId)),
        freePractice: (start) => void this.openLesson(undefined, start),
        back: () => this.back(),
      }, this.schoolError)];
    }
    if (id === 'lesson') return this.lessonScreen();
    if (id === 'pause' && this.stack.base === 'lesson') {
      const flow = this.lessonFlow;
      const { school } = this.game;
      return [createLessonPauseMenu({
        resume: () => this.back(),
        restart: () => {
          this.back();
          void this.restartAttempt();
        },
        explain: () => {
          this.lessonOverlay = 'card';
          this.back();
        },
        slowMotion: () => {
          school.setSlowMotion(!school.slowMotion);
          return school.slowMotion;
        },
        slowMotionOn: school.slowMotion,
        camera: () => {
          this.game.cycleView();
          return this.viewLabel();
        },
        settings: () => this.go('settings'),
        ...(flow && !flow.lesson ? {
          howTo: () => {
            this.lessonOverlay = 'howto';
            this.back();
          },
        } : {}),
        lessons: () => this.toSchool(),
        quit: () => this.quitToMenu(),
        sound: { muted: this.sound.muted, toggle: () => this.toggleMute() },
      }, this.viewLabel())];
    }
    if (id === 'pause' && this.stack.base === 'wavelab') {
      return [createLabPauseMenu({
        resume: () => this.back(),
        settings: () => this.go('settings'),
        quit: () => this.quitToMenu(),
        sound: { muted: this.sound.muted, toggle: () => this.toggleMute() },
      })];
    }
    if (id === 'wavelab') return [this.createLabScreen()];
    if (id === 'pause') {
      return [createPauseMenu({
        resume: () => this.back(),
        replay: () => void this.paddleOut(),
        newWave: () => this.nextWave(),
        camera: () => {
          this.game.cycleView();
          return this.viewLabel();
        },
        settings: () => this.go('settings'),
        quit: () => this.quitToMenu(),
        sound: { muted: this.sound.muted, toggle: () => this.toggleMute() },
      }, this.viewLabel(), describeSurf(this.surf, this.surfWords()))];
    }
    return [];
  }

  private viewLabel(): string {
    const key = `view.${this.game.viewName}`;
    return key in EN ? t(key as StringKey) : this.game.viewName;
  }

  private nextWave(): void {
    this.seed = (this.seed % 9999) + 1;
    void this.paddleOut();
  }

  private quitToMenu(): void {
    this.leaveLesson();
    this.leaveWaveLab();
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
    this.showLoading(true);
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
    this.showLoading(false);
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
    this.showLoading(false);
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
    this.showLoading(true);
    const { spot, conditions } = this.surfChoice;
    const started = await this.game.startSurf(spot, conditions, this.seed, this.settings.value.gameplay.defaultCamera);
    this.showLoading(false);
    if (!started) return;
    this.hideEndCard();
    this.tracker.reset();
    this.scene = 'ride';
    this.stack.reset('ride');
    this.show();
  }

  /** The loading card, over everything: the game stops drawing and stepping behind it. */
  private showLoading(shown: boolean): void {
    this.loading.classList.toggle('is-hidden', !shown);
    this.game.setCovered(shown);
  }

  private setLoadingText(key: Parameters<typeof t>[0]): void {
    if (this.loadingText) this.loadingText.textContent = t(key);
  }

  /** A riding hint's text (P9), naming the player's keys, pad or touch buttons; empty when the device has no input for it. */
  private hintText(id: HintId): string {
    if (this.touchActive()) {
      if (id === 'lean') return t('hint.lean', { keys: '← →' });
      if (id === 'crouch') return t('hint.crouch', { keys: t('touch.crouch') });
      if (id === 'compress') return t('hint.compress', { keys: t('touch.compress') });
      // Touch has no duck-dive (the milestone spec's touch subset); its pop-up button reels the leash.
      if (id === 'reel') return t('hint.reel', { keys: t('touch.popUp') });
      return '';
    }
    const { bindings } = this.settings.value.controls;
    const pad = this.controls.lastDevice === 'gamepad';
    const kind = this.controls.lastPadKind;
    const label = (action: Action) => (pad ? buttonLabel(bindings.gamepad[action][0], kind) : keyLabel(bindings.keyboard[action][0]));
    const trimStick = t(stickOf('trimForward', this.settings.value.controls) === 'right' ? 'hud.rightStick' : 'hud.stick');
    const keys = id === 'lean' ? (pad ? t('hud.stick') : `${label('steerLeft')} ${label('steerRight')}`)
      : id === 'trim' ? (pad ? trimStick : `${label('trimForward')} ${label('trimBack')}`)
        : id === 'reel' ? label('popUp')
          : label(id);
    // Nothing bound (an action newer than the player's saved bindings): no hint to give.
    if (keys === '—') return '';
    return t(`hint.${id}`, { keys });
  }

  /** The key, button or stick each action is on for the device in use: the lesson card's keys and prompts (spec L2). */
  private readonly actionLabel: ActionLabel = (action) => {
    if (this.touchActive()) {
      const touch: Partial<Record<Action, StringKey>> = {
        paddle: 'touch.paddle', popUp: 'touch.popUp', crouch: 'touch.crouch', compress: 'touch.compress', steerLeft: 'touch.left', steerRight: 'touch.right',
      };
      const key = touch[action];
      return key ? t(key) : '—';
    }
    const { bindings } = this.settings.value.controls;
    if (this.controls.lastDevice !== 'gamepad') return keyLabel(bindings.keyboard[action][0]);
    const stick = stickOf(action, this.settings.value.controls);
    if (stick) return t(stick === 'right' ? 'hud.rightStick' : 'hud.stick');
    return buttonLabel(bindings.gamepad[action][0], this.controls.lastPadKind);
  };

  /** The lesson's scene: the ride HUD, and whatever covers the wave (the card, the pass card, How to…). */
  private lessonScreen(): Node[] {
    const flow = this.lessonFlow;
    const nodes: Node[] = [this.rideHud.root];
    if (DEV_TOOLS && this.game.school.provisional) nodes.push(el('p', { class: 'school-provisional', text: 'Provisional wave' }));
    const lesson = flow?.lesson;
    if (lesson && this.lessonOverlay === 'card') {
      nodes.push(createLessonCard(lessonCardModel(lesson, this.actionLabel), {
        go: () => void this.beginAttempt(),
        list: () => this.toSchool(),
      }, flow.state === 'attempt' ? 'pause.resume' : 'school.go'));
    }
    if (lesson && this.lessonOverlay === 'pass') {
      const next = LESSONS[LESSONS.indexOf(lesson) + 1];
      nodes.push(createPassCard(t(`lesson.${lesson.id}.title` as StringKey), {
        ...(next ? { next: () => void this.switchLesson(next) } : {}),
        again: () => void this.againLesson(),
        list: () => this.toSchool(),
      }));
    }
    if (this.lessonOverlay === 'howto') {
      nodes.push(createHowTo(LESSONS.map((each) => lessonCardModel(each, this.actionLabel)), () => {
        this.lessonOverlay = undefined;
        this.show();
      }));
    }
    return nodes;
  }

  /** A frame of the lesson: the attempt read against its goal, a miss's restart, and the HUD's two lines. */
  private lessonFrame(seconds: number): void {
    const flow = this.lessonFlow!;
    if (!this.lessonOverlay) {
      if (flow.state === 'attempt') {
        const frame = this.game.school.frame();
        if (frame) flow.frame(frame);
        // The frame may have passed the lesson (the narrowing above cannot see it).
        if ((flow.state as FlowState) === 'passed') this.lessonPassed();
      } else if (flow.state === 'missed') {
        const next = flow.tick(seconds);
        if (next === 'restart') {
          void this.restartAttempt();
        } else if (next === 'card') {
          this.lessonOverlay = 'card';
          this.show();
        }
      }
    }
    const ride = this.game.rideStatus;
    const keys = this.hintKeys();
    const hud = lessonHud(flow, this.actionLabel, keys.retry);
    // The ride's own "Pop up now" wins while it shows: it is the moment the pop-up and catch lessons teach.
    const prompt = ride?.cue && flow.state === 'attempt' ? undefined : hud.prompt;
    this.rideHud.update(ride, this.settings.value.gameplay.units, keys, false, true, hud.coach, prompt);
    this.rideHud.updateStance(this.controls.lastRequest, ride?.phase === 'standing', this.settings.value.gameplay.stanceReadout);
  }

  /**
   * A lesson, or Free Practice (no lesson): its sea builds from the recording behind
   * the loading card, then the lesson's card shows over it (Free Practice rides at
   * once). A wave that will not load says so on the School screen.
   */
  private async openLesson(lesson: Lesson | undefined, freeStart: LessonStart = 'pocket'): Promise<void> {
    if (this.schoolBusy) return;
    this.schoolBusy = true;
    const start = lesson?.start ?? freeStart;
    const view = lesson?.view ?? (start === 'pocket' ? 'behind' : 'front');
    this.setLoadingText('loading.school');
    this.showLoading(true);
    let started = false;
    try {
      started = await this.game.school.enter(start, view, !lesson);
      this.schoolError = undefined;
    } catch (error) {
      console.warn('The lesson wave did not load.', error);
      this.schoolError = t('school.loadError');
    } finally {
      this.showLoading(false);
      this.schoolBusy = false;
    }
    if (!started) {
      if (this.stack.current === 'school') this.show();
      return;
    }
    this.hideEndCard();
    this.lessonStart = start;
    this.lessonFlow = new LessonFlow(lesson, { start });
    this.lessonFresh = true;
    this.lessonOverlay = lesson ? 'card' : undefined;
    if (!lesson) this.lessonFlow.start();
    this.scene = 'lesson';
    this.stack.reset('lesson');
    this.show();
  }

  /** Start from the card (a fresh attempt, the wave restarted unless it still stands where it was placed), or back to the wave. */
  private async beginAttempt(): Promise<void> {
    const flow = this.lessonFlow;
    if (!flow) return;
    this.lessonOverlay = undefined;
    if (flow.state !== 'attempt') {
      if (!this.lessonFresh) await this.game.school.restart(this.lessonStart);
      flow.start();
    }
    this.lessonFresh = false;
    this.show();
  }

  /** The same wave again, now: a miss's restart, R, or Restart. */
  private async restartAttempt(): Promise<void> {
    const flow = this.lessonFlow;
    if (!flow) return;
    await this.game.school.restart(this.lessonStart);
    flow.start();
    this.lessonFresh = false;
  }

  /** Passed: remembered, the matching Surf hint retired, and the pass card over the held wave. */
  private lessonPassed(): void {
    const lesson = this.lessonFlow?.lesson;
    if (!lesson) return;
    this.schoolProgress.pass(lesson.id);
    if (lesson.hint) this.hintBook.succeeded(lesson.hint);
    this.sound.playUi('chime');
    this.lessonOverlay = 'pass';
    this.show();
  }

  private async againLesson(): Promise<void> {
    this.lessonOverlay = undefined;
    await this.restartAttempt();
    this.show();
  }

  /** The next lesson on the same wave: no rebuild, the wave restarted for its start, its card. */
  private async switchLesson(lesson: Lesson): Promise<void> {
    this.lessonStart = lesson.start;
    this.lessonFlow = new LessonFlow(lesson);
    this.lessonOverlay = 'card';
    this.game.school.setView(lesson.view);
    await this.game.school.restart(lesson.start);
    this.lessonFresh = true;
    this.show();
  }

  /** Lessons: out of the lesson and back to the School's list. */
  private toSchool(): void {
    this.leaveLesson();
    this.stack.reset('menu');
    this.stack.push('school');
    this.show();
  }

  private leaveLesson(): void {
    if (!this.lessonFlow) return;
    this.lessonFlow = undefined;
    this.lessonOverlay = undefined;
    this.game.school.leave();
  }

  /** The keys (or pad buttons) the prompts and hints name, from the player's bindings and last-used device. */
  private hintKeys(): HintKeys {
    // On touch the prompts name the on-screen buttons; paddling out again is the end card's Replay.
    if (this.touchActive()) {
      return { paddle: t('touch.paddle'), popUp: t('touch.popUp'), retry: t('touch.retry'), steer: '', pause: '' };
    }
    const { bindings } = this.settings.value.controls;
    const pad = this.controls.lastDevice === 'gamepad';
    const label = (action: Action) => (pad ? buttonLabel(bindings.gamepad[action][0], this.controls.lastPadKind) : keyLabel(bindings.keyboard[action][0]));
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
    label('touch-compress', 'touch.compress');
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

  /** The Wave Lab (spec L1): its sea builds behind the loading card, from the settings applied last time. */
  private readonly enterWaveLab = oncePerFlight(async () => {
    this.setLoadingText('loading.lab');
    this.showLoading(true);
    const started = await this.game.lab.enter(this.labStore.value);
    this.showLoading(false);
    if (!started) return;
    this.hideEndCard();
    this.labDraft = structuredClone(this.labStore.value);
    this.labUiHidden = false;
    this.scene = 'wavelab';
    this.stack.reset('wavelab');
    this.show();
  });

  /** The lab's screen, over its sea: edits apply the light and look at once; the sea rebuilds on Apply. */
  private createLabScreen(): HTMLElement {
    const draft = this.labDraft ?? structuredClone(this.labStore.value);
    const clock = this.game.lab.clock;
    const refresh = () => this.labScreen?.update(this.labView());
    this.labScreen = createWaveLabScreen({
      settings: draft, running: this.labStore.value, devTools: DEV_TOOLS, touch: this.touchActive(), units: this.settings.value.gameplay.units,
      scale: this.settings.value.gameplay.surfScale,
    }, {
      change: (next) => {
        this.labDraft = next;
        this.game.lab.setLight(next);
        this.game.lab.setWaterLook(next.waterLook);
      },
      apply: (next) => void this.rebuildLab(next, false),
      newSea: (next) => void this.rebuildLab(next, true),
      follow: () => {
        this.game.lab.toggleFollow();
        refresh();
      },
      togglePause: () => {
        clock.togglePause();
        refresh();
      },
      step: () => clock.step(),
      setScale: (scale) => {
        clock.setScale(scale);
        refresh();
      },
      jump: (point) => this.game.lab.jump(point),
      hideUi: () => this.toggleLabUi(),
      menu: () => this.pause(),
      stick: (x, y) => this.game.lab.input.setStick(x, y),
      rise: (value) => this.game.lab.input.setRise(value),
      ...(DEV_TOOLS ? { soundCheck: () => createSoundCheck(() => this.sound.audioEngine) } : {}),
    });
    this.labScreen.update(this.labView());
    return this.labScreen.root;
  }

  /** How this player reads surf (the wave-sizes spec): the chosen scale, against the chosen surfer's height. */
  private surfWords(): SurfWords {
    const { gameplay, surfer } = this.settings.value;
    return { units: gameplay.units, scale: gameplay.surfScale, surferHeight: surferHeight(surfer.body) };
  }

  private labView() {
    const { lab } = this.game;
    return {
      paused: lab.clock.paused, scale: lab.clock.scale, following: lab.following, uiHidden: this.labUiHidden,
      info: lab.info(this.settings.value.gameplay.units, this.surfWords()), ...(DEV_TOOLS ? { readout: lab.readout } : {}),
    };
  }

  /** H, X, Hide or Show: the lab's interface goes, or comes back. */
  private toggleLabUi(): void {
    if (this.stack.current !== 'wavelab') return;
    this.labUiHidden = !this.labUiHidden;
    this.labScreen?.update(this.labView());
  }

  /** Apply or New sea: rebuild behind the loading card; the applied settings are remembered. */
  private async rebuildLab(next: WaveLabSettings, newSea: boolean): Promise<void> {
    if (this.labRebuilding) return;
    this.labRebuilding = true;
    this.setLoadingText('loading.lab');
    this.showLoading(true);
    try {
      if (!(await this.game.lab.apply(next, newSea))) return;
      this.labStore.save(next);
      this.labDraft = structuredClone(next);
      this.labScreen?.setRunning(next);
    } finally {
      this.showLoading(false);
      this.labRebuilding = false;
    }
  }

  /** Leaving the lab keeps its light and look for next time (the sea only as applied), and hands the scene back. */
  private leaveWaveLab(): void {
    if (this.scene !== 'wavelab') return;
    const draft = this.labDraft;
    if (draft) this.labStore.save({ ...this.labStore.value, sunHeight: draft.sunHeight, sunDirection: draft.sunDirection, waterLook: draft.waterLook });
    this.labScreen = undefined;
    this.labDraft = undefined;
    this.game.lab.leave();
  }

  /**
   * The menu's waves at a new spot. The menu never waits for them: it stands on a
   * gradient in the brand's colours and the sea fades in once ready. The scene it
   * replaces fades out and stops, so the new sea spins up on the GPU alone.
   */
  private openBackdrop(): void {
    this.scene = 'backdrop';
    this.backdropReady = false;
    this.backdropSpot = nextBackdropSpot(this.backdropSpot);
    this.root.classList.add('is-scene-pending');
    this.game.setCovered(true);
    void this.game.showBackdrop(this.backdropSpot).then((shown) => {
      // Superseded (a ride or the lab took over): whoever did uncovers the scene.
      if (!shown) return;
      this.backdropReady = this.stack.base === 'menu';
      this.root.classList.remove('is-scene-pending');
      this.game.setCovered(false);
      this.warmup = 0;
      this.startBenchmarkIfNeeded();
    }, (error: unknown) => {
      this.game.setCovered(false);
      throw error;
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
