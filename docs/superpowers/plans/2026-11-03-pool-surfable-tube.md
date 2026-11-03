# A surfable tube in the Wave Pool (plan, 2026-11-03)

## The owner's feedback (2026-11-03, after riding the Barrel)

> "not playable, right now the wave itself has a shape. Its shape and peak can change based on the waves conditions. The
> tube itself is a generated piece that fits into it, which does not work the tunnels piece is not surfable. Its like a
> hole that the surfer falls into."

> "make the surfable tube in the pool wave. Skip padang for now"

**Why it feels like Padang.** The pool's tube is the same system as Padang's:
- the swept barrel, a surface lofted from 2D Basilisk profiles;
- placed on the live Boussinesq water where the solver breaks;
- with its own contact (`src/wave/barrel/sweptContact.ts`, `carrierSupport.ts`, `heldOverturn.ts`, `SweptCrash.ts`).

The wave's shape, peak and timing come from the solver and change with the conditions. The tube is a separate piece fitted
onto it. Where the two disagree, the tube's hollow replaces the water the board was riding, and the board falls into it.

Tube size work (a bigger-tube reef, new M4 runs) only changes the piece, so it is parked until the tube is surfable.

## The direction (proposed; the advisor checks it before building)

1. **The rider always rides the wave's own water.** The face under the board is the solver's surface, always. The hollow is
   only ever above the face, never under the board. Inside the tube means on the face, under the lip.
2. **The tube grows out of the wave.** The lip is the wave's own thrown water: the solver's lip jets, launched from its
   crest with the crest's speed and falling as measured. So the roof's size, timing and landing follow the actual wave in any
   conditions.
3. **The M4 runs add detail only.** The Basilisk cases supply the lip's thickness, curl and tip, scaled to the wave in front of
   the rider, not a fitted void.
4. **The lip is what wipes you out.** If it lands on the rider or the board, that is a wipeout. Riding under it is the barrel.

Alternatives the owner was shown:
- a pre-made tube played with every pool wave (pool only);
- keeping the fitted piece and only stopping the fall.

## The work, in order

1. **Finish the running job.** The owner's M4 cases replace the a38 stand-in (`claude/pool-tube-cases`). Merge it.
2. **Find the hole.** A headless probe at the Barrel, 1.5 and 1.8 m, with no rider sessions:
   - what the board stands on as the tube passes over it;
   - where and when its support drops into the void;
   - which contact path does it (swept contact, carrier support, held overturn, the crash).
   
   Output: the cause, with numbers.
3. **The advisor's design.** Check the direction above against the physics:
   - the lip's launch and fall from the solver's crest;
   - the roof built from the jets;
   - how the Basilisk detail scales onto the live wave;
   - what the board may touch: the face; the lip only as an impact.
   
   Log it in the consult log.
4. **The face stays solid.** The board's support is always the solver's surface. The tube never lowers it. Switch:
   `?tubeFace=old`.
5. **The tube from the wave's lip.** Draw the roof from the solver's thrown lip, with the M4 detail; the lip's contact is an
   impact. Switch: `?tubeFrom=piece` for today's fitted tube.
6. **Measure, frame by frame:**
   - the lip lands where the solver breaks;
   - the hollow's height follows the wave's height;
   - the board stays on the face under the lip (headless probes);
   - no holes or folds;
   - the cost;
   - ride-camera strips.
7. **The owner rides it** (shot list).

## After it is surfable

- Riding inside: crouch, stall to stay in, get clipped or spat out (step 4 of the Barrel plan).
- The Barrel's catch: 4 of 12 or fewer in the probes.
- The tube's size: a bigger-tube reef and new M4 runs.
- The Barrel's current: it builds to −0.62 m/s over 30 minutes (`docs/research/pool-barrel-straight-2026-11-01/runs/health-big-1800s.txt`).
- Training's waves made straight ("Barrel first, Training later").
- Padang (skipped for now) and the Canyon bowl's tube, once the pool's tube works.
