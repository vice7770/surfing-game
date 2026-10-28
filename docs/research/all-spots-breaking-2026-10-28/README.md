# Every spot's breaking, as the player sees it (all-spots-breaking, 2026-10-28)

Step 3a of the owner's plan, "Canyon first, then continue with all spots": a survey, no game changes. The owner's two
priorities everywhere: **breaking in sequence** (the whole wave breaks along its crest in one travelling line, not a short
patch) and **the wave's shape** (a gentler body as it forms and breaks; every spot but the Beach runs Kennedy's onset 0.65).
The Canyon's numbers are on record (canyon-beach-break, canyon-reef-sequence) and quoted below.

## Headline

| spot | breaks in sequence? | body | why | fix (kind) |
|---|---|---|---|---|
| **Wave Pool** | partly: each arm's line typically 21–31 m, 8 of 10 arms' lines travel 40 m from the apex, but patchy at Big (46 %) | gentle (11–13°) | 71° arms peel slowly; rule A spreads the break along the crest ahead of the peel (longer, faster, patchy) | the bed's arm angle, then the age gate (physical) |
| **Beach** | no: sections of bar close out at once (40 m wide within 2 s in 4 of 5 / 9 of 10 / 6 of 10 waves), rips split them (patches 37–44 %) | gentle (11–18°, onset 0.35) | straight bars parallel to the shore, cut by rips | the bed: the Canyon's oblique bar peaks (physical) |
| **Point** | yes: lines 52–83 m, 7–9 of 9–10 waves travel 40 m+ toward +x, no patches; the peak opens 40 m in 2 s in a third to half of the waves, 6 of 10 at Big | **steep** (22–25°) | onset 0.65 on a sand-like shelf; a fast peel (visible 31–36°) | onset 0.45 keyed by depth (calibration; Big must stay 0.65) |
| **Reef** | yes: lines 38–55 m in a window 81 m long, 2–6 % patches, peel 36–46° on the 45° ledge; Big's line breaks into sections | slab (ξb 1.8–5; 16–20°, p90 28–38°) | its own: the peak sits at the window's −x edge, the pass ends the ledge at x 30 | none needed for sequence; keep 0.65 |
| **Padang Padang** | the solver's yes (48–66 m), **the drawn white patchy** (22–31 % at Medium/Big, against 3–8 %) | plunging (ξb 0.7–0.8; front/back 2–4) | the swept crash holds each curl's white until its touchdown (drawing); the peak opens 44 m in 2 s at Medium (7 of 13) on the 40° wedge | the crash gate's holes (drawing), when tube work resumes; keep 0.65 |

Recommended order: **Point, Beach, Pool, Reef, Padang** (the owner's default was Pool, Beach, Point, Reef, Padang). The
numbers argue for two changes: the Point's fix is one calibration already measured to give a gentler body and longer lines,
so it can go first or ride along with the next step; the Beach is the furthest from breaking in sequence and has a proven
recipe (the Canyon's bars). The Pool already breaks in sequence along most arms, and its fix (the arm angle) needs a
design decision. Reef and Padang come last: the Reef needs nothing for sequence, and Padang's gap is in the tubes' drawing,
which is on hold.

## Method

`spot-probe.ts`: the Canyon's frame probe, made generic. The game's own sea for each spot and size
(`physicalSettingsFor` and `surfZoneConfigFor`; the CPU tier's 24 components; Padang Padang with its barrel cases loaded,
so its tubes are drawn and its crash is on). 1 seed × 9 peak periods per size, frames every 0.25 s, after the spin-up.
Fields: **solver** (strength > 0.3), **drawn** (the white the foam is fed: the solver's everywhere but the Canyon and
Padang Padang, where the swept crash holds it until each tube's touchdown; identical rows are left out), **foam** (dense +
residual > 0.3, which outlives the breaking). One region per spot: the window inside 25 m of its open edges, cut to the
ridden part (the Reef's ledge, Padang's reef; the Pool's two arms, one region each, since an A-frame's arms break apart
from the apex on). Each wave's peak is where its first line lies; its arms are measured from there.

Caveats. The Beach's and the Point's windows are 160 m wide: their region is 110 m, so a line of 109 m fills it. The Reef's
peak sits at the −x edge of its window (crest x −80); its −x side is the open edge's mirror. The Pool's sizes are its own
regular waves (0.82, 1.15, 1.48 m, 10 s). The GPU tier's 64-component seas differ in detail.

## Frame bars (1 seed × 9 periods)

Per wave: typical (median) and longest line along shore, m (90th percentile); the share of its frames with a patch beside
the line; its line 2 s after it starts, m (how many waves ≥ 40 m: closing out at the peak); per arm: waves whose line
travels 40 m or more from their peak as one line, the end's median reach, the visible peel (atan of the crest's speed over
the end's).

| spot | size | field | waves | typical (90th) | longest (90th) | patches | line 2 s in (≥ 40 m) | −x arm ≥ 40 m · end · peel | +x arm ≥ 40 m · end · peel |
|---|---|---|---|---|---|---|---|---|---|
| pool −x arm | small | solver | 12 | 17 (25) | 32 (36) | 14 % | 20 (0) | 9/12 · 50 m · 59° | — |
| pool +x arm | small | solver | 10 | 18 (28) | 33 (37) | 16 % | 19 (0) | — | 9/10 · 52 m · 59° |
| pool −x arm | small | foam | 13 | 21 (27) | 39 (42) | 7 % | 16 (0) | 4/13 · 37 m · 55° | — |
| pool +x arm | small | foam | 10 | 26 (27) | 39 (42) | 4 % | 16 (1) | — | 3/10 · 37 m · 34° |
| pool −x arm | medium | solver | 13 | 21 (29) | 40 (42) | 17 % | 24 (0) | 8/13 · 41 m · 60° | — |
| pool +x arm | medium | solver | 10 | 22 (32) | 39 (45) | 19 % | 23 (0) | — | 8/10 · 52 m · 60° |
| pool −x arm | medium | foam | 12 | 25 (35) | 45 (53) | 5 % | 21 (0) | 6/12 · 40 m · 40° | — |
| pool +x arm | medium | foam | 9 | 25 (34) | 45 (54) | 0 % | 20 (0) | — | 5/9 · 43 m · 32° |
| pool −x arm | big | solver | 10 | 31 (36) | 50 (63) | 47 % | 28 (1) | 8/10 · 57 m · 54° | — |
| pool +x arm | big | solver | 9 | 30 (34) | 50 (62) | 46 % | 27 (1) | — | 8/9 · 57 m · 55° |
| pool −x arm | big | foam | 11 | 41 (46) | 64 (69) | 4 % | 25 (1) | 9/11 · 79 m · 37° | — |
| pool +x arm | big | foam | 10 | 40 (46) | 65 (70) | 4 % | 24 (1) | — | 9/10 · 77 m · 37° |
| beach | small | solver | 7 | 36 (57) | 70 (109) | 37 % | 58 (4) | 0/7 · 4 m · —° | 5/7 · 44 m · 39° |
| beach | small | foam | 8 | 47 (88) | 71 (109) | 8 % | 43 (5) | 0/8 · 9 m · —° | 4/8 · 41 m · 27° |
| beach | medium | solver | 10 | 66 (109) | 109 (109) | 44 % | 61 (9) | 2/10 · 18 m · —° | 8/10 · 62 m · 23° |
| beach | medium | foam | 10 | 70 (109) | 109 (109) | 16 % | 67 (10) | 3/10 · 26 m · 5° | 7/10 · 55 m · 10° |
| beach | big | solver | 10 | 80 (109) | 109 (109) | 3 % | 46 (6) | 4/10 · 35 m · 40° | 5/10 · 55 m · 28° |
| beach | big | foam | 10 | 109 (109) | 109 (109) | 1 % | 56 (6) | 5/10 · 55 m · 32° | 6/10 · 55 m · 17° |
| point | small | solver | 4 | 32 (47) | 54 (56) | 0 % | 35 (1) | 0/4 · 3 m · —° | 4/4 · 97 m · 36° |
| point | small | foam | 4 | 52 (55) | 86 (95) | 0 % | 38 (1) | 0/4 · 4 m · 47° | 4/4 · 107 m · 30° |
| point | medium | solver | 9 | 52 (69) | 85 (109) | 0 % | 34 (3) | 0/9 · 2 m · —° | 7/9 · 83 m · 35° |
| point | medium | foam | 10 | 58 (101) | 109 (109) | 0 % | 37 (3) | 0/10 · 3 m · —° | 7/10 · 84 m · 25° |
| point | big | solver | 10 | 83 (109) | 109 (109) | 0 % | 88 (6) | 1/10 · 5 m · —° | 9/10 · 70 m · 32° |
| point | big | foam | 9 | 100 (109) | 109 (109) | 0 % | 88 (7) | 3/9 · 12 m · —° | 6/9 · 68 m · 22° |
| reef | small | solver | 8 | 52 (57) | 79 (80) | 2 % | 28 (1) | 0/8 · 2 m · —° | 3/8 · 30 m · 43° |
| reef | small | foam | 7 | 48 (73) | 80 (80) | 2 % | 25 (0) | 0/7 · 2 m · —° | 2/7 · 28 m · 28° |
| reef | medium | solver | 8 | 55 (58) | 80 (80) | 3 % | 29 (0) | 0/8 · 2 m · —° | 6/8 · 65 m · 36° |
| reef | medium | foam | 8 | 64 (80) | 80 (80) | 1 % | 26 (0) | 0/8 · 2 m · —° | 5/8 · 65 m · 30° |
| reef | big | solver | 16 | 38 (65) | 70 (80) | 6 % | 27 (2) | 0/16 · 8 m · 46° | 4/16 · 23 m · 36° |
| reef | big | foam | 12 | 43 (80) | 80 (80) | 5 % | 23 (1) | 0/12 · 2 m · 26° | 4/12 · 33 m · 29° |
| padang | small | solver | 14 | 48 (76) | 70 (128) | 0 % | 30 (4) | 1/14 · 3 m · 81° | 6/14 · 34 m · 41° |
| padang | small | drawn | 15 | 24 (68) | 56 (128) | 7 % | 24 (4) | 1/15 · 4 m · 82° | 6/15 · 32 m · 42° |
| padang | small | foam | 24 | 44 (76) | 74 (104) | 44 % | 30 (6) | 0/24 · 3 m · 73° | 12/24 · 49 m · 31° |
| padang | medium | solver | 13 | 66 (98) | 124 (128) | 8 % | 44 (7) | 0/13 · 3 m · —° | 1/13 · 30 m · 52° |
| padang | medium | drawn | 13 | 58 (88) | 114 (128) | 22 % | 32 (3) | 0/13 · 3 m · —° | 4/13 · 31 m · 39° |
| padang | medium | foam | 14 | 44 (92) | 68 (128) | 32 % | 26 (2) | 0/14 · 3 m · —° | 4/14 · 32 m · 31° |
| padang | big | solver | 17 | 44 (128) | 74 (128) | 3 % | 38 (6) | 1/17 · 3 m · —° | 5/17 · 36 m · 25° |
| padang | big | drawn | 16 | 60 (98) | 104 (128) | 31 % | 38 (5) | 0/16 · 3 m · —° | 5/16 · 36 m · 25° |
| padang | big | foam | 13 | 66 (120) | 94 (128) | 8 % | 38 (5) | 1/13 · 3 m · —° | 8/13 · 42 m · 22° |

The Canyon on record (Medium, 3 seeds × 14 periods): the reef's drawn line typical 10 m, longest 16 m, its end 19 m along
shore (54 m down its 70° line, 31 of 47 past 40 m down it); the beach peaks' drawn lines typical 39–44 m, longest 73–76 m,
each arm past 40 m in 25–32 of 51–52 waves, the peak 40 m wide 2 s in in 29–35 of 50–51.

## First breaks: depth, face and ξb

Each column's outermost breaking cell jumping 5 m seaward (one per column per 0.7 Tp, at least 0.4 h_b deep): the crest's
still depth, the face height, the face's steepest metre, its front over back mean slope, and ξb = tan β / √(H/L0) with β
the bed's slope along +z at the crest (and over its whole gradient: for oblique beds, nearer the ray's). Median (10–90 %).

| spot | size | swell | first breaks | depth, m | face H, m | steepest metre | front / back | ξb along +z | ξb, whole gradient |
|---|---|---|---|---|---|---|---|---|---|
| pool | small | 0.82 m, 10 s | 1571 | 1.3 (0.7–1.6) | 0.58 (0.38–0.89) | 10 (6–20)° | 1.85 (1.14–2.92) | 0.33 (-0.45–0.47) | 0.82 (0.55–1.33) |
| pool | medium | 1.15 m, 10 s | 1663 | 1.6 (1.2–2.0) | 0.79 (0.59–1.18) | 11 (7–23)° | 1.46 (0.94–2.31) | 0.34 (0.24–0.40) | 0.72 (0.46–1.20) |
| pool | big | 1.48 m, 10 s | 1914 | 2.1 (1.6–2.5) | 1.10 (0.77–1.41) | 13 (9–22)° | 1.38 (0.92–2.04) | 0.24 (0.00–0.36) | 0.47 (0.00–0.99) |
| beach | small | 0.90 m, 9 s | 733 | 1.5 (0.8–1.8) | 0.66 (0.41–0.93) | 11 (9–16)° | 1.72 (1.05–2.96) | 0.30 (-0.03–0.54) | 0.30 (0.14–0.54) |
| beach | medium | 1.40 m, 11 s | 887 | 1.9 (1.5–2.3) | 1.15 (0.68–1.34) | 16 (10–18)° | 1.53 (1.02–2.34) | 0.36 (0.11–0.71) | 0.45 (0.17–0.71) |
| beach | big | 2.40 m, 14 s | 816 | 3.0 (2.1–3.8) | 1.98 (1.35–2.44) | 18 (15–20)° | 1.61 (0.97–2.32) | 0.21 (0.16–0.78) | 0.21 (0.16–0.81) |
| point | small | 0.90 m, 9 s | 358 | 1.2 (0.9–1.4) | 0.96 (0.77–1.10) | 22 (20–25)° | 3.60 (1.85–4.88) | 0.46 (0.43–0.51) | 0.53 (0.49–0.59) |
| point | medium | 1.40 m, 11 s | 787 | 1.9 (1.3–2.2) | 1.55 (1.04–1.85) | 24 (22–26)° | 1.84 (1.23–3.56) | 0.44 (0.40–0.54) | 0.51 (0.47–0.62) |
| point | big | 2.40 m, 14 s | 828 | 2.7 (2.3–3.7) | 2.34 (1.83–2.93) | 25 (23–28)° | 1.49 (1.07–4.15) | 0.46 (0.41–0.52) | 0.53 (0.47–0.60) |
| reef | small | 1.30 m, 15 s | 391 | 2.1 (1.5–3.4) | 1.06 (0.74–1.39) | 20 (4–28)° | 5.01 (1.22–20.02) | 1.88 (0.00–6.54) | 1.96 (0.00–9.23) |
| reef | medium | 1.90 m, 16 s | 301 | 3.7 (2.5–5.2) | 1.25 (0.73–1.62) | 16 (10–35)° | 1.80 (1.01–17.78) | 5.23 (0.81–6.79) | 7.38 (1.56–9.60) |
| reef | big | 3.00 m, 17 s | 370 | 5.5 (2.9–7.2) | 1.79 (1.07–2.33) | 19 (12–38)° | 1.97 (0.85–13.20) | 1.81 (1.08–5.17) | 2.09 (1.46–7.41) |
| padang | small | 1.20 m, 16 s | 514 | 2.6 (1.3–3.3) | 1.30 (0.58–2.42) | 11 (8–21)° | 2.08 (0.96–5.08) | 0.72 (0.00–0.92) | 0.94 (0.00–1.21) |
| padang | medium | 2.20 m, 17 s | 466 | 3.3 (2.1–4.8) | 1.70 (1.00–2.66) | 11 (9–21)° | 3.72 (2.51–6.31) | 0.83 (0.65–1.09) | 1.10 (0.84–1.42) |
| padang | big | 3.80 m, 18 s | 442 | 6.1 (3.5–6.5) | 2.40 (1.77–3.99) | 15 (11–24)° | 2.81 (0.00–3.51) | 0.20 (-0.00–0.85) | 0.37 (0.19–1.11) |

## Screens (Medium; one change each, probe only)

| change | spot | typical / longest | patches | arm(s) past 40 m | line 2 s in (≥ 40 m) | peel | steepest metre |
|---|---|---|---|---|---|---|---|
| (the spot's) | Pool | 21–22 / 39–40 | 17–19 % | 8/13, 8/10 | 23–24 (0) | 60° | 11° |
| age join 0.5 (the Canyon reef's gate) | Pool | 16 / 26–27 | 0 % | 2/13, 2/10 | 17 (0) | 66–68° | 11° |
| onset 0.45 | Pool | 20–22 / 39–40 | 4–6 % | 6/13, 6/10 | 32 (0) | 65–67° | 11° |
| (the spot's) | Beach | 66 / 109 | 44 % | 2/10, 8/10 | 61 (9) | 23° | 16° |
| age join 0.5 | Beach | 58 / 68 | 55 % | 2/10, 7/10 | 57 (9) | 27° | 17° |
| (the spot's), seeds 1–3 | Point | 49–54 / 84–97 | 0 % | 24 of 28 | 34–56 (14 of 27) | 31–35° | 24° |
| onset 0.45, seeds 1–3 | Point | 56–64 / 100–109 | 0 % | 26 of 29 | 39–63 (19 of 29) | 26–33° | 19–20° |
| onset 0.45, Small | Point | 40 / 62 (32 / 54) | 0 % | 8/10 (4/4) | 23 (2 of 10) | 40° | 19° (22°) |
| onset 0.45, Big | Point | 102 / 109 (83 / 109) | 0 % | 9/10 (9/10), −x 5/10 | **109 (9 of 9)** (88, 6 of 10) | 36° | 21° (25°) |
| age join 0.5 | Point | 52 / 83 | 0 % | 7/9 | 34 (3) | 34° | 24° |
| onset 0.45 | Reef | **23 / 37** (55 / 80) | 2 % | 6/16 (6/8) | 24 (0) | 36° | 15° (16°) |

## Per spot: why, and the fix

The Canyon taught six causes to look for: counting and waiting artefacts in the drawn white; the age gate or join; an
onset too high for the bed; refraction shrinking the shoulder; the bed's peel speed; and each column's breaking time.

**Wave Pool** (an A-frame: apex at z −210, arms at 71° to the shore, 65° past x 40, 1:18 terrace, 1 m crest, regular 10 s
waves).
- *Drawn:* the solver's own (no front, no crash): no counting artefact.
- *Peel speed and breaking time:* the 71° arms peel along shore at about c / tan 71° ≈ 0.34 c, as the Canyon reef; with
  bores breaking a few seconds per column, that alone gives lines of about 15 m (the gated screen: 16 m, peel 66–68°).
- *The age join:* the Pool runs rule A, so the breaking age passes along the crest ahead of the geometric peel (the
  advisor's 2026-10-06 finding at the Canyon: unbroken water then breaks at the aged threshold). That makes the arms' lines
  longer (21–31 m) and faster (visible 54–60°) and carries 8 of 10 arms past 40 m, but in patches (17–19 %, 46 % at Big).
  The gate removes the patches and halves the reach (2 of 10 past 40 m).
- *Onset:* the first breaks are already gentle (11–13°: the aged threshold breaks them early); 0.45 changes little.
- *Fix (physical):* the bed: arms nearer 55–60° peel 1.6–1.9 times faster along shore (c / tan θ), which lengthens the line
  for the same breaking time; then the age gate to keep the arms clean. Without a bed change, rule A is what makes the
  Pool's arms break in sequence, at the cost of Big's patches. A design decision for the owner.

**Beach** (Dean profile with a bar 1.5–3 m deep, shore-parallel, cut by rips at random intervals; onset 0.35).
- *Drawn:* the solver's own.
- *Bed:* a shore-parallel bar meets each crest along its whole length at once: sections close out (the line 40 m or more
  2 s in: 4 of 5, 9 of 10, 6 of 10), and the rips between them split the crest into patches (37–44 % at Small and Medium).
  Its visible peel (23–39°) is the close-out's, not a peel. This is physical for straight bars: there is nothing to peel
  along.
- *Age join:* the gate makes it patchier (55 %): rule A stays, as on the Canyon's bars.
- *Onset:* 0.35 already gives the gentlest faces surveyed (11–18°).
- *Fix (physical):* the bed: oblique bar peaks, as the Canyon's beach break (planar bars at 40° to the shore, rounded
  12 m tips, onset 0.40, rule A: lines typically 39–44 m, arms past 40 m in half the waves); the Beach's own swell
  (Hs 0.9–2.4 m) is the Canyon's.

**Point** (a headland; a planar shelf seaward of it; onset 0.65).
- *Drawn:* the solver's own; no patches anywhere.
- *Sequence:* already there: 7–9 of 9–10 waves travel 40 m or more toward +x, lines 52–83 m (filling the 110 m region at
  Big), visible peel 31–36°. The peak opens 40 m within 2 s in a third to half of Medium's waves (14 of 27, 3 seeds) and 6
  of 10 at Big: the fast peel of a straight shelf.
- *Body:* the steepest surveyed: the face's steepest metre at the first breaks is 22–25°, front/back 1.5–3.6. Onset 0.65 on
  a planar shelf: the advisor's inference gives 27–31° at onset for 0.65, 20–22° for 0.45.
- *Fix (calibration):* onset 0.45 measured over 3 seeds at Medium: the steepest metre 24° → 19–20°, lines 10 m longer, as
  many arms past 40 m (26 of 29 against 24 of 28), the peak opening a little wider (19 of 29 against 14 of 27). At Big, 0.45
  everywhere closes the whole window out (9 of 9 waves 109 m wide in 2 s, both ways): key it by depth, as the Canyon's bars
  (0.45 in water 3 m deep or shallower, easing to 0.65 by 4.5 m; the advisor, 2026-10-23), and screen Big again.

**Reef** (a 45° ledge rising 1:2.29 from 10 m to its 1.5 m crest, a reef flat and lagoon behind, the pass at x 80).
- *Drawn:* the solver's own.
- *Sequence:* yes: lines typically 52–55 m in a ledge 81 m long (to the pass), patches 2–6 %, 6 of 8 Medium waves past 40 m,
  visible peel 36° on the 45° ledge. Big breaks in sections (16 waves counted for 8–10 sets; ends 23 m): its first breaks
  stand 5.5 m deep (2.9–7.2), on the fore slope seaward of the ledge, as the slab's sets do.
- *Body:* a slab by design (the Teahupo'o brief): ξb 1.8–5 (a 1:2.29 face), the steepest metre 16–20° at the median and
  28–38° at the 90th, front/back up to 13–20.
- *Onset:* 0.45 splits the line (typical 23 m, 16 waves) without softening the face (15°): keep 0.65.
- *Fix:* none needed for sequence. If the owner wants longer lines: the peak sits at the window's −x edge, so the ride is
  the ledge's 106 m to the pass at most (layout, not physics).

**Padang Padang** (a 40° wedge line, 1:15 across it, 1:80 ramp; the swept barrel draws the tubes and its crash is on).
- *Drawn:* **here the drawn white differs from the solver's.** The crash holds each open curl's white until its touchdown,
  so the line the player sees has holes: patches 7 / 22 / 31 % of frames (Small / Medium / Big) against the solver's
  0–8 %, and Small's drawn line half the solver's (24 m, 48 m). Some of that is right (no white inside an open tube until
  its lip lands); how much, the tube work will have to say. A drawing issue, like the Canyon's.
- *Peel:* the 40° wedge peels fast (c / tan 40° ≈ 1.2 c): the peak opens 44 m in 2 s at Medium in 7 of 13 waves, visible
  peel 52° (Medium) and 25° (Big: nearly a close-out).
- *Body:* plunging (ξb 0.7–0.8 along the path at Small and Medium; front/back 2–3.7); Big breaks 6 m deep on the ramp
  (ξb 0.2 there).
- *Fix:* the crash gate's holes (drawing), when tube work resumes. Keep 0.65: the swept barrel's clock starts at Kennedy's
  onset (`breaking.md`), so changing it moves every tube.

## The onset each spot should get

Sources: Kennedy et al. (2000) 0.65 → 0.15 √(g h) (regular waves on a plane beach); FUNWAVE's Vincent & Briggs shoal, a
mound, 0.45 → 0.35; the Beach's 0.35. The advisor (consult-log, 2026-10-23): set it **per bed region, not by slope or ξ**
(no source ties η_t^(I) to slope; it is a calibration), pin the reefs at exactly 0.65, and key a low onset by depth so Big
does not close out across a floor; face at onset about 27–31° at 0.65, 24–27° at 0.55, 20–22° at 0.45, 16–18° at 0.35
(η_t / c, inferred). That answers the onset rule, so no new consult was needed.

| spot | bed region | onset | evidence |
|---|---|---|---|
| Wave Pool | terrace and arms | 0.65 (keep) | first breaks already 11–13°; 0.45 changed little |
| Beach | bars and rips | 0.35 (keep), 0.40 on Canyon-style bar peaks | gentlest faces surveyed (11–18°) |
| Point | its shelf, by depth | 0.45 at ≤ 3 m easing to 0.65 at ≥ 4.5 m | Medium 24° → 20° with longer lines (3 seeds); Big must stay 0.65 (0.45 closes the window out) |
| Reef | ledge, flat, lagoon | 0.65 (pinned) | a slab; 0.45 splits its line |
| Padang Padang | wedge and ramp | 0.65 (pinned) | the tubes' clock |
| Canyon | reef 0.65 (pinned), bars 0.40 | as built | canyon-beach-break |

## Strips (Medium, the game's look: Rich, midday, the GPU tier)

10 frames 1 s apart, from above (170 m up over the take-off, seaward at the top) and from the spot's start camera (70 m
beside and 95 m behind the take-off, 16 m up), each at a set the water sheet holds on near the take-off:

- `pool-medium-above-strip.jpg`, `pool-medium-start-strip.jpg`: the ^ at the apex, each arm's white a short segment
  travelling down it, last wave's segments further down the arms.
- `beach-medium-above-strip.jpg`, `beach-medium-start-strip.jpg`: a bar section 20–30 m long whitening at once, a shorter
  one beside it across a rip; from the start, a long line along the bar.
- `point-medium-above-strip.jpg`, `point-medium-start-strip.jpg`: the crest breaking from the headland toward +x, a thin
  white line at the lip and a grey band behind it.
- `reef-medium-above-strip.jpg`, `reef-medium-start-strip.jpg`: the line peeling down the ledge (the −x half of the view
  is the open edge's mirror), the lip throwing at its end.
- `padang-medium-above-strip.jpg`, `padang-medium-start-strip.jpg`: the wedge under a white blanket of foam, the line along
  its edge with the swept tubes; from the start, the swell lines and a tube at the end.

## Tools

- `spot-probe.ts`: the frame bars and first breaks for any spot and size (`--onset`, and `--join` for the age gate, set on
  the solver after its spin-up: screens only).
- `survey-table.mjs`: the tables from its JSONs. `spot-info.ts`: each spot's window, take-off and onset.
- `runs/`: the 15 runs' printed results.
