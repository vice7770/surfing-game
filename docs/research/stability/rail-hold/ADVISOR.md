# 3.6k: a rail that holds — the advisor's design note

*Water-physics advisor (Opus 5.5, xhigh), 2026-11-27. The advisor's hand-back, saved by the coordinator. The probes and
result rows it names are copied into [`advisor/`](advisor/); the TN 4187 download stays in the session scratchpad.
Read-only work on `claude/rail-hold` (= `claude/turn-first` `7e4e149d`, `src` unchanged): no `src/` edit, no commit, no
game rides. Tags: [M] measured (by its own lab runs, or by the cited source where it says so), [R] read in our code,
[S] a source it opened, [I] its inference. The coordinator's checks are in the consult log on `claude/the-record`.*

## Verdict

**A rail force law that holds a 40–50° carve at 6–8 m/s cannot be designed from sources. The lab also shows that a
rail force is not the lever. The advisor recommends going back to Vicente before anything is built.**

1. **The board already carves at 40° at 7 m/s when the rail is held.** In the roll-plant lab (rail held, yaw and slip
   free, rail reached at 80°/s), 30–40° at 7 m/s is a steady turn:
   - G 0.82–0.84;
   - 1.30–1.39 deg/s of turn per degree of rail;
   - 5.6–9.1° outward skid;
   - yaw-rate peak-to-peak 0.07–0.08 rad/s.

   A ±2° slip kick at 40° does not run away: the −2° kick is back within 0.25 s, and the +2° kick settles 1.1° off.
   Rail-dig's settled flip (−188 to −800 N/rad) is measured with the yaw rate held. With yaw free, the slide does not
   feed itself at 7 m/s. [M]
2. **Where the water fails at depth, it oscillates rather than slides.** It is a ~1.4 Hz mode in yaw, skid and heave.
   - At 6 m/s and 40° it grows: the skid swings −3° → −40° in 3 s, then the board spins out and sinks. It still grows
     with the pitch held at 12°.
   - It rings at 8–9 m/s from 30° and at 7 m/s from 45°, with yaw-rate peak-to-peak 0.4–3.2 rad/s. [M]
3. **Every rail law that could be sourced or bracketed makes that mode worse or trips the board** (§3):
   - **The board's own rail thickness.** Rail-dig §6.2's "rail with a body" is a 25.5 mm face, the thickness the
     board's 25.75 L allows with a linear taper. It gives +855 to +923 N/rad of its own grip at 20–40°, but the hull's
     re-trim gives it back:
     - settled −677 N/rad at 30° and −731 at 40°, at 7 m/s, against −800 and −552 shipped;
     - the steady 40° turn at 7 m/s becomes a 1.71 rad/s ring (0.08 shipped).
   - **TN 4187's measured leading-edge force** trips the board at 20–30°.
   - **A two-sided edge** (pressure and suction) trips at 20° at full size, and rings more at a quarter of it. [M]

**What is missing for a sourced design:**
- any measurement past 15° of heel;
- the edge force across zero slip at large heel (its onset and the size of its suction);
- anything at a speed coefficient near 3;
- a measured shortboard rail section. [—]

**It also corrects rail-dig §6.2:** a rail face's grip does not simply add.

## 1. The physics

**NACA TN 4187** (Savitsky, Prowse & Lueders 1958) is the only measured source found for a rail at heel. The advisor
opened pp. 11–27, figs. 26–28 and Table II. The tests: towed brass flat plates (2 in beam, 18 in long) and a 20° vee;
trim 6–30°, roll ±15°, yaw 0–20°; speed coefficient C_V = V/√(gb) 7–18, with every flat-plate test at 14.

- **Side force is the bottom's force tilted.** A flat plate's side force is its bottom normal force tilted (eq. 1), and
  its side force along the board's own axis is "nearly zero". Our pressure law does the same. [S, M; R]
- **The lift loss is real.** Slid toward its low edge, a flat plate loses lift, up to "a complete breakdown in lift at
  low trim angles … with the model submerged" (p. 12). That is rail-dig's chain (slide → lift loss → sink) on a real
  plate. The flip belongs to a flat plate with a thin edge, not to a bug in our law. [S, M]
- **A rail edge of finite thickness carries a force normal to the edge.** The tested thicknesses were 0.091 and 0.182
  of the beam, which is 4.2 and 8.4 cm on our 0.464 m beam.
  - **Positive pressure when the low edge leads into the flow.**
    - C_e′ = E / (½ρV²A), with A the wetted edge area, rises with roll to a plateau of **1.0–1.3** at 10–20° of yaw
      (fig. 27; summary of results, item 5: "approximately 1.3"). Both thicknesses collapse onto one curve.
    - The centre of pressure is about 65 % of the wetted edge length forward of the trailing edge (fig. 28).
    - The onset does not depend on speed for C_V 14–20 (p. 25).
    - It lowers the side force toward the low side. Its effect on lift, drag, pitch and roll is "small". [S, M]
  - **Suction when the flow clings to the rolled-down edge** at small yaw and large roll. It gives "very large
    increases in side force" but is not quantified ("very large negative coefficients having no consistent
    variation"). [S, qualitative]
  - **The switch between the two** (fig. 26, read by eye):
    - at 6° of trim, positive pressure starts at 7.5° of yaw with no roll, and at about 1° with the low side 14° down;
    - at 12° of trim, at 13.5° and about 5.5°;
    - from 18° of trim up, there is no suction region. [S, M]

**Our case** is 40–50° of heel, 9–11° of trim and C_V 3.3 at 7 m/s: 3× past the measured roll and about 4× below the
measured speed coefficient. [I]
- In the steady deep turn the low rail trails, because the board skids 5–12° outward.
- At zero skid, trim and heel alone put the low rail face 6.8° into the flow (asin(sin 10.5° · sin 40°)). The skid
  cancels that: −0.2° at the 7 m/s, 40° trim. So the steady turn sits exactly on the edge force's zero crossing, which
  TN 4187 never measured at large roll.
- Extrapolating fig. 26's switch point in face angle (about trim + 1.5° − 0.37° per degree of roll) goes negative past
  about 28° of roll. That is not physical, so the extrapolation fails. [I]

**Other sources:**
- **Forsyth et al. 2024** (opened; Table 2; ocean waves, 6 surfers, 214 waves):
  - bottom turn: rail 42 ± 3°, 7.3 ± 0.2 m/s, 1.9 ± 0.1 rad/s, 99 ± 4° in 0.96 ± 0.04 s;
  - cutback: rail 75 ± 3°, 6.7 ± 0.1 m/s, 3.0 ± 0.1 rad/s. [S]
- No surfboard rail data with numbers was found.
- Not readable today: Brown & Klosinski 1994 (DTIC "Under Maintenance"); Morabito 2015, Ocean Engineering 101 (search
  summary only); the MDPI 2D-impact paper (403).
- de Callies' Stevens yawing-test thesis (opened, summary only) covers vee hulls with no heel, so it is not our case.

## 2. The numbers for this board

| quantity | value | tag |
| --- | --- | --- |
| shipped rail face | 1.8–5.0 mm tall, 0.0074 m² a side | [R] `BoardBody.ts:722`, taper 0.925 |
| rail thickness the volume allows (linear taper) | 0.383 t(s), up to 25.5 mm, 0.0374 m² a side (5.1×); 0.028 m² wetted at 40°, 7 m/s | [R] `boardShape.ts:115` (26 mm); [M] |
| C_e′ plateau | 1.0–1.3 × ½ρV² on the wetted face | [S] fig. 27 |
| ramp from onset to plateau | ~5° of yaw | [S, by eye] |
| onset at 40–50°, and the suction | unknown | [—] |
| centre of pressure | 0.65 of the wetted length from its aft end | [S] fig. 28 |
| ½ρV² (ρ 1025) | 18.4 / 25.1 / 32.8 kPa at 6 / 7 / 8 m/s | arithmetic |

At the plateau, the edge force at 40° and 7 m/s is ≈ 1.3 × 25.1 kPa × 0.028 m² ≈ **0.9 kN**. The whole turn's
centripetal force there is ≈ 0.52 kN. [I] That is why any on/off of this force trips the board.

## 3. Lab predictions (the advisor's runs)

**The set-up:**
- the roll-plant lab: the real `BoardBody`, a rigid 73 kg point rider, 32 substeps, flat water;
- the rail is reached at 80°/s (the game's own `LEAN_IN_RATE`), not rail-dig's step, then held;
- yaw and slip are free for 8 s, and the last 2 s are read; "p-p" is the yaw rate's peak-to-peak over that window;
- the laws go in by wrapping `applyFoils` on the instance at runtime, as an explicit force booked into the rails' slot
  and the ledger.

**The check:** with the face set to the shipped height, the wrap reproduces the shipped board within 0.3 % (settled
side force per sideslip at 7 m/s: +1413 against +1409, −188 against −188, −550 against −552 N/rad). The settled
measure is rail-dig's: roll, slip and yaw rate held at the trim, pitch and heave free, ±1° held 4 s, the last 1 s read.

**The laws:**
- `bluff`: the shipped `RAIL_PRESSURE` = 1 law on the 25.5 mm face;
- `bluff×3`: the same on a 76 mm face;
- `chine:a`: TN 4187's positive branch, C_e′ = 1.3 × smoothstep((α − a)/5°), no suction, for a = 0°, 3° and 6°;
- `keel`: both branches, 1.3 × clamp(α/5°, ±1);
- `?hull=rail` as it ships.

**A. Settled side force per sideslip, N/rad (+ resists), at 0/10/15/20/30/40° of rail**

| law | 5 m/s | 7 m/s | 9 m/s |
| --- | --- | --- | --- |
| shipped | +712 +521 +251 +100, no turn at 30–40° | +1409 +936 +406 **−188 −800 −552** | +2274 +1598 +589 −152 −639 −538 |
| bluff | +873 +710 +454 +323 | +1717 +1261 +713 +99 **−677 −731** | +2759 +2033 +943 +184 −438 −399 |
| bluff×3 | +1219 +1244 +1187 +1048 | +2176 +1877 +1293 +687 **−945**, no turn at 40° | +3211 +2717 +1923 +883 +154 −308 |
| chine:6 | +674 +478 +199 +56 | +1331 +848 +351 −260 −821 −771 | +2144 +1386 +493 −211 −664 −543 |

The bluff face's own part at 7 m/s is +409, +616, +771, +921, +923 and +854; the hull and fins hand it back. No settled
trim exists at 45° at 5 or 7 m/s. **The registered lab line 4a fails for every law.**

**B. The steady turn on the shipped board**

Columns: turn per degree (deg/s per deg), G, skid (° outward), yaw-rate p-p (rad/s), and the water's roll moment about
the deck under the rider (N·m, righting).

| speed | rails | turn per degree | G | skid | p-p | roll moment |
| --- | --- | --- | --- | --- | --- | --- |
| 5 m/s | 10/20° | 1.68/1.68 | 0.85/0.82 | 3.5/7.3 | 0/0.57 | 9/19 |
| 6 m/s | 10/20/30° | 1.45/1.47/1.56 | 0.88/0.86/0.87 | 2.2/4.5/7.3 | 0/0.36/0.92 | 13/26/35 |
| 7 m/s | 10/20/30/40/45/50° | 1.24/1.23/1.30/1.39/1.51/1.57 | 0.88/0.85/0.84/0.82/0.85/0.82 | 1.5/3.3/5.6/9.1/10.4/12.1 | 0.06/0/0.07/0.08/**0.77/0.88** | 20/36/48/62/59/62 |
| 8 m/s | 30/40/45/50° | 1.09/1.14/1.21/1.29 | 0.80/0.77/0.77/0.77 | 5.0/8.4/10.1/12.5 | **0.52/1.10/1.39/2.39** | 63/79/83/89 |
| 9 m/s | 20/30/40/45° | 0.92/0.95/0.99/1.05 | 0.81/0.79/0.76/0.76 | 2.3/4.7/8.0/9.2 | 0/**0.40/0.92/3.25** | 59/79/92/88 |

At 6 m/s, 40–50° spins out. At 5 m/s and 30° or more, no turn holds (`predictiveBalance.ts` already records this for
5 m/s).

**C. Yaw-rate p-p under the laws, rad/s** (— = no steady turn: spun out, sank or blew up)

| law | 6 m/s: 20/30/40° | 7 m/s: 30/40/45° | 8 m/s: 30/40/45/50° |
| --- | --- | --- | --- |
| shipped | 0.36/0.92/— | 0.07/0.08/0.77 | 0.52/1.10/1.39/2.39 |
| bluff | 0.28/0.67/— | 0.56/**1.71**/— | 0.43/1.07/0.94/1.75 |
| chine:0 | — from 20° at every speed (G 0.68–0.72 at 10°) | | |
| chine:3 | 0.31/— | — | 0.54/— |
| chine:6 | 0.37/— | 0.03/1.54 (the +2° kick spins it out) | 0.57/0.92/1.35/2.90 |
| keel, full size | — from 20° (G 0.54 at 10°) | | |
| keel, 0.3 coefficient | 0.06/1.28/— | 0.87/2.05/— | 0.64/1.17/1.78/— |
| `?hull=rail` | 0.19/2.02/— | 0.91/**3.48**/— | 0.36/**0.39/0.43**/2.10 |

- **Turn per degree,** where a steady turn exists, is unchanged within ±0.1 deg/s per degree. At 7 m/s and 40°: 1.39
  shipped, 1.43 bluff, 1.50 chine:6, 1.42 `?hull=rail`. The rail law is idle in a steady turn, because the low rail
  trails.
- **Roll moment.** With bluff at 7 m/s, the water's righting moment at 10/20/30/40° is 20/30/41/39 N·m, against
  20/36/48/62 shipped. That is the re-trim; the rail face's own roll moment is only 0.2–2.2 N·m.

## 4. How it would fit the code, if Vicente still wanted it as a labelled experiment

- **One function changes:** the rail branch of `BoardBody.applyFoils` (`BoardBody.ts:990–1010`).
  - The face height becomes 0.383 t(s) under the switch; `buildFoils` today uses t(s)(1 − 0.925) at `:722`.
  - The law is either the bluff law or TN 4187's C_e′.
  - Its implicit damping stays in `settleFoils`.
  - The patches, slabs, buoyancy, `patchForce` and the wave solver are untouched.
- **What `?hull=rail` is:**
  - it drops the rail faces (`:719`);
  - it adds a round band (4 facets a side, 7–25 mm radius) that planes on its own normals, plus `RAIL_SUCTION` on its
    leeward facets;
  - its linear taper moves volume into the rails, which is the "buried rail's buoyancy".
- **It carries the suction branch in kind,** but that fires only past 15–18° of drift (step 3.2u). With `railSuction:
  'off'` the 7–8 m/s trims are identical to the digit, so in a turn only the band's geometry acts.
- **It failed in 3.3** because the band's low-rail facets face outward and push the board out of the turn, 8–20 % less
  side force (3.2u). In 3.3 that showed as:
  - the side force per unit sine of rail falling from 7.24 to 3.22 m/s²;
  - the bank gain falling from 0.83 to 0.44.

  In the lab it lowers G at 10° (0.876 → 0.761 at 7 m/s), rings at 7 m/s at 30–40° and fails at 45°. But it steadies
  8 m/s at 40–45°. A change to the hull section is the only thing found that moves the mode, so the mode lives in the
  bottom's lift distribution and the heave, not in a rail face.

## 5. What could go wrong (measured with these laws)

- **A trip.** Any leading-edge law sees the 6.8° trim-and-heel angle in every transient. At TN 4187's size the edge
  force (≈ 0.9 kN) exceeds the turn's whole centripetal force (≈ 0.52 kN), and the board is thrown out of the turn from
  20°.
- **More ringing at depth.** With bluff, the 40° turn at 7 m/s goes from 0.08 to 1.71 rad/s.
- **Line 4a can be gamed without passing.** bluff×3 adds +3.2 kN/rad of rail grip at 20° and moves the total by only
  +875, and it makes 30° worse (−945).
- **Straight riding and the balance's model.**
  - The 25.5 mm faces are wetted at 0°. They raise the straight slip stiffness by 22 % at 5–9 m/s (+1409 → +1717 N/rad
    at 7 m/s), and by 35 % at 10° (+936 → +1261), which is inside `SCHEDULE_RAIL_CAP`'s 12°.
  - `PLANT_SPEEDS` and `RAIL_PLANT` (`predictiveBalance.ts:267–284`) were measured on the shipped hull, so both would go
    stale everywhere, not only past 12°.
  - The roll stiffness at 10° is unchanged: −20.3 against −20.2 N·m.
- **Bogging past 48°.** Nothing tested holds 40° or more at 6 m/s, and 50° rings at 7 m/s.
- **Holding the rail costs the feet a lot,** and no line watches this. At 40–50° and 7–9 m/s the feet must hold
  59–92 N·m against the water's righting moment (table B). The feet's physical bound in `AttachedRider`'s notes is
  716 N × 0.13 m = 93 N·m standing (`AttachedRider.ts` about L600), ≈ 110 N·m at a 40° turn's load factor of 1.2 [I].
  That is 55–95 % of what the feet can apply, before any balancing.

## 6. What to measure

- **Replace lab line 4a** with a free-motion line, because it is a held-yaw-rate derivative that the free board does
  not obey and a rail face cannot move it.
  - In the roll-plant lab, ramp the rail at 80°/s to 30, 40 and 45° at 6, 7 and 8 m/s, then hold it with yaw and slip
    free.
  - Pass means: yaw-rate p-p < 0.2 rad/s over the last 2 s of 8 s; a ±2° slip kick back within 0.5° by 1 s; and
    G ≥ 0.8.
  - The shipped board passes only at 7 m/s, 30–40°.
- **If anything is built, read in the game:**
  - the paired mean rail at tS 1.5–2.0;
  - the feet's roll moment against their bound at the deepest frame;
  - yaw-rate p-p in held turns at 30° and above;
  - straight-ride sway against `PLANT_SPEEDS`.

## 7. The coordinator's consult-log questions

1. **Does the reframing hold?** Half of it does.
   - The water turns the board right for its rail at depth too: 1.39 deg/s per degree at 40° and 7 m/s with the rail
     held. So the game's 17–20° rail comes from the rider. At 40° the water would give 55.5 deg/s, against Compress's
     22.9 today.
   - The "grip" half does not hold. At 7 m/s the board does not slide out at 40°. At 6 and 8 m/s the deep rail fails
     by an oscillation, and a rail force does not fix it.
   - At 17–20° the lab is steady at 6–8 m/s (p-p ≤ 0.36 rad/s), so today's "board swings away" in the game is not this
     water mode. [I]
2. **What an honest law must keep:**
   - K_hull ≈ 100 N·m/rad, which is untouched at ≤ 10°;
   - straight riding (a face wet at 0° changes it);
   - both measured plant tables, which need re-measuring for any hull change.

## 8. Decisions only Vicente can make

- **(a) Stop 3.6k's rail build.** The advisor recommends this.
- **(b) Re-aim the round,** at either or both of:
  - **(i) The rider: why the rail stops at 17–20°.** Look at the feet's moment budget at depth (§5) and at the
    schedule capped at 12° while its plant is measured to 40°.
  - **(ii) The water's deep-rail mode,** as a diagnosis round, not a build.
    - **The candidate term [R]:** our added mass acts along the water's surface normal with a |n·ν| projection
      (`BoardBody.ts:1372–1389`), while the code's own source says a plate's added mass acts normal to the plate
      (Newman 1977 §4.13, cited at `BoardBody.ts:160–168`). So a heeled bottom gets no sideways added mass.
    - **A diagnostic** that turned it onto each patch's own normal damped the mode to 45° at 6–8 m/s (p-p 0 at 6 m/s
      and 40°, 0.001 at 8 m/s and 40°; slip kicks back within 0.1°).
    - **It is only a pointer.** That version also adds a false steady inertia in a turn, because the solver applies
      added mass to the world-frame velocity change: the 40° skid grew from 9.1° to 12.5°. There is no sourced
      magnitude.
- **(c) Replace line 4a** with the free-motion line in §6.

## Files (copied into `advisor/`)

- **The probes:**
  - `railhold.ts`. Bundle it from the rail-hold worktree with `./node_modules/.bin/rolldown <dir>/railhold.ts -o <dir>/railhold.mjs --format esm --platform node`, then run, for example, `RAMP=80 LAWS=none,bluff PARTS=trim,kick,settled SPEEDS=7 RAILS=0,20,40 node railhold.mjs`. `AMN=1` turns on the added-mass diagnostic.
  - `railhold2.ts` with `plant2.ts`: `?hull=rail` (env `HULL=rail`, `RS=off`).
  - `peek.ts` and `peek2.ts`: the 6 m/s, 40° trace.
- **The result rows:**
  - `base7.jsonl` and `base-ramp.jsonl`: the shipped board;
  - `laws-ramp.jsonl`, `settled-laws.jsonl` and `keel.jsonl`: the laws;
  - `hullrail.jsonl` and `hullrail-nosuction.jsonl`: `?hull=rail`;
  - `trim59.jsonl` and `trim678b.jsonl`: other speeds;
  - `amn.jsonl`: the added-mass diagnostic;
  - `check.jsonl`: the check against the shipped faces;
  - `coord-check.jsonl`: the coordinator's rerun of 6/7/8 m/s at 40°.

## Sources

- [NACA TN 4187, Savitsky, Prowse & Lueders 1958](https://ntrs.nasa.gov/citations/19930085133), opened. The NTRS
  download is a container: strip the bytes before `%PDF`.
- [Forsyth et al. 2024, Sci Rep 14:8734](https://www.nature.com/articles/s41598-024-58387-y), opened, Table 2.
- [de Callies, *Evaluation of static stability derivatives from standard yawing tests*](https://archive.org/download/evaluationofstat00decapdf/evaluationofstat00deca.pdf), summary only.
- Not readable today:
  - [Brown & Klosinski 1994](https://apps.dtic.mil/sti/pdfs/ADA282728.pdf);
  - [MDPI 2D impact, 3 DOF](https://mdpi.com/2076-3417/10/3/1072);
  - [Katayama et al. 2004](https://www.jstage.jst.go.jp/article/ksnajproc/2004A/0/2004A_0_12/_article/-char/en);
  - Morabito 2015, Ocean Engineering 101, search summary only.
- In the repo:
  - `docs/research/new-rider/rail-dig/README.md`;
  - `docs/research/new-rider/roll-plant/README.md`;
  - `docs/research/water-physics/board-roll-stiffness.md`;
  - `docs/research/new-rider/3.3/README.md` §3–4;
  - `src/physics/predictiveBalance.ts:236–292`;
  - the advisor's own 3.2q, 3.2t and 3.2u entries in the water-physics consult log.
