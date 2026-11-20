# Ruling 11. The Barrel's water after the tube (2026-11-11, main 529cbc04)

Status tags: [M] measured, [S] sourced (opened), [KB] sourced via our notes, [R] reasoned, [P] provisional, [U] recalled, not opened.

## 0. The one thing to know first
The lens cannot fix "wrong sizes". With `ROLLER_DEFAULTS` the crest thickness is t = 4·0.345·H² / (π·0.75·L) (`src/wave/SpillingRoller.ts:289-291`).
At L = 2.5 H that is 0.23 H, and the drawn lift is ᾱ·t = 0.06 H [R, my arithmetic]. Even at ᾱ 0.4 and L 2.1 H it is 0.14 H.
The lens gives whiteness, a toe and texture. Height after the roof comes only from the solver's bore.
The still shows a flat patch right of the tube (`merge-look/fray4/curl-front-rich-midday.png`), so measure the bore (section 3) before or with the build.

## 1. Is R3's lens the right body after a plunge?
Yes from about 1 s after touchdown; an acceptable stand-in before that, with a changed birth.
- R3 already rules it: a plunging slice's lens starts on the slice clock, not on Kennedy/Froude (roller-build.md §1.4), and the outer region is 5–8 h_b "whatever the breaker type" [KB, Svendsen].
- What differs in the first second: the air ring collapses over ~0.5 s [KB, O'Dea 2021]; the splash-up rises to ~1.2 H_b, drops to 5 H_b [KB, Blenkinsopp thesis pp. 141–142, 1:10 lab reef];
  a new splash cycle every 2√(2H_b/g), about 1.0–1.2 s [KB, Watanabe 2005]. A jump-shaped lens is not that shape. The splash-up sheet is the spray's job, not the lens's.
- A plunge hands its lost potential energy to the roller's forward momentum at once [S, Svendsen 1984 ICCE §5], so the lens should not grow from nothing.

Pool-only options (a separate object; `ROLLER_DEFAULTS` and the Canyon untouched):
| Option | Canyon | Pool after a plunge | Status |
|---|---|---|---|
| Birth test | B ≥ 0.3 and Fr² ≥ 1.45² | the clock: τ ≥ touchdown − 0.2 s; no B/Fr test | R3 rule [KB]; the 0.2 s is [P] |
| Shed tests | Fr < 1.3 or B < 0.1 for 0.2 s | same, but not before one splash cycle, 2√(2H_b/g) after birth | period [KB]; using it as a hold [P] |
| `growthDepths` | 6.5 | 3 (c·T_splash ≈ 3 h_b with H_b = 0.85 h_b) | [R] from sourced parts |
| Start scale | 0 | 0.5 (seed `travel` = 0.5·3·h_b) | [P] |
| `area` | 0.345 | 0.345, unchanged | [KB, Martins, inner zone]; no outer-region measurement exists |
| `voidMean` | 0.25 | 0.25 in step 1. Later variant: 0.4 at birth easing to 0.25 over the growth | range 0.13–0.4 [KB]; plume mean peak 17.5 % [KB]; the easing [P] |
| `rearTaper`, `tanBirth` | 0.3, tan 25° | unchanged | no source either way; 25° at onset [KB, Martins] |

## 2. The join at touchdown
- Across shore: seed at the solver's own crest nearest the front point's z, as the Canyon does, not at the landing line. The lens then runs crest to toe (L ≈ 2.1 H at 25°).
  The landing line should fall inside it; bar C checks the toe against the landing line [R].
- In time: seed at τ = touchdown − 0.2 s, the same window as the roof's whitening, so the lens is already under the roof's end when the roof stops [P].
- Along the crest: keep `shoulderSlope` 0.2 per m. That is a 5 m ramp, 0.55 s at the 9 m/s peel, which matches the 0.5 s collapsing-ring zone (4.5 m) [R, built from KB numbers].
- Ruling 10 rank 5(b): keep the whitening over the last 0.2 s of τ, lip tip first. Keep rank 5(a) too (one foam make-up across the join). Do not lengthen `LOFT.endBlend`.

## 3. "Wrong sizes": the ladder, each as a share of H_b (trough to crest at the break)
| Stage | Real | Status |
|---|---|---|
| (a) Crest just before the throw | H_b by definition; its top stands about 0.75–0.85 H_b over still water | [U]. Take ours from the case's τ = 0 frame instead |
| (b) Roof top during the throw | stays near the crest's level, sinking toward touchdown; the case's own H_I (`BarrelCase.breakerHeight`) is the Navier–Stokes value | ours [S, Basilisk]; read it, do not assume |
| (c) First second after touchdown | splash-up sheet to ~1.2 H_b; the dense white body about roof height, not flat | sheet [KB, lab, datum not noted]; body [R] |
| (d) 3–5 s later (end of the outer region, 5–8 h_b) | wave height down 30–40 %; 0.65 H_b in Svendsen's example; crest 0.6–0.7 of that over mean level, so the top is ~0.4–0.45 H_b up | [S, Svendsen 1984 ICCE, plane slope 1:34 lab; crest share from Hansen 1982] |
| Later | sheds below H ≈ 0.4 h_trough (Fr 1.3) | [KB] |

Most likely off: (c), the solver's bore under and just behind the roof's end. Reasons, not a measurement:
the case is sized by foot height and held up by its clock, while the solver has been dissipating since its own onset (ingame-tests.md: it "breaks too early"); and the still is flat there.
Second suspect: (d) dying early if the pool's floor deepens behind the reef, which sends Fr below 1.3.

The probe to run (headless, solver + loft, the rideable build, 12 periods, every column's touchdown):
1. From the loft: crest top at τ = 0, roof top one frame before touchdown, drawn H (`restHeight`), all over still level.
2. From the solver, with the roller's own section reader at the front point's z: η_crest, η_trough, H_s, Fr₁², B_front, still depth, at touchdown and +0.5, +1, +3, +5 s (track the crest).
3. Landing line z (the crash curve) minus solver crest z, and the lens's L at birth.
Report median, p10, p90 of: roof top / crest top; η_crest(solver) / roof top at touchdown; H_s / drawn H at each time; share of columns passing B ≥ 0.3 and Fr ≥ 1.45 at touchdown; seconds until Fr < 1.3.
Read it as: H_s/H at touchdown under ~0.6 means the bore is the fault and the lens will be a white film on flat water.

## 4. Bars (stills and probe, no rider)
- A. Presence: lens pixels > 0 behind the roof's end in every phase still (was 0); no gap over 1 m along the crest between the roof's end and the first column with g > 0.1.
- B. Height step at the join: drawn top (sea + lens lift) just behind the roof's end against the roof top over its last 1 m: at most 0.25 of drawn H [P]. Report it even when it fails; it is the size bar.
- C. Lens size: L / H_s in 2.1–3.5 [KB, Martins]; toe within 1 m of the landing line at birth [P]; H_s at 5–8 h_b in 0.55–0.75 H_b [S].
- D. Life: no lens shed inside its first splash cycle; zero born–shed–born within 0.5 s in a column; report the share shed before 2 s.
- E. Nothing else moves: default build's stills identical without the switch; with it, solver arrays, front records and the rider's water bit-identical; Canyon stills identical.
- F. One white: the lens crest band's mean brightness within 10 % of the roof's whitened tip beside it and of the Canyon's band under the same sky [P].

Must not:
- scale `area` or `voidMean` past their sourced ranges to fill a height gap;
- seed from `PlungingLip` parcels or `ROLLER_AREA` 0.9;
- draw the lens inside the open tube or ahead of the landing line before touchdown − 0.2 s;
- lengthen the end blend (shards, consult log 2026-10-22);
- edit `ROLLER_DEFAULTS`; touch Classic; add noise that is not the integer hash;
- let the lens's lift reach the rider's water in step 1 without the switch saying so.

## 5. The owner's calls
1. Step 1 is drawn only, so for now the rider does not hit what is drawn (by 0.06–0.14 H). Accept until the felt step?
2. If the probe shows a low bore at touchdown: (i) fix the water (land the jet's volume and momentum so the solver makes the bore), (ii) draw a sourced splash-up body from Basilisk frames past touchdown (new collided shape; the library keeps one such frame today), or (iii) accept a low bore.
3. Still open from ruling 10: a drawn collapsing tube for 0.5 s after touchdown.
4. Should the pool's whitewater run on behind the reef, or die in deeper water as the floor dictates?
5. Rich only, or does Classic get the band too? (Standing decision: Classic unchanged but for the swept barrel.)

Sources opened this round: Svendsen 1984, ICCE 19, "Wave attenuation and set-up on a beach" (https://icce-ojs-tamu.tdl.org/icce/index.php/icce/article/download/3785/3468), full text, PDFKit.
Not opened: Blenkinsopp & Chaplin 2007 (search only; numbers above are from our round-7 thesis notes). A second search for measured H/H_b decay curves found nothing usable.
