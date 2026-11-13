# Why the side force per sideslip changes sign past 15° of rail (ruling 29s)

Written 2026-11-13 by the rail-dig agent (Opus 5, effort high), on branch `claude/rail-dig` from main f49f0e12.
No change to `src/`. Probes (`dig.probe.ts`, `shape.probe.ts`) and this note only.

Tags: [M] measured by a probe here; [R] read in the code; [S] from a source, with a link; [I] my inference.

All numbers come from the roll-plant lab on flat still water, with the corrected harness (the level sideslip, the
roll-rate hold's vertical term a set). No ride session, no game page.

## 1. Short answer

**The rail does not skim, and the fins do not go flat. The flip is the board sinking.**

When the board is on its rail and it slides sideways, its flat bottom loses lift. The board answers by dropping in
the water. On a heeled board, dropping is sideways: the bottom's lift points out of the low rail, so a drop pushes the
board further the way it was already sliding. That push is as big as everything holding the slide, and past about 18°
of rail it is bigger. [M]

- **The fins keep their grip.** Heeled, the fin law gives exactly cos²(heel) of its upright side force per degree of
  slide: 24.8 N/° upright, 14.5 N/° at 40° (cos²40 = 0.587 × 24.8 = 14.6). It never changes sign. At the trim of a real
  turn the fins give *more*, not less, up to 20° of rail. **Rival explanation (a) is ruled out.** [M]
- **The hull's lift is what flips.** Per radian of slide at 7 m/s, the hull pressure's side force goes −8 N upright,
  −1340 at 10° of rail, −3925 at 20°. That is the whole flip. The fins stay at +1286 to +2392, the rails at +82 to
  +175. [M]
- **It is a trim effect, not a force law.** Hold the board's pitch and its height still and **nothing flips at any
  rail**: the side force per slide grows from +1398 to +2257 N/rad between 0° and 40° at 7 m/s. Let the pitch and the
  height go free and it crosses zero at about 18°. [M]
- **The link is huge.** With the pitch and the height held, 1° of slide costs the hull 7–9 % of the board's weight in
  lift. Free, the board sinks 1.5–1.8 cm per degree of slide at 20–40° of rail, and the water gives 1.8–4.2 kN of side
  force per metre of sink. The two products nearly cancel; the leftover is the flip. [M]
- **The published numbers are 3 to 9 times too big.** The 0.6 s hold the 3.2f derivative uses lands on the heave's
  overshoot. Held 3–4 s, the side force per slide at 7 m/s settles at **−186 N/rad at 20° of rail and −476 at 40°**,
  not −1387 and −4143. **The sign flip is real; its size is not.** At 5 m/s there is no flip at all up to 20°. [M]
- **But the rail really is a razor.** The side faces the solver gives the board are **3 to 5 mm tall** (the shape's
  rail taper is 0.925), 0.0074 m² a side, and the low one is fully wetted by 2.5 mm under. It stops growing at 15° of
  rail and carries 3–10 % of the side force at every angle. So the owner's picture is right about the model — there is
  no rail in it — but a rail is not what the flip is made of. [M, R]
- **The answer to the question is (d)**, something else: the heave and pitch answer to the lift a slide costs at heel.
  **(b)** is true of the model but is not the cause. **(a)** is ruled out. Section 6 says what would change it.

## 2. The lab

`dig.probe.ts`, on `../roll-plant/plant.ts`: the real `BoardBody`, a rigid 73 kg point rider (the game's riders' own
yaw inertia, none), 32 substeps, flat still water, towed at 5, 7 and 9 m/s. The board is first held at the rail with its
yaw and sideslip **free** for 8 s, so it settles into the turn that rail makes (the trim). The derivatives are central
differences about that trim, with the roll, the level sideslip and the yaw rate held.

Three things are new here:

1. **Every perturbation's force is split by contributor** — hull pressure (and its left and right halves), buoyancy,
   friction, radiation and entry, added mass, each fin, each rail side face, and the patches inside the wetting ramp —
   the same ledger the roll-plant study used at 0° of rail, now at every rail.
2. **`FREEZE=on` holds the pitch and the centre of mass's height at the trim too.** That separates the force law's own
   answer to a slide from the board's re-trim in heave and pitch.
3. **The geometry is read at each rail**: draft, wetted bottom area, each rail's wetted side area and how deep it sits,
   and each fin's immersed span and attack angle.

`PART=trace` holds a 1° slide for 4 s with the pitch and heave free, and reports the side force per slide against how
long the step has been held.

Results: `results/rail-free.jsonl`, `rail-frozen.jsonl`, `chain.jsonl`, `slip-step-trace.jsonl`, `finlaw.jsonl`,
`shape.jsonl`.

## 3. The flip reproduced, and what it is made of

### 3.1 Y per radian of sideslip, by contributor (7 m/s; + resists the slide)

Pitch and height **free**, the 0.6 s hold, as 3.2f measured it:

| Rail | All | Hull pressure | Friction | Fins | Rails | (of which the wetting ramp) | 3.2f published |
|---|---|---|---|---|---|---|---|
| 0° | **+1398** | −8 | +37 | +1286 | +82 | −4 | +1398 |
| 10° | **+715** | −1340 | +61 | +1861 | +133 | −277 | +825 |
| 15° | **−255** | −2817 | +82 | +2331 | +150 | +405 | — |
| 20° | **−1266** | −3925 | +91 | +2392 | +175 | +244 | −1387 |
| 30° | **−2084** | −4099 | +84 | +1772 | +159 | +1776 | −2610 |
| 40° | **−1382** | −2114 | +41 | +595 | +96 | +2371 | −4143 |

- The flip is **the hull pressure**, by itself. Nothing else changes sign. [M]
- The fins never flip and do not fade until past 20°. The rails are 3–10 % at every angle. [M]
- Buoyancy, radiation, entry and added mass give **no** side force on flat water: they act along the water surface's
  own normal, which is straight up ([R] `BoardBody.ts` 1120: `surfaceNormal` is `sample.normalX/Y/Z`). [M, R]
- The ramp row is not an extra force; it is the share of the pressure that comes from part-wetted patches (`WET_RAMP`,
  1 cm). At 30° and 40° it is as big as the whole derivative and the opposite sign, which is a warning about those two
  rows. At 15° and 20°, where the flip happens, it is small. [M]
- I reproduce 0°, 10° and 20° within 8 %. I do **not** reproduce 30° and 40° (−2084 and −1382 against −2610 and
  −4143). Section 5 says why: those two readings are a transient, and they are not repeatable. [M]

### 3.2 The same thing with the pitch and the height held still

| Rail | All | Hull pressure | Fins | Rails | Vertical force per rad of slide |
|---|---|---|---|---|---|
| 0° | **+1398** | −8 | +1286 | +82 | 0 |
| 10° | **+1536** | +124 | +1275 | +101 | −3038 N |
| 15° | **+1682** | +278 | +1254 | +114 | −3843 |
| 20° | **+1817** | +467 | +1207 | +111 | −3987 |
| 30° | **+2093** | +928 | +1058 | +81 | −3578 |
| 40° | **+2257** | +1406 | +773 | +58 | −2867 |

**Nothing flips.** The side force per slide *grows* with the rail. The hull pressure is now on the right side of the
fight (the tilted lift reacting to the slide), and the fins fall exactly as cos²(heel): 1286 → 773 = 0.60, against
cos²40 = 0.587. The same at 5 and 9 m/s (`results/rail-frozen.jsonl`). [M]

The last column is the whole story: **a slide costs the hull lift.** At 7 m/s, 1° of slide removes 50 to 70 N, which is
7 to 9 % of the board and rider's 746 N. [M]

Why: the bottom is a flat plate (3.4). Its incidence to the flow is the trim, about 9° at 7 m/s. Heeled by φ and slid
by β, the speed into the bottom goes as `cos β cos φ sin θ + sin β sin φ`, so the slide changes it at `tan φ / sin θ`
of itself: 2.25 per radian at 20° of rail and 9° of trim, 3.9 % per degree. Measured 9.4 % per degree — the rest is the
waterline sweeping across the flat width as the board heels. [I, M]

### 3.3 The fin law on its own

`PART=finlaw`, no board: the three fins, heeled, with a level sideslip across them. Side force per degree of slide at
7 m/s (`results/finlaw.jsonl`): [M]

| Heel | 0° | 10° | 15° | 20° | 30° | 40° | 45° | 60° |
|---|---|---|---|---|---|---|---|---|
| N per degree | 24.8 | 24.0 | 23.1 | 21.9 | 18.6 | 14.5 | 12.4 | 6.2 |
| cos²(heel) × 24.8 | 24.8 | 24.0 | 23.1 | 21.9 | 18.6 | 14.6 | 12.4 | 6.2 |

Exactly cos². `finForce` works in the board's own x–z plane ([R] `finForces.ts`, `planeForce` takes `ux` and `uz` and
ignores the board-frame vertical), so a heeled fin sees cos(heel) of a level slide, and the force it answers with lies
along the board's lateral axis, whose level part is another cos(heel). **So heel costs the fins 41 % of their grip at
40° and no more. They cannot make a sign change.** [M, R]

### 3.4 The board's across-shape, and its rails

`shape.probe.ts`, `results/shape.jsonl`: [M, R]

- **Every bottom patch's normal has x = 0.** The hull is a flat plate across its whole width: no deadrise, no vee, no
  concave, no rail curve. ([R] `boardShape.ts`: `normal: { x: 0, y: -1/norm, z: slope/norm }`, and `position.y` is
  `rocker(s)` whatever the across position is.)
- The rail side faces the solver gives it (`BoardBody.buildFoils`) are a rectangle a station long at each rail, as tall
  as the board's thickness there times (1 − taper). **The taper is 0.925**, so those heights are
  **3.0, 4.0, 4.6, 4.8, 5.0, 5.0, 5.0, 4.8, 4.6, 4.1, 3.1, 1.8 mm**, tail to nose. Total 0.00736 m² a side.
- For comparison, the three fins are 0.0285 m² and 11.5 cm deep. **The whole rail is a quarter of the fin area and
  4 mm tall.** [M]
- Each face wets over its own height (`0.5 + depth/height`), so a rail face is fully wetted by 2.5 mm under water.
- **Where the razor comes from.** The reference board is 1.778 × 0.464 × 0.0667 m holding 0.02575 m³. A flat-bottomed
  box of that outline and that thickness holds far more, so `buildBoardShape` solves the across taper `t(1 − a u²)` to
  make the volume right, and gets **a = 0.925**: the whole volume error is taken out of the rails. The thickness at the
  edge is 0.0667 × (1 − 0.925) = **5.0 mm**. So the razor rail is not a design choice about rails; it is the price of
  giving a flat-bottomed hull the right volume. [R, I]

## 4. How deep the board sits at each rail

At the trim of each rail; flat water, surface at 0. `results/rail-free.jsonl`, `part: trim`. [M]

| Speed | Rail | Draft | Wetted bottom | of the planform | Low rail: wetted side area | its share | its deepest point | High rail: wetted area |
|---|---|---|---|---|---|---|---|---|
| 7 m/s | 0° | 9.1 cm | 0.312 m² | 50 % | 0.00348 m² | 0.45 | 8.9 cm | 0.00348 m² |
| 7 | 10° | 10.2 | 0.306 | 49 % | 0.00463 | 0.58 | 10.6 | 0.00241 |
| 7 | 15° | 12.0 | 0.301 | 49 % | **0.00535** | 0.67 | 12.7 | 0.00170 |
| 7 | 20° | 12.8 | 0.286 | 46 % | **0.00535** | 0.67 | 13.8 | 0.00170 |
| 7 | 30° | 13.7 | 0.265 | 43 % | **0.00535** | 0.67 | 15.3 | 0.00044 |
| 7 | 40° | 14.6 | 0.239 | 39 % | **0.00535** | 0.67 | 16.6 | 0.00000 |
| 9 m/s | 0° | 6.1 | 0.314 | 51 % | 0.00351 | 0.46 | 5.9 | 0.00351 |
| 9 | 20° | 7.9 | 0.238 | 38 % | 0.00535 | 0.67 | 8.9 | 0.00000 |
| 9 | 40° | 8.6 | 0.176 | 28 % | 0.00535 | 0.67 | 10.7 | 0.00000 |
| 5 m/s | 0° | 21.5 | 0.284 | 46 % | 0.00315 | 0.42 | 21.3 | 0.00315 |
| 5 | 20° | 24.1 | 0.301 | 49 % | 0.00463 | 0.58 | 25.1 | 0.00241 |

What this says:

- **The board does go deeper on its rail**: the low rail's deepest point goes from 8.9 cm to 16.6 cm at 7 m/s, and the
  draft from 9.1 to 14.6 cm. So the board is not simply skating on top. [M]
- **But the side area that resists the slide stops growing at 15° of rail.** 0.00348 → 0.00535 m², and then flat at
  every bigger rail, because the faces are 3–5 mm tall and the low ones are already fully under. 0.00535 of 0.00736 is
  73 % of the face area; the dry rest is nose stations out of the water altogether. **This is the owner's "the rail
  skims", in the model's own numbers:
  there is no buried rail, there is a wetted 4 mm strip whose area caps out at a third of a carve's rail angle.** [M]
- **The high rail comes right out** (0.00348 → 0 at 7 m/s by 40°), as it should.
- **The wetted bottom falls hard**: half the planform upright, 39 % at 40° of rail at 7 m/s, 28 % at 9 m/s. A flat
  plate heeled 40° with 14 cm of draft and 46 cm of beam has most of its width in the air. [M]
- The fins stay immersed until 30° (immersed share 1.00 at 0–20°, 0.88 at 40° at 7 m/s, 0.69 at 9 m/s). So their fade
  is the cos² of the law, not a loss of water. [M]

## 5. The chain, link by link, and the timing

`PART=chain` measures every link at each rail (`results/chain.jsonl`). 7 m/s: [M]

| Rail | Lift lost per rad of slide | Side force per metre of sink | Sink per rad of slide | Pitch per rad of slide | Y per slide, frozen | Y per slide, settled free |
|---|---|---|---|---|---|---|
| 10° | −3038 N | +1055 N/m | −0.46 m | +1.55 rad | +1536 | +936 |
| 15° | −3843 | +1431 | −0.88 | +1.80 | +1682 | +405 |
| 20° | −3987 | +1753 | −1.05 | +1.58 | +1817 | **−188** |
| 30° | −3578 | +3141 | −1.03 | +0.83 | +2093 | **−798** |
| 40° | −2867 | +4156 | −0.82 | +0.05 | +2257 | **−610** |

At 20° of rail: the slide holds at +1817, the sink gives 1753 × (−1.05) = −1836, and what is left is −19 against the
−188 measured (the pitch adds −86, the rest is the chain not being linear). **The flip is the small leftover of two
forces of about 1800 N each.** That is why it has been so hard to find: nothing in the model is wrong by 4000 N; two
right things nearly cancel. [M, I]

And a note on the sink: the board drops **1.5 to 1.8 cm per degree of sideslip** at 20–40° of rail, settled. Its whole
draft is 13–15 cm. That is a soft board on a soft spring — the heave stiffness at the rail is 2.2–4.0 kN/m, about the
hydrostatic waterplane's own ρgA — and it is why the slide reads as a side force. [M]

### 5.1 The 0.6 s hold reads the overshoot (a third fault in the harness)

`PART=trace`: a 1° slide held at the trim, pitch and heave free. Side force per radian of slide against how long it has
been held, 7 m/s (`results/slip-step-trace.jsonl`): [M]

| Rail | 0.1 s | 0.25 | 0.35 | 0.5 | **0.6** | 0.85 | 1 | 2 | 4 | 3.2f published |
|---|---|---|---|---|---|---|---|---|---|---|
| 0° | 1409 | 1409 | 1409 | 1409 | 1409 | 1409 | 1409 | 1409 | 1409 | +1398 |
| 10° | 1146 | 728 | 561 | 917 | 1097 | 960 | 719 | 971 | **937** | +825 |
| 15° | 1034 | 43 | −315 | −143 | 507 | 665 | 352 | 384 | **407** | — |
| 20° | 805 | −467 | −948 | −1003 | −496 | 312 | 0 | −203 | **−186** | −1387 |
| 30° | 1455 | −1372 | −2151 | −1988 | −1644 | −395 | −530 | −570 | **−739** | −2610 |
| 40° | 1458 | −1074 | −2945 | −1344 | −1238 | −1129 | −14 | −364 | **−476** | −4143 |

The sink itself, per degree of slide: −3.9 mm at 0.1 s, −25.5 at 0.35 s, −28.2 at 0.5 s, −24.6 at 0.6 s, then settling
at −18.3 mm by 1.5 s (rail 20). **The heave overshoots by half and takes 1 to 2 s to settle, and it rings.** The
published derivative averages the last 0.25 s of a 0.6 s hold, which sits on that overshoot. [M]

So, after the two faults 3.2f found in this harness, here is a third: **at a rail, 0.6 s is not long enough.** The
settled table at 7 m/s is +1409, +937, +407, −186, −739, −476 for 0, 10, 15, 20, 30, 40°. At 9 m/s it is +2266, ~+1400,
+590, −152, ~−700, −550, and at 5 m/s +712, +521, +252, +107 — **no flip at all up to 20° of rail at 5 m/s.** The
crossing is at about **18° of rail at 7 and 9 m/s** and above 20° at 5. [M]

This matters for ruling 29s. The claim was that past 15° a slide feeds itself so hard that no controller can hold a
carve. What is measured is a slide that feeds itself from about 18° of rail, at a fifth to a ninth of the published
strength, and not growing past 30°. That is a much weaker statement, and whether it kills a carve is now an open
question, not a settled one. [M, I]

## 6. What would change it, and how big

I built none of these. Each is named and sized.

### 6.1 The cheapest test first: the model has no heave, and the flip lives there [R, I]

The flip does not exist in the force law. It exists only in the board's re-trim, and that re-trim takes 1–2 s and
rings. The 3.2 controller's plant is three states — roll, yaw rate, sideslip — with the heave and the pitch taken as
instant. **That assumption is what produces the unstabilisable plant.** Inside the heave's own settling time, the plant
the controller actually meets is the frozen one in 3.2, which never flips and only grows stronger with the rail
(+1398 → +2257). Size of the change: **no `src/` change at all.** Either carry the heave (and pitch) as states in
`rollModel32.ts`, or design on the frozen derivative for the carve's first second and check the result in the game.
This should be tried before touching the hull, because if it works the hull question goes away for the carve.
I did not run the model; this is reasoning from the measurement.

### 6.2 If the rail is to hold, it needs 5 to 8 times the side area, and it must keep growing [M for today, R for the size]

To keep the settled Y per slide positive at 40° of rail at 7 m/s, the rails must find about **+500 N/rad** more. They
give +58 to +96 today on 0.0054 m² of wetted face. The model's own rail law gives
`½ρ·RAIL_PRESSURE·A·V²·cos²(heel)` per radian of slide, which is 14.8 kN/rad per m² at 7 m/s and 40° of heel — and it
checks out against the measurement (0.0054 m² × 14.8 kN = 79 N/rad, measured +58 frozen, +96 free). So **+500 N/rad
needs about 0.034 m² of wetted across-facing area, 6 times today's** — a face **2 to 3 cm tall over 1.2 to 1.5 m** of
the low rail, instead of 4 mm, and it must **grow with the heel** instead of saturating at 15°. That is about what a real
shortboard rail presents laid over at 40–45° [R; practitioners describe carving as 45–70° of rail with the rail buried,
no measured area found]. What the hull model is missing, named:

- **a rail with a body**: an immersed side area that grows with heel and with draft, not a fixed rectangle fully wetted
  by 2.5 mm;
- **buoyancy and volume in the buried rail**: today the rail's volume is in the bottom patches' thickness only;
- **a sharp edge that holds**: a hard rail's edge separates the flow and holds a load across it; the model's rail face
  is a flat-plate pressure with no edge term.

Cost to watch: the same face also makes a side load and a roll moment all the time, not only in the slide you want it
to stop. A 0.034 m² face at 7 m/s and the 3° of slide a 20° turn already carries is about **30 N of side force** and,
sitting about 13 cm under the deck, about **4 N·m of roll moment**; its added drag is small (a couple of N). It will
change every carve number in 3.2. [I]

### 6.3 The real root: the bottom is a flat plate across [M, R, S]

The lift collapse that drives the flip is a property of **zero deadrise**. Every bottom patch has the same normal, so a
slide at heel changes the incidence of the whole bottom one way, and there is nothing to cancel it. The classical
explanation of a planing hull's side force in drift rests on exactly that cancellation: a drift raises the effective
trim on one side of the hull bottom and lowers it on the other, and the horizontal parts of the two changed lifts
oppose each other [S, via a search summary, not read: see 7]. Our hull has no two sides.

Size: `dV/dslip` would have to fall from 3.0–4.0 kN/rad toward about half that for the settled Y to stay positive to
30° of rail. Giving the bottom a vee or a concave puts part of its area at a lower effective heel, which is the
mechanism, but **I have no measured number for how much a given deadrise buys**, and this is the biggest change of the
three: it touches `boardShape.ts`'s patch normals and so every force in the game. **Not recommended before 6.1 and 6.2
are tried.** [I]

### 6.4 What a real thruster does at 40° [R, no source]

The question was asked and I could not answer it from a source. What the model does is clear and self-consistent: it
keeps cos²(heel) of its grip, 59 % at 40°, and its angle of attack at the trim of a 40° turn is only 1.1–1.6°, far
below the 18° stall. A real fin at 40° of heel is at 50° to the vertical, so part of its force becomes lift rather than
grip, which is the model's cos² — and the model is probably about right there. What a real one also does, and the model
does not, is work in water that is already turning up the wave's face; that is a wave question, not this one. I found
no measured fin data at heel. [I]

## 7. Sources

Measured, sourced and inferred are kept apart. I spent little here, as instructed: the roll-plant study already
recorded that most surfboard-fin and planing-hull papers would not open, and the same held today.

- **The right source for this exact question, and I could not read it.** Savitsky, D., Prowse, R. E. and Lueders, D. H.,
  1958, "High-speed Hydrodynamic Characteristics of a Flat Plate and 20° Dead-rise Surface in Unsymmetrical Planing
  Conditions", NACA TN 4187 (https://ntrs.nasa.gov/citations/19930085133). A towing-tank test of **a flat plate and a
  20° deadrise surface side by side**, in yaw to ±15°, measuring lift, drag, **side force**, and the pitching, rolling
  and yawing moments. That is the comparison 6.3 needs. **Its PDF is over the fetch tool's 10 MB limit, so I have no
  numbers from it.** Its speed coefficients are 7–18; the board at 7 m/s is at about 3.3, below the range. [S, no numbers]
- **The mechanism of a planing hull's side force in drift.** A web-search summary quoted a report ("Evaluation of
  static stability derivatives from standard yawing tests", on archive.org) as saying that a small yaw gives a change
  of effective trim that is positive on one side of the hull bottom and negative on the other, so the lift rises on one
  and falls on the other, and the horizontal parts of those changed lifts are opposite but no longer equal.
  **I could not open the document** (the archive.org download timed out), so this is a search summary, not a source I
  read. It is the cancellation 6.3 rests on, and it needs checking. [S, not read]
- **Planing hulls heeled and yawed, measured derivatives.** Brown, P. W. and Klosinski, W. E., 1994, "Directional
  stability tests of two prismatic planing hulls", Davidson Laboratory, CG-D-11-94
  (https://apps.dtic.mil/sti/pdfs/ADA282728.pdf): the roll-plant study already reported this as a 403. A TU Delft
  high-speed-craft manoeuvring thesis treats the heel–sway and heel–yaw coefficients (Y_φ, N_φ) from static heeled
  model tests; the file I tried returned 404. **No numbers.** [S, no numbers]
- **Drift and heel of planing hulls with side wetting.** A 2021 Turkish-language paper on forward speed's effect on a
  planing hull's side force and yawing moment (https://dergipark.org.tr/en/download/article-file/2048988): the PDF
  fetched but its text would not decode and no extractor was available here. **No numbers.** [S, no numbers]
- **Surfboard rails, practitioner knowledge only.** Carving is described as 45–70° of rail with the rail buried, and
  concave is described as making the rail "stickier" for burying it in a carve
  (https://www.rapturecamps.com/learn-to-surf/surf-maneuvers/carving,
  https://surfsimply.com/magazine/how-a-surfboard-works). **No measured rail area, no side force per degree.** This is
  where 6.2's "about what a real rail presents" comes from, and it is a guess with a shape, not a measurement. [S, qualitative]
- **Surfboard fins at heel:** nothing found with numbers, as before. [—]

## 8. What I did not do

- I did not change `src/`. The probes read it, including private members by name, exactly as the roll-plant lab does.
- I did not run the 3.2 model or the game. 6.1's claim about the three-state plant is reasoning from the measurement,
  not a model run, and it should be checked by whoever owns `rollModel32.ts`.
- I did not re-measure the other eleven derivatives at each rail with the long hold. The same overshoot almost
  certainly inflates `Y per roll`, `K per roll` and `K per slip` too — the roll moment about the feet flips sign in the
  same place and by the same route — but I measured only the side force per sideslip, which is what the ruling turns on.
- I did not test 5 m/s at 30° or 40°: the board holds no turn there (as 3.2f found), so there is no plant about it.
