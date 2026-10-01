# Padang Padang Part B, PR 5: the crash curve, parcels and sound — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** At Padang Padang the swept lip lands where the barrel's clock says it lands. A crash curve along each front's landing line pours the jet's water back into the solver there, with its splash-up, spray, foam, air and sound. The whitewater that Kennedy's early onset starts is held back until the barrel touches down.

**Architecture:**
- **The ledger moves to the barrel's clock.** At a swept spot with the profile library, the solver's own lip, thrown at Kennedy's onset, no longer throws.
  - When a front point's clock crosses its throw (τ = 0), it takes its jet from the solver's crest under it, by the lip's own source rule. The water waits as held parcels (`PlungingLip`, carried in the sea handover).
  - When its clock reaches touchdown, the parcels pour onto the landing line over the tube's collapse, √(2W/g) (PR 4's `collapseSeconds`, the same fade the drawing and the contact use). They land as today's lip parcels do.
  - Water and horizontal momentum balance exactly.
- **The crash curve** is where the lip lands at touchdown, one point per front point: on the drawn touchdown frame (the loft's own ray, anchor and fade), the face's point nearest the tip. A pure module computes it with + − × ÷ √, and a test checks its tip against the loft's drawn vertex.
- **The tube's own air and foam.** At touchdown the void closes, trapping the held frame's void over the point's share of the crest. G9's closing-tube mechanism lets it out: a spit from the barrel's open end or an eruption, bubbles, and the foam ball.
- **The whitewater keys on the barrel's clock.** In each front point's column, over the drawn curl's footprint, the solver's breaking strength is withheld from the whitewater until touchdown: the foam's bore source (which the bore spray and the bubbles read) and the roar.
- **Sound follows:** lip hits come from the pour's landings.

**Tech Stack:** TypeScript, vitest. No shader or mesh changes.

**Spec:** `docs/superpowers/specs/2026-09-28-padang-padang.md`:
- §Part B decision 13.1: "the solver stays the clock and the mass ledger";
- decision 13.6: "parcels are kept only for the pour, the splash-up and the spray, launched from a crash curve along the landing line";
- decision 14: "parcels for the pour, splash-up and spray, from the crash curve; lip-landing sounds from the crash curve";
- Coordination: Part D needs "the crash curve, for the foam ball's push and the spit's blast".

Read it with:
- the Part B plan, `docs/superpowers/plans/2026-09-29-padang-padang-part-b.md` (its closing item: "Rich's whitewater and the sound should start from the barrel's clock");
- the PR 3 plan, `…-part-b-pr3.md`, whose loft this mirrors;
- the handoff, `docs/superpowers/handoffs/2026-09-30-padang-padang-part-b.md`, "Next PRs";
- PR 4's fade (`claude/padang-contact` ffa9892): `ProfileLookup.collapseSeconds`, `collapseFade`, and the drawing keeping the touchdown frame.

## Global Constraints

- "every value is sourced or marked provisional, and nothing is hand-shaped".
- "Classic's pixels change only where there is a lip or a tube; everything else stays byte-identical" (spec 15). Other spots' `waterLooks` snapshots stay unchanged, and other spots' behaviour stays as it is.
- "Performance is measured, never a gate. Target an M4 Pro; an M1 Air may run slowly." Report `uptime`'s load with every timing.
- "Don't change the Reef (Teahupo'o)". The crash runs only where `BARREL_SLOPE` has the spot (Padang Padang), and only with the library loaded.
- **Online determinism:** "anything the rider hits must match between players; spray, foam texture and mist may differ". The crash moves the solver's water, so it runs in the worker's simulation, with only + − × ÷, √ and floor in its decision paths: no `Math.sin`, `cos`, `exp` or `hypot`. A late joiner receives the held jets with the sea.
- The advisor rules on every shape, timing and ledger value before it is settled.
- Build on PR 4's fade; never a fade of this PR's own.
- Work in your own worktree on `claude/padang-crash`, stacked on `claude/padang-contact` (#95). Never touch other sessions' worktrees or branches.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. PR bodies end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- The owner merges.

**Scope: in and out.**
- **In:**
  - the crash curve;
  - the held jet and its pour, with the splash-up and spray from the pour's landings;
  - the void's air and foam ball at the crash;
  - the whitewater gate;
  - lip hits from the crash.
- **Out:**
  - the fade after touchdown (PR 4's);
  - the shading (PR 6);
  - the roller with body, foam that ages, and the look of the spray (spec 14);
  - every other spot (PR 7).

## The advisor's rulings (2026-10-01)

Build as recommended, except where noted:
1. **The crash curve:** approved. The lip lands on the face point nearest the tip on the drawn touchdown frame: in the runs the face rises to meet the jet, so the gap closes from both sides. Keep the test against the loft's drawn vertex.
2. **The ledger's timing:** at τ = 0, all at once, with #86's source rule. Approved, on a condition.
   - The throw moves from Kennedy's onset to the swept τ = 0, up to about 2 s and 20 m later on the wedge, and the solver was tuned with lips at Kennedy's onset.
   - So re-run Padang Padang's game-size probes before and after: stability, peel, catch and surf readout, several seeds, at the Small swell and one bigger.
   - Report starved throws and water, unplaced momentum, and the fastest water.
   - If the crest misbehaves, the fallback is a progressive take following the library's own A_J(τ), still with #86's rule; tell the advisor before switching.
3. **The jet's volume:** the library's own jet on the held frame. Approved. Send the probe's comparison with the solver's Pick & Feddersen ask, with how much the crest starves.
4. **Waves that never throw:** approved. No jet at a swept spot (the barrel alone plunges), the skipped Kennedy onsets counted, and no per-column fallback: spilling breakers make a roller, not a jet.
5. **Late points:** approved. Water that was never drawn doesn't land.
6. **Momentum:** approved, with one change. Take it at the throw by #86's momentum rule: nearest-first from q, clamped at q, never reversing, with the unplaced rest counted. Target the jet's horizontal momentum along the ray, and pour that same amount at the landing. Vertical momentum at impact is lost to turbulence, as `land()` says. (`drawFromCrest` is that rule, given the jet's horizontal velocity; the held parcels keep it.)
7. **The pour:** approved as planned. Take the drop for aeration from the drawn tip's own fall (the crest at the throw against the landing height), not a flat H. Spray from `LipImpact.y` at swept landings is right.
8. **The void's air and the tube's own foam:** approved, with W = PR 4's void height, so √(2W/g) is `collapseSeconds`. The spit leaves from the chain's open end, the newest thrown point: the tube's mouth.
9. **The whitewater gate:**
   - (a) Yes, gate the shared foam field in the curl's footprint until touchdown. Flag the change to Classic's foam at Padang Padang downstream of the barrel in the PR: it stays inside the swept spot and follows the one-water rule.
   - (b) Yes, gate the aeration and turbulence there too: the rider inside an open tube is in clear water.
   - (c) No for the roller push: it is Part D's, since it moves the catch and ride reports. Record it as a known inconsistency: in the open curl before touchdown, a rider can still feel the early Kennedy bore's push.
10. **The splash-up sheet: show it now,** exactly as at the other spots. At the swept spot hide only the jet strips (kind 0) and draw the splash-up strips (kind 1). Flag for PR 7: deleting `LipSheetMesh.ts` and `richLip.ts` must keep a splash-up renderer.

## The decisions as sent (2026-10-01)

1. **The crash curve: where the lip lands.**
   - Per front point (about one per solver column), once its clock reaches touchdown, on the drawn touchdown frame: the loft's ray (the front's tangent over ±2 m), end weight, anchor (with the 0.8 T_open handover) and fade.
   - The lip lands on the frame's face at its point nearest the tip: the closest point to the tip on the lower surface, from the throat to the front, within 2 h0 ahead. That is `metrics.py`'s closing of the void, the gap whose closing is the cases' touchdown.
   - The coordinator's heads-up: in pad19-a20 and pad19-a45 the last two frames are open duplicates, so the drawn lip never touches the face. The crash curve owns where it lands.
   - On the drawn touchdown frames the tip stands 0.035, 0.025, 0.062 and 0 h0 off the face (a20, a30, a45, periodic): at most 0.43 m at h0 = 7 m.
   - Rejected: carrying the tip along its held velocity to the static face. It lands 0.78, 0.34 and 1.04 m ahead (a20, a30, a45 at h0 = 7 m), because in the runs the face rises to meet the tip. The gap closes within a frame, while the tip alone would take five.
2. **The ledger's timing.**
   - Recommended: the jet leaves the solver's crest when the point's clock crosses 0, all at once, as today's lip does at its throw. It is held as waiting parcels, then poured onto the landing line from touchdown.
   - Alternatives: take it at touchdown (simpler, but the crest keeps the jet's water through the open time); or take it progressively over the open time (smoother, but the 0.2 source cap then acts per step).
3. **The jet's volume: what is drawn.**
   - Recommended: the library's own jet on each case's held frame (PR 4's `heldFrame`), with `metrics.py`'s polygons on its 128 points:
     - the jet is the water above the void, behind the vertical through the throat;
     - the void runs from the tip under the jet to the throat, down the face to its point nearest the tip, and closes back to the tip.
   - It is blended by A0 as the frames are, scaled by h0², and taken over the point's share of its front's length times the loft's end weight there.
   - On the held frames A_J is 0.00918, 0.02868, 0.04818 and 0.00830 h0² (a20, a30, a45, periodic). The metrics frame's are 0.00861, 0.02871, 0.04833 and 0.00787, so they agree within 7 %. At h0 = 7 m that is 0.45, 1.41, 2.36 and 0.41 m² per metre.
   - Alternative: the solver lip's own ask at Kennedy's onset (Pick & Feddersen's or the reef overturn's A_J × the solver's H²), which the solver was tuned with. The probe logs both.
   - Either way the source rule is #86's: the wave's upper half, at most 0.2 of each cell, starved throws counted. H is the solver's own wave height at the throw (`waveHeightAt`, over half a wavelength at the drawn crest's speed).
4. **Waves the barrel never throws.**
   - Recommended: at a swept spot the barrel alone plunges. A wave no front joins (small sets under the join table's first row, spilling crests) throws no jet, and its Kennedy onsets are counted.
   - Alternative: the solver's lip as a per-column fallback. That needs a deferral window, since at Kennedy's onset the front has not yet joined, and the deferred throws would come late.
5. **Late points.** A point first seen past its touchdown throws and pours at once. Past touchdown + collapse its lip was never drawn, so it throws nothing (counted).
6. **Momentum.** The removed horizontal momentum is the jet's volume × the held frame's tip velocity along the ray at the throw. The pour lands with that same horizontal velocity, and with the held frame's vertical velocity. The ray's small rotation between throw and touchdown is not followed, so momentum balances exactly.
7. **The pour.**
   - 8 parcels (today's strip), released evenly over the tube's collapse, PR 4's `collapseSeconds` √(2W/g): 0.31, 0.49, 0.60 and 0.32 s at h0 = 7 m. So the water comes down as the drawing and the contact fade.
   - Each is released on the landing line as it then stands: the landing moves with the anchor's handover. The solver's water stands above the drawn face there, so each parcel lands where it is released.
   - Each lands as a lip parcel does: its water spread over the sheet's thickness along its travel, the plunge zone held, the splash-up (0.3 of it), foam, aeration by its drop from the throw's crest, spray and sound.
   - Its spray rises from the landing's own height, not from the solver's hump under the drawn curl. That applies to swept landings only; every other spot's spray is unchanged.
8. **The void's air and the tube's own foam.**
   - At touchdown the void closes and traps the held frame's A_O over the point's share: 0.00421, 0.02611, 0.06344 and 0.00400 h0² (within 12 % of the metrics frame's), 0.21–3.11 m² per metre at h0 = 7 m.
   - G9's `TUBE_AIR` lets it out over the same collapse. Half leaves as a spit from the chain's open end (the newest thrown point, down the line), or erupts where the section closed at once; the rest breaks into bubbles down to 0.8 × the drop.
   - G9's foam ball rolls in the collapsing void (κ_r 0.9 × drop²). It and the bubbles are placed by the held void's length and axis (the diameter chord of its polygon) about the drawn crest.
   - The tube's own foam is then the pour's splash foam along the crash curve, the bore's foam from touchdown (item 9) and the foam ball. The curl's lifted vertices keep PR 3's (1 − lift) × the water's foam, so it shows through as the slice fades.
9. **The whitewater gate** ("Rich's whitewater and the sound from the barrel's clock"; the advisor, 2026-09-30).
   - While a point's clock is before touchdown, in its column over the drawn curl's footprint (profile samples 6–121, the lifted band), the solver's breaking strength is withheld from the whitewater: the foam field's bore source (and so the bore spray and the bubbles, which read it) and the roar.
   - It lives in the simulation, because the foam field is shared state. So at Padang Padang Classic's foam follows the barrel too; it changes only where the barrel is and downstream of it.
   - Questions: (a) is gating the shared foam field acceptable, rather than Rich only? (b) Should the bore's aeration and turbulence there follow too? That is physics: the rider's void fraction in an open tube, which "is clear water", but the ruling of 2026-09-30 called this visuals only. (c) Should the rider's roller push (`PhysicalSurfWater`'s bore regime) follow too? Recommended: (a) yes; (b) yes; (c) no, left to Part D, because it moves the catch and ride reports.
10. **The splash-up sheet.** It stays hidden at the swept spot (PR 3 hid the lip sheet there), with only the spray drawn. Showing the Rich splash-up strips there waits for the look of the spray (out of Part B). Or show them now?

## Measured facts this plan relies on

- **The held frames' overturn** (PR 4's `heldFrame`, `metrics.py`'s polygons on the 128 points), against the metrics frame's (`docs/research/barrel-cases.md`; the periodic case's metrics file) [measured, NS]:

  | Case | A_J held / metrics (h0²) | A_O held / metrics (h0²) | L held / metrics (h0) | Axis tilt held / metrics | Collapse at h0 7 m (PR 4) |
  |---|---|---|---|---|---|
  | `pad19-a20-l12` | 0.00918 / 0.00861 | 0.00421 / 0.00411 | 0.141 / 0.129 | 49° / 57° | 0.31 s |
  | `pad19-a30-l12` | 0.02868 / 0.02871 | 0.02611 / 0.02587 | 0.311 / 0.301 | 40° / 41° | 0.49 s |
  | `pad19-a45-l12` | 0.04818 / 0.04833 | 0.06344 / 0.06315 | 0.487 / 0.477 | 41° / 40° | 0.60 s |
  | `periodic-padang19s-l12` | 0.00830 / 0.00787 | 0.00400 / 0.00358 | 0.140 / 0.123 | 55° / 39° | 0.32 s |

  The areas agree within 12 %; the small voids' tilts are noisy (a void of 0.14 h0 on 24 samples). The measurement taken on the held frame is chosen because the ledger's water is then the drawn lip's.
- **The held frame's tip velocity** (√(g h0)): (0.83, −0.54), (1.03, −0.72), (1.22, −0.64), (0.66, −0.46). At h0 = 7 m the pour hits at 6.7–11.4 m/s, over the sound's 4 m/s jet threshold.
- **The lip's clock is not the solver's.** The spin-up steps the solver alone, so times are handed to the lip as "in s from now".
- **Kennedy's lead** on the Small swell, from the column's onset to the barrel's throw: measured by Task 7's probe.

## Review Focus

1. **A point lost while its jet is held** (unseen for 0.5 s): its water still lands where and when it was foreseen at the throw, and its void closes when the last parcel lands (Task 3, Task 4).
2. **A point first seen past its touchdown** (a late join, or its fit moving): it throws and pours in the same step; past the collapse it throws nothing; both counted (Task 4).
3. **A sea handed over with jets held or pouring:** the joiner pours the same parcels at the same places, and the points' throw and crash marks come over with the front (Task 4).
4. **The library missing** (offline, 404): the solver's lip throws as before and nothing is gated (Tasks 4 and 6).
5. **The parcel pool full:** a held jet takes no water rather than losing it, counted as starved (Task 3).

---

## File structure

| File | Responsibility |
|---|---|
| `src/wave/barrel/ProfileLibrary.ts` | `cases` and `caseBlend`: the cases, and which a slice blends and by how much |
| `src/wave/barrel/heldOverturn.ts` (new) | Pure: a frame's jet and void, as `metrics.py` measures them, on the 128 points |
| `src/wave/barrel/crashCurve.ts` (new) | Pure: a front point's barrel as the loft draws it (ray, width, end weight, anchor, fade, tip, landing, footprint), its held jet's motion, and its held overturn scaled |
| `src/wave/PlungingLip.ts` | Swept strips: `holdJet`, `crashJet`, `movePour`; no carve and no crest lift for them; their void's own area, span and axis; `LipFlight.swept`; the handover |
| `src/wave/SprayCloud.ts` | A swept landing's spray rises from its own height (`LipImpact.y`) |
| `src/wave/barrel/SweptCrash.ts` (new) | The ledger on the barrel's clock: throws, crashes, pours, late and lost points, the whitewater gate, the crash curve for Part D, counts |
| `src/wave/barrel/BreakingFront.ts` | `FrontPoint.jetStrip`, `FrontPoint.crashedAt` |
| `src/wave/SurfZoneSimulation.ts` | The library option; the crash at a swept spot; Kennedy's lip off there; `whitewaterStrength` for the foam |
| `src/wave/SurfZoneRunner.ts` | The library decoded once, for the simulation and the contact; the roar from `whitewaterStrength` |
| `src/wave/probes/padangCrash.probe.test.ts` (new) | Cost, counts, the ledger's balance, Kennedy's lead removed, the pour's impacts |
| `docs/research/barrel-library.md` | "The crash" |

---

### Task 1: The held frames' overturn, and the library's case blend

**Files:**
- Create: `src/wave/barrel/heldOverturn.ts`, `src/wave/barrel/heldOverturn.test.ts`
- Modify: `src/wave/barrel/ProfileLibrary.ts` (new public members only)
- Test: `src/wave/barrel/ProfileLibrary.test.ts`

**Interfaces:**
- Produces:
  - `interface Overturn { jetArea: number; voidArea: number; voidLength: number; axisX: number; axisY: number }`: areas in h0², the length in h0, and (axisX, axisY) the void's long axis, a unit vector forward and down (axisX ≥ 0, axisY ≤ 0);
  - `overturnAt(frames: Float32Array, frame: number): Overturn`: zeros where the frame has no void;
  - `blendOverturn(a: Overturn, b: Overturn, weight: number): Overturn`, with the axis renormalised with √;
  - `ProfileLibrary.cases: readonly BarrelCase[]`;
  - `ProfileLibrary.caseBlend(query: Omit<ProfileQuery, 'seconds'>): CaseBlend`, with `interface CaseBlend { lower: BarrelCase; upper: BarrelCase; weight: number; scale: number; clamped: boolean }`.

**The rule** (`tools/basilisk/analysis/interface.py`'s `void_polygon`, `jet_polygon` and `shape_metrics`, on the fixed landmarks):
- **The void:** the points from the tip (64) to k, where k is the lower surface's point (88…127, x < tip + 2 h0) nearest the tip, closed straight back to the tip. Its area is by the shoelace formula. Its length is the polygon's diameter (the largest distance between two of its points), and its axis is that chord, oriented forward and down.
- **The jet:** the top surface's last crossing of the throat's x before the tip (by the index, 0 … 63, linear between points), then the points on to the throat (88), closed. Its area is by the shoelace formula.
- Only + − × ÷ and √.

- [ ] **Step 1: Write the failing tests.** `heldOverturn.test.ts`, on `tubeCase` (`toyCase.ts`): its void is the triangle-ish tube from the tip (1.2, 0.5) under the jet to the throat (0.6, 0.6), down the face (0.6, 0.6) → (0.8, 0).

```ts
import { describe, expect, it } from 'vitest';
import { blendOverturn, overturnAt } from './heldOverturn';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { heldFrame } from './ProfileLibrary';
import { tubeCase } from './toyCase';

describe('the held frame’s jet and void (the crash’s water and air)', () => {
  it('measures a tube’s jet and void as metrics.py does', () => {
    const toy = tubeCase(0.3);
    const o = overturnAt(toy.frames, 4);
    expect(o.jetArea).toBeGreaterThan(0);
    expect(o.voidArea).toBeGreaterThan(0);
    expect(o.axisX).toBeGreaterThanOrEqual(0);
    expect(o.axisY).toBeLessThanOrEqual(0);
    expect(o.axisX * o.axisX + o.axisY * o.axisY).toBeCloseTo(1, 12);
    // A tent (no overturn) has neither.
    expect(overturnAt(toy.frames, 0)).toEqual({ jetArea: 0, voidArea: 0, voidLength: 0, axisX: 1, axisY: 0 });
  });

  it('reads the shipped cases’ held frames within 12 % of their metrics frames (barrel-cases.md)', () => {
    const metrics: Record<string, { jet: number; air: number }> = {
      'pad19-a20-l12': { jet: 0.109 * 0.281 * 0.281, air: 0.052 * 0.281 * 0.281 },
      'pad19-a30-l12': { jet: 0.212 * 0.368 * 0.368, air: 0.191 * 0.368 * 0.368 },
      'pad19-a45-l12': { jet: 0.176 * 0.524 * 0.524, air: 0.23 * 0.524 * 0.524 },
      'periodic-padang19s-l12': { jet: 0.3857675 / 49, air: 0.1753303 / 49 },
    };
    for (const bytes of readBarrelCases()) {
      const c = decodeCase(bytes);
      const held = heldFrame(c);
      const o = overturnAt(c.frames, Math.round((held.tau - c.tauStart) / c.tauStep));
      expect(o.jetArea / metrics[c.id].jet, c.id).toBeGreaterThan(0.88);
      expect(o.jetArea / metrics[c.id].jet, c.id).toBeLessThan(1.12);
      expect(o.voidArea / metrics[c.id].air, c.id).toBeGreaterThan(0.88);
      expect(o.voidArea / metrics[c.id].air, c.id).toBeLessThan(1.13);
    }
  });

  it('blends two overturns by weight, the axis kept a unit vector', () => {
    const a = { jetArea: 1, voidArea: 2, voidLength: 3, axisX: 1, axisY: 0 };
    const b = { jetArea: 3, voidArea: 4, voidLength: 5, axisX: 0, axisY: -1 };
    expect(blendOverturn(a, b, 0)).toEqual(a);
    const half = blendOverturn(a, b, 0.5);
    expect(half.jetArea).toBe(2);
    expect(half.axisX).toBeCloseTo(Math.SQRT1_2, 12);
    expect(half.axisY).toBeCloseTo(-Math.SQRT1_2, 12);
  });

  it('uses only + − × ÷ and √ (online determinism)', async () => {
    const { readFileSync } = await import('node:fs');
    expect(readFileSync('src/wave/barrel/heldOverturn.ts', 'utf8')).not.toMatch(/Math\.(sin|cos|tan|exp|log|pow|hypot|atan|cbrt)/);
  });
});
```

In `ProfileLibrary.test.ts`:

```ts
  it('names the cases a slice blends, and its scale, as profileAt does (the crash’s held overturn)', () => {
    const [a, b] = [toyCase(0.2, 0), toyCase(0.4, 0.2)];
    const library = new ProfileLibrary([b, a]);
    expect(library.cases).toEqual([b, a]);
    expect(library.caseBlend({ slope: 0.05, footHeight: 2.1, footDepth: 7 })).toEqual({ lower: a, upper: b, weight: 0.5, scale: 7, clamped: false });
    const small = library.caseBlend({ slope: 0.05, footHeight: 0.7, footDepth: 7 });
    expect(small.lower).toBe(a);
    expect(small.upper).toBe(a);
    expect(small.clamped).toBe(true);
    expect(small.scale).toBeCloseTo(3.5, 12);
  });
```

- [ ] **Step 2: Run** `npx vitest run src/wave/barrel/heldOverturn.test.ts src/wave/barrel/ProfileLibrary.test.ts`: they fail.
- [ ] **Step 3: Implement** `heldOverturn.ts` by the rule, and in `ProfileLibrary`:
  - `readonly cases: readonly BarrelCase[]`, set in the constructor as given;
  - `caseBlend(query)`, which returns `bracket`'s `lower`, `upper`, `weight`, `scale` and `clamped`;
  - `export interface CaseBlend` beside `ProfileLookup`.
- [ ] **Step 4: Run** the two test files and `npx tsc --noEmit -p .`: PASS.
- [ ] **Step 5: Commit:** "feat(barrel): the held frames' jet and void, measured as metrics.py does, and the library's case blend".

### Task 2: The crash curve's geometry

**Files:**
- Create: `src/wave/barrel/crashCurve.ts`, `src/wave/barrel/crashCurve.test.ts`

**Interfaces:**
- Consumes:
  - `Overturn`, `overturnAt`, `blendOverturn` (Task 1);
  - `ProfileLibrary.profileAt`, `profileTimes`, `caseBlend`, `cases`, `heldFrameOf`; `LANDMARK`, `PROFILE_POINTS`;
  - `LOFT` (`endBlend`, `handover`, `handoverStart`, `offsetKnee`, `offsetReach`, `pinned`) and `collapseFade`;
  - `FrontPoint`.
- Produces:

```ts
export interface CrashSlice {
  /** The front's shoreward normal (x, z), the point's share of its front's length, m, and the loft's end weight there. */
  rayX: number; rayZ: number; width: number; endWeight: number;
  /** h0 (m), τ at touchdown and at the clear frame (s), and the tube's collapse (PR 4's √(2W/g)), s. */
  scale: number; touchdown: number; clear: number; collapse: number;
  /** The profile's origin in the world (the loft's anchor), and the weight lifting it off the water (end × fade). */
  anchorX: number; anchorZ: number; weight: number;
  /** The drawn lip tip and crest, and where the lip lands (on the drawn frame's face), m. */
  tipX: number; tipY: number; tipZ: number; crestX: number; crestY: number; crestZ: number; landX: number; landY: number; landZ: number;
  /** The lifted band's reach along the ray from the anchor, m (the whitewater gate's footprint). */
  reachBack: number; reachFront: number;
  /** The held overturn blended and scaled: the jet's and void's cross-sections (m²), the void's length (m) and axis, the void's height W, m. */
  jetArea: number; voidArea: number; voidLength: number; axisX: number; axisY: number; voidHeight: number;
}
export function createCrashSlice(): CrashSlice;
export interface JetMotion { tipAlong: number; tipUp: number; crestSpeed: number }
export class CrashCurve {
  constructor(library: ProfileLibrary, slope: number);
  /** Front point k (its front's points are [start, end)) at its clock, as the loft draws it; `heightAt` is the water under a point resting on it. */
  slice(points: readonly FrontPoint[], start: number, end: number, k: number, stillLevel: number, heightAt: (x: number, z: number) => number, into: CrashSlice): CrashSlice;
  /** The held frame's tip velocity along the ray and up, m/s, and the drawn crest's speed along the ray, m/s (the crest landmark over the 10 frames before the clear one). */
  jetMotion(point: FrontPoint, into: JetMotion): JetMotion;
}
```

**The rule**, mirroring `SweptLoft.loftFront` (drawing mode) at the point's own σ:
- **The ray:** the front's positions at σ ± 2, interpolated between points and run on past the ends along the end segments, their difference normalised with √. Then n̂ = (−t̂z, t̂x).
- **The width:** half the σ gaps to the neighbours on the front (one side at an end).
- **The end weight:** with d = min(σ − σ_first, σ_last − σ), 0 if d ≤ 0, else r²(3 − 2r) with r = min(1, d / `endBlend`).
- **The shape:** `profileAt` at min(τ, touchdown), the frame the drawing keeps.
- **The fade:** `collapseFade(τ, touchdown, collapseSeconds)`, and the weight = end weight × fade.
- **The anchor:** the loft's, with the soft cap and the handover from `handoverStart` × touchdown over `handover`.
- **A drawn vertex:** xz = anchor + x·n̂, y = h + e(still + y − h), with e = weight × (1 − pin), and `heightAt` asked only when 0 < e < 1.
- **The landing:** in the frame's own x (along the ray) and y, the closest point to the tip on the lower surface's segments (samples 88 → 127, those with x under the tip's + 2 h0). Where none qualifies, it is the tip itself. Then it goes into the world as a drawn vertex (unpinned there).
- **The reach:** the min and max x over samples `pinned` … 127 − `pinned`.
- **The overturn:** each case's held frame (`heldFrameOf`) measured once, at construction, by `overturnAt`; blended at `caseBlend`'s weight; lengths × scale, areas × scale². `voidHeight` = g·collapse²/2, so G9's collapse time is PR 4's to the digit.

- [ ] **Step 1: Write the failing tests** (`crashCurve.test.ts`), on `tubeCase` (from τ = 0 its tip at (1.2, 0.5) h0 under the lip's top from (0, 0.8), the underside back to the throat (0.6, 0.6), the face down to the toe (0.8, 0); its tip runs at (0.9, −0.3) √(g h0)):

```ts
import { describe, expect, it } from 'vitest';
import type { FrontPoint } from './BreakingFront';
import { CrashCurve, createCrashSlice } from './crashCurve';
import { FRONT_STRIDE, writeFrontRecords } from './frontRecords';
import { LANDMARK, ProfileLibrary } from './ProfileLibrary';
import { LOFT, LOFT_SAMPLES, SweptLoft } from './sweptLoft';
import { tubeCase } from './toyCase';

const GRAVITY = 9.81;
const library = () => new ProfileLibrary([tubeCase(0.2), tubeCase(0.4)]);
/** A straight front along +x at z = −100, 1 m apart, thrown at z −100 at τ ≥ 0 (A0 0.3: h0 7 m). */
function front(n: number, tau: (k: number) => number): FrontPoint[] {
  return Array.from({ length: n }, (_, k) => ({
    id: k, front: 1, column: k, sigma: k, x: k + 0.5, z: -100, b: 0, height: 2, joined: 0, depth: 3, throwDepth: 2.5, crestDepth: 2,
    thrown: tau(k) >= 0 ? 0 : null, throwZ: tau(k) >= 0 ? -100 : null, footHeight: 2.1, footDepth: 7, broke: 0, tau: tau(k), fresh: null, seen: 0,
  }));
}
const flat = () => 0;
const TOUCHDOWN = 0.5 * Math.sqrt(7 / GRAVITY);

describe('the crash curve', () => {
  it('stands its tip where the loft draws it, at the same σ (drawing and crash agree)', () => {
    const points = front(21, () => TOUCHDOWN);
    const records = new Float32Array(21 * FRONT_STRIDE);
    writeFrontRecords(points, records);
    const loft = new SweptLoft(library(), 0.05).build(records, 21, 0, flat);
    const crash = new CrashCurve(library(), 0.05).slice(points, 0, 21, 10, 0, flat, createCrashSlice());
    // Slices start 1.5 m before σ 0, every half metre: σ 10 is slice 23.
    const v = 3 * (23 * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.lip);
    expect(crash.tipX).toBeCloseTo(loft.positions[v], 3);
    expect(crash.tipY).toBeCloseTo(loft.positions[v + 1], 3);
    expect(crash.tipZ).toBeCloseTo(loft.positions[v + 2], 3);
  });

  it('lands the lip on the face’s point nearest its tip (metrics.py’s closing of the void)', () => {
    const crash = new CrashCurve(library(), 0.05).slice(front(21, () => TOUCHDOWN), 0, 21, 10, 0, flat, createCrashSlice());
    // In h0 the tip is (1.2, 0.5); the face from the throat (0.6, 0.6) to the toe (0.8, 0) lies 0.55 from it, the flat on
    // to (2, 0) 0.5 straight below it: it lands on the flat under its tip.
    expect(crash.landY).toBeCloseTo(0, 6);
    expect(crash.landZ).toBeCloseTo(crash.tipZ, 3);
    expect(crash.landX).toBeCloseTo(crash.tipX, 6);
  });

  it('scales the held overturn by the slice’s h0, and takes PR 4’s collapse', () => {
    const lib = library();
    const slice = new CrashCurve(lib, 0.05).slice(front(21, () => 0), 0, 21, 10, 0, flat, createCrashSlice());
    const times = lib.profileTimes({ slope: 0.05, footHeight: 2.1, footDepth: 7 });
    expect(slice.scale).toBe(7);
    expect(slice.collapse).toBe(times.collapseSeconds);
    expect(slice.voidHeight).toBeCloseTo((GRAVITY * times.collapseSeconds * times.collapseSeconds) / 2, 12);
    expect(slice.jetArea).toBeGreaterThan(0);
    expect(slice.width).toBe(1);
    expect(slice.endWeight).toBe(1);
  });

  it('gives an end point half a gap and no weight, as the loft blends a front’s ends into the water', () => {
    const curve = new CrashCurve(library(), 0.05);
    expect(curve.slice(front(21, () => 0), 0, 21, 0, 0, flat, createCrashSlice())).toMatchObject({ width: 0.5, endWeight: 0 });
    expect(curve.slice(front(21, () => 0), 0, 21, 1, 0, flat, createCrashSlice()).endWeight).toBeCloseTo(0.4 * 0.4 * (3 - 0.8), 12);
  });

  it('reads the held frame’s tip velocity, and the drawn crest standing still', () => {
    const motion = new CrashCurve(library(), 0.05).jetMotion(front(1, () => 0)[0], { tipAlong: 0, tipUp: 0, crestSpeed: 0 });
    expect(motion.tipAlong).toBeCloseTo(0.9 * Math.sqrt(GRAVITY * 7), 9);
    expect(motion.tipUp).toBeCloseTo(-0.3 * Math.sqrt(GRAVITY * 7), 9);
    expect(motion.crestSpeed).toBeCloseTo(0, 9);
  });

  it('uses only + − × ÷, √ and floor (online determinism)', async () => {
    const { readFileSync } = await import('node:fs');
    expect(readFileSync('src/wave/barrel/crashCurve.ts', 'utf8')).not.toMatch(/Math\.(sin|cos|tan|exp|log|pow|hypot|atan|cbrt)/);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/wave/barrel/crashCurve.test.ts`: it fails (missing module).
- [ ] **Step 3: Implement `crashCurve.ts`** by the rule. It keeps one `Float32Array(2 * PROFILE_POINTS)` for profiles. The module doc cites spec 13.6, the advisor's PR 4 rulings (the held frame's velocity during the collapse; the drawing keeps the touchdown frame) and the coordinator's heads-up on the landing, and says to keep the mirror in step with `SweptLoft.loftFront`.
- [ ] **Step 4: Run** the tests and `npx tsc --noEmit -p .`: PASS.
- [ ] **Step 5: Commit:** "feat(barrel): the crash curve: where a front point's lip lands on its drawn touchdown frame, with its held jet and void".

### Task 3: The lip holds a swept barrel's jet, and pours it at the crash

**Files:**
- Modify: `src/wave/PlungingLip.ts`, `src/wave/SprayCloud.ts`
- Test: `src/wave/PlungingLip.test.ts`, `src/wave/SprayCloud.test.ts`

**Interfaces:**
- Produces:

```ts
/** A swept barrel's jet (the Padang Padang spec, Part B, PR 5), taken from the crest at its throw and held until it pours. */
export interface SweptJet {
  /** The crest cell its water leaves, its horizontal velocity (m/s), the water asked (m³) and the breaking wave's height (m). */
  cell: number; velocityX: number; velocityZ: number; volume: number; waveHeight: number;
  /** Where it left the crest, m: its landings' drop, and the plunge zone's back, are measured from there. */
  launchX: number; launchY: number; launchZ: number;
  /** The pour as foreseen at the throw: from where (m), starting how long from now and how far apart (s), falling how fast (m/s). */
  pourX: number; pourY: number; pourZ: number; pourIn: number; pourSpacing: number; pourVY: number;
  /** Its void: its length along its axis (m), the axis (unit, forward and down), its height W (m), its cross-section (m²) and the crest it spans (m). */
  voidLength: number; axisX: number; axisY: number; voidHeight: number; voidArea: number; span: number;
  /** The drawn crest: which way it travels (unit), how fast (m/s), and how much faster the tip runs (m/s). */
  dirX: number; dirZ: number; crestSpeed: number; relativeSpeed: number;
}
holdJet(jet: SweptJet): { strip: number; thrown: number }                     // strip −1: nothing thrown (pool full, no water)
crashJet(strip: number, pour: { x: number; y: number; z: number; spacing: number; vy: number }, crest: { x: number; y: number; z: number }): boolean
movePour(strip: number, x: number, y: number, z: number): void
```

- `LipFlight.swept: boolean`, and `LipImpact.y?: number` (a swept landing's own height; its spray rises from there).
- **Swept strips** carry `swept: true`, and their tubes `area`, `span`, `axisX` and `axisY`.
  - They never enter the tube table, so they carve nothing.
  - Their parcels are released from where they stand, never lifted to a rising crest.
  - Their void's air is `area × span` (in place of LH82 × L × W × the column's width), and its mouth's cross-section is `area`.
  - Their void's axis is `(axisX, axisY)` in place of `cos`/`sin` of the tilt; `geometry.width` is W, so G9's collapse, √(2W/g), is PR 4's.
  - Their foam ball spans `span`.
  - The rest of the lip, and every other spot's, is unchanged.
- **`crashJet`** closes the void now (trapping its air, if not already closed), re-places the void about the drawn crest, and reschedules the waiting parcels from now, `spacing` apart.
- **The handover** carries `swept` and the tubes' new fields.

- [ ] **Step 1: Write the failing tests** (a new `describe` in `PlungingLip.test.ts`, on its `basin()` and `flowingCrest()`):

```ts
describe('a swept barrel’s held jet (Padang Padang, Part B, PR 5)', () => {
  const water = (solver: ShallowWaterSolver) => solver.h.reduce((sum, h, i) => sum + h * solver.dx * solver.dz[Math.floor(i / solver.nx)], 0);
  const jet = (solver: ShallowWaterSolver, overrides: Partial<SweptJet> = {}): SweptJet => ({
    cell: 11 * solver.nx + 3, velocityX: 0, velocityZ: 4, volume: 0.3, waveHeight: 0.8, launchX: 3.5, launchY: 2.8, launchZ: 11.5,
    pourX: 3.5, pourY: 2.2, pourZ: 14, pourIn: 0.5, pourSpacing: 0.05, pourVY: -2,
    voidLength: 1, axisX: 0.8, axisY: -0.6, voidHeight: 0.4, voidArea: 0.3, span: 1,
    dirX: 0, dirZ: 1, crestSpeed: 3, relativeSpeed: 1, ...overrides,
  });

  it('holds its water off the crest until it pours, neither flying nor carving, then lands it all', () => {
    const solver = basin();
    const lip = new PlungingLip(solver);
    const before = water(solver);
    const { strip, thrown } = lip.holdJet(jet(solver));
    expect(strip).toBeGreaterThan(0);
    expect(thrown).toBeCloseTo(0.3, 9);
    expect(water(solver) + lip.airborneVolume()).toBeCloseTo(before, 9);
    lip.step(0.1);
    let flying = 0;
    lip.forEachActive(() => { flying += 1; });
    expect(flying).toBe(0);
    expect(lip.tubeCount).toBe(0);
    for (let k = 0; k < 40; k += 1) lip.step(0.05);
    expect(lip.airborneVolume()).toBe(0);
    expect(water(solver)).toBeCloseTo(before, 9);
  });

  it('balances the water’s forward momentum through the hold, the pour and the splash-ups', () => {
    const solver = basin();
    flowingCrest(solver);
    const lip = new PlungingLip(solver);
    const before = momentumZ(solver);
    lip.holdJet(jet(solver));
    for (let k = 0; k < 60; k += 1) lip.step(0.05);
    expect(lip.airborneVolume()).toBe(0);
    expect(momentumZ(solver)).toBeCloseTo(before, 9);
  });

  it('closes its void at the crash, traps its own air, and pours from the crash a parcel every spacing, where the pour has moved', () => {
    const solver = basin();
    const lip = new PlungingLip(solver);
    const { strip } = lip.holdJet(jet(solver, { pourIn: 10 }));
    lip.step(0.05);
    const trapped = lip.trappedAir;
    expect(lip.crashJet(strip, { x: 3.5, y: 2.4, z: 15, spacing: 0.1, vy: -3 }, { x: 3.5, y: 2.8, z: 13 })).toBe(true);
    expect(lip.trappedAir - trapped).toBeCloseTo(0.3 * 1, 12);
    const landed: { z: number; swept: boolean }[] = [];
    lip.onLand = (x, z, volume, vx, vy, vz, flight) => landed.push({ z, swept: flight!.swept });
    lip.step(0.05);
    lip.movePour(strip, 3.5, 2.4, 16);
    for (let k = 0; k < 40; k += 1) lip.step(0.05);
    const jets = landed.filter((landing) => landing.swept);
    expect(jets.length).toBe(STRIP_PARCELS);
    expect(jets[0].z).toBeLessThan(15.5);
    expect(jets.at(-1)!.z).toBeGreaterThan(16);
  });

  it('spits its air toward the barrel’s open end: a neighbour still held', () => {
    const solver = basin();
    const lip = new PlungingLip(solver);
    const closing = lip.holdJet(jet(solver, { pourIn: 10 })).strip;
    lip.holdJet(jet(solver, { cell: 11 * solver.nx + 4, launchX: 4.5, pourX: 4.5, pourIn: 10 }));
    lip.step(0.05);
    lip.crashJet(closing, { x: 3.5, y: 2.4, z: 15, spacing: 0.1, vy: -3 }, { x: 3.5, y: 2.8, z: 13 });
    lip.step(0.05);
    expect(lip.spits.length).toBe(1);
    expect(lip.spits[0].dirX).toBeGreaterThan(0.99);
  });

  it('pours a lost point’s jet where and when it was foreseen', () => {
    const solver = basin();
    const lip = new PlungingLip(solver);
    const landed: number[] = [];
    lip.onLand = (x, z) => landed.push(z);
    lip.holdJet(jet(solver, { pourIn: 0.3 }));
    for (let k = 0; k < 40; k += 1) lip.step(0.05);
    expect(landed.length).toBeGreaterThanOrEqual(STRIP_PARCELS);
    expect(Math.min(...landed)).toBeGreaterThanOrEqual(14);
  });

  it('takes no water when the pool can’t hold its parcels', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, STRIP_PARCELS - 1);
    const before = water(solver);
    expect(lip.holdJet(jet(solver))).toEqual({ strip: -1, thrown: 0 });
    expect(water(solver)).toBe(before);
  });

  it('hands a held jet over, and the joiner pours it exactly as the donor', () => {
    const solver = basin();
    const donor = new PlungingLip(solver);
    donor.holdJet(jet(solver));
    donor.step(0.1);
    const copy = basin();
    copy.h.set(solver.h);
    copy.qz.set(solver.qz);
    const joiner = new PlungingLip(copy);
    joiner.importState(JSON.parse(JSON.stringify(donor.exportState())));
    for (let k = 0; k < 30; k += 1) {
      donor.step(0.05);
      joiner.step(0.05);
    }
    expect(Array.from(copy.h)).toEqual(Array.from(solver.h));
    expect(joiner.exportState()).toEqual(donor.exportState());
  });
});
```

In `SprayCloud.test.ts`: a swept impact's spray starts at its own height, and one without `y` at the water's surface as before:

```ts
  it('raises a swept landing’s spray from the landing, not the water under the drawn curl (Part B, PR 5)', () => {
    // A lip impact under a solver surface standing 1 m above it: with y, the drops start at y + 0.05; without, at the surface.
  });
```

(The test builds a one-cell `SprayScene` stand-in as the file's other tests do, and reads the particles' y.)

- [ ] **Step 2: Run** `npx vitest run src/wave/PlungingLip.test.ts src/wave/SprayCloud.test.ts`: the new tests fail.
- [ ] **Step 3: Implement.**
  - `LipStrip` and `LipStripState` gain `swept?: boolean`. `FlyingTube` gains `area?`, `span?`, `axisX?` and `axisY?`. `LipFlight` gains `swept: boolean` (set in `land` from the strip). `LipImpact` gains `y?: number`.
  - `holdJet`: refuse unless `free.length ≥ STRIP_PARCELS` and `volume > 0`. `drawFromCrest(cell, velocity, volume, waveHeight)`; nothing thrown → `{ strip: −1, thrown: 0 }`. Then a strip of STRIP_PARCELS waiting parcels (state 2):
    - released at `time + pourIn + k·pourSpacing`, from (pourX, pourY, pourZ);
    - launched from (launchX, launchY, launchZ), with velocity (velocityX, pourVY, velocityZ);
    - each thrown / STRIP_PARCELS, kind 0, `swept: true`;
    - its tube: `geometry = { length: voidLength, width: voidHeight, tilt: 0 }`, `closedAt` NaN, and the rest as `SweptJet` gives it.
  - `crashJet`: for a swept strip whose tube is open, `closedAt = time`, `air = area × span`, `trappedAir += air`. Re-place the tube: `x = crest.x − dirX·crestSpeed·age`, likewise z; `y = crest.y`. Then its still-waiting parcels (state 2), in strip order, are released at `time + n·spacing` from (x, y, z) with vertical velocity `vy`.
  - `movePour`: its still-waiting parcels to (x, y, z), `px`, `py`, `pz` too.
  - `step`: the crest lift at release only for strips that are not swept.
  - `refreshTubes`: skip swept strips.
  - `land`'s closing air: `(tube.area ?? LH82_AREA × L × W) × (tube.span ?? dx)`.
  - `releaseAir`'s mouth area: `tube.area ?? LH82_AREA × L × W`. The roller's width is `tube.span ?? dx`.
  - `voidCentre` and `breakIntoBubbles`: the axis (`axisX`, −`axisY`) when the tube has one, else `cos`/`sin` of the tilt, as now.
  - `exportState` and `importState` carry `swept`; the tubes' fields ride their spread.
  - `SprayCloud.splash` and `classicSplash`: `const surface = impact.y ?? h + bed` at the impact's cell.
  - `SurfZoneSimulation`'s `onLand` passes `y: flight.y` for a swept flight (Task 4 wires the rest).
- [ ] **Step 4: Run** `npx vitest run src/wave/PlungingLip.test.ts src/wave/SprayCloud.test.ts src/wave/surfZoneState.test.ts`: PASS, the existing tests unchanged.
- [ ] **Step 5: Commit:** "feat(lip): a swept barrel's jet held from its throw and poured at its crash, carving nothing, with its void's own air; its spray from the landing".

### Task 4: The barrel's ledger in the surf zone

**Files:**
- Create: `src/wave/barrel/SweptCrash.ts`, `src/wave/barrel/SweptCrash.test.ts`
- Modify: `src/wave/barrel/BreakingFront.ts` (two optional `FrontPoint` fields), `src/wave/SurfZoneSimulation.ts`
- Test: `src/wave/SurfZoneSimulation.test.ts`

**Interfaces:**
- Consumes: `CrashCurve`, `CrashSlice`, `JetMotion` (Task 2); `PlungingLip.holdJet`, `crashJet`, `movePour`, `SweptJet` (Task 3); `waveHeightAt` (`CrestKinematics`).
- Produces:
  - `FrontPoint.jetStrip?: number`: the held strip's id from the throw on, −1 when the throw took nothing or came too late;
  - `FrontPoint.crashedAt?: number`: the solver's time at the crash;
  - `SweptCrash`:

```ts
export interface CrashSea {
  solver: ShallowWaterSolver;
  lip: PlungingLip;
  /** Still level, m, and the swell's peak period, s. */
  stillLevel: number;
  period: number;
  /** The solver's breaking strength, and the whitewater's copy of it that the gate withholds (Task 5). */
  strength: ArrayLike<number>;
  whitewater: Float64Array;
}
/** A point pouring this step: where its lip lands, the jet's velocity, and the void's air still to leave, m³ (Part D's crash curve). */
export interface CrashPoint { x: number; y: number; z: number; vx: number; vy: number; vz: number; air: number }
export class SweptCrash {
  readonly counts: { throws: number; crashes: number; late: number; missed: number; starved: number; onsets: number; gated: number };
  readonly curve: CrashPoint[];
  constructor(library: ProfileLibrary, slope: number);
  /** One step, after the clocks advanced: the throws, crashes and pours, and the whitewater gate. Returns this step's throws and their water. */
  update(points: FrontPoint[], sea: CrashSea): { throws: number; volume: number };
}
```

  - `SurfZoneSimulation`:
    - `constructor(config, start = 'spun-up', barrel?: ProfileLibrary)`;
    - `readonly crash?: SweptCrash`, present when `sweptBarrelOn(config)`, `BARREL_SLOPE[config.spot]` and `barrel` are all given;
    - `get whitewaterStrength(): ArrayLike<number>`.

**The rule**, per front point in `update`, fronts by their runs as the loft reads them (a front of fewer than two points, or all at one σ, has no barrel):
1. **Throw:** `jetStrip` unset and τ ≥ 0.
   - τ ≥ touchdown + collapse: `jetStrip = −1`, `missed` + 1.
   - Otherwise take `jetArea × width × endWeight` from the crest cell under the point (`solver.cellIndex(x, z)`), with velocity `tipAlong × ray` and the wave's height `waveHeightAt(solver, cell, 0.5 × crestSpeed × period)`. Hold it with its pour foreseen at the landing on the throw's anchor (the handover not yet begun), `touchdown − τ` from now, `collapse / (STRIP_PARCELS − 1)` apart. The launch is the drawn crest at the throw (x, throwZ, still + the crest's height).
   - Starved throws are counted.
2. **Crash:** `jetStrip ≥ 0`, `crashedAt` unset and τ ≥ touchdown. `crashJet` from the landing now, with the drawn crest; `crashedAt = time`. If τ ≥ touchdown at the first sight, count `late`.
3. **Pour:** crashed and τ < touchdown + collapse. `movePour` to the landing, and push the point to `curve`.
4. **Overlapping fronts** (added after PR 4's a211247: the loft draws the first front where two overlap). A later front's point whose footprint overlaps a live point of an earlier front throws nothing and gates nothing, counted as `covered`. The footprint is its slice's reach with the extensions, half its share of the front either side, judged by the loft's separating-axes test.

In `SurfZoneSimulation`:
- `throwLip` returns at once when `crash` is set, counting `crash.counts.onsets`.
- `advanceFront` calls `crash.update` after `advanceClocks`, adding its throws to `lipLaunches` and `lipJets` and their water to `lipVolume`.
- `onLand` passes the swept flight's height as the impact's `y`.
- `foam.update` takes `whitewaterStrength`.

- [ ] **Step 1: Write the failing tests.** `SweptCrash.test.ts`, on `PlungingLip.test.ts`-style basins (a wall-bounded `ShallowWaterSolver` with a crest hump along z 10–13), the `tubeCase` library, and fronts built as in Task 2:
  - it throws each point's jet at its throw, crashes it at its touchdown, and pours it from the landing, with the counts;
  - it balances the water: what the crests gave is what landed or is still held;
  - it throws and pours at once for a point first seen past its touchdown, and nothing past its collapse;
  - it pours a lost point's jet where it was foreseen;
  - it moves no water for a front of one point;
  - a source test: only + − × ÷ and √.

  In `SurfZoneSimulation.test.ts`, in "the swept barrel's breaking front":

```ts
  it('throws no Kennedy lip at a swept spot with the library, and pours the barrel’s jets from its crash curve, water balanced', () => {
    const simulation = new SurfZoneSimulation(padang(), 'spun-up', libraryFromBytes(readBarrelCases()));
    let thrown = 0;
    let landed = 0;
    const previous = simulation.lip.onLand!;
    simulation.lip.onLand = (x, z, volume, vx, vy, vz, flight) => {
      landed += volume;
      previous(x, z, volume, vx, vy, vz, flight);
    };
    for (let frame = 0; frame < 30 * 30; frame += 1) {
      const volume = simulation.lipVolume;
      simulation.step(1 / 30);
      thrown += simulation.lipVolume - volume;
    }
    const { counts } = simulation.crash!;
    expect(counts.onsets).toBeGreaterThan(0);
    expect(counts.throws).toBeGreaterThan(0);
    expect(counts.crashes).toBeGreaterThan(0);
    expect(simulation.lipJets).toBe(counts.throws);
    expect(simulation.exportState().lip.strips.every(([, strip]) => strip.swept || strip.kind === 1)).toBe(true);
    expect(thrown).toBeCloseTo(landed + simulation.lip.airborneVolume(), 6);
  }, 1_800_000);

  it('hands a sea over with jets held and pouring, and the joiner pours them exactly as the donor', () => {
    // As the front's handover test: a donor with the library runs until it holds jets (throws > crashes), a joiner built
    // with the library imports its state, both step 5 s; the lips, the fronts and the arrays match.
  }, 1_800_000);

  it('keeps Kennedy’s lip without the library', () => {
    expect(new SurfZoneSimulation(padang(), 'warm').crash).toBeUndefined();
  });
```

- [ ] **Step 2: Run** `npx vitest run src/wave/barrel/SweptCrash.test.ts` and `npx vitest run src/wave/SurfZoneSimulation.test.ts -t "Kennedy"`: they fail.
- [ ] **Step 3: Implement** as above. `SweptCrash`'s doc cites spec 13.1 and 13.6 and the advisor's rulings.
- [ ] **Step 4: Run** the new tests, then `npx vitest run src/wave/barrel src/wave/PlungingLip.test.ts src/wave/surfZoneState.test.ts` and `npx vitest run src/wave/SurfZoneSimulation.test.ts -t "swept barrel"`. The front's existing tests run without the library, unchanged. PASS.
- [ ] **Step 5: Commit:** "feat(barrel): the swept barrel's jets leave the crest at its throw and pour from its crash curve; Kennedy's lip off at a swept spot".

### Task 5: The whitewater from the barrel's clock

**Files:**
- Modify: `src/wave/barrel/SweptCrash.ts`, `src/wave/SurfZoneSimulation.ts`
- Test: `src/wave/barrel/SweptCrash.test.ts`, `src/wave/SurfZoneSimulation.test.ts`

**The rule:**
- At the start of `update`, `whitewater.set(strength)`.
- For every point with τ < touchdown and a positive end weight, the cells of its column (the column of its x) whose centres lie between `anchor + reachBack·n̂` and `anchor + reachFront·n̂` in z get 0. They are counted in `gated`.
- `SurfZoneSimulation.whitewaterStrength` is that copy at a swept spot with the crash, and `breaking.strength` itself anywhere else.
- `foam.update` reads it, and so do the bore spray and the bubbles (through `foam.source`), and `aerateBores` (the bore's air and its turbulence, ruling 9b).
- The rider's roller push keeps the solver's own strength (ruling 9c): a known inconsistency, recorded in "The crash".

- [ ] **Step 1: Write the failing tests:**
  - (`SweptCrash.test.ts`) it withholds the breaking from the whitewater over a curl before its touchdown, and gives it back at touchdown. A basin with strength 1 everywhere and a pre-touchdown front: 0 in its columns' footprint rows and 1 beyond; past touchdown, 1 everywhere.
  - (`SurfZoneSimulation.test.ts`):

```ts
  it('gives the foam the solver’s own breaking at every spot without the crash', () => {
    const canyon = new SurfZoneSimulation({ ...small, spot: 'canyon' }, 'warm');
    expect(canyon.whitewaterStrength).toBe(canyon.breaking.strength);
    const alone = new SurfZoneSimulation(padang(), 'warm');
    expect(alone.whitewaterStrength).toBe(alone.breaking.strength);
  });
```

- [ ] **Step 2: Run:** fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the barrel tests and the simulation's swept tests. PASS.
- [ ] **Step 5: Commit:** "feat(barrel): the whitewater waits for the barrel's touchdown: the foam's bore source withheld over the open curl".

### Task 6: The runner: the library in the simulation, the roar and the sounds

**Files:**
- Modify: `src/wave/SurfZoneRunner.ts`
- Test: `src/wave/SurfZoneRunner.test.ts`

**The change:**
- The runner decodes the cases once when `barrelCases` are given at a swept spot with a `BARREL_SLOPE`. It hands the library to the simulation (every sea there, rider or none) and to the contact (with a rider or board, as before).
- `measureRoar` reads `simulation.whitewaterStrength`.
- The lip hits are unchanged: they come from `lipImpacts`, now the pour's and its splash-ups' landings.

- [ ] **Step 1: Write the failing tests** (in "the swept contact in the surf zone"):

```ts
  it('runs the crash with the cases at Padang Padang, with or without a rider, and hears only the barrel’s landings', () => {
    const runner = new SurfZoneRunner(padang, { barrelCases: readBarrelCases() });
    expect(runner.simulation.crash).toBeDefined();
    expect(runner.contact).toBeUndefined();
    expect(new SurfZoneRunner(padang).simulation.crash).toBeUndefined();
    const heard: number[] = [];
    const buffers = runner.createBuffers();
    for (let batch = 0; batch < 60; batch += 1) {
      runner.advance(2);
      const crashes = runner.simulation.crash!.counts.crashes;
      runner.fill(buffers);
      // A landing heard before the first crash would be Kennedy's lip's.
      if (crashes === 0) expect(buffers.lipHitCount).toBe(0);
      heard.push(buffers.lipHitCount);
    }
  }, 600_000);
```

- [ ] **Step 2: Run:** fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run src/wave/SurfZoneRunner.test.ts src/audio src/game/PhysicalMode.barrel.test.ts`. PASS.
- [ ] **Step 5: Commit:** "feat(barrel): every sea at a swept spot runs the crash from the page's cases; the roar keys on the barrel's whitewater".

### Task 7: Measure, document, open the PR

**Files:**
- Create: `src/wave/probes/padangCrash.probe.test.ts`
- Modify: `docs/research/barrel-library.md` ("The crash"), `docs/superpowers/plans/2026-09-29-padang-padang-part-b.md` (PR 5's status)

- [ ] **Step 1: Write the probe.** Padang Padang's Small swell at 1 m cells (as `padangLoft`), with the library, for SECONDS (180). Every 30 s it logs:
  - points, throws, crashes, late, missed, starved (and the starved water);
  - the jets held and pouring;
  - the jet per metre;
  - the pour's impact speeds;
  - the gated cells;
  - the crash's update in ms a step, against the step's.

  At the end it logs:
  - the water balance (Σ thrown against Σ landed plus airborne);
  - Kennedy's lead removed: per column, the onset against the throw and the touchdown;
  - the crash curve's run along the front (its speed against the peel);
  - the landing's distance ahead of the solver's crest.

  A second, shorter sea without the library logs the Kennedy lip's asked water per metre, for decision 3.
- [ ] **Step 2: Run it** with `uptime` before and after: `PROBE=1 SECONDS=180 LOG=.superpowers/pr5/padang-crash.txt npx vitest run src/wave/probes/padangCrash.probe.test.ts`.
- [ ] **Step 3: Write "The crash"** in `barrel-library.md` [measured, with the load]. Send the numbers to the advisor. Mark PR 5 in the Part B plan.
- [ ] **Step 4: Run the targeted suites and the build:**
  - `npx vitest run src/wave/barrel src/scene/barrel src/audio src/wave/PlungingLip.test.ts src/wave/SprayCloud.test.ts src/wave/surfZoneState.test.ts src/wave/SurfZoneRunner.test.ts`;
  - `npx vitest run src/scene/waterLooks.test.ts` (no snapshot changes);
  - `npx tsc --noEmit -p .`;
  - `npm run build`.
- [ ] **Step 5: Commit, push, and open the PR** into `claude/padang-contact`: "The swept barrel's crash curve, pour and sound at Padang Padang (Part B, PR 5)". The body gives the rulings, the tests and their results, the cost with the load, and what's left.
