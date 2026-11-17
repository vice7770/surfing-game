# The board's roll stiffness

**Consult, 2026-11-17, surfer track.** What is the roll restoring moment of a flat, surface-piercing, planing
surfboard carrying a standing rider, at trim and through 0–30° of heel — and does it collapse and reverse past 20°?

Conditions answered for: rider 73 kg on the reference board (`boardReference.ts`: 1.778 × 0.464 × 0.0667 m,
25.75 L, 2.54 kg), total load **Δ = 741 N**, half-beam 0.232 m, speed through the water 1–10 m/s, faces 1.2–2 m at
5.5–16°. Froude numbers at those speeds: speed coefficient `C_V = V/√(g b)` = V/2.133 → **0.56 at 1.2 m/s, 2.34 at
5, 3.05 at 6.5, 4.69 at 10**; length Froude V/4.176 → 0.29–2.4; volumetric `Fn_∇` (∇ = 0.0737 m³) = V/2.03 → 0.6–4.9.
Planing conventionally begins near `Fn_∇` = 3, i.e. **6.1 m/s**. **The owner's turns at 1.2–6.5 m/s are in the
displacement and semi-planing regimes, not the planing one**, and that governs every number below.

Tags: **[M]** measured, **[R]** read in our code, **[A]** derived here, **[I]** my judgement.

## 1. The number

**K_hull ≈ 100 N·m/rad at 5–7 m/s (bracket 65–145). Below 3 m/s it is 0–65 and falling toward zero; at 12 m/s it is
about 350.** The speed dependence is the whole story and a single constant cannot carry it.

The law, derived here and checked against two measured sets:

> **K_φ = C · Δ · b / (τ λ)**,  C = 0.055 ± 0.015 **[A]**

with Δ the load carried (N), b the beam (m), τ the running trim (rad) and λ the mean wetted-length/beam ratio.
Δ b = 344 N·m for us, so K_φ = 18.9/(τ λ).

**Why that shape.** A flat plate heeled by φ meets the free surface along a straight line raked across its own plane
— NACA TN 4187 measures exactly this: *"the angle of the spray root line relative to the keel is identical to that
of a wedge whose dead rise is equal to the roll angle"* **[M**, [TN 4187](https://ntrs.nasa.gov/citations/19930085133),
summary of results 3**]**. So the wetted length at a transverse station η is ℓ(η) = (d₀ − ηφ)/τ, with d₀ = τ λ b the
transom immersion. Lift per unit beam goes as ℓ^k; Savitsky's dynamic term is ∝ λ^0.5 and his buoyant term ∝ λ^2.5,
so per strip k is 0.5 and 2 respectively, lift-weighted to **k ≈ 0.9 at 7 m/s and 1.4 at 5 m/s** [A on
`hullForces.ts:9–20`]. The lift centre then sits at y_cop = −(k/3)(b/2)·a with a = (b/2)φ/d₀, so
**K = N k b²/(12 d₀) = N k b/(12 τ λ)**, i.e. C = k/12.

**Four independent lines land on it.**

| line | what it gives at 5–7 m/s | kind |
|---|---|---|
| the law above, τ = 4°, λ = 3.1–4.1 (Savitsky at Δ = 741 N) | **69–87 N·m/rad** (×1.6 at 6° of trim) | [A] |
| [NACA TN 4187](https://ntrs.nasa.gov/citations/19930085133) (Savitsky, Prowse & Lueders 1958), **0° deadrise flat plate**, yaw 0, trim 6–30°, C_V 7–18, roll ±15°: lateral centre of pressure `C_y' = y/b` stays inside **±0.10 b** with a slope near **−0.13 b/rad** (fig. 14(a), read off the scan) | the law at *their* τ and λ gives 0.06–0.18 b/rad | **[M]**, read by eye |
| Brown & Klosinski's PMM tests, prismatic hulls 10/20/30° deadrise, C_V 3–4, trim 3–6°, roll 10°, Δ = 51.1 N, b = 0.229 m: K = **0.98–1.55 N·m**, i.e. 0.48–0.76 Δb/rad — reproduced in [Sadati, Zeraatgar & Babuei 2022](https://scientiairanica.sharif.edu/article_22483.html), tables 2–6 | the law at their λ ≈ 1.1, τ = 6° gives 0.36–0.72 Δb/rad, so **k ≈ 0.66** | **[M]**, via a peer-reviewed reproduction |
| our own `carve-lab.md`, "The hull's roll": a prone rider kicked 10° onto the rail at 7 m/s rings at **1.35 Hz on 1.33 kg·m² = 97 N·m/rad** | — | **[M]**, in-game |
| 3.4i §4 read as a secant (hull moment ÷ rail angle): `f73-g` **78**, `s16-g` **98 N·m/rad** | — | **[M]**, in-game |

**How well constrained: moderately, and the honest answer is that nobody has measured this configuration.** No
published test covers a surfboard-proportioned planing surface under a standing rider at `Fn_∇` 0.5–3. The nearest
measured configurations are TN 4187 (right section, wrong Froude: C_V 7–18 against our 0.6–3.0, trim 6–30° against
our 2–6°) and the prismatic PMM series (right Froude band, wrong section: 15–30° of deadrise). Both extrapolate
through the same law and they agree with each other — that agreement, not either number, is the reason to trust it.

## 2. The three numbers in our code

- **100** (`src/physics/rollModel.ts:163`) — **right**, and the only one of the three that is. It is the prone-rider
  kick, the one measurement in `carve-lab.md` that is actually a roll spring.
- **860–1650** (`src/physics/rollModel.test.ts:71–82`) — **not a roll stiffness. Reject it.** It is *couple ÷ steady
  rail angle* with the board free to yaw, sway and turn, and the lab's own table refutes it: the rail reaches 63 % of
  its value in **0.02–0.05 s**, while the same board's free roll mode is **1.35 Hz** (period 0.74 s). A 860 N·m/rad
  spring on 1.33 kg·m² rings at 4.0 Hz; it cannot settle in 0.03 s. What settles in 0.03 s is the sway/yaw force
  balance — so the quantity is the manoeuvring compliance of a turning board, with the fins' side force and the
  turn's own lateral acceleration inside it. Its two 3 m/s rows, where no turn has built yet, read **91 and 232
  N·m/rad** — the right order. [A on `carve-lab.md`'s own table]
- **733** (back-solved from `ANKLE_REST_RANGE = 0.25`) — a solve for a wanted authority, not a measurement. Discard.

## 3. The collapse, and the reversal

**The collapse is real. The reversal is not — ours is an artefact of a control that measured a board carrying
2.54 kg instead of 75.5.**

The real shape: the moment rises nearly linearly to a critical heel **φ_c = 2 d₀/b = 2 τ λ**, then saturates, and the
stiffness decays as (φ_c/φ)². **It tends to zero from the restoring side and does not change sign** [A].

- Loaded board at 5–7 m/s (τ ≈ 4°, λ ≈ 3.1–4.1): **φ_c = 25–33°** — past every rail those rides reach.
- The bare board of `docs/research/new-rider/3.4/hull.ts` at 8 m/s: its own table says the wetted area at trim is
  **0.0412 m²**, so its wetted length is ≈ 0.09 m and d₀ ≈ 0.007 m, giving **φ_c = 1.8°**. Every row of that sweep
  from 2° on is already in the saturated tail. **"Collapses to zero by 15–20°" is φ_c = 1.8° seen through a sweep
  that starts at 2°** [A on the probe's own columns].
- The saturated plateau the law predicts under a 50 N load is 0.30 Δ b = **7 N·m**; the control reads **−8.6 to −16
  N·m** at 20–30°. Shape and size both transfer, which is the probe's own claim and it holds. Scaled to the rider's
  741 N the plateau is **103 N·m**, and under a 52° turn's load factor (1/cos 52° = 1.62) it is **167 N·m**.
- The sign change past 20° sits on a −9 to −16 N·m plateau while the wetted area grows **six-fold** (0.041 → 0.251
  m²): the board is sinking in a held pose and re-wetting its high rail. That is the held-height experiment, not a
  hydrodynamic reversal — the probe's own honesties 1 and 3 already say it may not be read for magnitude.

**Where a reversal *is* documented**, so we do not claim it impossible:

- **Transverse stability loss at very high speed.** [Katayama, Fujimoto & Ikeda 2006](https://www.jstage.jst.go.jp/article/jjasnaoe/3/0/3_0_215/_article/-char/en)
  (*J. JASNAOE* **3**, 215): 0.6 and 1.0 m models, 18–25° deadrise, towed free in roll at **length Froude 2.0–5.0**,
  heel spontaneously to 6–8° and 20–30°. The mechanism they measure is the waterplane shrinking to a narrow polygon
  as the lift raises the hull, so the hydrostatic restoring vanishes [M]. For our board Fn_L 2–5 is **8–21 m/s**, and
  it is a loss at *small* heel, not a reversal at 20°.
- **Chine suction on the buried rail.** TN 4187 found a flat plate with a finite-thickness chine develops **negative
  pressures along the rolled-down chine edge** at small yaw and large positive roll, the crossflow failing to
  separate; it could not quantify them (*"very large negative coefficients having no consistent variation"*) [M].
  That is a genuine anti-restoring term on a buried rail and the one mechanism that could bend the curve the way our
  control does. **Our shipped board cannot have it**: the default section is `'flat'` (`BoardBody.ts:551`; the rail
  band is `?hull=rail`, opt-in), and `suction` reads exactly 0.00 on all four of 3.4i's arms [R/M].

## 4. Where the moment comes from, and what we have

| mechanism | size at our conditions | in our code? |
|---|---|---|
| waterplane (hydrostatic) shift | ρ g I_T ≈ **65 N·m/rad** with the whole planform in the waterplane; **0 once the board is under**, which a 25.75 L board under 73 kg is below ≈3 m/s | **yes** — per-patch buoyancy; it is the control's own 0 m/s row, −34 N·m/rad |
| dynamic lift centre migrating across the beam | **all of it when planing**: 70–140 N·m/rad at 4–7 m/s | **yes** — `planingScales`' 1/√x spray-root law gives lift ∝ √ℓ per strip, i.e. k ≈ 0.5 |
| rail immersion and suction | unquantified; measured to exist and to be anti-restoring on a flat plate's buried chine | only under `?hull=rail`; **0.00 on the shipped board** |
| added mass in roll | an inertia, not a spring | yes, and correctly excluded from `hull` |
| the turn's own lateral acceleration | **everything above ~15° of lean** | yes, as 3.4i's `mCoup` |

**The one place the code is light, and it is bounded.** Savitsky splits the lift into a dynamic term ∝ λ^0.5 and a
buoyant term ∝ λ^2.5/C_V² [R, `hullForces.ts:9–20`]. Per unit beam those grade as ℓ^0.5 and ℓ², so the lift-weighted
k is **0.9 at 7 m/s** (74/26 split) and **1.4 at 5 m/s** (42/58). Our planing law carries the dynamic grading
(k = 0.5) and books the buoyant share as the board's own slab volume, which saturates and grades as k ≈ 0. **So our
spanwise grading is low by about 1.8–2.8×** — which is the whole of the gap between our measured 78–98 and the law's
87–139. **That is a factor of two, not a factor of twenty.**

## 5. Re-framing 3.4i's own figures

- **"the hull answers 11.2–17.2 % of what the rider's weight puts on the deck" is about what a real board does.** At
  5 m/s the law gives **4.8 N·m** of the 44.5 N·m asked on `f73-g` (11 %) and **23.5** of the 191.6 on `s16-g`
  (12 %); we book 5.40 (12 %) and 32.98 (17 %) [A against M]. The ratio is small because the rider's own entry is a
  centre of mass **0.062–0.268 m** off the board's axis while the lift centre saturates at 0.30 b = **0.139 m** out.
  The rest is carried by the turn, on a real wave as in our solve.
- **"the centre of lift travels 3.3–19.9 % of the half-beam"** — the law gives 8–16 % at those rails, and TN 4187's
  measured envelope over ±15° of roll is ±0.10 b = **±21 % of the half-beam** [M]. **We are inside it.**
- **"undersized by 2–140×" — rejected.** Two of the three comparators are wrong (§2) and the third, 166 N·m, is the
  moment if the lift centre reached the rail. It does not, at any heel: the ceiling is **0.30 Δ b = 103 N·m** and at
  4–20° of rail the available moment is 9–40 N·m.
- **The 316 N·m at 52.3° is the wrong bar, and this is the frame error to flag.** Holding 52.3° of bank needs
  g tan 52.3° = 12.7 m/s² of lateral acceleration, i.e. a turn of radius v²/12.7 = **0.13 m at the 1.3 m/s those runs
  are doing**. No board, no stiffness and no technique holds that pose at that speed. The holdable bank is
  **θ_max = atan(v²/(g R))**; with R = 2–4 m (a 1.78 m board's carved arc, [I]) that is **2.5–4.9° at 1.3 m/s,
  13–25° at 3, 33–52° at 5, 47–65° at 6.5** [A]. Runs that end at 42–52° of bank at 1.2–1.3 m/s ended in a pose no
  surfer reaches. **The question is what let the bank grow, not what should have held it there.**
- **And the speed itself.** A 25.75 L board carrying 73 kg needs the dynamic lift to make up 482 N after its own
  259 N of buoyancy: Savitsky at λ = 3.83 gives **V ≈ 3.2–4.3 m/s** at 8–15° of trim [A]. The wave face's own upward
  orbital flow (≈1 m/s at H = 1.2 m, T = 7 s) adds incidence and lowers it, perhaps to 2.5 m/s [I]. **Below about
  3 m/s a real surfer on this board sinks** — and the low-speed arms read 1.16–1.31 m/s through the water. Note too
  that below C_V = 0.6 Savitsky is out of its own validity range, so our 1.2 m/s cell is outside every formula here.

## 6. The premise this refutes

*"The hull is the soft spring in the series, so stiffening it restores the ankle's authority"* does not survive its
own arithmetic at the physical number. With `HUMAN_ANKLE_STIFFNESS = 800` and the ankle's ±0.25 rad, through
`bankAuthority`'s own two-spring formula [R, `rollModel.ts:185`]:

| K_hull | series | rolled into the board | what ±0.25 rad buys | the body lean it holds (L = 0.558 m, 73 kg) |
|---|---|---|---|---|
| 12–54 (3.4i's trajectory fit) | 11.8–50.6 | 94–99 % | 3.0–12.6 N·m | **0.4–1.8°** |
| 78–98 (3.4i's ride secant) | 71–87 | 89–91 % | 17.8–21.9 N·m | **2.5–3.1°** |
| **100 (the physical number)** | 88.9 | 89 % | **22.2 N·m** | **3.2°** |
| 150 | 126 | 84 % | 31.6 N·m | 4.5° |
| 860 (rejected) | 415 | 48 % | 104 N·m | 15.6° |

**At the physically correct hull a standing rider's ankle holds about three degrees of lean.** That is the answer to
the brief's either/or: it is not that our board is soft, it is that **a surfer is not held up by the board's roll
spring at all**. He is held by keeping his mass over the board and by the lateral acceleration of a turn he steers
under himself — which is what 3.4i's own `mCoup` already measures as the budget's largest term. Our 78–98 N·m/rad
already delivers ~80 % of the authority a correct hull delivers, and going to 150 buys 1.3° more lean. **No reachable
value of the hull's roll stiffness stops a 42–52° fall.**

## 7. Recommendation — one change

**Do not change the hull's roll stiffness.** It is right within about 1.5×, and §6 says no value of it moves the fall.

The one change: **cap what the rider asks for at what the speed can hold.** Make the balance's reference bank (and
the steer's rail hold) obey **θ_max = atan(v²/(g R_min))** with R_min = 2.0 m, instead of letting the commanded lean
be set by the stick or the stance alone. At the owner's own cell that is **4.9° at 1.3 m/s, 25° at 3, 52° at 5, 65°
at 6.5** — binding only where the falls are. It is not a hidden motor: it changes what the rider *tries* to do, not
what the water does to him, and it is what a real surfer does. Nobody leans into a turn they have no speed for.

- **If I am right**, the Compress rider stands up and stays up through the slow positioning the owner's bar is about:
  he will not lean into a bank he cannot hold, the 1.2–1.5 s topple stops being how the run ends, and the third fall
  population (the 20–45° balance fall, 10 of 24 on his own face) should mostly go.
- **If I am wrong**, he will feel **locked upright and unable to initiate** at low speed — refusing to bank when the
  owner asks — and runs will end by running out of wave instead of by falling. That is a quick, clear read.
- **The number it must hit is R_min**, and it is the one figure here that is not sourced: 2.0 m is my judgement [I]
  from a 1.778 m board's rail line. 1.5 m gives 3.9° at 1.3 m/s and 59° at 6.5; 4 m gives 2.5° and 47°. **Nobody has
  published a shortboard's minimum carved radius.**

**If the owner would rather have a water-side change**, the sourced one is **the spanwise weighting of the planing
lift**: carry Savitsky's buoyant share by the local wetted length (ℓ²) instead of by the board's own slab volume.
That lifts the effective k from 0.5 to 0.9–1.4 and the roll stiffness from 78–98 to **140–200 N·m/rad**, costs
nothing per frame, and is physically right. It will **not** stop the falls (4.5° of lean held instead of 3.1°), and
its blast radius is large: it changes the lift distribution everywhere, so sinkage and trim move with it.

**Two things only the owner can decide.** (a) Whether the board should keep sinking below ≈3 m/s, as physics says it
must, or carry a rider slower than physics allows so the slow positioning he wants is rideable. (b) Whether to build
the rail section (`?hull=rail`) by default, which is the only route to the measured buried-rail suction and to a
curve that droops at large rail.

## Sources opened

- Savitsky, D., Prowse, R. E. & Lueders, D. H., **NACA TN 4187** (1958), *High-speed hydrodynamic characteristics of a
  flat plate and 20° dead-rise surface in unsymmetrical planing conditions* — [NTRS](https://ntrs.nasa.gov/citations/19930085133).
  Figure 14(a) (lateral centre of pressure against roll, yaw 0) and the summary of results. Flat plate, roll ±15°.
- Sadati, K., Zeraatgar, H. & Babuei, S. (2022), *Roll restoring coefficients of planing boats' manoeuvre using a
  2D + t approach*, **Scientia Iranica B 29(3), 1197–1209** — [PDF](https://scientiairanica.sharif.edu/article_22483_516c8532f28560257da3d029018e4241.pdf).
  Tables 2–6 carry Brown & Klosinski's measured roll moments; table 9 their own computed K_φ.
- Katayama, T., Fujimoto, M. & Ikeda, Y. (2006), *A study on transverse stability loss of planing craft due to lift
  force caused by super high forward speed*, **J. JASNAOE 3, 215** — [J-Stage](https://www.jstage.jst.go.jp/article/jjasnaoe/3/0/3_0_215/_article/-char/en).
- Savitsky's 1964 planing lift law as our code implements it: `src/physics/hullForces.ts:9–20`, with its own validity
  range (0.6 ≤ C_V ≤ 13, λ ≤ 4, 2° ≤ τ ≤ 15°).
- Ours: `docs/research/new-rider/3.4/README.md` Part 9, `docs/research/new-rider/3.4/hull.ts`,
  `docs/research/carve-lab.md`, `src/physics/rollModel.ts`, `src/physics/BoardBody.ts`, `src/physics/boardShape.ts`,
  `src/physics/boardReference.ts`.
