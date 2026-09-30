# Water physics advisor: handover (2026-09-29)

The "Water physics research" session moved from the owner's Mac to the cloud on 2026-09-29, at the owner's request. This file carries what that session kept in its local memory, so whoever continues can pick up without it. Read [README.md](README.md) first for the owner's decisions and the page index.

## The role

- **What it is:** a research-and-advice role on breaking waves, tubes, whitewater, foam, spray and (next) the underwater view.
  - It writes one-page findings, each value sourced or marked provisional, into the Claude Doc "Wave Physics Research": https://claude.ai/code/artifact/5eca44ce-d128-48b3-916d-6fcb8ea94624.
  - It advises the sessions that build the game.
  - It does not edit game code or merge PRs; merges are the owner's.
- **Findings go to the owner first.**
  - Other sessions consult it before settling a wave shape.
  - Every consult gets a row in [consult-log.md](consult-log.md), including advice that turned out wrong.
- **Throwaway prototypes are allowed** for images and measurements, in scratch worktrees, never merged.

## Keeping this folder in step with the doc

- The doc is the live copy. Subagents can't open it (they have no docs tools), which is why this folder exists.
- **To mirror a changed tab:**
  1. With the docs tools, create a blob `{from: {object: "file", id: <tab file id>}, format: "markdown"}`.
  2. Download its asset with the Artifact tool (`action: read`, `path` = the asset id).
  3. Replace the page here.
  4. Turn `&#91;image: …\]` placeholders into links to `img/`.
- **Tab file ids:**
  - Overview 2751fe41-cb3f
  - Correct shape 5c8e17c7-242f, with Along the crest ce77a208-e7a3
  - Tubes 7470c7ba-2348
  - Swept barrel build ba78db0e-b50c
  - Padang Padang 09c465a1-743b, with Build sheet 34454351-8c4e
  - Breaking a8256308-a623
  - Solver stability a33b4fe4-6bb2, with Rewrite sketch 2319feec-dca5
  - Foam and whitewater 4b268fa2-e8cc, with Roller 1ce42539-891b, Roller build 7ac722ad-2d26 and Spray and mist 0af6a7df-a231
  - Graphics d81691d3-ac15
  - Consult log eb3ab8ee-c8da
  - Sources 4344ec3d-af8c
- **The repo is public.** Quote sparingly: short attributed phrases, never passages. Shorten quotes of 15 words or more before committing notes.

## Open decisions for the owner

All settled on 2026-09-29: Rich foam, the roller, spray and mist, the peel meter, the solver, round 6's Basilisk choices, water colour and the underwater view. They are listed in [README.md](README.md), under "The owner's decisions".

**Still open or waiting (2026-09-29, night):**
- **The level-13 Padang run:** it needs the M4 Pro (`tools/basilisk/run_padang.sh`, see `tools/basilisk/README.md`). It ran end to end in the cloud on a coarse grid, but not yet on a Mac. The owner's Mac that the advisor runs on is an M1, which is not the machine meant for this run.
- **The new peel meter:** decided, but not built. `SurfZoneSimulation.breakerCelerity()` still returns √(g·h_b).
- **PR #63** (the switch latch): held as a draft.
- **The Reef's lip (the owner's call, raised 2026-09-30):**
  - Its jet ask of 0.47 H² is provisional: a 0.5 H lip, from an article's description (Shand 2024), beyond Pick & Feddersen's fitted slopes. Their 0.27 H² is where the fit stops, not a physical cap.
  - At game size, the predictor session measured that the solver's crest supplies only part of it from above still level.
  - A Basilisk run on the Reef's own transect would source it, under the owner's tube rule.
  - **Run on the M1, 2026-09-30** ([reef-ledge-runs.md](reef-ledge-runs.md)). The lip comes out 0.28–0.41 H thick, supporting a thick lip. But the solitary wave breaks on the flat, not the ledge, so the jet and tube at the ledge need periodic-wave runs; the provisional values stay until then.
- **Periodic Basilisk runs (recommended to the owner, 2026-09-30):** needed for the Reef's jet and tube at the ledge ([reef-ledge-runs.md](reef-ledge-runs.md)) and for Padang's onset lag for swell. The swept barrel uses the solitary lag, 2.2–2.8 √(h0/g), as an upper bound until then.
- **The lip-jet source (consult in flight):** the predictor session is measuring the upper-half crest window; see [consult-log.md](consult-log.md).
- **Water colour:** checked against the journals. The builder uses the phytoplankton-only coefficients in [underwater-colour.md](underwater-colour.md).

## Work in flight elsewhere at the move

- **Padang Padang session** (branch `claude/padang-padang`): building bed (B).
  - **Geometry:**
    - a 1:20 forereef to a 12 m knee, then a 1:80 ramp;
    - a 1:19 wedge at β = 40° (a geometric peel of about 33–35°), its base at 7 m at the peak;
    - swell square to the tank (θ = 0), and a 320 m window.
  - **Latest finding:** everything breaks on the wedge, but the peak breaks late and shallow, because rays leak off the wedge's up-reef end.
  - **Advice given:** a focus spur on the peak's incoming ray.
    - Relief 1.5–2 m; axis 1:20–1:40 over 7 → 10 m, 60–120 m long; flank half-width 40–70 m (about 0.5–1 wavelength, with a Fresnel check).
    - Success means the peak breaks first and deepest, its crests are the largest (within ±15%), and the take-off peels at 40–55°.
    - Also measure V over x ≥ 20 alone. A 60 m wedge fade was being tested.
- **Predictor-gate session** (PR #63, draft): building the three-part solver fix the owner chose, test-first on CPU and WGSL.
  - The three parts:
    - d_eff = min(d, 2h) in the dispersive terms;
    - a Froude cap at 10, applied and counted only where h ≥ 0.01 m;
    - a smootherstep edge ramp over 20 columns.
  - Then the peel, catch and size reports, CI probes and GPU parity.
  - The ramp's inner end sits 10 m from the Reef's take-off, so the Reef reports must check the take-off and go to the Reef session.
- **GPU parity:** done (PR #66). It ran on SwiftShader, not on the M4 itself.

## Research round 5: the underwater view (done)

The owner asked (2026-09-29) to work on "below water and mass carried bodies of water that create that beautiful effect of water moving under water". The round was started and stopped by the move. Restart it with a water-physics agent covering:

1. **What moves under a surf wave, with sourced numbers:**
   - orbital motion flattening toward the bed, near-bed speeds and Stokes drift;
   - bore mass transport, the undertow and rip currents;
   - the plunging jet's cavity collapsing into a vortex, and obliquely descending eddies (Nadaoka et al. 1989);
   - bubble plume depth, void fraction, bubble sizes, rise speeds and lifetimes (Deane & Stokes 2002; Lamarre & Melville 1991; Blenkinsopp & Chaplin 2007; Kimmoun & Branger 2007);
   - sand clouds lifted by breaking and backwash (concentrations, heights, settling), a sandy beach against a clear reef.
2. **Optics from below:**
   - Snell's window (about 97°) and total internal reflection;
   - caustic nets and near-surface light flashes;
   - light shafts, their fade with depth and turbidity;
   - colour and visibility;
   - how bubble clouds and the tube look from below.
3. **Rendering and cost:** spectral fog, the surface's underside, volumetric light shafts, caustics on bodies, bubble and sediment volumes, and tracer particles advected by a 3D velocity reconstructed from the solver (Boussinesq theory gives the vertical profile), plus the waterline meniscus. Check Crest, Unity HDRP water, Subnautica, Sea of Thieves, Moana and Finding Dory, and costs on Apple GPUs and WebGPU.
4. **Ranked changes and the owner's decisions,** with what the player would see.

**Today's underwater view** (verify on main):
- a flat `FogExp2('#367e83', 0.035)` and flat background below the surface (`src/main.ts`);
- an underwater camera mode (`src/scene/SpectatorCamera.ts`);
- point bubbles under bores (`src/wave/BubbleCloud.ts`: 0.3–1.2 m deep, rising at 0.25 m/s, living 3 s);
- bed caustics from the wind chop (`src/scene/CausticMap.ts`);
- the aeration field (`src/wave/AerationField.ts`);
- the hold-downs (`src/physics/DetachedSurfer.ts`, `src/physics/Breath.ts`);
- the water sheet's `below` and `ww-below` views.

Output: notes in `notes/round5-underwater/`, and a one-page "Underwater" tab.

**Status, 2026-09-29 16:30:** delivered as [underwater.md](underwater.md), with notes in `notes/round5-underwater/`. PR #67 was merged, so this folder is on main. Later updates go through new PRs (branch claude/water-physics-underwater for this round).

## In the cloud (2026-09-29, evening)

The move to the cloud worked on the second try. The session now works on branch `main-2ylbec`.
- **Round 5** was merged (PR #72). The owner settled its four decisions (see [underwater.md](underwater.md)).
- **Items 1–2** were prototyped and measured: [underwater-prototype.md](underwater-prototype.md). That raised three more decisions for the owner.
- **Round 6 (done):** our own Basilisk 2D barrel profiles, in [basilisk-profiles.md](basilisk-profiles.md), with notes in `notes/round6-tube-profiles/`. It raised six decisions for the owner, the Padang wedge slope first. The runs and scripts (177 MB) were in the session's scratchpad, which is temporary; the notes' §7 rebuilds them.
- **Cloud limits:**
  - basilisk.fr is blocked by the environment's network policy, so Basilisk comes from the GitHub mirror `comphy-lab/basilisk-C`.
  - Doc exports (blobs) can't be read back here, so pages are mirrored by hand.
  - The container is reclaimed whenever the session idles, killing background jobs. Long simulations (the level-13 Padang run) need a machine that stays up.

## Back on the Mac (2026-09-29, night)

The owner asked the local session to continue from the cloud session's handover. It did three things:
- **Relayed three items to the Padang Padang session,** which the cloud session couldn't message:
  - the wedge at 1:19 along the path, about 1:14.6 across the crest line at β 40°, then re-check the peel;
  - its murkier water, per [underwater-colour.md](underwater-colour.md);
  - the new peel meter: decided, not yet built.
- **Told the Padang Padang and predictor-gate sessions** they can message the advisor directly again.
- **Left the level-13 Basilisk run for the M4 Pro.**

## How other sessions consult now

- The advisor is back on the owner's Mac, so local sessions can SendMessage "Water physics research" again. A cloud session can receive messages, but can't reply to sessions on the Mac.
- Local sessions should spawn the `water-physics` agent (`.claude/agents/water-physics.md` on this branch; a user-scope copy is on the owner's Mac), which reads this folder.
- Log the consult here.

## Method notes

- **PDFs:** read them directly, extracting the text locally. A web-fetch summary once invented a table.
- **Screenshots:** use the water sheet dev view:
  - load `?inpage&waterSheet&spot=reef&whitewater&receiver=http://localhost:<your port>`, add `&compute=gpu|cpu|auto` to pick the tier, and run a small receiver for `POST /upload?name=`;
  - call `waterSheetShot(view, look, time)` twice so the time of day applies;
  - in a hidden browser pane the game runs at about 1.5 fps, and page scripts time out after 45 s.
- **Foam contrast:** measured on screen by comparing a lace box's greyest quarter of pixels (the foam) with its most coloured quarter (the water in the gaps).
