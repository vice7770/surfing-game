# C2 step 5d: where the bore foam goes, and the first picture of it (2026-11-14)

Ruling 39 set this round, and set it as a read before a build: **a foam field that is demonstrably different does not
reach the screen** — either the cameras miss the patch, or something drops it between the field and the draw. The
ruling named the test that separates them: project the nodes whose cover the bore changes into each camera's frustum.

**The one-sentence answer: the cameras miss the patch.** Eight of the nine shot cameras have **none** of the changed
nodes inside their frustum; the ninth is `curl-behind`, which has **all 149 of them** inside it at 62 m or more — and
`curl-behind` is exactly the one still of the seven that changed in step 5c. Nothing is dropped between the field and
the draw.

| | |
| --- | --- |
| **Answered** | the cameras miss it (§1). The bore foam's 149 nodes sit **72–207 m from the held curl**, on the peel's own trail; every curl camera sits within 20 m of the open mouth and looks into it |
| **Shipped** | three shots of the landed bore in the water sheet (`bore-face`, `bore-line`, `bore-above`), placed from the drawn loft's own landed slices (§2) |
| **Shown** | **the first picture of the owner's foam** (§3): with the bore foam switched off, those three shots change by **11.2 %, 17.1 % and 24.1 % of the frame**, against 0.06 % in the best shot there was before. The stills are in `c2-step5d-stills/`, foam-on and foam-off, side by side |
| **Found besides** | 24 of the 149 nodes — and the **four brightest** of them — are written where the swept barrel's seam mask fully covers the water, so the water's own fragment is discarded there and that foam cannot reach a pixel by any camera (§4) |
| **Not done** | the grey smear (ruling 39's lead 1) is not measured. It is now plainly visible in a shot that can measure it, which is the step that was missing, but a measured look is still owed (§6) |

---

## 1. The read

### 1.1 How it was done

Two legs of the water sheet at **t 72 s** of the 2 m pool, `--compute=gpu`, the owner's own ride address — the same
frame step 5c's stills came from:

- **leg A**: the branch as it stands;
- **leg B**: the same build with the `aired` block of `WaveZone.applySnapshot` and `applyAeration` switched off in the
  code, which is the bore foam and nothing else (not merged, reverted before the commit).

A probe (`c2-step5d-probe.js`) dumps, in the very frame a still is shot: every shot camera's eye and target
(`waterSheetShots`), the page's own interleaved **(height, foam)** field as base64 Float32, the aeration beside it, and
the swept barrel's seam mask. `c2-step5d-project.mjs` then differences the two legs' fields and projects what moved
into each camera (three's `lookAt`, up +y, fov 55, 1280×720), with an occlusion march over the drawn surface itself.

**The leg carries a hard control: the two legs' height fields are identical at every one of the 159 432 nodes.** The
edit moved the foam channel and nothing else, so the difference is the bore foam exactly.

**What the bore foam is, as it reaches the page:** 149 nodes change cover by more than 0.02, mean **+0.144**, most
**+0.829**; on those nodes the sea's own cover is 0.379 and the drawn value is 0.523. (Step 5b measured the zone's own
write as +0.45 on about 200 nodes; the page's field sees less of it, because `applySnapshot` blends the library's cover
in by the slice's own weight, and because the sea already has foam of its own on those nodes.)

### 1.2 The projection

`changed in front` counts nodes in front of the camera at all; `inside` those within the frustum; `visible` those the
drawn water does not stand in front of; `clear of the mask` those also clear of the seam mask of §4.

| shot | eye | in front | **inside the frustum** | visible | clear of the mask | nearest, m |
| --- | --- | --- | --- | --- | --- | --- |
| `lineup` | (93.7, 1.2, −222.5) | 0 | **0** | 0 | 0 | — |
| `curl-channel` | (88.8, 0.8, −196.9) | 0 | **0** | 0 | 0 | — |
| `curl-close` | (96.2, 1.0, −195.3) | 0 | **0** | 0 | 0 | — |
| `curl-front` | (96.9, 0.8, −187.5) | 0 | **0** | 0 | 0 | — |
| `curl-behind` | (106.6, 4.3, −206.3) | 149 | **149** | 50 | 38 | 62.2 |
| `curl-inside` | (103.6, −0.1, −193.5) | 149 | **0** | 0 | 0 | — |
| `curl-ride` | (95.0, 1.1, −195.3) | 0 | **0** | 0 | 0 | — |
| `horizon` | (93.7, 14.0, −197.5) | 0 | **0** | 0 | 0 | — |
| `below` | (93.7, −1.6, −222.5) | 0 | **0** | 0 | 0 | — |
| **`bore-face`** (new) | (−21.7, 2.8, −94.4) | 122 | **122** | 106 | 80 | 7.8 |
| **`bore-line`** (new) | (−9.0, 1.9, −93.7) | 140 | **65** | 65 | 45 | 6.6 |
| **`bore-above`** (new) | (−11.0, 8.3, −109.4) | 92 | **64** | 64 | 44 | 7.3 |

**`curl-behind` is the whole of step 5c's result, and it lands exactly where it should.** It is the one old camera that
contains the patch, and it is the one old still that changed — 542 pixels at the same tolerance step 5b used, in a box
164 × 30 px at the top-right corner of the frame, 62 m away. Step 5b read 543 pixels in the same shot. The two numbers
are the same measurement.

`curl-inside` is worth a line of its own: all 149 nodes are **in front of** it and **none** is inside its frustum. The
camera sits inside the tube looking out along the crest; the bore is behind its shoulder.

### 1.3 Why the cameras miss it: the bore lives on the peel's trail

The 149 nodes fall in **three clusters**, one per breaking front, strung out along the peel (10 m cells):

| cluster | nodes | distance from the held curl |
| --- | --- | --- |
| x ≈ 45, z ≈ −152 | 57 | 72 m |
| x ≈ −15, z ≈ −105 | 65 | 148 m |
| x ≈ −50, z ≈ −55 | 27 | 207 m |

The held curl is at (103.7, −193.7) and its whole open run is **3.04 m** long. The curl cameras are placed from that
run's middle slice and sit 7–14 m off it: the closest is 6 m from the mouth and the furthest 20 m. The bore is where
each front **landed and then ran on**, shoreward and down the line, so by the time its white is a second old it is tens
of metres away — and the three fronts in the pool at once stretch it over 160 m. **The patch is not near the mouth,
and the sheet has never had a camera that was not near the mouth.**

This also explains why nothing was ever found wrong with the draw: there is nothing wrong with it.

---

## 2. What was built: three shots of the landed bore

In `src/dev/waterSheet.ts` only, which is the dev tool, so the default game is unchanged by construction (§5).

`boreSlice` picks the drawn loft's slice whose touchdown is nearest **1.5 s** ago — fresh enough for the white to be
near its brightest (Koepke's ageing is 1 at the landing and 0.75 by a second) and old enough that the loft has let go
of the tube over it (`LIFT.collapse`, 0.6 s) so the bore is the render nodes' own. `boreShots` then places three
cameras on that slice's crest and toe landmarks, which is the stretch `boreFoam.ts` covers:

- **`bore-face`** — square on from the water 10 m ahead of the pile, 2.5 m over the crest;
- **`bore-line`** — down the line, 12 m along the broken crest and 7 m out, 1.6 m up, with the pile across the frame;
- **`bore-above`** — 8 m behind and 8 m over the pile, looking down on it.

They are appended beside the curl shots whenever a curl is held, so every existing shot and every existing row of the
sheet is where it was.

---

## 3. The first picture of the foam

The same four shots in both legs, at t 72 s, Rich, midday. Pixel by pixel, a pixel counts as different when any
channel moves by more than 2 of 255 — the same test step 5b and step 5c used:

| shot | pixels differing | share of the frame | mean change | brighter with the foam on |
| --- | --- | --- | --- | --- |
| `bore-above` | **222 421** | **24.1 %** | 37.1 | 87.7 % |
| `bore-face` | **157 438** | **17.1 %** | 38.6 | 91.0 % |
| `bore-line` | **102 808** | **11.2 %** | 23.8 | 82.7 % |
| `curl-behind` (the old best) | 542 | 0.06 % | 24.0 | 92.6 % |

**That is between 190× and 410× more of the frame than the best shot there was**, and nine tenths of it is brighter
with the foam on. The stills are in `c2-step5d-stills/` as `foam-on-*.jpg` and `foam-off-*.jpg`.

What they show, by eye:

1. **The bore reads as broken white water.** In `bore-face` the pale blue shoulder of the foam-off leg becomes a broad
   white band with lace in it, running from the collapsing curl away down the line. In `bore-line` the same band fills
   the right half of the frame. This is the thing step 5b built and measured and nobody had seen.
2. **The lace reads as holes at this range.** Inside the white there are large rounded blue patches — the foam
   pattern's own cells, which at 8–10 m are metres across and read as holes in the white rather than as texture. That
   is new, because nothing has ever been this close to drawn foam before.
3. **The seam mask's dither is a hard-edged rectangle.** In `bore-face` there is a sharply bounded rectangular patch of
   Bayer dots across the white, and in `bore-line` the same dots run in a band around the tube's edge. This is ruling
   39's lead 3 — screen-door transparency — and §4 names where it comes from. It is the ugliest thing in the new shots.
4. **The grey veils are on the bore too** (`bore-above`, `bore-line`): grey-brown translucent sheets lying over the
   white pile, exactly the look ruling 39 logged as lead 1 from `curl-ride`. They survive the foam being switched off,
   so they are not the bore foam.

---

## 4. The second finding: a sixth of the bore foam is written under the seam mask

The swept barrel keeps two surfaces and cuts a hole between them: where the seam mask covers the water, the water's own
fragment is **discarded** (`WATER_BARREL_DISCARD`, `src/scene/barrel/barrelMaskGlsl.ts`) and the loft draws there
instead — in the band, where the mask beats that pixel's dither.

The mask is small (525 nodes of 159 432 carry any value, 382 of them full) and the bore foam is small, and **they
overlap heavily**:

| | nodes |
| --- | --- |
| changed nodes under a full mask (≥ 250) | **24** of 149 |
| under any mask at all | 32 of 149 |
| clear of the mask | 117 of 149 |

And it is not a random 16 %: the **four nodes whose cover changes most** (0.829, 0.782, 0.727, 0.707) are all at mask
255. That follows from the geometry — the mask covers the lifted slice plus `LIFT.pad` and `LIFT.band`, and the
freshest, whitest bore is directly behind a crest that is still lifted — so the brightest foam the library writes is
written exactly where the water it is written on is not drawn.

**This is reported, not fixed.** It is a real loss and it is bounded: 117 of 149 nodes are clear of the mask, which is
why §3's shots work at all. Whether the loft should carry the bore's foam across the seam, or the bore's clock should
start where the mask ends, is a shape question and belongs to the advisor and to a ruling, not to this round.

---

## 5. Seatbelts

- `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`: **clean** (`c2-step5d-runs/tsc.txt`).
- **The default game is unchanged by construction, not by hash.** The only TypeScript this branch changes is
  `src/dev/waterSheet.ts`, which `main.ts` reaches through a dynamic `import()` behind `devFlag('waterSheet')`: there
  is no static import of it anywhere in `src`, and no test imports it (the one test that names it,
  `ScreenStack.test.ts`, does so in a comment). Everything else the branch adds is a probe, a script, stills and this
  document. The measurement's own edit to `WaveZone.ts` was reverted before the commit and is not in the branch
  (`git diff` against main shows `src/dev/waterSheet.ts` and docs, nothing else).
- The suite: **see `c2-step5d-runs/suite.txt`**, run under this machine's load (average 20+, with five Basilisk cases
  on three cores). Timeouts are the expected failure mode in that condition and are not assertion failures; ruling 39's
  note holds, that a test carrying its own timeout in its `it()` call is not rescued by `--testTimeout`.

---

## 6. What I am unsure of

- **One frame.** The whole read is t 72 s of one held sea. The three clusters are three fronts at one instant; another
  instant would put them elsewhere, though not nearer the mouth — the geometry that makes the curl cameras miss (a 3 m
  open run, cameras 6–20 m off it, a bore that travels) does not depend on the frame.
- **The occlusion march is the sea's own surface only.** The tube loft, the lip sheets and the roller are separate
  meshes, so a node counted "visible" may still be behind one of them. It makes `visible` an upper bound, which does
  not touch the answer: the cameras with 0 inside the frustum have 0 whatever stands in front.
- **The `bore-*` shots aim at one cluster**, the nearest landed slice the loft still carries. The loft holds only 10
  landed slices at this frame, the oldest 1.38 s past touchdown, so the shots cannot reach a bore older than that even
  though the foam's own life runs to ten seconds. A shot that follows the white rather than the loft would see more of
  it.
- **The grey veils of §3 item 4 are an eye reading**, as they were in ruling 39. Nothing here measures them. What this
  round changes is that there is now a camera 8 m from them.
- **Whether the mask overlap of §4 matters to the owner's eye.** 24 nodes is 16 % of the patch and the brightest of it,
  but the shots still read as white, so the loss is not what was hiding the foam.

---

## 7. Next, in order

1. **Show the owner `foam-on-bore-face.jpg` and `foam-on-bore-line.jpg`.** They asked for foam, they have been promised
   it twice, and this is the first time it can be looked at.
2. **Measure the grey veils** (ruling 39's lead 1) from `bore-above`, which is 8 m from them, against ruling 37's fray
   lip. One measured look before anyone repaints, as the ruling said.
3. **The seam mask over the bore** (§4) — the advisor's call on the shape, then a build.
4. The lace's holes at close range (§3 item 2), and the seam dither's hard rectangle (§3 item 3), which now has both a
   named mechanism and a picture.
5. The five Basilisk runs land; wire them; read the A0 clamp and the hand-over height bar again (ruling 39 item 3).

---

## 8. Files, and how to run them again

- The probe: `c2-step5d-probe.js`, run by `headless-shot.mjs sheet --probe=<file>`; the projection:
  `c2-step5d-project.mjs <legA/probe-at72s.json> <legB/probe-at72s.json>`; the pixel diff: `c2-step5d-pngdiff.py
  <a.png> <b.png> [tolerance]` (pure Python, no decoder in the tree).
- Both legs:
  ```
  node scripts/browser/headless-shot.mjs sheet --serve=$PWD --port=5242 --out=<dir> --compute=gpu \
    --spot="pool&waves=barrel&swell=big&poolSize=ref&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&poolReach=long&wave=library" \
    --shots=bore-face:rich:midday,bore-line:rich:midday,bore-above:rich:midday,curl-behind:rich:midday \
    --probe=docs/research/wave-strategy-alternatives/c2-step5d-probe.js --advance=40 --first=skip
  ```
  The foam-off leg is the same with the `aired` block of `WaveZone.applySnapshot` and `applyAeration` guarded off.
- `c2-step5d-stills/`: the four shots in both legs, JPEG.
- `c2-step5d-runs/`: `frustum.txt` (the projection, every camera), `stills.txt` (the pixel diffs and the clusters),
  `tsc.txt`, `suite.txt`.
- Not run: rider sessions, catch reports and autopilot rides (the brief's rule); the Classic look; the Canyon byte
  check, which §5 says why this branch does not need.
