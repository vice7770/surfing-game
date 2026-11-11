# After the tube: the Barrel's broken water (2026-11-11)

The owner, after riding the Wave Pool's Barrel (2026-11-11):

> I see in some of the pictures the wave is placed between the before tube part and the "old" after tube part. Which makes the wave look strange, out of place, with wrong sizes. The after tube part needs to be redone, maybe you could take a look on how canyon has it for the foam part if it makes sense.

## Short answer

- **Built, opt-in: `?afterTube=roller`.** The Canyon's foam part is its roller lens (`SpillingRoller`): a white band with a toe, holes and a small lift, drawn by the sea's own shader. The pool now seeds the same lens where the tube's lip touches down. It is drawn only: the rider's water does not read it.
- **It works as built, and it changes little.** The band is drawn where its table says, in the Canyon's white. But on a steady sea every lens is gone about 1.2 s after touchdown.
- **The cause is the floor, not the lens.** Behind the reef the pool's floor drops into the lagoon (2–3.4 m of still water). The broken wave stops being a bore there (Froude 1.03 against the 1.3 that keeps a roller). All 479 lenses of the probe were shed by that test, none by any other.
- **So "redo the after-tube part" is a call on the floor** (ruling 11's call 4): should the pool's whitewater run on behind the reef, as in the Canyon and in a real wave pool, or die in the lagoon as the floor now dictates? The lens is ready for the first answer.
- The lens cannot fix "wrong sizes" either way: its lift is 0.06 H (ruling 11, section 0). Height after the roof comes from the solver's bore.

## What the stills showed before

After each column's touchdown the pool drew only the solver's surface with the sea's matt foam on it, next to the saturated blue tube. The Canyon draws its roller lens there. The pool had no roller at all (`SurfZoneSimulation.roller` is the Canyon's).

## What was built

| Piece | Where |
|---|---|
| The seeds: a front point seeds its column from 0.2 s before its slice's touchdown; one wave per front; a point whose jet went back to its crest seeds nothing | `src/wave/barrel/touchdownSeeds.ts` (`TouchdownSeeds`, `AFTER_TUBE`) |
| The roller takes seeds from either source (`RollerSeeds`), and three options with the Canyon's values as defaults: `birthBy` ('solver' or 'seed'), `birthScale`, `shedAfter` | `src/wave/SpillingRoller.ts` (`ROLLER_DEFAULTS` otherwise untouched) |
| The pool's own roller: born by the clock, at scale 0.5, growing over 3 breaker depths, not shed inside one splash cycle 2√(2 H_b / g); drawn through the Canyon's table, shader and lens tops | `src/wave/SurfZoneSimulation.ts` (`afterRoller`, `band`) |
| The switch, the Barrel's alone; online rooms pin the default | `src/game/PhysicalMode.ts` (`tubeFaceSwitches`), `src/main.ts` |
| Dev tools: the water sheet's status line now lists the drawn band's runs and the crashed points; custom views can be listed (separate shots with `;`) | `src/dev/waterSheet.ts`, `scripts/browser/headless-shot.mjs` |
| The probe | `src/wave/probes/afterTube.probe.test.ts` |

The values are ruling 11's (`ruling-11.md`, the water-physics advisor, in full beside this file). `area`, `voidMean`, `rearTaper` and `tanBirth` are the Canyon's.

Without the switch the pool builds no roller: the default build is unchanged. With it, the roller only reads the sea and the front; `simulation.roller` stays undefined, so the rider's water, the spray and the foam do not see it.

## What the probe measured

Solver and loft only, no rider. The rideable build (`tubeSeam=blend`, `wallBody=stream`, the pool's own case), 1.05 m, 30 s after 27 s of settling, 185 touchdowns (154 over 5 s old). Median (10th–90th percentile). The whole print is `probe-2026-11-11.txt`.

| | |
|---|---|
| Case's drawn height at the throw | 1.62 m (1.53–1.68) |
| Roof top at touchdown | 1.29 m (1.22–1.34), 0.80 of the thrown crest |
| Solver's wave height at touchdown, H_s | 1.15 m (0.93–1.39) |
| Solver's crest over still water at touchdown | 0.75 m (0.50–0.92) |
| H_s over the case's drawn height | 0.71 (0.58–0.88) |
| H_s over the roof top | 0.89 (0.73–1.11) |
| Froude number at touchdown | 2.13 (1.09–2.81) |
| Columns that would pass the Canyon's birth tests at touchdown | 122 of 185 |
| Columns with a lens at touchdown | 185 of 185 |
| Lens length over H_s | 4.90 (3.76–7.17) |
| Lens started to shed, after touchdown | 1.17 s (0.53–1.45) |
| Shed before 1 s / before 2 s | 22 / 154 of 154 |
| Why shed | Froude 479 of 479 (strength, lost, stall: 0) |
| At the shed: Froude number | 1.03 (0.98–1.20) |
| At the shed: still depth under the crest | 2.14 m (0.90–3.41) |

Reading:

- The bore is not low at touchdown (0.89 of the roof top; ruling 11 named under 0.6 as "the bore is the fault"). Its first suspect is cleared.
- Its second suspect holds: the floor deepens behind the reef, the Froude number falls to 1, and the roller is shed the moment its one-cycle hold ends. At the 9 m/s peel that leaves about 12 m of broken crest behind the tube. A real pool's whitewater runs on to the shore.

## What the stills show with the switch

`stills/top-down-without.png` and `stills/top-down-with.png`: the pool from 140 m up (`--shots="view@50,140,-150@50,0,-152:rich:midday"`). Up is offshore, the deck is on the right. Three waves travel down-left; each has a short matt foam patch on its crest.

- With the switch one white patch with holes appears (about 7 × 13 m, 1805 pixels changed), on the middle wave, behind the peel. The sheet's status line reads the same place from the table: a run at x 54.5–64.5, crest z −141.1 to −135.8, lengths 9–12 m, on points that crashed 4.2–5.8 s earlier.
- The matt patch beside it (x 42–50) is the sea's own foam where the tube still stands; no point had crashed there yet.
- The close stills hardly change: `curl-behind` by 1621 pixels (217 of them clearly), a thin far patch; `curl-close`, `curl-front`, `curl-channel` and `lineup` not at all.
- The sheet holds at the first open tube after 31 s. Those are the pool's first waves, so the stills show a start-up sea, not the steady one the probe measures. On it the lenses lived longer than in the probe.

## Ruling 11's bars

| Bar | Result |
|---|---|
| A, presence | Part. A lens stands in every column at touchdown (185 of 185, probe). In the stills it shows on one wave only, and not at the roof's end. The 1 m gap along the crest was not measured. |
| B, height step at the join (at most 0.25 of the drawn height) | Misses, from the medians: roof top 1.29 m against the solver's crest 0.75 m plus the lens's lift (about 0.07 m) is a step of 0.47 m, 0.29 of 1.62 m. Not read column by column. |
| C, lens size | Misses: length 4.9 H_s against 2.1–3.5. The toe against the landing line was not measured. H_s at 5–8 breaker depths cannot be read: the lens is gone by then. |
| D, life | No lens is shed inside its first splash cycle (the youngest shed is 1.35 s old). Every lens is shed before 2 s. 22 columns saw a shed under 1 s after touchdown: a second front's lens on the same crest, born earlier (not traced). |
| E, nothing else moves | By construction (above), and the stills without the switch are identical to main's (`curl-close`, `curl-front`, `curl-behind`: 0 pixels). Not asserted by a test of the whole sea: `SurfZoneSimulation.test.ts` is outside the merge suite. The Canyon's roller tests pass unchanged. |
| F, one white | The band's brightest white is (227, 232, 238); the sea's own foam beside it is (209, 239, 238). Within 10 %. Not compared with the roof's whitened tip (not built). |

## Known flaws

- Two fronts can hold the same crest in the same columns, so two slots hold a lens each there, and the along-crest ramp (0.2 per m) restarts at each short run (a saw-tooth scale in the probe's dump).
- No spray from the lens's toe: the pool has no roller front (`rollerToes` needs the Canyon's curl).

## What is next (the owner's calls, ruling 11 section 5)

1. **Call 4, the floor.** Let the pool's whitewater run on behind the reef: a shallow inside in place of the lagoon, behind a switch, sized with the advisor first. This is what the Canyon has (a beach that keeps the bore alive), and it is what would make the after-tube part look like the Canyon's.
2. Ruling 10 rank 5: one foam make-up across the join, and the roof whitening over its last 0.2 s.
3. Call 3: a drawn collapsing tube for 0.5 s after touchdown.
4. Call 1: the lens is drawn only. Making it felt is its own step.
5. Stills of a steady sea: let the sheet hold at a later tube than the first one.

## Run it again

- Ride: `?tubeSeam=blend&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller` on the pool's Barrel.
- Probe: `PROBE=1 DUMP=1 SETTLE=27 SECONDS=30 LOG=<file> npx vitest run src/wave/probes/afterTube.probe.test.ts` (`DUMP=1` also writes the band and the front points every 0.5 s to `<file>.dump`).
- Stills: `node scripts/browser/headless-shot.mjs sheet --url=http://127.0.0.1:<port>/ --port=<port> --out=<dir> --spot="pool&waves=barrel&swell=medium&tubeSeam=blend&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller" --shots="view@50,140,-150@50,0,-152:rich:midday;curl-behind:rich:midday"`. `status.txt` then lists the band's runs.
