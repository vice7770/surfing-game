# L2 Surf School Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Surf School tile with nine lessons and Free Practice. Each lesson starts the player on the same recorded wave, in the right place for one motion, explains it, and passes on a goal measured from the physics.

**Architecture:**
- **The wave.** A lesson wave is a recorded sea state shipped as an asset (`public/lessons/*.sea`, deflated), plus its sea config and three rider placements (`src/game/school/lessonWaves.ts`). Both are written by `npm run lesson:wave`, which searches a CPU run of the Canyon's practice sea for a good peel and checks each placement with the autopilot.
- **The game side:**
  - builds the lesson sea from that config (no spin-up), imports the state, and keeps it;
  - every attempt **restores** it in place (a new host request) and **places** the rider (a new ride request).
- **Pure pieces under `src/game/school/`:** the lessons and their goals, the attempt/flow state machine, and progress. The DOM lives in `src/ui/School*.ts`. `App` drives the flow.

**Tech Stack:** TypeScript, three.js, Vitest (node environment, no DOM), rolldown for the script (as the other report scripts).

**Spec:** `docs/superpowers/specs/2026-09-27-wave-lab-surf-school.md` (sections *L2 · Surf School*, *Delivery*, *Testing*).

## Global Constraints

- **Player-facing text** goes in `src/ui/strings.ts` (English). The "Provisional wave" note is dev-only and may stay inline.
- **Rider physics untouched** except the new placement (`RideSession.place`). Wave-driven transport holds: the rider is placed moving with the water, then only the physics carries it.
- **Stay out of the riding work's way** (its plan: `docs/superpowers/plans/2026-09-27-riding-the-wave.md`). Do not edit `waveFrame.ts`, `rideAnalysis.ts`, `PhysicalSurfWater.ts` or `Autopilot.ts`'s riding logic. In `SurfZoneRunner` / `main.ts`, only add beside what exists. The lesson wave stores its own swell values, so the riding work's reference-wave change to `PRACTICE_SWELL` cannot break a recording.
- **Do not edit** `Controls.ts`, `Bindings.ts` or `Settings.ts` (the uncommitted Steam Controller work).
- **Lesson attempts and Free Practice write nothing to the Logbook** and score nothing. Surf's one-time hints stay quiet in the school.
- **Assists:**
  - the balance meter is on throughout the school;
  - slow motion 0.5× is a pause-menu toggle, off by default;
  - falls are real;
  - the pocket reflex is off in lessons (it does not exist on main yet; Free Practice follows its setting once the riding work adds it).
- **Same-wave stop condition:** on the CPU, two restores step identically for 10 s. If the GPU check in the browser shows the breaking more than 1 m or 0.2 s apart, stop and bring options to the user.
- **Tests** use `npx vitest run --dir src`, and the build is `npm run build`. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Restart while a GPU step is in flight.** The restore must wait for the step, and the next advance must see the restored sea. *Test in Task 1 (`restores after the step under way`).*
2. **A lesson's sea asset fails to load** (offline, 404, bad bytes). The school stays usable: an error line on the School screen, and no stuck loading card. *Test in Task 7 (`falls back when the wave will not load`).*
3. **R pressed during the explanation card or after passing.** Nothing breaks; R restarts only during an attempt or after a miss. *Test in Task 5 (`R does nothing on a card`).*
4. **Quit to menu mid-attempt, then Surf.** The school's slow motion, forced balance meter and hint silence do not leak into Surf. *Covered by Task 9's App wiring, with a browser check.*
5. **A placement that lands inside the whitewater or out of the tank** (a bad recording). The rider still gets a board on the water and the attempt ends as a miss, not a crash. *Test in Task 2 (`places anywhere on the water, even in the whitewater`).*

---

### Task 1: Restore a running sea in place

**Files:**
- Modify: `src/wave/BoussinesqSolver.ts` (a public `invalidateDeviceLayout()`)
- Modify: `src/wave/SurfZoneSimulation.ts` (`importState` calls it)
- Modify: `src/game/SurfZoneHost.ts` (`SurfZoneHost.restore(sea: Uint8Array)`; `LocalSurfZone.restore`)
- Modify: `src/game/SurfZoneWorkerCore.ts` (a `restore` request, applied after any step under way)
- Modify: `src/game/WorkerSurfZone.ts` (`restore` posts it)
- Test: `src/game/SurfZoneHost.test.ts` (new cases), `src/game/SurfZoneWorkerCore.test.ts` (new case, if the file exists; otherwise in `WorkerSurfZone.test.ts`)

**Interfaces:**
- Produces:
  - `SurfZoneHost.restore(sea: Uint8Array): void`, where `sea` is an encoded (not deflated) state;
  - `SurfZoneRequest` gains `{ type: 'restore'; sea: Uint8Array }`;
  - `BoussinesqSolver.invalidateDeviceLayout(): void`.

- [ ] **Step 1: Failing tests.**
  - `LocalSurfZone`, a small config (the Canyon, stage 2, CPU, practice swell as `SurfZoneHost.test.ts`'s existing configs do). Advance 30 steps and capture `encodeSurfZoneState(host.runner.simulation.exportState())`. Advance 600 more steps and copy `snapshot.surface`. Then `host.restore(captured)`, advance 600 steps, and expect `snapshot.surface` equal to the copy element by element (`toEqual`). This is the same-wave check on the CPU.
  - `BoussinesqSolver`: `const v = solver.deviceLayout().version; solver.invalidateDeviceLayout(); expect(solver.deviceLayout().version).toBe(v + 1)`.
  - Worker core: with a fake device whose `step` resolves only when told, send `advance` and then `restore` before releasing the step. Expect the import to happen only after the step resolves (spy on `runner.simulation.importState` order). Name: `restores after the step under way`.
- [ ] **Step 2: Run them.** Expected: FAIL (`restore` is not a function / no `invalidateDeviceLayout`).
- [ ] **Step 3: Implement.**
  - `invalidateDeviceLayout() { this.layoutVersion += 1; }`, with a doc comment: after a handover or restore, the device re-uploads the breaking and predictor state.
  - In `SurfZoneSimulation.importState`, after the arrays are set: `if (solver instanceof BoussinesqSolver) solver.invalidateDeviceLayout();`.
  - `LocalSurfZone.restore(sea) { this.runner.simulation.importState(decodeSurfZoneState(sea)); this.refresh(); }`.
  - Worker core: `if (request.type === 'restore') return this.restore(runner, request.sea);`, where `private async restore(runner, sea) { await this.stepping; runner.simulation.importState(decodeSurfZoneState(sea)); }`.
  - `WorkerSurfZone.restore(sea) { this.port.postMessage({ type: 'restore', sea }, [sea.buffer]); }`. The caller passes a copy it may lose.
  - Any fake `SurfZoneHost` in tests gets a `restore() {}`.
- [ ] **Step 4: Run.** `npx vitest run src/game src/wave/SurfZoneSimulation.test.ts src/wave/BoussinesqSolver.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit.** `feat(school): restore a running sea in place`.

---

### Task 2: Place the rider

**Files:**
- Modify: `src/physics/RideSession.ts` (`place`)
- Modify: `src/wave/SurfZoneRunner.ts` (`RideRequest.place`, handled in `afterWater` like `retry`)
- Modify: `src/game/SurfZoneHost.ts` (`LocalSurfZone` keeps a pending `place` like its pending presses)
- Modify: `src/game/WorkerSurfZone.ts` (keeps `place` until an advance carries it)
- Test: `src/physics/RideSession.test.ts`, `src/wave/SurfZoneRunner.test.ts`

**Interfaces:**
- Produces:
  - `interface RiderPlacement { x: number; z: number; heading: number; speed: number; phase: 'standing' | 'prone' }`, exported from `RideSession.ts`;
  - `RideSession.place(placement: RiderPlacement, water: SurfWater): void`;
  - `RideRequest.place?: RiderPlacement`.
  - A placement counts as a restart: `ride.resets` goes up by one, and the ride analysis starts afresh.

- [ ] **Step 1: Failing tests.**
  - `RideSession`: on `new SwellWater({ height: 1, period: 9, depth: 5 })` advanced 2 s, place `{ x: 1, z: -3, heading: 0.5, speed: 6, phase: 'standing' }`. Expect:
    - `rider.attached` and `rider.phase === 'standing'`;
    - the board's heading close to 0.5 (±0.01);
    - its horizontal velocity minus the water's surface flow (sampled as `reset` does) about 6 along the heading (±0.05);
    - `surfer.active` false.
  - Place `phase: 'prone'` → `rider.phase === 'prone'`.
  - Named `places anywhere on the water, even in the whitewater`: place on a `PlaneWater` and step 60 times with no input; the session has no NaN in its board position.
  - `SurfZoneRunner` (rider on, a small config): `advance(1, { ...IDLE, place: { x: runner.focus.x, z: runner.focus.z - 2, heading: 0, speed: 3, phase: 'standing' } })`. Expect `status().ride.phase === 'standing'`, `ride.resets` one more than before, and the board within 0.5 m of the point.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement** `RideSession.place` beside `reset`:

  ```ts
  /**
   * Put the board and rider on the water at a point, moving with the surface
   * water plus `speed` along `heading` (radians from +z toward +x), standing or
   * lying (Surf School, spec L2). Like `reset`, the board lies along the surface.
   */
  place(placement: RiderPlacement, water: SurfWater): void {
    const at = new Vector3(placement.x, 0, placement.z);
    this.reset(at, placement.heading, water);
    const forward = new Vector3(0, 0, 1).applyQuaternion(this.board.orientation);
    forward.y = 0;
    if (forward.lengthSq() > 1e-9) forward.normalize();
    this.board.velocity.addScaledVector(forward, placement.speed);
    if (placement.phase === 'standing') {
      this.rider.phase = 'standing';
      this.board.attach(this.rider);
    }
  }
  ```

  Check in `reset` and `board.attach` that the rider's own velocity follows the board on attach (as the carve lab and `RideSession.test`'s standing case rely on). If it does not, set `this.rider.velocity.copy(this.board.velocity)` after attaching.

  - In `afterWater`, beside `retry`: `if (request.place) { this.rideResets += 1; this.session.place(request.place, this.water); this.gauge?.reset(); this.analyzer = new RideAnalyzer(); }`.
  - The press filter for later steps adds `place: undefined`.
  - `LocalSurfZone`: `pendingPlace` is kept until steps run.
  - `WorkerSurfZone.advance`: `this.input = { ...input, ..., place: input.place ?? this.input.place }`, cleared after `flush` sends it (as `popUp`/`retry` are).
- [ ] **Step 4: Run.** `npx vitest run src/physics/RideSession.test.ts src/wave/SurfZoneRunner.test.ts src/game`. Expected: PASS.
- [ ] **Step 5: Commit.** `feat(school): place the rider on the water, standing or prone`.

---

### Task 3: The lesson wave: format, loader and recording script

**Files:**
- Create: `src/game/school/lessonWave.ts` (types, config builder, asset loader)
- Create: `src/game/school/lessonWaves.ts` (generated data: one record per stage)
- Create: `scripts/lesson-wave.ts`; add `"lesson:wave"` to `package.json` (rolldown and node, as the report scripts)
- Create: `public/lessons/canyon-s2.sea`, `public/lessons/canyon-s1.sea` (script output)
- Create: `docs/research/lesson-wave.md` (script output: what it chose and the autopilot's checks)
- Test: `src/game/school/lessonWave.test.ts`

**Interfaces:**
- Produces:

  ```ts
  export type LessonStart = 'pocket' | 'caught' | 'waiting';
  export interface LessonWave {
    stage: 1 | 2;
    /** The sea it was recorded on: everything `SurfZoneConfig` needs, fixed here so later swell changes cannot break it. */
    config: { spot: 'canyon'; seed: number; significantHeight: number; peakPeriod: number; directionDegrees: number; spreading: number; bandwidth?: number; tide: number; windSpeed: number; componentCount: number };
    /** The recorded state, deflated, under `public/`. */
    asset: string;
    placements: Record<LessonStart, RiderPlacement>;
    /** Whether a reference wave backs it; false until the riding work's reference wave lands (dev note). */
    provisional: boolean;
    /** What the script's autopilot got from each placement (for the dev note and the report). */
    checks: Record<LessonStart, string>;
  }
  export function lessonConfig(wave: LessonWave): SurfZoneConfig; // stage, compute 'auto', spinUpPeriods: 0
  export function lessonWaveFor(stage: 1 | 2): LessonWave;          // from LESSON_WAVES
  export async function loadLessonSea(wave: LessonWave, fetcher?: typeof fetch): Promise<Uint8Array>; // decompressed encoded state
  ```

- [ ] **Step 1: Failing tests.**
  - `lessonConfig` carries the recorded swell, not `PRACTICE_SWELL`: build a wave with `significantHeight: 1.3` and expect the config to say 1.3, with `spinUpPeriods` 0 and `componentCount` from the record.
  - `lessonWaveFor(1).stage === 1` and `lessonWaveFor(2).stage === 2`.
  - `loadLessonSea` with a fake fetcher returning deflated bytes of a small encoded state decodes back to the same bytes.
  - Named `falls back when the wave will not load`: a fetcher resolving `{ ok: false, status: 404 }` makes it reject with a message naming the asset.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** `lessonWave.ts`. Its loader: `fetch(asset)`, then `arrayBuffer`, then `decompress(bytes, true)`, throwing on `!ok`. `lessonWaves.ts` starts with a placeholder record per stage so the module compiles, and the script overwrites it.
- [ ] **Step 4: The recording script** `scripts/lesson-wave.ts`. Per stage (2, then 1):
  1. **The sea.** `new SurfZoneRunner({ spot: 'canyon', seed, ...practice swell values from swellFor({ ...DEFAULT_PHYSICAL_SETTINGS, source: 'practice' }), tide: 0, windSpeed: 0, stage, compute: 'cpu', componentCount: 64 }, { rider: true })`. Seed 1 by default; `--seed` picks another.
  2. **Candidate moments.** Step the sea 180 s. Every 1 s, read `simulation.peelEstimate()`. A candidate moment is one where a peel starts: `angleDegrees ≥ 30`, `fit ≥ 0.3`, and the breaking began within the last 2 s near the focus (the first second the estimate appears after none). Keep each candidate's `exportState()`.
  3. **Placements, from a candidate's surface** (`runner.water.surfaceAt` and `sampleAt(...).breaking`):
     - **The crest line.** For x from focus.x − 40 to focus.x + 40 in 1 m steps, the crest z is the highest surface within focus.z ± 30.
     - **The breaking edge** `xe` is the first x along the peel's direction where breaking at the crest drops below 0.3.
     - **pocket:**
       - x = xe + direction · 3;
       - z = the face's middle: the first z shoreward of the crest where the surface is halfway between crest and the trough within 20 m;
       - heading = direction · 65° (along the crest, 25° down the face);
       - speed = the crest speed (`sqrt(9.81 · (still depth + crest height))` at the point) · 1.1;
       - phase standing.
     - **caught:** x = xe + direction · 6, z = the face's middle − 1, heading = direction · 25°, speed = the crest speed · 0.95, phase prone.
     - **waiting:** x = xe + direction · 14, z = the crest z + the crest speed · 3.5 (the crest reaches it about 3.5 s later), heading 0, speed 0, phase prone.
  4. **Check each candidate.** Build a second runner with the same config and `spinUpPeriods: 0`, `importState(candidate)`, place the rider, and run up to 25 s with the autopilot. Each start gets its own check:
     - **pocket:** `new Autopilot({ style: 'turns' })` from standing. The score is its ride time.
     - **caught:** press pop-up after 0.4 s. It passes if standing within 1.5 s; the score is the ride time after.
     - **waiting:** the autopilot in its `wait` state (it paddles when the crest rises behind). It passes if it stands.
  5. **Choose the candidate** with the best pocket ride that also passes caught and waiting. With none passing all three, take the best pocket ride and note the failures in `checks`.
  6. **Write outputs:**
     - `public/lessons/canyon-s{stage}.sea`: deflated `encodeSurfZoneState` of the chosen candidate;
     - `src/game/school/lessonWaves.ts`: the records, with `provisional: true` and a header comment "Generated by npm run lesson:wave — do not edit";
     - `docs/research/lesson-wave.md`: a table of candidates, with the moment, peel, and each check's result.
- [ ] **Step 5: Run it.** `npm run lesson:wave` (minutes on the CPU; run in the background and read its log). Read the report. If no candidate gives any pocket ride of 2 s or more, the recording is still written. Log a ruling, since the lessons then rely on the provisional note and the riding work. The script's results go into the PR text.
- [ ] **Step 6: Run the tests.** `npx vitest run src/game/school`. Expected: PASS. Then commit the script, the data, the assets and the report: `feat(school): record the lesson wave from the Canyon's practice sea`.

---

### Task 4: Lessons and their goals

**Files:**
- Create: `src/game/school/lessons.ts` (the nine definitions)
- Create: `src/game/school/lessonGoals.ts` (goal trackers)
- Test: `src/game/school/lessonGoals.test.ts`

**Interfaces:**
- Produces:

  ```ts
  /** One frame of an attempt, as the goals read it. */
  export interface LessonFrame {
    dt: number;                       // simulated seconds since the last frame
    phase: RiderPhaseName;            // RIDER_PHASES member
    speed: number;                    // over ground, m/s
    heading: number;                  // rad from +z toward +x
    input: { steer: number; trim: number; crouch: number; hand: boolean; paddle: boolean };
    wave: { valid: boolean; faceFraction: number; crestBreaking: number; aheadOfCrest: number };
    live?: { kind: ManeuverKind; start: number };   // the ride's latest manoeuvre
  }
  export interface GoalState { progress: number; passed: boolean; /** e.g. "1 of 2" */ count?: string }
  export interface LessonGoal { update(frame: LessonFrame): GoalState }
  export type LessonId = 'lean' | 'trim' | 'crouch' | 'bottomTurn' | 'topTurn' | 'hand' | 'pocket' | 'popUp' | 'catch';
  export interface Lesson {
    id: LessonId;
    start: LessonStart;
    view: RideView;
    /** The bindings the card and prompts name. */
    actions: readonly Action[];
    /** A new goal tracker for an attempt. */
    goal(): LessonGoal;
    /** The Surf hint this lesson teaches, retired when it is passed. */
    hint?: HintId;
  }
  export const LESSONS: readonly Lesson[];
  ```

  The goals follow the spec's table, with provisional numbers as named constants:
  - **lean:** two direction changes. The heading, measured from its value when standing began, swings ≥ 20° one way while that way's steer is held, then ≥ 20° the other way.
  - **trim:** speed rises ≥ 0.5 m/s while trim ≥ 0.5 is held for ≥ 1 s, then falls ≥ 0.5 m/s while trim ≤ −0.5 is held for ≥ 1 s.
  - **crouch:** three cycles of crouch ≥ 0.6 then ≤ 0.2 within 8 s, ending with speed ≥ the speed at the first cycle's start.
  - **bottomTurn:** a `live` manoeuvre of kind `bottom turn` starting after the attempt began.
  - **topTurn:** `top turn` or `snap`.
  - **hand:** the hand held ≥ 1 s while speed falls ≥ 1 m/s and `aheadOfCrest` falls ≥ 2 m (both from where the hand went in).
  - **pocket:** 5 s in all with `faceFraction ≥ 0.4` and `crestBreaking ≥ 0.3`, standing.
  - **popUp:** standing, and still standing 2 s later.
  - **catch:** the same as popUp (standing from a prone start, held 2 s).

- [ ] **Step 1: Failing tests.** For each goal, a scripted sequence of frames that passes it and one that nearly does. Examples:
  - **lean:** heading 0 → +0.4 rad with steer +1, then back to −0.1 with steer −1 passes. The same swing without steer held does not.
  - **pocket:** 4.9 s in the pocket does not pass; 5 s does. Frames out of the pocket in between do not reset the total.
  - **topTurn:** a live `snap` passes.
  - **popUp:** standing 1.9 s then fallen fails; 2 s standing passes.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement** the goal trackers as small classes, one per goal, and `LESSONS` with each lesson's start, view, actions and hint:
  - lean: pocket, behind, `[steerLeft, steerRight]`, hint lean;
  - trim: pocket, side, `[trimForward, trimBack]`, hint trim;
  - crouch: pocket, side, `[crouch]`, hint crouch;
  - bottomTurn: pocket, front, `[steerLeft, steerRight, crouch]`;
  - topTurn: pocket, front, `[steerLeft, steerRight, trimBack]`;
  - hand: pocket, behind, `[hand]`, hint hand;
  - pocket: pocket, behind, `[trimForward, trimBack, steerLeft, steerRight]`;
  - popUp: caught, front, `[popUp]`;
  - catch: waiting, front, `[paddle, popUp]`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `feat(school): the nine lessons and their goals`.

---

### Task 5: The attempt and the lesson flow

**Files:**
- Create: `src/game/school/lessonFlow.ts`
- Test: `src/game/school/lessonFlow.test.ts`

**Interfaces:**
- Produces:

  ```ts
  export type FlowState = 'card' | 'attempt' | 'passed' | 'missed';
  export type MissCause = StringKey;   // a ride.reason.* key, or 'school.miss.time' / 'school.miss.passed'
  export interface FlowFrame extends LessonFrame { separation?: RiderSeparation; reportEnd?: RideEnd; reportId?: number }
  export class LessonFlow {
    constructor(lesson: Lesson, options?: { freePractice?: boolean });
    state: FlowState;
    readonly misses: number;          // in a row
    readonly goal: GoalState;
    readonly cause?: MissCause;
    start(): void;                    // card → attempt (a fresh goal)
    frame(frame: FlowFrame): void;    // attempt: pass, or miss on a fall / a ride end / the time limit
    tick(seconds: number): 'restart' | 'card' | undefined;  // missed: after 2 s, 'restart' (or 'card' after 3 misses in a row)
    retry(): boolean;                 // R: restart now (attempt or missed only); false otherwise
    showCard(): void;
  }
  ```

  The rules:
  - An attempt misses on:
    - a fall (phase `fallen`), with cause `FALL_REASONS[separation]`;
    - a new worker report (`reportId` changed), with cause `WORKER_REASONS[reportEnd]` (re-use `RideTracker`'s maps: export them from `RideTracker.ts`);
    - or the time limit: 25 s for pocket starts, 12 s for caught, 15 s for waiting, with cause `school.miss.time`.
  - A pass wins over a miss on the same frame.
  - In Free Practice there is no goal. The ride ending (fall, report or time limit of 40 s) is a `missed` with its cause, and it restarts after 2 s without counting misses.
  - **The card after three misses:** in lessons, the third miss in a row makes `tick` return `'card'` instead of `'restart'`, and resets the count.

- [ ] **Step 1: Failing tests.**
  - pass;
  - a fall and its cause;
  - the time limit;
  - three misses → `'card'`;
  - named `R does nothing on a card`: `retry()` in `card` and `passed` returns false;
  - Free Practice restarts after 2 s and never shows the card.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.** Export `FALL_REASONS` and `WORKER_REASONS` from `RideTracker.ts` (additive: `export const`).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `feat(school): the lesson flow: card, attempt, pass, miss and restart`.

---

### Task 6: Progress

**Files:**
- Create: `src/game/school/schoolProgress.ts`
- Test: `src/game/school/schoolProgress.test.ts`

**Interfaces:**
- Produces:
  - `SCHOOL_KEY = 'breakline.school.v1'`;
  - `class SchoolProgress`, with `passed(id): boolean`, `pass(id): void`, `readonly started: boolean` (lesson 1 passed; the menu badge shows until then), and `readonly count: number`.
  - Storage failures fall back to memory, as `HintBook` does.

- [ ] **Step 1: Failing tests:** it remembers passes across instances; unknown ids in storage are dropped; broken storage keeps passes for the session; `started` flips when `lean` passes.
- [ ] **Step 2: Run.** Expected: FAIL. **Step 3: Implement.** **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `feat(school): remember which lessons are passed`.

---

### Task 7: The game side: lesson seas, restarts and placements

**Files:**
- Create: `src/game/school/SchoolSession.ts` (the game-side session: load, capture, restart; testable over a `LocalSurfZone`)
- Modify: `src/main.ts` (`SurfGame.school`: a `SchoolHost`; the lesson frame; slow motion)
- Modify: `src/ui/App.ts` (`GameHost.school`)
- Test: `src/game/school/SchoolSession.test.ts`

**Interfaces:**
- Produces, in `App.ts`:

  ```ts
  export interface SchoolHost {
    /** Build the lesson sea (loading its recorded state) with the rider placed for `start`; false when superseded, throws when the wave will not load. */
    enter(start: LessonStart, camera: RideView): Promise<boolean>;
    /** The same wave again: the recorded sea restored and the rider placed for `start`. */
    restart(start: LessonStart): void;
    setView(view: RideView): void;
    /** 0.5× or 1×. */
    setSlowMotion(on: boolean): void;
    readonly slowMotion: boolean;
    /** The attempt's frame for the goals, with the player's input; undefined without a rider. */
    frame(dt: number): FlowFrame | undefined;
    readonly provisional: boolean;
    leave(): void;
  }
  ```

- `SchoolSession` (pure-ish; takes a host factory and a fetcher):
  - `load(stage)`: fetch and decode the asset; build the host from `lessonConfig`, with the sea passed as the handover state (as online does: the `sea` option); keep the encoded bytes.
  - `restart(host, start)`: `host.restore(copy of the bytes)`, then the next advance carries `place: placements[start]`.
- [ ] **Step 1: Failing tests** (over `LocalSurfZone` and a tiny recorded state made in the test from a small Canyon config, so they run fast):
  - two restarts give the same surface after 60 steps;
  - the placement lands (phase standing, board near the point);
  - `falls back when the wave will not load` (the fetcher fails, then `load` rejects and nothing is built).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** `SchoolSession`, then wire `SurfGame.school`:
  - **`enter`:**
    - `leaveOnline()` and `leaveLab()`;
    - the stage is `graphics.stage`;
    - `startPhysical(wave.config.seed, …)` with `overrides: lessonConfig(wave)` fields (stage, compute `auto`, componentCount, spinUpPeriods 0, the recorded swell), `factory` passing the `sea`, `sun: TIMES.midday`, `rider: true`;
    - then `physicalMode.defaultView = camera` and place the rider for `start` (`physicalMode.place(placement)`, a small addition beside `retry` that puts `place` into the next advance).
  - **`restart`:** `physicalMode.host.restore(bytes.slice())` and `physicalMode.place(...)`.
  - **Slow motion:** a `schoolSlow` flag read by the `timeScale` getter (0.5 when on and the school is active).
  - **`frame(dt)`:** from `physicalMode.host.snapshot.status.ride` and `controls.lastRequest`. The heading comes from the rider snapshot, `wave` from `ride.wave`, `live` from `ride.live` (with its start), `reportId`/`reportEnd` from `ride.report`.
  - **`leave`:** slow motion off, school inactive.
  - **Any other scene start ends the school:** `startPhysical` resets it, as it does the lab.
- [ ] **Step 4: Run** the school tests and `npx tsc -b`. Expected: PASS.
- [ ] **Step 5: Commit.** `feat(school): lesson seas that restart on the same wave`.

---

### Task 8: Words and diagrams

**Files:**
- Modify: `src/ui/strings.ts` (the `school.*` and `lesson.*` keys)
- Create: `src/ui/lessonDiagrams.ts` (nine inline SVGs, drawn like `icons.ts`: 120×80, stroke `currentColor`)
- Test: `src/ui/strings.test.ts` (existing: no empty text) and a new `src/ui/lessonDiagrams.test.ts` (every lesson has a diagram; each is an `<svg` with a viewBox)

**Strings:**
- **School:** `menu.school` "Surf School", `menu.startHere` "Start here", `school.title`, `school.lessons`, `school.freePractice`, `school.freePractice.blurb`, `school.start.pocket` "Standing in the pocket", `school.start.waiting` "Prone, ready to catch", `school.go` "Start", `school.next` "Next lesson", `school.again` "Again", `school.list` "Lessons", `school.passed` "Nice — passed", `school.restart` "Restart", `school.explain` "Show explanation", `school.slowMotion` "Slow motion: {state}", `school.on`/`school.off`, `school.howTo` "How to…", `school.miss.time` "Time's up", `school.missed` "{cause} — {tip}", `school.retryIn` "Again in a moment · {retry} now", `school.loadError` "The lesson wave didn't load. Check the connection and try again.", `school.progress` "{done} of 9 passed", `loading.school` "Waxing the board…".
- **Each lesson** (`lesson.<id>.title`, `.blurb`, `.explain`, `.tip`, `.prompt`) in plain surf-coaching language, naming keys through `{keys}`. For example:
  - lean:
    - explain "Surfers turn by leaning the board onto a rail. Lean toward the wave to climb it, away from it to drop down. Keep the lean gentle and hold it: the board carves round.";
    - prompt "Lean with {keys} — one way, then the other";
    - tip "Hold the lean a little longer; the board needs a moment to bite."
  - The other eight are written in the same voice, from the research notes (`docs/research/surf-gameplay-research.md`) and the controls: trim with W/S, crouch with Shift, the hand with E.

- [ ] **Step 1: Failing test** (`lessonDiagrams.test.ts`: `LESSONS.every((l) => LESSON_DIAGRAMS[l.id].startsWith('<svg'))`). **Step 2: Run.** Expected: FAIL. **Step 3:** Write the strings and diagrams. **Step 4: Run** `npx vitest run src/ui`. Expected: PASS. **Step 5: Commit.** `feat(school): the lessons' words and diagrams`.

---

### Task 9: The school's screens and the App flow

**Files:**
- Create: `src/ui/SchoolScreen.ts` (the list and Free Practice), `src/ui/LessonCard.ts` (explanation, pass card), `src/ui/schoolModel.ts` (+ test: pure view models)
- Modify: `src/ui/MainMenu.ts` (+ test) (the `school` tile after Surf, a badge until started), `src/ui/icons.ts` (`school`), `src/ui/ScreenStack.ts` (`school`, `lesson`), `src/ui/PauseMenu.ts` (`createLessonPauseMenu`), `src/ui/App.ts`, `src/ui/ui.css`

**Interfaces:**
- `schoolModel.ts`:
  - `schoolListModel(progress, lessons)` gives rows with title, blurb, number and a passed flag, plus the progress line;
  - `lessonCardModel(lesson, keys)` gives the title, explanation and key glyphs for the device;
  - `lessonHudLine(lesson, flow, keys)` gives the prompt during an attempt, the goal count, and the miss line with the tip.
- `ScreenId` gains `'school'` (a panel over the menu) and `'lesson'` (a scene).

- [ ] **Step 1: Failing tests** for the models:
  - The list marks passes.
  - The card names the player's keys (keyboard `W`/`S` for trim; the stick on a pad).
  - The HUD line during a lean attempt reads `Lean with ← → — one way, then the other · 1 of 2`.
  - The miss line joins cause and tip.
  - `menuTiles(started)` shows the badge only when not started.
- [ ] **Step 2: Run.** Expected: FAIL. **Step 3: Implement** the models, then the DOM and App wiring:
  - **The menu:** the `school` tile opens `school` (the list). Choosing a lesson (or Free Practice with its start) shows the loading card `loading.school`, then `game.school.enter(start, lesson.view)`. On success: stack `lesson`, the flow in `card`, and `game.setPaused(true)` while the card shows. A failed load shows `school.loadError` on the School screen.
  - **The card:** Start runs `flow.start()`, unpauses, and focuses the canvas.
  - **The lesson scene:**
    - the ride HUD, with the balance meter always on and the coach line from `lessonHudLine`;
    - the dev note "Provisional wave" when `school.provisional` and `DEV_TOOLS`;
    - `App.frame` feeds `flow.frame(game.school.frame(dt))` during `attempt` and calls `flow.tick(dt)` in `missed`: `'restart'` → `game.school.restart(lesson.start)` + `flow.start()`; `'card'` → show the card again (paused).
  - **Passing:** the pass card (Next lesson / Again / Lessons). `progress.pass(id)`; the lesson's hint retires (`HintBook.succeeded`); the game pauses behind the card.
  - **R during an attempt or a miss:** `flow.retry()` → restart now. `Controls`' retry handler calls `app.lessonRetry()` when the stack's base is `lesson`, instead of the Surf retry.
  - **Pause menu** (base `lesson`): Resume, Restart, Show explanation, `school.slowMotion` (toggle), Camera, Settings, sound, Lessons (back to the list), Quit to menu. Free Practice also gets How to…, which lists the lessons and opens a card read-only.
  - **Surf hints:** the Surf hint coach is not updated in the school, and nothing reaches the Logbook: the school never calls `trackRide`.
  - **Leaving** (Quit, Lessons, or any Surf start) calls `game.school.leave()`.
- [ ] **Step 4: Run** `npx vitest run src/ui src/game/school` and `npx tsc -b`. Expected: PASS.
- [ ] **Step 5: Browser check** (the dev server as in L1: a terminal tab, then `preview_start` by URL). Screenshot each:
  - the menu badge;
  - the list;
  - each lesson's card and start (the right view, the rider standing or prone where placed);
  - a pass, with a scripted input where possible (e.g. hold ← then → for lean);
  - a miss and its automatic restart on the same wave, with the breaking in the same place (the GPU same-wave check: compare the breaking share and the peel reading at the same moment after two restarts);
  - three misses, then the card;
  - R;
  - the pause menu with slow motion;
  - Free Practice, both starts;
  - Quit, then a Surf ride with no school leftovers.
- [ ] **Step 6: Commit.** `feat(school): the Surf School's screens and flow`.

---

### Task 10: Docs, verification, PR

- [ ] ROADMAP: the L2 entry under "Wave Lab and Surf School", with what shipped, the provisional wave and what reopens when the reference wave lands. CONTEXT.md: **Surf School**, **Lesson wave**, **Placement**, **Free Practice**.
- [ ] Spec: amend *The lesson wave* with the recorded-state ruling (below).
- [ ] Full suite, `tsc -b` and build, fresh. Then the final review (self-review; no subagents unless asked), push, a PR against main, a merge commit, and bind the PR.

## Rulings made while planning

- **The recorded state is shipped instead of re-warmed.** The spec's *Same wave every time* has each entry warm-start a fresh sea "timed so the spun-up sea sits at the moment". A warm start does not reproduce a long-running sea's waves (N1's drift report: fresh seas broke 0.7–2 s and 4–17 m off). Finding a start time whose own spin-up happens to peel well would need a costly search, and would re-run the spin-up (seconds) on every entry. Shipping the recorded state (`spinUpPeriods: 0` plus the handover import, exactly as online joins work) gives the exact wave and a faster start. Cost if wrong: about 1–2 MB of assets per stage.
