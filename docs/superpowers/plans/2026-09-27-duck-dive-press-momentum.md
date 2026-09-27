# Duck-dive press momentum Implementation Plan

> **Status (2026-09-28): stopped at Task 1, Step 8; not adopted.** The code is parked on branch `claude/duck-dive-momentum`. Still-water dives capsized (the knee's roll momentum), and the pitch effect was too small to sink the nose first. See the spec's status line and the roadmap.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** While ducking, the angular momentum of the body's own change of shape enters the board–rider solve, so the press turns the board nose-down at the hands (and the knee the tail down).

**Architecture:** `AttachedRider` computes, each substep while prone, `postureMomentum` = Σ mᵢ (rᵢ − c) × uᵢ from the duck-dive tracks' rates, in the world frame, and its change over the substep. `couple()` takes that change from the composite's angular momentum (rhs rows 3–5). `finish()` books the couple's work to `board.work.rider`. No new unknown enters the solve. Public `angularMomentum(about)` accessors on the rider and the board make conservation testable.

**Tech Stack:** TypeScript, three.js `Vector3`, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-27-duck-dive-press-momentum-design.md`

## Global Constraints

- Physical inputs, not scripted moves; checks are never tuned into passing (a failing check stays open with its reason).
- Scope: only the duck-dive's press and knee and their release. Paddling, lying down, the pop-up and standing keep today's coupling.
- The energy ledgers must still balance: the couple's work is booked to `board.work.rider`.
- Performance is measured, never a gate. Tests: `npx vitest run --dir src`; types: `npx tsc --noEmit -p tsconfig.json`.

## Review Focus

1. **Goofy stance:** the mirrored postures turn the board nose-down just as regular does. A test in Task 1 pins it.
2. **Paddling or lying still:** no posture momentum, and the board is untouched. A test in Task 1 pins it.
3. **Relaunch mid-duck** (`mount`): the momentum and its change reset, so the first substep after a relaunch gets no kick. Pinned by the reset in `mount()` and the existing relaunch test (`comes back lying normally after a relaunch mid-duck`).
4. **Leaving the deck mid-duck and landing again:** the momentum is recomputed every substep in `prepare()`, whether or not the contact holds, so no change piles up while in flight. It is applied only when the composite solve is feasible, and booked only then.
5. **Energy:** a duck-dive on still water keeps the board-and-rider ledger closed. A test in Task 1 pins it.

---

### Task 1: The ducking posture's angular momentum in the pair's solve

**Files:**
- Modify: `src/physics/AttachedRider.ts` (fields near `pressTrack`; the `ducks` cache in the constructor; `prepare()`; `couple()`; `finish()`; `mount()`; a new `postureMomentumStep()` and `angularMomentum()`)
- Modify: `src/physics/BoardBody.ts` (a new `angularMomentum()`)
- Test: `src/physics/duckDive.test.ts`

**Interfaces:**
- Produces:
  - `AttachedRider.postureMomentum: Vector3` (readonly, world frame, kg·m²/s).
  - `AttachedRider.angularMomentum(about: Vector3, out?: Vector3): Vector3`.
  - `BoardBody.angularMomentum(about: Vector3, out?: Vector3): Vector3`.

- [ ] **Step 1: Write the failing tests (the momentum itself)**

Add to `src/physics/duckDive.test.ts` inside `describe('duck-dive', …)`:

```ts
  it('the press has angular momentum of its own: the chest rising turns the body nose-up about its centre', () => {
    const { water, board, rider } = proneRider();
    rider.duckDive = 1;
    let most = 0;
    for (let i = 0; i < 18; i += 1) {
      board.step(STEP, water);
      const local = rider.postureMomentum.clone().applyQuaternion(board.orientation.clone().invert());
      if (Math.abs(local.x) > Math.abs(most)) most = local.x;
    }
    // About the board's across axis (+x), nose-up is negative.
    expect(most).toBeLessThan(-0.5);
  });

  it('has no posture momentum while paddling or lying still', () => {
    const { water, board, rider } = proneRider();
    rider.paddle = true;
    for (let i = 0; i < 60; i += 1) {
      board.step(STEP, water);
      expect(rider.postureMomentum.length()).toBe(0);
    }
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/physics/duckDive.test.ts -t "angular momentum of its own|no posture momentum"`
Expected: FAIL — `rider.postureMomentum` is undefined.

- [ ] **Step 3: Compute the momentum (not yet in the solve)**

In `AttachedRider.ts`, beside `private readonly kneeTrack = new MinimumJerkTrack();` add:

```ts
  /**
   * While ducking, the angular momentum of the body's own change of shape (its
   * parts moving on the deck at the press's and the knee's rates), about its
   * centre of mass, world frame, kg·m²/s; and its change over the latest
   * substep, which the pair's solve takes from the board (the press-momentum
   * spec: the press pushes the nose).
   */
  readonly postureMomentum = new Vector3();
  private readonly postureMomentumChange = new Vector3();
```

Extend the `ducks` record type and its builder with the prone parts:

```ts
  private readonly ducks: Record<StanceName, { prone: Float64Array; press: Float64Array; knee: Float64Array; support: SupportRegion; shiftPress: Vector3; shiftKnee: Vector3 }>;
```

and in the constructor's `ducks(stance)` builder, name the prone pose and return its parts:

```ts
      const lying = riderPose(shape, 'prone', stance);
      const prone = postureCenter(lying.parts, this.partMasses);
      ...
      return {
        prone: lying.parts, press: press.parts, knee: knee.parts, support: press.support,
        ...
```

(replacing `const prone = postureCenter(riderPose(shape, 'prone', stance).parts, this.partMasses);`).

Add the method (beside `duckStep`):

```ts
  /** The ducking posture's own angular momentum this substep (`postureMomentum`) and its change since the last. */
  private postureMomentumStep(board: BoardBody): void {
    const change = this.postureMomentumChange.copy(this.postureMomentum);
    this.postureMomentum.set(0, 0, 0);
    const pressRate = this.pressTrack.rate;
    const kneeRate = this.kneeTrack.rate;
    if (this.attached && this.phase === 'prone' && this.phaseDuration === 0 && (pressRate !== 0 || kneeRate !== 0)) {
      // Σ m (r − c) × u: the centre of mass's own rate drops out, as Σ m (r − c) = 0.
      const { prone, press, knee } = this.ducks[this.stance];
      const c = this.localCenter;
      let lx = 0;
      let ly = 0;
      let lz = 0;
      for (let i = 0; i < RIDER_PARTS.length; i += 1) {
        const m = this.partMasses[i];
        const k = i * 3;
        const ux = pressRate * (press[k] - prone[k]) + kneeRate * (knee[k] - press[k]);
        const uy = pressRate * (press[k + 1] - prone[k + 1]) + kneeRate * (knee[k + 1] - press[k + 1]);
        const uz = pressRate * (press[k + 2] - prone[k + 2]) + kneeRate * (knee[k + 2] - press[k + 2]);
        const rx = this.parts[k] - c.x;
        const ry = this.parts[k + 1] - c.y;
        const rz = this.parts[k + 2] - c.z;
        lx += m * (ry * uz - rz * uy);
        ly += m * (rz * ux - rx * uz);
        lz += m * (rx * uy - ry * ux);
      }
      this.postureMomentum.set(lx, ly, lz).applyQuaternion(board.orientation);
    }
    change.subVectors(this.postureMomentum, change);
  }
```

In `prepare()`, right after `this.updateInertia(board);` add:

```ts
    this.postureMomentumStep(board);
```

In `mount()`, beside `this.kneeTrack.reset();` add:

```ts
    this.postureMomentum.set(0, 0, 0);
    this.postureMomentumChange.set(0, 0, 0);
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run src/physics/duckDive.test.ts -t "angular momentum of its own|no posture momentum"`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing tests (the pair turns, keeping its momentum)**

Add to `src/physics/duckDive.test.ts` (imports: `AttachedRider`, `BoardBody` and `PlaneWater` are already imported; add `import type { StanceName } from './riderPosture';`):

```ts
  /** A prone pair in free fall (no water), pressing for 0.3 s: the board's pitch change, rad, and the pair's worst angular momentum about its centre of mass against the press's own. */
  function pressInFreeFall(stance: StanceName = 'regular') {
    const board = new BoardBody();
    board.place(new Vector3(0, 5, 0));
    const rider = new AttachedRider(board.shape, { phase: 'prone', stance });
    board.attach(rider);
    const water = new PlaneWater({ inside: () => false });
    const pitch = () => Math.asin(new Vector3(0, 0, 1).applyQuaternion(board.orientation).y);
    const start = pitch();
    let most = 0;
    let drift = 0;
    rider.duckDive = 1;
    for (let i = 0; i < 18; i += 1) {
      board.step(STEP, water);
      const about = board.centerOfMass.clone().multiplyScalar(board.mass).addScaledVector(rider.position, rider.mass).divideScalar(board.mass + rider.mass);
      const total = board.angularMomentum(about).add(rider.angularMomentum(about));
      most = Math.max(most, rider.postureMomentum.length());
      drift = Math.max(drift, total.length());
    }
    return { turned: pitch() - start, most, drift, attached: rider.attached };
  }

  it('turns the board nose-down as the body presses up, keeping the pair\'s angular momentum (free fall)', () => {
    const { turned, most, drift, attached } = pressInFreeFall();
    expect(attached).toBe(true);
    expect(most).toBeGreaterThan(0.5);
    expect(drift).toBeLessThan(0.05 * most);
    expect(turned).toBeLessThan(-0.01); // nose-down
  });

  it('turns the board nose-down the same way for a goofy rider', () => {
    const regular = pressInFreeFall('regular').turned;
    const goofy = pressInFreeFall('goofy').turned;
    expect(goofy).toBeLessThan(-0.01);
    expect(Math.abs(goofy - regular)).toBeLessThan(0.05 * Math.abs(regular));
  });

  it('keeps the board and rider energy ledger closed through a duck-dive', () => {
    const { water, board, rider } = proneRider();
    const work = () => Object.values(board.work).reduce((a, b) => a + b, 0) + Object.values(rider.work).reduce((a, b) => a + b, 0);
    const energy = () => board.kineticEnergy() + rider.kineticEnergy();
    const [before, workBefore] = [energy(), work()];
    for (let i = 0; i < 3 / STEP; i += 1) {
      rider.duckDive = i * STEP < 1.5 ? 1 : 0;
      board.step(STEP, water);
    }
    const scale = (board.mass + rider.mass) * 9.81 * 0.3;
    expect(Math.abs(energy() - before - (work() - workBefore)) / scale).toBeLessThan(0.01);
  });
```

`BoardBody` needs no `stance` option; `AttachedRider`'s options already take `phase`. Check that they take `stance` (`grep -n "stance?" src/physics/AttachedRider.ts`). If not, set `rider.stance = stance` before `board.attach(rider)` the way the existing test `ducks in the stance the rider has now` does.

- [ ] **Step 6: Run them to verify they fail**

Run: `npx vitest run src/physics/duckDive.test.ts -t "free fall|goofy rider|ledger closed through a duck-dive"`
Expected: first FAIL, `angularMomentum is not a function`. After adding the two accessors (Step 7a), the free-fall and goofy tests still FAIL: `drift` ≈ `most` (the solve ignores the posture's momentum), and `turned` ≈ 0. The ledger test PASSES already: it is a guard for Step 7b.

- [ ] **Step 7a: The accessors**

`AttachedRider.ts`, beside `kineticEnergy()`:

```ts
  /** Angular momentum about `about`, kg·m²/s: the centre of mass's, and lying down the body's turn with the board and its own change of shape. */
  angularMomentum(about: Vector3, out = new Vector3()): Vector3 {
    out.subVectors(this.position, about).cross(this.velocity.clone().multiplyScalar(this.mass));
    if (this.upright) return out;
    const w = this.angularVelocity;
    const I = this.worldInertia;
    out.x += I[0] * w.x + I[1] * w.y + I[2] * w.z;
    out.y += I[3] * w.x + I[4] * w.y + I[5] * w.z;
    out.z += I[6] * w.x + I[7] * w.y + I[8] * w.z;
    return out.add(this.postureMomentum);
  }
```

`BoardBody.ts`, beside `kineticEnergy()`:

```ts
  /** Angular momentum about `about`, kg·m²/s. */
  angularMomentum(about: Vector3, out = new Vector3()): Vector3 {
    out.subVectors(this.centerOfMass, about).cross(this.velocity.clone().multiplyScalar(this.mass));
    const w = this.angularVelocity;
    const I = this.worldInertia;
    out.x += I[0] * w.x + I[1] * w.y + I[2] * w.z;
    out.y += I[3] * w.x + I[4] * w.y + I[5] * w.z;
    out.z += I[6] * w.x + I[7] * w.y + I[8] * w.z;
    return out;
  }
```

Re-run Step 6's command. Expected: free fall and goofy FAIL on `drift`/`turned`, ledger PASS.

- [ ] **Step 7b: The pair's solve takes the change**

In `couple()`, inside `if (!this.upright) { … }` after the three `rhs[3..5] += h * this.waterMoment.*` lines:

```ts
      // The ducking body's change of shape turns the pair: the composite's momentum, I Δω + ΔL, is unchanged by it.
      rhs[3] -= this.postureMomentumChange.x;
      rhs[4] -= this.postureMomentumChange.y;
      rhs[5] -= this.postureMomentumChange.z;
```

In `finish()`, in the feasible branch's prone `else` (after `this.angularImpulseWork(board);`):

```ts
        // The couple of the body's change of shape did work on the pair's turn: the rider's, on the board.
        const d = this.postureMomentumChange;
        board.work.rider -= (d.x * (this.boardSpin.x + board.angularVelocity.x) + d.y * (this.boardSpin.y + board.angularVelocity.y) + d.z * (this.boardSpin.z + board.angularVelocity.z)) / 2;
```

- [ ] **Step 8: Run the Task's tests to verify they pass**

Run: `npx vitest run src/physics/duckDive.test.ts`
Expected: the 5 new tests PASS. The open `it.fails` checks may change. Note which, and don't touch them in this task: Task 2 records them. Everything else PASSES.

If the free-fall `drift` stays above 5 %, the cause is the order of `postureMomentumStep` against the tracks' step within the substep. Check that the momentum is computed after `duckStep()` and `updatePosture()` in the same `prepare()`, then fix the order, not the threshold.

- [ ] **Step 9: Run the rider, board and session suites; typecheck**

Run: `npx vitest run src/physics/AttachedRider.test.ts src/physics/BoardBody.test.ts src/physics/RideSession.test.ts src/physics/pumping.test.ts src/physics/duckDiveBore.test.ts && npx tsc --noEmit -p tsconfig.json`
Expected: all PASS except expected-fail checks. `duckDiveBore.test.ts` may flip an open check; record it in Task 2, and don't tune it.

- [ ] **Step 10: Commit**

```bash
git add src/physics/AttachedRider.ts src/physics/BoardBody.ts src/physics/duckDive.test.ts
git commit -m "feat: the ducking body's change of shape turns the pair (the press pushes the nose)"
```

### Task 2: Measure, record, and open the PR

**Files:**
- Modify: `src/physics/duckDive.test.ts` (open checks: flip `it.fails` → `it` where now met, and update each comment's numbers and reason)
- Modify: `src/physics/duckDiveBore.test.ts` (likewise)
- Modify: `docs/research/duck-dive-report.md` (regenerated)
- Modify: `ROADMAP.md` (the P11 wipeout-slice entry), `docs/superpowers/specs/2026-09-27-duck-dive-press-momentum-design.md` (status line)

**Interfaces:**
- Consumes: Task 1's `postureMomentum`, the solve change.

- [ ] **Step 1: Read the still-water numbers**

Run: `npx vitest run src/physics/duckDive.test.ts --reporter=verbose`
For each `it.fails` check (nose first; depth 0.5–1 m; holding on from paddling speed; 50 L un-diveable): if vitest reports it as unexpectedly passing, change it to `it` and rewrite its comment as met, with the number. Otherwise update the comment's numbers only. Get the numbers with a throwaway probe test printing through a failing `expect(lines).toEqual([])`, deleted after.

- [ ] **Step 2: The test bore**

Run: `npx vitest run src/physics/duckDiveBore.test.ts --reporter=verbose`
Flip or annotate its open checks the same way.

- [ ] **Step 3: The surf zone**

Run: `npm run report:duckdive -- --seeds 2 --minutes 3` (about 10–30 min; run it in the background).
Expected: `docs/research/duck-dive-report.md` regenerated. Compare kept-the-board rates, setbacks and the reasons riders came off against the previous report (on time 6 %, early 38 %, late 0 %, inside 11 %; on top 28 %).

- [ ] **Step 4: Record**

Update the ROADMAP P11 wipeout entry with a new bullet, "The press pushes the nose (spec …)": what changed, the still-water and test-bore checks, and the surf-zone numbers. Update the spec status: "Built on `claude/duck-dive-press` (2026-09-27); checks in the roadmap". If the free pivot is now called for (the arms or the lower body asked beyond what they can give: riders coming off as `lost board` while ducking, with the hold request past the grip), say so as the next item. Otherwise the next items are roll under water, then the dive's speed.

- [ ] **Step 5: Full suite, typecheck, commit, push, PR**

Run: `npx vitest run --dir src` and `npx tsc --noEmit -p tsconfig.json`
Expected: all pass, plus expected fails.

```bash
git add ROADMAP.md docs/research/duck-dive-report.md docs/superpowers/specs/2026-09-27-duck-dive-press-momentum-design.md docs/superpowers/plans/2026-09-27-duck-dive-press-momentum.md src/physics/duckDive.test.ts src/physics/duckDiveBore.test.ts
git commit -m "docs: the press pushing the nose, measured"
git push -u origin claude/duck-dive-press
gh pr create --base main --head claude/duck-dive-press --title "Duck-dive: the press pushes the nose" --body-file <body>
```

The PR body says it is stacked on #51 and gives the numbers against the survey.
