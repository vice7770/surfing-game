# Wave strategy: the alternatives, ranked (2026-11-12)
Tags: [M] measured (ruling 17's runs, step4), [C] code, [KB] knowledge base, [R] reasoned, [U] recalled, [P] provisional.
No code was changed and no probe was run for this plan. Every cost at beach scale is a guess unless tagged [M] or [KB].

Asked by the owner on 2026-11-12; written by the water-physics advisor. Ruling 17 is in `docs/research/pool-look-reference-2026-11-11/ruling-17.md`. Nothing here is decided: the calls are the owner's.

## One page for the owner
**The constraint.** The Wave Pool is a test for larger beaches. Whatever we choose must stay playable on a large
beach, with uneven crests, sections, close-outs and crossing peaks.

| Route | Works at beach scale? | Does a seam show? | Cost per frame | Work | Main risk |
|---|---|---|---|---|---|
| A. Live sea + placed tube (today, with `tubeForm=early`) | Yes on clean lines. Pops where a crest is seen late | Hidden in the last 8 m if tonight's bars pass. Wall 20-30 m ahead stays low | As today | 2-4 days pool, 5-10 beach | Late-seen crests pop |
| B. Wider library zone (wall + tube + pile) on the live sea | Yes, same limits as A, less visible | Moves to where the two agree (1-1.6 s before the throw) | Today + under 1 ms | 10-15 days + new Basilisk runs | Cases must start earlier; crest tracking |
| C1. Whole 3D wave made offline, played back | **No** | None | Small to play, impossible to store | not viable | Size: billions of cells per spot |
| C2. Whole surf-zone wave from the library, sea only outside (your idea, done with 2D cases) | Yes for lines and peaks one at a time. Weak where crests cross | At the zone's outer edge, in gentle water | Less than today in the zone | 20-30 days | Loses backwash, currents, wave-on-wave unless a coarse sea is kept |
| D1. Finer cells (0.5 m) in the surf zone | Yes | Still two parts; the gap between them shrinks | About 8 x today's cost in the zone | 5-8 days | Stability; may gain only a few degrees |
| D2. Layered (non-hydrostatic) solver | Not at 60 fps | Still two parts (cannot overturn) | 5-15 x today | 30+ days | Cost, and no tube anyway |
| D3. 3D particles for the breaking part | Not at 60 fps | Particle patch against sea | far over budget | 30+ days | Our own test: stubby late lip |
| D4. One displaced surface, lip thrown by a rule | Unknown | **None** | 1-2 ms (M4, provisional) | 15-25 days | Shape came from a fitted gravity; small cavity |
| E. Hand-shaped or rigged wave (films, most games) | Yes | None | Tiny | 10-15 days | Not real: breaks your "sourced shapes" decision |

**Recommendation.** Keep A tonight: its join bars (J1-J6) are the cheapest test of the idea every library route rests
on. Then test C2 with a URL-only run in the pool (the case fully on from 12 m ahead), and count late-seen crests on
an uneven sea; these two numbers decide between A/B and C2. I rank them **B grown toward C2 first**, D1 as a helper
if the shapes still disagree, D4 as the one long shot that removes the seam; C1, D2, D3 are not real options.

**Your calls.**
1. May the surf zone lose its live water (C2) if a coarse sea is kept for currents and backwash? It costs variety.
2. Is the periodic swell the right wave for the clip's "long 2 m wall"? The clip's wave is a pool soliton, which is
   steeper far ahead of the lip. No drawing route fixes that; it is a generator question.
3. Is E (a rigged wave, as films do) ruled out for good? I assume yes.

**The owner's answers (2026-11-12 evening), after "the wave still doesnt look surfable": the route is C2, "the whole breaking wave from the Basilisk library".**
1. Yes, the breaking zone may lose its live water, "as long as it respects the beach and wave direction": the live sea brings each crest in with its real height and direction, the beach's depth sets where it breaks and how it peels, the library gives only the breaking shape per slice, and a simple sea under the zone keeps the currents and the backwash.
2. Keep a train of many waves: "the video is from real life they only do one wave at a time, we dont have that problem". Each crest is handed to the library on its own. A train's wall far ahead of the curl is gentler than the clip's single wave; that is real physics for beaches.
3. No hand-shaped wave (E): "I would like the shape if it was possible with physics".
Next: the C2 plan (steps and bars), with T2 (the case on 12 m earlier) and T5 (a Basilisk run started twice as far out, on the owner's M4) first.

## Detail
### What ruling 17 measured, that every route must face [M]
- The case and the sea agree best 1-1.6 s before the throw: case crest 0.17-0.21 m over the sea's, height 1.03-1.07.
- The slopes do not agree: case 24-31 degrees there, sea 13-18. At the throw: case 64-90, sea 18.
- Earlier than that they drift apart again (height 1.18 at the cases' first frames). The cases start too late.
- Crests are seen 1.64 s before their throw, which is 13 m of crest. Ahead of that no case exists.
- Clocks and places sit on 1 m cells: neighbours differ by 0.3 in share and 0.5 m in place.
- The wall 10-30 m ahead is 1.5 m and 9-13 degrees. That is the sea's own unbroken wave.

### A. Live sea + placed tube (today)
- How: a Boussinesq sea on 1 m cells; each breaking crest gets a Basilisk profile swept along it, blended in over
  the last seconds before the throw [C].
- Large beach: works where a crest is predicted 1.5 s ahead. Sections, close-outs and crossing peaks are seen late;
  there the shape must grow in place in about 0.5 s. That is a visible pop [R].
- Seam: along the crest, in the last 8 m, hidden if J1-J6 pass. The low wall ahead stays.
- Cost: the pool is 116 000 cells [M]. A 600 x 300 m beach is 180 000 cells, 1.5 x [R]. The loft's budget is
  40 000 vertices [C]; three 300 m crests at 0.5 m slices need about 230 000, so far slices must be coarser [R].
- Look: thin lip and tube yes; long dark wall no. Rider: feels the drawn water; steep only in the last 4-8 m,
  which is where real surfers hit the lip. Multiplayer: as now, one client runs the sea, lip and tube must match.
- Reused: everything. Risk: late-seen crests.

### B. A wider library zone on the live sea
- How: the library also supplies the wall before the tube and the pile after it. Cases are picked by foot crest,
  depth, bed slope, crest direction and breaking state. The sea still runs under it and around it.
- Large beach: as A, but the hand-over sits earlier, where the shapes agree, so late crests hurt less.
- Seam: at the zone's leading edge. To put it 20-30 m ahead the cases must start 3-4 s before the throw. Today's
  start at about 2 s and disagree with the sea there (1.18) [M]. So B needs new, longer Basilisk runs.
- Cost: blend under 0.2 ms on the M4 (provisional) [KB, wave-methods.md]; 40-70 cases, 7-11 MB [KB]; with pile and
  velocity frames perhaps 30-50 MB [R].
- Look: wall, tube and pile from one source. Rider: steep faces from the case, same water as drawn.
- Multiplayer: as A. Reused: all of A. New: longer cases, pile frames, case blending. Risk: crest tracking on 1 m cells.

### C. The whole wave pre-generated (the owner's idea)
- **C1, offline 3D per spot and swell: not viable.** A 300 x 100 x 10 m box at 5 cm cells is 2.4 billion cells per
  frame [R]. One 2D case already takes hours. Each tide and swell would need its own run.
- **C2, the same idea with 2D cases.** A cheap model gives each crest its conditions at the foot (a coarse sea on
  2-4 m cells, or rays). From the foot inward the whole wave is the library: wall, lip, tube, pile, bore. No live
  solver under the surf zone. This is B taken to its end. Films did exactly this: Surf's Up ruled simulation out and
  used "predefined 2-D wave profiles" along the wave's length with "decoupled time"
  ([Bredow et al. 2007](https://www.imageworks.com/sites/default/files/2023-10/making-waves-for-surfs-up.pdf), read tonight).
- Large beach: good for lines and separate peaks; each crest is its own swept wave. Weak where two crests cross
  or one overtakes another: 2D cases know one wave. Tide and swell are just keys.
- Seam: at the foot line, where waves are gentle and both sides agree; and at each crest's unbroken shoulder.
- Cost: the coarse sea is 1/4 to 1/16 of today's cells [R]. The zone costs slices only.
- Look: best match to the clip of all real routes, if the cases cover it. Rider: feels the case's stored flow
  (velocity tools exist, #240); steep faces; no hidden motor if the board reads that flow only.
- Multiplayer: the big gain. The surf zone is a function of a few numbers per crest; sync those, not a sea [R].
- Thrown away in the zone: the solver's breaking, the lip jets' water exchange, live backwash and currents (unless
  kept on the coarse sea). Kept: library, loft, clocks, foam, roller. Risk: sameness, and crossing crests.

### D. One method: the sea's own face made steep
- **D1, 0.5 m cells in the surf zone.** A real option. 4 x the cells and 2 x the steps in the zone, so about 8 x [R].
  It cannot overturn, and the breaking model flattens the face to about 17 degrees once breaking starts
  ([Papoutsellis et al. 2019](https://arxiv.org/pdf/1910.08982)) [KB]. So it narrows the gap for A, B, C; it is not
  a route of its own. How many degrees it gains is unknown.
- **D2, layered non-hydrostatic solver.** Needs a pressure solve every step; my guess is 5-15 x today [R]. The
  surface is still one height per point. No tube. Not an option.
- **D3, 3D particles around the crest.** Our own 2D-slice test cost 2-4 ms per section (M4, provisional) and gave a
  stubby, late lip at 0.25 m cells [KB, wave-methods.md]. A whole 3D crest is far beyond 60 fps. Not an option.
- **D4, the displaced surface.** One mesh moves with the water and the lip is thrown by a rule. No seam, one shader.
  Our prototype: face to about 65 degrees, small cavity, 1-2 ms on the M4 (provisional), but its gravity was fitted
  to Basilisk and it showed staircases on an oblique crest [KB, wave-methods.md]. A fitted gravity is a hidden rule;
  it must go before this is a route. Beach scale: unknown. Multiplayer: as A.
- Celeris runs a Boussinesq sea in the browser on WebGPU, so D1's kind of solver is proven there; I did not find
  its grid or frame numbers ([project page](https://celeris.discourse.group/t/celeris-webgpu-theory-source-code/26), not read in full) [U].

### E. What others do
- Surf's Up (film): rigged 2D profiles, no simulation, the wave "a hero CG character"; a constraint kept the board
  on the surface (source above). Lesson: full control and no seam, but it is authored, and the board is held.
- [Mihalef et al. 2004](https://www.math.fsu.edu/~sussman/BreakingWavesElectronic.pdf): a 2D breaker library swept
  into 3D [KB]. This is route A's ancestor.
- [Thürey et al. 2007](https://matthias-research.github.io/pages/publications/breakingWaves.pdf): shallow water
  plus breaking sheets, real time [KB]. Route A's other ancestor; its join shows too.
- True Surf (game): blends 2D slices [KB; the page would not load tonight, so not re-checked].
- Lesson: I know of no shipped real-time surf wave that is a live solver. All are swept or authored (C2 or E).
  Our live sea is the unusual part. It buys variety from the reef and swell; it costs the seam.

## Decision tests (pool as test bed, cheapest first)
| # | Tests | Build | Measure | Pass | Fail means |
|---|---|---|---|---|---|
| T1 | A's join | `?tubeForm=early` (tonight) | J1-J6 of ruling 17 | all pass | see below |
| T2 | C2 / B: case on early | none: `&crestLine=top&seamTau=-1.64,-1.4` | J1, J4, J6 at the leading edge; surface rise through the felt water | step 0.05 m, crest within 0.25 m, rise 0.4 m/s median | the cases cannot lead yet: longer runs first |
| T3 | Beach readiness of A, B, C2 | probe only: pool with a short-crested feed (two directions 15 degrees apart) [P] | share of thrown points first seen later than 1 s before the throw (`docs/research/pool-look-reference-2026-11-11/ruling-17-runs/r17-probe2.ts` prints it) | under 10 % | over 30 %: all library routes pop on beaches; D4 or a throw forecast is needed |
| T4 | D1 | probe only: 0.5 m cells, 60 s | steepest slope 10 and 20 m ahead (now 13, 10 degrees); wall time | 20 and 14 degrees; under 10 x | under 16 degrees: finer cells are not worth it |
| T5 | B's wall ahead | one Basilisk run started twice as far out (about a day) | its frames 2-4 s before the throw against the sea 20-30 m ahead | height within 10 % | the sea and the case disagree offshore too: C2's outer edge will show |
| T6 | D4 | revive the prototype on the pool wave, gravity 9.81 | face angle held; lip path against case `big`; ms | 60 degrees for 0.5 s; within 0.1 s and 0.3 m; 2 ms | D4 closed |
Order: T1, T2, T3 (all this week, no new code beyond tonight's), then T4 and T5, then decide; T6 only if T3 fails.

## Where tonight's `?tubeForm=early` sits
- It is T1. It tests one claim: a hand-over in wave age, where the shapes agree, cannot be seen.
- Pass: A works on clean crests. B and C2 rest on the same blend, so both stay open. Go to T2 and T3.
- Fail on J1 or J5 (steps from 1 m clocks): the fault is the crest's clock, not the idea. It hits A, B and C2 alike.
  Fix the clock (fit along the front) or go to D1, then repeat.
- Fail on J4 or J6 (the shapes differ where they meet): A's join is in the wrong place. B or C2 with longer cases
  (T5), or D1 to bring the sea's slope up.
- It cannot test the wall 20-30 m ahead, crossing crests, or cost at beach scale.

## What cannot be known without building
- How often a beach's crests are seen late (T3 is a pool stand-in, not a beach).
- Whether 0.5 m cells stay stable with the present recovery solve (the thin-cell blow-ups are on record) [KB].
- Whether riders accept a surf zone with no live water (C2): only the owner riding it can say.
- Frame cost of 3 crests of 300 m on the M1.
- Whether D4 can throw a lip of the right shape with no fitted number.
