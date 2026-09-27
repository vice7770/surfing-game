# Riding the Wave (Part A: staying on it) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A rider on the reference wave stays on it like a surfer: rides last 10 s or more when ridden well, every ride end is a fall, a kick-out or the wave dying, broken water carries a board, and an optional pocket reflex keeps a rider near the curl.

**Architecture:** Measure first: the wave-frame gauge learns where the curl is, the ride analyzer's ends become honest, and the ride report reads the spec's done criteria. Then change the physics where the evidence points: the surface roller in broken water (the sampler only, not the solver), the practice swell sized to 1–1.5 m faces, and a weight-only pocket reflex applied to the rider's input. Validation on the reference wave closes the plan; what it finds is fixed under systematic debugging, a test per fix.

**Tech Stack:** TypeScript, three.js math, Vitest, the rolldown-built report scripts (`npm run report:ride`, `report:catch`, `report:carve`).

**Spec:** `docs/superpowers/specs/2026-09-27-riding-the-wave.md` (decisions 3, 4, 5 and the done criteria). Decisions 6 (animation) and 7 (regular/goofy) are Part B, planned when this lands: the poses are drawn from this physics, and the stance needs the rig's mirroring beside it. Decision 2 (the fall fixes) shipped as its own PR.

## Global Constraints

- Physical inputs, not scripted moves: no speed bonuses and no forces added to make a manoeuvre happen (gameplay milestone spec, principle 1). The roller changes what the bodies sample, not the solver; the reflex only sets the rider's weight input.
- Postures stay the player's: nothing changes crouch, steer or the hand automatically. The pocket reflex sets trim only, and only while no W/S is held.
- The pocket reflex setting: `'practice' | 'always' | 'never'`, default `'practice'`, like the balance meter.
- A check that fails is investigated, never tuned into passing (principle 3). Study numbers cited in doc comments are marked provisional.
- Performance is measured and recorded, never a gate.
- English only; player-facing strings live in `src/ui/strings.ts`.
- Tests run with `npx vitest run <path>`; the whole suite with `npx vitest run` (about 1,000 tests). Report output goes to the scratchpad or `docs/research/`, never the repo root.

## The evidence this plan argues from

Traced ride by ride on the Canyon's practice swell (one seed, 11 stands, before the fall fixes; `docs/superpowers/plans/2026-09-26-turn-redesign.md` Findings, "After the playtest"):
- every ride ended in a fall within 0.9–6.5 s, most in the first bottom turn;
- the rider pops up heading straight down a **2.2–2.8 m** face (the spec wants 1–1.5 m), reaches **11–12 m/s** against a crest moving at 6–8 m/s, runs 8–11 m ahead of it onto the trough, and the bottom turn there fails: the crouched lean-in (fixed in the fall-fixes PR) and, at 12 m/s, the rail releasing (the rail snaps from 30° to 2° in 0.1 s, the board yaws the other way at 2 rad/s and the body falls in);
- in broken water the board sits at 2.4 m/s while the depth-averaged flow under it moves at about 2 m/s and the wave at 6.8 m/s: broken water does not carry a board;
- 147 of 171 attempts missed the wave (catching, P10; not this plan's);
- `lost the face` ends a ride silently when the rider is slow or ahead of a low face, and `inside` ends a ride after 2 s in a bore, which is exactly riding the whitewater.

## Review Focus

1. A rider riding the whitewater in toward the beach must not have the ride ended until the water is shallow or the bore dies: Task 2's test pins "a bore keeps the ride going".
2. A rider far ahead of the crest but slower than it (the wave is coming back to it) must not be labelled "lost the wave": Task 2's test pins it.
3. The pocket reflex must never override a held W/S, nor act lying down, landing or after a fall: Task 5's tests pin all four.
4. A wave with no breaking anywhere near (curl not found) must give the reflex nothing to do and the report an undefined curl share, never a divide by zero or NaN in the tables: Tasks 1 and 3 pin it.
5. The roller must not push anything where nothing breaks, nor under a bore's surface layer (a body held down stays held down; hold-downs are P11): Task 4's tests pin both.

---

### Task 1: The curl gauge

The spec's done criterion "at least half of each ride within about 8 m of the curl" and the pocket reflex both need to know where the curl is. The gauge already finds the crest in front of the rider and reads breaking within ±4 m along it; it now looks further along the crest for the nearest breaking water.

**Files:**
- Modify: `src/physics/waveFrame.ts` (the `WaveFrame` interface, `createWaveFrame`, `WaveFrameGauge.update`)
- Test: `src/physics/waveFrame.test.ts`

**Interfaces:**
- Produces: `WaveFrame.curlDistance: number`: metres along the crest from the rider's crest point to the nearest crest point breaking at least `CURL_BREAKING` (0.3), searched `CURL_REACH` (40 m) either side every 0.5 m; `0` when the crest at the rider breaks; `Infinity` when none is found or the frame is invalid.

- [ ] **Step 1: Write the failing test**

Add inside `describe('wave frame', …)` in `src/physics/waveFrame.test.ts` (it uses the file's `period`, `depth`, `c` and `still`; add `import type { SurfWater } from './SurfWater';` at the top):

```ts
  // The spec's done criteria and the pocket reflex (riding-the-wave plan, Task 1): how far along the crest the curl is.
  it('finds the curl along the crest, or none', () => {
    const swell = new SwellWater({ height: 1, period, depth });
    for (let s = 0; s < 60; s += 1) swell.advance(1 / 60);
    // Breaking where x < edge: the broken part of the crest lies toward −x.
    const curlAt = (edge: number): SurfWater => ({
      surfaceAt: (x, z) => swell.surfaceAt(x, z),
      sampleAt: (x, y, z, out) => {
        swell.sampleAt(x, y, z, out);
        out.breaking = x < edge ? 1 : 0;
        return out;
      },
      addReaction() {},
    });
    const at = { x: 0, y: 0, z: c + 5 };
    const read = (edge: number) => new WaveFrameGauge().update(curlAt(edge), at, still, 1 / 60, 90);
    expect(read(-6).valid).toBe(true);
    expect(read(-6).curlDistance).toBeGreaterThan(5.5);
    expect(read(-6).curlDistance).toBeLessThan(7);
    expect(read(1).curlDistance).toBe(0);
    expect(read(-100).curlDistance).toBe(Infinity);
    const flat = new SwellWater({ height: 0, period, depth });
    expect(new WaveFrameGauge().update(flat, still, still, 1 / 60, 90).curlDistance).toBe(Infinity);
  });
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/physics/waveFrame.test.ts -t "finds the curl"`
Expected: FAIL, `expected undefined to be greater than 5.5` (TypeScript does not stop Vitest).

- [ ] **Step 3: Implement**

In `src/physics/waveFrame.ts`:

1. Add to `WaveFrame`, after `crestBreaking`:
```ts
  /**
   * Metres along the crest from the rider's crest point to the curl: the nearest crest point breaking at least
   * CURL_BREAKING, looked for CURL_REACH either side. 0 when the crest at the rider breaks, Infinity when none does.
   */
  curlDistance: number;
```
2. After `const CREST_OFFSETS = [0, -2, 2, -4, 4];` add:
```ts
/** The curl: crest water breaking at least this strongly, looked for this far along the crest either side, every step, m. */
const CURL_BREAKING = 0.3;
const CURL_REACH = 40;
const CURL_STEP = 0.5;
```
3. In `createWaveFrame`, add `curlDistance: Infinity` after `crestBreaking: 0`.
4. In `update`, in the `if (!frame.valid)` branch add `frame.curlDistance = Infinity;` beside `frame.crestBreaking = 0;`.
5. At the end of `update`, after `frame.crestBreaking = breaking;` and before `return frame;`:
```ts
    frame.curlDistance = Infinity;
    for (let s = 0; s <= CURL_REACH; s += CURL_STEP) {
      if (this.breaksAt(water, crestX + dz * s, crestHeight, crestZ - dx * s)
        || (s > 0 && this.breaksAt(water, crestX - dz * s, crestHeight, crestZ + dx * s))) {
        frame.curlDistance = s;
        break;
      }
    }
```
6. Add the private helper after `update`:
```ts
  /** Whether the crest water at (x, z) breaks as a curl does. */
  private breaksAt(water: SurfWater, x: number, y: number, z: number): boolean {
    const sample = water.sampleAt(x, y, z, this.sample);
    return sample.wet && !sample.outsideDomain && sample.breaking >= CURL_BREAKING;
  }
```

- [ ] **Step 4: Run the gauge's tests and every file that builds a `WaveFrame` literal**

Run: `npx vitest run src/physics/waveFrame.test.ts`
Expected: PASS.
Run: `npx tsc --noEmit -p . 2>&1 | grep -n "curlDistance"`
Expected: each `WaveFrame` literal missing `curlDistance` is listed (for example `src/game/rideAnalysis.test.ts`'s `FRAME`, `src/dev/Autopilot.test.ts`, `src/game/RideTracker.test.ts`). Add `curlDistance: Infinity` to each literal, then rerun until the grep prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/physics/waveFrame.ts src/physics/waveFrame.test.ts $(git diff --name-only -- src)
git commit -m "feat: the wave-frame gauge finds the curl along the crest"
```

---

### Task 2: Honest ride ends

Spec decision 3: a ride ends by a fall, a kick-out over the back, or the wave dying, never by the board silently losing the wave. Riding the whitewater in is riding.

**Files:**
- Modify: `src/game/rideAnalysis.ts` (`RideEnd`, `RideReport`, the end rules in `RideAnalyzer.push`, `finish`)
- Modify: `src/game/RideTracker.ts:50-54` (`WORKER_REASONS`)
- Modify: `src/ui/strings.ts:246-248`
- Test: `src/game/rideAnalysis.test.ts`, `src/game/RideTracker.test.ts`

**Interfaces:**
- Consumes: `WaveFrame.curlDistance` (Task 1).
- Produces: `type RideEnd = 'fell' | 'kicked out' | 'wave died' | 'lost the wave'`; `RideReport.curlTime: number` (s within `CURL_NEAR` = 8 m of the curl); string keys `ride.reason.waveDied`, `ride.reason.lostWave`.

The rules:
- **fell**: unchanged.
- **kicked out**: unchanged (more than 1 m behind the crest for 0.5 s).
- **wave died**: the water under the rider is shallower than 0.5 m (the shore), or for 1.5 s there is no live face (no valid frame, or a face under 0.2 m) and no breaking water under the rider (under 0.5).
- **lost the wave**: for 1.5 s the rider is more than 8 m ahead of a live face's crest and moving shoreward faster than the crest (leaving it, not waiting for it).

- [ ] **Step 1: Write the failing tests**

In `src/game/rideAnalysis.test.ts`, replace the two tests `'inside: in a bore for two seconds, or in the shallows'` and `'lost the face: too slow, or no wave, for 1.5 s'` with:

```ts
    // The riding-the-wave spec: riding the whitewater in is riding; a ride ends when the wave dies under the rider.
    it('keeps riding in a bore; the wave dies in the shallows, or with no face and no broken water for 1.5 s', () => {
      expect(ending(3, { breakingHere: 0.8, wave: { faceHeight: 0.1 } }).riding).toBe(true);
      expect(ending(0.1, { depth: 0.3 }).report()?.end).toBe('wave died');
      expect(ending(1.4, { wave: { valid: false } }).riding).toBe(true);
      expect(ending(1.6, { wave: { valid: false } }).report()?.end).toBe('wave died');
      expect(ending(1.6, { wave: { faceHeight: 0.1 } }).report()?.end).toBe('wave died');
    });

    it('loses the wave only when leaving a live face far ahead of its crest', () => {
      const leaving = { wave: { aheadOfCrest: 12, speedShoreward: 9, crestSpeed: 6 } };
      expect(ending(1.4, leaving).riding).toBe(true);
      expect(ending(1.6, leaving).report()?.end).toBe('lost the wave');
      // Far ahead but slower than the crest: the wave is coming back to the rider.
      expect(ending(3, { wave: { aheadOfCrest: 12, speedShoreward: 4, crestSpeed: 6 } }).riding).toBe(true);
      // A slow rider on a live face is not lost: the crest passes and kicks it out, or the broken water carries it.
      expect(ending(3, { speed: 1 }).riding).toBe(true);
    });

    it('times the ride near the curl', () => {
      const near = analyze(trace(4, (t) => ({ wave: { curlDistance: t < 3 ? 5 : 20 } })));
      expect(near.curlTime).toBeCloseTo(3, 1);
      expect(analyze(trace(2, () => ({ wave: { curlDistance: Infinity } }))).curlTime).toBe(0);
    });
```

In `src/game/RideTracker.test.ts`, in `describe('with the worker’s report')`: the `report` builder gains `curlTime: 0` after `pocketTime: 0.5`; in `'names the worker’s other ends, and takes a fall both see as one ride'` the pairs become
```ts
      for (const [end, reason] of [['wave died', 'ride.reason.waveDied'], ['lost the wave', 'ride.reason.lostWave']] as const) {
```
and in `'ignores a report from an earlier ride'` `report(4, 'inside')` becomes `report(4, 'wave died')`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/game/rideAnalysis.test.ts src/game/RideTracker.test.ts`
Expected: FAIL: `'inside'` / `'lost the face'` where `'wave died'` / `'lost the wave'` are expected, `curlTime` undefined, the tracker's reason undefined.

- [ ] **Step 3: Implement**

In `src/game/rideAnalysis.ts`:

1. `export type RideEnd = 'fell' | 'kicked out' | 'wave died' | 'lost the wave';`
2. In `RideReport`, after `pocketTime`:
```ts
  /** Time within CURL_NEAR of the curl along the crest, s (the riding-the-wave spec's done criteria). */
  curlTime: number;
```
3. Replace the constants block from `/** Inside: …` through `const LOST_TIME = 1.5;` with:
```ts
/** The wave died: water shallower than this under the rider, m (the shore), or for DIED_TIME, s, no face of LOST_FACE, m, and no broken water of BORE. */
const SHALLOW = 0.5;
const BORE = 0.5;
const LOST_FACE = 0.2;
const DIED_TIME = 1.5;
/** Lost the wave: this far ahead of a live face's crest, m, moving shoreward faster than it, for LOST_TIME, s. */
const LOST_AHEAD = 8;
const LOST_TIME = 1.5;
/** Near the curl: within this distance along the crest, m. */
const CURL_NEAR = 8;
```
4. Rename the analyzer's `bore` and `lost` holds: keep `private readonly lost = new Hold();`, replace `private readonly bore = new Hold();` (find it beside `kickOut`) with `private readonly died = new Hold();`, and add a field `private curlTime = 0;` beside `pocketTime`, reset wherever `pocketTime` is reset.
5. Replace the end rules at the bottom of `push` (from `const behind = …` to the last `else if`) with:
```ts
    if (wave.valid && wave.curlDistance <= CURL_NEAR) this.curlTime += dt;
    const behind = sample.phase === 'standing' && wave.valid && wave.aheadOfCrest < -KICK_OUT_BEHIND;
    const live = wave.valid && wave.faceHeight >= LOST_FACE;
    const dead = !live && sample.breakingHere < BORE;
    const leaving = live && wave.aheadOfCrest > LOST_AHEAD && wave.speedShoreward > wave.crestSpeed;
    if (this.kickOut.run(behind, dt, before) >= KICK_OUT_TIME) this.finish('kicked out', this.kickOut.since);
    else if (sample.depth < SHALLOW) this.finish('wave died', { t: sample.t, distance: this.distance, pocketTime: this.pocketTime });
    else if (this.died.run(dead, dt, before) >= DIED_TIME) this.finish('wave died', this.died.since);
    else if (this.lost.run(leaving, dt, before) >= LOST_TIME) this.finish('lost the wave', this.lost.since);
```
6. In `finish`, include `curlTime: this.curlTime` in the report it builds (beside `pocketTime`). The `Mark` passed in only trims distance and pocket time; the curl time is the total so far.

In `src/game/RideTracker.ts`:
```ts
const WORKER_REASONS: Record<Exclude<RideEnd, 'fell'>, StringKey> = {
  'kicked out': 'ride.reason.kickedOut',
  'wave died': 'ride.reason.waveDied',
  'lost the wave': 'ride.reason.lostWave',
};
```

In `src/ui/strings.ts`, keep `'ride.reason.lostFace'` and `'ride.reason.inside'` (older Logbook entries name them) and add after `'ride.reason.kickedOut': 'Kicked out',`:
```ts
  'ride.reason.waveDied': 'The wave died out',
  'ride.reason.lostWave': 'Lost the wave',
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/game src/ui`
Expected: PASS. Any other test that expected `'inside'` or `'lost the face'` from the analyzer is updated to the new end it now describes (a bore is still riding; a slow rider is not lost), with the reason in its comment.

- [ ] **Step 5: Commit**

```bash
git add src/game/rideAnalysis.ts src/game/rideAnalysis.test.ts src/game/RideTracker.ts src/game/RideTracker.test.ts src/ui/strings.ts
git commit -m "feat: end rides honestly: a fall, a kick-out, or the wave dying"
```

---

### Task 3: The ride report reads the done criteria

**Files:**
- Modify: `src/dev/Autopilot.ts` (an option to leave ending the ride to the analyzer)
- Modify: `scripts/ride-report.ts`
- Test: `src/dev/Autopilot.test.ts`

**Interfaces:**
- Consumes: `RideReport.curlTime`, `RideEnd` (Task 2); `WaveFrame.curlDistance` (Task 1).
- Produces: `AutopilotOptions.stall?: boolean` (default `true`; `false` leaves the ride's end to the caller) and `Autopilot.finish(outcome: string): void`; ride-report flags `--height <m>` (the practice swell's significant height) used by Task 5; a summary with the done criteria.

- [ ] **Step 1: Write the failing test**

In `src/dev/Autopilot.test.ts`, after `'ends the attempt on a fall or when the wave leaves, and starts over on reset'` (it uses the file's `riding`, `view` and `ride` helpers; the `wave` literal at the top gains `curlDistance: Infinity` in Task 1):

```ts
  // The ride report (riding-the-wave Task 3): a crawling board is not the end; the ride analyzer says when it is.
  it('can leave the ride\'s end to its caller', () => {
    const pilot = riding(0, { stall: false });
    for (let i = 0; i < 180; i += 1) pilot.next(view({ ride: ride({ phase: 'standing', speed: 0.5 }) }), 1 / 60);
    expect(pilot.state).toBe('ride');
    pilot.finish('wave died');
    expect(pilot.state).toBe('done');
    expect(pilot.outcome).toBe('wave died');
  });
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/dev/Autopilot.test.ts`
Expected: FAIL: state `'done'` (the stall ended it) or `pilot.finish is not a function`.

- [ ] **Step 3: Implement the autopilot option**

In `src/dev/Autopilot.ts`:
- `AutopilotOptions`: add
```ts
  /** Standing, end the ride when the board crawls (STALL for STALL_TIME); false leaves the end to the caller's ride analyzer. */
  stall?: boolean;
```
- a field `private readonly stall: boolean;`, set in the constructor `this.stall = options.stall ?? true;`
- in `case 'ride'`: `if (this.stall && this.stalled > STALL_TIME) {`
- a public method beside `reset`:
```ts
  /** End the ride from outside (the ride analyzer's end). */
  finish(outcome: string): void {
    if (this.state === 'ride') this.end(outcome);
  }
```

- [ ] **Step 4: Run it**

Run: `npx vitest run src/dev/Autopilot.test.ts`
Expected: PASS.

- [ ] **Step 5: The report**

In `scripts/ride-report.ts`:
1. Options, after `const practice = flag('practice');`:
```ts
/** The practice swell's significant height, m, instead of PRACTICE_SWELL's (the reference-wave sweep, riding-the-wave Task 5). */
const heightOverride = option('height');
```
and after `const swell = swellFor(settings);` make it `const swell = { ...swellFor(settings), ...(heightOverride ? { significantHeight: Number(heightOverride) } : {}) };`.
2. `new Autopilot({ rise: RISE, style, stall: false })`.
3. In the loop, where `const closed = b.analyzer.report();` is read: after `b.analysis = closed;` add `b.autopilot.finish(closed.end);` (the analyzer's end is the ride's end). Also keep, per spot, every closed ride: add `durations: number[]` and `curlShares: number[]` to `runSpot`'s return, pushing `closed.duration` and `closed.duration > 0 ? closed.curlTime / closed.duration : NaN` when a ride closes with the autopilot in `'ride'` or `'done'`; and `lostWave` counting `closed.end === 'lost the wave'`.
4. `Ride` gains `faceHeight: number` and `peel: number`: the trace records `wave.faceHeight` and the current `peelAngle`; the ride's values are their means over finite samples.
5. The summary table becomes:
```
| Spot | Attempts | Stands | Rides ≥ 3 s | Median ride s | Best ride s | Lost the wave | Mean speed m/s | Top m/s | Near the curl | Face height m | Peel ° | Crest c m/s | Face fraction | Ahead of crest m |
```
with median and best over `durations` (every stand the analyzer closed), "Near the curl" the mean of the finite `curlShares` as a percentage (— when none), and the rest from the rides of 3 s or more as now.
6. Under the table, print the spec's done criteria beside the numbers: `Done when (the riding-the-wave spec): median ≥ 10 s; best 15–20 s; lost the wave 0; mean speed 6–9 m/s; near the curl ≥ 50 %; bottom turns in Forsyth's ranges (the turn table).`

- [ ] **Step 6: Run the report briefly**

Run: `npm run report:ride -- --practice --ghosts --style turns --seeds 1 --minutes 1 --spots canyon --out /tmp/ride-smoke.md && head -30 /tmp/ride-smoke.md`
Expected: the new columns print, with `—` where there are no rides; no `NaN`.

- [ ] **Step 7: Commit**

```bash
git add src/dev/Autopilot.ts src/dev/Autopilot.test.ts scripts/ride-report.ts
git commit -m "feat: the ride report reads the riding-the-wave done criteria"
```

---

### Task 4: Broken water carries a board (the surface roller)

The spec's decision 4: going straight down does not end the ride, because the broken water keeps pushing. P11's surface roller (Svendsen 1984: the aerated roller rides a bore's front at about the bore's speed) is brought forward, only its push, and only in what the bodies sample. In a bore the sampler gives the depth-averaged flow, about c·H/(d+H) behind a bore of height H, a third of c for a 0.5 m bore in 1.5 m: the traces show a board at 2.4 m/s in water at about 2 m/s while the wave moves at 6.8 m/s.

**Files:**
- Modify: `src/physics/PhysicalSurfWater.ts` (the bore branch of `sampleAt`)
- Test: `src/physics/PhysicalSurfWater.test.ts`

**Interfaces:**
- Produces: in a bore (`breaking > 0.3`), within the roller's thickness `ROLLER_SHARE` × the set-up above still water under the surface, the horizontal flow is carried toward `breaking × √(g × depth)` along the current's direction, fading linearly to the depth-averaged flow at the roller's bottom.

- [ ] **Step 1: Write the failing tests**

In `src/physics/PhysicalSurfWater.test.ts`, after `'keeps the depth-averaged current in bores and very shallow water, and none on dry land'`:

```ts
  // The riding-the-wave spec (Task 4): Svendsen's surface roller rides a bore's front at about the bore's speed,
  // so broken water carries a board; below the roller the flow stays the depth-averaged current.
  it('carries the surface of a bore at about its speed, and nothing below the roller', () => {
    const { water, breaking, solver } = channel();
    // A 0.6 m bore over 3 m of still water, moving 1 m/s depth-averaged, breaking fully.
    for (let i = 0; i < solver.h.length; i += 1) {
      solver.h[i] = 3.6;
      solver.qx[i] = 3.6;
    }
    breaking.fill(1);
    const out = createWaterSample();
    const surface = water.sampleAt(0.2, 5, 0.3, out).surfaceY;
    water.sampleAt(0.2, surface, 0.3, out);
    expect(out.regime).toBe('bore');
    expect(out.flowX).toBeCloseTo(Math.sqrt(9.81 * 3.6), 1);
    expect(out.flowZ).toBeCloseTo(0, 9);
    expect(water.sampleAt(0.2, surface - 1, 0.3, out).flowX).toBeCloseTo(1, 9);
    breaking.fill(0.5);
    expect(water.sampleAt(0.2, surface, 0.3, out).flowX).toBeCloseTo(0.5 * Math.sqrt(9.81 * 3.6), 1);
  });

  it('pushes nothing where nothing breaks, however high the water stands', () => {
    const { water, solver } = channel();
    for (let i = 0; i < solver.h.length; i += 1) {
      solver.h[i] = 3.6;
      solver.qx[i] = 3.6;
    }
    const out = createWaterSample();
    const surface = water.sampleAt(0.2, 5, 0.3, out).surfaceY;
    water.sampleAt(0.2, surface, 0.3, out);
    expect(out.regime).not.toBe('bore');
    expect(out.flowX).toBeLessThan(2);
  });
```

And a board carried by it, in `src/physics/BoardBody.test.ts` (import `ShallowWaterSolver, uniformEdges` from `'../wave/ShallowWaterSolver'` and `PhysicalSurfWater` from `'./PhysicalSurfWater'` if not there):

```ts
  // The riding-the-wave spec: a board in broken water is carried toward the bore's speed.
  it('is carried by a bore\'s roller', () => {
    const solver = new ShallowWaterSolver({ nx: 60, xMin: -30, dx: 1, zEdges: uniformEdges(-30, 30, 60), xBoundary: 'open' }, () => 3);
    for (let i = 0; i < solver.h.length; i += 1) {
      solver.h[i] = 3.6;
      solver.qz[i] = 3.6;
    }
    const breaking = new Float64Array(solver.h.length).fill(1);
    const water = new PhysicalSurfWater(solver, { peakPeriod: 10, breaking });
    const board = new BoardBody();
    board.place(new Vector3(0, water.surfaceAt(0, 0) + board.shape.centerOfMass.y, 0));
    for (let s = 0; s < 120; s += 1) board.step(1 / 60, water);
    expect(board.velocity.z).toBeGreaterThan(3);
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/physics/PhysicalSurfWater.test.ts src/physics/BoardBody.test.ts -t "roller|bore"`
Expected: FAIL: the surface flow is 1, not about 5.9; the board is slower than 3 m/s.

- [ ] **Step 3: Implement**

In `src/physics/PhysicalSurfWater.ts`, after `const MAX_PROFILE = 2;`:
```ts
/**
 * The surface roller (Svendsen 1984; the gameplay spec's P11, only its push brought
 * forward): in a bore the aerated roller on the front moves at about the bore's
 * speed, √(g d). Within ROLLER_SHARE of the set-up under the surface the flow is
 * carried toward breaking × √(g d) along the current, fading linearly to the
 * depth-averaged current at the roller's bottom; slower than MIN_ROLLER_FLOW, m/s,
 * the current gives no direction. Provisional.
 */
const ROLLER_SHARE = 0.5;
const MIN_ROLLER_FLOW = 0.05;
const GRAVITY = 9.81;
```
In `sampleAt`, replace
```ts
    if (out.breaking > BORE) {
      out.regime = 'bore';
    } else if
```
with
```ts
    if (out.breaking > BORE) {
      out.regime = 'bore';
      const current = Math.hypot(u, w);
      const thickness = ROLLER_SHARE * Math.max(0, out.surfaceY - solver.restLevel);
      if (current > MIN_ROLLER_FLOW && thickness > 0) {
        const share = Math.max(0, 1 - Math.max(0, out.surfaceY - y) / thickness);
        const carried = out.breaking * Math.sqrt(GRAVITY * depth);
        horizontal = 1 + Math.max(0, carried / current - 1) * share;
      }
    } else if
```
(`solver.restLevel` is the still-water level used for `stillDepth` above; `depth` is the column's depth.)

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/physics`
Expected: PASS, including the older `'keeps the depth-averaged current in bores…'` (no set-up there, so no roller).

- [ ] **Step 5: Commit**

```bash
git add src/physics/PhysicalSurfWater.ts src/physics/PhysicalSurfWater.test.ts src/physics/BoardBody.test.ts
git commit -m "feat: broken water carries a board: the surface roller's push"
```

---

### Task 5: The pocket reflex

Spec decision 5: with no forward or back weight held, the rider shifts its own weight to stay a few metres ahead of the curl. Steering stays the player's. A setting, on by default in Practice.

**Files:**
- Create: `src/game/pocketReflex.ts`, `src/game/pocketReflex.test.ts`
- Modify: `src/wave/SurfZoneRunner.ts` (`RideRequest.pocketReflex`, `afterWater`)
- Modify: `src/game/Settings.ts` (`GameplaySettings.pocketReflex`, defaults, sanitizing)
- Modify: `src/ui/settingsModel.ts` (a Gameplay row and the `GAMEPLAY` id set), `src/ui/strings.ts`
- Modify: `src/main.ts` (the physical frame's request; `SurfGame.setPocketReflex`)
- Modify: `scripts/ride-report.ts` (`--reflex`)
- Test: `src/game/Settings.test.ts`, `src/ui/settingsModel.test.ts`

**Interfaces:**
- Consumes: `WaveFrame.curlDistance` (Task 1).
- Produces: `pocketTrim(frame: WaveFrame): number` in [−`POCKET_TRIM`, `POCKET_TRIM`]; `withPocketReflex(input: RideInput, frame: WaveFrame | undefined, phase: RiderPhase): RideInput`; `showsPocketReflex(setting, swell): boolean`; `RideRequest.pocketReflex?: boolean`; `GameplaySettings.pocketReflex: 'practice' | 'always' | 'never'`.

- [ ] **Step 1: Write the failing tests**

`src/game/pocketReflex.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { WaveFrame } from '../physics/waveFrame';
import { POCKET_DISTANCE, POCKET_TRIM, pocketTrim, showsPocketReflex, withPocketReflex } from './pocketReflex';

const FRAME: WaveFrame = {
  valid: true, directionX: 0, directionZ: 1, aheadOfCrest: 3, crestSpeed: 5, faceHeight: 1.2, faceFraction: 0.5,
  crestBreaking: 0, curlDistance: POCKET_DISTANCE, speedOverGround: 6, speedShoreward: 1, speedAlongCrest: 6, requiredSpeed: 6,
};
const at = (curlDistance: number, valid = true) => ({ ...FRAME, curlDistance, valid });
const ride = { paddle: false, popUp: false, steer: 0.4, trim: 0, crouch: 0.3 };

describe('pocket reflex', () => {
  it('sits back when far from the curl, forward when on it, and still at its distance', () => {
    expect(pocketTrim(at(POCKET_DISTANCE))).toBeCloseTo(0, 9);
    expect(pocketTrim(at(20))).toBe(-POCKET_TRIM);
    expect(pocketTrim(at(0))).toBeGreaterThan(0);
    expect(pocketTrim(at(POCKET_DISTANCE + 2))).toBeLessThan(0);
  });

  it('does nothing with no curl or no wave', () => {
    expect(pocketTrim(at(Infinity))).toBe(0);
    expect(pocketTrim(at(3, false))).toBe(0);
  });

  it('sets only the weight, only standing, and never over a held W/S', () => {
    const far = at(20);
    expect(withPocketReflex(ride, far, 'standing')).toEqual({ ...ride, trim: -POCKET_TRIM });
    expect(withPocketReflex({ ...ride, trim: 0.5 }, far, 'standing').trim).toBe(0.5);
    for (const phase of ['prone', 'push', 'landing', 'recover', 'fallen'] as const) expect(withPocketReflex(ride, far, phase)).toBe(ride);
    expect(withPocketReflex(ride, undefined, 'standing')).toBe(ride);
  });

  it('is on in Practice by default, always, or never', () => {
    expect(showsPocketReflex('practice', 'practice')).toBe(true);
    expect(showsPocketReflex('practice', 'medium')).toBe(false);
    expect(showsPocketReflex('always', 'big')).toBe(true);
    expect(showsPocketReflex('never', 'practice')).toBe(false);
  });
});
```
(Check `SurfConditions['swell']`'s values in `src/game/SurfConditions.ts` and use two real ones for the non-practice cases.)

In `src/game/Settings.test.ts`, beside the balance meter's default test:
```ts
  it('keeps the pocket reflex on the Practice swell by default, and sanitizes it', () => {
    expect(defaultSettings().gameplay.pocketReflex).toBe('practice');
    const saved = new SettingsStore(memory({ [SETTINGS_KEY]: JSON.stringify({ gameplay: { pocketReflex: 'sometimes' } }) }));
    expect(saved.value.gameplay.pocketReflex).toBe('practice');
  });
```
(`memory` and `SETTINGS_KEY` are the file's own; import `defaultSettings` if it does not already.)

In `src/ui/settingsModel.test.ts`, extend the Gameplay rows test to expect a `'pocketReflex'` choice row with options `practice`, `always`, `never`, placed right after `'balanceMeter'`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/game/pocketReflex.test.ts src/game/Settings.test.ts src/ui/settingsModel.test.ts`
Expected: FAIL: the module does not exist; the setting and the row are missing.

- [ ] **Step 3: Implement the reflex**

`src/game/pocketReflex.ts`:
```ts
import type { RiderPhase } from '../physics/AttachedRider';
import type { RideInput } from '../physics/RideSession';
import type { WaveFrame } from '../physics/waveFrame';
import type { GameplaySettings } from './Settings';
import type { SurfConditions } from './SurfConditions';

/**
 * The pocket reflex (the riding-the-wave spec, decision 5): with no weight held,
 * the rider sits back when it has run far from the curl and leans forward when the
 * curl is on it, to stay about POCKET_DISTANCE, m, along the crest from it. Weight
 * only, POCKET_GAIN of trim per metre off that distance and no more than
 * POCKET_TRIM (the W/S keys reach ±1). Steering, crouch and the hand stay the
 * player's. Provisional.
 */
export const POCKET_DISTANCE = 4;
export const POCKET_TRIM = 0.6;
const POCKET_GAIN = 0.15;

/** The weight the reflex asks for on this frame: −1 back to 1 forward; 0 with no wave or no curl in reach. */
export function pocketTrim(frame: WaveFrame): number {
  if (!frame.valid || !Number.isFinite(frame.curlDistance)) return 0;
  return Math.max(-POCKET_TRIM, Math.min(POCKET_TRIM, -POCKET_GAIN * (frame.curlDistance - POCKET_DISTANCE)));
}

/** The input with the reflex's weight, standing and with no weight held; otherwise the input itself. */
export function withPocketReflex(input: RideInput, frame: WaveFrame | undefined, phase: RiderPhase): RideInput {
  if (!frame || phase !== 'standing' || (input.trim ?? 0) !== 0) return input;
  return { ...input, trim: pocketTrim(frame) };
}

/** Whether the reflex rides with the player: by default on the Practice swell only, like the balance meter. */
export function showsPocketReflex(setting: GameplaySettings['pocketReflex'], swell: SurfConditions['swell']): boolean {
  return setting === 'always' || (setting === 'practice' && swell === 'practice');
}
```
(Check the rider phase type's exported name in `src/physics/AttachedRider.ts`; the runner's `RIDER_PHASES` lists the same six.)

- [ ] **Step 4: The setting**

- `src/game/Settings.ts`: in `GameplaySettings`, after `balanceMeter`:
```ts
  /** The pocket reflex (the riding-the-wave spec): with no weight held the rider trims to stay near the curl; Practice only, always, or never. */
  pocketReflex: 'practice' | 'always' | 'never';
```
  in `defaultSettings`'s `gameplay`, `pocketReflex: 'practice'` after `balanceMeter: 'practice'`; in the sanitizer, after the `balanceMeter` line:
```ts
      pocketReflex: oneOf(gameplay.pocketReflex, ['practice', 'always', 'never'] as const, defaults.gameplay.pocketReflex),
```
- `src/ui/settingsModel.ts`: after the `balanceMeter` row:
```ts
      { kind: 'choice', id: 'pocketReflex', label: t('settings.pocketReflex'), value: g.pocketReflex, options: options('settings.pocketReflex', ['practice', 'always', 'never']) },
```
  and add `'pocketReflex'` to the `GAMEPLAY` set.
- `src/ui/strings.ts`, after the balance meter's four strings:
```ts
  'settings.pocketReflex': 'Stay near the curl',
  'settings.pocketReflex.practice': 'Practice',
  'settings.pocketReflex.always': 'Always',
  'settings.pocketReflex.never': 'Never',
```

- [ ] **Step 5: Wire it**

- `src/wave/SurfZoneRunner.ts`: in `RideRequest` add
```ts
  /** The pocket reflex rides with the player (the riding-the-wave spec). */
  pocketReflex?: boolean;
```
  and in `afterWater`, replace `session.step(SURF_ZONE_STEP, this.water, request);` with
```ts
      const ridden = request.pocketReflex ? withPocketReflex(request, this.wave, session.phase) : request;
      session.step(SURF_ZONE_STEP, this.water, ridden);
```
  importing `withPocketReflex` from `'../game/pocketReflex'`.
- `src/main.ts`: a field `private pocketReflex: GameplaySettings['pocketReflex'] = 'practice';` on `SurfGame`, a method beside `setNameTags`:
```ts
  setPocketReflex(setting: GameplaySettings['pocketReflex']): void {
    this.pocketReflex = setting;
  }
```
  in `physicalFrame`: `this.physicalMode.advance(steps, { ...request, steer: this.physicalMode.screenSteer(request.steer), pocketReflex: showsPocketReflex(this.pocketReflex, this.physicalMode.practice ? 'practice' : 'medium') });` (use the conditions' real swell value if `SurfGame` holds it; `practice` is `PhysicalMode.practice`), and at the bottom with `setNameTags`: `game.setPocketReflex(settings.value.gameplay.pocketReflex);` plus the same in the `change === 'gameplay'` branch. Online play passes no reflex (the room decides later).
- `scripts/ride-report.ts`: `const reflex = flag('reflex');`, and where each bot's `b.request = input;` is set: `b.request = reflex ? withPocketReflex(input, wave, session.phase) : input;`; for the own rider pass `pocketReflex: reflex` in `runner.advance(1, { ...own.request, retry: own.retry, pocketReflex: reflex })` and leave its `b.request` unreflexed. Note `--reflex` in the report's header text.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/game src/ui src/wave`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/game/pocketReflex.ts src/game/pocketReflex.test.ts src/game/Settings.ts src/game/Settings.test.ts src/ui/settingsModel.ts src/ui/settingsModel.test.ts src/ui/strings.ts src/wave/SurfZoneRunner.ts src/main.ts scripts/ride-report.ts
git commit -m "feat: the pocket reflex keeps a rider near the curl (Practice by default)"
```

---

### Task 6: The reference wave

Spec decision 4: the Canyon, tuned toward a long, steady peel with 1–1.5 m faces. The practice swell (`PRACTICE_SWELL`, Hs 2 m, Tp 12 s) gives 2.2–2.8 m faces on the Canyon, where riders reach 11–12 m/s.

**Files:**
- Modify: `src/game/PhysicalMode.ts:71` (`PRACTICE_SWELL`) and its doc comment
- Modify: any test pinning `PRACTICE_SWELL`'s height (`grep -rn "PRACTICE_SWELL\|significantHeight: 2" src --include=*.test.ts`)
- Create: `docs/research/reference-wave.md`

**Interfaces:**
- Consumes: ride-report's `--height`, face height, peel and stand columns (Task 3); the roller (Task 4).
- Produces: `PRACTICE_SWELL.significantHeight` set to the chosen height.

- [ ] **Step 1: Sweep the height on the Canyon**

Run each (about 10–25 min each on the M1 Air; run them in the background one after another):
```bash
npm run report:ride -- --practice --height 1.0 --ghosts --style turns --seeds 2 --minutes 5 --spots canyon --out /tmp/ref-1.0.md
npm run report:ride -- --practice --height 1.2 --ghosts --style turns --seeds 2 --minutes 5 --spots canyon --out /tmp/ref-1.2.md
npm run report:ride -- --practice --height 1.4 --ghosts --style turns --seeds 2 --minutes 5 --spots canyon --out /tmp/ref-1.4.md
```
Expected: each report's summary row. Pick the height whose mean face height is within 1–1.5 m with the most stands and a peel at or above the current 55°. If none reaches 1 m faces, extend the sweep upward by 0.2 m until one does.

- [ ] **Step 2: Check the other spots at that height**

Run: `npm run report:catch -- --practice` with the chosen height (check `scripts/catch-report.ts` for how it takes the swell; if it has no height option, add `--height` there the same way as Task 3 Step 5.1).
Expected: cues and stands per spot. A spot that loses most of its stands is recorded in the research note; the Practice swell is shared, so the ruling (keep one Practice swell, or a per-spot one) goes in the ledger with the numbers.

- [ ] **Step 3: Set it, with its reason**

In `src/game/PhysicalMode.ts`, set `significantHeight` in `PRACTICE_SWELL` to the chosen value and extend its doc comment:
```ts
 * Its height gives the Canyon chest-to-head-high faces (1–1.5 m; the riding-the-wave
 * spec's reference wave): at Hs 2 m the faces were 2.2–2.8 m and riders reached
 * 11–12 m/s off the bottom (docs/research/reference-wave.md).
```
Update any test that pinned the old height to the new one.

- [ ] **Step 4: Write the note and run the tests**

`docs/research/reference-wave.md`: the sweep's summary rows, the other spots' catch rows, the choice and why. Then run: `npx vitest run src/game`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/PhysicalMode.ts docs/research/reference-wave.md $(git diff --name-only -- src)
git commit -m "feat: the practice swell makes the reference wave: 1–1.5 m faces on the Canyon"
```

---

### Task 7: Validate on the reference wave, fix what it shows

**Files:**
- Modify: whatever the diagnosis points to, each fix with its own failing test first
- Modify: `docs/research/ride-report-practice.md` (regenerated), `ROADMAP.md` (the P9 entry), this plan's Findings
- Test: as each fix requires

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Run the reference report with the reflex**

Run: `npm run report:ride -- --practice --ghosts --style turns --reflex --seeds 2 --minutes 5 --spots canyon --out docs/research/ride-report-practice.md`
Expected: the summary row and the done criteria line.

- [ ] **Step 2: Compare against the done criteria, one by one**

Median ride ≥ 10 s; best 15–20 s; lost the wave 0; mean speed 6–9 m/s; near the curl ≥ 50 %; bottom turns within Forsyth's ranges (99° in 0.96 s, 1.9 rad/s, 3.8 m, 42° rail). Write each number beside its criterion in this plan's Findings.

- [ ] **Step 3: For each criterion that fails, diagnose before fixing**

Use superpowers:systematic-debugging. The per-ride trace is the instrument: copy `scripts/ride-report.ts` to a scratch script that appends each ride's samples (every 2 steps: time, speed, ahead of crest, face fraction, curl distance, heading against the wave, steer/trim/crouch, bank, rail, load, the board's height over the water, yaw rate, the separation) as one JSON line per ride, and read the rides that fail the criterion. Known suspects from the evidence, in the order to check:
1. falls in bottom turns off the face at 10–12 m/s (the rail releasing: the rail snapping flat within 0.1 s while the body leans in): reproduce offline with a board running off a 15° `PlaneWater` face onto flat water (a small `SurfWater` whose surface is the face for z < 0 and flat beyond), crouched full steer at the transition, before changing the rider;
2. rides ending "lost the wave": the autopilot's line after the bottom turn (it heads down again below 35 % of the face);
3. a low curl share with long rides: the reflex's gain and distance (`POCKET_GAIN`, `POCKET_DISTANCE`).
Each fix: the failing test first, the smallest change, the rider and full suites green, the report rerun. A fix that would add a force or script a move is not allowed (Global Constraints); stop and record it instead.

- [ ] **Step 4: Record**

This plan's Findings: the numbers, each fix and what it changed, anything left open. `ROADMAP.md`'s P9 entry: a line for riding the wave (Part A) with the reference numbers. Commit:
```bash
git add -A docs ROADMAP.md src scripts
git commit -m "docs: riding the wave on the reference wave: the done criteria measured"
```

- [ ] **Step 5: Hand to the user's playtest**

Open the PR (never enable auto-merge; merge only when the user asks) with: what changed, the done criteria against the numbers, and what to try in play (Practice on the Canyon: ride straight down and into the whitewater; hold no W/S and feel the reflex; turn it off in Settings → Gameplay → Stay near the curl).

## Findings

**What the plan built** (branch `claude/riding-the-wave`):
- The gauge finds the curl along the crest (its distance, and its side), rides end honestly (a fall, a kick-out, the wave dying, or leaving it: "lost the wave"), and the ride report reads the spec's done criteria.
- Broken water carries a board: the surface roller's push in the sampler. The catch report's bots, which ride straight in, now ride the Canyon's whitewater for 6.7 s at the median at Hs 2 m.
- The pocket reflex (Settings → Gameplay → Stay near the curl, Practice by default): weight only, sitting back only while the board planes and never in a hard turn (both learned from the traces below).
- The reference wave: the Practice swell at Hs 1.4 m, 1.31 m faces on the Canyon ([reference wave](../../research/reference-wave.md)); every spot catches and stands more at it.
- The autopilot rides away from the curl the gauge sees (latched for the ride), angles toward the open face while waiting, and bottom turns only within 6 m of the crest.

**The done criteria on the reference wave** (the Canyon, Practice, two seeds × 5 min, S-turns with the reflex; [ride report](../../research/ride-report-practice.md)):

| Criterion | Target | Measured |
|---|---|---|
| Median ride | ≥ 10 s | 2.8 s (49 stands) |
| Best rides | 15–20 s | 4.8 s (7.5 s in the run before the waiting angle) |
| Lost the wave | 0 | 5 |
| Mean speed | 6–9 m/s | 4.5 m/s (5.4 before the waiting angle) |
| Near the curl | ≥ 50 % | 20 % |
| Bottom turns | Forsyth: 99° in 0.96 s at 1.9 rad/s, 42° rail | 43° in 0.52 s at 2.0 rad/s, 28° rail |

Not met. Traced ride by ride, what ends the rides now:
1. **The take-off puts the rider on the flat.** Most riders stand 7–9 m ahead of the crest with the face under them already flat (a 1.3 m wave's face is only a few metres long), heading 0–18° off the wave's travel: they drop straight down during the pop-up, faster than the crest. A paddler turns only about 7°/s at full steer (22° in 3 s on flat water), too slowly to angle the take-off; angled and late take-offs are P10's.
2. **Out on the flat the board coasts and stalls.** From 7–9 m/s it slows to 1.5–3 m/s in 3–4 s (about 2 m/s² of drag with the crouch held), the wave catches up, and as the face passes under the slow board it tips 13–45° under an upright rider, who falls ("balance" with the body upright). Picking the wave back up there is the spec's re-catching, not yet met.
3. **A crouched full-steer turn at 10 m/s wobbles in yaw** (about 2.3 Hz, five sign flips in 1.5 s on flat water), and with the weight back it throws the rider at 0.97 s; uncrouched it turns clean. Neither the balance's gains (scaled with the leg's length) nor the crouch's softer leg is the cause; half the crouch depth calms it. Open.
4. **The curl stays 10–25 m away.** The ride report's peel estimate reads 5–7° at every height (one fit over the window), against the rideability report's 55–58° (per-period, clean waves only). Near the curl is 14–20 %.

Fixed on the way, each with a test that failed first: the reflex held the weight back for most of every ride with the curl far, sinking a slowing board's tail (the nose 30–60° up), so it now fades out below 5–3 m/s; it sat back through hard turns, so steering at 0.5 or more it stands aside; the autopilot fell back on the peel estimate when the curl left the gauge's reach and reversed a full lean, so it keeps the side it saw; its bottom turn fired on the flat 8 m ahead and bled the speed, so it now waits for the face.

Next, in the order that would lift the numbers most: a take-off that stays on the face (P10's prone steering and angled take-offs), a slow board picked up again by the face or the whitewater, the crouched wobble at speed, and the peel on the reference wave.
