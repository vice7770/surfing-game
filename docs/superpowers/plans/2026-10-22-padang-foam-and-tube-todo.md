# Padang Padang: too much foam, and the tube still wrong (saved for later)

**The owner's words (2026-10-22, M4, max settings, Rich water):** "The other video is Padang. There is too much foam and the tunnel is still wrong. Document the changes to do, but don't do anything yet; save for later."

This file is that record. No code was changed. The diagnosis is the water-physics advisor's, read against `main` at bff9a874; `path:line` references are to that commit. Numbers marked *inferred* are the advisor's own estimates, not from a source.

- Frames from the owner's video: `docs/research/padang-playtest-2026-10-22/video-sheet.jpg` (12 frames over 16.6 s) and `video-close.jpg` (9.9, 11.8, 13.6 and 15.5 s).
- The advisor's tube-shape probe: `docs/research/padang-playtest-2026-10-22/probe/tube-probe.test.ts.txt`. It is a vitest file; rename it to `.test.ts` to run it.

## What the video shows

- **The sea is probably a Wave Lab buoy sea, not one of Padang's own swells.**
  - The card reads "Hs 1.4 m · Tp 1x s". Padang's own swells are 1.2, 2.2 and 3.8 m at 16–18 s (`src/game/SurfConditions.ts:95-99`). 1.4 m is the Lab's default buoy (`src/game/PhysicalMode.ts:201`).
  - The break line on the card, blurred "19x m", fits Padang at Hs 1.4 m, 10–12 s (197 m).
  - A 10–12 s sea closing out at Padang is right for that sea: the spot needs long-period groundswell. Judge the next round on Padang's own Small, Medium and Big.
- **The build is after #142.** The curls show foam lace, which only #142 (curl stubs keep the solver's foam) can draw.
- **The camera is a high free camera.** From above, even a correct barrel hides its void under its roof. Judge tubes from the ride camera.

## The tube ("the tunnel is still wrong")

The order is the advisor's, highest payoff first.

### T1. The drawn tube is an authored, paper-thin C-shape, not our Basilisk profile

Biggest payoff, highest risk.

- **Cause:** since bc0b489f (2026-10-05, the paused tube work) every shipped case draws through `geometry: 'bounded-C'` (`src/wave/barrel/barrelLibrary.ts:42`, `ProfileLibrary.ts:294`).
  - That profile is an experimental, parameter-first shape with an enlarged mouth. It takes only the crest, toe and tangents from the Basilisk case.
  - Its lip thickness is capped at about 0.012–0.019 H (`boundedCProfile.ts:72`).
  - At 3–7 cm thick, the backlit-sheet shading (`SweptBarrelMesh.ts:185-203`) lets the background through almost undimmed, so the lip reads as a pale membrane. #142 then whitens it (T3).
- **Measured** on Padang's four cases, foot crest 0.9–3.1 m, at 0.5, 0.8 and 0.95 of touchdown:

  | | Bounded-C (shipped) | Raw Basilisk, same cases | Sourced target |
  |---|---|---|---|
  | Lip thickness, median | 0.014–0.021 H (3–7 cm) | 0.12–0.22 H | 0.1–0.2 H |
  | Lip tip | 0.009–0.014 H | 0.03–0.16 H | about 0.07 H |
  | Area under the lip | 0.48–0.69 H² | 0.09–0.22 H² | 0.25–0.38 H² |

- **The right shape:**
  - Padang's tube is about 0.78 H long × 0.40 H wide (L/W 1.97–2.14), tilted 29–41° (Mead & Black 2001, Table 6.1).
  - Overturn 0.30–0.38 H², jet area 0.14–0.20 H² (Pick & Feddersen 2026, at 1:19, for H0/h0 0.2–0.45).
  - Jet about 0.07 H thick (Feddersen et al. 2024).
- **Change:** draw and collide our Basilisk profiles again (`{}` in place of `'bounded-C'` at `barrelLibrary.ts:42`). Or keep the C's robust construction, but take its thickness, tip path and void from each case's own frames, so every parameter is sourced.
- **Verify:**
  - Rerun the probe against the table's targets.
  - In game, `?barrelView=sheet` shows the lip's thickness: white is thin, blue is 1 m. Today it reads white.
- **Cost:** CPU loft and contact only. No shader change and no new texture units.
- **Risk:** high. bc0b489f moved the loft, contact, crash, air, carrier support and retirement together. The old seam, the grey band and tube entry problems may come back. With the level-12 tubes (T4) the mouth gets smaller.
- **Owner's decision:** this reopens the 10-05 choice of the authored bounded-C, against the standing rules that shapes are sourced and that the tube is built from our own Basilisk profiles.

### T2. Short, separate fronts draw as pointed "shards"

- **Cause:**
  - Each front blends into the water over 2.5 m at both ends (`sweptLoft.ts:25, 983-985`, marked inferred in its own comment).
  - Drawn open runs are a median 5.7 m long, on close-outs and on Padang's own Big (50 of 57 under 10 m). So most runs reach full height over less than a metre.
  - The narrowed clock link ruled on 2026-10-03 was never switched on: `PADANG_FRONT = { jumpReach: 10 }` (`barrelSpots.ts:18`).
- **The right shape:**
  - A peeling tube is open along about 2.6 H/tan α of crest (1.3–3.5 H/tan α). That is about 6–11 m at Padang's 35–40° peel and H 2–3 m.
  - A close-out section throws and lands together along its whole length.
- **Change:**
  - Build the narrowed link (|Δz| < 3 m per column, with hole and fold counts).
  - Let the leading end taper by the clock, and keep at most about 1 m of blend where a front meets unbroken water (inferred).
  - Don't add a minimum run length: it would strip Big's curls too.
- **Verify:** at Padang's own Medium and Big:
  - true splits merged ≤ 1 %;
  - holes and folds no more than with the link off;
  - open curl per wave within 1.3–3.5 H/tan α.
- **Cost and risk:** the front costs about 1 % of a step, CPU only. Folds can appear at steep links.

### T3. #142 paints the whole curl with the foam under it

- **Cause:**
  - A kept slice takes `waterFoamAt` at each vertex's xz (`SweptBarrelMesh.ts:122, 460-466`): the foam in the trough under the lip, not the lip's own water. Over the inside's whitewater the curl turns fully white.
  - The lace pattern is laid in world xz from above (`waterOptics.ts:242-245`), so it smears on the curl's vertical surfaces.
  - The kept foam also switches off the lip's backlit glow (`SweptBarrelMesh.ts:202, 258`).
- **The right look:**
  - Lips are laminar until touchdown (consult log, 2026-10-11).
  - Foam already on the crest is carried up over the lip, stretched thin and streaky, with green showing through (inferred).
- **Change (provisional):**
  - Take one foam value per slice from its crest; `BrokenCrests` already reads it.
  - Carry it along the profile's arc, thinned by the stretch.
  - Cap it so the lip stays translucent, and go fully white only after touchdown.
  - Pack it into the existing `sweptLift` attribute. A separate attribute would make 14 of WebGL2's guaranteed 16, or 15 with the dev view.
- **Verify:** `waterSheetPair` with `waterSheetBarrel.brokenFoam` false/true at `?inpage&waterSheet&spot=padang&compute=gpu&height=1.4&period=12&direction=0`.
- **Owner's decision:** this amends option (a), chosen on 2026-10-22.

### T4. Even the raw tubes are small

- **Cause:** the library is level 12 only (`barrelLibraryIndex.ts`).
- **Change:** the level-13 Padang reruns decided on 2026-09-29 are still owed. They run with `tools/basilisk/run_padang.sh` on the M4 Pro, about 3–8 h a case.
- **Target:** 0.30–0.38 H², with at least 6 cells across the lip.

### T5. One 1:19 library for every break

- **Cause:** breaks on the 1:80 ramp, the −x 1:5 face and short-period Lab seas all get the 1:19 wedge's plunging tube. Pick & Feddersen's fit gives only about 0.06 H² at 1:80, nearly spilling (at the edge of their fit's range).
- **Change (lower priority, provisional):** pick or gate cases by each slice's own slope. Until then, judge tubes on Padang's own swells.

## The foam ("too much foam")

### F1. Aged foam is drawn as bright as fresh whitewater

Cheap, high payoff.

- **Cause:** one foam colour (#d8f2e9) for every age (`WaterSurface.ts:343`), drawn opaque (`richWaterGlsl.ts:115`). Aged lace keeps opacity 0.8 (`foamFreshness.ts:50`).
- **The right look:**
  - Dense foam reflects about 0.50–0.55.
  - A patch's mean reflectance falls from about 0.41 at 0.5 s to 0.10 at 7.5 s; streaks sit near 0.10 (Koepke 1984, via `notes/round3-whitewater-build/foam-lifecycle.md`). That note's change #1, aged foam dims, was never built.
- **Change (Rich only):** scale the foam colour by mix(about 0.2–0.35, 1, `waterYouth`), which is already computed. Never darker than the water under it: foam adds light (2026-09-29).
- **Verify:** `waterSheetFoamLight` at Padang Medium and Big:
  - the landing ≥ 1.5–2× the white 5 s older (target set 2026-10-20);
  - lace 10 s old ≤ about 0.4× fresh.
- **Cost:** arithmetic only. But the Rich tank sits at the M1 cost cliff, so time it with `waterSheetGpuAB` in a shown pane.

### F2. Padang has no roller

- **Cause:** the roller band, roller front, shoreward foam drift, shoulder clearing and frayed edges exist only at the Canyon:
  - `SPILLING_SPOTS = ['canyon']` (`SurfZoneSimulation.ts:182`);
  - they are built only without the swept crash (`:952-968`);
  - the drift and clearing run only with the curl (`:1213-1218`, `:1553`).
- **The right look:** a white roller about 2.9 H long on each bore's front (Martins et al. 2018), with thinner foam behind it.
- **Change:** build the roller lens on the barrel's loft (`roller-build.md`), or first run the Canyon's look-only roller front from Padang's touchdowns.
- **Verify:** a white band 2.5–3.5 H behind each landing.
- **Cost:** about 0.065 ms a step on the M1, and up to 13k front vertices.
- **Owner's decision:** whether the roller comes before the tube is finished.

### F3. Lace piles up on the inside

- **Cause:** Padang's lace lasts 20 s (`SurfZoneSimulation.ts:463`) and takes a 0.3 share of the dense foam (`FoamField.ts:20`), with no drift or clearing.
  - The cover settles near 0.46 under 11 s close-outs and 0.26 under Padang's 17 s (inferred).
  - The knowledge base's estimate for late residual foam is 0.02–0.15 of the surface.
- **Keep the 20 s lifetime:** residual foam can persist for minutes (Chickadel et al. 2022; decided 2026-09-29).
- **Change:** lower Padang's drawn lace share, or bring in the Canyon's drift (≤ 0.4 m/s) and shoulder clearing. The foam field is drawn only.
- **Verify:** inside cover 10 s after a set ≤ 0.15; the channel and shoulder between sets ≤ 0.02 (the Canyon's bar).
- **Owner's decision:** the lace share and drift at Padang.

### F4. A uniform film from afar

- **Cause:** footprint softening correctly averages distant lace to its mean (`foamFreshness.ts:48`), and High and Ultra drop the streaks (`:243-244`).
- **The right look:** residual foam lies in lines and bands (Koepke's streaks).
- **Change:** squeeze foam into lines where the flow converges (changes both looks, so it's the owner's call), or `?foamStreaks=on` at Ultra (about +0.6 ms on an M1 at High).

### F5. Partly the sea

The Lab close-out makes foam across the whole width every wave. Padang's inside flat is 1.25 m deep (`Bathymetry.ts:469`), so its bores keep breaking, which is physically right. Judge the foam on Padang's own swells.

## The dark vertical bands

*Inferred, not proven.*

- **Why the edge is suspected:** the frame is mirror-symmetric about its centre line. The V's tip sits on it, the white patches pair across it, and the breaking moves toward it from both sides. That fits a camera looking seaward along the tank's +x edge (x = 160), where Padang's channel is centred (`Bathymetry.ts:111`).
  - Crests run ahead over the deep channel, which makes the V.
  - The edge band mirrors the water past the edge (`EdgeBand.ts:279-283`).
  - The swept barrel is not mirrored (`PhysicalMode.ts:465`), so the right-hand "shards" would be mirrored foam.
- **What draws the straight lines:** likely one or more of the deep channel, the bed levelled within 20 m of the edge (`ShallowWaterSolver.ts:93, 470-498`), and the band's shading switch 24–32 m out (`EdgeBand.ts:35`).
- **Test:**
  - `?barrelView=phase` colours only real curls, so mirrored patches stay white.
  - Check the camera's x position.
  - Hide the edge band in the water sheet.

## Telling #142 apart

- **Its doing:** only the white, lace-covered curls (T3).
- **Not its doing:** the paper-thin shape (T1), the shards (T2), the pale sheet behind the crest and the bands.
- **A/B:** build a246523d (before #142) against bff9a874 on the same Lab sea and seed, or use the `brokenFoam` pair above.
- **The 2× glow MSAA (f3a45f41)** came in the same merge. The 3–7 cm sheet's edges alias more at 2×; compare with Graphics > Glow anti-aliasing 4× (#143).

## Decisions only the owner can make

1. **T1:** the authored bounded-C (adopted 10-05) against the rules that shapes are sourced and the tube is built from our Basilisk profiles.
2. **T3:** amending option (a).
3. **F3:** the lace share and drift at Padang.
4. **F2:** whether the roller comes before the tube is finished.
5. **The Lab's period:** whether the Wave Lab at Padang should default to Padang's own period.

**The advisor's suggested order:** T1, then F1, T2, T3, F3, T4, F2.

## Sources

- [Mead & Black 2001](http://joas.free.fr/studies/bei/g2s/predicting_the_breaking_waves_intensity.pdf)
- [Pick & Feddersen 2026](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- [Feddersen et al. 2024](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf)
- [Martins et al. 2018](https://purehost.bath.ac.uk/ws/files/170060912/Martins_et_al_JGR2018.pdf)
- [Callaghan et al. 2012](https://research.universityofgalway.ie/en/publications/observed-variation-in-the-decay-time-of-oceanic-whitecap-foam-6/): oceanic whitecap foam decays over 0.2–10.4 s
- [Chickadel et al. 2022](https://mdpi-res.com/d_attachment/remotesensing/remotesensing-14-01925/article_deploy/remotesensing-14-01925.pdf)
- From the knowledge base: Koepke 1984, O'Dea 2021 (open-curl length) and Hansen & Svendsen 1984 (surface drift).
