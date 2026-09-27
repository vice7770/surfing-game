# Wave sizes

Agreed in a grilling session on 2026-09-27 (three rounds, Q1–Q14, every recommendation accepted). This is the requirements record; the plan follows it. Details the grilling left open, settled while writing it, are marked **(settled in the spec)**.

## Goal

Surf in the game is as big as the swell says, and the game says how big it is the way surfers do.

- Today a 3 m buoy swell at 12 s breaks faces of 1.4–2.3 m (median at the lip's throws); real surf from that swell breaks ~4 m faces with sets near 6 m on a reef.
- The player reads the surf as surfers do: a forecast range of face heights, a body-relative name (head high, double overhead), and optionally the Hawaiian scale.

## How surf is measured (the record the design rests on)

- **Buoys** report the significant height Hs (the mean of the highest third of waves) and the peak period Tp, in deep water. Hs is not the surf.
- **Face height** is the wave's height from trough to crest as it breaks, the size a surfer rides. Forecasts give it as a range: the typical breaking face (the highest third, H1/3) to the sets (the highest tenth, H1/10 ≈ 1.27 H1/3 in a Rayleigh sea).
- **Shoaling** grows the waves from deep water to the break: how much depends on the period and the bed (steep reefs and focusing bathymetry make much bigger surf from the same buoy). Empirical breaker heights (Komar & Gaughan 1972, H_b = 0.39 g^0.2 (T H0²)^0.4; reef fits such as Caldwell & Aucan 2007) give ~4 m faces from Hs 3 m at 12 s.
- **Body-relative** names (knee, waist, head high, overhead, double overhead) compare the face to the surfer.
- **The Hawaiian scale** reads about half the face height, in feet.

## Starting point

- The Wave Lab's Height slider (0.3–3 m) and the Surf screen's swells are Hs **at the tank's offshore edge**, which is only 5–10 m deep (`OFFSHORE_DEPTH` beach 5, point 8, reef 10, canyon 5). The sea enters through a relaxation zone at z −330…−270, the bed blends from the spot's own to that flat floor over −270…−190, and the 1 m fine zone starts at −150.
- The spots were built for 1–2 m surf: at Hs 3 m the beach's whole tank is surf zone, and the Point and Reef break where the tank is already blended flat.
- The boundary sea uses shallow-water wave numbers whatever the solver stage.
- The Wave Lab info card shows the face under the view (one reading). Nothing measures the surf over time, and nothing names its size.
- The surfers are 1.65–1.73 m tall (`public/assets/surfers/surfers.json`).

## Decisions

### What the input means

- **The Height slider stays buoy Hs and Tp, now in deep water** (Q1). The tank shoals it to its edge by linear theory: H_edge = K_s H0, K_s = √(c_g0 / c_g(h_edge)) at Tp.
- **Ranges:** Height 0.3–4 m, Period 6–18 s; a storm's swell is clamped to the same 4 m (Q2).
- **Exceptions, where the sea must not change (settled in the spec):**
  - **Practice** keeps its groundswell exactly (edge Hs 1.4 m at 12 s): P9–P12's riding is tuned on it.
  - **The Canyon** keeps its tank, bed and sea exactly (its swell is taken at the edge, as today) and its 3 m cap: the riding reference wave and Surf School's recorded sea are canyon seas.
  - The Surf screen's small / medium / big swells stay as they are, now read as buoy values: their surf grows by the shoaling coefficient (1.0–1.45; most at the shallow Beach on long periods), which is the intended fix.

### Reading the surf

- **Surf height is measured, not predicted from Hs** (Q3). Each wave breaking at the take-off is measured as it starts to break: its face, crest to the trough ahead. The readout is the range H1/3–H1/10 of the waves measured over the last 2 minutes of sea time (Q4).
  - **Settled in the spec:** "at the take-off" means columns within 10 m of the take-off point along shore. One wave is the onsets there within half a period of each other; its face is the largest of them. Fewer than 3 waves reads "measuring…".
- **A body-relative name** comes with it, relative to the chosen surfer's height, or 1.75 m when none is chosen (Q5). **Settled in the spec:** the name of the typical face (H1/3), by its ratio to the surfer's height: ankle < 0.2, knee < 0.35, thigh < 0.5, waist < 0.65, chest < 0.78, shoulder < 0.9, head high < 1.15, overhead < 1.5, well overhead < 1.85, double overhead < 2.5, triple overhead < 3.5, bigger.
- **Units** (Q6): faces in the player's m or ft, or the Hawaiian scale (half the face, in ft) as a new "Surf height" setting: Face (default) or Hawaiian.
- **Where it shows** (Q7):
  - a **Surf** row at the top of the Wave Lab's info card (the measured range and name);
  - the Surf screen's swell choices, and its pause card (the measured surf);
  - a **predicted range beside the Height slider**, from a model calibrated on the tank by the size report (below), so the player sees the surf a setting will make before the sea is built.

### Making the surf big enough

- **Target** (Q8): sets to ~6 m faces at the Reef and Point on the biggest days (Hs 4 m, long period); 3–4 m close-outs at the Beach. Big-wave surf (10 m+, tow-in) goes to the Backlog.
- **Deeper outer zones fitted to real profiles** (Q9). A research doc sources measured profiles and the generic shapes are fitted to them:
  - the **Reef**: a steep drop from the channel to deep water (Pipeline, Teahupo'o-like);
  - the **Point**: a longer, deeper shelf off the headland;
  - the **Beach**: deeper outer bars (a double-barred beach like Duck, NC);
  - the inner bathymetry (shoreward of −150, where small days break) is unchanged; the Canyon is untouched.
- **The tank is sized to the swell** (Q10): its edge sits where the bed is deep enough for the swell, and its 1 m zone starts where the sets break, so small days cost what they cost today. **Settled in the spec:**
  - edge depth = max(the spot's `OFFSHORE_DEPTH`, 3.3 Hs0), at most 0.4 L0(Tp): 3.3 is the largest ratio that leaves every Hs0 ≤ 1.5 m tank as it is, and keeps Hs0 within 0.3 of the edge depth on big days, so the zone's linear sea stays near linear; 0.4 L0 keeps kh ≤ 2.5, where the solver's dispersion is within 1 % of Airy;
  - a tank at its spot's `OFFSHORE_DEPTH` is today's tank, exactly;
  - a deeper tank's relaxation zone starts where the take-off transect first reaches the edge depth, is at least 60 m and 0.75 of the edge wavelength long, and the bed blends over the 80 m inside it, as today;
  - the fine zone starts 40 m seaward of where the sets break (the empirical H1/10 face, 1.27 × Komar–Gaughan, over the breaker index 0.78), and never shoreward of −150;
  - a deeper tank's boundary sea uses the stage 2 solver's own (Madsen–Sørensen) wave numbers, so the zone forces the waves the solver carries; today's tanks keep theirs.
- **Performance** is measured, never a gate (M1 Air may be slow; the M4 Pro is the target).
- **The take-off follows the measured break** (Q11): at session start and at every swell change, the take-off (the camera's focus, the lineup) is placed where the size report measured the sets break for that spot and swell, through the calibrated model. The full lineup (sitting, moving along the break) is P11.

### Checks

- **Size report** (Q12), per spot, Hs 1, 2, 3, 4 m × Tp 10, 14, 18 s, 4 minutes of sea each: measured H1/3 and H1/10 faces, the break's position, and the empirical breaker height from the sourced formulas.
  - **Big days** (Hs ≥ 2 m): measured H1/3 within ±20 % of the empirical breaker height at the Beach, Point and Reef. **Settled in the spec:** the reference is Komar & Gaughan's H_b = 0.39 g^0.2 (T H0²)^0.4 at all three; Caldwell & Aucan's (2007) shoaling-and-refraction H1/10 for Hawaii's outer reefs is reported beside the Reef as the high-refraction bound, not gated (it gives ~10 m sets at Hs 4 m, the Backlog's big-wave surf).
  - **Small days:** Practice, and every Hs ≤ 1.5 m sea entering today's tank, within ±5 % of today's H1/3 (the same edge sea; Part A records today's).
  - **Canyon:** unchanged (the same faces and seas, bit for bit where its sea is built).
  - **Take-off:** within 15 m across shore of the sets' measured median break.
- **Size sheet** (Q13): an MPFB2 surfer standing on a set wave's face with its face height marked, shot from the channel, the beach and in the water, in Classic and Rich. The camera changes only if the sheet shows the view shrinks waves (lens, height, distance). The user's playtest judges.

### Scope and order

- **Scope** (Q14): the sea, its look and the readouts. Riding big faces is judged in playtest and tuned by the riding work (P9–P12), not here.
- **One spec, three parts, each merged when its checks pass:**
  - **Part A · measure:** the surf meter, the readouts (Surf row, Surf screen, pause, predicted range, units, names) and the size report, calibrated on today's tank.
  - **Part B · bigger surf:** deep-water input with shoaling, the swell-sized tank, the outer bathymetry, the take-off following the break, the report's gates, and the predicted range recalibrated.
  - **Part C · the size sheet and the camera.**
- **Out of scope:** big-wave surf (Backlog), riding big waves (P9–P12), the full lineup (P11), the far field's look beyond following the tank's new edge.
