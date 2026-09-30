# Periodic waves in Basilisk (2026-09-30)

The solitary runs of the Reef's ledge broke on the flat, not at the ledge ([reef-ledge.md](reef-ledge.md)). So the owner approved periodic-wave runs ("go ahead with the periodic wave runs", 2026-09-30). One-page summary: [../../reef-ledge-runs.md](../../reef-ledge-runs.md).

- **Tags:** [measured] = read from these runs; [inferred] = our reasoning.

## 1. Setup

- **`tools/basilisk/periodic.c`:** round 6's `slope.c` with the solitary wave replaced by a wave train. It reads `train.dat` (η and dη/dx on a 0.002 h0 grid), written by `analysis/cnoidal_train.py`.
  - The train: first-order cnoidal theory, with the elliptic parameter m solved so the wavelength over the celerity equals the period.
  - Two crests, with a trough at the left wall. The train ends at the first zero crossing ahead of the leading crest, with still water beyond, so the leading crest meets still water and the second has a real trough ahead. **The second crest is the one studied.**
  - The velocity keeps `slope.c`'s long-wave form: u = c η/(1 + η), and w from continuity.
- **Two phases** (`tools/basilisk/run_periodic.sh`):
  1. Level 10 to a switch time, dumping `final`.
  2. Level 12 restarted from that dump, keeping the finest two levels inside a window (`XWIN0`, `XWIN1`).
  - Restoring a level-10 dump into a level-12 build works: the time carries on (a smoke test at levels 8 → 9 checked it). `slope.c`'s "restored at t=0" message is printed before `restore()` sets the time.
- **Level-9 tests** (4–6 minutes each) set every case's switch time and window.
- **Cost on the owner's M1,** at a load average of 23–63 alongside other sessions: phase 1 took 10–11 minutes, phase 2 1.8–2.1 hours. That is 12 cm cells on the Reef (14 cm at the flat's edge) and 11 cm at Padang.

| Case | h0 | H/h0 | Period | Slope along the path | Flat | Domain | Switch → end | Window | Train (m; L; c/√(gh0); crest, trough) |
|---|---|---|---|---|---|---|---|---|---|
| reef42 | 10 m | 0.3 | 14 s | 1:4.2 | 0.15 h0 | 48 h0 | 17 → 25 | 20–36 h0 | 0.981; 141 m; 1.016; +2.13, −0.87 m |
| reef60 | 10 m | 0.3 | 14 s | 1:6 | 0.15 h0 | 48 h0 | 18 → 27 | 21–38 h0 | as above |
| padang19 | 7 m | 0.3 | 16 s | 1:19 | 0.1786 h0 | 64 h0 | 31 → 41 | 37–56 h0 | 0.9988; 140 m; 1.055; +1.66, −0.44 m |

Times are in √(h0/g), 1.01 s at the Reef and 0.845 s at Padang.

**Caveats [inferred]:**
- First-order cnoidal theory at H/h 0.3 is only an approximation. The long periods put these trains near the solitary limit (m ≥ 0.98), and the start throws small transients off the left wall.
- The right wall is closed, 17–18 h0 behind the ledge, so the flat can't drain to a lagoon or channel. Until the second crest breaks the flat near the ledge stays below still level, as the figures show.
- The runs are 2D, at round 6's lab-scale Reynolds (40 000) and Bond (1000) numbers.

## 2. What happens [measured]

- **The Reef:**
  - The leading crest runs onto the flat, as the solitary wave did.
  - Its backwash drains the water over the ledge to about 2 m below still level: the step.
  - The second crest's face throws small steps and curls where the backwash meets it (t ≈ 19–21, about 12 m before the ledge top).
  - Then it goes vertical at the ledge top (1:4.2: x 290.7 m against the top at 292.7 m) or 3.4 m before it (1:6).
  - It throws a thick lip that flies 10–12 m and lands in water still 0.5–0.6 m below still level.
- **Padang:** the second crest breaks on the wedge, going vertical 21.5 m before the flat in 2.38 m of still water, over a trough 0.81 m below still level. Round 6's solitary wave broke 3.6 m before the flat.

## 3. The plunges [measured]

Measured by `analysis/plunge_measure.py`, the plunge_measure JSON files in `data/`.
- **Water level ahead:** the landmarks use the local trough, not still water. Otherwise the lip, whose tip comes down below still level, reads as reaching the water ahead and the overturn is missed.
- **Crest search:** only past the face's steps (x ≥ 28.9, 30.0 and 45.0 h0).
- **Normalising height:** H is the breaking height, crest minus the trough ahead at the face-vertical frame, as the game sizes its jets.
- **Lip thickness:** the jet's area over the tube's length.

| Per H at breaking | Reef 1:4.2 | Reef 1:6 | Padang 1:19 | The game's Reef (provisional) |
|---|---|---|---|---|
| H at breaking (crest, trough ahead) | 2.91 m (+2.13, −0.78) | 3.50 m (+2.44, −1.06) | 3.41 m (+2.60, −0.81) | |
| Open, vertical to touchdown | 1.64 s | 1.77 s | 0.99 s | |
| Jet just before touchdown | 0.55 H² | 0.62 H² | 0.15 H² | 0.44–0.47 H² |
| Lip thickness | 0.46 H (11 cells) | 0.41 H (12 cells) | 0.18 H (5.6 cells) | 0.5 H |
| Tube at 70 % of the flight | 0.30 H², L/W 1.26, 50° | 0.46 H², 1.39, 46° | 0.12 H², 1.16, 61° | |
| Tube at 85 % of the flight | 0.34 H², L/W 1.48, 19° | 0.45 H², 1.80, 19° | 0.17 H², 1.91, 46° | 0.43 H², 1.42, 23° |
| Tube just before touchdown | 0.26 H², L/W 3.3, 6° | 0.26 H², 4.0, 9° | 0.18 H², 2.4, 40° | |

- **Per H at touchdown** the Reef's numbers grow (1:6: jet 1.18 H²), because the crest falls as the lip leaves. The game's H is the breaking wave's, so per H at breaking is the comparison.
- **Padang against Pick & Feddersen's plane-slope fits at its ψ0 (0.071):** jet 0.165 H², tilt 35°, length over width 2.4, tube 0.34 H². Jet, tilt and shape agree, and the tube is about half, as round 6 found (the reef flat caps it).
- **"Just before touchdown"** is the last overturned frame with the jet at least 3 cells off the face; closer than that the void reads as a sliver. The Padang session found this in its level-12 library runs. The guard moved only the 16 s Padang case (length over width 2.51 → 2.44, tilt 37° → 40°) and the 14 s case (§7).
- **The tube's shape changes through its life.** It is round for most of the flight (length over width 1.2–1.8) and stretches flat only as the lip lands. Mead & Black's surfed-break photos (1.42–3.43, roundest on steep reefs) catch it in flight; O'Dea et al.'s field closures run 1.70–3.15.

## 4. Padang's onset lag for swell [measured]

- **The solver's side:** the Padang session's 1D periodic runs put its solver's fresh onset for a 1.66 m foot crest at 16 s at 3.18 m still depth (x = 317.3 m here).
- **The lag:** Basilisk's crest passes that depth at t = 34.47 √(h0/g) and goes vertical at 36.79, so the lag is 2.32 √(h0/g) = 1.96 s.
- **Crest speed near vertical:** 7.85 m/s, about 1.1 √(g(d + η)), as in Tissier et al. 2013.
- **Against the solitary table:** at the same join depth (0.454 h0) it gives about 2.75, so swell comes in about 16 % shorter.
- **Error bar:** about ±0.5 √(h0/g), mostly from applying the 1D table's onset depth to this train.
- **The table:** the Padang session now scales the solitary rows by 0.84 around this point: 0.237 → 1.97, 0.35 → 2.19, 0.454 → 2.32, 0.5 → 2.37.
- **Two more cases pin its ends:** 2.5 m at 18 s and 1.2 m at 14 s (§7).

## 5. What it means [inferred]

- **The Reef's thick lip is sourced.** 0.41–0.46 H against the provisional 0.5 H, which rested on Shand 2024's description.
- **The Reef's jet is slightly larger than asked:** 0.55–0.62 H² at touchdown against 0.44–0.47.
  - On main today 48–62 % of Reef throws already starve at 0.47 (the half-taper session's runs).
  - So raising the ask would starve more, unless the lip-jet source's 0.2 cap also rises for the Reef.
  - [measured] At the face-vertical frame, the tapered ±2H window above the trough (the lip-jet source's window) holds only 0.86–1.08 H² on the Reef. So its jet takes 57–64 % of that water; at Padang it takes 12 % (1.29 H²).
  - [inferred] The game's broader crest holds about 2.6 H² in the same window (0.47 ÷ its f of 0.18). A sourced 0.55–0.6 H² ask would need a share of about 0.21–0.24, just over the source's 0.2 cap. So raising the Reef's ask means raising its cap to about 0.3 as well.
- **The Reef's tube as drawn is supported,** taken at about 80 % of its flight: 0.34–0.45 H² with length over width 1.5–1.8 at 85 %, against the provisional 0.43 H², 1.42 and 23°. It flattens to 3.3–4.0 only as the lip lands.
- **The swept barrel should take the tube's time course from the profile library,** not a single shape: round in flight, flat at touchdown.

## 6. Reproducing

```
tools/basilisk/run_periodic.sh run reef42 reef60 padang19      # PYTHON=<python with numpy, scipy, matplotlib>
tools/basilisk/run_periodic.sh status
python3 tools/basilisk/analysis/plunge_measure.py tools/basilisk/runs/periodic_reef42_L12 48 12 10 21.0 23.0 28.9
python3 tools/basilisk/analysis/plunge_measure.py tools/basilisk/runs/periodic_reef60_L12 48 12 10 22.3 25.6 30.0
python3 tools/basilisk/analysis/plunge_measure.py tools/basilisk/runs/periodic_padang19_L12 64 12 7 35.0 39.5 45.0
```

Phase 2 doesn't write `bed.dat` (it restarts past step 1); copy phase 1's for the figures.

## 7. Two more Padang cases (for the lag table's ends) [measured]

Same transect and method, level 12 (`padang19b`: domain 72 h0, switch 32 → 42, window 45–64 h0; `padang19c`: 64 h0, 31 → 41, 38–52 h0). Each fine phase took 29–38 minutes, the Mac being quieter by then.
- **The foot crest** is the crest's height as it passes the 7 m foot, measured in each run (not the train's starting height).
- **The solver's onset depth** comes from the Padang session's per-period 1D table, keyed on that height and interpolated.

| Case | Foot crest | Solver onset depth (d/h0) | Basilisk vertical depth | Lag | Jet, tube per H at breaking | Length ÷ width, tilt, open | Lip |
|---|---|---|---|---|---|---|---|
| 14 s, H/h0 0.24 | 1.22 m | 2.51 m (0.358) | 2.45 m (H 2.74 m) | 0.22 √(h0/g), 0.18 s | 0.052, 0.038 | 1.8, 71°, 0.78 s | 0.15 H, 3.6 cells: under-resolved |
| 16 s, H/h0 0.30 | 1.65 m | 3.17 m (0.453) | 2.38 m (H 3.41 m) | 2.30, 1.94 s | 0.15, 0.18 | 2.4, 40°, 0.99 s | 0.18 H, 5.6 cells |
| 18 s, H/h0 0.42 | 2.50 m | 3.62 m (0.517) | 2.97 m (H 4.17 m) | 1.60, 1.35 s | 0.12, 0.115 | 2.4, 40°, 1.06 s | 0.18 H, 6.2 cells |

- **The lag isn't a clean function of join depth** [inferred]. The small 14 s wave goes vertical almost exactly where the solver onsets it; the larger ones go vertical 0.65–0.8 m shallower.
  - The spread (0.2–2.3) exceeds each lag's ±0.5 √(h0/g) uncertainty.
  - The 0.358 row sits near the table's thin small-wave end (the solver seldom breaks such waves fresh on the wedge).
- **Two ways to use it,** offered to the Padang session:
  - (a) replace the scaled rows with these three;
  - (b) key the throw directly on the Navier–Stokes breaking depth by foot crest and period, dropping the lag and one error source.
