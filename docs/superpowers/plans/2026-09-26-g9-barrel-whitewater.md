# G9: Barrel and Whitewater — Design Record

> Built test-first on `claude/g9-barrel`, from `main` at `2e8ccb5` (G8 Rich water). Part A merged as vice7770/surfing-game#25; Part B follows. The implementation plan this record replaces is in the history of this file (`bf5986c`). Requirements: [G9 spec](../specs/2026-09-26-g9-barrel-whitewater.md). Sources: [whitewater sources](../../research/whitewater-sources.md); outcomes: [whitewater report](../../research/whitewater-report.md).

**Goal:** make the barrel read on screen, and make breaking whitewater as physical as the tube: explosive on a steep reef and gentle on a spilling beach, because of how each wave breaks rather than because of per-spot values. Everything drawn is what the physics has; Classic is unchanged.

## Part A · The barrel look

### Tubes reach the page

- **The tube table** (`src/wave/tubeTable.ts`): one row of 12 floats per flying tube: its crest now (x, z), the crest's height when it threw, its travel direction, how far its floor reaches ahead of the crest (open), its void's length, width and tilt, its world column, its scale (1 while it flies, falling to 0 as it collapses) and its air. `PlungingLip` packs it at each step's start, after a launch, and when a tubed strip's last parcel lands.
- **One carve** (`carveAt`, `carveGrid`) serves the physics (rider, board, the lip's landing), the page's Classic texture and the page's `heightAt`.
  - Between two columns whose tubes belong to one peel (crests within `PEEL_GAP` 2 m along their travel, directions within 60°), the tube itself is interpolated: its crest, opening and size. Otherwise each column's tubes cut the surface to their lowest floor and the carved columns blend.
  - A second, lower tube in a column still cuts: the interpolated tube is min'd with the blend.
- **The snapshot** carries raw render heights plus the table (`TUBE_CAPACITY` 256, keeping the newest past it: they are at the peel's front, where the rider is). The page carves as the worker does, to under 0.1 mm (the table crosses as 32-bit floats).

### The void on the GPU

- The Rich water cuts each tube per vertex in the 0.25 m patch and per pixel (`water/tubeCarve.ts`), with a 16-step bisection twin of the physics' floor curve, within 5 mm of it. A line-for-line JS mirror of the GLSL is tested against the physics' carve.
- Tubes reach the shader as two textures: the table sorted by column (the 8 largest voids per column) and a per-column index rebuilt when the grid's window slides.
- The Rich normals, the spray's fade and the crest light all read the carved surface.
- The physics carves at its 1 m nodes and the Rich water every 0.25 m, so board and eye agree to about 0.2 m inside a void.

### The lip

- **Shape** (`water/richLip.ts`): the parcels are joined by Catmull-Rom splines along each strip and across linked strips (3 subdivisions), with analytic tangents. It has two faces ±thickness/2 apart.
- **Thickness is its water's:** volume over (spacing × width), where the spacing is at least the parcel's compact size √(V/w), so just-thrown parcels do not stack into a box. It tapers to a rounded edge where the sheet ends, with outward normals.
- **Shading** (`LipSheetMesh.richMaterial`): the G3 optics:
  - sunlight through the lip by Beer–Lambert over its own path;
  - the sky's light where sky lies behind it (faded where the view through it looks down);
  - the photo sky's reflection at the Rich balance;
  - whitening to foam as its parcels age.

  It is rebuilt only when a snapshot brings new parcels.
- **Classic** keeps its sheet byte for byte; a snapshot pins it.

## Part B · Breaking whitewater

Every value, its source and its status are in `docs/research/whitewater-sources.md`. The physics runs in the worker whatever the look; it is drawn in Rich only and puts no force on bodies, except that the collapse reshapes the carve.

### Air in the water

- **The aeration field** (`src/wave/AerationField.ts`) holds, per solver cell, the air per unit area and the plume's depth.
  - **A landing lip** entrains β = 0.1 of its impact energy as work against buoyancy, carried down to half its penetration on average (κ_p = 0.8 of its fall).
  - **A bore** entrains β of its dissipation over its front, κ_s = 0.3 of its height down.
  - **A collapsing tube** breaks the air it does not blow out into bubbles all along its void.
  - A plunge's or a tube's air fills a plume as wide as it is deep.
- **Motion and degassing:**
  - the currents carry it semi-Lagrangian, like the foam, and it follows the window;
  - it degasses as bubbles rise out of the plume at w_b = 0.25 m/s;
  - a plume holds at most α_max = 0.2 of air (Blenkinsopp & Chaplin 2007), venting the rest at once.
- **The snapshot** carries void fraction and plume depth per render node. The Rich churn shows where the water is fresh with air (void fraction 0.02–0.15), instead of where the foam value is high.

### Splash-up

Each jet parcel landing faster than 0.5 m/s re-throws σ = 0.3 of its water, up at ζ_v = 0.6 of its impact speed and on at ζ_h = 0.8 of its horizontal speed. The solver takes the rest, with its momentum less what the splash-up carries on, so the water's momentum is conserved. A jet's splash-ups gather into one companion strip, drawn as a sheet with the lip's own machinery. They never touch the rider and throw no second generation. The spray's impact drops leave at the same speeds.

### Trapped air, the collapse and the spit

- **Closing:** a tube closes once its jet has all landed, trapping its void's air, area × column width. While the jet still pours, the curtain holds the void whole, so the pour lands where the tube is, not on the crest. The void then shrinks linearly over its free-fall time t_c = √(2W/g). The carve, and so the rider, follow the shrinking void, and its strip stays live until the void is gone.
- **The air:** a closing tube's air follows its drawn void. The void's length and width both shrink with its scale, so it holds air as scale² and lets it out fastest as it starts to close.
  - ε = 0.5 of it leaves as spray. A peel is a chain of tubes in neighbouring columns thrown within 1 s of each other.
    - Where the chain still has an open tube at an end, the air blows out of the nearer mouth, along the tube, at the speed mass conservation gives: the air per second over the mouth's void cross-section. That is the spit.
    - Where the chain has closed all along, it bursts up through the lip (the eruption), at √(gW/2).
  - The rest breaks into bubbles.
  - The air is conserved to 1e-9 m³.
- **Drawn:** the spray blows the spit and the eruption as spray and mist, s_a = 40 particles per m³ of air.

### The foam ball

Each closing tube rolls a roller where its void was: κ_r = 0.9 H² in section (H the jet's fall) over its column, riding with its crest. The spray keeps about A·w / v_s foam-ball sprites (v_s a 0.6 m ball) in it.
- The sprites are 0.5–0.8 m wide, spread evenly over its disc.
- They tumble with its top going forward, at its speed over its radius.
- They drift on and fade for a second once it is gone.

Particles now carry their kind (`SPRAY_STRIDE` 6): 0 spray, 1 mist, and the tube's whitewater, 2 foam ball, 3 the spit's and eruption's spray, 4 their mist.
- The tube's whitewater has a pool of its own (1,024) beside the spray's (4,096), so neither crowds the other out.
- Classic leaves the tube's whitewater out, and its lip sheet draws the lip alone.
- Rich draws the foam ball as a ball of the churn texture lit by the sun and sky.

### The bubble plume

The Rich water whitens its body as far down as the air went, 1 − exp(−k·α·depth), with k = 15 (a fully aerated metre reads 95 % white). From above it is seen through the water over the plume's middle; from below, plainly. Foam cover lies over it.

## Deviations from the plan

### Part A

- **Peel interpolation.** The plan blended neighbouring columns' carved heights. That sawed the void into ramps inside the tube, so where both columns hold a tube of one peel, the tube itself is interpolated. It is gated to crests within 2 m along their travel and directions within 60°, and min'd with the blend so a second, lower tube still cuts.
- **The lip's thickness** uses at least a parcel's compact size √(V/w) as its spacing: just-thrown parcels bunch up and drew a box at the peel's leading edge. Its open edges taper to a rounded edge, with no rims.
- **Sky light through the lip.** With only the sun's glow, the lip read as a dark navy slab, so the sky behind it also lights it. That light fades where the view through the lip looks down.
- **Other changes:**
  - the GPU bisects the floor in 16 steps, not 12 (12 left 8 mm);
  - a crowded column keeps its 8 largest voids;
  - the capacity is 256 tubes, keeping the newest;
  - the page's carve agrees with the worker's to 0.1 mm, not bit for bit (32-bit transport);
  - the lip is rebuilt only on new snapshots.
- **Review fixes** (fresh Opus reviewer, one fix pass): the CPU/GPU agreement test, the Rich spray fade and crest light reading the carved surface, capacity, the peel gate, the rounded edges, the rebuild guard and the sky fade.

### Part B

- **Sources:**
  - β = 0.1, the surf-zone measurement (Blenkinsopp & Chaplin 2007), not the deep-water 0.3;
  - one measured α_max = 0.2 replaces separate plunging and spilling peaks;
  - w_b = 0.25 m/s.
- **Penetration:** plume depths scale with the jet's own fall (the strip carries no breaker height).
- **Splash-up** is one parcel per landing jet parcel, gathered into one companion strip per jet, not a new strip of 8 per landing. It leaves at ζ_v and ζ_h with a fifth either way of variety (the old random 30–80 % up, 20–60 % on).
- **The collapse:**
  - it starts once the jet has **all** landed, not at its first landing (the plan). With pouring jets (#23), the first-landing close shrank the void under a jet still pouring, so the rest of the pour landed on the crest, and the practice Reef's solver ran away within 1.5 s. The water sheet found it; a Reef regression test pins it;
  - a peel's mouth is an open tube at an end of its chain, and each closing tube's air goes to the nearer mouth. A chain with no open end erupts, at √(gW/2) (an added field).
- **The report found the aeration field saturating** (cells near void fraction 1). α_max became the plume's cap, as the sources meant. A plunge's and a tube's air now fill a plume as wide as it is deep, and a tube's bubbles break out along its void.
- **Pools:** a tube's whitewater has its own pool beside the spray's. At first it spawned before the lip's splash in one shared pool, and the review found that took places from Classic's spray.
- **Review fixes** (fresh Opus reviewer, one fix pass):
  - Classic drew the spit and the eruption (my ruling, against the spec's "drawn in Rich only"), so their drops are now the tube's own kinds, which Classic leaves out;
  - splash-up landings passed for tubes in the tube report, so a landing's flight now says which water came down;
  - the tube's air follows its drawn void (scale²);
  - the CPU/GPU agreement test covers collapsing tubes;
  - the foam ball's rim uses smoothstep with its edges in order.
- **Merge with main:** the online sea handover (N1) now carries Part B's state: parcel and strip kinds, splash-up links, each tube's collapse (a flying tube's `closedAt` crosses JSON as null) and the aeration field.
- **Foam balls** carry their roller's id so the sprites can follow it. They are placed on the roller each step, not flown.
- **Tests:** "a plunge gives a higher void fraction than a bore" was not physics (at equal air a deeper plume holds a lower fraction), so it became "holds air longer the deeper it went". "The Reef aerates more than the Beach" moved to the report.

## Verification

- **Tests:** Part B added tests for:
  - the aeration field (entrainment by energy, the plume's spread and ceiling, degassing, advection and the sliding window);
  - the splash-up's conservation of water and momentum;
  - the collapse: holding while the jet pours, the shrinking carve, the air balance to 1e-9, the spit's speed and direction, and the eruption on a close-out;
  - the foam ball's roller and sprites;
  - the plume and churn shader chunks;
  - Classic's lip and spray keeping the whitewater out;
  - the runner and host wiring, with a practice-Reef stability test.

  - Full suite before merging `main`: 850 passed, 1 expected fail.
  - After the merge, on a loaded machine: 1,030 of 1,034 passed. The four that timed out at 60 s (SettingsSweep, SustainedRide, WaterSurface's scrolling grid, the lip-throwing simulation test) pass alone, 45 of 45.
  - `npm run build` and the server typecheck pass, and CI passes.
- **Report** (`docs/research/whitewater-report.md`, Wave Lab defaults, 2 seeds × 12 periods):

  | | Reef | Beach |
  |---|---|---|
  | Splash-up, 90th percentile | 1.12 m | 0.76 m |
  | Spit speed, median | 10.8 m/s | 9.9 m/s |
  | Median surveyed void fraction | 0.15 | 0.05 |
  | Surveys at α_max | 24 % | 2 % |
  | Foam-ball sprites, median | 120 | 41 |

  - Collapses take 0.3–0.4 s, and the Canyon barely plunges.
  - Each tube's air is conserved to 1e-9 (a unit test); the report shows where it goes.
  - None of it uses per-spot values.
- **Sheets:**
  - **Reef** (`?inpage&waterSheet&whitewater&spot=reef`): the foam ball reads as a tumbling white clump in the collapsing tube, and the spit and eruption as white spray.
  - **Beach:** a smaller section breaks, with a compact cloud.
  - The Rich shaders compile with no console errors.
- **Clip:** 12 s of the practice Reef's break (`?inpage&record&watch=12&spot=reef`): lips throw and burst into lit spray. Up close, the carve shows teeth a column wide. That is a Part A property: across the crest, the second difference of the carved surface at carved nodes has the same spread as Part A's (median 0.25 m, 90th percentile 1.2 m). Part B carves about 60 % more nodes, because voids linger while they collapse.
- **Performance on the M1 Air:**
  - worker step, `SurfZoneRunner` on a quiet machine at the Wave Lab defaults (1,800 steps after 10 s): the Reef 17.3 ms mean against Part A's 16.2 ms; the Beach 17.9–18.7 ms against 16.2–16.7 ms. Most of the difference is the aeration field;
  - render, 1280×720, drawing each shot 60 times and waiting on a one-pixel read (median / 90th percentile):

    | Shot | Classic | Rich |
    |---|---|---|
    | Beside | 8.3 / 9.1 ms | 13.1 / 13.8 ms |
    | Shoulder | 4.6 / 5.3 ms | 10.1 / 10.6 ms |
    | Behind | 4.6 / 5.3 ms | 11.3 / 12.4 ms |
    | Lineup | 4.9 / 5.7 ms | 12.7 / 13.3 ms |
- **Final review:** a fresh reviewer (Opus) found no Critical issues and judged the branch ready to merge with fixes. Five findings were fixed test-first in one pass:
  - its two Important findings: Classic drew the tube's spray, and splash-ups passed for tubes in the tube report;
  - three re-graded Minors: the air following the drawn void, the CPU/GPU twin at partial scale, and the smoothstep edges.

  Ten Minors were deferred, and all were fixed after the merge (vice7770/surfing-game, the whitewater follow-up):
  - the spit speed bound;
  - `onLand` double-counting the splash-up's share;
  - the drops' and sheet's vertical speeds;
  - `addBore`'s dead `front`;
  - the aeration's window order;
  - the aeration's per-snapshot write (about 1.3 ms, written even in Classic) and its per-cell `exp`;
  - small per-step allocations;
  - the report's inferred balance column;
  - the far ocean's unused varyings;
  - a missing window-clear assertion.

## Open

- **Playtest:** how the barrel and the whitewater read in play (Rich), and the render values provisional until then: s_a = 40 per m³, the mist shares, the foam-ball size and PLUME_DENSITY.
- **At dawn and sunset,** a nearby spit's mist glows as an orange haze (G8's mist phase over a lot of mist).
- **The carve's teeth:** up close and from a low shoulder angle, the practice Reef's voids (95 columns at once in the sheet's moment) read as a jagged trench with teeth a column wide. They are Part A's per-column voids, with an open front at each column's reach. The peel interpolation smooths only neighbours that pass its gate. A smoother carve across columns is the barrel's main open item.
- **The spray pool** (4,096) is full a fifth of the time on the Reef and the Point.
- **Spits** are bounded since the follow-up: no faster than the falling lip can drive the air, √(ρ_w/ρ_a)·√(gW/2), the rest erupting (provisional).
- **Caustics** under a void still refract through the uncut surface (Part A).
- **Backlog:** whitewater forces on bodies (lost buoyancy, hits from the splash-up and the foam ball), and the player's tube camera (P12).
