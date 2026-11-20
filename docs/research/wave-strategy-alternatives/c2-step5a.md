# C2, step 5a: the lip's white, keyed on the time (2026-11-13)

Tags: [M] measured here, [C] read in the code, [S] sourced, [R] reasoned, [P] provisional.
The contract is `ruling-36-lip-and-foam.md`; the consult behind it is
`water-physics/lip-thickness-and-foam-2026-11-13.md` §3. Render only: the solver, the library, the flow, the rider and
every piece of geometry are untouched. Everything is inside the existing `?lipLook=fray`; **no new switch**, and
without it the program and the drawing are byte for byte as before.

**In one line:** the lip's white no longer follows how thick the sheet is; it follows **time** — each slice's own
throw and its own touchdown — and the one flat white became five materials. In the stills the fat white bar that ran
the whole lip is gone: the lip reads as water, the white that is left is the landed crest line, it is thinner, duller
and torn, and **the lane-to-lane steps in the white edge are gone**. The page's library draw does not measurably grow.

| Passes | Misses |
|---|---|
| the lane steps in the white edge; shoulder and sky through the curtain; the tube does not go dark; the white's edge torn, not ruled; no white layer over 2 cm; `?wave=library` off byte-identical (the Canyon, both spots; the 2 m pool); the draw cost (+0.02 ms a frame, bar 1 ms); the suite and both `tsc` | nothing fails outright. Two things are only partly answered: the **ligaments** (3 cm) fall under a pixel at the stills' range and show only close up, and the **drops ahead of the tip** are not built, because they need geometry |

**The size cue, my honest read:** better, and I think the owner's complaint is largely answered for the *lip*, but not
finished. What made our lip read as a 4–6 m slab was a bright white bar painted along the whole sheet; it is gone, and
at the tube's mouth the lip now reads as a sheet of dark water with a pale rim (`*-tip-midday.jpg`). What is left white
is the crest line that has already landed, which is right in kind, and it is now thinner and broken. Two things I did
**not** fix and they still push the other way: the drawn white is about 1.6× brighter than any measured foam, and the
pool's water is itself too bright (ruling 25e, which is being built as step 17 — I left both alone on purpose, see §5).
The owner's eye decides this, not my numbers.

---

## 1. The time key

**What was there.** `LIP_FRAY` (ruling 9 step 1): the lip's sheet is full white under 4 cm thick and clean over 15 cm
[C]. **What the consult says:** water turns white at a *time* — the slice's own touchdown — not at a thickness. Clean
water 0.20 m thick passes 98.9 % of green light, so a real 20–40 cm lip is see-through [S, Pope & Fry 1997], and about
2 cm of foam is already fully opaque [S, Koepke 1984; Dierssen 2019's 0.099 mm equivalent water film].

**Why it was also the lane steps' cause.** Neighbouring lanes hold different cases, whose lips differ in thickness; at
lanes 6/7 the step is 9 cm (ruling 34), which the 4–15 cm rule turns into near-white against half-white. The key read a
quantity that steps across the crest [C, R].

**What is there now** (`LIP_WHITE`, `lipSprayAt`, `whiteAge` in `brokenCrest.ts`):

- before a slice lands, its only white is **torn water**: a fringe over the last 10 % (at the throw) to 25 % (at
  touchdown) of the crest-to-tip arc, growing as the fall's progress squared, so it is about nothing at the throw [R];
  and the crest's feather, 5 profile points past the crest [P];
- the fall's progress is the slice's own clock, `sliceLife` = τ / touchdown, which the library loft already fills [C];
- from touchdown the landing's white sweeps from the tip, as before, and now **ages**;
- `lipFoamAt` lost its thickness argument. A clean crest's lip carries no white before it lands, at any thickness. A
  broken crest's lip still carries its crest's foam, capped as a sheet — the owner's option (a) is untouched [C].

**The lane steps, checked against step 3b's own stills** (`*-channel-midday.jpg`, `*-channel-sunset.jpg`): before, the
lip's edge is a staircase of white blocks, lane by lane, and it is the brightest thing in the shot. After, the white
there is gone and with it the staircase. What remains at that place is the mesh's own faceting, pale and far fainter —
the geometry's lane step, which is step 3b §7.1's open item (the neighbouring clocks), not this one. **The bar passes:
the steps in the *white edge* are gone** [M, the stills].

The key is also continuous by construction: a 2 % step in a lane's clock moves the white by under a tenth anywhere on
the profile, where the thickness key went from 0 to 1 over a 9 cm step (a test asserts the first) [C].

## 2. The five materials, one at a time

| Material | What it does now | Where |
|---|---|---|
| **The outer (sky) face** | **No white coat.** Sky reflection and transmission only, as the sheet body already drew them; the one white it may carry is its crest's own foam, capped as a sheet, and the crest's feather. Under `?wave=library` no crest foam is passed at all, so it is pure water | `lipFoamAt` (the thickness key gone), `LIP_WHITE.feather` |
| **The tip** | A torn fringe over the last 10–25 % of the arc, growing from about nothing at the throw; albedo **0.45**, the middle of the measured 0.36 (Dierssen's field fit) to 0.55 (Koepke's fresh dense foam), in place of the drawn foam colour's brightest channel, 0.89, which is 1.6–2.5× brighter than any measured foam; lit from both faces; broken into ligaments **3 cm** apart (10πσ/(ρ_a U²) = 2–4 cm at 7–10 m/s, the Squire relation the board's spray already uses). It **only adds light and writes no cover**, so the sheet under it stays clear water | `lipSprayAt`, `LIP_FRINGE`, `LIP_FRAY_VOLUME` |
| **The underside** | Translucent green-cyan, brightest behind the tip. This is the sheet's own transmission, which the white coat was hiding: over 0.2 m of water 99.8 % of blue, 98.9 % of green and 93.4 % of red come through [S, Pope & Fry], and the sheet is thinnest just behind the tip, so it is brightest there. Taking the coat off was the whole change | the sheet body, unchanged; `lipFoamAt` |
| **Behind the open curl** | **Opaque** white, and it ages: 1 → 0.75 after 1 s → 0.29 after 10 s, which is Koepke's 0.55 → 0.41 → 0.16 **as ratios** | `whiteAge`, `CURL_WHITE` |
| **Aerated, not foam** | Milky turquoise under a cover of 0.4 (the consult's void 0.13–0.4), opaque white only over 0.7, where it stops being a liquid [S, Dierssen after Kokhanovsky]. The turquoise is the same white carried through 2 m of water on the spot's own diffuse attenuation, so red goes first (0.34 m⁻¹ against green's 0.057) [S, Pope & Fry; the 2 m is the tint's one free number, P] | `curlWhiteFoam` |
| **The white's edge** | Torn into patches 0.25 m across, by moving the cover where it is halfway between water and white and nothing where it is all one or the other. A foam line's edge is torn, not ruled | `sweptTornCover`, `CURL_TEAR` |

**No white layer over 2 cm:** by construction. Nothing here builds a shell. The white is a colour on the surface the
loft already drew, and the fringe is light with no cover at all; no geometry was added or moved [C].

**Why the ageing is a ratio and not Koepke's 0.55 outright.** The sea's own foam colour is `#d8f2e9`, 0.89 in the
working space's brightest channel [C]. Setting the curl's fresh white to 0.55 would make the curl darker than the
whitewater it lands in, and put a seam exactly where the owner asked for a seamless join (2026-11-11). The absolute is
the sea's to set, and ruling 25e is setting it (step 17). **Our white is still about 1.6× brighter than Koepke's
densest fresh foam; that is now the biggest single thing between us and the photograph** [M, arithmetic; R].

## 3. The two builds

1. **Build 1** put the five materials in. Its stills: the lip reads as water at the tip, the band along the crest is
   thinner and duller — but its ligaments did not show. 3 cm is under two pixels at the stills' range (the wave is
   about 1.4 cm a pixel there), so they aliased instead of reading as strands [M, the stills].
2. **Build 2** added two things: every pattern fades to its mean where its cells fall under a fragment's footprint
   (`fwidth` on the world position), so the ligaments keep their 2–4 cm spacing, show where a rider is close enough to
   see them, and neither alias nor dim the fringe at a distance; and the white's edge is torn into 0.25 m patches,
   which is the decimetre scale a foam line's fingers have and stays above a pixel at this range [R].

So the **ligaments are built and are honest, but a still from 20 m away cannot show them**. That half of "torn, not
ruled" is carried by the 0.25 m patches, which the stills do show.

## 4. The stills

Same shots and the same command as step 3b (`headless-shot.mjs sheet`, Rich, the 2 m pool at Big, the owner's
switches, nine cases), plus one more from inside at sunset. Both runs hold at 72 s. **Before** is main's `src`
(e0cefbe9) checked out in this worktree; **after** is this branch. JPEGs in `c2-step5a-stills/`.

| Still | Before (main) | After (this branch) |
|---|---|---|
| `*-front-midday.jpg` | A bright white bar runs the whole length of the lip, unbroken and of even width: the wave's heaviest-looking feature. | The bar is thinner, duller and **broken** — it dies away in places and the blue of the lip shows through. The lip is water with a white crest line on it. |
| `*-front-sunset.jpg` | The same bar, lit peach by the low sun, from the shoulder to the tube's mouth. | Thinner and broken in the same way; over the middle of the lip it is nearly gone and the water reads through. |
| `*-tip-midday.jpg` (a crop of the front shot at the tube's mouth) | The curl's lip is a **thick pale slab**: this is the owner's "too thick for the size of the wave". | The same lip is **dark translucent water** with a pale rim. The white left in the shot is the tube's mouth behind it. This is the clearest single pair. |
| `*-channel-midday.jpg` | The lip's edge along the crest is a staircase of bright white blocks, lane by lane. | The white there is gone; the edge is pale blue-grey and the staircase with it. The mesh's own faint facets remain. |
| `*-channel-sunset.jpg` | The same staircase, sharper against the sun. | A soft, torn edge; no hard white line and no blocks. |
| `*-edge-sunset.jpg` (a crop of the channel shot at the steps) | A ruled white edge with square steps. | The edge is soft and ragged; the steps in it are gone. |
| `*-inside-midday.jpg`, `*-inside-sunset.jpg` | Inside the tube: a translucent curtain, the wall and the water showing through it, the tube not dark. | The same, with slightly less milk on the curtain's upper arc. **Nothing was taken away**: the fringe adds light and writes no cover. |

## 5. The cost

- **The page's library draw** (the headless fps trace, Chrome, WebGPU, 70 s, this branch and main back to back on the
  same vite, `c2-step5a-runs/fps-*.txt`): **6.46 ms a frame mean on this branch against 6.44 on main** (+0.02; p50 6.20 against 6.00, p90 8.60 against 9.00), 60.3 fps on both legs. The first build was +0.56 ms mean (6.79 against 6.23) before a slice that carries no torn water took to filling its run in one go [M].
- The machine was busier than step 3b's run (three of ruling 31's Basilisk runs hold three cores), so the absolute is
  higher than step 3b's 5.4 ms on both legs; the difference between the legs is the number that matters [P].
- The fragment work is one value noise (eight hashes) for the fringe, and one more for the white's edge, inside the
  curl's own program only. The fringe's is skipped where the slice carries no torn water.
- A slice that carries none fills its whole run in one go, which took most of the CPU side back.

## 6. Off is unchanged

The diff is three files under `src/scene/barrel/` and their tests; nothing the worker or the solver imports [C].

- The Canyon byte check (`scripts/m1-cpu-bench.ts`, medium, 3600 steps, fresh spin-ups,
  `c2-step5a-runs/canyon-byte-check.txt`):
  - Canyon B (`?canyonWaves=true`): snapshots **a367d938f15fa934**, state **9e5831f80e38abd9** — the same as main and
    as step 3b;
  - the default Canyon: snapshots **ea3d57a4d49f4b48**, state **a1a2555739210f96** — the same as main and as step 3b.
- The 2 m pool with `wave` unset (`c2-step3-runs/pool-off-hash.ts`, 900 steps from step 3's `sea21.bin`):
  hash **0545d279d79bafe7**, lip jets **278** — the same as main and as step 3b (`c2-step5a-runs/pool-off-hash.txt`).
- `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`: clean. The suite (`--exclude SurfZoneSimulation/SurfZoneRunner`, three workers on this loaded M1): **3 463 passed, 1 failed** — `poolBarrelPerf.test.ts` timed out at 60 s, the known flake; alone with `--testTimeout=300000` its 8 tests pass. The barrel's own files: 82 pass.

## 7. What I am unsure of, and what I would do next

1. **The absolute brightness of the white** (§2). Ours is 1.6× Koepke's densest fresh foam. I kept it relative on
   purpose; whoever lands ruling 25e should take this with it, in one pass, so the curl and the sea move together [R].
2. **The drops ahead of the tip** are not built. They are geometry (or a particle), not shading, and the brief is
   render only. The fringe's torn edge stands in for them at a distance [C].
3. **The wind streaks** on the outer face are not built either. The recipe allows them; I left the outer face clean
   rather than put more white on it, which is the thing we are trying to take away [R].
4. **The feather's size** (5 points past the crest, 0.45 white) is by eye, not measured [P].
5. **The aerated tint's 2 m** is the one free number in the recipe's colours [P]. It is what makes the mid-cover band
   turquoise rather than grey; 1 m is nearly white, 4 m is green.
6. **The mesh's own lane facets** are still there at the lip's edge (§1). That is step 3b §7.1's item: the neighbouring
   clocks, not the white.
7. I did **not** ride it, and no rider session was run (the brief's rule). The owner rides and judges.

## Files and how to run them again

- The stills (both legs, the second with main's `src` checked out in this worktree):
  ```
  node scripts/browser/headless-shot.mjs sheet --serve=$PWD --port=5203 --out=<dir> --compute=gpu \
    --spot="pool&waves=barrel&swell=big&poolSize=ref&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&poolReach=long&wave=library" \
    --shots=curl-front:rich:midday,curl-channel:rich:midday,curl-inside:rich:midday,curl-front:rich:sunset,curl-channel:rich:sunset,curl-inside:rich:sunset \
    --advance=40 --first=skip
  ```
- The fps trace: the earlier sessions' headless tool (`…/scratchpad/c2s3/fps/fps-pool.mjs <url> 70`) on a vite of its
  own, with the same switches in the URL.
- The Canyon byte check: `npx rolldown scripts/m1-cpu-bench.ts -o <scratch>/bench.mjs --format esm --platform node`,
  then `--spot canyon --size medium --steps 3600 --state <scratch>/canyon-b.sea`, with
  `globalThis.location = { search: '?canyonWaves=true' }` set first for Canyon B.
- `c2-step5a-runs/`: the fps traces, the Canyon check and the pool's off hash.
- `c2-step5a-stills/`: before (main at e0cefbe9) and after (this branch), seven pairs.
- Not run: rider sessions, catch reports and autopilot rides (the brief's rule); the Classic look's stills.
